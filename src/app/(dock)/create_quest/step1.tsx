"use client";

import { Button } from "@/components/button";
import { ArrowUpIcon } from "@/components/icons/arrow_up";
import { MicIcon } from "@/components/icons/microphone";
import MarkdownViewer from "@/components/markdown/view";
import { useSpeechRecognitionEngine } from "@/helpers/client/asr";
import { timeout } from "@/helpers/client/common";
import { useCreateQuestChat } from "@/helpers/client/LLM";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  getQuestTitleAndDescription,
} from "@/helpers/server/LLM";
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export const Step1 = ({
  setTitle,
  setDescription,
  continueToNextStep,
}: {
  setTitle: Dispatch<SetStateAction<string>>;
  setDescription: Dispatch<SetStateAction<string>>;
  continueToNextStep: () => void;
}) => {
  const discussionRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [waiting, setWaiting] = useState(false);
  const [asrAvailable, isListening, start, stop, reset] =
    useSpeechRecognitionEngine((value) => {
      if (!textAreaRef.current) return;
      textAreaRef.current.value = value;
    });
  const [messages, thinking, thinkingMessage, clarity, postUserMessage] =
    useCreateQuestChat();
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
  const commit = useCallback(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;
    const value = textArea.value;
    if (!value || value.trim() === "") {
      return;
    }
    postUserMessage(value);
    textArea.value = "";
    textArea.style.height = "";
  }, [postUserMessage]);
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
          messages.length < 1 && "justify-center",
        )}
      >
        <div
          className={cn(
            "transition-all grow-0 overflow-y-auto",
            messages.length >= 1 && "grow-1",
          )}
          ref={discussionRef}
        >
          <div className="flex flex-col gap-4">
            {messages
              .filter((m) => ["user", "assistant"].includes(m.role))
              .map((message, i) => (
                <MarkdownViewer
                  key={`m-${i}`}
                  content={message.content as string}
                  className={cn(
                    message.role === "user"
                      ? "rounded-box p-4 bg-base-300"
                      : "",
                  )}
                />
              ))}
          </div>
          {thinking && (
            <div className="p-4 flex items-center justify-center">
              <span className="loading loading-bars loading-xl"></span>{" "}
              {thinkingMessage}
            </div>
          )}
        </div>
        {messages.length < 1 && (
          <h1 className="w-full text-center font-normal text-xl md:text-3xl">
            Describe what you are looking for ...
          </h1>
        )}
        <label className="textarea w-full resize-none flex-shrink-0 flex flex-row items-end">
          <textarea
            ref={textAreaRef}
            className={cn(
              "resize-none flex-1 min-h-full",
              messages.length < 1 ? "min-h-32 max-h-56" : "max-h-32",
            )}
            onInput={(e) => {
              const textArea = e.target as HTMLTextAreaElement;
              reset(textArea.value);
              textArea.style.height = "0px";
              textArea.style.height = `calc(${textArea.scrollHeight}px + .2rem)`;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.shiftKey === false) {
                e.preventDefault();
                commit();
              }
            }}
          />
          <Button
            disabled={!asrAvailable}
            buttonType="neutral"
            className="p-2"
            onClick={() => {
              if (!asrAvailable) return;
              if (isListening) {
                stop();
                return;
              }
              start(textAreaRef.current?.value ?? "");
            }}
          >
            <MicIcon />
          </Button>
          <div className="w-1"></div>
          <Button
            buttonType="neutral"
            className="p-2"
            onClick={() => {
              commit();
            }}
          >
            <ArrowUpIcon />
          </Button>
        </label>
        {messages.length >= 1 && (
          <Button
            disabled={clarity < 0 || waiting}
            buttonType="primary"
            onClick={async () => {
              setWaiting(true);
              try {
                const { description, title } =
                  (await getQuestTitleAndDescription(messages)) ?? {};
                if (title && description) {
                  if (title) setTitle(title);
                  if (description) setDescription(description);
                  await timeout(500);
                  continueToNextStep();
                }
              } finally {
                setWaiting(false);
              }
            }}
          >
            Continue (with{" "}
            {clarity > 95
              ? "high"
              : clarity > 75
              ? "acceptable"
              : clarity > 50
              ? "borderline"
              : "low"}{" "}
            clarity)
          </Button>
        )}
      </div>
    </div>
  );
};
