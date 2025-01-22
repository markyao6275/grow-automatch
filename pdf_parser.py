from PyPDF2 import PdfReader


def parse_pdf_to_text(pdf_path):
    """
    Extract text from a PDF file using PyPDF2.
    """
    text_content = []
    with open(pdf_path, "rb") as f:
        reader = PdfReader(f)
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_content.append(page_text)
    return "\n".join(text_content)
