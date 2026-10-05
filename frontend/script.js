/* =========================================================
   MEET TOTASK
   Frontend Application Logic
   ========================================================= */


/* =========================================================
   ELEMENTS
   ========================================================= */

const startRecordingBtn =
    document.getElementById("startRecordingBtn");

const stopRecordingBtn =
    document.getElementById("stopRecordingBtn");

const transcriptFile =
    document.getElementById("transcriptFile");

const analyzeBtn =
    document.getElementById("analyzeBtn");

const liveTranscript =
    document.getElementById("liveTranscript");

const meetingSummary =
    document.getElementById("meetingSummary");

const generatedIssues =
    document.getElementById("generatedIssues");

const characterCount =
    document.getElementById("characterCount");

const taskCount =
    document.getElementById("taskCount");

const recordingIndicator =
    document.getElementById("recordingIndicator");

const repoInput =
    document.getElementById("repoInput");

const tokenInput =
    document.getElementById("tokenInput");

const toast =
    document.getElementById("toast");

const toastMessage =
    document.getElementById("toastMessage");

const toastIcon =
    document.getElementById("toastIcon");


/* =========================================================
   STATE
   ========================================================= */

let recognition = null;

let isRecording = false;

let finalTranscript = "";

let restartRecognition = false;

let lastGeneratedTasks = [];


/* =========================================================
   TOAST
   ========================================================= */

let toastTimer = null;

function showToast(message, type = "success") {

    clearTimeout(toastTimer);

    toastMessage.textContent = message;

    if (type === "error") {
        toastIcon.textContent = "!";
        toastIcon.style.color = "#f06b6b";
    } else {
        toastIcon.textContent = "✓";
        toastIcon.style.color = "#35d07f";
    }

    toast.classList.add("show");

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}


/* =========================================================
   TRANSCRIPT DISPLAY
   ========================================================= */

function updateCharacterCount() {

    const text = liveTranscript.innerText || "";

    const count = text.length;

    characterCount.textContent =
        `${count.toLocaleString()} character${count === 1 ? "" : "s"}`;
}


function displayTranscript(text) {

    if (!text || !text.trim()) {

        liveTranscript.innerHTML = `
            <div class="empty-state">

                <div class="empty-icon">🎙</div>

                <h4>No transcript yet</h4>

                <p>
                    Start a meeting or upload a transcript
                    to see the conversation here.
                </p>

            </div>
        `;

        updateCharacterCount();

        return;
    }

    liveTranscript.textContent = text;

    updateCharacterCount();

    liveTranscript.scrollTop =
        liveTranscript.scrollHeight;
}


/* =========================================================
   SPEECH RECOGNITION
   ========================================================= */

const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;


if (SpeechRecognition) {

    recognition = new SpeechRecognition();

    recognition.continuous = true;

    recognition.interimResults = true;

    recognition.lang = "en-US";


    recognition.onstart = function () {

        isRecording = true;

        startRecordingBtn.disabled = true;

        stopRecordingBtn.disabled = false;

        recordingIndicator.classList.add("recording");

        recordingIndicator.innerHTML = `
            <span></span>
            Listening...
        `;

        showToast("Live transcription started");

    };


    recognition.onresult = function (event) {

        let interimTranscript = "";

        for (
            let i = event.resultIndex;
            i < event.results.length;
            i++
        ) {

            const transcript =
                event.results[i][0].transcript;

            if (event.results[i].isFinal) {

                finalTranscript +=
                    transcript + " ";

            } else {

                interimTranscript += transcript;

            }
        }


        const combined =
            finalTranscript +
            interimTranscript;

        displayTranscript(combined);
    };


    recognition.onerror = function (event) {

        console.error(
            "Speech recognition error:",
            event.error
        );


        if (event.error === "not-allowed") {

            showToast(
                "Microphone permission was denied. Allow microphone access in Chrome.",
                "error"
            );

            stopRecording();

            return;
        }


        if (event.error === "no-speech") {

            return;
        }


        if (event.error === "audio-capture") {

            showToast(
                "No microphone was detected.",
                "error"
            );

            stopRecording();

            return;
        }


        showToast(
            `Microphone error: ${event.error}`,
            "error"
        );
    };


    recognition.onend = function () {

        /*
         * Chrome may automatically stop speech recognition
         * after a period of silence.
         *
         * Restart it while the user still wants recording.
         */

        if (
            restartRecognition &&
            isRecording
        ) {

            try {

                recognition.start();

            } catch (error) {

                console.log(
                    "Recognition restart skipped."
                );

            }

            return;
        }


        finishRecordingUI();
    };

} else {

    startRecordingBtn.disabled = true;

    showToast(
        "Live transcription requires Google Chrome or Microsoft Edge.",
        "error"
    );
}


