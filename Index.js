/* ==========================================
   OREA AI — INTERACTIVE JAVASCRIPT
   Chat, Navigation, History & User Interface
   ========================================== */

"use strict";

// ==========================================
// 1. SELECT HTML ELEMENTS
// ==========================================

const promptInput = document.getElementById("prompt");
const chat = document.getElementById("chat");
const welcome = document.getElementById("welcome");
const suggestions = document.getElementById("suggestions");
const sidebar = document.getElementById("sidebar");

let isBusy = false;
let chatHistory = [];
let savedChats = [];
let currentChatId = Date.now();

// Restore saved conversations from this browser.
try {
    savedChats = JSON.parse(
        localStorage.getItem("orea_saved_chats") || "[]"
    );

    if (!Array.isArray(savedChats)) {
        savedChats = [];
    }
} catch {
    savedChats = [];
}

// ==========================================
// 2. MOBILE SIDEBAR
// ==========================================

function toggleSidebar() {
    sidebar.classList.toggle("open");
}

document.addEventListener("click", function (event) {
    if (
        window.innerWidth <= 760 &&
        sidebar.classList.contains("open") &&
        !sidebar.contains(event.target) &&
        !event.target.closest(".menu-button")
    ) {
        sidebar.classList.remove("open");
    }
});

// ==========================================
// 3. DISPLAY CHAT INTERFACE
// ==========================================

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
    window.requestAnimationFrame(() => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth"
        });
    });
}

// ==========================================
// 4. CREATE CHAT MESSAGES SAFELY
// ==========================================

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

    // textContent prevents messages from being interpreted as HTML.
    bubble.textContent = text;

    message.appendChild(bubble);
    chat.appendChild(message);

    scrollToBottom();

    return bubble;
}

// ==========================================
// 5. DEMO AI RESPONSE ENGINE
// ==========================================

function getAIResponse(message) {
    const text = message.toLowerCase().trim();

    if (/^(hi|hello|hey|hiya)\b/.test(text)) {
        return "Hey there! 👋 Welcome to OREA AI.\n\nI'm your digital companion for learning, creativity, coding and productivity.\n\nWhat would you like to explore today?";
    }

    if (
        text.includes("who are you") ||
        text.includes("your name")
    ) {
        return "I'm OREA AI ✨\n\nYour intelligent digital companion, designed to help you explore ideas, learn new things and build amazing projects.\n\nNote: I'm currently running in demo mode. Connect an AI backend to enable real AI-powered conversations.";
    }

    if (
        text.includes("what can you do") ||
        text.includes("your features")
    ) {
        return "Here's what OREA is designed to help with! 🚀\n\n✦ Learning — explain difficult topics.\n\n✦ Coding — understand programming and build projects.\n\n✦ Creativity — brainstorm ideas and write content.\n\n✦ Productivity — organise tasks and plan goals.\n\n✦ Problem-solving — break challenges into manageable steps.\n\nThese are demo capabilities until a real AI backend is connected.";
    }

    if (
        text.includes("html") ||
        text.includes("css") ||
        text.includes("javascript") ||
        text.includes("website") ||
        text.includes("programming") ||
        text.includes("code")
    ) {
        return "Let's build something amazing! 💻\n\nWeb development has three core technologies:\n\n1. HTML — creates the structure of a webpage.\n\n2. CSS — controls colours, layouts, animations and visual design.\n\n3. JavaScript — adds interaction and functionality.\n\nOREA uses all three!\n\nConnect a real AI backend to get personalised programming assistance and dynamically generated code.";
    }

    if (
        text.includes("study") ||
        text.includes("school") ||
        text.includes("exam") ||
        text.includes("test") ||
        text.includes("learn")
    ) {
        return "Let's make learning easier! 📚\n\nHere's a useful study method:\n\n1. Break the topic into smaller sections.\n\n2. Understand each concept with examples.\n\n3. Explain it in your own words.\n\n4. Practise questions without looking at your notes.\n\n5. Review the answers and correct your mistakes.\n\nWhat subject are you studying?";
    }

    if (
        text.includes("idea") ||
        text.includes("creative") ||
        text.includes("project")
    ) {
        return "Let's unlock your creativity! ✨\n\nHere are three project ideas:\n\n1. An AI-powered study assistant.\n\n2. A personal productivity dashboard.\n\n3. A website that helps people learn programming.\n\nChoose one and start with a simple version. You can add more features as your skills grow!";
    }

    if (
        text.includes("plan") ||
        text.includes("goal") ||
        text.includes("organise") ||
        text.includes("organize")
    ) {
        return "Let's organise your goals! 🎯\n\n1. Choose three important priorities.\n\n2. Break each one into small tasks.\n\n3. Decide when to work on each task.\n\n4. Track what you complete.\n\n5. Review your progress and adjust your plan.\n\nSmall, consistent steps can make a big difference.";
    }

    if (
        text.includes("thank")
    ) {
        return "You're welcome! 💜\n\nI'm glad you're exploring OREA. What else would you like to work on?";
    }

    if (
        text.includes("joke") ||
        text.includes("make me laugh")
    ) {
        return "Here's a programming joke! 😂\n\nWhy do programmers prefer dark mode?\n\nBecause light attracts bugs! 🐛";
    }

    return "Thanks for your message! ✨\n\nYou've successfully sent a message to OREA.\n\nHowever, this version uses predefined demo responses rather than a real AI model.\n\nTo answer your specific question intelligently, connect OREA to an AI API through a secure backend server.\n\nYour message was received successfully!";
}

