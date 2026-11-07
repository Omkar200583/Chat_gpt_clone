# ChatGPT Clone --- AI Chat Application

A beginner-friendly explanation and setup guide for the HTML, Tailwind
CSS, JavaScript, Express.js, Groq, and Tavily application provided.

## 1. What does this project do?

This project is a small ChatGPT-style web application.

A user types a message in the browser. The frontend sends that message
to an Express backend. The backend sends the conversation to a
Groq-hosted language model. If the model decides it needs current
information, it can request the `WebSearch` tool. The backend then calls
the Tavily Search API, returns the search results to the model, and
sends the model's final answer back to the browser.

### Main technologies

  -----------------------------------------------------------------------
  Technology                          Role in this project
  ----------------------------------- -----------------------------------
  HTML5                               Defines the page structure: header,
                                      message area, input and buttons

  Tailwind CSS                        Provides utility classes for
                                      layout, spacing, colours, borders
                                      and responsive design

  CSS (`index.css`)                   Place for custom styles not covered
                                      by Tailwind

  Browser JavaScript (`script.js`)    Reads user input, displays
                                      messages, calls the backend and
                                      handles errors

  Node.js                             Runs the backend JavaScript outside
                                      the browser

  Express.js                          Creates the HTTP server and the
                                      `/chat` API route

  CORS                                Allows the browser frontend to make
                                      requests to the backend when they
                                      use different origins

  dotenv                              Loads secret configuration values
                                      from a `.env` file into
                                      `process.env`

  Groq SDK                            Sends chat-completion requests to
                                      Groq's model API

  `openai/gpt-oss-120b`               The language model selected in the
                                      supplied code

  Tavily Search API                   Retrieves web-search results when
                                      the model calls the `WebSearch`
                                      tool

  node-cache                          Stores conversation messages
                                      temporarily in backend memory
  -----------------------------------------------------------------------

## 2. How the application works

The request/response flow is:

1.  The user types a message in the textarea.
2.  `script.js` listens for the Enter key. Enter sends the message;
    Shift+Enter should allow a new line.
3.  `generate()` adds the user's message to the chat screen and displays
    an "AI is thinking..." indicator.
4.  `callServer()` sends a `POST` request to
    `http://localhost:3001/chat`.
5.  Express receives the request and checks that `message` and
    `threadId` are valid strings.
6.  The server calls `generate(message, threadId)` from `chatbot.js`.
7.  `chatbot.js` gets the conversation history from `node-cache`, or
    starts a new history with the system message.
8.  The Groq model generates a response. It may either answer directly
    or request the `WebSearch` function.
9.  If the model requests `WebSearch`, the backend calls Tavily, adds
    the results to the conversation as a tool message, and asks the
    model to continue.
10. The final answer is returned through Express as JSON.
11. The browser replaces the loading text with the answer. If something
    fails, it displays an error.

``` text
Browser
  |
  | POST /chat { message, threadId }
  v
Express server (server.js)
  |
  v
generate() (chatbot.js)
  |
  +--> node-cache: load conversation history
  |
  v
Groq chat completion
  |
  +--> Direct answer --------------------------+
  |                                            |
  +--> WebSearch tool call                     |
          |                                    |
          v                                    |
       Tavily API                              |
          |                                    |
          v                                    |
       Search results --> Groq follow-up ------+
                                               |
                                               v
                                      Express JSON response
                                               |
                                               v
                                      Browser chat interface
```

## 3. Understand the frontend: `index.html`

### HTML document basics

-   `<!DOCTYPE html>` tells the browser to use modern HTML.
-   `<html lang="en">` declares the page language.
-   The UTF-8 charset supports a wide range of characters.
-   The viewport meta tag makes the page adapt to mobile screen widths.
-   `<title>` sets the browser-tab title.
-   The stylesheet link loads `index.css`.
-   The Tailwind browser CDN loads Tailwind utility classes. It is
    convenient for learning and prototypes; for a production build, use
    Tailwind's build setup.

### Main page elements

-   `#chat-container`: outer page wrapper. The supplied opening tag has
    a typo: it must be `id="chat-container"`.
-   `<header>`: contains the app title and New Chat button.
-   `#chatContainer`: message area where JavaScript inserts messages.
    Notice that this ID is different from `chat-container`; JavaScript
    uses `chatContainer`.
-   `<footer>`: fixed bottom area containing the message form.
-   `#chatForm`: form that groups the attachment button, textarea and
    send button.
-   `#attachBtn`: attachment button UI. No file-picker behaviour is
    implemented yet.
