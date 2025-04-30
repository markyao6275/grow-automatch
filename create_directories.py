import os
import sys

def create_directories():
    # Get the directory where the script is located
    if getattr(sys, 'frozen', False):  # Running as an executable
        base_path = os.path.dirname(sys.executable)
    else:  # Running as a script
        base_path = os.path.dirname(os.path.abspath(__file__))

    # Define the paths for the new directories
    resumes_dir = os.path.join(base_path, 'resumes')
    job_descriptions_dir = os.path.join(base_path, 'job_descriptions')

    # Create the directories if they don't exist
    os.makedirs(resumes_dir, exist_ok=True)
    os.makedirs(job_descriptions_dir, exist_ok=True)

if __name__ == "__main__":
    create_directories()
    print("Directories created if they didn't exist.")


