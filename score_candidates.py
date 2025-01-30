import config
import csv
import json
import os
import pandas as pd
import re

from openai_api import call_openai_api
from openai.types.chat import ChatCompletionToolParam


buckets_table = {
    ("F1", "I1"): "Too Basic",
    ("F1", "I2"): "Iffy Match",
    ("F1", "I3"): "Iffy Match",
    ("F1", "I4"): "Iffy Match",
    ("F2", "I1"): "Iffy Match",
    ("F2", "I2"): "Good Match",
    ("F2", "I3"): "Good Match",
    ("F2", "I4"): "Out of the box",
    ("F3", "I1"): "Iffy Match",
    ("F3", "I2"): "Good Match",
    ("F3", "I3"): "Strong Match",
    ("F3", "I4"): "Perfect Match",
    ("F4", "I1"): "Iffy Match",
    ("F4", "I2"): "Good Match",
    ("F4", "I3"): "Strong Match",
    ("F4", "I4"): "Perfect Match",
}

scores_table = {
    "Too Basic": {
        "min": 0,
        "max": 30,
    },
    "Iffy Match": {
        "min": 31,
        "max": 50,
    },
    "Good Match": {
        "min": 51,
        "max": 70,
    },
    "Strong Match": {
        "min": 71,
        "max": 84,
    },
    "Perfect Match": {
        "min": 85,
        "max": 100,
    },
    "Out of the box": {
        "min": 60,
        "max": 75,
    },
}


def score_candidates(job_data, processed_resumes_file):
    scored_candidates = []
    # Read the CSV file
    df = pd.read_csv(processed_resumes_file)
    # Iterate through each resume data
    for index, row in df.iterrows():
        try:
            if config.candidates_to_score and config.candidates_to_score > 0:
                if index >= config.candidates_to_score:
                    break
            candidate_data = row.to_dict()
            print(f"Scoring candidate: {candidate_data.get('name')}")

            bucket = determine_bucket(candidate_data, job_data)
            candidate_data["final_I"] = bucket.get("final_I")
            candidate_data["final_F"] = bucket.get("final_F")
            candidate_data["bucket"] = bucket.get("bucket")

            if not candidate_data["bucket"]:
                continue

            initial_score = scores_table.get(bucket.get("bucket")).get("max")
            i4_and_f4_points = get_I4_and_F4_points(candidate_data, job_data)
            candidate_data["score"] = initial_score + i4_and_f4_points
            if candidate_data["score"] > 84:
                candidate_data["bucket"] = "Perfect Match"

            base_score = apply_scoring_rules(candidate_data)
            candidate_data["score"] = base_score

            if candidate_data["score"] >= 71 or config.candidates_to_score > 0:
                final_score = determine_final_score(
                    candidate_data.get("resume_text"), candidate_data["score"]
                )
                if not final_score or not final_score.get("score"):
                    continue
                candidate_data["score"] = final_score.get("score")

            candidate_data.pop("resume_text")
            scored_candidates.append(candidate_data)
        except Exception as e:
            print(f"Error calling OpenAI API for {job_data.get('name')}: {e}")

    save_scored_candidates(scored_candidates, job_data)


def determine_bucket(candidate_data, job_data):
    """
    Determines the evaluation bucket for a candidate based on the matching of 'I' and 'F' labels.

    Args:
        candidate_data (dict): Candidate's data containing 'I1' to 'I4' and 'F1' to 'F4' labels.
        job_labels (dict): Job's labels containing 'I1' to 'I4' and 'F1' to 'F4'.

    Returns:
        str: The evaluation label based on the matching algorithm.
    """
    job_labels = {
        "I1": job_data.get("I1"),
        "I2": job_data.get("I2"),
        "I3": job_data.get("I3"),
        "F1": job_data.get("F1"),
        "F2": job_data.get("F2"),
        "F3": job_data.get("F3"),
    }

    def get_final_matched_level(labels, candidate_labels, category):
        """
        Determines the final matched level for a given category ('I' or 'F').

        Args:
            labels (dict): Job's labels for the category.
            candidate_labels (dict): Candidate's labels for the category.
            category (str): The category to evaluate ('I' or 'F').

        Returns:
            str: The final matched label (e.g., 'I2', 'F3').
        """
        last_matched = "0"  # Initialize to '0' indicating no match yet
        for level in ["1", "2", "3"]:
            key = f"{category}{level}"
            job_label = labels.get(key)
            candidate_label = candidate_labels.get(key)
            if job_label == candidate_label:
                last_matched = level
            else:
                break  # Stop at the first mismatch
        return f"{category}{last_matched}"

    final_I = get_final_matched_level(job_labels, candidate_data, "I")
    final_F = get_final_matched_level(job_labels, candidate_data, "F")
    evaluation_label = buckets_table.get((final_F, final_I), "")

    return {
        "final_I": final_I,
        "final_F": final_F,
        "bucket": evaluation_label,
    }


