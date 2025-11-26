#!/usr/bin/env python3
import os
import sys
import subprocess
import time
from pathlib import Path

class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}→ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}! {text}{Colors.END}")

def get_current_branch(cwd):
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--abbrev-ref", "HEAD"],
            cwd=cwd,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except Exception:
        pass
    return None

def check_npm_available():
    try:
        result = subprocess.run(
            ["npm", "--version"],
            capture_output=True,
            text=True
        )
        return result.returncode == 0
    except Exception:
        return False

def run_command(cmd, cwd=None, shell=False):
    try:
        if shell:
            result = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')
        else:
            result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')

        if result.returncode != 0:
            print_error(f"Command failed: {' '.join(cmd) if isinstance(cmd, list) else cmd}")
            if result.stderr:
                print(result.stderr)
            return False

        if result.stdout:
            print(result.stdout.strip())

        return True
    except Exception as e:
        print_error(f"Failed to run command: {e}")
        return False

def kill_backend(project_root):
    """Stop backend server properly"""
    print_info("Stopping backend server...")

    # Use stop.py if available
    stop_script = project_root / "stop.py"
    if stop_script.exists():
        try:
            venv_python = project_root / ".venv" / "Scripts" / "python.exe" if sys.platform == "win32" else project_root / ".venv" / "bin" / "python"
            if venv_python.exists():
                subprocess.run([str(venv_python), str(stop_script)], capture_output=True, timeout=30)
            else:
                subprocess.run([sys.executable, str(stop_script)], capture_output=True, timeout=30)
            time.sleep(3)
            print_success("Backend stopped using stop.py")
            return
        except Exception as e:
            print_warning(f"stop.py failed: {e}, trying alternative method...")

    print_warning("Could not stop backend automatically")
    print_info("Run: python stop.py")

def main():
    project_root = Path(__file__).parent.absolute()

    print_header("MAEMI-CHAN MEDICAL AI - UPDATE SYSTEM")

    print(f"{Colors.BOLD}Current Directory:{Colors.END} {project_root}")
    print()

    print_header("Step 1: Git Pull")
    current_branch = get_current_branch(project_root)

    if current_branch:
        print_info(f"Current branch: {current_branch}")
        print_info("Pulling latest code from repository...")
        if run_command(["git", "pull", "origin", current_branch], cwd=project_root):
            print_success("Git pull successful")
        else:
            print_warning("Git pull failed, continuing anyway...")
    else:
        print_warning("Could not detect git branch, skipping git pull")

    print_header("Step 2: Update Backend Dependencies")
    print_info("Installing/updating Python packages...")

    venv_python = project_root / ".venv" / "bin" / "python"
    venv_pip = project_root / ".venv" / "bin" / "pip"

    if sys.platform == "win32":
        venv_python = project_root / ".venv" / "Scripts" / "python.exe"
        venv_pip = project_root / ".venv" / "Scripts" / "pip.exe"

    if not venv_python.exists():
        print_error(f"Virtual environment not found at {venv_python}")
        print_info("Please create virtual environment first:")
        print(f"  python -m venv .venv")
        sys.exit(1)

    print_info(f"Using pip: {venv_pip}")

    requirements_path = project_root / "backend" / "requirements.txt"
    if not requirements_path.exists():
        print_error(f"requirements.txt not found at: {requirements_path}")
        sys.exit(1)

    if run_command([str(venv_pip), "install", "-r", str(requirements_path), "--upgrade"]):
        print_success("Backend dependencies updated")
    else:
        print_error("Failed to update backend dependencies")
        sys.exit(1)

    print_header("Step 3: Update Frontend Dependencies (Optional)")
    frontend_dir = project_root / "frontend"

    print_info("Skipping frontend update to avoid nginx conflicts")
    print_info("💡 To update frontend manually:")
    print_info(f"   1. cd {frontend_dir}")
    print_info("   2. npm install")
    print_info("   3. Stop nginx: nginx -s stop")
    print_info("   4. npm run build")
    print_info("   5. Start nginx: nginx")
    print_warning("Frontend is served by nginx - avoid rebuilding while nginx is running")

    print_header("Step 4: Restart Backend")
    kill_backend(project_root)

    print_info("Starting backend server...")

    if sys.platform == "win32":
        subprocess.Popen(
            [str(venv_python), "start.py"],
            cwd=project_root,
            creationflags=subprocess.CREATE_NEW_CONSOLE
        )
    else:
        log_file = project_root / ".cache" / "logs" / "startup.log"
        log_file.parent.mkdir(parents=True, exist_ok=True)

        with open(log_file, "w") as f:
            subprocess.Popen(
                [str(venv_python), "start.py"],
                cwd=project_root,
                stdout=f,
                stderr=f
            )

    print_success("Backend server started")
    print_info("Waiting for server to initialize...")
    time.sleep(3)

    print_header("Step 5: Check nginx")

    if sys.platform == "win32":
        nginx_dir = os.getenv("NGINX_DIR", "D:/nginx")
        if Path(nginx_dir).exists():
            # Check if nginx is running
            result = subprocess.run("tasklist | findstr nginx", shell=True, capture_output=True)
            if result.returncode == 0:
                print_success("nginx is running")
                print_info("💡 nginx will continue serving frontend without interruption")
            else:
                print_warning("nginx is not running")
                print_info(f"💡 Start nginx: cd {nginx_dir} && nginx")
        else:
            print_warning("nginx not found, skipping")
    else:
        result = subprocess.run("pgrep nginx", shell=True, capture_output=True)
        if result.returncode == 0:
            print_success("nginx is running")
        else:
            print_warning("nginx is not running")
            print_info("💡 Start nginx: sudo systemctl start nginx")

    print_header("Update Complete!")

    server_port = os.getenv("SERVER_PORT", "4003")

    print()
    print(f"{Colors.GREEN}{Colors.BOLD}✓ System updated successfully!{Colors.END}")
    print()
    print(f"{Colors.BOLD}Next steps:{Colors.END}")
    print(f"  1. Check backend logs: tail -f .cache/logs/backend.log")
    print(f"  2. Test health endpoint: curl http://localhost:{server_port}/health")
    print(f"  3. Open browser: http://10.73.148.75/maemi-chan/")
    print()
    print(f"{Colors.YELLOW}If you encounter any issues, check the logs for errors{Colors.END}")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Update interrupted by user")
        sys.exit(0)
    except Exception as e:
        print()
        print_error(f"Update failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
