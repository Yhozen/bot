import { openai } from "@ai-sdk/openai";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { ToolLoopAgent } from "ai";

import { Chat, type Message, type Thread } from "chat";

const telegram = createTelegramAdapter();
const slack = createSlackAdapter();

export const bot = new Chat({
  userName: "mybot",
  adapters: {
    slack,
    telegram,
  },
  state: createRedisState(),
});

const model = openai("gpt-5.2");

const agent = new ToolLoopAgent({
  model,
  instructions: "You are a helpful assistant. You always say Hallo",
});

const handleMessage = async (thread: Thread, message: Message) => {
  await thread.startTyping();
  const { fullStream } = await agent.stream({ prompt: message.text });
  await thread.post(fullStream);
};

// Respond when someone @mentions the bot
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await handleMessage(thread, message);
});

// Respond to follow-up messages in subscribed threads
bot.onSubscribedMessage(handleMessage);

// Call initialize() so polling can start in long-running local processes:
void bot.initialize();
console.log(`Telegram runtime mode: ${telegram.runtimeMode}`); // "webhook" | "polling"
