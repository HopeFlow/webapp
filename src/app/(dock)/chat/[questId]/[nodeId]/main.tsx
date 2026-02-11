"use client";

import { Button } from "@/components/button";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { Avatar } from "@/components/user_avatar";
import { useChatRoom } from "@/helpers/client/realtime";
import { useGotoQuest } from "@/helpers/client/routes";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useToast } from "@/components/toast";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
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
    hasMore?: boolean;
    nextCursor?: string | null;
  };
}) {
  const {
    messages,
    sendMessage,
    sendTyping,
    loadOlderMessages,
    currentUserId,
    currentUserImageUrl,
    targetUserImageUrl,
    targetUserName,
    questTitle,
    isTargetTyping,
    hasMoreMessages,
    isLoadingMore,
  } = useChatRoom(questId, nodeId, initialData);
  const gotoQuest = useGotoQuest();
  const addToast = useToast();

  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const lastTypingSentRef = useRef<number>(0);
  const isAtBottomRef = useRef<boolean>(true);
  const isLoadingRef = useRef<boolean>(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLoadAtRef = useRef<number>(0);
  const anchorMessageRef = useRef<{
    chatMessage: HTMLDivElement;
    offsetTop: number;
  } | null>(null);

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
    if (!el) return;
    if (isAtBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [sortedMessages]);

  const updateIsAtBottom = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const threshold = 80;
    isAtBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }, []);

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const handleScroll = () => updateIsAtBottom();
    el.addEventListener("scroll", handleScroll);
    updateIsAtBottom();
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [updateIsAtBottom]);

  const observeLoadingSentinel = useCallback(() => {
    if (!observerRef.current || !topSentinelRef.current) {
      console.warn(
        "observeLoadingSentinel is called before components mounted",
      );
      return;
    }
    observerRef.current.observe(topSentinelRef.current);
  }, []);

  const handleLoadOlder = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreMessages) return;
    const now = Date.now();
    if (now - lastLoadAtRef.current < 300) return;
    lastLoadAtRef.current = now;
    isLoadingRef.current = true;
    if (chatScrollRef.current) {
      for (const item of chatScrollRef.current.querySelectorAll("div.chat")) {
        const chatMessage = item as HTMLDivElement;
        if (
          chatMessage.offsetTop + chatMessage.offsetHeight >
          chatScrollRef.current.scrollTop
        ) {
          anchorMessageRef.current = {
            chatMessage,
            offsetTop: chatScrollRef.current.scrollTop - chatMessage.offsetTop,
          };
        }
        break;
      }
    }
    await loadOlderMessages();
    isLoadingRef.current = false;
  }, [hasMoreMessages, loadOlderMessages]);

  useLayoutEffect(() => {
    if (!isLoadingRef.current) return;
    isLoadingRef.current = false;
    if (!anchorMessageRef.current) return;
    const anchorMessage = anchorMessageRef.current;
    const tryRestoringAnchorMessagePosition = async () => {
      if (!chatScrollRef.current) {
        // This is placed just in case something strange happens
        console.warn(
          "tryRestoringAnchorMessagePosition called without a chatScroll reference",
        );
        setTimeout(tryRestoringAnchorMessagePosition, 500);
        return;
      }
      chatScrollRef.current.scrollTop =
        anchorMessage.offsetTop + anchorMessage.chatMessage.offsetTop;
    };
    tryRestoringAnchorMessagePosition();
  }, [messages]);

  useEffect(() => {
    const root = chatScrollRef.current;
    const sentinel = topSentinelRef.current;
    if (!root || !sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          if (isLoadingRef.current) return;
          observer.disconnect();
          handleLoadOlder().finally(() => observeLoadingSentinel());
        }
      },
      { root, rootMargin: "80px", threshold: 0 },
    );
    observerRef.current = observer;
    observeLoadingSentinel();
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [handleLoadOlder, observeLoadingSentinel]);

  const handleSend = useCallback(
    async (draft: string) => {
      const content = draft.trim();
      if (!content) return;

      if (textAreaRef.current) textAreaRef.current.value = "";

      try {
        await sendMessage(content);
      } catch (error) {
        console.error("Failed to send chat message", error);
        if (textAreaRef.current) textAreaRef.current.value = content;
        addToast({
          type: "error",
          title: "Message not sent",
          description:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      }
    },
    [addToast, sendMessage],
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
          <div ref={topSentinelRef} />
          {isLoadingMore ? (
            <div className="text-base-content/60 text-center text-xs">
              Loading earlier messages…
            </div>
          ) : null}
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
                  data-message-id={message.id}
                  className={cn(
                    "chat",
                    isMine ? "chat-end" : "chat-start",
                    message.isOptimistic && "opacity-70",
                  )}
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
