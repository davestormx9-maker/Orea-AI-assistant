/* =========================================================
   OREA AI — INTERACTIVE JAVASCRIPT
   Chat, navigation, local chat history and demo responses.
   Note: this is a front-end demo; it does not call a real AI.
   ========================================================= */
"use strict";

const promptInput = document.getElementById("prompt");
const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const suggestions = document.getElementById("suggestions");
const sidebar = document.getElementById("sidebar");

let isBusy = false;
let chatHistory = [];
let savedChats = [];
let currentChatId = createChatId();

function createChatId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function readSavedChats() {
    try {
        const stored = JSON.parse(localStorage.getItem("orea_saved_chats") || "[]");
        return Array.isArray(stored)
            ? stored.filter(item => item && typeof item.id !== "undefined" && Array.isArray(item.messages))
            : [];
    } catch (error) {
        console.warn("OREA could not read saved chats:", error);
        return [];
    }
}
savedChats = readSavedChats();

function toggleSidebar() {
    if (sidebar) sidebar.classList.toggle("open");
}

document.addEventListener("click", event => {
    if (window.innerWidth <= 760 && sidebar &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !event.target.closest(".menu-button")) {
        sidebar.classList.remove("open");
    }
});

function openChatInterface() {
    welcome.style.display = "none";
    suggestions.style.display = "none";
    chat.style.display = "flex";
}

function showWelcomeScreen() {
    welcome.style.display = "block";
    suggestions.style.display = "grid";
    chat.style.display = "none";
}

function scrollToBottom() {
    requestAnimationFrame(() => window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth"
    }));
}

function addMessage(text, role) {
    const message = document.createElement("div");
    message.className = `message ${role}`;

    if (role === "assistant") {
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = "O";
        avatar.setAttribute("aria-label", "OREA");
        message.appendChild(avatar);
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    if (role === "assistant" && window.marked && window.DOMPurify) {
  bubble.innerHTML = window.DOMPurify.sanitize(window.marked.parse(String(text)));
} else {
  bubble.textContent = String(text);
}
   if (role === "assistant" && window.MathJax) {
  window.MathJax.typesetPromise([bubble]).catch(function (error) {
    console.error("Math rendering error:", error);
  });
   }
    message.appendChild(bubble);
    chat.appendChild(message);
    scrollToBottom();
    return bubble;
}

/* Send messages to the secure server-side Gemini endpoint. */
async function sendMessage() {
    const message = promptInput.value.trim();
    if (!message || isBusy) return;

    isBusy = true;
    promptInput.value = "";
    promptInput.style.height = "45px";
    openChatInterface();
    addMessage(message, "user");
    chatHistory.push({ role: "user", content: message });

    const responseBubble = addMessage("OREA is thinking...", "assistant");
    responseBubble.classList.add("typing");

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                history: chatHistory.slice(0, -1).slice(-20)
            })
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("The server returned an invalid response. Please try again.");
        }

        if (!response.ok) {
            throw new Error(data?.error || `Request failed (${response.status}).`);
        }
        if (typeof data.reply !== "string" || !data.reply.trim()) {
            throw new Error("OREA received an empty reply. Please try again.");
        }

        responseBubble.classList.remove("typing");
        responseBubble.textContent = data.reply;
        chatHistory.push({ role: "assistant", content: data.reply });
        saveCurrentChat();
    } catch (error) {
        responseBubble.classList.remove("typing");
        responseBubble.textContent = error.message ||
            "Sorry, OREA couldn't connect. Check that the server is running and try again.";
        console.error("OREA message error:", error);
        // Remove the failed assistant turn from saved conversation context.
        if (chatHistory.length && chatHistory[chatHistory.length - 1]?.role === "user") {
            // Keep the user's message in the visible/local history so it can be retried.
        }
    } finally {
        isBusy = false;
        scrollToBottom();
        promptInput.focus();
    }
}

function handleKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

promptInput.addEventListener("input", function () {
    this.style.height = "45px";
    this.style.height = Math.min(this.scrollHeight, 160) + "px";
});

function ask(message) {
    if (isBusy) return;
    promptInput.value = message;
    sendMessage();
}

