#!/usr/bin/env python3
"""
Pochi! Kawaii ne~ - Setup Script
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
    print_header("POCHI! KAWAII NE~ - SETUP")

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
        print_info("Please install Python from official website")
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
        print_info("Please install Node.js from official website")
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

    # Determine python path in venv
    if sys.platform == "win32":
        python_venv = venv_dir / "Scripts" / "python.exe"
    else:
        python_venv = venv_dir / "bin" / "python"

    # Check if venv exists and is valid
    venv_needs_recreation = False
    if venv_dir.exists():
        if python_venv.exists():
            # Test if venv python works
            print_info("Testing virtual environment...")
            test_result = run_command([str(python_venv), "--version"], check=False)
            if test_result is None or test_result.returncode != 0:
                print_warning("Virtual environment exists but is broken")
                venv_needs_recreation = True
            else:
                print_success(f"Virtual environment is valid: {test_result.stdout.strip()}")
        else:
            print_warning("Virtual environment directory exists but Python executable not found")
            venv_needs_recreation = True
    else:
        venv_needs_recreation = True

    if venv_needs_recreation:
        if venv_dir.exists():
            print_info("Removing broken virtual environment...")
            try:
                shutil.rmtree(venv_dir)
                print_success("Old virtual environment removed")
            except Exception as e:
                print_error(f"Failed to remove old venv: {e}")
                print_info("Please manually delete .venv folder and try again")
                sys.exit(1)
        
        print_info("Creating virtual environment...")
        result = run_command([python_cmd, "-m", "venv", ".venv"])
        if result is not None:
            print_success("Virtual environment created")
            # Verify it works
            if python_venv.exists():
                verify_result = run_command([str(python_venv), "--version"], check=False)
                if verify_result and verify_result.returncode == 0:
                    print_success(f"Verified: {verify_result.stdout.strip()}")
                else:
                    print_error("Virtual environment created but verification failed")
                    sys.exit(1)
            else:
                print_error("Virtual environment created but Python executable not found")
                sys.exit(1)
        else:
            print_error("Failed to create virtual environment")
            sys.exit(1)

    # ========================================================================
    # STEP 4: Install Python Dependencies
    # ========================================================================
    print_header("[4/7] Installing Python Dependencies")

    # python_venv should already be set from step 3
    if not python_venv.exists():
        print_error(f"Virtual environment Python not found at: {python_venv}")
        print_error("This should not happen - please report this issue")
        sys.exit(1)

    python_venv_str = str(python_venv)

    # Upgrade pip
    print_info("Upgrading pip...")
    result = run_command([python_venv_str, "-m", "pip", "install", "--upgrade", "pip"], check=False)
    if result is None:
        print_warning("pip upgrade failed, continuing anyway...")

    # Install requirements
    requirements = project_root / "requirements.txt"
    if requirements.exists():
        print_info("Installing backend dependencies...")
        result = run_command([python_venv_str, "-m", "pip", "install", "-r", str(requirements)])
        if result is not None:
            print_success("Python dependencies installed")
        else:
            print_error("Failed to install Python dependencies")
            print_info(f"Try running manually: {python_venv_str} -m pip install -r {requirements}")
            sys.exit(1)
    else:
        print_error("requirements.txt not found!")
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
        if not check_command("npm"):
            print_error("npm not found!")
            print_info("Please install Node.js which includes npm")
            sys.exit(1)
        
        print_info("Installing npm packages...")
        if sys.platform == "win32":
            result = run_command("npm install", shell=True, cwd=frontend_dir)
        else:
        result = run_command(["npm", "install"], cwd=frontend_dir)
        if result is not None and result.returncode == 0:
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