-   `#message`: textarea where the user types.
-   `#sendBtn`: submit button. The supplied JavaScript currently listens
    for Enter on the textarea, but does not handle form submission when
    the button is clicked.
-   `#chatContainer` and `#message` are important because JavaScript
    finds them using `document.getElementById()`.

### Tailwind class examples

-   `min-h-screen`: at least the full viewport height.
-   `max-w-3xl`: limits the content width.
-   `mx-auto`: horizontally centres an element.
-   `flex`, `items-center`, `justify-between`: flexbox layout helpers.
-   `rounded-3xl`: large rounded corners.
-   `bg-neutral-900`: dark neutral background.
-   `text-white`: white text.
-   `fixed bottom-0`: fixes the footer to the bottom of the viewport.
-   `hover:bg-neutral-800`: changes the background on hover.
-   `shrink-0`: prevents a flex item from shrinking.

## 4. Understand the browser JavaScript: `script.js`

### Selecting HTML elements

``` js
const input = document.getElementById("message");
const chatContainer = document.getElementById("chatContainer");
```

`getElementById()` finds an HTML element by its unique `id`. The
returned element is stored in a variable so the script can read or
update it.

### Conversation ID (`threadId`)

``` js
const threadId =
  Date.now().toString(36) +
  Math.random().toString(36).substring(2, 8);
```

This creates a reasonably unique conversation identifier for this
browser page load. The backend uses it as the cache key so messages from
different conversations do not share the same history. It is not a
permanent database ID. Refreshing the page creates a new ID, so the old
conversation cannot be recovered by this frontend.

For a real multi-user application, use authenticated users and securely
generated conversation IDs. Do not treat a client-provided ID as proof
of ownership.

### Keyboard event

`addEventListener("keydown", handleKeyUp)` registers a keyboard event
listener. The function name `handleKeyUp` is misleading because the
event is `keydown`; consider renaming it to `handleKeyDown`.

-   `event.key === "Enter"` checks whether Enter was pressed.
-   `!event.shiftKey` checks that Shift was not held.
-   `event.preventDefault()` stops Enter from inserting a newline.
-   `input.value.trim()` gets the text and removes whitespace at the
    beginning and end.
-   An empty message is ignored.

### `async` and `await`

`async` marks a function as asynchronous. `await` pauses that function
until a Promise settles, without blocking the browser's main thread.
Network requests use this pattern because they take time.

### `generate(text)`

This function:

1.  Creates a `<div>` for the user's message.
2.  Creates another element for the message text.
3.  Uses `textContent` to insert the message safely as text rather than
    interpreting it as HTML.
4.  Clears the textarea.
5.  Adds a loading indicator.
6.  Calls `callServer(text)`.
7.  Displays the assistant response or an error.
8.  Scrolls the chat toward the bottom.

### `callServer(inputText)`

`fetch()` sends an HTTP request to the backend. The request uses:

-   Method: `POST`
-   URL: `http://localhost:3001/chat`
-   Header: `Content-Type: application/json`
-   JSON body: `{ threadId, message }`

`response.json()` parses the JSON response. `response.ok` checks whether
the HTTP status is in the successful range. The frontend returns
`data.result`.

### `scrollToBottom()`

This attempts to scroll the chat container and page to the latest
message. If the message area itself is the scrollable element,
`chatContainer.scrollTop = chatContainer.scrollHeight` is the important
part.

## 5. Understand the backend server: `server.js`

### Imports

-   `express`: creates the HTTP server and routes.
-   `dotenv/config`: loads `.env` values.
-   `cors`: enables cross-origin requests.
-   `./chatbot.js`: imports the AI generation function.
-   `node-cache`: creates a cache instance.

The `cache` declared in `server.js` is not used in the supplied code.
The actual conversation cache is created separately inside `chatbot.js`.
You can remove the unused server-side cache import and instance.

### Middleware

