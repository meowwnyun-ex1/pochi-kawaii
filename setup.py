#!/usr/bin/env python3
"""
Maemi-Chan Medical AI - Setup Script
ติดตั้งระบบครั้งแรก
"""

import os
import sys
import subprocess
import shutil
from pathlib import Path

# Colors for terminal output
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
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}→ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}! {text}{Colors.END}")

def check_command(cmd):
    """ตรวจสอบว่ามี command ในระบบหรือไม่"""
    return shutil.which(cmd) is not None

def run_command(cmd, shell=False, cwd=None, check=True):
    """รันคำสั่งและจัดการ error"""
    try:
        if isinstance(cmd, str):
            result = subprocess.run(cmd, shell=True, cwd=cwd, check=check,
                                  capture_output=True, text=True)
        else:
            result = subprocess.run(cmd, shell=shell, cwd=cwd, check=check,
                                  capture_output=True, text=True)
        return result
    except subprocess.CalledProcessError as e:
        print_error(f"Command failed: {e}")
        if e.stderr:
            print(e.stderr)
        return None

def main():
    print_header("MAEMI-CHAN MEDICAL AI - SETUP")

    # Get project root
    project_root = Path(__file__).parent.absolute()
    os.chdir(project_root)

    print_info(f"Project directory: {project_root}")
    print()

    # ========================================================================
    # STEP 1: Check Prerequisites
    # ========================================================================
    print_header("[1/7] Checking Prerequisites")

    # Check Python
    python_cmd = "python" if sys.platform == "win32" else "python3"
    if check_command(python_cmd):
        result = run_command([python_cmd, "--version"])
        if result:
            print_success(f"Python found: {result.stdout.strip()}")
    else:
        print_error("Python not found!")
        print_info("Download from: https://www.python.org/downloads/")
        sys.exit(1)

    # Check pip
    if check_command("pip"):
        print_success("pip found")
    else:
        print_error("pip not found!")
        sys.exit(1)

    # Check Node.js
    if check_command("node"):
        result = run_command(["node", "--version"])
        if result:
            print_success(f"Node.js found: {result.stdout.strip()}")
    else:
        print_error("Node.js not found!")
        print_info("Download from: https://nodejs.org/")
        sys.exit(1)

    # Check npm
    if check_command("npm"):
        print_success("npm found")
    else:
        print_error("npm not found!")
        sys.exit(1)

    # ========================================================================
    # STEP 2: Check .env file
    # ========================================================================
    print_header("[2/7] Checking Configuration")

    env_file = project_root / ".env"
    env_example = project_root / ".env.example"

    if env_file.exists():
        print_success(".env file found")
    else:
        print_warning(".env file not found")
        if env_example.exists():
            print_info("Creating .env from .env.example...")
            shutil.copy(env_example, env_file)
            print_success(".env created")
            print_warning("Please edit .env with your settings!")

            # Open .env in default editor
            if sys.platform == "win32":
                os.system(f'notepad "{env_file}"')
            else:
                print_info(f"Edit file: {env_file}")
        else:
            print_error("No .env.example found!")
            sys.exit(1)

    # ========================================================================
    # STEP 3: Create Virtual Environment
    # ========================================================================
    print_header("[3/7] Creating Virtual Environment")

    venv_dir = project_root / ".venv"

    if venv_dir.exists():
        print_warning("Virtual environment already exists, skipping...")
    else:
        print_info("Creating virtual environment...")
        result = run_command([python_cmd, "-m", "venv", ".venv"])
        if result is not None:
            print_success("Virtual environment created")
        else:
            print_error("Failed to create virtual environment")
            sys.exit(1)

    # ========================================================================
    # STEP 4: Install Python Dependencies
    # ========================================================================
    print_header("[4/7] Installing Python Dependencies")

    # Determine pip path
    if sys.platform == "win32":
        pip_cmd = str(venv_dir / "Scripts" / "pip.exe")
        python_venv = str(venv_dir / "Scripts" / "python.exe")
    else:
        pip_cmd = str(venv_dir / "bin" / "pip")
        python_venv = str(venv_dir / "bin" / "python")

    # Upgrade pip
    print_info("Upgrading pip...")
    run_command([python_venv, "-m", "pip", "install", "--upgrade", "pip"], check=False)

    # Install requirements
    requirements = project_root / "backend" / "requirements.txt"
    if requirements.exists():
        print_info("Installing backend dependencies...")
        result = run_command([pip_cmd, "install", "-r", str(requirements)])
        if result is not None:
            print_success("Python dependencies installed")
        else:
            print_error("Failed to install Python dependencies")
            sys.exit(1)
    else:
        print_error("backend/requirements.txt not found!")
        sys.exit(1)

    # ========================================================================
    # STEP 5: Install Frontend Dependencies
    # ========================================================================
    print_header("[5/7] Installing Frontend Dependencies")

    frontend_dir = project_root / "frontend"
    node_modules = frontend_dir / "node_modules"

    if node_modules.exists():
        print_success("node_modules found, skipping install...")
    else:
        print_info("Installing npm packages...")
        result = run_command(["npm", "install"], cwd=frontend_dir)
        if result is not None:
            print_success("npm packages installed")
        else:
            print_error("npm install failed")
            sys.exit(1)

    # ========================================================================
    # STEP 6: Build Frontend
    # ========================================================================
    print_header("[6/7] Building Frontend")

    print_info("Checking frontend build status...")
    print_info(f"Working directory: {frontend_dir}")

    # Check if package.json exists
    package_json = frontend_dir / "package.json"
    dist_dir = frontend_dir / "dist"

    if not package_json.exists():
        print_error(f"package.json not found at: {package_json}")
        print_info("Skipping frontend build - frontend may not be set up")
    elif dist_dir.exists():
        files = list(dist_dir.glob("*"))
        if len(files) > 0:
            print_success(f"Frontend already built ({len(files)} files in dist/)")
            print_info("Skipping rebuild to avoid nginx conflicts")
            print_warning("💡 To rebuild frontend manually:")
            print_warning(f"   1. cd {frontend_dir}")
            print_warning("   2. Stop nginx: nginx -s stop")
            print_warning("   3. Delete dist folder")
            print_warning("   4. npm run build")
            print_warning("   5. Start nginx: nginx")
        else:
            print_warning("dist folder exists but is empty")
            print_info("You should build frontend manually (see instructions above)")
    else:
        print_warning("Frontend not built yet (dist folder not found)")
        print_info("💡 To build frontend manually:")
        print_info(f"   1. cd {frontend_dir}")
        print_info("   2. npm run build")
        print_info("   3. Make sure nginx is stopped before building")

    # ========================================================================
    # STEP 7: Create Directories
    # ========================================================================
    print_header("[7/7] Creating Directories")

    directories = [
        ".cache",
        ".cache/logs",
        ".cache/temp",
        ".cache/python",
        ".cache/sessions",
        ".cache/rate_limits",
        "config"
    ]

    for dir_path in directories:
        full_path = project_root / dir_path
        full_path.mkdir(parents=True, exist_ok=True, mode=0o750)

    print_success("All directories created")

    # ========================================================================
    # DONE
    # ========================================================================
    print()
    print_header("✓ SETUP COMPLETED SUCCESSFULLY")

    print(f"{Colors.BOLD}NEXT STEPS:{Colors.END}")
    print()
    print("1. Edit .env file with your configuration:")
    print(f"   {Colors.CYAN}Edit: {env_file}{Colors.END}")
    print()
    print("2. Start the system:")
    print(f"   {Colors.GREEN}python start.py{Colors.END}")
    print()
    print("3. Check status:")
    print(f"   {Colors.GREEN}python status.py{Colors.END}")
    print()
    print("4. Open application:")
    print(f"   {Colors.CYAN}http://10.73.148.75/maemi-chan/{Colors.END}")
    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Setup interrupted by user")
        sys.exit(1)
    except Exception as e:
        print()
        print_error(f"Setup failed: {e}")
        sys.exit(1)
