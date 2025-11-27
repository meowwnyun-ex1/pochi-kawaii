#!/usr/bin/env python3
"""
Pochi! Kawaii ne~ - Stop Script
Stop Backend Server (nginx not affected)
"""

import os
import sys
import subprocess
import time
import socket
import psutil
from pathlib import Path
from dotenv import load_dotenv

# Colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}[OK] {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}[FAIL] {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}> {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}[WARN] {text}{Colors.END}")

def is_port_open(port, host='127.0.0.1'):
    """Check if port is open"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False

def get_process_on_port(port):
    """Find process using this port"""
    for proc in psutil.process_iter(['pid', 'name']):
        try:
            # Skip system processes
            if proc.pid == 0 or proc.pid == 4:
                continue

            # Use net_connections() instead of deprecated connections()
            for conn in proc.net_connections():
                if conn.laddr.port == port:
                    return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
            continue
    return None

def kill_process_tree(pid):
    """Kill process and children"""
    try:
        parent = psutil.Process(pid)
        children = parent.children(recursive=True)

        # Kill children first
        for child in children:
            try:
                child.terminate()
            except psutil.NoSuchProcess:
                pass

        # Wait for children
        gone, alive = psutil.wait_procs(children, timeout=5)
        for p in alive:
            try:
                p.kill()
            except psutil.NoSuchProcess:
                pass

        # Kill parent
        try:
            parent.terminate()
            parent.wait(5)
        except psutil.TimeoutExpired:
            parent.kill()
        except psutil.NoSuchProcess:
            pass

        return True
    except Exception as e:
        print_error(f"Failed to kill process {pid}: {e}")
        return False

def main():
    print_header("POCHI! KAWAII NE~ - STOP")

    # Get project root
    project_root = Path(__file__).parent.absolute()
    os.chdir(project_root)

    # Load .env
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    # Get configuration
    server_port = int(os.getenv("SERVER_PORT", "4004"))
    nginx_dir = os.getenv("NGINX_DIR", "D:/nginx")

    print_info(f"Backend Port: {server_port}")
    print_info(f"nginx: {nginx_dir}")
    print()

    # ========================================================================
    # STEP 1: Stop Backend
    # ========================================================================
    print_header("[1/1] Stopping Backend Server")

    if not is_port_open(server_port):
        print_warning(f"Backend not running on port {server_port}")
    else:
        print_info(f"Finding process on port {server_port}...")

        # Method 1: Use psutil to find all processes using the port
        processes_found = []
        for proc in psutil.process_iter(['pid', 'name', 'ppid']):
            try:
                if proc.pid == 0 or proc.pid == 4:
                    continue

                for conn in proc.net_connections():
                    if conn.laddr.port == server_port:
                        processes_found.append(proc)
                        break
            except (psutil.NoSuchProcess, psutil.AccessDenied, AttributeError):
                continue

        if processes_found:
            print_info(f"Found {len(processes_found)} process(es) on port {server_port}")

            # Find parent processes (not children)
            parent_pids = set()
            all_pids = {p.pid for p in processes_found}

            for proc in processes_found:
                try:
                    ppid = proc.ppid()
                    # If parent is not in our list, this is a parent process
                    if ppid not in all_pids:
                        parent_pids.add(proc.pid)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    parent_pids.add(proc.pid)

            if not parent_pids:
                parent_pids = all_pids

            print_info(f"Killing parent process(es): {', '.join(map(str, parent_pids))}")

            killed = 0
            for pid in parent_pids:
                try:
                    if kill_process_tree(pid):
                        killed += 1
                        print_info(f"  Killed process tree for PID {pid}")
                except Exception as e:
                    print_warning(f"  Failed to kill PID {pid}: {e}")

            if killed > 0:
                print_success(f"Killed {killed} process tree(s)")
                time.sleep(3)
            else:
                print_warning("Could not kill any processes")

        else:
            print_warning("Could not find any process using psutil (may need admin privileges)")

            # Fallback: Try netstat + taskkill for Windows
            if sys.platform == "win32":
                print_info("Trying netstat fallback method...")
                try:
                    result = subprocess.run(
                        ['netstat', '-ano'],
                        capture_output=True,
                        text=True,
                        timeout=5
                    )

                    if result.returncode == 0:
                        pids = set()
                        for line in result.stdout.split('\n'):
                            if f':{server_port}' in line and 'LISTENING' in line:
                                parts = line.split()
                                try:
                                    pid = int(parts[-1])
                                    if pid > 0:
                                        pids.add(pid)
                                except (ValueError, IndexError):
                                    continue

                        if pids:
                            print_info(f"Found PIDs from netstat: {', '.join(map(str, pids))}")

                            # Verify PIDs actually exist
                            existing_pids = []
                            for pid in pids:
                                try:
                                    proc = psutil.Process(pid)
                                    existing_pids.append(pid)
                                    print_info(f"  PID {pid}: {proc.name()}")
                                except psutil.NoSuchProcess:
                                    print_warning(f"  PID {pid}: Zombie process (doesn't exist)")

                            if existing_pids:
                                print_info(f"Killing {len(existing_pids)} existing process(es)...")
                                killed = 0
                                for pid in existing_pids:
                                    if kill_process_tree(pid):
                                        killed += 1
                                        print_info(f"  Killed PID {pid}")

                                if killed > 0:
                                    print_success(f"Killed {killed} process(es)")
                                    time.sleep(3)
                            else:
                                print_warning("All PIDs are zombies - waiting for port to be released...")
                                print_info("Port should be free in 30-60 seconds (TCP TIME_WAIT)")
                        else:
                            print_warning("No LISTENING processes found on the port")
                    else:
                        print_warning(f"netstat failed: {result.stderr}")

                except Exception as e:
                    print_error(f"Fallback method failed: {e}")
            else:
                print_info("Port may be in TIME_WAIT state or process already terminated")

    # ========================================================================
    # STEP 2: nginx Status (not stopping nginx)
    # ========================================================================
    print()
    print_info("Note: nginx will not be stopped to avoid affecting other users")
    print_info("To reload nginx config:")

    nginx_path = Path(nginx_dir)
    if sys.platform == "win32":
        nginx_exe = nginx_path / "nginx.exe"
        print(f"  {Colors.CYAN}{nginx_exe} -s reload{Colors.END}")
    else:
        print(f"  {Colors.CYAN}sudo nginx -s reload{Colors.END}")

    # ========================================================================
    # DONE
    # ========================================================================
    print()
    print_header("OK BACKEND STOPPED")

    print(f"{Colors.BOLD}Status:{Colors.END}")
    backend_running = is_port_open(server_port)
    nginx_running = is_port_open(80)

    if backend_running:
        print(f"  Backend:  {Colors.YELLOW}WARN STILL RUNNING{Colors.END} (port {server_port})")
    else:
        print(f"  Backend:  {Colors.GREEN}OK STOPPED{Colors.END}")

    if nginx_running:
        print(f"  nginx:    {Colors.GREEN}OK RUNNING{Colors.END} (port 80) - not stopped")
    else:
        print(f"  nginx:    {Colors.YELLOW}NOT RUNNING{Colors.END}")

    print()

    if backend_running:
        # Check if zombie processes
        result = subprocess.run(
            ['netstat', '-ano'],
            capture_output=True,
            text=True,
            timeout=5
        )
        zombie_count = 0
        if result.returncode == 0:
            pids = set()
            for line in result.stdout.split('\n'):
                if f':{server_port}' in line and 'LISTENING' in line:
                    parts = line.split()
                    try:
                        pid = int(parts[-1])
                        if pid > 0:
                            pids.add(pid)
                    except (ValueError, IndexError):
                        continue

            for pid in pids:
                try:
                    psutil.Process(pid)
                except psutil.NoSuchProcess:
                    zombie_count += 1

        if zombie_count > 0 and zombie_count == len(pids):
            print_warning(f"Port {server_port} held by {zombie_count} zombie process(es)")
            print_info("Zombie processes will release port automatically in 30-60 seconds")
            print_info("Wait a minute then run: python start.py")
        else:
            print_warning("Backend still running. You may need to stop it manually.")
            print_info(f"Find PID: netstat -ano | findstr :{server_port}")
            print_info("Kill PID: taskkill /PID <PID> /F")
    else:
        print_success("Backend stopped successfully!")

        print()
        print(f"{Colors.BOLD}To start again:{Colors.END}")
        print(f"  {Colors.GREEN}python start.py{Colors.END}")

        print()
        print(f"{Colors.BOLD}Note:{Colors.END}")
        print(f"  nginx still running (not affected)")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Stop interrupted by user")
        sys.exit(1)
    except Exception as e:
        print()
        print_error(f"Stop failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
