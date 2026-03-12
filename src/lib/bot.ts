import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";
import { ToolLoopAgent } from "ai";
import { Chat } from "chat";

export const bot = new Chat({
  userName: "mybot",
  adapters: {
    slack: createSlackAdapter(),
  },
  state: createRedisState(),
});

const agent = new ToolLoopAgent({
  model: "anthropic/claude-4.5-sonnet",
  instructions: "You are a helpful assistant. You always say Hallo",
});

// Respond when someone @mentions the bot
bot.onNewMention(async (thread, message) => {
  const result = await agent.stream({ prompt: message.text });
  await thread.post(result.fullStream);
});

// Respond to follow-up messages in subscribed threads
bot.onSubscribedMessage(async (thread, message) => {
  await thread.post(`You said: ${message.text}`);
});
