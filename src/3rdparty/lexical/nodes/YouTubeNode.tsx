/* eslint-disable no-underscore-dangle */
/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
  DOMConversionMap,
  DOMConversionOutput,
  DOMExportOutput,
  EditorConfig,
  ElementFormatType,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  Spread,
} from "lexical";

import {
  DecoratorBlockNode,
  SerializedDecoratorBlockNode,
} from "@lexical/react/LexicalDecoratorBlockNode";
import React, { JSX } from "react";

const BlockWithAlignableContents = React.lazy(async () => ({
  default: (await import("@lexical/react/LexicalBlockWithAlignableContents"))
    .BlockWithAlignableContents,
}));

type BlockWithAlignableContentsProps =
  typeof BlockWithAlignableContents extends React.LazyExoticComponent<
    React.ComponentType<infer T>
  >
    ? T
    : never;

function BlockWithAlignableContentsServer({
  children,
  format,
  className,
}: BlockWithAlignableContentsProps) {
  return (
    <div
      className={className.base}
      style={{ textAlign: format ? format : undefined }}
    >
      {children}
    </div>
  );
}

type YouTubeComponentProps = Readonly<{
  className: Readonly<{ base: string; focus: string }>;
  format: ElementFormatType | null;
  nodeKey: NodeKey;
  videoID: string;
  server?: boolean;
}>;

function YouTubeComponent({
  className,
  format,
  nodeKey,
  videoID,
  server,
}: YouTubeComponentProps) {
  const BlockComponent = server
    ? BlockWithAlignableContentsServer
    : BlockWithAlignableContents;
  return (
    <BlockComponent className={className} format={format} nodeKey={nodeKey}>
      <iframe
        style={{ border: "none" }}
        width="100%"
        height="auto"
        src={`https://www.youtube-nocookie.com/embed/${videoID}`}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={true}
        title="YouTube video"
        className="aspect-video"
      />
    </BlockComponent>
  );
}

export type SerializedYouTubeNode = Spread<
  { videoID: string },
  SerializedDecoratorBlockNode
>;

export function $createYouTubeNode(videoID: string): YouTubeNode {
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return new YouTubeNode(videoID);
}

function $convertYoutubeElement(
  domNode: HTMLElement,
): null | DOMConversionOutput {
  const {
    dataset: { lexicalYoutube: videoID },
  } = domNode;
  if (videoID) {
    const node = $createYouTubeNode(videoID);
    return { node };
  }
  return null;
}

export class YouTubeNode extends DecoratorBlockNode {
  __id: string;

  static getType(): string {
    return "youtube";
  }

  static clone(node: YouTubeNode): YouTubeNode {
    return new YouTubeNode(node.__id, node.__format, node.__key);
  }

  static importJSON(serializedNode: SerializedYouTubeNode): YouTubeNode {
    const node = $createYouTubeNode(serializedNode.videoID);
    node.setFormat(serializedNode.format);
    return node;
  }

  exportJSON(): SerializedYouTubeNode {
    return {
      ...super.exportJSON(),
      type: "youtube",
      version: 1,
      videoID: this.__id,
    };
  }

  constructor(id: string, format?: ElementFormatType, key?: NodeKey) {
    super(format, key);
    this.__id = id;
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement("iframe");
    element.setAttribute("data-lexical-youtube", this.__id);
    element.setAttribute("width", "560");
    element.setAttribute("height", "315");
    element.setAttribute(
      "src",
      `https://www.youtube-nocookie.com/embed/${this.__id}`,
    );
    element.setAttribute("frameborder", "0");
    element.setAttribute(
      "allow",
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    );
    element.setAttribute("allowfullscreen", "true");
    element.setAttribute("title", "YouTube video");
    return { element };
  }

  static importDOM(): DOMConversionMap | null {
    return {
      iframe: (domNode: HTMLElement) => {
        if (!domNode.hasAttribute("data-lexical-youtube")) {
          return null;
        }
        return { conversion: $convertYoutubeElement, priority: 1 };
      },
    };
  }

  // eslint-disable-next-line class-methods-use-this
  updateDOM(): false {
    return false;
  }

  getId(): string {
    return this.__id;
  }

  getTextContent(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _includeInert?: boolean | undefined,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _includeDirectionless?: false | undefined,
  ): string {
    return `https://www.youtube.com/watch?v=${this.__id}`;
  }

  decorate(_editor: LexicalEditor, config: EditorConfig): JSX.Element {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || "",
      focus: embedBlockTheme.focus || "",
    };
    return (
      <YouTubeComponent
        className={className}
        format={this.__format}
        nodeKey={this.getKey()}
        videoID={this.__id}
      />
    );
  }

  decorateOnServer(_editor: LexicalEditor, config: EditorConfig) {
    const embedBlockTheme = config.theme.embedBlock || {};
    const className = {
      base: embedBlockTheme.base || "",
      focus: embedBlockTheme.focus || "",
    };
    return (
      <YouTubeComponent
        className={className}
        format={this.__format}
        nodeKey={this.getKey()}
        videoID={this.__id}
        server
      />
    );
  }
}

export function $isYouTubeNode(
  node: YouTubeNode | LexicalNode | null | undefined,
): node is YouTubeNode {
  return node instanceof YouTubeNode;
}