``` js
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

Middleware runs during the request/response lifecycle.

-   `cors()` adds cross-origin response headers. In production, restrict
    this to your actual frontend origin instead of allowing every
    origin.
-   `express.json()` parses JSON request bodies and makes the result
    available as `req.body`.
-   `express.urlencoded()` parses URL-encoded form bodies. This app
    primarily sends JSON, so this middleware may not be needed.

### Routes

-   `GET /`: simple health-check route returning `Hello World!`.
-   `POST /chat`: accepts a chat message and conversation ID, validates
    them, calls the AI function and returns JSON.

Example request:

``` json
{
  "threadId": "conversation123",
  "message": "Explain JavaScript promises"
}
```

Example successful response:

``` json
{
  "result": "A Promise represents a value that may become available later...",
  "threadId": "conversation123"
}
```

The `try/catch` block catches errors from AI generation and sends an
HTTP 500 response. During development, `details: error.message` is
useful. Avoid exposing internal error details to public users in
production.

### Starting the server

`app.listen(port, ...)` starts the Express server. The port is read from
`process.env.PORT`, or defaults to `3001`.

## 6. Understand the AI logic: `chatbot.js`

### Groq client

``` js
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY?.trim()
});
```

The Groq SDK is configured with an API key from the environment. The key
must stay on the backend. Never put it in frontend JavaScript or commit
it to GitHub.

### System message

The system message sets the assistant's behaviour: short answers, simple
English, examples when useful and step-by-step explanations for complex
topics. It is an instruction to the model, not a guarantee that every
response will follow the rules exactly.

### Conversation history

The `messages` array contains objects with roles such as:

-   `system`: instructions for the assistant.
-   `user`: messages sent by the person using the app.
-   `assistant`: model responses.
-   `tool`: results returned by a tool.

The code stores the array under `threadId` in `node-cache`. This allows
the model to use earlier messages in the same conversation.

### What is caching?

Caching temporarily stores data so it can be retrieved quickly. Here it
stores conversation history in the Node.js process memory.

The configured `stdTTL` is 24 hours. `checkperiod: 600` asks node-cache
to check for expired entries periodically (600 seconds). Cache data is
lost when the server restarts, and it is not shared across multiple
server instances. Use a persistent database or shared store if
conversations must survive restarts or deployments.

### Model request

`groq.chat.completions.create()` sends the message history, selected
model and tool definitions to Groq.

The model name in the supplied code is `openai/gpt-oss-120b`. Model
availability and tool-calling support can change, so check the
provider's current model documentation if the API returns a model or
capability error.

### Function calling / tool calling

A tool is a function your backend makes available to the model. The
model does not directly execute your JavaScript function. It returns a
structured request; your backend validates and executes it.

The supplied `WebSearch` tool definition tells the model:

-   its name: `WebSearch`
-   its purpose: search current information through Tavily
-   its input: a required string named `query`

When Groq returns `assistantMessage.tool_calls`, the backend parses the
tool arguments, runs the matching backend function, and adds a message
with `role: "tool"` and the matching `tool_call_id`. The next model
request can then use the search results to write its answer.

Important: validate tool arguments and limit tool execution. Do not
assume model-generated arguments are trustworthy.

### Tavily `webSearch(query)`

This function:

1.  Checks that `TAVILY_API_KEY` exists.
2.  Sends a POST request to Tavily's search endpoint.
3.  Requests basic search results, with up to five results.
4.  Checks the HTTP status.
5.  Converts the results into JSON containing title, URL and content.
6.  Returns that JSON to the model as the tool result.

Tavily is the search provider in this code. Groq is the model provider.
They do different jobs.

### Retry loop

The `for` loop allows up to five model requests while the model is using
tools. If the model keeps requesting tools until the limit is reached,
the function throws an error. This is a tool-cycle limit, not a complete
retry strategy for network failures or rate limits.

### Helper functions

-   `clearConversation(threadId)`: deletes one conversation from the
    cache.
-   `getConversation(threadId)`: returns the cached conversation or an
    empty array.

These helpers are exported but are not currently connected to any API
route or frontend button.

## 7. Project folder structure

A clean layout for these files is:

``` text
chatgpt-clone/
├── frontend/
│   ├── index.html
│   ├── index.css
│   └── script.js
│
└── backend/
    ├── server.js
    ├── chatbot.js
    ├── package.json
    └── .env
