import requests


def create_github_issue(repo, token, task):

    # ---------------------------------------------------------
    # Clean repository input
    # ---------------------------------------------------------

    repo = repo.strip()

    # Allow user to enter:
    # AkshathaN-05/ai-meeting-demo
    #
    # OR:
    # https://github.com/AkshathaN-05/ai-meeting-demo

    if repo.startswith("https://github.com/"):
        repo = repo.replace(
            "https://github.com/",
            "",
            1
        )

    if repo.startswith("http://github.com/"):
        repo = repo.replace(
            "http://github.com/",
            "",
            1
        )

    # Remove trailing slash
    repo = repo.rstrip("/")

    # Remove .git if user entered it
    if repo.endswith(".git"):
        repo = repo[:-4]

    print("\n========== GITHUB ISSUE ==========")
    print("Repository:", repo)
    print("Task:", task.get("title"))
    print("==================================")

    # ---------------------------------------------------------
    # Validate repository format
    # ---------------------------------------------------------

    if "/" not in repo:

        raise ValueError(
            "Invalid GitHub repository format. "
            "Use: username/repository"
        )

    if not token or not token.strip():

        raise ValueError(
            "GitHub token is missing."
        )

    # ---------------------------------------------------------
    # GitHub API URL
    # ---------------------------------------------------------

    url = (
        f"https://api.github.com/repos/"
        f"{repo}/issues"
    )

    # ---------------------------------------------------------
    # Request headers
    # ---------------------------------------------------------

    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    # ---------------------------------------------------------
    # Issue body
    # ---------------------------------------------------------

    body = f"""Priority: {task.get("priority", "Medium")}

Category: {task.get("category", "Other")}

Status: {task.get("status", "Open")}

Assigned to: {task.get("assigned_to", "Unassigned")}

Description:
{task.get("description", "No description provided.")}
"""

    # ---------------------------------------------------------
    # Issue data
    # ---------------------------------------------------------

    data = {
        "title": task.get(
            "title",
            "New task"
        ),
        "body": body
    }

    print("Sending request to GitHub...")

    # ---------------------------------------------------------
    # Send request
    # ---------------------------------------------------------

    response = requests.post(
        url,
        headers=headers,
        json=data,
        timeout=15
    )

    # ---------------------------------------------------------
    # SUCCESS
    # ---------------------------------------------------------

    if response.status_code == 201:

        issue = response.json()

        print("\n========== GITHUB SUCCESS ==========")
        print("Issue created successfully!")
        print("Issue URL:", issue.get("html_url"))
        print("====================================\n")

        return {
            "html_url": issue.get("html_url"),
            "issue_number": issue.get("number"),
            "success": True
        }

    # ---------------------------------------------------------
    # ERROR
    # ---------------------------------------------------------

    print("\n========== GITHUB API ERROR ==========")
    print("Status code:", response.status_code)
    print("Response:", response.text)
    print("======================================\n")

    # Try to extract GitHub's actual error message
    try:

        error_data = response.json()

        message = error_data.get(
            "message",
            "GitHub API request failed."
        )

        errors = error_data.get(
            "errors",
            []
        )

        if errors:

            error_details = "; ".join(
                str(error)
                for error in errors
            )

            message = (
                f"{message} "
                f"Details: {error_details}"
            )

    except Exception:

        message = (
            "GitHub API request failed. "
            f"HTTP {response.status_code}"
        )

    # Give the actual error back to Flask
    raise RuntimeError(
        f"GitHub API error "
        f"(HTTP {response.status_code}): {message}"
    )