// ==========================================
// 6. SEND A MESSAGE
// ==========================================

async function sendMessage() {
    const message = promptInput.value.trim();

    if (!message || isBusy) {
        return;
    }

    isBusy = true;

    promptInput.value = "";
    promptInput.style.height = "45px";

    openChatInterface();

    addMessage(message, "user");

    chatHistory.push({
        role: "user",
        content: message
    });

    const responseBubble = addMessage(
        "OREA is thinking...",
        "assistant"
    );

    responseBubble.classList.add("typing");

    // Simulate a short response delay.
    await new Promise(resolve => setTimeout(resolve, 700));

    const response = getAIResponse(message);

    responseBubble.classList.remove("typing");
    responseBubble.textContent = response;

    chatHistory.push({
        role: "assistant",
        content: response
    });

    saveCurrentChat();

    isBusy = false;

    promptInput.focus();
    scrollToBottom();
}

// ==========================================
// 7. ENTER TO SEND; SHIFT+ENTER FOR NEW LINE
// ==========================================

function handleKey(event) {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Automatically increase the input height.
promptInput.addEventListener("input", function () {
    this.style.height = "45px";

    this.style.height =
        Math.min(this.scrollHeight, 160) + "px";
});

// ==========================================
// 8. SUGGESTED PROMPTS
// ==========================================

function ask(message) {
    promptInput.value = message;
    sendMessage();
}

// ==========================================
// 9. SAVE CONVERSATIONS
// ==========================================

function saveCurrentChat() {
    if (chatHistory.length === 0) {
        return;
    }

    const firstUserMessage = chatHistory.find(
        message => message.role === "user"
    );

    const title = firstUserMessage
        ? firstUserMessage.content.slice(0, 40)
        : "New conversation";

    const existingIndex = savedChats.findIndex(
        saved => saved.id === currentChatId
    );

    const conversation = {
        id: currentChatId,
        title: title,
        updatedAt: new Date().toISOString(),
        messages: chatHistory
    };

    if (existingIndex !== -1) {
        savedChats[existingIndex] = conversation;
    } else {
        savedChats.unshift(conversation);
    }

    // Keep the most recent 30 conversations.
    savedChats = savedChats.slice(0, 30);

    try {
        localStorage.setItem(
            "orea_saved_chats",
            JSON.stringify(savedChats)
        );
    } catch (error) {
        console.warn("OREA could not save chat history:", error);
    }

    renderChatHistory();
}

// ==========================================
// 10. RENDER RECENT CONVERSATIONS
// ==========================================

function renderChatHistory() {
    const existing = document.getElementById("history-list");

    if (existing) {
        existing.remove();
    }

    const container = document.createElement("div");
    container.id = "history-list";

    const label = document.createElement("div");
    label.className = "section-label";
    label.style.marginTop = "25px";
    label.textContent = "RECENT CONVERSATIONS";

    container.appendChild(label);

    savedChats.slice(0, 5).forEach(conversation => {
        const item = document.createElement("div");

        item.className = "nav-item";
        item.textContent = "◷  " + conversation.title;
        item.title = conversation.title;

        item.addEventListener("click", () => {
            loadChat(conversation.id);
        });

        container.appendChild(item);
    });

    const bottom = sidebar.querySelector(".sidebar-bottom");

    if (bottom) {
        sidebar.insertBefore(container, bottom);
    } else {
        sidebar.appendChild(container);
    }
}

// ==========================================
// 11. LOAD A SAVED CONVERSATION
// ==========================================

function loadChat(id) {
    const conversation = savedChats.find(
        item => item.id === id
    );

    if (!conversation) {
        return;
    }

    currentChatId = conversation.id;

    chatHistory = conversation.messages.map(message => ({
        role: message.role,
        content: message.content
    }));

    chat.replaceChildren();
    openChatInterface();

    chatHistory.forEach(message => {
        addMessage(
            message.content,
            message.role === "user" ? "user" : "assistant"
        );
    });

    sidebar.classList.remove("open");
}

// ==========================================
// 12. START A NEW CONVERSATION
// ==========================================

function newChat() {
    if (isBusy) {
        return;
    }

    chatHistory = [];
    currentChatId = Date.now();

    chat.replaceChildren();
    promptInput.value = "";
    promptInput.style.height = "45px";

    showWelcomeScreen();

    sidebar.classList.remove("open");
    promptInput.focus();
}

// ==========================================
// 13. NAVIGATION FEATURES
// ==========================================

function showFeature(title, description) {
    if (isBusy) {
        return;
    }

    chatHistory = [];
    currentChatId = Date.now();

    chat.replaceChildren();

    openChatInterface();

    addMessage(title, "user");
    addMessage(description, "assistant");

    chatHistory.push(
        { role: "user", content: title },
        { role: "assistant", content: description }
    );

    saveCurrentChat();

    sidebar.classList.remove("open");
}

function showHistory() {
    if (isBusy) {
        return;
    }

    if (savedChats.length === 0) {
        showFeature(
            "Recent conversations",
            "You don't have any saved conversations yet. Start chatting with OREA to build your history!"
        );

        return;
    }

    chat.replaceChildren();
    openChatInterface();

    addMessage(
        "Your recent conversations",
        "assistant"
    );

    savedChats.forEach((conversation, index) => {
        addMessage(
            `${index + 1}. ${conversation.title}`,
            "assistant"
        );
    });

    sidebar.classList.remove("open");
}

// ==========================================
// 14. CLEAR CHAT HISTORY
// ==========================================

function clearChatHistory() {
    const confirmed = window.confirm(
        "Are you sure you want to delete all saved OREA conversations?"
    );

    if (!confirmed) {
        return;
    }

    savedChats = [];

    localStorage.removeItem("orea_saved_chats");

    renderChatHistory();
    newChat();
}

// ==========================================
// 15. INITIALISE OREA
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    renderChatHistory();

    console.log(
        "OREA AI is ready! Connect an AI backend for real AI responses."
    );
});

// Also initialise immediately when the script loads.
renderChatHistory();
