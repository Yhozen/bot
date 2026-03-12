import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import {
  type ChatElement,
  Message,
  type PostableMessage,
  type SerializedMessage,
  type SerializedThread,
  ThreadImpl,
  toAiMessages,
} from "chat";
import { createHook, getWorkflowMetadata } from "workflow";
import type { ThreadState } from "@/lib/bot";
import { bot } from "@/lib/bot";
import type { ChatTurnPayload } from "@/workflows/chat-turn-hook";

const model = openai("gpt-5.2");
const sessionStartedMessage =
  "Durable session started. Reply in this thread and send `done` when you want to stop.";

function mergeHistoryWithMessage(
  history: Message[],
  message: Message,
): Message[] {
  if (history.some((entry) => entry.id === message.id)) {
    return history;
  }

  return [...history, message].sort((left, right) => {
    const leftTime = left.metadata.dateSent?.getTime() ?? 0;
    const rightTime = right.metadata.dateSent?.getTime() ?? 0;
    return leftTime - rightTime;
  });
}

async function postAssistantMessage(
  thread: SerializedThread,
  text: string | PostableMessage | ChatElement,
) {
  "use step";

  await bot.initialize();
  const revivedThread = ThreadImpl.fromJSON<ThreadState>(thread);
  await revivedThread.post(text);
}

async function closeSession(thread: SerializedThread) {
  "use step";

  await bot.initialize();
  const revivedThread = ThreadImpl.fromJSON<ThreadState>(thread);
  await revivedThread.post("Session closed.");
  await revivedThread.unsubscribe();
  await revivedThread.setState({}, { replace: true });
}

async function runTurn(thread: SerializedThread, message: Message) {
  "use step";

  await bot.initialize();
  const revivedThread = ThreadImpl.fromJSON<ThreadState>(thread);
  await revivedThread.refresh();

  const prompt = toAiMessages(
    mergeHistoryWithMessage(revivedThread.recentMessages, message),
    {
      includeNames: true,
    },
  );

  return streamText({
    model,
    system:
      "You are a helpful assistant in a chat thread. Keep replies concise, practical, and grounded in the conversation history.",
    prompt,
  });
}

async function processMessage(thread: SerializedThread, message: Message) {
  const text = message.text.trim();

  if (text.toLowerCase() === "done") {
    await closeSession(thread);
    return false;
  }

  const reply = await runTurn(thread, message);
  await postAssistantMessage(thread, reply.fullStream);
  return true;
}

export async function durableChatSession(payload: string) {
  "use workflow";

  const { workflowRunId } = getWorkflowMetadata();
  const { thread, message } = JSON.parse(payload) as {
    thread: SerializedThread;
    message: SerializedMessage;
  };

  const hook = createHook<ChatTurnPayload>({ token: workflowRunId });

  try {
    await postAssistantMessage(thread, sessionStartedMessage);

    const shouldContinue = await processMessage(
      thread,
      Message.fromJSON(message),
    );
    if (!shouldContinue) {
      return;
    }

    for await (const event of hook) {
      const nextMessage = Message.fromJSON(event.message);

      const keepRunning = await processMessage(thread, nextMessage);
      if (!keepRunning) {
        return;
      }
    }
  } finally {
    hook.dispose();
  }
}
