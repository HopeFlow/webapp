"use client";

import { useCallback, useRef } from "react";
import { Button, CloseButton } from "./button";
import { cn } from "@/helpers/client/tailwind_helpers";

export type ModalButtonProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: (close: () => void) => void;
  disabled?: boolean;
};

export const showModal = (idOrRef: string | HTMLDialogElement | null) => {
  const modal =
    typeof idOrRef === "string"
      ? (document.getElementById(idOrRef) as HTMLDialogElement | null)
      : idOrRef;
  if (!modal) {
    // TODO: handle the error (if idOrRef is string)
    return;
  }
  modal.showModal();
};

type ModalProps = {
  id?: string;
  header?: React.ReactNode;
  children?: React.ReactNode;
  defaultButton: ModalButtonProps;
  cancelButton: ModalButtonProps;
  restButtons?: ModalButtonProps[];
  containerClassName?: string;
  onClose?: () => void;
  onCloseAttempt?: (close: () => void) => void;
  ref?: React.Ref<HTMLDialogElement | null>;
};

export const Modal = ({
  id,
  header,
  children,
  defaultButton,
  cancelButton,
  restButtons,
  containerClassName,
  onClose,
  onCloseAttempt,
  ref,
}: ModalProps) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const close = useCallback(() => dialogRef.current?.close(), []);
  const handleCloseAttempt = useCallback(() => {
    if (onCloseAttempt) {
      onCloseAttempt(close);
    } else {
      close();
    }
  }, [close, onCloseAttempt]);

  return (
    <dialog
      ref={(dialog) => {
        dialogRef.current = dialog;
        if (typeof ref === "function") {
          ref(dialog);
        } else if (ref) {
          ref.current = dialog;
        }
      }}
      id={id}
      onClose={onClose}
      onCancel={(e) => {
        if (onCloseAttempt) {
          e.preventDefault();
          onCloseAttempt(close);
        }
      }}
      className="modal top-0 left-0 h-full w-full"
    >
      <div
        className={cn(
          "modal-box w-[calc(100%-2rem)]",
          "h-[calc(100%-2rem)] md:w-auto",
          "max-w-4xl md:h-auto",
          "flex flex-col gap-2 md:gap-4",
        )}
      >
        <div className="flex flex-row items-center justify-end gap-2">
          {header}
          <CloseButton onClick={handleCloseAttempt} />
        </div>
        <div className={cn(containerClassName, "flex-1")}>{children}</div>
        <div className="flex flex-row justify-end gap-2">
          <Button
            buttonType="primary"
            className={defaultButton.className}
            disabled={defaultButton.disabled}
            onClick={() =>
              defaultButton.onClick && defaultButton.onClick(close)
            }
          >
            {defaultButton.children}
          </Button>
          <Button
            buttonType="neutral"
            className={cancelButton.className}
            onClick={() => {
              if (cancelButton.onClick) {
                cancelButton.onClick(close);
              } else {
                handleCloseAttempt();
              }
            }}
          >
            {cancelButton.children}
          </Button>
          {restButtons &&
            restButtons.map(({ children, className, onClick }, index) => (
              <Button
                key={`modal-button-${index}`}
                buttonType="neutral"
                className={className}
                onClick={() => onClick && onClick(close)}
              >
                {children}
              </Button>
            ))}
        </div>
      </div>
      <form
        method="dialog"
        className="modal-backdrop"
        onSubmit={(e) => {
          if (onCloseAttempt) {
            e.preventDefault();
            onCloseAttempt(close);
          }
        }}
      >
        <button>close</button>
      </form>
    </dialog>
  );
};
