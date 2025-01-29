import json
import os
from dotenv import load_dotenv

from openai import OpenAI
from openai._types import NOT_GIVEN

load_dotenv()
openai_api_key = os.environ.get("OPENAI_API_KEY")

default_model = "gpt-4o"

openai_client = None

def get_openai_client():
    global openai_client
    if openai_api_key is None:
        return None
    if openai_client is None:
        openai_client = OpenAI(api_key=openai_api_key)
    return openai_client


def call_openai_api(
    system_prompt: str,
    user_prompt: str,
    model: str = default_model,
    tools: list[dict] = None,
):
    """
    Send PDF text to OpenAI's ChatCompletion endpoint.
    """
    client = get_openai_client()

    completion = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.0,
        tools=tools or NOT_GIVEN,
    )

    if not completion or not completion.choices or not completion.choices[0]:
        return None

    # Extract token usage
    if hasattr(completion, "usage"):
        token_usage = completion.usage.total_tokens
        with open("./openai_usage.log", "a") as log_file:
            log_file.write(f"{token_usage}\n")

    return completion.choices[0].message if completion.choices[0].message else None
