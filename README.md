# Grow AutoMatch

AI-powered resume matching for the Japanese job market.

## Project Overview

This project provides tools for matching resumes with job descriptions using AI, focusing on the Japanese job market. The application extracts information from PDF resumes and job descriptions, processes them using OpenAI's GPT models, and scores candidates based on their match to job requirements.

The project has two implementations:
1. **Python Desktop Application** (original version)
2. **Next.js Web Application** (new web-based version)

## Python Desktop Application

The original implementation is a desktop application built with Python and PyQt6. It provides a graphical user interface for uploading resumes and job descriptions, processing them, and viewing the results.

### Features

- PDF text extraction with OCR capabilities
- Profile information extraction using OpenAI
- Industry and function classification
- Sophisticated candidate scoring system
- Desktop UI built with PyQt6

### Setup Instructions

1. Create a `/job_descriptions` folder to store your job posting files
2. Create a `/resumes` folder to store candidate resume files
3. Create a `/output` folder to store the output files
4. Create a `/output/scored_candidates` folder to store the CSVs with the scored candidates
5. Create virtual environment
6. Activate virtual environment
7. Install dependencies: `pip install -r requirements.txt`
8. Run `python script.py`

### Build Instructions

1. Install PyInstaller: `pyinstaller` is included in the `requirements.txt`.
2. Run the following PyInstaller command to build the executable.
   Windows:
   `pyinstaller --onefile --add-data "assets;assets" --icon="assets/grow.ico" --windowed script.py`
   Mac:
   `pyinstaller --onefile --add-data "assets:assets" --icon="assets/grow.ico" --windowed script.py`
3. Go to the `dist` folder and locate your executable file (`script.exe`).

## Next.js Web Application

The web implementation provides the same functionality as the desktop application but as a web application. It's built with Next.js, React, and TypeScript.

### Features

- Web-based interface accessible from any browser
- PDF processing using pdf2json
- API routes for resume/job description processing and candidate scoring
- Same matching algorithm as the desktop application
- Responsive design with TailwindCSS

### Running the Web Version

```bash
# Navigate to the web directory
cd web

# Install dependencies
npm install

# Create .env.local with your OpenAI API key
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env.local

# Run the development server
npm run dev
```

For more details, see the [web README](/web/README.md).

## How It Works

1. **PDF Processing**: Extract text from PDFs (using either pdfminer/pytesseract or pdf2json)
2. **Profile Extraction**: Use OpenAI to extract structured information from resumes and job descriptions
3. **Industry & Function Classification**: Categorize candidates and jobs according to industry and function grids
4. **Matching Algorithm**: 
   - Determine bucket based on industry and function matching
   - Calculate additional points for detailed classifications
   - Apply rule-based scoring for demographics and language skills
   - Use OpenAI for detailed evaluation of high-potential candidates
5. **Results Presentation**: Display sorted candidates with their scores and match quality

## License

This project is proprietary.
