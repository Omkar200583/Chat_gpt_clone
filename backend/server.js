
import express from "express";
import "dotenv/config";
import cors from "cors";
import { generate } from "./chatbot.js";
import NodeCache from "node-cache";


const cache = new NodeCache({ stdTTL: 60 * 60 * 24 }); // Cache for 24 hours

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).send("Hello World!");
});


app.post("/chat", async (req, res) => {
  try {
    console.log("Request body:", req.body);

    const { message, threadId } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Please enter a message."
      });
    }

    if (typeof threadId !== "string" || !threadId.trim()) {
      return res.status(400).json({
        error: "Please provide a valid threadId."
      });
    }

    const result = await generate(
      message.trim(),
      threadId.trim()
    );

    return res.status(200).json({
      result,
      threadId: threadId.trim()
    });

  } catch (error) {
    console.error("Chat error:", error);

    return res.status(500).json({
      error: "Failed to generate a response.",
      details: error.message
    });
  }
});


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
