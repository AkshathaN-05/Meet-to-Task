from flask import Flask, request, jsonify, send_from_directory
from pathlib import Path

from dotenv import load_dotenv

from llm_task_extractor import extract_tasks_llm
from audio_to_text import convert_audio_to_text
from github_api import create_github_issue


# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()


# =========================================================
# PROJECT PATHS
# =========================================================

BASE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BASE_DIR.parent

FRONTEND_DIR = PROJECT_DIR / "frontend"
UPLOADS_DIR = BASE_DIR / "uploads"

# Make sure uploads folder exists
UPLOADS_DIR.mkdir(exist_ok=True)


# =========================================================
# FLASK APP
# =========================================================

app = Flask(
    __name__,
    static_folder=str(FRONTEND_DIR),
    static_url_path=""
)


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():
    return send_from_directory(
        FRONTEND_DIR,
        "index.html"
    )


# =========================================================
# FRONTEND FILES
# =========================================================

@app.route("/<path:filename>")
def frontend_files(filename):
    return send_from_directory(
        FRONTEND_DIR,
        filename
    )


# =========================================================
# PROCESS TEXT / ANALYZE MEETING
# =========================================================

@app.route("/process-text", methods=["POST"])
def process_text():

    try:
        data = request.get_json(silent=True) or {}

        text = (data.get("text") or "").strip()

        if not text:
            return jsonify({
                "success": False,
                "error": "Transcript is empty."
            }), 400

        # Send transcript to the LLM
        result = extract_tasks_llm(text)

        # The existing LLM extractor returns:
        # (summary, tasks)
        if isinstance(result, tuple):

            summary = result[0]
            tasks = result[1]

        # If it returns a dictionary, support that too
        elif isinstance(result, dict):

            summary = result.get("summary", [])
            tasks = result.get("tasks", [])

        else:

            raise TypeError(
                f"Unexpected result type from extract_tasks_llm: {type(result).__name__}"
            )

        return jsonify({
            "success": True,
            "summary": summary,
            "tasks": tasks
        })

    except Exception as e:

        print("PROCESS TEXT ERROR:", str(e))

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# =========================================================
# PROCESS LIVE AUDIO
# =========================================================

@app.route("/process-live-audio", methods=["POST"])
def process_live_audio():

    try:

        # Check whether audio was received
        if "audio" not in request.files:

            return jsonify({
                "success": False,
                "error": "No audio file received."
            }), 400

        # Get uploaded audio file
        audio_file = request.files["audio"]

        # Save it locally
        audio_path = UPLOADS_DIR / "live.wav"

        audio_file.save(
            str(audio_path)
        )

        print(
            "Audio saved to:",
            audio_path
        )

        # Convert audio to text
        transcript = convert_audio_to_text(
            str(audio_path)
        )

        return jsonify({
            "success": True,
            "transcript": transcript
        })

    except Exception as e:

        print(
            "LIVE AUDIO ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# CREATE GITHUB ISSUE
# =========================================================

@app.route("/create-issue", methods=["POST"])
def create_issue():

    try:

        data = request.get_json(
            silent=True
        ) or {}

        repo = (
            data.get("repo") or ""
        ).strip()

        token = (
            data.get("token") or ""
        ).strip()

        task = (
            data.get("task") or {}
        )


        # -----------------------------
        # Validate repository
        # -----------------------------

        if not repo:

            return jsonify({
                "success": False,
                "error": "GitHub repository is required."
            }), 400


        # -----------------------------
        # Validate token
        # -----------------------------

        if not token:

            return jsonify({
                "success": False,
                "error": "GitHub token is required."
            }), 400


        # -----------------------------
        # Validate task
        # -----------------------------

        if not task:

            return jsonify({
                "success": False,
                "error": "Task information is required."
            }), 400


        # -----------------------------
        # Create GitHub issue
        # -----------------------------

        result = create_github_issue(
            repo,
            token,
            task
        )


        return jsonify({
            "success": True,
            "html_url": result.get(
                "html_url"
            ),
            "issue_number": result.get(
                "issue_number"
            )
        })


    except Exception as e:

        print(
            "GITHUB ISSUE ERROR:",
            str(e)
        )

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


# =========================================================
# RUN APPLICATION LOCALLY
# =========================================================

if __name__ == "__main__":

    import webbrowser
    import threading

    URL = "http://127.0.0.1:5000/"

    print()
    print("=" * 60)
    print("             MEET TOTASK")
    print("          AI MEETING ASSISTANT")
    print("=" * 60)
    print()
    print(f"Opening: {URL}")
    print()
    print("Press CTRL+C to stop the server.")
    print()

    # Open browser shortly after Flask starts
    threading.Timer(
        1.0,
        lambda: webbrowser.open(URL)
    ).start()

    app.run(
    host="127.0.0.1",
    port=5000,
    debug=True,
    use_reloader=False
    )