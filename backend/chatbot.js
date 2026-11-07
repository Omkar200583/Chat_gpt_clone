import Groq from "groq-sdk";
import "dotenv/config";
import NodeCache from "node-cache";

const cache = new NodeCache({
  stdTTL: 60 * 60 * 24,
  checkperiod: 600,
  useClones: true
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY?.trim()
});

const SYSTEM_MESSAGE = {
  role: "system",
  content: `You are a helpful AI assistant.

Response rules:
- Give short and clear answers.
- Use simple English.
- Keep answers between 2 and 5 sentences.
- Explain concepts with simple examples when needed.
- Avoid unnecessary details.
- Use bullet points only when helpful.
- For simple questions, answer directly.
- For complex questions, explain step by step.
- Do not repeat information.

Use WebSearch when current information is required.`
};

const tools = [
  {
    type: "function",
    function: {
      name: "WebSearch",
      description: "Search the web for current information using Tavily.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to perform."
          }
        },
        required: ["query"],
        additionalProperties: false
      }
    }
  }
];

export async function generate(userMessage, threadId) {
  if (typeof userMessage !== "string" || !userMessage.trim()) {
    throw new Error("Message cannot be empty.");
  }

  if (typeof threadId !== "string" || !threadId.trim()) {
    throw new Error("Valid threadId is required.");
  }

  const cacheKey = threadId.trim();

  try {
    // Get existing conversation history
    let messages = cache.get(cacheKey);

    // Create a new conversation if no history exists
    if (!messages) {
      messages = [SYSTEM_MESSAGE];
    }

    // Add the user's new message
    messages.push({
      role: "user",
      content: userMessage.trim()
    });

    // Save conversation before AI processing
    cache.set(cacheKey, messages);

    // Groq AI processing
    for (let attempt = 0; attempt < 5; attempt++) {

      const response = await groq.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages,
        tools,
        tool_choice: "auto"
      });

      const assistantMessage = response.choices[0].message;

      // Save assistant message
      messages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls;

      // If no tool is requested, return the AI response
      if (!toolCalls?.length) {

        const answer =
          assistantMessage.content?.trim() ||
          "I couldn't generate a response.";

        // Save complete conversation history
        cache.set(cacheKey, messages);

        console.log("Conversation saved:", cacheKey);

        return answer;
      }

      // Execute requested tools
      for (const tool of toolCalls) {

        const toolName = tool.function.name;

        let toolResult;

        try {
          const args = JSON.parse(tool.function.arguments);

          if (toolName === "WebSearch") {

            console.log("WebSearch called:", args.query);

            toolResult = await webSearch(args.query);

          } else {

            toolResult = JSON.stringify({
              error: `Unknown tool: ${toolName}`
            });

          }

        } catch (error) {

          console.error("Tool execution error:", error.message);

          toolResult = JSON.stringify({
            error: error.message
          });

        }

        // Send tool result back to Groq
        messages.push({
          role: "tool",
          tool_call_id: tool.id,
          content: toolResult
        });
      }

      // Save updated conversation and tool results
      cache.set(cacheKey, messages);
    }

    throw new Error("Maximum tool execution attempts reached.");

  } catch (error) {

    console.error("Groq error:", error.message);

    throw error;
  }
}

// Tavily Web Search Tool
async function webSearch(query) {

  if (!process.env.TAVILY_API_KEY?.trim()) {
    throw new Error("TAVILY_API_KEY is missing.");
  }

  const response = await fetch(
    "https://api.tavily.com/search",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        api_key: process.env.TAVILY_API_KEY.trim(),
        query,
        search_depth: "basic",
        max_results: 5
      })
    }
  );

  if (!response.ok) {
    throw new Error(
      `Tavily API error: ${response.status}`
    );
  }

  const data = await response.json();

  return JSON.stringify(
    (data.results || []).map(result => ({
      title: result.title,
      url: result.url,
      content: result.content
    }))
  );
}

// Clear individual conversation
export function clearConversation(threadId) {
  cache.del(threadId);
}

// Check conversation history
export function getConversation(threadId) {
  return cache.get(threadId) || [];
}
