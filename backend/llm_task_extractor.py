from groq import Groq
import os
import json
from dotenv import load_dotenv

# Load .env from the project root
load_dotenv()

# Get Groq API key
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise RuntimeError(
        "GROQ_API_KEY is missing. "
        "Please add GROQ_API_KEY=your_key_here to the .env file."
    )

# Create Groq client
client = Groq(api_key=api_key)


def extract_tasks_llm(transcript):
    """
    Takes a meeting transcript and returns:
    - summary: list of summary points
    - tasks: list of structured engineering tasks
    """

    if not transcript or not transcript.strip():
        raise ValueError("Transcript is empty.")

    prompt = f"""
You are an AI meeting assistant for a software engineering team.

Analyze the meeting transcript below.

Your job is to extract:

1. Meeting summary
   - Give 3 to 5 concise bullet points.
   - Include important decisions, problems, requirements, and discussions.

2. Actionable engineering tasks
   - Extract tasks only when they are actually mentioned or clearly implied.
   - Do not invent unrelated tasks.

For every task, provide these fields:

- title
- description
- priority
- category
- status
- assigned_to

Allowed priority values:
High
Medium
Low

Allowed category values:
Frontend
Backend
DevOps
Design
Other

Allowed status values:
Open
In Progress
Done

If no person is assigned, use:
"Unassigned"

Return ONLY valid JSON.

The JSON must follow exactly this structure:

{{
    "summary": [
        "summary point 1",
        "summary point 2",
        "summary point 3"
    ],
    "tasks": [
        {{
            "title": "Task title",
            "description": "Task description",
            "priority": "High",
            "category": "Backend",
            "status": "Open",
            "assigned_to": "Unassigned"
        }}
    ]
}}

Meeting transcript:

{transcript}
"""

    print("\n========== SENDING TRANSCRIPT TO LLM ==========")
    print(transcript)
    print("===============================================\n")

    try:
        completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a precise AI meeting assistant. "
                        "Extract only useful information from the transcript "
                        "and always return valid JSON."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        result = completion.choices[0].message.content

        print("\n========== LLM RESPONSE ==========")
        print(result)
        print("==================================\n")

        if not result:
            raise ValueError("The LLM returned an empty response.")

        # Convert JSON text into Python dictionary
        data = json.loads(result)

        summary = data.get("summary", [])
        tasks = data.get("tasks", [])

        # Basic validation
        if not isinstance(summary, list):
            summary = []

        if not isinstance(tasks, list):
            tasks = []

        # Clean and validate tasks
        cleaned_tasks = []

        for task in tasks:
            if not isinstance(task, dict):
                continue

            cleaned_task = {
                "title": str(task.get("title", "Untitled Task")),
                "description": str(
                    task.get("description", "No description provided.")
                ),
                "priority": str(
                    task.get("priority", "Medium")
                ),
                "category": str(
                    task.get("category", "Other")
                ),
                "status": str(
                    task.get("status", "Open")
                ),
                "assigned_to": str(
                    task.get("assigned_to", "Unassigned")
                )
            }

            cleaned_tasks.append(cleaned_task)

        print("Summary items:", len(summary))
        print("Tasks extracted:", len(cleaned_tasks))

        return summary, cleaned_tasks

    except json.JSONDecodeError as e:
        print("\n========== JSON PARSING ERROR ==========")
        print(e)
        print("========================================\n")

        raise RuntimeError(
            "The AI returned an invalid JSON response."
        )

    except Exception as e:
        print("\n========== LLM ERROR ==========")
        print(type(e).__name__)
        print(str(e))
        print("================================\n")

        raise