import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";
import { ToolLoopAgent } from "ai";
import { Chat, type Message, type Thread } from "chat";

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

const handleMessage = async (thread: Thread, message: Message) => {
  await thread.startTyping();
  const { text } = await agent.generate({ prompt: message.text });
  await thread.post(text);
};

// Respond when someone @mentions the bot
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await handleMessage(thread, message);
});

// Respond to follow-up messages in subscribed threads
bot.onSubscribedMessage(handleMessage);
