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
                candidate_data.pop("resume_text")

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

**Job information:**
company: Uber
position: Enterprise Sales
country: Japan
city: Tokyo

I1: Digital
I2: Platform
I3: Mobility
I4 (GPT Tags): Enterprise Sales, Account Management, Business Development

F1: GTM
F2: Sales
F3: Enterprise
F4: Relationship Management, B2B Sales

---

**YOUR TASK**  
1. **Determine the final matched 'I' label (I1 - I4):**  
   - Compare the job's I1 to the candidate's I1.  
     - If they match, move on to compare I2.  
     - If I2 matches, move on to compare I3.  
     - If I3 matches, move on to compare I4.  
     - **Stop** at the first mismatch (or if you reach I4 successfully).  
   - The final "I" level is whichever label you matched last before a mismatch (or I4 if they all match).

2. **Determine the final matched 'F' label (F1 - F4):**  
   - Do the same step-by-step process for F1 → F2 → F3 → F4.  
   - Stop at the first mismatch, or end at F4 if they keep matching.  

3. **Use the final matched I# and F# to look up the evaluation label** from the table below.

4. **Derive a numeric score** from the match label's corresponding range. Then call the function:
   \t    score_candidate(<your_numeric_score>)

---

**TABLE / ALGORITHM FOR FINAL LABEL**  

Once you know the final I# and F# you reached, find the row/column match:

- **F1 / I1** → **Too Basic** → (score range: 0 - 30)  
- **F1 / I2** → **Iffy Match** → (score range: 31 - 50)  
- **F1 / I3** → **Iffy Match** → (score range: 31 - 50)  
- **F1 / I4** → **Iffy Match** → (score range: 31 - 50)

- **F2 / I1** → **Iffy Match** → (score range: 31 - 50)  
- **F2 / I2** → **Good Match** → (score range: 51 - 70)  
- **F2 / I3** → **Good Match** → (score range: 51 - 70)  
- **F2 / I4** → **Out of the box** → (score range: 71 - 90)

- **F3 / I1** → **Iffy Match** → (score range: 31 - 50)  
- **F3 / I2** → **Good Match** → (score range: 51 - 70)  
- **F3 / I3** → **Strong Match** → (score range: 71 - 85)  
- **F3 / I4** → **Perfect Match** → (score range: 86 - 100)

**Numeric Score Guidance:**
- Too Basic → 0 - 30
- Iffy Match → 31 - 50
- Good Match → 51 - 70
- Strong Match → 71 - 85
- Perfect Match → 86 - 100
- Out of the box → 71 - 90

**Key Points**:
- You must respect the hierarchy: 
  - If the candidate mismatches on I2, do **not** proceed to I3 or I4.  
  - Same applies to F-levels (if mismatch on F2, do not check F3 or F4).  
- The “final matched” I# and F# is whichever label is reached **just before** a mismatch (or the highest level if none of them mismatch).
- After determining that final I# and final F#, use the table to select the label, then pick a numeric score in the specified range.
- Call `score_candidate(<your_score>)` with your chosen score.

Be sure to follow these instructions precisely.
"""

    return call_openai_api(system_prompt, candidate_data, tools=[score_candidate_tool])
