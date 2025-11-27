#!/usr/bin/env python3
"""
Pochi! Kawaii ne~ - Update Script
Update backend and/or frontend without affecting nginx or other services

Usage:
    python update.py                    # Interactive mode (choose what to update)
    python update.py --backend          # Update backend only
    python update.py --frontend         # Update frontend only
    python updateend --both             # Update both backend and frontend
    python update.py --all              # Full update (git pull + dependencies + restart)
"""
import os
import sys
import subprocess
import time
import argparse
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

def restart_backend(project_root):
    """Restart backend server"""
    print_header("[Backend] Restarting Backend Server")
    
    server_port = int(os.getenv("SERVER_PORT", "4004"))
    
    # Stop backend
    stop_script = project_root / "stop.py"
    if stop_script.exists():
        print_info("Stopping backend...")
        venv_python = project_root / ".venv" / "Scripts" / "python.exe" if sys.platform == "win32" else project_root / ".venv" / "bin" / "python"
        if not venv_python.exists():
            venv_python = sys.executable
        
        subprocess.run([str(venv_python), str(stop_script)], capture_output=True, timeout=30)
        time.sleep(2)
    
    # Start backend
    start_script = project_root / "start.py"
    if start_script.exists():
        print_info("Starting backend...")
        venv_python = project_root / ".venv" / "Scripts" / "python.exe" if sys.platform == "win32" else project_root / ".venv" / "bin" / "python"
        if not venv_python.exists():
            venv_python = sys.executable
        
        if sys.platform == "win32":
            subprocess.Popen(
                [str(venv_python), str(start_script)],
                cwd=project_root,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
        else:
            subprocess.Popen([str(venv_python), str(start_script)], cwd=project_root)
        
        # Wait for backend to start
        print_info("Waiting for backend to start...")
        import socket
        for i in range(30):
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)
            try:
                result = sock.connect_ex(('127.0.0.1', server_port))
                sock.close()
                if result == 0:
                    print_success("Backend restarted successfully!")
                    return True
            except:
                pass
            print(".", end="", flush=True)
            time.sleep(1)
        print()
        print_warning("Backend may still be starting...")
        return True
    return False

def rebuild_frontend(project_root):
    """Rebuild frontend and deploy to nginx (no nginx restart)"""
    print_header("[Frontend] Rebuilding Frontend")
    
    frontend_dir = project_root / "frontend"
    if not frontend_dir.exists():
        print_error("frontend directory not found!")
        return False
    
    # Check nginx status
    import socket
    nginx_running = False
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        result = sock.connect_ex(('127.0.0.1', 80))
        sock.close()
        nginx_running = result == 0
    except:
        pass
    
    if nginx_running:
        print_info("✓ nginx is running - will update files without restart")
    else:
        print_warning("nginx not running - files will be ready when nginx starts")
    
    # Install dependencies
    print_info("Installing dependencies...")
    if not run_command(["npm", "install"], cwd=frontend_dir):
        print_error("npm install failed!")
        return False
    
    # Build
    print_info("Building frontend...")
    if not run_command(["npm", "run", "build"], cwd=frontend_dir):
        print_error("Build failed!")
        return False
    
    # Copy to nginx
    nginx_dir = os.getenv("NGINX_DIR", "D:/nginx")
    nginx_html = Path(nginx_dir) / "html" / "pochi-kawaii"
    build_output = frontend_dir / "dist-new"
    
    if Path(nginx_dir).exists() and build_output.exists():
        print_info("Deploying to nginx directory...")
        nginx_html.mkdir(parents=True, exist_ok=True)
        
        # Remove old files
        import shutil
        for item in nginx_html.iterdir():
            if item.is_file():
                item.unlink()
            elif item.is_dir():
                shutil.rmtree(item)
        
        # Copy new files
        for item in build_output.iterdir():
            dest = nginx_html / item.name
            if item.is_file():
                shutil.copy2(item, dest)
            elif item.is_dir():
                shutil.copytree(item, dest, dirs_exist_ok=True)
        
        print_success("Frontend deployed to nginx directory")
        print_info("💡 nginx will serve new files automatically (no restart needed)")
        print_info("💡 Clear browser cache (Ctrl+F5) if you see old files")
    else:
        print_warning("nginx directory not found, build output saved to dist-new")
    
    return True

