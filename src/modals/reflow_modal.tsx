"use client";

import { showModal } from "@/components/modal";
import React, { useState } from "react";
import { cn } from "@/helpers/client/tailwind_helpers";
import { ExclamationCircleIcon } from "@/components/icons/exclamation_circle";
import Image from "next/image";
import { ModernFormModal } from "@/components/modern_form";

const modalId = "global-modal-reflow";

export const showReflowModal = () => {
  showModal(modalId);
};

const LinkTypeSelection = ({
  type,
  setType,
  questType,
}: {
  type: "targeted" | "broadcast";
  setType: (type: "targeted" | "broadcast") => void;
  questType?: "restricted" | "unrestricted";
}) => {
  const isRestricted = questType === "restricted";
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
        Targeted (One-time link to a specific friend)
      </label>
      <label
        className={cn(
          "radio-label label cursor-pointer",
          isRestricted && "cursor-not-allowed opacity-50",
        )}
      >
        <input
          type="radio"
          className="radio radio-sm"
          name="type"
          value="broadcast"
          checked={type === "broadcast"}
          onChange={() => setType("broadcast")}
          disabled={isRestricted}
        />{" "}
        Broadcast (Multi-use link for a group of friends)
        {isRestricted && (
          <span className="text-error ml-2 text-xs">
            (Not available for restricted quests)
          </span>
        )}
      </label>
      <div className="bg-base-300 rounded-box relative h-20 overflow-hidden sm:h-32">
        <div
          className={cn(
            "absolute top-0 left-0 flex h-full w-full flex-row items-center justify-center opacity-100 transition-opacity duration-700",
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
            "absolute top-0 left-0 flex h-full w-full flex-row items-center justify-between opacity-100 transition-opacity duration-700",
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
        className={cn("text-success text-sm", type !== "targeted" && "hidden")}
      >
        In targeted reflow, you create a exclusive one-time link that includes
        name of the person you invite. The content of the link will be addressed
        to that very person
      </p>
      <p
        className={cn("text-success text-sm", type !== "broadcast" && "hidden")}
      >
        In broadcase reflow, the link will not specifically address anyone. It
        is suitable for sharing as story or with small groups or communities
      </p>
      <p className="bg-warning text-warning-content rounded-box p-4 text-sm">
        <ExclamationCircleIcon className="inline-block align-bottom" /> We
        encourage <b>Targeted</b> reflow as it strengthens the trust and
        minimizes mis-communication
      </p>
    </>
  );
};

const InviteeNameInput = ({
  name,
  setName,
}: {
  name: string;
  setName: (name: string) => void;
}) => {
  return (
    <>
      <label>What is the name of the person you want to invite?</label>
      <input
        className="input w-full"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="John Doe"
      />
      <div className="bg-base-300 rounded-box flex h-20 flex-row items-start justify-between overflow-hidden sm:h-32">
        <Image
          src="/img/man_filling_name.png"
          width={488}
          height={246}
          alt="man filling name"
          className="max-h-full w-auto object-contain"
        />
        <div className="h-1/2 flex-1 border-b-[3px] border-[#2bf1e8]"></div>
        <Image
          src="/img/man_link_sent_to.png"
          width={302}
          height={266}
          alt="man link sent to"
          className="max-h-full w-auto object-contain"
        />
      </div>
      <p className="text-success text-sm">
        This name will be used both in the URL and contents of the page.
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

const ConnectionStrengthInput = ({
  connectionStrength,
  setConnectionStrength,
  inviteeName,
}: {
  connectionStrength: number;
  setConnectionStrength: (connectionStrength: number) => void;
  inviteeName: string;
}) => {
  return (
    <>
      <label>How well do you know {inviteeName}?</label>
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
                "text-accent/30 text-sm",
                connectionStrength === index && "text-accent",
              )}
            >
              {description}
            </div>
          </div>
        ),
      )}
      <div className="bg-base-300 rounded-box flex h-20 flex-row items-start justify-between overflow-hidden sm:h-32">
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
      <p className="text-success text-sm">
        This information is used to proivde crystall clear transparency for
        passing the trust down the sharing tree to the community
      </p>
    </>
  );
};

const EndorsementNoteInput = ({
  endorsementNote,
  setEndorsementNote,
  type,
  name,
}: {
  endorsementNote: string;
  setEndorsementNote: (endorsementNote: string) => void;
  type: "targeted" | "broadcast";
  name: string;
}) => {
  return (
    <>
      <label>Endorsement note</label>
      <div className="flex flex-col gap-1 p-1 md:flex-row md:items-center">
        <textarea
          className="textarea h-36 w-full resize-none p-1 text-lg"
          value={endorsementNote}
          onChange={(e) => setEndorsementNote(e.target.value)}
          placeholder={
            type === "targeted"
              ? `${name ? name : "this person"} is a great fit to help because ...`
              : "My reflow may help because ..."
          }
        />
      </div>
      <p className="text-success text-sm">
        Write a few words on why you believe{" "}
        {type === "targeted"
          ? `${!!name ? name : "this person"} would be a great fit to help`
          : "your reflow helps"}{" "}
        move this quest forward. This will be visible to the community once your
        recipient accepts your invitation link.
      </p>
      <label>Message to {!!name ? name : "Your friend"}</label>
      <div className="flex flex-col gap-1 p-1 md:flex-row md:items-center">
        <textarea
          className="textarea h-36 w-full resize-none p-1 text-lg"
          value={endorsementNote}
          onChange={(e) => setEndorsementNote(e.target.value)}
        />
      </div>
      <p className="text-success text-sm">
        This will be only visible to the recipient of your invitation link.
      </p>
    </>
  );
};

const LinkPreview = () => {
  return <>TO BE IMPLEMENTED</>;
};

export const ReflowModal = ({
  questType,
}: {
  questType?: "restricted" | "unrestricted";
}) => {
  const [type, setType] = useState<"targeted" | "broadcast">("targeted");
  const [name, setName] = useState<string>("");
  const [endorsementNote, setEndorsementNote] = useState<string>("");
  const [connectionStrength, setConnectionStrength] = useState(2);
  return (
    <ModernFormModal
      modalId={modalId}
      contentClassName="flex flex-col gap-4 w-full h-full p-2 items-stretch justify-start [&>label:not(.radio-label)]:text-2xl [&>label.radio-label]:text-sm"
    >
      <LinkTypeSelection
        key="step1"
        type={type}
        setType={setType}
        questType={questType}
      />
      {type === "targeted" && (
        <InviteeNameInput key="step2" name={name} setName={setName} />
      )}
      {type === "targeted" && (
        <ConnectionStrengthInput
          key="step3"
          connectionStrength={connectionStrength}
          setConnectionStrength={setConnectionStrength}
          inviteeName={name}
        />
      )}
      <EndorsementNoteInput
        key={type === "targeted" ? "step4" : "step2"}
        endorsementNote={endorsementNote}
        setEndorsementNote={setEndorsementNote}
        type={type}
        name={name}
      />
      <LinkPreview />
    </ModernFormModal>
  );
};
