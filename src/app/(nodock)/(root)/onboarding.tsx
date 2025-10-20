"use client";

import { usePersistentState } from "@/app/(nodock)/(root)/persistent_state";
import SplashScreen from "@/app/splashScreen";
import { Button, CloseButton, GhostButton } from "@/components/button";
import { ArrowLeftIcon } from "@/components/icons/arrow_left";
import { Steps } from "@/components/steps";
import { useGotoLogin } from "@/helpers/client/routes";
import Image from "next/image";
import { useEffect, useMemo } from "react";

const onboardingSteps = [
  {
    image: {
      src: "/img/onboarding-1.webp",
      alt: "Social connections",
      width: 341,
      height: 305,
    },
    title: "Find someone who knows someone ...",
    shortDescription:
      "Tap into vast knowledge of friends of your friends to find information",
    description: [
      "Find someone who knows someone, and you unlock a route to information that isn’t obvious in public search: practical know‑how, lived context, and names of people who actually do the thing.",
      "This works because extended social connections create lightweight trust and accountability—people are more willing to share or respond when a mutual contact is in the loop. Each “friend‑of‑a‑friend” step multiplies the pool of perspectives while keeping a reputational filter in place, so you see less noise and more signal.",
      "Weak ties are especially valuable: they bridge communities and surface non‑redundant insights you won’t get from your immediate circle.",
      "Introductions also convert vague questions into specific, answerable ones (“talk to Maya about supplier vetting in Vietnam”), turning a broad search into a short path of targeted outreach.",
    ],
  },
  {
    image: {
      src: "/img/onboarding-2.webp",
      alt: "Communication channels",
      width: 328,
      height: 343,
    },
    title: "Share unique links",
    shortDescription:
      "Share unique links with your friends and connections through any communication channel of your choice.",
    description: [
      "A unique link acts as a personal key—when someone clicks it, they’re directly connected to the specific page, resource, or opportunity you want them to see, without hunting or guesswork.",
      "Because each link is tied to you, it’s easy to share across any channel—chat apps, email, social posts—and still know exactly which invitation or recommendation sparked engagement.",
      "This works especially well for coordinating across networks: the recipient doesn’t need an account first, just the link, and they can join in seconds. That keeps momentum high and lowers the barrier to participation.",
      "Unique links also allow for lightweight tracking and follow-up, so you can see what’s resonating, know who’s responded, and offer the right next step at the right moment.",
    ],
  },
  {
    image: {
      src: "/img/onboarding-3.webp",
      alt: "Reward",
      width: 289,
      height: 343,
    },
    title: "And there are rewards",
    shortDescription:
      "Anyone who contributes to the successful resolution of a quest receives a share of the reward.",
    description: [
      "When a quest reaches a successful resolution, the reward isn’t just for the person who had the answer—it also includes everyone whose actions made that discovery possible.",
      "This means that introducers, connectors, and facilitators who linked the quest starter to the right people are recognized alongside the solver.",
      "By rewarding every essential step in the chain of discovery, the system values both knowledge and the act of connecting knowledge to where it’s needed.",
      "The result is a culture where people are motivated to share leads, make introductions, and pass questions onward, knowing that their role in unlocking the answer will be acknowledged and rewarded.",
    ],
  },
] as const;

export default function Onboarding() {
  const [onboardingStepIndex, setOnboardingStepIndex, loaded] =
    usePersistentState("root.onboardingStepIndex", 0);
  // Clamp to valid range before reading the step
  const clampedIndex = useMemo(
    () =>
      Math.max(0, Math.min(onboardingSteps.length - 1, onboardingStepIndex)),
    [onboardingStepIndex],
  );
  const [dismissed, setDismissed] = usePersistentState(
    "root.dismissedOnboarding",
    false,
  );
  const gotoLogin = useGotoLogin();

  useEffect(() => {
    if (dismissed) {
      gotoLogin({});
    }
  }, [dismissed, gotoLogin]);

  if (!loaded) return <SplashScreen />;
  if (dismissed) return null;

  const { image, title, shortDescription, description } =
    onboardingSteps[clampedIndex];

  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-start p-6">
      <div className="flex h-12 w-full flex-row items-center gap-4">
        <GhostButton
          onClick={() =>
            setOnboardingStepIndex(clampedIndex > 0 ? clampedIndex - 1 : 0)
          }
        >
          <ArrowLeftIcon />
        </GhostButton>
        <Steps
          numberOfSteps={onboardingSteps.length}
          currentStep={clampedIndex}
          onClick={(step) =>
            setOnboardingStepIndex(
              Math.max(0, Math.min(onboardingSteps.length - 1, step)),
            )
          }
        />
        <CloseButton
          onClick={() => {
            setDismissed(true);
          }}
        />
      </div>
      <div className="flex max-w-5xl flex-1 flex-col items-center justify-start p-6">
        <div className="flex max-h-full w-full flex-1 flex-col-reverse items-center justify-end gap-2 overflow-auto md:flex-row md:items-start md:gap-16">
          <div className="flex w-full flex-1 flex-col items-start gap-2">
            <h1 className="mb-2 text-4xl font-normal md:mb-4 md:text-5xl">
              {title}
            </h1>
            <p className="md:hidden">{shortDescription}</p>
            {description.map((paragraph, index) => (
              <p key={`p-${index}`} className="hidden md:block">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="flex h-56 items-center justify-center overflow-hidden md:h-full md:max-w-1/2">
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              className="max-h-full w-auto object-contain"
            />
          </div>
        </div>
        <div className="flex h-12 w-full flex-row items-center justify-center gap-4">
          {(clampedIndex === onboardingSteps.length - 1 && (
            <Button
              className="flex-1"
              onClick={() => {
                setDismissed(true);
              }}
            >
              Get started!
            </Button>
          )) || (
            <>
              <Button
                className="flex-1"
                onClick={() =>
                  setOnboardingStepIndex((prevStepIndex) =>
                    prevStepIndex < onboardingSteps.length - 1
                      ? prevStepIndex + 1
                      : prevStepIndex,
                  )
                }
              >
                Next
              </Button>
              <Button
                className="flex-1"
                buttonType="neutral"
                onClick={() => {
                  setDismissed(true);
                }}
              >
                Skip
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
