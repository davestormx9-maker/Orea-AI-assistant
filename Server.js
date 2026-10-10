
import express from "express";
import { GoogleGenAI } from "@google/genai";

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: "20kb" }));
app.use(express.static("."));

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        error: "Your message is too long."
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "The AI service is not configured."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: message.trim()
    });

    res.json({
      reply: result.text || "I couldn't generate a response."
    });
  } catch (error) {
    console.error("Gemini request failed:", error.message);
    res.status(502).json({
      error: "The AI could not respond. Please try again."
    });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`OREA AI server listening on port ${port}`);
});
