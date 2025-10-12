"use client";

import { Button } from "@/components/button";
import { FileImage } from "@/components/file_image";
import { ArrowUpTrayIcon } from "@/components/icons/arrow_up_tray";
import { FilmIcon } from "@/components/icons/film";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { TrashIcon } from "@/components/icons/trash";
import { MediaCarousel } from "@/components/media_carousel";
import { Modal, showModal } from "@/components/modal";
import { QuestMedia } from "@/db/constants";
import { loadFileFromUrl, loadImageFromBlob } from "@/helpers/client/common";
import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { useFileUpload } from "@/helpers/client/hooks";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export type MediaSource = Omit<QuestMedia, "type" | "url"> &
  ({ type: "video"; url: string } | { type: "image"; content: File });

export const Step5 = ({
  continueToNextStep,
}: {
  continueToNextStep: () => void;
}) => {
  const videoUrlModalRef = useRef<HTMLDialogElement | null>(null);
  const [media, setMedia] = useState<MediaSource[]>();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const fileUpload = useFileUpload({
    accept: "image/*",
    multiple: true,
  });
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
        )}
      >
        <h1 className="font-normal text-2xl">
          Upload any additional media for your quest (optional)
        </h1>
        <MediaCarousel
          className="w-full aspect-video card overflow-hidden relative"
          initialIndex={activeMediaIndex}
          onIndexChange={setActiveMediaIndex}
          controls={
            <div className="absolute bottom-4 right-4 flex flex-row gap-2">
              <Button
                buttonType="info"
                onClick={async () => {
                  const files = await fileUpload();
                  if (files && files.length > 0) {
                    const newMedia = await Promise.all(
                      files.map(async (f) => {
                        const image = await loadImageFromBlob(f);
                        return {
                          type: "image",
                          content: f,
                          alt: f.name,
                          height: image.height,
                          width: image.width,
                        } as const;
                      }),
                    );
                    setMedia((m) => (m ? [...m, ...newMedia] : newMedia));
                  }
                }}
              >
                <ArrowUpTrayIcon />
              </Button>
              <Button
                buttonType="info"
                onClick={() => {
                  showModal(videoUrlModalRef.current);
                }}
              >
                <FilmIcon />
              </Button>
              <Button buttonType="error">
                <TrashIcon />
              </Button>
            </div>
          }
        >
          {media?.map((m, index) => {
            return m.type === "image" ? (
              <FileImage
                key={index}
                src={m.content}
                alt={`media-${index}`}
                className="w-full h-auto object-cover"
              />
            ) : (
              false
            );
          })}
        </MediaCarousel>
        <Modal
          ref={videoUrlModalRef}
          defaultButton={{
            children: "OK",
            onClick: (close) => close(),
          }}
          cancelButton={{
            children: "Cancel",
            onClick: (close) => close(),
          }}
        >
          <label>Youtube Video URL</label>
          <input type="text" className="input input-bordered w-full" />
        </Modal>
        <Button
          buttonType="primary"
          onClick={() => {
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