/* =========================================================
   START RECORDING
   ========================================================= */

startRecordingBtn.addEventListener(
    "click",
    function () {

        if (!recognition) {

            showToast(
                "Speech recognition is not supported in this browser.",
                "error"
            );

            return;
        }


        finalTranscript = "";

        restartRecognition = true;

        displayTranscript("");

        try {

            recognition.start();

        } catch (error) {

            console.log(
                "Recognition already running."
            );

        }

    }
);


/* =========================================================
   STOP RECORDING
   ========================================================= */

stopRecordingBtn.addEventListener(
    "click",
    function () {

        stopRecording();

    }
);


function stopRecording() {

    restartRecognition = false;

    isRecording = false;

    if (recognition) {

        try {

            recognition.stop();

        } catch (error) {

            console.log(
                "Recognition already stopped."
            );

        }
    }

    finishRecordingUI();
}


function finishRecordingUI() {

    isRecording = false;

    startRecordingBtn.disabled = false;

    stopRecordingBtn.disabled = true;

    recordingIndicator.classList.remove(
        "recording"
    );

    recordingIndicator.innerHTML = `
        <span></span>
        Ready
    `;
}


/* =========================================================
   UPLOAD TRANSCRIPT
   ========================================================= */

transcriptFile.addEventListener(
    "change",
    function () {

        const file =
            transcriptFile.files[0];

        if (!file) {
            return;
        }


        if (!file.name.toLowerCase().endsWith(".txt")) {

            showToast(
                "Please upload a .txt transcript file.",
                "error"
            );

            transcriptFile.value = "";

            return;
        }


        const reader = new FileReader();


        reader.onload = function (event) {

            const text =
                event.target.result || "";

            finalTranscript = text;

            displayTranscript(text);

            showToast(
                "Transcript uploaded successfully."
            );

        };


        reader.onerror = function () {

            showToast(
                "Could not read the transcript file.",
                "error"
            );

        };


        reader.readAsText(file);

    }
);


/* =========================================================
   ANALYZE MEETING
   ========================================================= */

analyzeBtn.addEventListener(
    "click",
    async function () {

        const transcript =
            liveTranscript.innerText.trim();


        if (
            !transcript ||
            transcript === "No transcript yet"
        ) {

            showToast(
                "Please record or upload a transcript first.",
                "error"
            );

            return;
        }


        setAnalyzeLoading(true);


        try {

            const response =
                await fetch(
                    "/process-text",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            text: transcript
                        })
                    }
                );


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.error ||
                    "Meeting analysis failed."
                );

            }


            renderSummary(
                data.summary
            );


            renderTasks(
                data.tasks || []
            );


            showToast(
                "Meeting analyzed successfully."
            );

        } catch (error) {

            console.error(error);

            showToast(
                error.message ||
                "Something went wrong during analysis.",
                "error"
            );

        } finally {

            setAnalyzeLoading(false);

        }

    }
);


/* =========================================================
   ANALYZE LOADING
   ========================================================= */

function setAnalyzeLoading(loading) {

    if (loading) {

        analyzeBtn.classList.add(
            "loading"
        );

        analyzeBtn.innerHTML = `
            <span class="analyze-icon">
                <span class="loading-spinner"></span>
            </span>

            <span>
                <strong>Analyzing meeting...</strong>
                <small>Extracting decisions and tasks</small>
            </span>

            <span class="arrow">...</span>
        `;

    } else {

        analyzeBtn.classList.remove(
            "loading"
        );

        analyzeBtn.innerHTML = `
            <span class="analyze-icon">✦</span>

            <span>
                <strong>Analyze Meeting</strong>
                <small>Generate summary & actionable tasks</small>
            </span>

            <span class="arrow">→</span>
        `;
    }
}


/* =========================================================
   RENDER SUMMARY
   ========================================================= */

function renderSummary(summary) {

    if (!summary) {

        meetingSummary.innerHTML = `
            <div class="empty-result">
                <div>—</div>
                <p>No summary was generated.</p>
            </div>
        `;

        return;
    }


    let items = [];


    if (Array.isArray(summary)) {

        items = summary;

    } else if (typeof summary === "string") {

        items =
            summary
                .split("\n")
                .map(item =>
                    item
                        .replace(/^[-•*]\s*/, "")
                        .trim()
                )
                .filter(Boolean);

    }


    if (!items.length) {

        meetingSummary.innerHTML = `
            <div class="empty-result">
                <div>—</div>
                <p>No summary was generated.</p>
            </div>
        `;

        return;
    }


    meetingSummary.innerHTML = `
        <ul class="summary-list">

            ${items.map(item => `
                <li class="summary-item">

                    <span class="summary-bullet"></span>

                    <span>
                        ${escapeHTML(item)}
                    </span>

                </li>
            `).join("")}

        </ul>
    `;
}


