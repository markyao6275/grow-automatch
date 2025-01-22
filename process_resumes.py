import json
import os
from datetime import datetime

from PyPDF2 import PdfReader
from openai_api import call_openai_api
from openai.types.chat import (
    ChatCompletionToolParam,
)


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


def get_general_info(pdf_text):
    """
    Reads in resume/profile text (pdf_text) and returns a single data row for easy pasting into Google Sheets.
    Columns:
      Full Name | Current Company | Current Position | Previous Company 1 | Position 1 |
      Previous Company 2 | Previous Position 2 | Current Country | Current City (Prefecture) |
      Age (+/- x) | Gender | Japanese Level | English Level | Other Languages
    """
    get_generate_info_tool: ChatCompletionToolParam = {
        "type": "function",
        "function": {
            "name": "get_general_info",
            "description": "Get candidate's general information from the resume text",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "The name of the candidate",
                    },
                    "current_company": {
                        "type": "string",
                        "description": "The current company of the candidate",
                    },
                    "current_position": {
                        "type": "string",
                        "description": "The current position of the candidate",
                    },
                    "previous_company_1": {
                        "type": "string",
                        "description": "The first previous company of the candidate",
                    },
                    "previous_position_1": {
                        "type": "string",
                        "description": "The first previous position of the candidate",
                    },
                    "previous_company_2": {
                        "type": "string",
                        "description": "The second previous company of the candidate",
                    },
                    "previous_position_2": {
                        "type": "string",
                        "description": "The second previous position of the candidate",
                    },
                    "country": {
                        "type": "string",
                        "description": "The country of the candidate",
                    },
                    "city": {
                        "type": "string",
                        "description": "The city of the candidate",
                    },
                    "age": {
                        "type": "string",
                        "description": "The age of the candidate",
                    },
                    "gender": {
                        "type": "string",
                        "description": "The gender of the candidate",
                    },
                    "japanese_level": {
                        "type": "string",
                        "description": "The Japanese level of the candidate",
                    },
                    "english_level": {
                        "type": "string",
                        "description": "The English level of the candidate",
                    },
                    "other_languages": {
                        "type": "string",
                        "description": "The other languages of the candidate",
                    },
                },
                "required": [
                    "name",
                    "current_company",
                    "current_position",
                    "previous_company_1",
                    "previous_position_1",
                    "previous_company_2",
                    "previous_position_2",
                    "country",
                    "city",
                    "age",
                    "gender",
                    "japanese_level",
                    "english_level",
                    "other_languages",
                ],
            },
        },
    }
    system_prompt = (
        "You are a helpful assistant extracting candidate information from a resume.\n\n"
        "Use the function 'get_general_info' to provide the candidate's:\n"
        "Full Name\tCurrent Company\tCurrent Position\tPrevious Company 1\tPosition 1\t"
        "Previous Company 2\tPrevious Position 2\tCurrent Country\tCurrent City (Prefecture)\t"
        "Age (+/- x)\tGender\tJapanese Level\tEnglish Level\tOther Languages\n\n"
        "Gender (options):\n"
        "1) Male\n"
        "2) Female\n\n"
        "Age example with margin of error: '35 +/- 2'. If unclear, guess or put 'Unknown'.\n\n"
        "Language (Japanese): Choose 1 Option\n"
        "1) Native\n"
        "2) Fluent (Fluent communication in Japanese, or N1, or advanced)\n"
        "3) Business (N2 level; can speak but not fluent)\n"
        "4) Reading/Writing (Can communicate over email/resume)\n"
        "5) None\n\n"
        "Language (English): Choose 1 Option\n"
        "1) Native\n"
        "2) Fluent (Fluent communication, studied abroad, or TOEIC > 900)\n"
        "3) Business (Can speak English, not fluent)\n"
        "4) Reading/Writing (Can communicate over email/resume)\n"
        "5) None\n\n"
        "If you cannot infer some details, guess or say 'Unknown'.\n"
    )

    return call_openai_api(system_prompt, pdf_text, tools=[get_generate_info_tool])


