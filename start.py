#!/usr/bin/env python3
"""
Pochi! Kawaii ne~ - Start Script
Start Backend + nginx (Production Mode)
"""

import os
import sys
import subprocess
import time
import socket
import tempfile
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
    print(f"{Colors.YELLOW}! {text}{Colors.END}")

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

def wait_for_port(port, timeout=30, host='127.0.0.1'):
    """Wait until port opens"""
    start = time.time()
    while time.time() - start < timeout:
        if is_port_open(port, host):
            return True
        time.sleep(1)
    return False

def main():
    print_header("POCHI! KAWAII NE~ - START PRODUCTION")

    # Get project root
    project_root = Path(__file__).parent.absolute()
    os.chdir(project_root)

    # Load .env
    env_file = project_root / ".env"
    if not env_file.exists():
        print_error(".env file not found!")
        print_info("Run: python setup.py first")
        sys.exit(1)

    load_dotenv(env_file)

    # Get configuration
    server_port = int(os.getenv("SERVER_PORT", "4004"))
    nginx_dir = os.getenv("NGINX_DIR", "D:/nginx")

    print_info(f"Project: {project_root}")
    print_info(f"Backend Port: {server_port}")
    print_info(f"nginx: {nginx_dir}")
    print()

    # ========================================================================
    # Check if already running
    # ========================================================================
    if is_port_open(server_port):
        print_warning(f"Backend already running on port {server_port}")
        # Check if --force flag is provided
        if '--force' in sys.argv:
            print_info("Force restart requested, continuing...")
        else:
            try:
                response = input("Do you want to restart? (y/N): ")
                if response.lower() != 'y':
                    print_info("Keeping existing backend running")
                    sys.exit(0)
                else:
                    print_info("Please run: python stop.py first")
                    sys.exit(1)
            except EOFError:
                # Non-interactive mode (like when called from deploy.py)
                print_info("Non-interactive mode: Please run: python stop.py first")
                sys.exit(1)

    # ========================================================================
    # STEP 1: Check Prerequisites
    # ========================================================================
    print_header("[1/5] Checking Prerequisites")

    # Check virtual environment
    venv_dir = project_root / ".venv"
    if sys.platform == "win32":
        python_exe = venv_dir / "Scripts" / "python.exe"
        uvicorn_cmd = str(venv_dir / "Scripts" / "uvicorn.exe")
    else:
        python_exe = venv_dir / "bin" / "python"
        uvicorn_cmd = str(venv_dir / "bin" / "uvicorn")

    if not python_exe.exists():
        print_error("Virtual environment not found!")
        print_info("Run: python setup.py first")
        sys.exit(1)
    print_success("Virtual environment ready")

    # Check backend
    backend_dir = project_root / "backend"
    main_py = backend_dir / "main.py"
    if not main_py.exists():
        print_error("backend/main.py not found!")
        sys.exit(1)
    print_success("Backend files ready")

    # ========================================================================
    # STEP 2: Create Log Directories
    # ========================================================================
    print_header("[2/5] Creating Directories")

    log_dir = project_root / ".cache" / "logs"
    log_dir.mkdir(parents=True, exist_ok=True)
    print_success("Log directory ready")

    # ========================================================================
    # STEP 3: Start Backend
    # ========================================================================
    print_header("[3/5] Starting Backend Server")

    server_host = os.getenv("SERVER_HOST", "127.0.0.1")

    print_info(f"Starting backend on {server_host}:{server_port} with 4 workers...")
    print_info("This will take 10-15 seconds...")
    print_info(f"Logs: {log_dir / 'backend.log'}")
    print()
    print_warning("Backend runs in background")
    print_info("   View logs: type \".cache\\logs\\backend.log\"")
    print_info("   Stop: python stop.py")
    print()

    backend_log = log_dir / "backend.log"

    if sys.platform == "win32":
        # Use temp file to avoid permission issues
        with tempfile.NamedTemporaryFile(mode='w', suffix='.bat', delete=False, encoding='utf-8') as f:
            startup_script = f'''@echo off
cd /d "{backend_dir}"
"{python_exe}" -m uvicorn main:app --host {server_host} --port {server_port} --workers 4
'''
            f.write(startup_script)
            script_file = Path(f.name)

        try:
            log_out = open(backend_log, 'w', encoding='utf-8')
        except PermissionError:
            # If log file is locked, use a new timestamped log file
            timestamp = time.strftime("%Y%m%d_%H%M%S")
            backend_log = log_dir / f"backend_{timestamp}.log"
            log_out = open(backend_log, 'w', encoding='utf-8')
            print_warning(f"Using new log file: {backend_log.name}")

        subprocess.Popen(
            [str(script_file)],
            creationflags=subprocess.CREATE_NO_WINDOW,
            stdout=log_out,
            stderr=subprocess.STDOUT,
            cwd=backend_dir
        )

        # Clean up temp file after a delay
        time.sleep(2)
        try:
            script_file.unlink()
        except:
            pass
    else:
        cmd = f'cd "{backend_dir}" && "{python_exe}" -m uvicorn main:app --host {server_host} --port {server_port} --workers 4'
        subprocess.Popen(
            cmd,
            shell=True,
            stdout=open(backend_log, 'w'),
            stderr=subprocess.STDOUT,
            start_new_session=True
        )

    # Wait for backend to start
    print_info("Waiting for backend to start...")
    print_info("(Checking port every second... max 30 seconds)")

    for i in range(30):
        if is_port_open(server_port):
            print()
            print_success(f"Backend is running on port {server_port}!")
            print_info(f"View logs: type \".cache\\logs\\backend.log\"")
            break
        print(".", end="", flush=True)
        time.sleep(1)
    else:
        print()
        print_error("Backend failed to start after 30 seconds!")
        print_info(f"Check logs: {backend_log}")

        # Show last lines of log
        if backend_log.exists():
            print()
            print_warning("Last 20 lines of backend.log:")
            print(f"{Colors.CYAN}{'-'*80}{Colors.END}")
            try:
                with open(backend_log, 'r', encoding='utf-8', errors='ignore') as f:
                    lines = f.readlines()
                    for line in lines[-20:]:
                        print(line.rstrip())
            except Exception as e:
                print_error(f"Cannot read log: {e}")
            print(f"{Colors.CYAN}{'-'*80}{Colors.END}")
        else:
            print_warning("Log file not created yet - backend may have crashed immediately")

        print()
        print_error("Backend failed to start!")
        print_info("Common issues:")
        print_info(f"   1. Port {server_port} already in use - run: python stop.py")
        print_info("   2. Dependencies missing - run: pip install -r requirements.txt")
        print_info("   3. Database connection error - check .env DATABASE_URL")
        sys.exit(1)

    # ========================================================================
    # STEP 4: Check nginx
    # ========================================================================
    print_header("[4/5] Checking nginx")

    nginx_path = Path(nginx_dir)
    nginx_exe = nginx_path / "nginx.exe" if sys.platform == "win32" else nginx_path / "nginx"

    if not nginx_exe.exists():
        print_warning(f"nginx not found at: {nginx_exe}")
        print_info("Please install nginx or update NGINX_DIR in .env")
        print_info("Backend is running, but you need nginx for full production setup")
    else:
        # Check if nginx is running
        if is_port_open(80):
            print_success("nginx already running on port 80")
            print()
            print_info("To reload nginx config:")
            if sys.platform == "win32":
                print(f"  {Colors.CYAN}cd {nginx_dir}{Colors.END}")
                print(f"  {Colors.CYAN}nginx.exe -t{Colors.END}")
                print(f"  {Colors.CYAN}nginx.exe -s reload{Colors.END}")
            else:
                print(f"  {Colors.CYAN}sudo nginx -t{Colors.END}")
                print(f"  {Colors.CYAN}sudo nginx -s reload{Colors.END}")
        else:
            print_warning("nginx not running")
            print()
            print_info("Start nginx:")
            if sys.platform == "win32":
                print(f"  {Colors.CYAN}cd {nginx_dir}{Colors.END}")
                print(f"  {Colors.CYAN}start nginx{Colors.END}")
            else:
                print(f"  {Colors.CYAN}cd {nginx_dir}{Colors.END}")
                print(f"  {Colors.CYAN}sudo ./nginx{Colors.END}")
            print()
            print_warning("WARNING: On shared server, NEVER stop nginx!")
            print_info("   Use 'nginx -s reload' instead")

    # ========================================================================
    # STEP 5: Show Status
    # ========================================================================
    print_header("[5/5] System Status")

    print(f"{Colors.BOLD}Services:{Colors.END}")
    print(f"  Backend:  {Colors.GREEN}[OK] RUNNING{Colors.END} (port {server_port})")

    if is_port_open(80):
        print(f"  nginx:    {Colors.GREEN}[OK] RUNNING{Colors.END} (port 80)")
    else:
        print(f"  nginx:    {Colors.YELLOW}○ NOT RUNNING{Colors.END}")

    print()
    print(f"{Colors.BOLD}URLs:{Colors.END}")
    print(f"  Backend:  {Colors.CYAN}http://localhost:{server_port}{Colors.END}")
    print(f"  Health:   {Colors.CYAN}http://localhost:{server_port}/health{Colors.END}")
    print(f"  Docs:     {Colors.CYAN}http://localhost:{server_port}/docs{Colors.END}")

    if is_port_open(80):
        print(f"  Frontend: {Colors.GREEN}http://10.73.148.75/pochi-kawaii/{Colors.END}")
        print(f"  Admin:    {Colors.GREEN}http://10.73.148.75/pochi-kawaii/sdx-secret{Colors.END}")

    print()
    print(f"{Colors.BOLD}Logs:{Colors.END}")
    print(f"  Backend:  {backend_log}")

    print()
    print(f"{Colors.BOLD}Commands:{Colors.END}")
    print(f"  Status:   {Colors.GREEN}python status.py{Colors.END}")
    print(f"  Stop:     {Colors.GREEN}python stop.py{Colors.END}")
    print(f"  Update:   {Colors.GREEN}python update.py{Colors.END}")

    print()
    print_success("Backend started successfully!")

    if not is_port_open(80):
        print()
        print_warning("Don't forget to start nginx for full production setup!")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Startup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print()
        print_error(f"Startup failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
