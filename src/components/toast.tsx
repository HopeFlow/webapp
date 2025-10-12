"use client";

import React, {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useId,
  useState,
  type PropsWithChildren,
} from "react";
import { CloseButton, Button } from "./button";
import { BellIcon } from "./icons/bell";
import { QuestionMarkCircleIcon } from "./icons/quest_mark_circle";
import { CheckIcon } from "./icons/check";
import { ExclamationCircleIcon } from "./icons/exclamation_circle";
import { ExclamationTriangleIcon } from "./icons/exclamation_triangle";
import { cn } from "@/helpers/client/tailwind_helpers";

export type ToastType =
  | "notification"
  | "info"
  | "success"
  | "warning"
  | "error";

export type ToastAction = { title: string; callback: () => void };

export type ToastProps = {
  type: ToastType;
  title: string;
  description: string;
  prefix?: string;
  postfix?: string;
  action?: ToastAction;
};
export type AddToast = (props: ToastProps, timeout?: number | null) => void;

const ToastContext = createContext<AddToast>(() => {});

export const useToast = () => useContext(ToastContext);

const icons: Map<ToastType, React.ReactNode> = new Map([
  ["notification", <BellIcon key="bell" />],
  ["info", <QuestionMarkCircleIcon key="circle-help" />],
  ["success", <CheckIcon key="check" />],
  ["warning", <ExclamationTriangleIcon key="triangle-alert" />],
  ["error", <ExclamationCircleIcon key="circle-alert" />],
]);

function Toast(props: ToastProps & { closeCallback: () => void }) {
  const { type, title, description, prefix, postfix, action, closeCallback } =
    props;
  const makeBrief = (originalDescription: string) => {
    if (originalDescription.length > 100) {
      return originalDescription.substring(0, 99).trimEnd() + "…";
    }
    return originalDescription;
  };
  return (
    <div
      className={cn(
        "flex flex-row gap-3 w-[342px] min-h-24 rounded-lg box-border p-3 bg-info text-info-content",
        type === "success" && "bg-success text-success-content",
        type === "warning" && "bg-warning text-warning-content",
        type === "error" && "bg-error text-error-content",
      )}
    >
      {icons.get(type)}
      <div className="font-body flex-1 flex flex-col">
        <h1 className="font-bold">{title}</h1>
        <p className="font-regular text-helper leading-helper">
          {(
            (prefix ? `${prefix}\n` : "") +
            makeBrief(description) +
            (postfix ? `\n${postfix}` : "")
          )
            .split(/[\r\n]+/)
            .map((l, i, ls) => (
              <Fragment key={`l-${i}`}>
                {l}
                {i < ls.length - 1 && <br />}
              </Fragment>
            ))}
        </p>
        {action && (
          <Button buttonStyle="ghost" onClick={action.callback}>
            {action.title}
          </Button>
        )}
      </div>
      <CloseButton onClick={() => closeCallback()} />
    </div>
  );
}

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);
  const id = useId();
  const removeToast = (props: ToastProps) =>
    setToasts((prevToasts) => prevToasts.filter((t) => t !== props));
  const addToast = useCallback((props: ToastProps, timeout?: number | null) => {
    setToasts((prevToasts) => [...prevToasts, props]);
    if (timeout !== null) setTimeout(() => removeToast(props), timeout || 2000);
  }, []);
  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="flex flex-col gap-2  w-full items-end fixed z-40 right-4 top-4">
        {toasts.map((n, i) => {
          return (
            <Toast
              key={`${id}-${i}`}
              closeCallback={() => removeToast(n)}
              {...n}
            />
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
