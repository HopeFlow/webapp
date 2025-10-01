"use client";

import { Button } from "@/components/button";
import { ArrowUpIcon } from "@/components/icons/arrow_up";
import { MicIcon } from "@/components/icons/microphone";
import MarkdownViewer from "@/components/markdown/view";
import { ModernForm } from "@/components/modern_form";
import { useSpeechRecognitionEngine } from "@/helpers/client/asr";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  CfOpenAIChatCreateParamsStreaming,
  getLLMResponse,
} from "@/helpers/server/LLM";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const Step1 = () => {
  const discussionRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [thinking, setThinking] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clarity, setClarity] = useState(0);
  const [messages, setMessages] = useState<
    CfOpenAIChatCreateParamsStreaming["messages"]
  >([
    {
      role: "system",
      content:
        "You are a counselor that helps people clearly express what they are looking for so that they can efficiently invoke the power of their social connections to find it. The use is going to describe what he/she is looking for. Generate output in this JSON schema. { question?: string; title?: string; description?: string; clarity: number } where clarity score is between 0 and 100. If the clarity is less than 75, propose questions that helps calrify the situation. If the clarity is above 50%, generate a title and description based on what you get from user. Questions, title and description content can be markdown string. Again STRICTLY USE GIVEN TYPE for generating JSON and ONLY GENERATE JSON BARE AND WITHOUT ANY EXTRA MARKUP.",
    },
  ]);
  const [waitingForLLM, setWaitingForLLM] = useState(false);
  const [asrAvailable, isListening, start, stop, reset] =
    useSpeechRecognitionEngine((value) => {
      if (!textAreaRef.current) return;
      textAreaRef.current.value = value;
    });
  useEffect(() => {
    if (!waitingForLLM) return;
    setWaitingForLLM(false);
    setThinking(true);
    (async () => {
      const currentMessages = messages;
      const response = await getLLMResponse({
        model: "workers-ai/@cf/openai/gpt-oss-20b",
        messages: currentMessages,
      });
      console.log(response);
      const responseObject: {
        question?: string;
        title?: string;
        description?: string;
        clarity: number;
      } = (() => {
        try {
          return JSON.parse(
            response.choices[0]?.message?.content ?? "{ clairty: 0 }",
          );
        } catch (e) {
          return { clarity: 0 };
        }
      })();
      setThinking(false);
      if (responseObject.question) {
        setMessages([
          ...currentMessages,
          {
            content: responseObject.question,
            role: "assistant",
          },
        ]);
      }
      if (responseObject.title) {
        setTitle(responseObject.title);
      }
      if (responseObject.description) {
        setDescription(responseObject.description);
      }
      setClarity(responseObject.clarity);
    })();
  });
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
      setWaitingForLLM(true);
      return;
    }
    setMessages((m) => [
      ...m,
      {
        content: value,
        role: "user",
      },
    ]);
    setWaitingForLLM(true);
    textArea.value = "";
    textArea.style.height = "";
  }, []);
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
          messages.length < 2 && "justify-center",
        )}
      >
        <div
          className={cn(
            "transition-all grow-0 overflow-y-auto",
            messages.length >= 2 && "grow-1",
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
              <span className="loading loading-bars loading-xl"></span>
            </div>
          )}
        </div>
        {messages.length < 2 && (
          <h1 className="w-full text-center font-normal text-xl md:text-3xl">
            Describe what you are looking for ...
          </h1>
        )}
        <label className="textarea w-full resize-none flex-shrink-0 flex flex-row items-end">
          <textarea
            ref={textAreaRef}
            className={cn(
              "resize-none flex-1 min-h-full",
              messages.length < 2 ? "min-h-32 max-h-56" : "max-h-32",
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
        {messages.length >= 2 && (
          <Button disabled={clarity < 50} buttonType="primary">
            Continue {`(with ${clarity}% clarity )`}
          </Button>
        )}
      </div>
    </div>
  );
};

export default function Create() {
  const [itemIndex, setItemIndex] = useState(0);
  useEffect(() => {
    setInterval(() => setItemIndex((i) => (i + 1) % 2), 5000);
  }, []);
  return (
    <ModernForm itemIndex={itemIndex}>
      <Step1 />
      <Step1 />
    </ModernForm>
  );
}
