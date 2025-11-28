#!/usr/bin/env python3
"""
Pochi! Kawaii ne~ - Force Stop Script
ONLY use this if stop.py fails due to zombie processes
This will restart Winsock to clear zombie TCP states
"""

import os
import sys
import subprocess
import time
from pathlib import Path
from dotenv import load_dotenv

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

def print_header_emoji(text, emoji="⚠️"):
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

def main():
    print_header_emoji("POCHI! KAWAII NE~ - FORCE STOP", "⚠️")

    if sys.platform != "win32":
        print_error("This script is Windows-only")
        print_info("On Linux/Mac, use: lsof -ti :4004 | xargs kill -9")
        sys.exit(1)

    # Get project root
    project_root = Path(__file__).parent.absolute()
    os.chdir(project_root)

    # Load .env
    env_file = project_root / ".env"
    if env_file.exists():
        load_dotenv(env_file)

    server_port_str = os.getenv("SERVER_PORT")
    server_port = int(server_port_str) if server_port_str else 4004

    print_warning("THIS IS A LAST RESORT - Only use if normal stop.py fails!")
    print_info("This will change the port number to avoid zombie processes")
    print()

    response = input("Continue? (y/N): ")
    if response.lower() != 'y':
        print_info("Aborted")
        sys.exit(0)

    print()
    print_header(f"Changing Backend Port from {server_port} to {server_port + 1}")

    # Update .env file
    if env_file.exists():
        with open(env_file, 'r', encoding='utf-8') as f:
            content = f.read()

        # Replace port
        new_port = server_port + 1
        content = content.replace(f"SERVER_PORT={server_port}", f"SERVER_PORT={new_port}")

        with open(env_file, 'w', encoding='utf-8') as f:
            f.write(content)

        print_success(f"Updated .env: SERVER_PORT={new_port}")
        print()
        print_info(f"Old port {server_port} is now abandoned (will be released by Windows)")
        print_info(f"New port {new_port} will be used for backend")
        print()
        print_warning("Important notes:")
        print_info("  1. Update nginx config to point to new port")
        print_info(f"     proxy_pass configured for port {new_port}")
        print_info("  2. Run: nginx -s reload")
        print_info("  3. Run: python start.py")
        print()
        print_success("Port changed successfully!")
    else:
        print_error(".env file not found")
        sys.exit(1)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("Interrupted by user")
        sys.exit(1)
    except Exception as e:
        print()
        print_error(f"Failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
