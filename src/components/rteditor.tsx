import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import {
  ContentEditable,
  type ContentEditableProps,
} from "@lexical/react/LexicalContentEditable";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LexicalEditor, SerializedEditorState } from "lexical";
import React from "react";

import ImagesPlugin from "@/3rdparty/lexical/plugins/ImagesPlugin";
import { ListPlugin } from "@/3rdparty/lexical/plugins/ListPlugin";
import YouTubePlugin from "@/3rdparty/lexical/plugins/YouTubePlugin";

import {
  defaultLexicalTheme,
  UsedLexicalNodes,
} from "@/3rdparty/lexical/config";
import {
  EditorRefPlugin,
  LinkPlugin,
  OnChangePlugin,
  RtEditorOnChange,
  RtEditorOnSelectionChange,
} from "@/3rdparty/lexical/plugins/common";
import { cn } from "@/helpers/client/tailwind_helpers";
// import { error } from "@/lib/logger";
import "@/3rdparty/lexical/base.css";

export type RtEditorProps = Omit<
  ContentEditableProps,
  "placeholder" | "onChange" | "value"
> & {
  placeholder?: string;
  initialEditorState?: SerializedEditorState | null;
  onChange?: RtEditorOnChange;
  onSelectionChange?: RtEditorOnSelectionChange;
};

const EMPTY_EDITOR_STATE =
  '{"root":{"children":[{"children":[],"direction":null,"format":"","indent":0,"type":"paragraph","version":1,"textFormat":0,"textStyle":""}],"direction":null,"format":"","indent":0,"type":"root","version":1}}';

const RtEditor = React.forwardRef<LexicalEditor, RtEditorProps>(
  (
    {
      placeholder,
      className,
      onChange,
      onSelectionChange,
      initialEditorState,
      ...props
    },
    ref,
  ) => {
    const initialConfig: InitialConfigType = {
      namespace: "RtEditor",
      nodes: UsedLexicalNodes,
      theme: defaultLexicalTheme,
      editable: !props.readOnly,
      editorState:
        (initialEditorState && JSON.stringify(initialEditorState)) ||
        EMPTY_EDITOR_STATE,
      onError: (e: unknown) => console.error(`${e}`),
    };

    return (
      <LexicalComposer initialConfig={initialConfig}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              aria-placeholder={placeholder || ""}
              placeholder={() => null}
              className={cn(className, "ContentEditable__root relative")}
              {...props}
            />
          }
          placeholder={
            <div className="absolute pointer-events-none left-3 top-3 text-information-content-neutral font-body text-body bg-transparent">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <EditorRefPlugin editorRef={ref} />
        <ListPlugin />
        <LinkPlugin />
        <YouTubePlugin />
        <ImagesPlugin />
        <HistoryPlugin />
        <OnChangePlugin
          onChange={onChange}
          onSelectionChange={onSelectionChange}
        />
      </LexicalComposer>
    );
  },
);
RtEditor.displayName = "RtEditor";

export { RtEditor };