/* =========================================================
   RENDER TASKS
   ========================================================= */

function renderTasks(tasks) {

    lastGeneratedTasks = tasks || [];

    taskCount.textContent =
        lastGeneratedTasks.length;


    if (!lastGeneratedTasks.length) {

        generatedIssues.innerHTML = `
            <div class="empty-result">

                <div>✓</div>

                <p>
                    No actionable tasks were found in this meeting.
                </p>

            </div>
        `;

        return;
    }


    generatedIssues.innerHTML =
        lastGeneratedTasks
            .map(
                (task, index) =>
                    createTaskHTML(task, index)
            )
            .join("");
}


/* =========================================================
   TASK CARD
   ========================================================= */

function createTaskHTML(task, index) {

    const title =
        task.title ||
        "Untitled task";

    const description =
        task.description ||
        "No description provided.";

    const priority =
        task.priority ||
        "Medium";

    const category =
        task.category ||
        "Other";

    const status =
        task.status ||
        "Open";

    const assignedTo =
        task.assigned_to ||
        "Unassigned";


    const priorityClass =
        `priority-${priority.toLowerCase()}`;


    return `
        <div class="task-card">

            <div class="task-top">

                <h4>
                    ${escapeHTML(title)}
                </h4>

            </div>


            <p class="task-description">
                ${escapeHTML(description)}
            </p>


            <div class="task-meta">

                <span class="meta-tag ${priorityClass}">
                    ${escapeHTML(priority)}
                </span>

                <span class="meta-tag">
                    ${escapeHTML(category)}
                </span>

                <span class="meta-tag">
                    ${escapeHTML(status)}
                </span>

                <span class="meta-tag">
                    ${escapeHTML(assignedTo)}
                </span>

            </div>


            <button
                class="github-issue-btn"
                onclick="createGitHubIssue(${index})"
            >
                <span>+</span>
                Create GitHub Issue
            </button>

        </div>
    `;
}


/* =========================================================
   CREATE GITHUB ISSUE
   ========================================================= */

async function createGitHubIssue(index) {

    const task =
        lastGeneratedTasks[index];


    if (!task) {

        showToast(
            "Task could not be found.",
            "error"
        );

        return;
    }


    const repo =
        repoInput.value.trim();

    const token =
        tokenInput.value.trim();


    if (!repo) {

        showToast(
            "Enter your GitHub repository first.",
            "error"
        );

        repoInput.focus();

        return;
    }


    if (!token) {

        showToast(
            "Enter your GitHub personal access token first.",
            "error"
        );

        tokenInput.focus();

        return;
    }


    const buttons =
        document.querySelectorAll(
            ".github-issue-btn"
        );

    const currentButton =
        buttons[index];


    if (currentButton) {

        currentButton.disabled = true;

        currentButton.innerHTML = `
            <span class="loading-spinner"></span>
            Creating...
        `;
    }


    try {

        const response =
            await fetch(
                "/create-issue",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        repo: repo,
                        token: token,
                        task: task
                    })
                }
            );


        const data =
            await response.json();


        if (!response.ok || !data.success) {

            throw new Error(
                data.error ||
                "Could not create GitHub issue."
            );

        }


        if (currentButton) {

            currentButton.style.display =
                "none";

            currentButton.parentElement.insertAdjacentHTML(
                "beforeend",

                `
                <div class="issue-created">
                    ✓ GitHub issue created

                    ${
                        data.html_url
                            ? `
                                ·
                                <a
                                    href="${data.html_url}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View issue →
                                </a>
                              `
                            : ""
                    }

                </div>
                `
            );
        }


        showToast(
            "GitHub issue created successfully."
        );


    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "GitHub issue creation failed.",
            "error"
        );


        if (currentButton) {

            currentButton.disabled = false;

            currentButton.innerHTML = `
                <span>+</span>
                Create GitHub Issue
            `;
        }

    }
}


/* =========================================================
   HTML ESCAPING
   ========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        String(value ?? "");

    return div.innerHTML;
}


/* =========================================================
   INITIAL STATE
   ========================================================= */

displayTranscript("");

taskCount.textContent = "0";


/*
 * Expose this function because the task buttons
 * use onclick="createGitHubIssue(index)".
 */

window.createGitHubIssue =
    createGitHubIssue;