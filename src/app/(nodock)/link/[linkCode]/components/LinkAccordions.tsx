"use client";

import type { ReactNode } from "react";

type AccordionProps = { title: ReactNode; body: ReactNode };

export function LinkMotivatorAccordion({ title, body }: AccordionProps) {
  return (
    <AccordionShell
      title={title}
      body={body}
      containerClassName="bg-warning-content text-warning"
      borderClassName="border-warning md:w-2/3"
    />
  );
}

export function LinkRewardAccordion({ title, body }: AccordionProps) {
  return (
    <AccordionShell
      title={title}
      body={body}
      containerClassName="bg-success-content text-success"
      borderClassName="border-success flex-1"
    />
  );
}

const AccordionShell = ({
  title,
  body,
  containerClassName,
  borderClassName,
}: AccordionProps & {
  containerClassName: string;
  borderClassName: string;
}) => {
  return (
    <div
      className={`collapse-plus collapse border ${containerClassName} ${borderClassName}`}
    >
      <input type="checkbox" />
      <div className="collapse-title flex flex-row justify-between font-normal">
        {title}
      </div>
      <div className="collapse-content text-justify">{body}</div>
    </div>
  );
};