def generate_industry_labels(pdf_text):
    generate_industry_labels_tool = {
        "type": "function",
        "function": {
            "name": "generate_industry_labels",
            "description": "Generate industry labels for the candidate",
            "parameters": {
                "type": "object",
                "properties": {
                    "I1": {
                        "type": "string",
                        "description": "The industry label for I1",
                    },
                    "I2": {
                        "type": "string",
                        "description": "The industry label for I2",
                    },
                    "I3": {
                        "type": "string",
                        "description": "The industry label for I3",
                    },
                    "I4": {
                        "type": "string",
                        "description": "The industry label for I4",
                    },
                },
                "required": ["I1", "I2", "I3", "I4"],
            },
        },
    }
    system_prompt = (
        "You are a helpful assistant evaluating candidate information from a resume.\n\n"
        "Use the function 'generate_industry_labels' to provide the candidate's:\n"
        "Reference the following Industry grid and select the best fit option.\n"
        "Select one at a time starting from I1, then selecting one of the options from I2, then from I3. I4 is free space for GPT to tag keywords for better sorting.\n"
        "You cannot change rows. For example,anyone in I2 Cloud must be in SaaS, XaaS, Security, or Consulting for I3.\n\n"
        "I1: Digital; I2: Cloud; I3: SaaS, XaaS, Security, Consulting; I4: Sales, Marketing, Analytics, Network, Security Eng, Design, HR, Finance, Cloud Compute, AI, Data Other[Propose]\n"
        "I1: Digital; I2: Platform; I3: SaaS, XaaS, Security, Consulting; I4:Food Delivery, Logistics, EdTech, TravelTech,  Social Media, Chatapps, Payments, Insurtech, Exchange, Blockchain\n"
        "I1: Physical; I2: Robotics; I3: Mobility, Space, VR&AR, Smart Cities, Robots, 3D Printing; I4: Autonomus Driving/Robots/Satellites/Launch\n"
        "I1: Physical; I2: Semicon; I3: Telco, Data CenterChip Design, Fabrication, Quantum; I4: Licensing, inhouse\n"
        "I1: Physical; I2: Energy; I3: Solar, Nuclear, Hydrogen, Batteries, Charging; I4: Materials\n"
        "I1: Consulting; I2: Strategy; I3: Strategy/Management; I4: MBB, Big Consutling, Other\n"
        "I1: Consulting; I2: Corporate; I3: HR/Accounting/Marketing/Research;"
    )

    return call_openai_api(
        system_prompt, pdf_text, tools=[generate_industry_labels_tool]
    )


def generate_function_labels(pdf_text):
    generate_function_labels_tool = {
        "type": "function",
        "function": {
            "name": "generate_function_labels",
            "description": "Generate function labels for the candidate",
            "parameters": {
                "type": "object",
                "properties": {
                    "F1": {
                        "type": "string",
                        "description": "The function label for F1",
                    },
                    "F2": {
                        "type": "string",
                        "description": "The function label for F2",
                    },
                    "F3": {
                        "type": "string",
                        "description": "The function label for F3",
                    },
                    "F4": {
                        "type": "string",
                        "description": "The function label for F4",
                    },
                },
                "required": ["F1", "F2", "F3", "F4"],
            },
        },
    }
    system_prompt = (
        "You are a helpful assistant evaluating candidate information from a resume.\n\n"
        "Use the function 'generate_function_labels' to provide the candidate's:\n"
        "Reference the following Function grid and select the best fit option.\n"
        "Select one at a time starting from F1, then selecting one of the options from F2, then from F3. F4 is free space for GPT to tag keywords for better sorting.\n"
        "You cannot change rows. For example,anyone in F2 Sales must be in AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other for F3.\n\n"
        "I1: GTM; I2: Sales; I3: AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other\n"
        "I1: GTM; I2: Marketing; I3: Digital, Field, Community, PR, Comms, Growth, Social, Content\n"
    )

    return call_openai_api(
        system_prompt, pdf_text, tools=[generate_function_labels_tool]
    )


def process_resumes(folder_path):
    """
    1. Iterates over all PDFs in a folder.
    2. Extracts text from each PDF.
    3. Sends text to OpenAI API.
    4. Writes candidate profiles to a JSON file.
    """
    candidate_profiles = []

    for filename in os.listdir(folder_path):
        if filename.lower().endswith(".pdf"):
            pdf_path = os.path.join(folder_path, filename)
            print(f"Processing PDF: {pdf_path}")

            pdf_text = parse_pdf_to_text(pdf_path)

            # If PDF text is too large, you may need to chunk it.
            # For simplicity, we're sending it all at once here.
            try:
                candidate_profile = {"filename": pdf_path}

                general_info = get_general_info(pdf_text)
                industry_labels = generate_industry_labels(pdf_text)
                function_labels = generate_function_labels(pdf_text)

                candidate_profile.update(
                    {**general_info, **industry_labels, **function_labels}
                )
                candidate_profiles.append(candidate_profile)
            except Exception as e:
                print(f"Error calling OpenAI API for {filename}: {e}")

    # Create output directory if it doesn't exist
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)

    # Generate timestamp filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"responses_{timestamp}.json")

    # Write candidate_profiles to JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(candidate_profiles, f, ensure_ascii=False, indent=2)
