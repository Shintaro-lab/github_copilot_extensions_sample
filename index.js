import { Octokit } from "@octokit/core";
import fetch from "node-fetch";
import express from "express";
import { Readable } from "node:stream";

const app = express()

app.post("/", express.json(), async (req, res) => {
  // Identify the user, using the GitHub API token provided in the request headers.
  const tokenForUser = req.get("X-GitHub-Token");
  const octokit = new Octokit({ auth: tokenForUser ,request: {fetch}});
  const user = await octokit.request("GET /user");
  console.log("User:", user.data.login);

  // Parse the request payload and log it.
  const payload = req.body;
  //console.log("Payload:", payload);

  const eolObject = {
    choices: [{ index: 0, finish_reason: "stop", delta: { content: "\n\n" } }],
  };

  const endObject = {
    choices: [{ index: 0, finish_reason: "stop", delta: { content: "\n\nfinish" } }],
  };

  // Insert a special pirate-y system message in our message list.
const messages = payload.messages;
  messages.unshift({
    role: "system",
    content: "You are a helpful assistant that replies to user messages as if you were the Blackbeard Pirate.",
  });
  messages.unshift({
    role: "system",
    content: `Start every response with the user's name, which is @${user.data.login}`,
  });

  //console.log(typeof(messages));
  //console.log("messages:", messages);

  // Use Copilot's LLM to generate a response to the user's messages, with
  // our extra system messages attached.
  const copilotLLMResponse = await fetch(
    "https://api.githubcopilot.com/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenForUser}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages,
        stream: true,
      }),
    }
  );

  for await (const chunk of copilotLLMResponse.body) {
    res.write(new TextDecoder().decode(chunk));
  }

  res.write(`data: ${JSON.stringify(eolObject)}\n\n`)

  const copilotLLMResponse2 = await fetch(
    "https://api.githubcopilot.com/chat/completions",
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${tokenForUser}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        messages: [{
          role:"user",
          content: "what is your name"
        }],
        stream: true,
        model: 'gpt-4'
      }),
    }
  );

  for await (const chunk of copilotLLMResponse2.body) {
    const buf = new TextDecoder().decode(chunk); 
    res.write(buf);
    console.log(buf);
  }

  res.end(`data: ${JSON.stringify(endObject)}\n\n`);

  // Stream the response straight back to the user.
  //Readable.from(copilotLLMResponse.body).pipe(res);
})

const port = Number(process.env.PORT || '3000')
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
});
