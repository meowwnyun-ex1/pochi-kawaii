#!/usr/bin/env python3
"""
Deploy Pochi! Kawaii ne~
Usage:
  python deploy.py              # Full deploy (frontend + backend)
  python deploy.py --frontend   # Frontend only
  python deploy.py --backend    # Backend only
"""

import os
import sys
import subprocess
import shutil
import time
import socket
from pathlib import Path
from dotenv import load_dotenv


class Colors:
    BLUE = "\033[94m"
    CYAN = "\033[96m"
    GREEN = "\033[92m"
    YELLOW = "\033[93m"
    RED = "\033[91m"
    END = "\033[0m"
    BOLD = "\033[1m"


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


def is_port_open(port, host="127.0.0.1"):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False


def deploy_frontend(project_root, nginx_dir, skip_nginx_restart=False):
    """Deploy frontend to nginx"""
    print_header("DEPLOY FRONTEND")

    nginx_html = Path(nginx_dir) / "html" / "pochi-kawaii"
    frontend_dir = project_root / "frontend"
    temp_dist = project_root / "dist-temp"
    nginx_exe = Path(nginx_dir) / "nginx.exe"

    print_info(f"Frontend: {frontend_dir}")
    print_info(f"nginx: {nginx_html}")
    print()

    # Check if nginx is running
    nginx_running = is_port_open(80)

    # Stop nginx only if not running and not skipping restart
    if not skip_nginx_restart and not nginx_running:
        print_header("[1/5] Start nginx (if needed)")
        if nginx_exe.exists():
            try:
                if sys.platform == "win32":
                    subprocess.Popen(
                        [str(nginx_exe)],
                        cwd=nginx_dir,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                    )
                else:
                    subprocess.Popen([str(nginx_exe)], cwd=nginx_dir)
                print_success("nginx started")
                time.sleep(2)
            except Exception as e:
                print_warning(f"nginx start failed: {e}")
        else:
            print_warning("nginx.exe not found, skipping nginx start")
    elif nginx_running:
        print_header("[1/5] nginx Status")
        print_success("nginx already running - will NOT restart")
        print_info("💡 Files will be updated without restarting nginx")
    else:
        print_header("[1/5] nginx Status")
        print_warning("nginx not running - will start after deployment")

    # Clean old build
    print_header("[2/5] Clean old build")
    if temp_dist.exists():
        try:
            shutil.rmtree(temp_dist)
            print_success("Removed old temp")
        except Exception as e:
            print_warning(f"Could not remove temp: {e}")

    # Build frontend
    print_header("[3/5] Build frontend")
    
    if shutil.which("npm") is None:
        print_error("npm is not available or not in PATH")
        print_info("Please install Node.js which includes npm")
        sys.exit(1)
    
    print_info("Running: npm run build")
    print()

    try:
        if sys.platform == "win32":
            cmd = f'cmd /c "cd /d {frontend_dir} && npm run build -- --outDir=../dist-temp"'
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, timeout=120
            )
        else:
            result = subprocess.run(
                ["npm", "run", "build", "--", f"--outDir=../dist-temp"],
                cwd=frontend_dir,
                capture_output=True,
                text=True,
                timeout=120,
            )

        if result.returncode != 0:
            print_error("Build failed!")
            print(result.stdout)
            print(result.stderr)
            sys.exit(1)

        print_success("Build successful")
    except subprocess.TimeoutExpired:
        print_error("Build timed out")
        sys.exit(1)
    except Exception as e:
        print_error(f"Build error: {e}")
        sys.exit(1)

    # Deploy to nginx
    print_header("[4/5] Deploy to nginx")
    if not temp_dist.exists():
        print_error("Build output not found!")
        sys.exit(1)

    print_info(f"Preparing: {nginx_html}")
    try:
        nginx_html.mkdir(parents=True, exist_ok=True)
        print_success("nginx directory ready")
    except Exception as e:
        print_error(f"Could not prepare nginx dir: {e}")
        sys.exit(1)

    print_info(f"Copying files to: {nginx_html}")
    try:
        if sys.platform == "win32":
            result = subprocess.run(
                ["robocopy", str(temp_dist), str(nginx_html), "/E", "/IS", "/IT"],
                capture_output=True,
                text=True,
                timeout=60,
            )
            if result.returncode < 8:
                print_success("Files deployed")
            else:
                print_warning(f"robocopy returned {result.returncode}")
        else:
            subprocess.run(
                ["cp", "-rf", f"{temp_dist}/.", str(nginx_html)], check=True, timeout=60
            )
            print_success("Files deployed")
    except Exception as e:
        print_error(f"Deploy failed: {e}")
        sys.exit(1)

    # Clean temp
    try:
        shutil.rmtree(temp_dist)
        print_success("Cleaned temp")
    except:
        pass

    # Start nginx only if not running
    print_header("[5/5] nginx Status")
    if not nginx_running:
        if nginx_exe.exists():
            try:
                if sys.platform == "win32":
                    subprocess.Popen(
                        [str(nginx_exe)],
                        cwd=nginx_dir,
                        creationflags=subprocess.CREATE_NO_WINDOW,
                    )
                else:
                    subprocess.Popen([str(nginx_exe)], cwd=nginx_dir)

                print_success("nginx started")
                time.sleep(2)

                if is_port_open(80):
                    print_success("nginx running on port 80")
                else:
                    print_warning("nginx may not be running")
            except Exception as e:
                print_error(f"Failed to start nginx: {e}")
                sys.exit(1)
        else:
            print_warning("nginx.exe not found")
    else:
        print_success("nginx already running - no restart needed")
        print_info("💡 New files are now being served automatically")

    print()
    print_header("FRONTEND DEPLOYED")
    print()
    print()
    print(f"{Colors.BOLD}Note:{Colors.END}")
    print(f"  - nginx was NOT restarted (other projects unaffected)")
    print(f"  - New files are now being served automatically")
    print(f"  - Clear browser cache (Ctrl+F5) if you see old files")
    print()


