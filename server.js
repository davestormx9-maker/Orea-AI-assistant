import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(here));

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, configured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
    try {
        const message = req.body?.message;
        const history = req.body?.history;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ error: "Please enter a message." });
        }
        if (message.length > 4000) {
            return res.status(400).json({ error: "Your message is too long (maximum 4,000 characters)." });
        }
        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                error: "Gemini isn't configured yet. Add GEMINI_API_KEY to your server .env file and restart the server."
            });
        }

        const contents = [];
        if (Array.isArray(history)) {
            for (const item of history.slice(-20)) {
                if (!item || !["user", "assistant"].includes(item.role) ||
                    typeof item.content !== "string" || !item.content.trim()) continue;
                if (item.content.length > 4000) continue;
                contents.push({
                    role: item.role === "assistant" ? "model" : "user",
                    parts: [{ text: item.content }]
                });
            }
        }
        contents.push({ role: "user", parts: [{ text: message.trim() }] });

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const result = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            contents,
            config: {
                systemInstruction:
                    "You are OREA, a helpful, clear, friendly AI assistant. Help with learning, creativity, coding, and productivity. Be honest when uncertain."
            }
        });

        const reply = result.text?.trim();
        if (!reply) {
            return res.status(502).json({ error: "Gemini returned an empty response. Please try again." });
        }
        return res.json({ reply });
    } catch (error) {
        console.error("Gemini request failed:", error?.message || error);
        if (error?.status === 401 || error?.status === 403) {
            return res.status(502).json({ error: "Gemini rejected the API key or its permissions. Check your key and API access." });
        }
        if (error?.status === 429) {
            return res.status(429).json({ error: "Gemini rate limit or quota reached. Please wait and try again." });
        }
        return res.status(502).json({ error: "OREA couldn't get a response from Gemini. Please try again." });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`OREA AI server listening on port ${port}`);
    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing. Add it to .env before using AI chat.");
    }
});
