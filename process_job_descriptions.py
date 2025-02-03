import json
import os
from datetime import datetime
import csv

from openai_api import call_openai_api
from openai.types.chat import ChatCompletionToolParam
from pdf_parser import parse_pdf_to_text


def process_job_descriptions(folder_path):
    """
    1. Iterates over all PDFs in a folder.
    2. Extracts text from each PDF.
    3. Sends text to OpenAI API.
    4. Writes candidate profiles to a CSV file.
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

                general_info = extract_job_general_info(pdf_text)
                compensation_range = determine_compensation_range(
                    general_info.get("job_level")
                )
                industry_labels = generate_industry_labels(pdf_text)
                function_labels = generate_function_labels(pdf_text)

                job_description.update(
                    {
                        **general_info,
                        **compensation_range,
                        **industry_labels,
                        **function_labels,
                        "job_description_text": pdf_text,
                    }
                )
                job_descriptions.append(job_description)
            except Exception as e:
                print(f"Error calling OpenAI API for {filename}: {e}")

    # Create output directory if it doesn't exist
    output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)

    # Generate timestamp filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"job_descriptions_{timestamp}.csv")

    # Write job_descriptions to CSV file
    if job_descriptions:
        # Get all unique keys from all dictionaries
        fieldnames = set()
        for job in job_descriptions:
            fieldnames.update(job.keys())

        with open(output_file, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=sorted(fieldnames))
            writer.writeheader()
            writer.writerows(job_descriptions)

    return output_file


def extract_job_general_info(pdf_text):
    submit_job_general_info_tool: ChatCompletionToolParam = {
        "type": "function",
        "function": {
            "name": "submit_job_general_info",
            "description": "Submit job's general information",
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
                    "job_level": {
                        "type": "number",
                        "enum": [4, 5, 6, 7, 8, 9, 10, 11, 12],
                        "description": "The level of the job description",
                    },
                    "company_size": {
                        "type": "string",
                        "enum": ["0-10", "10-50", "50-100", "100+"],
                        "description": "The company's size",
                    },
                    "company_hq_location": {
                        "type": "string",
                        "enum": ["Japan", "Global"],
                        "description": "The company's headquarters location",
                    },
                    "employee_count_in_japan": {
                        "type": "string",
                        "enum": [
                            "0-10",
                            "10-50",
                            "50-100",
                            "100+",
                        ],
                        "description": "The company's size",
                    },
                    "english_level_required": {
                        "type": "string",
                        "enum": ["Native", "Fluent", "Intermediate", "Basic"],
                        "description": "The English level required for the job description",
                    },
                    "japanese_level_required": {
                        "type": "string",
                        "enum": ["N2", "N3", "N4", "N5"],
                        "description": "The Japanese level required for the job description",
                    },
                    "target_age": {
                        "type": "number",
                        "description": "The target age for the job description",
                    },
                },
                "required": [
                    "company",
                    "position",
                    "country",
                    "city",
                    "job_level",
                    "company_size",
                    "company_hq_location",
                    "employee_count_in_japan",
                    "english_level_required",
                    "japanese_level_required",
                    "target_age",
                ],
            },
        },
    }

    system_prompt = """
You are a helpful assistant extracting job information from a job description.

Your goal is to identify and provide the following details by calling the function 'submit_job_general_info' with these exact parameters:

1. company (Required)
2. position (Required)
3. country (Required)
4. city (Required)
5. job_level (Required) — Must be one of [4, 5, 6, 7, 8, 9, 10, 11, 12].
   Examples for job_level:
     - 4:  Customer Support, SDR/BDR
     - 5:  Digital Marketing, SMB
     - 6:  Field Marketing, CSM, Solution Eng, Partner/Channel Sales, Mid Market
     - 7:  Enterprise
     - 8:  Head of Marketing, Head of CSM, Head of Solution Eng, Head of Partner/Channel, Sales Manager (Commercial), Director
     - 9:  Sales Manager (Enterprise), Sr. Director
     - 10: RVP
     - 11: Area VP
     - 12: VP
6. company_size (Required) — Must be one of:
   ["0-10", "10-50", "50-100", "100+"]
7. employee_count_in_japan (Required) — Must be one of: ["0-10", "10-50", "50-100", "100+"]
8. company_hq_location (Required) — Must be one of: ["Japan", "Global"]
9. english_level_required (Required) — Must be one of: ["Native", "Fluent", "Intermediate", "Basic"]
10. japanese_level_required (Required) — Must be one of: ["N2", "N3", "N4", "N5"]
11. target_age (Required)

If you cannot infer a particular detail, guess as best as you can.

