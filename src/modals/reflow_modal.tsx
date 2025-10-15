"use client";

import { Modal, showModal } from "@/components/modal";
import React, { Fragment, useState } from "react";
import { cn } from "@/helpers/client/tailwind_helpers";
import { ExclamationCircleIcon } from "@/components/icons/exclamation_circle";
import Image from "next/image";
import { Steps } from "@/components/steps";
import { ArrowRightIcon } from "@/components/icons/arrow_right";
import { debounce } from "@/helpers/client/functions";
import { ModernFormModal } from "@/components/modern_form";

const modalId = "global-modal-reflow";

export const showReflowModal = () => {
  showModal(modalId);
};

const Step1 = () => {
  const [type, setType] = useState<"targeted" | "broadcast">("targeted");
  return (
    <>
      <label>How would you like to reflow the quest (pass it on) ?</label>
      <label className="radio-label label cursor-pointer">
        <input
          type="radio"
          className="radio radio-sm"
          name="type"
          value="targeted"
          checked={type === "targeted"}
          onChange={() => setType("targeted")}
        />{" "}
        Targeted
      </label>
      <label className="radio-label label cursor-pointer">
        <input
          type="radio"
          className="radio radio-sm"
          name="type"
          value="targeted"
          checked={type === "broadcast"}
          onChange={() => setType("broadcast")}
        />{" "}
        Broadcast
      </label>
      <div className="h-20 sm:h-32 overflow-hidden bg-base-300 rounded-box relative">
        <div
          className={cn(
            "absolute left-0 top-0 w-full h-full flex flex-row items-center justify-center transition-opacity duration-700 opacity-100",
            type !== "targeted" && "opacity-0",
          )}
        >
          <Image
            src="/img/handing_sealed_letter.png"
            width={482}
            height={246}
            alt="handing sealed letter"
            className="max-h-full w-auto object-contain"
          />
        </div>
        <div
          className={cn(
            "absolute left-0 top-0 w-full h-full flex flex-row items-center justify-between transition-opacity duration-700 opacity-100",
            type !== "broadcast" && "opacity-0",
          )}
        >
          <Image
            src="/img/man_speaker.png"
            width={297}
            height={266}
            alt="handing sealed letter"
            className="max-h-full w-auto object-contain"
          />
          <Image
            src="/img/crowd.png"
            width={463}
            height={266}
            alt="crowd"
            className="max-h-full w-auto object-contain"
          />
        </div>
      </div>
      <p
        className={cn("text-sm text-success", type !== "targeted" && "hidden")}
      >
        In targeted reflow, you create a one-time link that includes name of the
        person you invite. The content of the link will be addressin that very
        person
      </p>
      <p
        className={cn("text-sm text-success", type !== "broadcast" && "hidden")}
      >
        In broadcase reflow, the link will not specifically address anyone. It
        is suitable for sharing with small groups or communities
      </p>
      <p className="p-4 text-sm bg-warning text-warning-content rounded-box">
        <ExclamationCircleIcon className="inline-block align-bottom" /> We
        encourage targeted reflow as it strengthens the trust and minimizes
        mis-communication
      </p>
    </>
  );
};

const Step2 = () => {
  return (
    <>
      <label>What is the name of the person you want to invite?</label>
      <input className="input w-full" />
      <div className="h-20 sm:h-32 overflow-hidden bg-base-300 rounded-box flex flex-row items-start justify-between">
        <Image
          src="/img/man_filling_name.png"
          width={488}
          height={246}
          alt="man filling name"
          className="max-h-full w-auto object-contain"
        />
        <div className="flex-1 h-1/2 border-b-[3px] border-[#2bf1e8]"></div>
        <Image
          src="/img/man_link_sent_to.png"
          width={302}
          height={266}
          alt="man link sent to"
          className="max-h-full w-auto object-contain"
        />
      </div>
      <p className="text-sm text-success">
        This name will be used in targeted reflow both in the URL and contents
        of the page. In broadcase this will be included in URL if provided (can
        be empty)
      </p>
    </>
  );
};

const connectionStrengthTitleAndDescriptions = [
  { title: "Indirect", description: "I heard of him/her on indirectly" },
  { title: "Acquintance", description: "We have met a few times" },
  {
    title: "Contact",
    description: "I am and have been in contact with him/her",
  },
  { title: "Friend", description: "We are friends, I know him/her" },
  { title: "Trusted Contact", description: "I trust him/her deeply" },
];

const Step3 = () => {
  const [connectionStrength, setConnectionStrength] = useState(2);
  return (
    <>
      <label>How well do you know Margaret?</label>
      {connectionStrengthTitleAndDescriptions.map(
        ({ title, description }, index) => (
          <div
            key={title}
            className="flex flex-col gap-1 md:flex-row md:items-center"
          >
            <label className="radio-label label cursor-pointer md:w-48">
              <input
                type="radio"
                className="radio radio-sm"
                name="connection-strength"
                value={index}
                checked={connectionStrength === index}
                onChange={() => setConnectionStrength(index)}
              />{" "}
              {title}
            </label>
            <div
              className={cn(
                "text-sm text-accent/30",
                connectionStrength === index && "text-accent",
              )}
            >
              {description}
            </div>
          </div>
        ),
      )}
      <div className="h-20 sm:h-32 overflow-hidden bg-base-300 rounded-box flex flex-row items-start justify-between">
        <Image
          src="/img/man_holding_papers.png"
          width={303}
          height={242}
          alt="man holding papers"
          className="max-h-full w-auto object-contain"
        />
        <Image
          src="/img/connection_strength.png"
          width={529}
          height={459}
          alt="connection strength"
          className="max-h-full w-auto object-contain"
        />
      </div>
      <p className="text-sm text-success">
        This information is used to proivde crystall clear transparency for
        passing the trust down the sharing tree
      </p>
    </>
  );
};

const Step4 = () => {
  return (
    <>
      <label>Endorsement note</label>
      <textarea className="textarea h-36 w-full text-lg resize-none" />
      <p className="text-sm text-success">
        Write a few words on why you believe this person (or group) would be a
        great fit to help move this quest forward.
      </p>
    </>
  );
};

// type CreateLinkParams = {
//   type: "targeted" | "broadcast";
//   name?: string;
//   relationship?: string;
//   endorsementNote?: string;
// };

export const ReflowModal = () => {
  const [stepIndex, setStepIndex] = useState(0);
  return (
    <ModernFormModal
      modalId={modalId}
      contentClassName="flex flex-col gap-4 w-full h-full p-2 items-stretch justify-start [&>label:not(.radio-label)]:text-2xl [&>label.radio-label]:text-sm"
    >
      <Step1 key="step1" />
      <Step2 key="step2" />
      <Step3 key="step3" />
      <Step4 key="step4" />
    </ModernFormModal>
  );
};
