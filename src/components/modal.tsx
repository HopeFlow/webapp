"use client";

import { useCallback } from "react";
import { Button, CloseButton } from "./button";
import { cn } from "@/helpers/client/tailwind_helpers";

export type ModalButtonProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: (close: () => void) => void;
};

export const showModal = (id: string) => {
  const modal = document.getElementById(id) as HTMLDialogElement | null;
  if (!modal) {
    // TODO: handle the error
    return;
  }
  modal.showModal();
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
}: {
  id: string;
  header?: React.ReactNode;
  children?: React.ReactNode;
  defaultButton: ModalButtonProps;
  cancelButton: ModalButtonProps;
  restButtons?: ModalButtonProps[];
  containerClassName?: string;
  onClose?: () => void;
}) => {
  const close = useCallback(
    () => (document.getElementById(id) as HTMLDialogElement).close(),
    [],
  );
  return (
    <dialog id={id} onClose={onClose} className="modal">
      <div className="modal-box w-[calc(100%-2rem)] md:w-auto h-[calc(100%-2rem)] max-w-4xl md:h-auto flex flex-col gap-2 md:gap-4">
        <div className="flex flex-row gap-2 items-center justify-end">
          {header}
          <CloseButton onClick={close} />
        </div>
        <div className={cn(containerClassName, "flex-1")}>{children}</div>
        <div className="flex flex-row justify-end gap-2">
          <Button
            buttonType="primary"
            className={defaultButton.className}
            onClick={() =>
              defaultButton.onClick && defaultButton.onClick(close)
            }
          >
            {defaultButton.children}
          </Button>
          <Button
            buttonType="neutral"
            className={cancelButton.className}
            onClick={() => cancelButton.onClick && cancelButton.onClick(close)}
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
      <form method="dialog" className="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>
  );
};