Return your final result by calling the function 'submit_job_general_info' with these fields as parameters.
"""

    answer = call_openai_api(
        system_prompt=system_prompt,
        user_prompt=pdf_text,
        tools=[submit_job_general_info_tool],
    )

    if (
        not answer
        or not answer.tool_calls
        or not answer.tool_calls[0].function.arguments
    ):
        return None

    return json.loads(answer.tool_calls[0].function.arguments)


def generate_industry_labels(pdf_text):
    submit_job_industry_labels_tool = {
        "type": "function",
        "function": {
            "name": "submit_job_industry_labels",
            "description": "Submit job's industry labels",
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

    system_prompt = """
You are a helpful assistant evaluating information from a job description.
Use the function 'submit_job_industry_labels' to provide the candidate's:
Reference the following Industry grid and select the best fit option.
Select one at a time starting from I1, then selecting one of the options from I2, then from I3. I4 is free space for GPT to tag English keywords for better sorting.
You cannot change rows. For example,anyone in I2 Cloud must be in SaaS, XaaS, Security, or Consulting for I3.
I1: Digital; I2: Cloud; I3: SaaS, XaaS, Security, Consulting; I4: Sales, Marketing, Analytics, Network, Security Eng, Design, HR, Finance, Cloud Compute, AI, Data Other[Propose]
I1: Digital; I2: Platform; I3: SaaS, XaaS, Security, Consulting; I4:Food Delivery, Logistics, EdTech, TravelTech,  Social Media, Chatapps, Payments, Insurtech, Exchange, Blockchain
I1: Physical; I2: Robotics; I3: Mobility, Space, VR&AR, Smart Cities, Robots, 3D Printing; I4: Autonomus Driving/Robots/Satellites/Launch
I1: Physical; I2: Semicon; I3: Telco, Data CenterChip Design, Fabrication, Quantum; I4: Licensing, inhouse
I1: Physical; I2: Energy; I3: Solar, Nuclear, Hydrogen, Batteries, Charging; I4: Materials
I1: Consulting; I2: Strategy; I3: Strategy, Management; I4: MBB, Big Consutling, Other
I1: Consulting; I2: Corporate; I3: HR, Accounting, Marketing, Research;
"""

    answer = call_openai_api(
        system_prompt=system_prompt,
        user_prompt=pdf_text,
        tools=[submit_job_industry_labels_tool],
    )

    if (
        not answer
        or not answer.tool_calls
        or not answer.tool_calls[0].function.arguments
    ):
        return None

    return json.loads(answer.tool_calls[0].function.arguments)


def generate_function_labels(pdf_text):
    submit_job_function_labels_tool = {
        "type": "function",
        "function": {
            "name": "submit_job_function_labels",
            "description": "Submit job's function labels",
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

    system_prompt = """
You are a helpful assistant evaluating candidate information from a resume.
Use the function 'submit_job_function_labels' to provide the candidate's:
Reference the following Function grid and select the best fit option.
Select one at a time starting from F1, then selecting one of the options from F2, then from F3. F4 is free space for GPT to tag English keywords for better sorting.
You cannot change rows. For example,anyone in F2 Sales must be in AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other for F3.
F1: GTM; F2: Sales; F3: AE, BDM, CSM, Inside Sales, SE, Partner, Consultant, Other
F1: GTM; F2: Marketing; F3: Digital, Field, Community, PR, Comms, Growth, Social, Content
F1: GTM; F2: Consulting/PS; F3: Delivery, Implementation, Customer Success, TAM, Pre-sales
F1: GTM; F2: Operations; F3: Strategy, CS, Analytics, Product, Project, Procurement, Supply Chain
F1: Corporate; F2: Finance & Accounting; F3: FP&A, Compensation, M&A
F1: Corporate; F2: HR & Admin; F3: HRBP, Recruiting, Office Manager, Onboarding, Training
F1: Corporate; F2: Legal & Compliance; F3: Legal, Compilance, GR, Policy
F1: Corporate; F2: Internal IT; F3: IT Support, Onboarding
F1: Product & Eng; F2: Computer Science; F3: Product, UX, SWE, QA, DevOps
F1: Product & Eng; F2: Physics; F3: Electrical, Mechanical, Embedded etc.
"""

    answer = call_openai_api(
        system_prompt=system_prompt,
        user_prompt=pdf_text,
        tools=[submit_job_function_labels_tool],
    )

    if (
        not answer
        or not answer.tool_calls
        or not answer.tool_calls[0].function.arguments
    ):
        return None

    return json.loads(answer.tool_calls[0].function.arguments)


def determine_compensation_range(job_level):
    compensation_range = {
        4: "6,000,000-10,000,000",
        5: "8,000,000-12,000,000",
        6: "12,000,000-18,000,000",
        7: "16,000,000-26,000,000",
        8: "22,000,000-30,000,000",
        9: "24,000,000-32,000,000",
        10: "30,000,000-45,000,000",
        11: "35,000,000-50,000,000",
        12: "47,000,000-60,000,000",
    }

    return {
        "compensation_range": compensation_range.get(job_level, "Unknown"),
    }
