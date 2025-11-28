#!/usr/bin/env python3
"""
Pochi! Kawaii ne~ - Status Script
ตรวจสอบสถานะระบบ
"""

import os
import sys
import socket
import subprocess
from pathlib import Path
from typing import TYPE_CHECKING
from dotenv import load_dotenv
from datetime import datetime

if TYPE_CHECKING:
    import requests
else:
    try:
        import requests
    except ImportError:
        print("Error: requests is required. Install it with: pip install requests")
        sys.exit(1)

# Colors
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    MAGENTA = '\033[95m'
    PURPLE = '\033[35m'
    END = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{'✨ ' + text.center(76) + ' ✨'}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}\n")

def print_header_emoji(text, emoji="📊"):
    print(f"\n{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}{emoji + ' ' + text.center(74) + ' ' + emoji}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}{Colors.BOLD}✓{Colors.END} {Colors.GREEN}{text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}{Colors.BOLD}✗{Colors.END} {Colors.RED}{text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}{Colors.BOLD}→{Colors.END} {Colors.CYAN}{text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}{Colors.BOLD}⚠{Colors.END} {Colors.YELLOW}{text}{Colors.END}")

def print_step(text):
    print(f"{Colors.BOLD}{Colors.BLUE}[{text}]{Colors.END}")

def is_port_open(port, host='127.0.0.1'):
    """ตรวจสอบว่า port เปิดอยู่หรือไม่"""
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        result = sock.connect_ex((host, port))
        sock.close()
        return result == 0
    except:
        return False

def check_health(port):
    """ตรวจสอบ health endpoint"""
    try:
        response = requests.get(f"http://localhost:{port}/health", timeout=5)
        return response.status_code == 200, response.json()
    except:
        return False, None

