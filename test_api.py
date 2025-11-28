#!/usr/bin/env python3
"""
Simple API connection test script
Tests if the API endpoints are accessible
Uses urllib (built-in) - no external dependencies required
"""

import urllib.request
import urllib.error
import json
import sys
import os
from pathlib import Path

# Try to get port and base URL from environment or config
port = None
base_url = None

# Read from .env file
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    try:
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line.startswith("SERVER_PORT="):
                    port_str = line.split("=", 1)[1].strip().strip('"').strip("'")
                    try:
                        port = int(port_str)
                    except ValueError:
                        pass
                elif line.startswith("VITE_API_URL=") or line.startswith("API_URL="):
                    base_url = line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass

# Also check environment variables
if not base_url:
    base_url = os.getenv("VITE_API_URL") or os.getenv("API_URL")

if not port:
    port_str = os.getenv("SERVER_PORT")
    if port_str:
        try:
            port = int(port_str)
        except ValueError:
            pass

# If port not found, try to get from config
if not port:
    try:
        import sys
        sys.path.insert(0, str(Path(__file__).parent / "backend"))
        from config import Config
        config = Config()
        port = getattr(config, 'server_port', 4004)
    except Exception:
        port = 4004  # Default from config.py

# If base_url is a path (not a full URL), ignore it for API testing
# Backend API is at root, not under /pochi-kawaii path
if base_url:
    if not base_url.startswith(("http://", "https://")):
        # It's a path (like /pochi-kawaii), ignore it for API testing
        # Backend API endpoints are at root level
        base_url = None

# Use direct backend URL for API testing
if not base_url:
    base_url = f"http://localhost:{port}"

# Remove trailing slash if present
base_url = base_url.rstrip("/")

print("🔍 Testing API connection\n")

# Test endpoints
endpoints = [
    ("/health", "GET", None),
    ("/api/feedback", "GET", None),
    ("/api/generate/status", "GET", None),
]

success_count = 0
fail_count = 0

for endpoint, method, data in endpoints:
    url = f"{base_url}{endpoint}"
    try:
        print(f"📡 Testing {method} {endpoint}...", end=" ")
        
        # Create request
        req = urllib.request.Request(url, method=method)
        req.add_header("Accept", "application/json")
        
        if method == "POST" and data:
            req.add_header("Content-Type", "application/json")
            json_data = json.dumps(data).encode("utf-8")
            req.data = json_data
        
        # Make request with timeout
        with urllib.request.urlopen(req, timeout=5) as response:
            status_code = response.getcode()
            
            if status_code == 200:
                print(f"✅ OK (Status: {status_code})")
                try:
                    response_data = json.loads(response.read().decode("utf-8"))
                    if isinstance(response_data, dict):
                        if "status" in response_data:
                            print(f"   └─ Status: {response_data.get('status', 'N/A')}")
                        elif "available" in response_data:
                            available = response_data.get('available', False)
                            model = response_data.get('model', 'N/A')
                            message = response_data.get('message', '')
                            print(f"   └─ Available: {available}")
                            if available:
                                print(f"   └─ Model: {model}")
                                print(f"   └─ {message}")
                except:
                    pass
                success_count += 1
            else:
                print(f"⚠️  Status: {status_code}")
                success_count += 1  # Still counts as connection successful
                
    except urllib.error.URLError as e:
        if isinstance(e.reason, TimeoutError) or "timed out" in str(e).lower():
            print("❌ Timeout - Server took too long to respond")
        elif "Connection refused" in str(e) or "Name or service not known" in str(e):
            print("❌ Connection failed - Is the server running?")
        else:
            print(f"❌ Connection error: {str(e)}")
        fail_count += 1
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        fail_count += 1

print(f"\n📊 Results: {success_count} successful, {fail_count} failed")

if fail_count > 0:
    print("\n💡 Tips:")
    print("   - Make sure the backend server is running")
    print("     → Run: python start.py")
    print("     → Or check if server is running on the correct port")
    print("   - Check if the port is correct")
    print("     → Default port is 4004 (from SERVER_PORT in .env)")
    print("     → Or check your .env file for SERVER_PORT")
    print("   - Set VITE_API_URL or API_URL environment variable if needed")
    print("\n📝 To start the server:")
    print("   python start.py")
    sys.exit(1)
else:
    print("\n✅ All API endpoints are accessible!")
    sys.exit(0)

