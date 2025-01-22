import json
import os
import csv

from openai_api import call_openai_api
from openai.types.chat import ChatCompletionToolParam


def score_candidates(folder_path):
    scored_candidates = []
    for filename in os.listdir(folder_path):
        if filename.lower().endswith(".json"):
            json_file_path = os.path.join(folder_path, filename)
            print(f"Scoring candidate: {json_file_path}")

            # If PDF text is too large, you may need to chunk it.
            # For simplicity, we're sending it all at once here.
            try:
                # 1. Load the JSON file into a Python list of dictionaries
                with open(json_file_path, "r", encoding="utf-8") as file:
                    candidate_data = json.load(file)

                score = score_candidate(json.dumps(candidate_data, indent=2))
                candidate_data["score"] = score.get("score", 0)

                scored_candidates.append(candidate_data)
            except Exception as e:
                print(f"Error calling OpenAI API for {filename}: {e}")

    # Replace JSON output with CSV output
    output_dir = "output/scored_candidates"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"scored_candidates.csv")

    # Write candidate_profiles to CSV file
    print(1, scored_candidates)
    scored_candidates = sorted(
        scored_candidates, key=lambda x: x.get("score", 0), reverse=True
    )
    print(2, scored_candidates)

    # Determine CSV headers from the first candidate (assuming all have same structure)
    if scored_candidates:
        fieldnames = list(scored_candidates[0].keys())

        with open(output_file, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(scored_candidates)


def score_candidate(candidate_data):
    score_candidate_tool: ChatCompletionToolParam = {
        "type": "function",
        "function": {
            "name": "score_candidate",
            "description": "Score the candidate based on the provided algorithm",
            "parameters": {
                "type": "object",
                "properties": {
                    "score": {
                        "type": "number",
                        "description": "Number between 0 and 100",
                    },
                },
                "required": ["score"],
            },
        },
    }

    # Include the "table" and instructions in the system_prompt:
    system_prompt = f"""
        You are a helpful assistant scoring a candidate for a job at Uber as an Enterprise Sales professional in Tokyo, Japan.

        ** Job information: **
        company: Uber
        position: Enterprise Sales
        country: Japan
        city: Tokyo
        I1: Digital
        I2: Platform
        I3: Mobility
        I4(GPT Tags): Enterprise Sales, Account Management, Business Development
        I1: Digital
        I2: Platform
        I3: Ride-Hailing
        F1: GTM
        F2: Sales
        F3: Enterprise
        F4: Relationship Management, B2B Sales
        F2: Account Executive
        F3: Other

        Your tasks:
        1. Compare and match each candidate's I# and F# with each job's I# and F# according to the **Table/Algorithm** below.
        2. Select the highest possible evaluation label (e.g., 'Perfect Match' is higher than 'Strong Match', etc.) that emerges from **any** F#/I# combination.
        3. Use the function `score_candidate` to provide the final numeric score.

        ** Table/Algorithm: **
        - F1 / I1 = Too Basic    (score = 30)
        - F1 / I2 = Iffy Match   (score = 50)
        - F1 / I3 = Iffy Match   (score = 50)
        - F1 / I4 = Iffy Match   (score = 50)

        - F2 / I1 = Iffy Match   (score = 50)
        - F2 / I2 = Good Match   (score = 70)
        - F2 / I3 = Good Match   (score = 70)
        - F2 / I4 = Out of the box (score = 90)

        - F3 / I1 = Iffy Match   (score = 50)
        - F3 / I2 = Good Match   (score = 70)
        - F3 / I3 = Strong Match (score = 85)
        - F3 / I4 = Perfect Match (score = 95)

        ** Numeric scores for each label: **
        - Too Basic -> 30
        - Iffy Match -> 50
        - Good Match -> 70
        - Strong Match -> 85
        - Perfect Match -> 95
        - Out of the box -> 90

        Important details:
        - The candidate's final evaluation is the highest match found.

        Once you determine the highest score, call:
        score_candidate(<score>)

        Be sure to follow these instructions precisely. 
        """
    return call_openai_api(system_prompt, candidate_data, tools=[score_candidate_tool])
