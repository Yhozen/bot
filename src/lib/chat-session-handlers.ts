import type { Message, Thread } from "chat";
import { resumeHook, start } from "workflow/api";
import { bot, type ThreadState } from "@/lib/bot";
import type { ChatTurnPayload } from "@/workflows/chat-turn-hook";
import { durableChatSession } from "@/workflows/durable-chat-session";

async function startSession(thread: Thread<ThreadState>, message: Message) {
  const run = await start(durableChatSession, [
    JSON.stringify({
      // @ts-expect-error - thread is not typed
      thread: thread.toJSON(),
      message: message.toJSON(),
    }),
  ]);

  await thread.setState({ runId: run.runId });
}

async function routeTurn(thread: Thread<ThreadState>, message: Message) {
  await thread.startTyping();
  const state = await thread.state;

  if (!state?.runId) {
    await startSession(thread, message);
    return;
  }

  try {
    await resumeHook<ChatTurnPayload>(state.runId, {
      message: message.toJSON(),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "HookNotFoundError" ||
        error.name === "WorkflowRunNotFoundError")
    ) {
      await thread.setState({}, { replace: true });
      await startSession(thread, message);
      return;
    }

    throw error;
  }
}

bot.onNewMention(async (thread, message) => {
  await thread.subscribe();
  await routeTurn(thread, message);
});

bot.onSubscribedMessage(async (thread, message) => {
  await routeTurn(thread, message);
});
