import "dotenv/config";
import express from "express";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const port = Number(process.env.PORT) || 3000;
const here = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));
app.use(express.static(here));

// Initialize Firebase Admin using Render's private environment variable.
try {
    const serviceAccountText = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

    if (!serviceAccountText) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is missing.");
    }

    const serviceAccount = JSON.parse(serviceAccountText);

    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }

    console.log("Firebase Admin initialized.");
} catch (error) {
    console.error("Firebase Admin initialization failed:", error.message);
}

// Verify the Firebase ID token sent by the frontend.
async function requireAuth(req, res, next) {
    try {
        if (!getApps().length) {
            return res.status(503).json({
                error: "Authentication is temporarily unavailable."
            });
        }

        const authorization = req.headers.authorization || "";
        const match = authorization.match(/^Bearer\s+(.+)$/i);

        if (!match) {
            return res.status(401).json({
                error: "Please sign in to use OREA AI."
            });
        }

        const decodedToken = await getAuth().verifyIdToken(match[1]);
        req.user = decodedToken;

        return next();
    } catch {
        return res.status(401).json({
            error: "Your session is invalid or expired. Please sign in again."
        });
    }
}

app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        configured: Boolean(process.env.GEMINI_API_KEY),
        authenticationConfigured: getApps().length > 0
    });
});

// AI chat requires a verified Firebase user.
app.post("/api/chat", requireAuth, async (req, res) => {
    try {
        const message = req.body?.message;
        const history = req.body?.history;

        if (typeof message !== "string" || !message.trim()) {
            return res.status(400).json({
                error: "Please enter a message."
            });
        }

        if (message.length > 4000) {
            return res.status(400).json({
                error: "Your message is too long (maximum 4,000 characters)."
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(503).json({
                error: "Gemini isn't configured. Please check the server configuration."
            });
        }

        const contents = [];

        if (Array.isArray(history)) {
            for (const item of history.slice(-20)) {
                if (
                    !item ||
                    !["user", "assistant"].includes(item.role) ||
                    typeof item.content !== "string" ||
                    !item.content.trim() ||
                    item.content.length > 4000
                ) {
                    continue;
                }

                contents.push({
                    role: item.role === "assistant" ? "model" : "user",
                    parts: [{ text: item.content }]
                });
            }
        }

        contents.push({
            role: "user",
            parts: [{ text: message.trim() }]
        });

        const ai = new GoogleGenAI({
            apiKey: process.env.GEMINI_API_KEY
        });

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
            return res.status(502).json({
                error: "Gemini returned an empty response. Please try again."
            });
        }

        return res.json({ reply });
    } catch (error) {
        console.error("Gemini request failed:", error?.message || error);

        if (error?.status === 401 || error?.status === 403) {
            return res.status(502).json({
                error: "Gemini rejected the API key or its permissions."
            });
        }

        if (error?.status === 429) {
            return res.status(429).json({
                error: "Gemini rate limit or quota reached. Please try again later."
            });
        }

        return res.status(502).json({
            error: "OREA couldn't get a response from Gemini. Please try again."
        });
    }
});

app.listen(port, "0.0.0.0", () => {
    console.log(`OREA AI server listening on port ${port}`);

    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing.");
    }
});