def main():
    print_header_emoji("POCHI! KAWAII NE~ - SYSTEM STATUS", "📊")

    # Get project root
    project_root = Path(__file__).parent.absolute()

    # Load .env
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    # Get configuration
    server_port_str = os.getenv("SERVER_PORT")
    server_port = int(server_port_str) if server_port_str else 4004
    nginx_dir = os.getenv("NGINX_DIR")
    app_version = os.getenv("APP_VERSION")
    environment = os.getenv("ENVIRONMENT")

    # Show system info
    print(f"{Colors.BOLD}System Information:{Colors.END}")
    print(f"  Version:      {app_version}")
    print(f"  Environment:  {environment}")
    print(f"  Time:         {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()

    # ========================================================================
    # Backend Status
    # ========================================================================
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}Backend Server (Port {server_port}){Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")

    backend_running = is_port_open(server_port)

    if backend_running:
        print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}Status:{Colors.END}         {Colors.GREEN}{Colors.BOLD}RUNNING{Colors.END}")
        print(f"{Colors.DIM}  Port:{Colors.END}           {Colors.CYAN}{server_port}{Colors.END} {Colors.DIM}(LISTENING){Colors.END}")

        # Check health
        healthy, health_data = check_health(server_port)
        if healthy and health_data:
            print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}Health:{Colors.END}         {Colors.GREEN}{Colors.BOLD}OK HEALTHY{Colors.END}")

            # Show health details
            if 'database' in health_data:
                db_status = health_data['database']
                if db_status == 'connected':
                    print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}Database:{Colors.END}       {Colors.GREEN}{Colors.BOLD}OK CONNECTED{Colors.END}")
                else:
                    print(f"{Colors.RED}{Colors.BOLD}✗{Colors.END} {Colors.RED}Database:{Colors.END}       {Colors.RED}{Colors.BOLD}FAIL {db_status}{Colors.END}")

            if 'ai_service' in health_data.get('components', {}):
                ai_service = health_data['components']['ai_service']
                provider = ai_service.get('provider', 'Unknown')
                model = ai_service.get('model', 'Unknown')
                if ai_service.get('status') == 'configured':
                    print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}AI Service:{Colors.END}     {Colors.GREEN}{Colors.BOLD}OK {provider} ({model}){Colors.END}")
                else:
                    print(f"{Colors.YELLOW}{Colors.BOLD}⚠{Colors.END} {Colors.YELLOW}AI Service:{Colors.END}     {Colors.YELLOW}{Colors.BOLD}{ai_service.get('status')}{Colors.END}")

            if 'uptime_seconds' in health_data:
                uptime = health_data['uptime_seconds']
                hours = int(uptime // 3600)
                minutes = int((uptime % 3600) // 60)
                seconds = int(uptime % 60)
                print(f"{Colors.DIM}  Uptime:{Colors.END}         {Colors.CYAN}{hours}h {minutes}m {seconds}s{Colors.END}")
        else:
            print(f"{Colors.YELLOW}{Colors.BOLD}⚠{Colors.END} {Colors.YELLOW}Health:{Colors.END}         {Colors.YELLOW}{Colors.BOLD}NO RESPONSE{Colors.END}")

        print()
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗{Colors.END} {Colors.RED}Status:{Colors.END}         {Colors.RED}{Colors.BOLD}NOT RUNNING{Colors.END}")
        print(f"Port:           {server_port} (Not listening)")
        print()
        print(f"{Colors.YELLOW}To start backend:{Colors.END}")
        print(f"  {Colors.GREEN}python start.py{Colors.END}")

    print()

    # ========================================================================
    # nginx Status
    # ========================================================================
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}nginx (Port 80){Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")

    nginx_running = is_port_open(80)

    if nginx_running:
        print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}Status:{Colors.END}         {Colors.GREEN}{Colors.BOLD}RUNNING{Colors.END}")
        print(f"{Colors.DIM}  Port:{Colors.END}           {Colors.CYAN}80{Colors.END} {Colors.DIM}(LISTENING){Colors.END}")
        print(f"{Colors.DIM}  Location:{Colors.END}       {Colors.CYAN}{nginx_dir}{Colors.END}")
        print()
    else:
        print(f"{Colors.RED}{Colors.BOLD}✗{Colors.END} {Colors.RED}Status:{Colors.END}         {Colors.RED}{Colors.BOLD}NOT RUNNING{Colors.END}")
        print(f"{Colors.DIM}  Port:{Colors.END}           {Colors.CYAN}80{Colors.END} {Colors.DIM}(Not listening){Colors.END}")
        print(f"{Colors.DIM}  Location:{Colors.END}       {Colors.CYAN}{nginx_dir}{Colors.END}")
        print()
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠{Colors.END} {Colors.YELLOW}To start nginx:{Colors.END}")
        if sys.platform == "win32":
            print(f"  {Colors.GREEN}cd {nginx_dir}{Colors.END}")
            print(f"  {Colors.GREEN}start nginx{Colors.END}")
        else:
            print(f"  {Colors.GREEN}cd {nginx_dir}{Colors.END}")
            print(f"  {Colors.GREEN}sudo ./nginx{Colors.END}")

    print()

    # ========================================================================
    # Files Status
    # ========================================================================
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}Files{Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")

    files_to_check = {
        ".env": "Configuration",
        ".venv": "Virtual Environment",
        "backend/main.py": "Backend Entry",
        "frontend/dist": "Frontend Build",
    }

    for file_path, description in files_to_check.items():
        full_path = project_root / file_path
        if full_path.exists():
            print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}{description}:{Colors.END}     {Colors.CYAN}{file_path}{Colors.END}")
        else:
            print(f"{Colors.RED}{Colors.BOLD}✗{Colors.END} {Colors.RED}{description}:{Colors.END}     {Colors.RED}{file_path}{Colors.END} {Colors.DIM}(missing){Colors.END}")

    print()

    # ========================================================================
    # Logs
    # ========================================================================
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.CYAN}Logs{Colors.END}")
    print(f"{Colors.BOLD}{Colors.MAGENTA}{'═'*80}{Colors.END}")

    backend_log = project_root / ".cache" / "logs" / "backend.log"
    if backend_log.exists():
        size = backend_log.stat().st_size
        size_mb = size / (1024 * 1024)
        print(f"{Colors.GREEN}{Colors.BOLD}●{Colors.END} {Colors.GREEN}Backend Log:{Colors.END}    {Colors.CYAN}{backend_log}{Colors.END}")
        print(f"{Colors.DIM}  Size:{Colors.END}           {Colors.CYAN}{size_mb:.2f} MB{Colors.END}")

        # Show last error if any
        try:
            with open(backend_log, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                errors = [l for l in lines[-50:] if 'ERROR' in l or 'Exception' in l]
                if errors:
                    print(f"Recent Errors:  {Colors.YELLOW}{len(errors)} found{Colors.END}")
                    print()
                    print(f"{Colors.YELLOW}Last error:{Colors.END}")
                    for line in errors[-3:]:
                        print(f"  {line.strip()}")
        except Exception as e:
            print(f"Cannot read log: {e}")
    else:
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠{Colors.END} {Colors.YELLOW}Backend Log:{Colors.END}    {Colors.YELLOW}{Colors.BOLD}NOT FOUND{Colors.END}")

    print()

    # ========================================================================
    # Summary
    # ========================================================================
    print(f"{Colors.BOLD}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}Summary{Colors.END}")
    print(f"{Colors.BOLD}{'='*80}{Colors.END}")

    all_ok = backend_running and nginx_running

    if all_ok:
        print(f"{Colors.GREEN}{Colors.BOLD}OK ALL SYSTEMS OPERATIONAL{Colors.END}")
        print()
    else:
        print(f"{Colors.YELLOW}{Colors.BOLD}⚠ SOME SERVICES NOT RUNNING{Colors.END}")
        print()
        if not backend_running:
            print(f"  {Colors.RED}FAIL{Colors.END} Backend is down")
        if not nginx_running:
            print(f"  {Colors.YELLOW}!{Colors.END} nginx is down (optional)")

        print()
        print(f"{Colors.BOLD}To start:{Colors.END}")
        print(f"  {Colors.GREEN}python start.py{Colors.END}")

    print()

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print(f"{Colors.YELLOW}Status check interrupted{Colors.END}")
        sys.exit(0)
    except Exception as e:
        print()
        print(f"{Colors.RED}Status check failed: {e}{Colors.END}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
