"""PDF handling utilities for text extraction."""

from typing import Optional

import PyPDF2


def extract_text_from_pdf(pdf_path: str) -> Optional[str]:
    """
    Extract text from a PDF file.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        Extracted text or None if extraction fails
    """
    try:
        text = ""
        with open(pdf_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            num_pages = len(pdf_reader.pages)

            for page_num in range(num_pages):
                page = pdf_reader.pages[page_num]
                text += page.extract_text()
                text += "\n"

        return text.strip() if text else None

    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return None


def get_pdf_info(pdf_path: str) -> dict:
    """
    Get metadata information about a PDF file.

    Args:
        pdf_path: Path to the PDF file

    Returns:
        Dictionary with PDF metadata
    """
    try:
        with open(pdf_path, "rb") as file:
            pdf_reader = PyPDF2.PdfReader(file)
            return {
                "num_pages": len(pdf_reader.pages),
                "metadata": pdf_reader.metadata,
            }
    except Exception as e:
        print(f"Error getting PDF info: {e}")
        return {}
