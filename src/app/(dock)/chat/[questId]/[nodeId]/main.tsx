"use client";

import { Button, GhostButton } from "@/components/button";
import { BulbIcon } from "@/components/icons/bulb";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { ArrowUpTrayIcon } from "@/components/icons/arrow_up_tray";
import { MicIcon } from "@/components/icons/microphone";
import { ReflowIcon } from "@/components/icons/reflow";
import { Avatar } from "@/components/user_avatar";
import { useChatRoom } from "@/helpers/client/realtime";
import { useGotoQuest } from "@/helpers/client/routes";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useToast } from "@/components/toast";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.valueOf())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export function ChatMain({
  questId,
  nodeId,
}: {
  questId: string;
  nodeId: string;
}) {
  const {
    messages,
    sendMessage,
    currentUserId,
    currentUserImageUrl,
    targetUserImageUrl,
    targetUserName,
  } = useChatRoom(questId, nodeId);
  const gotoQuest = useGotoQuest();
  const addToast = useToast();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const result = await sendMessage(content);
      if (result) setDraft("");
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
  }, [addToast, draft, sendMessage, sending]);

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const handleActionNotAvailable = (label: string) =>
    addToast({
      type: "info",
      title: "Coming soon",
      description: `${label} will be available shortly.`,
    });

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-base-content/60 text-xs tracking-[0.18em] uppercase">
            Quest chat
          </p>
          <h1 className="text-2xl font-normal">
            Jacob&apos;s stolen sentimental bicycle
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
                        isMine ? currentUserImageUrl : targetUserImageUrl
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
        <div className="card border-base-content/20 bg-base-100 border p-3">
          <textarea
            className="textarea textarea-bordered mb-2 w-full"
            rows={3}
            placeholder="Type a message. Press Enter to send, Shift+Enter for a new line."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
          />
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <GhostButton
                className="btn-sm px-3"
                onClick={() => handleActionNotAvailable("Attach a file")}
              >
                <ArrowUpTrayIcon size={18} /> Attach
              </GhostButton>
              <GhostButton
                className="btn-sm px-3"
                onClick={() => handleActionNotAvailable("Voice notes")}
              >
                <MicIcon size={18} /> Voice note
              </GhostButton>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                buttonType="secondary"
                buttonStyle="outline"
                onClick={() => gotoQuest({ questId })}
              >
                View quest
              </Button>
              <Button
                buttonType="primary"
                buttonSize="md"
                withSpinner={sending}
                disabled={sending || draft.trim().length === 0}
                onClick={() => void handleSend()}
              >
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
