"use client";

import { Button } from "@/components/button";
import { ArrowUpIcon } from "@/components/icons/arrow_up";
import { MicIcon } from "@/components/icons/microphone";
import { useSpeechRecognitionEngine } from "@/helpers/client/asr";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useCallback, useRef } from "react";
import type { Ref } from "react";

type MessageAreaProps = {
  ref?: Ref<HTMLTextAreaElement>;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
  onTyping?: (draft?: string) => void;
  commit?: (draft?: string) => void;
};

export function MessageArea({
  ref,
  className,
  disabled,
  placeholder,
  onTyping,
  commit,
}: MessageAreaProps) {
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const [asrAvailable, isListening, start, stop, reset] =
    useSpeechRecognitionEngine(
      useCallback((value) => {
        if (!localRef.current) return;
        localRef.current.value = value;
      }, []),
    );
  const assignRef = (node: HTMLTextAreaElement | null) => {
    const proxiedNode =
      node &&
      new Proxy(node, {
        set(target, prop, value) {
          const didSet = Reflect.set(target, prop, value);
          if (prop === "value") reset(String(value ?? ""));
          return didSet;
        },
      });

    localRef.current = node;
    if (!ref) return;
    if (typeof ref === "function") {
      ref(proxiedNode);
      return;
    }
    ref.current = proxiedNode;
  };

  return (
    <label className="textarea flex w-full flex-shrink-0 resize-none flex-row items-end">
      <textarea
        ref={assignRef}
        className={cn("max-h-32 min-h-full flex-1 resize-none", className)}
        placeholder={placeholder}
        onInput={(e) => {
          const textArea = e.target as HTMLTextAreaElement;
          if (onTyping) onTyping(textArea.value);
          reset(textArea.value);
          textArea.style.height = "0px";
          textArea.style.height = `calc(${textArea.scrollHeight}px + .2rem)`;
        }}
        onKeyDown={(e) => {
          if (!disabled && e.key === "Enter" && e.shiftKey === false) {
            e.preventDefault();
            const textArea = e.target as HTMLTextAreaElement;
            if (commit) commit(textArea.value);
          }
        }}
      />
      <Button
        disabled={disabled || !asrAvailable}
        buttonType="neutral"
        className="p-2"
        onClick={() => {
          if (!asrAvailable) return;
          if (isListening) {
            stop();
            return;
          }
          start(localRef.current?.value ?? "");
        }}
      >
        <MicIcon className="w-3 md:w-auto" />
      </Button>
      <div className="w-1"></div>
      <Button
        disabled={disabled}
        buttonType="neutral"
        className="p-2"
        onClick={() => {
          const textArea = localRef.current;
          if (!textArea) return;
          if (commit) commit(textArea.value);
        }}
      >
        <ArrowUpIcon className="w-3 md:w-auto" />
      </Button>
    </label>
  );
}
