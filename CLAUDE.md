# CLAUDE.md - Agent Instructions for grow-automatch

## Commands
- Run main app: `python script.py`
- Build executable (Windows): `pyinstaller --onefile --add-data "assets;assets" --icon="assets/grow.ico" --windowed script.py`
- Build executable (Mac): `pyinstaller --onefile --add-data "assets:assets" --icon="assets/grow.ico" --windowed script.py`
- Check OpenAI usage log: `cat openai_usage.log`

## Code Style Guidelines
- **Imports**: Standard library → third-party → local modules with blank lines between groups
- **Formatting**: 4-space indentation, 100 char line length
- **Naming**: snake_case for files/functions/variables, PascalCase for classes
- **Types**: Use type hints (e.g., `def parse_pdf(file_path: str) -> str:`)
- **Error Handling**: Use try/except blocks with specific exceptions
- **Docstrings**: Triple quotes `"""` for function documentation
- **Functions**: Keep functions focused on single responsibility
- **API Calls**: Use wrapper functions in openai_api.py for all OpenAI interactions
- **File Processing**: Check if files exist before opening
- **Output**: Use timestamp-based filenames for generated CSVs (output directory)

This project matches resumes with job descriptions using AI, focusing on the Japanese job market.