def main():
    # Parse arguments
    parser = argparse.ArgumentParser(
        description="Update Pochi! Kawaii ne~ system",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python update.py                    # Interactive mode
  python update.py --backend          # Update backend only
  python update.py --frontend         # Update frontend only
  python update.py --both             # Update both
  python update.py --all              # Full update (git + deps + restart)
        """
    )
    parser.add_argument('--backend', action='store_true', help='Update backend only')
    parser.add_argument('--frontend', action='store_true', help='Update frontend only')
    parser.add_argument('--both', action='store_true', help='Update both backend and frontend')
    parser.add_argument('--all', action='store_true', help='Full update (git pull + dependencies + restart)')
    
    args = parser.parse_args()
    
    project_root = Path(__file__).parent.absolute()
    os.chdir(project_root)

    # Load .env
    env_file = project_root / ".env"
    if env_file.exists():
        from dotenv import load_dotenv
        load_dotenv(env_file)

    print_header("POCHI! KAWAII NE~ - UPDATE SYSTEM")
    print(f"{Colors.BOLD}Current Directory:{Colors.END} {project_root}")
    print()

    # Determine what to update
    update_backend = False
    update_frontend = False
    full_update = False

    if args.all:
        full_update = True
        update_backend = True
        update_frontend = True
    elif args.both:
        update_backend = True
        update_frontend = True
    elif args.backend:
        update_backend = True
    elif args.frontend:
        update_frontend = True
    else:
        # Interactive mode
        print(f"{Colors.BOLD}What would you like to update?{Colors.END}")
        print("  1. Backend only (restart backend)")
        print("  2. Frontend only (rebuild frontend)")
        print("  3. Both backend and frontend")
        print("  4. Full update (git pull + dependencies + restart)")
        print("  5. Cancel")
        print()
        
        try:
            choice = input(f"{Colors.CYAN}Enter choice (1-5): {Colors.END}").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            print_warning("Cancelled by user")
            sys.exit(0)

        if choice == '1':
            update_backend = True
        elif choice == '2':
            update_frontend = True
        elif choice == '3':
            update_backend = True
            update_frontend = True
        elif choice == '4':
            full_update = True
            update_backend = True
            update_frontend = True
        else:
            print_info("Cancelled")
            sys.exit(0)

    # Full update: git pull + dependencies
    if full_update:
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

        if update_backend:
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

            requirements_path = project_root / "requirements.txt"
            if not requirements_path.exists():
                print_error(f"requirements.txt not found at: {requirements_path}")
                sys.exit(1)

            if run_command([str(venv_pip), "install", "-r", str(requirements_path), "--upgrade"]):
                print_success("Backend dependencies updated")
            else:
                print_error("Failed to update backend dependencies")
                sys.exit(1)

        if update_frontend:
            print_header("Step 3: Update Frontend Dependencies")
            frontend_dir = project_root / "frontend"
            print_info("Installing frontend dependencies...")
            if run_command(["npm", "install"], cwd=frontend_dir):
                print_success("Frontend dependencies updated")
            else:
                print_warning("Frontend dependencies update failed, continuing...")

    # Update backend
    if update_backend:
        if not full_update:
            print_header("Updating Backend")
        restart_backend(project_root)

    # Update frontend
    if update_frontend:
        if not full_update:
            print_header("Updating Frontend")
        rebuild_frontend(project_root)

    # Done
    print()
    print_header("UPDATE COMPLETE")
    print_success("Update completed successfully!")
    print()
    print(f"{Colors.BOLD}Summary:{Colors.END}")
    if update_backend:
        print(f"  Backend:  {Colors.GREEN}[OK] UPDATED{Colors.END}")
    if update_frontend:
        print(f"  Frontend: {Colors.GREEN}[OK] UPDATED{Colors.END}")
    print(f"  nginx:    {Colors.GREEN}[OK] NOT AFFECTED{Colors.END} (still running)")
    print()
    print(f"{Colors.BOLD}Note:{Colors.END}")
    print(f"  - nginx was NOT restarted")
    print(f"  - Other services were NOT affected")
    if update_frontend:
        print(f"  - Frontend changes: Clear browser cache (Ctrl+F5) if needed")

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

    requirements_path = project_root / "requirements.txt"
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

    server_port = os.getenv("SERVER_PORT", "4004")

    print()
    print(f"{Colors.GREEN}{Colors.BOLD}✓ System updated successfully!{Colors.END}")
    print()
    print(f"{Colors.BOLD}Next steps:{Colors.END}")
    print(f"  1. Check backend logs: tail -f .cache/logs/backend.log")
    print(f"  2. Test health endpoint: curl http://localhost:{server_port}/health")
    print(f"  3. Open browser: http://10.73.148.75/pochi-kawaii/")
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
