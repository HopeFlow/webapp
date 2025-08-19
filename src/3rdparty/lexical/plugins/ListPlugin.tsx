"use client";

import { useCallback, useEffect } from "react";
import {
  ListNode,
  ListItemNode,
  registerList,
  $isListNode,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $createNodeSelection,
  $createParagraphNode,
  $createTextNode,
  $getSelection,
  $isRangeSelection,
  $isRootNode,
  $isRootOrShadowRoot,
  COMMAND_PRIORITY_LOW,
  createCommand,
  KEY_BACKSPACE_COMMAND,
  KEY_DELETE_COMMAND,
  LexicalEditor,
} from "lexical";
import { $setBlocksType } from "@lexical/selection";
import {
  $findMatchingParent,
  $getNearestNodeOfType,
  mergeRegister,
} from "@lexical/utils";

export const TOGGLE_LIST_COMMAND = createCommand<void>();

const isSelectionListItem = (
  editor: LexicalEditor,
  selection: ReturnType<typeof $getSelection>,
) => {
  if (!$isRangeSelection(selection)) return false;
  const anchorNode = selection.anchor.getNode();
  let element =
    anchorNode.getKey() === "root"
      ? anchorNode
      : $findMatchingParent(anchorNode, (e) => {
          const parent = e.getParent();
          return parent !== null && $isRootOrShadowRoot(parent);
        });
  if (element === null) element = anchorNode.getTopLevelElementOrThrow();
  const elementKey = element.getKey();
  const elementDOM = editor.getElementByKey(elementKey);
  return elementDOM !== null && $isListNode(element);
};

export function ListPlugin(): null {
  const [editor] = useLexicalComposerContext();

  const $onDelete = useCallback(
    (e: KeyboardEvent) => {
      const deleteSelection = $getSelection();
      if (!deleteSelection || !isSelectionListItem(editor, deleteSelection))
        return false;
      const listItemNode = $getNearestNodeOfType(
        deleteSelection.getStartEndPoints()!.at(0)!.getNode(),
        ListItemNode,
      );
      if (!listItemNode) return false;
      const selection = $createNodeSelection();
      deleteSelection.getNodes().forEach((n) => selection.add(n.getKey()));
      if (!deleteSelection.is(selection)) return false;
      editor.update(() => {
        $setBlocksType(deleteSelection, () => $createParagraphNode());
      });
      e.preventDefault();
      return true;
    },
    [editor],
  );

  useEffect(() => {
    if (!editor.hasNodes([ListNode, ListItemNode]))
      throw new Error(
        "ListPlugin: ListNode or ListItemNode not registered on editor",
      );
    const unregister = mergeRegister(
      registerList(editor),
      editor.registerCommand(
        KEY_DELETE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        KEY_BACKSPACE_COMMAND,
        $onDelete,
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        TOGGLE_LIST_COMMAND,
        () => {
          const selection = $getSelection();
          if (!selection) return false;
          if (isSelectionListItem(editor, selection))
            editor.update(() => {
              $setBlocksType(selection, () => $createParagraphNode());
            });
          else {
            const nodes = selection.getNodes();
            if (nodes.length === 1 && $isRootNode(nodes[0])) {
              const p = $createParagraphNode();
              p.append($createTextNode(""));
              selection.insertNodes([p]);
            }
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
    );
    return () => {
      unregister();
    };
  }, [$onDelete, editor]);

  return null;
}
