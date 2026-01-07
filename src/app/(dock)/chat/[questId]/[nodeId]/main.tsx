"use client";

import { Button } from "@/components/button";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { Avatar } from "@/components/user_avatar";
import { useChatRoom } from "@/helpers/client/realtime";
import { useGotoQuest } from "@/helpers/client/routes";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useToast } from "@/components/toast";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageArea } from "@/components/message_area";

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

import { ChatMessage } from "@/helpers/client/realtime";

export function ChatMain({
  questId,
  nodeId,
  initialData,
}: {
  questId: string;
  nodeId: string;
  initialData: {
    currentUserId: string;
    currentUserImageUrl?: string | null;
    targetUserImageUrl?: string | null;
    targetUserName?: string;
    questTitle?: string;
    messages: ChatMessage[];
  };
}) {
  const {
    messages,
    sendMessage,
    sendTyping,
    currentUserId,
    currentUserImageUrl,
    targetUserImageUrl,
    targetUserName,
    questTitle,
    isTargetTyping,
  } = useChatRoom(questId, nodeId, initialData);
  const gotoQuest = useGotoQuest();
  const addToast = useToast();
  const [sending, setSending] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef<number>(0);

  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) =>
          new Date(a.timestamp).valueOf() - new Date(b.timestamp).valueOf(),
      ),
    [messages],
  );

  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [sortedMessages]);

  const handleSend = useCallback(
    async (draft: string) => {
      const content = draft.trim();
      if (!content || sending) return;
      setSending(true);
      try {
        const result = await sendMessage(content);
        if (result && textAreaRef.current) textAreaRef.current.value = "";
      } catch (error) {
        console.error("Failed to send chat message", error);
        addToast({
          type: "error",
          title: "Message not sent",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      } finally {
        setSending(false);
      }
    },
    [addToast, sendMessage, sending],
  );

  const handleTyping = useCallback(
    (draft?: string) => {
      if (!draft || draft.trim().length === 0) return;
      const now = Date.now();
      if (now - lastTypingSentRef.current < 1200) return;
      lastTypingSentRef.current = now;
      void sendTyping();
    },
    [sendTyping],
  );

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-base-content/60 hidden text-xs tracking-[0.18em] uppercase md:block">
            Quest chat
          </p>
          <h1 className="text-lg font-normal md:text-2xl">
            {questTitle ?? "Quest chat"}
          </h1>
        </div>
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          <Button
            buttonType="neutral"
            buttonStyle="outline"
            onClick={() => gotoQuest({ questId })}
          >
            View quest <ArrowRightIcon />
          </Button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 overflow-hidden">
        <div
          ref={chatScrollRef}
          className="card border-base-content/20 bg-base-100 flex-1 space-y-4 overflow-y-auto border p-4"
        >
          {sortedMessages.length === 0 ? (
            <div className="text-base-content/60 py-10 text-center text-sm">
              No messages yet. Say hi to get the conversation started.
            </div>
          ) : (
            sortedMessages.map((message) => {
              const isMine = message.userId === currentUserId;
              const name = isMine ? "You" : (targetUserName ?? "Contributor");
              return (
                <div
                  key={message.id}
                  className={cn("chat", isMine ? "chat-end" : "chat-start")}
                >
                  <div className="chat-image">
                    <Avatar
                      name={name}
                      imageUrl={
                        isMine
                          ? (currentUserImageUrl ?? undefined)
                          : (targetUserImageUrl ?? undefined)
                      }
                      className="h-10 w-10"
                    />
                  </div>
                  <div className="chat-header flex items-center gap-2">
                    <span className="font-semibold">{name}</span>
                    <time className="text-xs opacity-50">
                      {formatTimestamp(message.timestamp)}
                    </time>
                  </div>
                  <div
                    className={cn(
                      "chat-bubble max-w-xl text-base break-words whitespace-pre-wrap",
                      isMine ? "chat-bubble-primary" : "chat-bubble-secondary",
                    )}
                  >
                    {message.content}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="text-base-content/60 min-h-[1.25rem] px-1 text-xs font-bold">
          {isTargetTyping
            ? `${targetUserName ?? "Contributor"} is typing…`
            : null}
        </div>
        <div className="p-1">
          <MessageArea
            ref={textAreaRef}
            placeholder="Type a message. Press Enter to send, Shift+Enter for a new line."
            commit={(value) => {
              if (value) handleSend(value);
            }}
            onTyping={handleTyping}
          />
        </div>
      </div>
    </div>
  );
}
