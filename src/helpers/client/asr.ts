import { useEffect, useState } from "react";

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onerror?: (
    this: SpeechRecognition,
    ev: SpeechRecognitionErrorEvent,
  ) => unknown;
  onresult?: (this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown;
  onend?: (this: SpeechRecognition, ev: Event) => unknown;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    SpeechRecognition: SpeechRecognitionConstructor;
  }
}

declare global {
  interface Window {
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    SpeechRecognition: SpeechRecognitionConstructor;
  }
}

export const getSpeechRecognitionEngine = () => {
  if (typeof window === "undefined") return;
  if (!("webkitSpeechRecognition" in window)) return;
  const asr = new window.webkitSpeechRecognition();
  asr.continuous = true;
  asr.interimResults = true;
  return asr;
};

export const useSpeechRecognitionEngine = (
  onChange: (value: string) => void,
) => {
  const [asrAvailable, setAsrAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [start, setStart] = useState<(baseValue: string) => void>(() => () => {
    console.warn("SpeechRecognition::start: Object is not created yet");
  });
  const [stop, setStop] = useState(() => () => {
    console.warn("SpeechRecognition::stop: Object is not created yet");
  });
  const [reset, setReset] = useState<(baseValue: string) => void>(() => () => {
    console.warn("SpeechRecognition::reset: Object is not created yet");
  });
  useEffect(() => {
    const asr = getSpeechRecognitionEngine();
    let baseValue = "";
    let processedItemCount = 0;
    let totalItemCount = 0;
    if (!asr) return;
    asr.onresult = (e) => {
      let finalTranscript = "";
      let interimTranscript = "";
      totalItemCount = e.results.length;
      for (let i = processedItemCount; i < e.results.length; i++) {
        const result = e.results[i];
        const alternative = result[0];
        if (result.isFinal) {
          finalTranscript +=
            (finalTranscript !== "" && !finalTranscript.endsWith(" ")
              ? " "
              : "") + alternative.transcript.trim();
          interimTranscript = "";
          processedItemCount = i + 1;
        } else {
          interimTranscript +=
            (interimTranscript !== "" && !interimTranscript.endsWith(" ")
              ? " "
              : "") + alternative.transcript.trim();
        }
      }
      if (finalTranscript !== "") {
        if (finalTranscript.toLowerCase() === "stop") asr.stop();
        else {
          if (finalTranscript === "comma") finalTranscript = ",";
          else if (finalTranscript === "period") finalTranscript = ".";
          baseValue +=
            (baseValue !== "" && !baseValue.endsWith(" ") ? " " : "") +
            finalTranscript;
          finalTranscript = "";
        }
      }
      onChange(
        baseValue +
          (baseValue !== "" && !baseValue.endsWith(" ") ? " " : "") +
          interimTranscript,
      );
    };
    asr.onend = () => {
      setIsListening(false);
    };
    Promise.resolve().then(() => {
      setAsrAvailable(true);
      setStart(() => (startValue: string) => {
        setIsListening(true);
        baseValue = startValue;
        asr.start();
      });
      setStop(() => () => asr.stop());
      setReset(() => (startValue: string) => {
        baseValue = startValue;
        processedItemCount = totalItemCount;
      });
    });
  }, [onChange]);
  return [asrAvailable, isListening, start, stop, reset] as const;
};
