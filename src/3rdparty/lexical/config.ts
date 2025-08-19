import {
  LexicalNodeReplacement,
  LexicalNode,
  Klass,
  type EditorThemeClasses,
} from "lexical";
import { ListNode, ListItemNode } from "@lexical/list";
import { ImageNode } from "@/3rdparty/lexical/nodes/ImageNode";
import { YouTubeNode } from "@/3rdparty/lexical/nodes/YouTubeNode";
import { LinkNode } from "@lexical/link";

export const defaultLexicalTheme: EditorThemeClasses = {
  image: "editor-image",
  text: {
    bold: "ContentEditable__root__textBold",
    italic: "ContentEditable__root__textItalic",
  },
};

export const UsedLexicalNodes: ReadonlyArray<
  Klass<LexicalNode> | LexicalNodeReplacement
> = [LinkNode, ListNode, ListItemNode, ImageNode, YouTubeNode];
