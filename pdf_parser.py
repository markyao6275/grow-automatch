import pytesseract
from pdf2image import convert_from_path

from PyPDF2 import PdfReader

# For Windows users, you may need to specify the Tesseract location
# pytesseract.pytesseract.tesseract_cmd = "C:\\Program Files\\Tesseract-OCR\\tesseract.exe"

def get_text_using_ocr(pdf_path, dpi=300, lang="eng"):
    """
    Extract text from a scanned (image-based) PDF by rasterizing each page
    and running Tesseract OCR on the resulting image.

    :param pdf_path: Path to the PDF file.
    :param dpi: Resolution (dots per inch) for rendering PDF to image.
               Higher values can improve OCR accuracy at the cost of speed.
    :param lang: Tesseract language code, e.g., 'eng' for English.
    :return: A string containing the extracted text from all pages.
    """
    # Convert PDF to a list of PIL Image objects
    pages = convert_from_path(pdf_path, dpi=dpi)
    extracted_text_pages = []

    for page_img in pages:
        # Use Tesseract to do OCR on the page image
        page_text = pytesseract.image_to_string(page_img, lang=lang)
        extracted_text_pages.append(page_text)

    # Join text from all pages into a single string
    return "\n".join(extracted_text_pages)


def extract_text_from_pdf(pdf_path):
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


def parse_pdf_to_text(pdf_path, dpi=300, lang="eng"):
    """
    Extract text from a PDF using both OCR and direct text extraction methods,
    combining the results into a single string.

    :param pdf_path: Path to the PDF file.
    :param dpi: Resolution for OCR rendering.
    :param lang: Tesseract language code for OCR.
    :return: A string containing the combined extracted text.
    """
    # Get text using OCR method
    ocr_text = get_text_using_ocr(pdf_path, dpi=dpi, lang=lang)

    # Get text using direct extraction
    direct_text = extract_text_from_pdf(pdf_path)

    # Combine both results with a separator
    combined_text = (
        "=== OCR EXTRACTED TEXT ===\n"
        f"{ocr_text}\n"
        "=== DIRECTLY EXTRACTED TEXT ===\n"
        f"{direct_text}"
    )

    return combined_text