```

You can use a different folder layout, but update import paths and
script commands to match it.

## 8. Install and run the project

### Requirements

-   Node.js (LTS version recommended)
-   npm
-   A Groq API key
-   A Tavily API key if you want web search

### Backend setup

Open a terminal in the `backend` directory:

``` bash
npm init -y
npm install express dotenv cors groq-sdk node-cache
npm install --save-dev nodemon
```

In `backend/package.json`, add `"type": "module"` and scripts similar
to:

``` json
{
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

Create `backend/.env`:

``` env
PORT=3001
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Replace the example values with your own keys. Do not include quotation
marks unless your key itself requires them. Add `.env` to `.gitignore`.

Start the backend:

``` bash
npm run dev
```

You should see a message that the server is running on port 3001.

### Frontend setup

For a simple local test, serve the `frontend` folder with a local
development server (for example, the VS Code Live Server extension).
Avoid opening the HTML as a `file://` page. Make sure `script.js` points
to the correct backend URL.

The current frontend URL is hard-coded to `http://localhost:3001/chat`,
which is suitable only when the backend is running on the same computer.
Change it to your deployed backend URL when deploying.

## 9. Important issues to fix in the supplied code

The pasted code is a useful starting point, but it is not yet a complete
ChatGPT clone.

1.  **HTML syntax:** fix the malformed outer div to
    `<div class="mx-auto min-h-screen max-w-3xl" id="chat-container">`.
2.  **Tailwind script URL:** use a normal script source, not Markdown
    link syntax inside the HTML attribute:
    `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`.
3.  **SVG namespace:** use `xmlns="http://www.w3.org/2000/svg"` without
    Markdown link formatting.
4.  **Form submission:** add a `submit` event listener to `chatForm` so
    clicking the Send button works. At present, the code only handles
    Enter in the textarea.
5.  **New Chat button:** it has no event handler. A working New Chat
    action should clear the visible messages and create a new
    `threadId`.
6.  **Attachment button:** it is only visual. Add a hidden file input
    and upload handling if attachments are required.
7.  **Conversation reset:** connect `clearConversation()` to a protected
    backend route if you want the New Chat action to delete cached
    server history. Simply generating a new ID starts a separate
    conversation but leaves the old cache entry until it expires.
8.  **Message history size:** conversation history grows with each turn.
    Add a token/history limit or summarisation to avoid oversized
    requests and rising costs.
9.  **Tool loop:** check model finish reasons and handle malformed tool
    arguments. Add timeouts and rate-limit handling.
10. **Security:** restrict CORS, add rate limiting, validate request
    sizes, keep keys private, and do not expose raw internal errors in
    production.
11. **Production cache:** `node-cache` is in-memory and is not durable.
    Use a database or shared cache for production conversation storage.
12. **Scroll behaviour:** ensure the message container has the intended
    overflow/height styles if you want it to scroll independently.

## 10. Common errors and what they mean

  -----------------------------------------------------------------------------
  Error                         Likely cause            What to check
  ----------------------------- ----------------------- -----------------------
  `Failed to fetch`             Backend is not          Start backend; verify
                                reachable, wrong URL,   port and frontend URL;
                                CORS issue or server    inspect browser console
                                stopped                 

  `GROQ_API_KEY` error          Missing or invalid Groq Check backend `.env`;
                                key                     restart backend after
                                                        editing it

  `TAVILY_API_KEY is missing`   Model requested search  Add the key, or handle
                                but no Tavily key is    the missing-search-tool
                                configured              case gracefully

  HTTP 401                      Invalid API key or      Check the relevant
                                authentication          provider key

  HTTP 429                      Rate limit or quota     Check provider limits
                                restriction             and usage

  HTTP 500 from `/chat`         Backend AI processing   Read backend terminal
                                failed                  logs

  Model not found / unsupported Model name or feature   Check current Groq
  tool call                     is not available for    model and tool-calling
                                the account/API         documentation

  Browser says CORS blocked     Frontend origin is not  Configure the exact
                                allowed by backend CORS frontend origin
                                policy                  
  -----------------------------------------------------------------------------

## 11. Concepts to learn in order

If you are learning this project from the beginning, study these topics
in this order:

1.  HTML elements, attributes, forms, IDs and semantic layout.
2.  CSS basics and Tailwind utility classes.
3.  JavaScript variables, functions, arrays, objects and DOM
    manipulation.
4.  Events: `keydown`, `submit`, `preventDefault()` and event listeners.
5.  Promises, `async`/`await`, `fetch()` and JSON.
6.  Node.js, npm packages, ES modules and environment variables.
7.  Express routes, middleware, request bodies and HTTP status codes.
8.  REST API request/response flow and CORS.
9.  LLM basics: system prompts, roles, tokens, context and chat
    completions.
10. Tool/function calling and the model → tool → model cycle.
11. Search APIs, API keys, caching, validation and security.
12. Persistence, deployment, logging, rate limiting and production
    monitoring.

## 12. Final summary

This project combines a browser-based chat interface with a Node.js
backend. HTML and Tailwind create the interface; browser JavaScript
handles input and HTTP requests; Express exposes the chat API; Groq
generates the assistant response; Tavily provides search results when
requested by the model; and node-cache temporarily remembers
conversation history.

The most important concept is that **the model does not directly run the
search function**. It asks the backend to call a tool. The backend
executes that tool, returns its result to the model, and the model then
prepares the final answer.
