"use client";

import { useCallback } from "react";
import { Button, CloseButton } from "./button";

export type ModalButtonProps = {
  children?: React.ReactNode;
  onClick?: (close: () => void) => void;
};

export const Modal = ({
  id,
  children,
  defaultButton,
  cancelButton,
  restButtons,
}: {
  id: string;
  children?: React.ReactNode;
  defaultButton: ModalButtonProps;
  cancelButton: ModalButtonProps;
  restButtons?: ModalButtonProps[];
}) => {
  const close = useCallback(
    () => (document.getElementById(id) as HTMLDialogElement).close(),
    [],
  );
  return (
    <dialog id={id} className="modal">
      <div className="modal-box w-[calc(100%-2rem)] h-[calc(100%-2rem)] max-w-4xl md:h-auto flex flex-col">
        <div className="flex flex-row gap-2 items-center justify-end">
          <CloseButton onClick={close} />
        </div>
        <div className="flex-1">{children}</div>
        <div className="flex flex-row justify-end gap-2">
          <Button
            buttonType="primary"
            onClick={() =>
              defaultButton.onClick && defaultButton.onClick(close)
            }
          >
            {defaultButton.children}
          </Button>
          <Button
            buttonType="neutral"
            onClick={() => cancelButton.onClick && cancelButton.onClick(close)}
          >
            {cancelButton.children}
          </Button>
          {restButtons &&
            restButtons.map(({ children, onClick }, index) => (
              <Button
                key={`modal-button-${index}`}
                buttonType="neutral"
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
