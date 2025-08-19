"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

// Allow className on <code> so highlighters can style by language (lang-*)
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [
      ...(defaultSchema.attributes?.code || []),
      ["className"], // e.g. language-ts
    ],
    span: [
      ...(defaultSchema.attributes?.span || []),
      ["className"], // some math plugins add spans
    ],
  },
};

type Props = {
  content: string;
  className?: string;
};

// Small helper to add a copy button to fenced code blocks
function CodeBlock({
  lang,
  children,
}: {
  lang?: string;
  children: React.ReactNode;
}) {
  const text = typeof children === "string" ? children : String(children);
  return (
    <div className="relative group">
      <button
        onClick={() => navigator.clipboard.writeText(text)}
        className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded border"
        aria-label="Copy code"
        type="button"
      >
        Copy
      </button>
      <pre className="overflow-x-auto rounded-lg p-4">
        <code className={lang ? `language-${lang}` : undefined}>
          {children}
        </code>
      </pre>
    </div>
  );
}

export default function MarkdownViewer({ content, className }: Props) {
  return (
    <div className={className}>
      <ReactMarkdown
        // SECURITY: keep rehypeRaw OFF by default; sanitize the AST
        rehypePlugins={[[rehypeSanitize, schema]]}
        remarkPlugins={[remarkGfm, remarkMath]}
        components={{
          // Render headings/paragraphs with nice spacing (tailwind optional)
          p: (props) => <p className="leading-7 my-3" {...props} />,
          h1: (p) => <h1 className="text-2xl font-semibold mt-6 mb-3" {...p} />,
          h2: (p) => <h2 className="text-xl font-semibold mt-5 mb-3" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 my-3" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 my-3" {...p} />,
          blockquote: (p) => (
            <blockquote
              className="border-l-4 pl-4 italic my-3 opacity-80"
              {...p}
            />
          ),
          table: (p) => (
            <div className="overflow-x-auto my-3">
              <table className="min-w-full border-collapse" {...p} />
            </div>
          ),
          th: (p) => <th className="border px-2 py-1 text-left" {...p} />,
          td: (p) => <td className="border px-2 py-1 align-top" {...p} />,
          code(allProps) {
            const { inline, className, children, ...props } =
              allProps as unknown as typeof allProps & {
                inline: boolean;
              };
            const lang = /language-(\w+)/.exec(className || "")?.[1];
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-black/5" {...props}>
                  {children}
                </code>
              );
            }
            return <CodeBlock lang={lang}>{children}</CodeBlock>;
          },
          a: (props) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            />
          ),
          img: ({ alt, ...props }) => (
            // If your models output images, keep them constrained
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={alt} {...props} className="max-w-full h-auto my-3" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
