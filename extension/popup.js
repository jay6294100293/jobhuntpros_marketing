// LaunchBusiness AI — Tutorial Studio popup logic
// Handles: login, tab capture, MediaRecorder, upload, result display

const $ = (id) => document.getElementById(id);

let mediaRecorder = null;
let recordedChunks = [];
let timerInterval = null;
let startTime = null;
let resultVideoUrl = null;

// ── State helpers ─────────────────────────────────────────────────────────────

function showView(viewId) {
  ["login-view", "record-view"].forEach((id) => {
    $(id).style.display = id === viewId ? "block" : "none";
  });
}

function showRecordState(stateId) {
  ["idle-state", "recording-state", "uploading-state", "done-state", "error-state"].forEach(
    (id) => { $(id).style.display = id === stateId ? "block" : "none"; }
  );
}

// ── Timer ──────────────────────────────────────────────────────────────────────

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    $("timer-display").textContent = `${m}:${s.toString().padStart(2, "0")}`;
  }, 500);
}

function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function getStoredAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["token", "email", "serverUrl"], resolve);
  });
}

async function storeAuth(token, email, serverUrl) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ token, email, serverUrl }, resolve);
  });
}

async function clearAuth() {
  return new Promise((resolve) => {
    chrome.storage.local.remove(["token", "email", "serverUrl"], resolve);
  });
}

function getServerUrl(stored) {
  return (stored || $("server-url")?.value || "https://launchbusinessai.com").replace(/\/$/, "");
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const stored = await getStoredAuth();
  if (stored.token && stored.email) {
    $("user-email-display").textContent = stored.email;
    showView("record-view");
    showRecordState("idle-state");
  } else {
    showView("login-view");
  }
}

// ── Login ──────────────────────────────────────────────────────────────────────

$("login-btn").addEventListener("click", async () => {
  const email = $("login-email").value.trim();
  const password = $("login-password").value;
  const serverUrl = getServerUrl(null);

  if (!email || !password) {
    showLoginStatus("Enter email and password.", "error");
    return;
  }

  $("login-btn").disabled = true;
  $("login-btn").textContent = "Connecting…";
  showLoginStatus("", "");

  try {
    const res = await fetch(`${serverUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Login failed");

    const token = data.access_token || data.token;
    if (!token) throw new Error("No token in response");

    await storeAuth(token, email, serverUrl);
    $("user-email-display").textContent = email;
    showView("record-view");
    showRecordState("idle-state");
  } catch (err) {
    showLoginStatus(err.message, "error");
  } finally {
    $("login-btn").disabled = false;
    $("login-btn").textContent = "Connect Account";
  }
});

function showLoginStatus(msg, type) {
  const el = $("login-status");
  if (!msg) { el.style.display = "none"; return; }
  el.textContent = msg;
  el.className = `status ${type}`;
  el.style.display = "block";
}

// ── Logout ──────────────────────────────────────────────────────────────────────

$("logout-btn").addEventListener("click", async () => {
  await clearAuth();
  showView("login-view");
});

// ── Record ──────────────────────────────────────────────────────────────────────

$("record-btn").addEventListener("click", async () => {
  $("record-btn").disabled = true;

  // Ask background service worker for the stream ID of the active tab
  chrome.runtime.sendMessage({ action: "get_stream_id" }, async (response) => {
    if (chrome.runtime.lastError || response?.error) {
      showError(response?.error || "Could not access tab. Try refreshing the page.");
      $("record-btn").disabled = false;
      return;
    }

    const { streamId } = response;

    try {
      // getUserMedia with the tab capture stream ID
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          },
        },
        audio: {
          mandatory: {
            chromeMediaSource: "tab",
            chromeMediaSourceId: streamId,
          },
        },
      });

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = handleRecordingStop;
      mediaRecorder.start(1000); // collect chunks every 1s

      showRecordState("recording-state");
      startTimer();
    } catch (err) {
      showError("Could not start recording: " + err.message);
      $("record-btn").disabled = false;
    }
  });
});

$("stop-btn").addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((t) => t.stop());
  }
  stopTimer();
});

async function handleRecordingStop() {
  if (recordedChunks.length === 0) {
    showError("Recording was empty. Please try again.");
    return;
  }

  const blob = new Blob(recordedChunks, { type: "video/webm" });
  recordedChunks = [];
  showRecordState("uploading-state");
  $("upload-status").textContent = `Uploading ${(blob.size / 1024 / 1024).toFixed(1)} MB…`;

  await uploadRecording(blob);
}

// ── Upload ──────────────────────────────────────────────────────────────────────

async function uploadRecording(blob) {
  const stored = await getStoredAuth();
  const serverUrl = getServerUrl(stored.serverUrl);
  const productName = $("product-name").value.trim();

  const formData = new FormData();
  formData.append("video", blob, "recording.webm");
  formData.append("format", "16:9");
  if (productName) formData.append("product_name", productName);

  // Animate progress bar while uploading (indeterminate)
  let pct = 0;
  const progressInterval = setInterval(() => {
    pct = Math.min(pct + 2, 85);
    $("progress-fill").style.width = pct + "%";
  }, 400);

  try {
    $("upload-status").textContent = "Uploading and processing… (~60 seconds)";

    const res = await fetch(`${serverUrl}/api/tutorial/process`, {
      method: "POST",
      headers: { Authorization: `Bearer ${stored.token}` },
      body: formData,
    });

    clearInterval(progressInterval);
    $("progress-fill").style.width = "100%";

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || "Processing failed");

    resultVideoUrl = serverUrl + data.url;
    showDone(serverUrl, data);
  } catch (err) {
    clearInterval(progressInterval);
    if (err.message.includes("401")) {
      await clearAuth();
      showError("Session expired — please sign in again.");
      showView("login-view");
    } else {
      showError(err.message);
    }
  }
}

function showDone(serverUrl, data) {
  showRecordState("done-state");
  const appUrl = `${serverUrl}/gallery`;
  $("result-link").href = appUrl;
  $("download-btn").onclick = () => { chrome.tabs.create({ url: resultVideoUrl }); };
}

// ── Error ──────────────────────────────────────────────────────────────────────

function showError(msg) {
  showRecordState("error-state");
  $("error-msg").textContent = msg;
  $("record-btn").disabled = false;
}

$("retry-btn").addEventListener("click", () => { showRecordState("idle-state"); });
$("new-recording-btn").addEventListener("click", () => { showRecordState("idle-state"); });

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
