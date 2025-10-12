import { useCallback, useEffect, useRef } from "react";

export const useFileUpload = ({
  accept,
  multiple,
}: {
  accept?: string;
  multiple?: boolean;
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileUpload = useCallback(async () => {
    if (!inputRef.current) return undefined;
    const input = inputRef.current;
    return new Promise<File[] | undefined>((r) => {
      input.value = "";
      input.onchange = () => {
        if (!input.files || input.files.length === 0) {
          r(undefined);
          return;
        }
        r(Array.from(input.files));
      };
      input.click();
    });
  }, []);
  useEffect(() => {
    const input = document.createElement("input");
    input.type = "file";
    if (accept) input.accept = accept;
    input.multiple = Boolean(multiple);
    input.style.display = "none";
    document.body.appendChild(input);
    inputRef.current = input;
    return () => {
      document.body.removeChild(input);
      inputRef.current = null;
    };
  }, []);
  return fileUpload;
};
