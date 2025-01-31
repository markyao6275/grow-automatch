import io
import pytesseract

from pdfminer.high_level import extract_text_to_fp
from pdfminer.layout import LAParams
from pdf2image import convert_from_path


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
    Extract text from a PDF file using pdfminer.six.
    Attempts to preserve layout more accurately than PyPDF2.
    """
    output = io.StringIO()
    laparams = LAParams(
        line_margin=0.2,  # tweak to handle tighter or looser line spacing
        char_margin=2.0,  # tweak to merge or separate characters/words more
        word_margin=0.1,  # tweak to join words split across lines
    )
    with open(pdf_path, "rb") as f:
        extract_text_to_fp(f, output, laparams=laparams, output_type="text", codec=None)
    text = output.getvalue()
    return text


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
