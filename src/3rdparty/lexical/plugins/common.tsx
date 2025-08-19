"use client";

import { $toggleLink, LinkNode, TOGGLE_LINK_COMMAND } from "@lexical/link";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { mergeRegister, objectKlassEquals } from "@lexical/utils";
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  EditorState,
  LexicalEditor,
  PASTE_COMMAND,
  PointType,
} from "lexical";
import React, { useCallback, useEffect, useImperativeHandle } from "react";

// import { CAN_USE_DOM } from "@/lib/utils";

// import { useModalDialog } from "@/components/ui/modal";
// import { useToast } from "@/components/ui/toasts";
// import { useRouter } from "@/router";
import "@/3rdparty/lexical/base.css";

export function EditorRefPlugin({
  editorRef,
}: {
  editorRef: React.ForwardedRef<LexicalEditor>;
}): null {
  const [editor] = useLexicalComposerContext();
  useImperativeHandle(editorRef, () => editor, [editor]);
  return null;
}

const sanitizeUrl = (payload: string) => {
  if (payload.indexOf(".") === -1) return null;
  try {
    let normalizedInput = payload.trim();
    if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalizedInput))
      normalizedInput = "https://" + normalizedInput;
    const url = new URL(normalizedInput);
    return url.toString();
  } catch {
    return null;
  }
};

export function LinkPlugin(): null {
  const [editor] = useLexicalComposerContext();
  // const router = useRouter();
  // const addToast = useToast();
  // const addInvalidUrlToast = useCallback(
  //   () =>
  //     addToast({
  //       type: "error",
  //       title: "Invalid URL",
  //       description: "The input string does not seem to represent a valid URL",
  //     }),
  //   [addToast],
  // );

  useEffect(() => {
    if (!editor.hasNodes([LinkNode]))
      throw new Error("LinkPlugin: LinkNode not registered on editor");
    return mergeRegister(
      editor.registerCommand(
        TOGGLE_LINK_COMMAND,
        (payload) => {
          if (payload === null) {
            $toggleLink(payload);
            return true;
          } else if (typeof payload === "string") {
            const sanitizedUrl = !sanitizeUrl ? payload : sanitizeUrl(payload);
            if (sanitizedUrl) {
              $toggleLink(sanitizedUrl, {});
              return true;
            }
            // addInvalidUrlToast();
            return false;
          } else {
            const { url, target, rel, title } = payload;
            $toggleLink(url, { rel, target, title });
            return true;
          }
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        PASTE_COMMAND,
        (event) => {
          const selection = $getSelection();
          if (
            !$isRangeSelection(selection) ||
            selection.isCollapsed() ||
            !objectKlassEquals(event, ClipboardEvent)
          ) {
            return false;
          }
          const clipboardEvent = event as ClipboardEvent;
          if (clipboardEvent.clipboardData === null) {
            return false;
          }
          const clipboardText = clipboardEvent.clipboardData.getData("text");
          const sanitizedUrl = !sanitizeUrl
            ? clipboardText
            : sanitizeUrl(clipboardText);
          if (!sanitizedUrl) {
            // addInvalidUrlToast();
            return false;
          }
          // If we select nodes that are elements then avoid applying the link.
          if (!selection.getNodes().some((node) => $isElementNode(node))) {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, { url: sanitizedUrl });
            event.preventDefault();
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, 
  // [addInvalidUrlToast, editor]
  [editor]);

  // const showModalDialog = useModalDialog();

  const handleLinkClick = useCallback(
    (link: HTMLAnchorElement) => {
      void(link);
      // if (!e.ctrlKey && !e.metaKey) return;
      // showModalDialog(
      //   "Request to follow",
      //   <div>
      //     <p>You will be redirected to:</p>
      //     <p>{link.href}</p>
      //     <p>Do you want to follow?</p>
      //   </div>,
      //   [
      //     { title: "Ok", type: "normal", action: () => router.push(link.href) },
      //     { title: "Cancel", type: "cancel", action: (close) => close() },
      //   ],
      // );
    },
    // [router, showModalDialog],
    [],
  );

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        m.addedNodes.forEach(
          (n) =>
            n.nodeType === Node.ELEMENT_NODE &&
            (n as Element).tagName.toLowerCase() === "a" &&
            n.addEventListener("click", (e) => {
              if (e.currentTarget instanceof HTMLAnchorElement) {
                e.preventDefault();
                e.stopPropagation();
                handleLinkClick(e.currentTarget);
              }
            }),
        );
      });
    });

    return editor.registerRootListener((rootElement, prevRootElement) => {
      if (prevRootElement) {
        observer.disconnect();
      }
      if (rootElement) {
        observer.observe(rootElement, { childList: true, subtree: true });
      }
    });
    // We intentionally don't respect changes to eventType.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  return null;
}

const useLayoutEffect: typeof React.useLayoutEffect = false //CAN_USE_DOM
  ? React.useLayoutEffect
  : useEffect;

export type RtEditorOnChange = (
  editorState: EditorState,
  editor: LexicalEditor,
  tags: Set<string>,
) => void;

export type RtEditorOnSelectionChange = (s?: PointType, e?: PointType) => void;

export function OnChangePlugin({
  onChange,
  onSelectionChange,
}: {
  onChange?: RtEditorOnChange;
  onSelectionChange?: RtEditorOnSelectionChange;
}): null {
  const [editor] = useLexicalComposerContext();

  useLayoutEffect(() => {
    if (!onChange && !onSelectionChange) return undefined;
    return editor.registerUpdateListener(
      ({ editorState, dirtyElements, dirtyLeaves, prevEditorState, tags }) => {
        if (onSelectionChange)
          editorState.read(() => {
            if (
              editor.isComposing() ||
              editor.getRootElement() !== document.activeElement
            ) {
              onSelectionChange();
              return;
            }

            const selection = $getSelection()?.getStartEndPoints();
            if (!selection) {
              onSelectionChange();
              return;
            }
            const [startPoint, endPoint] = selection;
            onSelectionChange(startPoint, endPoint);
          });

        if (
          !onChange ||
          (dirtyElements.size === 0 && dirtyLeaves.size === 0) ||
          prevEditorState.isEmpty()
        ) {
          return;
        }

        onChange(editorState, editor, tags);
      },
    );
  }, [editor, onChange, onSelectionChange]);

  return null;
}
