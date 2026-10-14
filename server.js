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

// Initialize Firebase Admin.
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
    console.error(
        "Firebase Admin initialization failed:",
        error.message
    );
}

// Verify Firebase authentication.
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

        req.user = await getAuth().verifyIdToken(match[1]);
        return next();
    } catch {
        return res.status(401).json({
            error: "Your session is invalid or expired. Please sign in again."
        });
    }
}

// Detect temporary Gemini errors.
function isRetryable(error) {
    const status = Number(
        error?.status ??
        error?.statusCode ??
        error?.response?.status
    );

    const message = String(error?.message || "").toLowerCase();

    return (
        [408, 429, 500, 502, 503, 504].includes(status) ||
        message.includes("high demand") ||
        message.includes("service unavailable") ||
        message.includes("temporarily unavailable") ||
        message.includes("resource exhausted")
    );
}

// Retry Gemini up to three times.
async function generateWithRetry(ai, contents) {
    const delays = [1000, 2500];

    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await ai.models.generateContent({
                model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
                contents,
                config: {
                    systemInstruction:
                        "You are OREA, a helpful, clear, friendly AI assistant. Help with learning, creativity, coding, and productivity. Be honest when uncertain."
                }
            });
        } catch (error) {
            if (attempt === 2 || !isRetryable(error)) {
                throw error;
            }

            const delay = delays[attempt];

            console.warn(
                `Gemini temporary error. Retry ${attempt + 1}/2 in ${delay}ms.`
            );

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw new Error("Gemini request failed after retries.");
}

// Groq backup provider.
async function generateWithGroq(contents) {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error("GROQ_API_KEY is not configured.");
    }

    const messages = [
        {
            role: "system",
            content:
                "You are OREA, a helpful, clear, friendly AI assistant. Help with learning, creativity, coding, and productivity. Be honest when uncertain."
        },
        ...contents.map(item => ({
            role: item.role === "model" ? "assistant" : "user",
            content: item.parts
                .map(part => part.text || "")
                .join("\n")
        }))
    ];

    const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "openai/gpt-oss-20b",
                messages
            }),
            signal: AbortSignal.timeout(30000)
        }
    );

    if (!response.ok) {
        const details = await response.text();

        console.error(
            "Groq backup failed:",
            response.status,
            details.slice(0, 300)
        );

        throw new Error(`Groq returned status ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
        throw new Error("Groq returned an empty response.");
    }

    return reply;
}

// Health check.
app.get("/api/health", (_req, res) => {
    res.json({
        ok: true,
        configured: Boolean(
            process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY
        ),
        authenticationConfigured: getApps().length > 0
    });
});

// AI chat endpoint.
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

        if (
            !process.env.GEMINI_API_KEY &&
            !process.env.GROQ_API_KEY
        ) {
            return res.status(503).json({
                error: "OREA AI is not configured. Please try again later."
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

        let reply = "";

        // Try Gemini first.
        if (process.env.GEMINI_API_KEY) {
            try {
                const ai = new GoogleGenAI({
                    apiKey: process.env.GEMINI_API_KEY
                });

                const result = await generateWithRetry(ai, contents);
                reply = result.text?.trim() || "";
            } catch (error) {
                console.error(
                    "Gemini failed; trying Groq backup:",
                    error?.message || error
                );
            }
        }

        // Fall back to Groq if Gemini fails.
        if (!reply && process.env.GROQ_API_KEY) {
            try {
                reply = await generateWithGroq(contents);
            } catch (error) {
                console.error(
                    "Groq backup failed:",
                    error?.message || error
                );
            }
        }

        if (!reply) {
            return res.status(503).json({
                error: "OREA AI is temporarily busy. Please try again shortly."
            });
        }

        return res.json({ reply });
    } catch (error) {
        console.error(
            "OREA chat request failed:",
            error?.message || error
        );

        return res.status(500).json({
            error: "Something went wrong while processing your message. Please try again."
        });
    }
});

// Start the server.
app.listen(port, "0.0.0.0", () => {
    console.log(`OREA AI server listening on port ${port}`);

    if (!process.env.GEMINI_API_KEY) {
        console.warn("GEMINI_API_KEY is missing.");
    }

    if (!process.env.GROQ_API_KEY) {
        console.warn("GROQ_API_KEY is missing; backup AI is disabled.");
    }
});