def deploy_backend(project_root):
    """Start backend server"""
    print_header("DEPLOY BACKEND")

    # Check if backend is running
    server_port_str = os.getenv("SERVER_PORT")
    server_port = int(server_port_str) if server_port_str else 4004
    if is_port_open(server_port):
        print_warning(f"Backend already running on port {server_port}")
        print_info("Stopping backend first...")

        stop_script = project_root / "stop.py"
        if stop_script.exists():
            try:
                subprocess.run(
                    [sys.executable, str(stop_script)], cwd=project_root, timeout=30
                )
                time.sleep(2)  # Wait for stop to complete
            except Exception as e:
                print_warning(f"Stop script error: {e}")

    start_script = project_root / "start.py"
    if not start_script.exists():
        print_error("start.py not found")
        return False

    try:
        result = subprocess.run(
            [sys.executable, str(start_script)], cwd=project_root, timeout=120
        )
        return result.returncode == 0
    except Exception as e:
        print_error(f"Backend start failed: {e}")
        return False


def main():
    project_root = Path(__file__).parent.absolute()
    os.chdir(project_root)

    # Load .env
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    nginx_dir = os.getenv("NGINX_DIR")

    # Parse arguments
    args = sys.argv[1:]
    frontend_only = "--frontend" in args or "-f" in args
    backend_only = "--backend" in args or "-b" in args

    if frontend_only and backend_only:
        print_error("Cannot use --frontend and --backend together")
        sys.exit(1)

    if frontend_only:
        deploy_frontend(project_root, nginx_dir, skip_nginx_restart=True)
        print_success("Frontend deployment complete!")
        print()
        print(f"{Colors.BOLD}Note:{Colors.END}")
        print(f"  - nginx was NOT restarted (other projects unaffected)")
        print(f"  - For future updates, use: python update.py --frontend")
    elif backend_only:
        if deploy_backend(project_root):
            print_success("Backend deployment complete!")
            print()
            print(f"{Colors.BOLD}Note:{Colors.END}")
            print(f"  - For future updates, use: python update.py --backend")
        else:
            sys.exit(1)
    else:
        # Full deployment (initial setup)
        print_header("FULL DEPLOYMENT (Initial Setup)")
        print_info("This is the initial deployment")
        print_info("For future updates, use: python update.py")
        print()

        deploy_frontend(project_root, nginx_dir, skip_nginx_restart=False)
        time.sleep(2)

        if deploy_backend(project_root):
            print()
            print_header("DEPLOYMENT COMPLETE")
            print()
            print(f"{Colors.GREEN}✓ Full deployment successful!{Colors.END}")
            print()
            print()
            print(f"{Colors.BOLD}Next Steps:{Colors.END}")
            print(
                f"  - For code updates, use: {Colors.GREEN}python update.py{Colors.END}"
            )
            print(f"  - nginx will NOT be restarted during updates")
            print(f"  - Other projects will NOT be affected")
            print()
        else:
            print_error("Backend deployment failed!")
            sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print(f"{Colors.YELLOW}Deployment interrupted{Colors.END}")
        sys.exit(1)
    except Exception as e:
        print()
        print_error(f"Deployment failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
