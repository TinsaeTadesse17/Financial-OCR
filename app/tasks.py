from utils import (
    analyze_pdf_type,
    extract_text_from_pdf,
    extract_images_from_pdf,
    extract_with_mistral,
    ocr_images_to_text,
    format_with_gemini
)



def process_pdf_task(pdf_path):
    try:
        # Determine PDF type
        pdf_type = analyze_pdf_type(pdf_path)
        
        # Extract text
        if pdf_type == "text":
            raw_text = extract_text_from_pdf(pdf_path)
            mistral_text = extract_with_mistral(pdf_path)
        else:
            images = extract_images_from_pdf(pdf_path)
            raw_text = ocr_images_to_text(images)
            mistral_text = extract_with_mistral(pdf_path)
        
        # Format with OpenAI
        formatted_md = format_with_gemini(raw_text, mistral_text)
        
        return {
            "success": True,
            "document_type": pdf_type,
            "parsed_document": formatted_md
        }
        
    except Exception as e:
        print(f"Error processing PDF: {e}")
        return {
            "success": False,
            "error": str(e)}
    finally:
        print("COMPLETED ")
