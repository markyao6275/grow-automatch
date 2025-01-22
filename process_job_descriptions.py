import json
import os
from datetime import datetime

from PyPDF2 import PdfReader
from openai_api import call_openai_api
from openai.types.chat import (
    ChatCompletionToolParam,
)


def process_job_descriptions(folder_path):
    """
    1. Iterates over all PDFs in a folder.
    2. Extracts text from each PDF.
    3. Sends text to OpenAI API.
    4. Writes candidate profiles to a JSON file.
    """
    job_descriptions = []

    for filename in os.listdir(folder_path):
        if filename.lower().endswith(".pdf"):
            pdf_path = os.path.join(folder_path, filename)
            print(f"Processing PDF: {pdf_path}")

            pdf_text = parse_pdf_to_text(pdf_path)

            # If PDF text is too large, you may need to chunk it.
            # For simplicity, we're sending it all at once here.
            try:
                job_description = {"filename": pdf_path}

                general_info = get_general_info(pdf_text)
                industry_labels = generate_industry_labels(pdf_text)
                function_labels = generate_function_labels(pdf_text)

                job_description.update(
                    {**general_info, **industry_labels, **function_labels}
                )
                job_descriptions.append(job_description)
            except Exception as e:
                print(f"Error calling OpenAI API for {filename}: {e}")

    # Create output directory if it doesn't exist
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)

    # Generate timestamp filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"job_descriptions_{timestamp}.json")

    # Write job_descriptions to JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(job_descriptions, f, ensure_ascii=False, indent=2)


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
    get_generate_info_tool: ChatCompletionToolParam = {
        "type": "function",
        "function": {
            "name": "get_general_info",
            "description": "Get candidate's general information from the resume text",
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {
                        "type": "string",
                        "description": "The name of the company",
                    },
                    "position": {
                        "type": "string",
                        "description": "The position of the job description",
                    },
                    "country": {
                        "type": "string",
                        "description": "The country of the job description",
                    },
                    "city": {
                        "type": "string",
                        "description": "The city of the job description",
                    },
                },
                "required": ["company", "position", "country", "city"],
            },
        },
    }
    system_prompt = (
        "You are a helpful assistant extracting job information from a job description.\n\n"
        "Use the function 'get_generate_info' to provide the candidate's:\n"
        "Company Name, Position, Country, and City.\n"
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
        "You are a helpful assistant evaluating information from a job description.\n\n"
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
