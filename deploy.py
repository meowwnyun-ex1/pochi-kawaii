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
    MAGENTA = "\033[95m"
    PURPLE = "\033[35m"
    END = "\033[0m"
    BOLD = "\033[1m"
    DIM = "\033[2m"


def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'='*80}{Colors.END}\n")

def print_header_emoji(text, emoji=""):
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'='*80}{Colors.END}\n")


def print_success(text):
    print(f"{Colors.GREEN}{Colors.BOLD}OK{Colors.END} {Colors.GREEN}{text}{Colors.END}")


def print_error(text):
    print(f"{Colors.RED}{Colors.BOLD}ERROR{Colors.END} {Colors.RED}{text}{Colors.END}")


def print_info(text):
    print(f"{Colors.CYAN}{Colors.BOLD}INFO{Colors.END} {Colors.CYAN}{text}{Colors.END}")


def print_warning(text):
    print(f"{Colors.YELLOW}{Colors.BOLD}WARNING{Colors.END} {Colors.YELLOW}{text}{Colors.END}")

def print_step(text, emoji=""):
    if emoji:
        print(f"{Colors.BOLD}{Colors.BLUE}[{text}]{Colors.END}")
    else:
        print(f"{Colors.BOLD}{Colors.BLUE}[{text}]{Colors.END}")


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
    print_step("DEPLOY FRONTEND", "🎨")

    nginx_html = Path(nginx_dir) / "html" / "pochi-kawaii"
    frontend_dir = project_root / "frontend"
    temp_dist = frontend_dir / "dist"
    nginx_exe = Path(nginx_dir) / "nginx.exe"

    print_info(f"Frontend: {frontend_dir}")
    print_info(f"nginx: {nginx_html}")
    print()

    # Check if nginx is running
    nginx_running = is_port_open(80)

    # Stop nginx only if not running and not skipping restart
    if not skip_nginx_restart and not nginx_running:
        print_step("[1/5] Start nginx (if needed)", "🌐")
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
        print_step("[1/5] nginx Status", "🌐")
        print_success("nginx already running - will NOT restart")
        print_info("💡 Files will be updated without restarting nginx")
    else:
        print_step("[1/5] nginx Status", "🌐")
        print_warning("nginx not running - will start after deployment")

    # Clean old build
    print_step("[2/5] Clean old build", "🧹")
    if temp_dist.exists():
        try:
            shutil.rmtree(temp_dist)
            print_success("Removed old temp")
        except Exception as e:
            print_warning(f"Could not remove temp: {e}")

    # Build frontend
    print_step("[3/5] Build frontend", "🔨")
    
    if shutil.which("npm") is None:
        print_error("npm is not available or not in PATH")
        print_info("Please install Node.js which includes npm")
        sys.exit(1)
    
    print_info("Running: npm run build")
    print()

    try:
        if sys.platform == "win32":
            frontend_path = str(frontend_dir)
            # Use PowerShell directly for UNC paths
            if frontend_path.startswith('\\\\'):
                # UNC path - use PowerShell with proper escaping
                ps_cmd = f'''
$ErrorActionPreference = 'Stop'
$frontendPath = '{frontend_path}'
Push-Location -LiteralPath $frontendPath
if (-not (Test-Path 'index.html')) {{
    Write-Error 'index.html not found in frontend directory'
    exit 1
}}
Write-Host "Building from: $(Get-Location)"
npm run build
$buildExitCode = $LASTEXITCODE
Pop-Location
exit $buildExitCode
'''
                cmd = f'powershell -NoProfile -ExecutionPolicy Bypass -Command "{ps_cmd}"'
            else:
                # Regular path
                cmd = f'powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath \'{frontend_path}\'; npm run build"'
            
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='replace',
                timeout=300,  # Increased timeout for build
            )
        else:
            result = subprocess.run(
                ["npm", "run", "build"],
                cwd=str(frontend_dir),
                capture_output=True,
                text=True,
                timeout=300,
            )

        if result.returncode != 0:
            print_error("Build failed!")
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(result.stderr)
            sys.exit(1)

        # Check build output
        if result.stdout:
            print_info("Build output:")
            try:
                output_lines = result.stdout.strip().split('\n')
                for line in output_lines[-5:]:
                    if line.strip():
                        clean_line = line.encode('ascii', 'ignore').decode('ascii')
                        print(f"  {Colors.DIM}{clean_line}{Colors.END}")
            except:
                print_info("Build completed (output contains non-ASCII characters)")
        
        if result.returncode != 0:
            print_error("Build failed!")
            if result.stdout:
                print(result.stdout)
            if result.stderr:
                print(result.stderr)
            sys.exit(1)

        try:
            print_success("Build successful")
        except:
            print("Build successful")

        import time
        time.sleep(1)
        
        if temp_dist.exists():
            try:
                print_info(f"Build output found at: {temp_dist}")
            except:
                print(f"Build output found at: {temp_dist}")
            # Count files in dist
            try:
                dist_files = list(temp_dist.rglob('*'))
                file_count = len([f for f in dist_files if f.is_file()])
                print_info(f"📦 Found {file_count} files in dist directory")
            except Exception as e:
                print_warning(f"Could not count files: {e}")
        else:
            print_warning(f"⚠️ Build output not found at: {temp_dist}")
            print_info("🔍 Checking frontend directory...")
            try:
                frontend_list = list(frontend_dir.iterdir())
                dirs = [f.name for f in frontend_list if f.is_dir()]
                files = [f.name for f in frontend_list if f.is_file()]
                print_info(f"📁 Directories: {', '.join(dirs)}")
                
                # Check if dist exists with different case or path
                dist_variants = [
                    frontend_dir / "dist",
                    frontend_dir / "DIST",
                    frontend_dir / "Dist",
                    project_root / "dist",
                    project_root / "dist-temp",
                ]
                found_dist = False
                for variant in dist_variants:
                    if variant.exists():
                        print_warning(f"⚠️ Found dist at different location: {variant}")
                        print_info(f"💡 Updating temp_dist to: {variant}")
                        temp_dist = variant
                        found_dist = True
                        break
                
                if not found_dist:
                    print_error("❌ dist directory not found anywhere!")
                    print_info("💡 Possible issues:")
                    print_info("   1. Build may have failed silently")
                    print_info("   2. Check npm output above for errors")
                    print_info("   3. Try running manually: cd frontend && npm run build")
            except Exception as e:
                print_error(f"Failed to check frontend directory: {e}")
    except subprocess.TimeoutExpired:
        print_error("Build timed out")
        sys.exit(1)
    except Exception as e:
        print_error(f"Build error: {e}")
        sys.exit(1)

    # Deploy to nginx
    print_step("[4/5] Deploy to nginx", "📦")
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
    print_step("[5/5] nginx Status", "🌐")
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
    print_header_emoji("FRONTEND DEPLOYED", "✅")
    print()
    print()
    print(f"{Colors.BOLD}Note:{Colors.END}")
    print(f"  - nginx was NOT restarted (other projects unaffected)")
    print(f"  - New files are now being served automatically")
    print(f"  - Clear browser cache (Ctrl+F5) if you see old files")
    print()


def deploy_backend(project_root):
    """Start backend server"""
    print_header_emoji("DEPLOY BACKEND", "⚙️")

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
        print_header_emoji("FULL DEPLOYMENT (Initial Setup)", "🚀")
        print_info("This is the initial deployment")
        print_info("For future updates, use: python update.py")
        print()

        deploy_frontend(project_root, nginx_dir, skip_nginx_restart=False)
        time.sleep(2)

        if deploy_backend(project_root):
            print()
            print_header_emoji("DEPLOYMENT COMPLETE", "✅")
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
