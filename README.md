# grow-automatch

A tool for matching resumes with job descriptions.

## Setup Instructions

1. Create a `/job_descriptions` folder to store your job posting files
2. Create a `/resumes` folder to store candidate resume files
3. Create a `/output` folder to store the output files
4. Create a `/output/scored_candidates` folder to store the CSVs with the scored candidates
5. Create virtual environment
6. Activate virtual environment
7. Install dependencies
8. Run `python script.py`

## Build Instructions

1. Install PyInstaller: `pyinstaller` is included in the `requirements.txt`.
2. Run the following PyInstaller command to build the executable.
   Windows:
   `pyinstaller --onefile --add-data "assets;assets" --icon="assets/grow.ico" --windowed script.py`
   Mac:
   `pyinstaller --onefile --add-data "assets:assets" --icon="assets/grow.ico" --windowed script.py`
3. Go to the `dist` folder and locate your executable file (`script.exe`).