function saveCurrentChat() {
    if (!chatHistory.length) return;
    const firstUserMessage = chatHistory.find(message => message.role === "user");
    const conversation = {
        id: currentChatId,
        title: firstUserMessage ? firstUserMessage.content.slice(0, 40) : "New conversation",
        updatedAt: new Date().toISOString(),
        messages: chatHistory.map(message => ({ ...message }))
    };

    const index = savedChats.findIndex(saved => saved.id === currentChatId);
    if (index >= 0) savedChats[index] = conversation;
    else savedChats.unshift(conversation);
    savedChats = savedChats.slice(0, 30);

    try {
        localStorage.setItem("orea_saved_chats", JSON.stringify(savedChats));
    } catch (error) {
        console.warn("OREA could not save chat history:", error);
    }
    renderChatHistory();
}

function renderChatHistory() {
    if (!sidebar) return;
    const existing = document.getElementById("history-list");
    if (existing) existing.remove();

    const container = document.createElement("div");
    container.id = "history-list";
    const label = document.createElement("div");
    label.className = "section-label";
    label.style.marginTop = "25px";
    label.textContent = "RECENT CONVERSATIONS";
    container.appendChild(label);

    savedChats.slice(0, 5).forEach(conversation => {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "nav-item history-item";
        item.textContent = "◷  " + (conversation.title || "Untitled conversation");
        item.title = conversation.title || "Untitled conversation";
        item.addEventListener("click", () => loadChat(conversation.id));
        container.appendChild(item);
    });

    const bottom = sidebar.querySelector(".sidebar-bottom");
    if (bottom) sidebar.insertBefore(container, bottom);
    else sidebar.appendChild(container);
}

function loadChat(id) {
    const conversation = savedChats.find(item => item.id === id);
    if (!conversation) return;
    currentChatId = conversation.id;
    chatHistory = conversation.messages.map(message => ({
        role: message.role === "user" ? "user" : "assistant",
        content: String(message.content ?? "")
    }));
    chat.replaceChildren();
    openChatInterface();
    chatHistory.forEach(message => addMessage(message.content, message.role));
    sidebar.classList.remove("open");
}

function newChat() {
    if (isBusy) return;
    chatHistory = [];
    currentChatId = createChatId();
    chat.replaceChildren();
    promptInput.value = "";
    promptInput.style.height = "45px";
    showWelcomeScreen();
    if (sidebar) sidebar.classList.remove("open");
}

function showFeature(title, description) {
    if (isBusy) return;
    chatHistory = [];
    currentChatId = createChatId();
    chat.replaceChildren();
    openChatInterface();
    addMessage(title, "user");
    addMessage(description, "assistant");
    chatHistory.push(
        { role: "user", content: title },
        { role: "assistant", content: description }
    );
    saveCurrentChat();
    if (sidebar) sidebar.classList.remove("open");
}

function showHistory() {
    if (isBusy) return;
    if (!savedChats.length) {
        showFeature("Recent conversations", "You don't have any saved conversations yet. Start chatting with OREA to build your history.");
        return;
    }
    chat.replaceChildren();
    openChatInterface();
    addMessage("Your recent conversations", "assistant");
    savedChats.forEach((conversation, index) => {
        const row = document.createElement("div");
        row.className = "message assistant";
        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = "O";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "bubble history-open-button";
        button.textContent = `${index + 1}. ${conversation.title || "Untitled conversation"} — Open`;
        button.addEventListener("click", () => loadChat(conversation.id));
        row.append(avatar, button);
        chat.appendChild(row);
    });
    if (sidebar) sidebar.classList.remove("open");
}

function clearChatHistory() {
    if (isBusy || !window.confirm("Are you sure you want to delete all saved OREA conversations?")) return;
    savedChats = [];
    try {
        localStorage.removeItem("orea_saved_chats");
    } catch (error) {
        console.warn("OREA could not clear saved chats:", error);
    }
    renderChatHistory();
    newChat();
}

Object.assign(window, {
    toggleSidebar, sendMessage, handleKey, ask, newChat,
    showFeature, showHistory, clearChatHistory
});

document.addEventListener("DOMContentLoaded", () => {
    renderChatHistory();
    console.log("OREA AI is ready. Gemini backend connection is enabled.");
});
