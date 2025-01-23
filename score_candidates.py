import csv
import json
import os
import re

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
                if not score or not score.get("score"):
                    print(f"No score found for {filename}")
                    continue
                candidate_data["score"] = score.get("score")
                candidate_data.pop("resume_text")

                scored_candidates.append(candidate_data)
            except Exception as e:
                print(f"Error calling OpenAI API for {filename}: {e}")

    # Replace JSON output with CSV output
    output_dir = "output/scored_candidates"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"scored_candidates.csv")

    # Write candidate_profiles to CSV file
    scored_candidates = sorted(
        scored_candidates, key=lambda x: x.get("score", 0), reverse=True
    )

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
You are a helpful assistant scoring a candidate for a job at Wolt as an Field Sales professional in Tokyo, Japan.

**Job information:**
Company: Wolt  
Position: Field Sales  
Country: Japan  
City: Tokyo  

I1: Physical  
I2: Retail  
I3: Food Delivery  
I4 (GPT Tags): Quick commerce, Food and Beverage, Logistics, Last-Mile Delivery  

F1: GTM  
F2: Sales  
F3: AE, BDM  
F4 (GPT Tags): Field Sales, Relationship Management, B2B Sales  

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

4. **Based on the suitability of the candidate's résumé for the job, pick a numeric score in the label's range.**

5. **Always call the function tool: `score_candidate(<your_numeric_score>)`**

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
- The "final matched" I# and F# is whichever label is reached **just before** a mismatch (or the highest level if none of them mismatch).
- After determining that final I# and final F#, use the table to select the label, then pick a numeric score in the specified range.
- Always call the `score_candidate(<your_score>)` function tool with your chosen score.

Be sure to follow these instructions precisely.
"""

    return generate_score(system_prompt, candidate_data, score_candidate_tool)


def generate_score(system_prompt, candidate_data, score_candidate_tool):
    answer = call_openai_api(
        system_prompt, candidate_data, tools=[score_candidate_tool]
    )

    if not answer:
        return None

    if not answer.tool_calls:
        textual_answer = answer.content
        score = extract_score(textual_answer)
        return {"score": score} if score else None

    return json.loads(answer.tool_calls[0].function.arguments)


def extract_score(text):
    """
    Extracts the numeric score from the given textual answer.

    Parameters:
        text (str): The textual answer containing the score.

    Returns:
        int: The extracted score.

    Raises:
        ValueError: If no score could be found in the text.
    """

    # Strategy 1: Look for JSON code blocks and parse them
    json_score = _extract_score_from_json(text)
    if json_score is not None:
        return json_score

    # Strategy 2: Use regex to find patterns like "score of X" or '"score": X'
    regex_patterns = [
        r"score\s*(?:of|:)\s*(\d+)",  # e.g., "score of 40" or "score: 40"
        r"score\s*is\s*(\d+)",  # e.g., "score is 40"
        r"score\s*=\s*(\d+)",  # e.g., "score = 40"
        r'"score"\s*:\s*(\d+)',  # e.g., '"score": 40'
        r"score\s*\(\s*(\d+)\s*\)",  # e.g., 'score(40)'
    ]

    for pattern in regex_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))

    # Strategy 3: As a last resort, find standalone numbers near the word "score"
    fallback_pattern = r"score.*?(\d{1,3})"
    match = re.search(fallback_pattern, text, re.IGNORECASE)
    if match:
        return int(match.group(1))

    # If all strategies fail, raise an error
    raise ValueError("No numeric score found in the provided text.")


def _extract_score_from_json(text):
    """
    Helper function to extract score from JSON code blocks within the text.

    Parameters:
        text (str): The textual answer containing JSON code blocks.

    Returns:
        int or None: The extracted score if found, else None.
    """
    # Regex to find JSON code blocks
    json_block_pattern = r"```json\s*(\{.*?\})\s*```"
    matches = re.findall(json_block_pattern, text, re.DOTALL | re.IGNORECASE)

    for json_str in matches:
        try:
            data = json.loads(json_str)
            # Navigate through the JSON structure to find 'score'
            # This path may vary; adjust accordingly
            score = data
            keys = ["parameters", "score"]
            for key in keys:
                score = score.get(key, {})
            if isinstance(score, int):
                return score
        except json.JSONDecodeError:
            continue  # If JSON is invalid, skip to the next match
        except AttributeError:
            continue  # If path does not exist, skip

    return None
