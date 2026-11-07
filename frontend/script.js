

const API_URL = "https://chat-gpt-clone-yl60.onrender.com";

const form = document.getElementById("chatForm");
const input = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const chatContainer = document.getElementById("chatContainer");
const welcome = document.getElementById("welcome");

let threadId = createThreadId();
let isBusy = false;

function createThreadId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/* ---------- Input handling ---------- */

function autoResize() {
  input.style.height = "auto";
  input.style.height = Math.min(input.scrollHeight, 160) + "px";
}

function updateSendButton() {
  sendBtn.disabled = isBusy || !input.value.trim();
}

input.addEventListener("input", () => {
  autoResize();
  updateSendButton();
});

// Enter = send, Shift+Enter = new line
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    form.requestSubmit();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault(); // stop page reload
  const text = input.value.trim();
  if (!text || isBusy) return;
  await generate(text);
});

newChatBtn.addEventListener("click", () => {
  if (isBusy) return;
  threadId = createThreadId();
  [...chatContainer.children].forEach((el) => {
    if (el !== welcome) el.remove();
  });
  input.value = "";
  autoResize();
  updateSendButton();
  input.focus();
});

/* ---------- Message rendering ---------- */

function addUserMessage(text) {
  const row = document.createElement("div");
  row.className = "fade-up mb-8 flex justify-end";

  const bubble = document.createElement("div");
  bubble.className =
    "max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-neutral-800 px-5 py-3 leading-7";
  bubble.textContent = text;

  row.appendChild(bubble);
  chatContainer.appendChild(row);
}

function addAssistantRow() {
  const row = document.createElement("div");
  row.className = "fade-up mb-8 flex gap-3";

  const avatar = document.createElement("div");
  avatar.className =
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-sm font-semibold";
  avatar.textContent = "AI";

  const body = document.createElement("div");
  body.className = "min-w-0 flex-1 pt-1";

  const name = document.createElement("p");
  name.className = "mb-2 font-semibold";
  name.textContent = "ChatGPT";

  const content = document.createElement("div");
  content.className =
    "whitespace-pre-wrap break-words leading-7 text-neutral-200";

  body.append(name, content);
  row.append(avatar, body);
  chatContainer.appendChild(row);

  return { row, body, content };
}

function showTyping(content) {
  content.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "flex items-center gap-1 py-2";
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "h-2 w-2 animate-bounce rounded-full bg-neutral-400";
    dot.style.animationDelay = i * 150 + "ms";
    wrap.appendChild(dot);
  }
  content.appendChild(wrap);
}

function addCopyButton(body, text) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className =
    "mt-2 rounded-md px-2 py-1 text-xs text-neutral-400 transition hover:bg-neutral-800 hover:text-white";
  btn.textContent = "Copy";
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = "Copied!";
    } catch {
      btn.textContent = "Failed";
    }
    setTimeout(() => (btn.textContent = "Copy"), 1500);
  });
  body.appendChild(btn);
}

/* ---------- Chat flow ---------- */

async function generate(text) {
  isBusy = true;

  addUserMessage(text);
  input.value = "";
  autoResize();
  updateSendButton();

  const { body, content } = addAssistantRow();
  showTyping(content);
  scrollToBottom();

  try {
    const reply = await callServer(text);
    content.textContent = reply;
    addCopyButton(body, reply);
  } catch (error) {
    console.error("Chat Error:", error);
    content.className =
      "rounded-2xl bg-red-950 px-4 py-3 text-red-300 break-words";
    content.textContent =
      error instanceof TypeError
        ? "Couldn't reach the server. Make sure it is running on localhost:3001."
        : "Error: " + error.message;
  } finally {
    isBusy = false;
    updateSendButton();
    input.focus();
    scrollToBottom();
  }
}

async function callServer(inputText) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threadId, message: inputText }),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    // non-JSON response; handled below
  }

  if (!response.ok) {
    throw new Error(data.error || `Server error: ${response.status}`);
  }

  return data.result ?? "";
}

function scrollToBottom() {
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

input.focus();