def get_I4_and_F4_points(candidate_data, job_data):
    def _calculate_points(candidate_tags, job_tags):
        # Convert to sets so duplicates in either list won't affect bracket or scoring
        unique_candidate_tags = set(candidate_tags)
        unique_job_tags = set(job_tags)

        points = 0
        job_tags_count = len(unique_job_tags)

        # No job tags => 8 points
        if job_tags_count == 0:
            points = 8
        # Exactly 1 job tag => if it matches, award 8
        elif job_tags_count == 1:
            if unique_job_tags.pop() in unique_candidate_tags:
                points = 8
        # Exactly 2 job tags => each matching tag awards 4
        elif job_tags_count == 2:
            for tag in unique_job_tags:
                if tag in unique_candidate_tags:
                    points += 4
        # Exactly 3 job tags => each matching tag awards 3
        elif job_tags_count == 3:
            for tag in unique_job_tags:
                if tag in unique_candidate_tags:
                    points += 3
        # More than 3 job tags => each matching tag awards 2
        else:
            for tag in unique_job_tags:
                if tag in unique_candidate_tags:
                    points += 2

        # Cap the points at 8
        return min(points, 8)

    candidate_i4 = candidate_data.get("i4")
    candidate_f4 = candidate_data.get("f4")
    job_i4 = job_data.get("i4")
    job_f4 = job_data.get("f4")

    candidate_f4_tags = [keyword.strip() for keyword in candidate_f4.split(",")]
    candidate_i4_tags = [keyword.strip() for keyword in candidate_i4.split(",")]
    job_f4_tags = [keyword.strip() for keyword in job_f4.split(",")]
    job_i4_tags = [keyword.strip() for keyword in job_i4.split(",")]

    f4_points = _calculate_points(candidate_f4_tags, job_f4_tags)
    i4_points = _calculate_points(candidate_i4_tags, job_i4_tags)

    # If either F4 or I4 points are zero, the entire result is zero
    if f4_points == 0 or i4_points == 0:
        return 0

    return f4_points + i4_points


def apply_scoring_rules(candidate_data):
    base_score = candidate_data.get("score")
    # Japanese Level
    if candidate_data.get("japanese_level") == "Native":
        base_score -= 0
    elif candidate_data.get("japanese_level") == "Fluent":
        base_score -= 1
    elif candidate_data.get("japanese_level") == "Business":
        base_score -= 10
    elif candidate_data.get("japanese_level") == "Reading/Writing":
        base_score -= 20
    elif candidate_data.get("japanese_level") == "None/Unknown":
        base_score -= 30

    # Location
    if candidate_data.get("country") == "Japan":
        base_score -= 0
    elif candidate_data.get("country") != "Japan":
        if candidate_data.get("japanese_level") == "None/Unknown":
            base_score -= 50
        else:
            base_score -= 5

    return base_score if base_score > 0 else 0


def determine_final_score(resume_text, job_data, base_score):
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
                        "description": f"Number between 0 and {base_score}",
                    },
                },
                "required": ["score"],
            },
        },
    }

    system_prompt = f"""
You are a highly skilled assistant tasked with evaluating and scoring candidates for the {job_data.get("position")} position at {job_data.get("company")} in {job_data.get("country")}.

**Job Information:**
- **Company:** {job_data.get("company")}
- **Position:** {job_data.get("position")}
- **Location:** {job_data.get("country")}

**Scoring Guidelines:**
Evaluate the candidate's résumé based on the following criteria, assigning points to each category as appropriate:

1. **Relevant Experience:**
2. **Education:**
3. **Skills:**
4. **Cultural Fit:**
5. **Achievements:**
6. **Additional Factors:**

**Instructions:**
1. **Analyze the candidate's résumé in detail**, considering each of the above categories.
2. **Ensure that the candidate receives a score that accurately reflects their suitability for the role.**
3. **Always call the function tool: `score_candidate(<your_total_score>)`**
"""

    return generate_score(system_prompt, resume_text, score_candidate_tool)


def generate_score(system_prompt, resume_text, score_candidate_tool):
    answer = call_openai_api(system_prompt, resume_text, tools=[score_candidate_tool])

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


def save_scored_candidates(scored_candidates, job_data):
    output_dir = "output/scored_candidates"
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(
        output_dir,
        f"{sanitize_filename(job_data.get('company'))}_{sanitize_filename(job_data.get('position'))}_scored_candidates.csv",
    )
    scored_candidates = sorted(
        scored_candidates, key=lambda x: x.get("score", 0), reverse=True
    )
    if scored_candidates:
        fieldnames = list(scored_candidates[0].keys())

        with open(output_file, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(scored_candidates)


def sanitize_filename(filename):
    return re.sub(r"[^\w\-]", "_", filename)
