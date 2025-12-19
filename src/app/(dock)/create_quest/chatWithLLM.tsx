"use client";

import { Button, GhostButton } from "@/components/button";
import { ArrowPathIcon } from "@/components/icons/arrow_path";
import MarkdownViewer from "@/components/markdown/view";
import { isOptionsMessage, useCreateQuestChat } from "@/helpers/client/LLM";
import { cn } from "@/helpers/client/tailwind_helpers";
import type { QuestIntentState } from "@/helpers/server/LLM";
import { MessageArea } from "../../../components/message_area";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";

export const ChatWithLLM = ({
  setUserChatMessageCount,
  setQuestIntentState,
  continueToNextStep,
}: {
  setUserChatMessageCount: Dispatch<SetStateAction<number>>;
  setQuestIntentState: Dispatch<SetStateAction<QuestIntentState | null>>;
  continueToNextStep: () => void;
}) => {
  const discussionRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const {
    thinking,
    thinkingMessage,
    messages,
    questIntentState,
    confidence,
    error,
    postUserMessage,
  } = useCreateQuestChat();
  useLayoutEffect(() => {
    const el = discussionRef.current;
    if (!el) return;

    const scrollToBottom = () => {
      const el = discussionRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };
    scrollToBottom();
    const observer = new MutationObserver(() => {
      requestAnimationFrame(scrollToBottom);
    });
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  const commit = useCallback(
    (directValue?: string) => {
      const value = directValue ?? textAreaRef.current?.value;
      if (!value || value.trim() === "") {
        return;
      }
      postUserMessage(value);
      if (textAreaRef.current) {
        textAreaRef.current.value = "";
        textAreaRef.current.style.height = "";
        textAreaRef.current.focus();
      }
    },
    [postUserMessage],
  );
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
          messages.length < 1 && "justify-center",
        )}
      >
        <div
          className={cn(
            "grow-0 overflow-y-auto transition-all",
            messages.length >= 1 && "grow-1",
          )}
          ref={discussionRef}
        >
          <div className="flex flex-col gap-4">
            {messages
              .filter((m) => ["user", "assistant", "options"].includes(m.role))
              .map((message, i) =>
                isOptionsMessage(message) ? (
                  message.confirmation ? (
                    <div
                      key={`o-c-${i}`}
                      className="flex w-full flex-row items-center justify-center gap-4"
                    >
                      {message.options.map((m, j) => (
                        <Button
                          key={`o-${i}-${j}`}
                          buttonType={
                            m.toLowerCase() === "accept"
                              ? "success"
                              : m.toLowerCase() === "reject"
                                ? "error"
                                : "neutral"
                          }
                          buttonStyle="outline"
                          className={cn(
                            "box-border",
                            ["Accept", "Reject"].includes(m)
                              ? "w-1/4"
                              : "w-fit justify-start border-gray-400 bg-transparent p-2 text-gray-500",
                          )}
                          onClick={() => {
                            if (m.toLowerCase() === "accept") {
                              setQuestIntentState(questIntentState);
                              setUserChatMessageCount(
                                messages.filter((m) => m.role === "user")
                                  .length,
                              );
                              Promise.resolve().then(() =>
                                continueToNextStep(),
                              );
                            } else if (m.toLowerCase() === "reject") {
                              postUserMessage(
                                "Recap is not accurate. Please revise.",
                              );
                              if (textAreaRef.current)
                                textAreaRef.current.focus();
                            } else commit(`Ambiguous confirmation: ${m}`);
                          }}
                        >
                          {m}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    message.options.map((m, j) => (
                      <Button
                        key={`o-${i}-${j}`}
                        buttonType="neutral"
                        buttonStyle="outline"
                        className="box-border w-fit justify-start border-gray-400 bg-transparent p-2 text-gray-500"
                        onClick={() => commit(m)}
                      >
                        {m}
                      </Button>
                    ))
                  )
                ) : (
                  <MarkdownViewer
                    key={`m-${i}`}
                    content={message.content as string}
                    className={cn(
                      message.role === "user"
                        ? "rounded-box bg-base-300 p-4"
                        : "",
                    )}
                  />
                ),
              )}
            {error && (
              <div className="text-error flex w-full flex-row gap-4">
                <div className="flex-1">Error: {error}</div>
                <GhostButton onClick={() => postUserMessage()}>
                  <ArrowPathIcon />
                </GhostButton>
              </div>
            )}
          </div>
          {thinking && (
            <div className="flex items-center justify-center p-4">
              <span className="loading loading-bars loading-xl"></span>
              <span className="inline-block w-3"></span>
              {thinkingMessage}
            </div>
          )}
        </div>
        {messages.length < 1 && (
          <h1 className="w-full text-center text-xl font-normal md:text-3xl">
            Describe what you are looking for ...
          </h1>
        )}
        <MessageArea
          ref={textAreaRef}
          className={messages.length < 1 ? "max-h-56 min-h-32" : undefined}
          disabled={thinking}
          commit={commit}
        />
        {messages.length >= 1 && (
          <Button
            disabled={
              !["GOOD", "CONFIDENT", "SURE"].includes(confidence) &&
              messages.filter((m) => m.role === "user").length < 3
            }
            buttonType="primary"
            onClick={() => {
              setQuestIntentState(questIntentState);
              setUserChatMessageCount(
                messages.filter((m) => m.role === "user").length,
              );
              Promise.resolve().then(() => continueToNextStep());
            }}
          >
            Continue ({confidence.toLowerCase()} clarity)
          </Button>
        )}
      </div>
    </div>
  );
};
