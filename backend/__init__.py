import os
from pathlib import Path
from .config import load_env_file

env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_env_file(env_file)

__version__ = os.getenv("APP_VERSION")
__author__ = os.getenv("APP_DEVELOPER")
__company__ = os.getenv("APP_COMPANY")
__description__ = os.getenv("APP_NAME")
__copyright__ = f"© {__company__}"