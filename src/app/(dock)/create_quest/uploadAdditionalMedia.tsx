"use client";

import { Button } from "@/components/button";
import { FileImage } from "@/components/file_image";
import { ArrowUpTrayIcon } from "@/components/icons/arrow_up_tray";
import { FilmIcon } from "@/components/icons/film";
// import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { TrashIcon } from "@/components/icons/trash";
import { MediaCarousel } from "@/components/media_carousel";
import { Modal, showModal } from "@/components/modal";

import { loadImageFromBlob } from "@/helpers/client/common";
// import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { useFileUpload } from "@/helpers/client/hooks";
import { cn } from "@/helpers/client/tailwind_helpers";
import { useRef, useState } from "react";
import { MediaSource } from "./types";

export const UploadAdditionalMedia = ({
  media,
  setMedia,
  continueToNextStep,
}: {
  media: MediaSource[];
  setMedia: (media: MediaSource[]) => void;
  continueToNextStep: () => void;
}) => {
  const videoUrlModalRef = useRef<HTMLDialogElement | null>(null);
  const [value, setValue] = useState<MediaSource[]>(media);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const fileUpload = useFileUpload({ accept: "image/*", multiple: true });
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          Upload any additional media for your quest (optional)
        </h1>
        <MediaCarousel
          className="card relative aspect-video w-full overflow-hidden"
          initialIndex={activeMediaIndex}
          onIndexChange={setActiveMediaIndex}
          controls={
            <div className="absolute right-4 bottom-4 flex flex-row gap-2">
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
                    setValue((m) => (m ? [...m, ...newMedia] : newMedia));
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
          {value?.map((m, index) => {
            return m.type === "image" ? (
              <FileImage
                key={index}
                src={m.content}
                alt={`media-${index}`}
                className="h-auto w-full object-cover"
              />
            ) : (
              false
            );
          })}
        </MediaCarousel>
        <Modal
          ref={videoUrlModalRef}
          defaultButton={{ children: "OK", onClick: (close) => close() }}
          cancelButton={{ children: "Cancel", onClick: (close) => close() }}
        >
          <label>Youtube Video URL</label>
          <input type="text" className="input input-bordered w-full" />
        </Modal>
        <Button
          buttonType="primary"
          onClick={() => {
            setMedia(value);
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
    </div>
  );
};
