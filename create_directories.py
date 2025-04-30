import os
import sys

def get_base_path():
    """Determine the base path for directory creation."""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(sys.executable)
    return os.path.abspath(".")

def create_directory(dir_name):
    """Create a directory in the appropriate location."""
    base_path = get_base_path()
    target_dir = os.path.join(base_path, dir_name)

    try:
        os.makedirs(target_dir, exist_ok=True)
        print(f"Directory created: {target_dir}")
    except Exception as e:
        print(f"Error creating directory: {e}")