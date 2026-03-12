import { createSlackAdapter } from "@chat-adapter/slack";
import { createRedisState } from "@chat-adapter/state-redis";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { Chat } from "chat";

const telegram = createTelegramAdapter();
const slack = createSlackAdapter();

const adapters = {
  slack,
  telegram,
};

type Adapters = typeof adapters;

export interface ThreadState {
  runId?: string;
}

export const bot = new Chat<Adapters, ThreadState>({
  userName: "mybot",
  adapters,
  state: createRedisState(),
}).registerSingleton();
