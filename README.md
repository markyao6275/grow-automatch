# grow-automatch

A tool for matching resumes with job descriptions.

## Setup Instructions

1. Create a `/job_descriptions` folder to store your job posting files
2. Create a `/resumes` folder to store candidate resume files
3. Create virtual environment
4. Activate virtual environment
5. Install dependencies
6. Run `python script.py`

## Build Instructions

1. Install PyInstaller: `pyinstaller` is included in the `requirements.txt`.
2. Run the following PyInstaller command to build the executable.
   Windows:
   `pyinstaller --onefile --name "Grow Automatch" --add-data "assets;assets" --icon="assets/grow.ico" --windowed script.py`
   Mac:
   `pyinstaller --onefile --name "Grow Automatch" --add-data "assets:assets" --icon="assets/grow.icns" --windowed script.py`
3. Go to the `dist` folder and locate your executable file (`script.exe`).
