"use client";

import { Button } from "@/components/button";
import { EditImage } from "@/components/edit_image";
import { ArrowUpTrayIcon } from "@/components/icons/arrow_up_tray";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { useFileUpload } from "@/helpers/client/hooks";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { InsertQuestData } from "./types";
import Image from "next/image";
import {
  getImageDataUrl,
  loadBlobFromUrl,
  loadImageFromBlob,
} from "@/helpers/client/common";
import { FileImage } from "@/components/file_image";

export const ConfirmCoverPhoto = ({
  // title,
  coverPhoto,
  setCoverPhoto,
  continueToNextStep,
}: {
  title: string;
  coverPhoto: InsertQuestData["coverPhoto"] | undefined;
  setCoverPhoto: (v :InsertQuestData["coverPhoto"]) => void;
  continueToNextStep: () => void;
}) => {
  const [image, setImage] = useState<File | undefined>();
  const [isEditing, setIsEditing] = useState(false);
  const fileUpload = useFileUpload({ accept: "image/*", multiple: false });
  useEffect(() => {
    if (!coverPhoto?.url) return undefined;
    (async () => {
      const file = new File(
        [await loadBlobFromUrl(coverPhoto.url)],
        coverPhoto.alt,
      );
      setImage(file);
    })();
  }, [coverPhoto?.url, coverPhoto?.alt]);
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div
        className={cn(
          "flex w-full max-w-4xl flex-1 flex-col justify-center gap-4 p-4 md:p-8",
        )}
      >
        <h1 className="text-2xl font-normal">
          Is this a good cover image for your quest? if not, upload another one
        </h1>
        <div className="card relative aspect-video w-full overflow-hidden">
          <div className="">
            {image && (
              <FileImage
                src={image}
                alt={image.name}
                className="absolute top-1/2 left-1/2 h-auto w-full -translate-x-1/2 -translate-y-1/2 rounded object-cover"
              />
            )}
            <div className="absolute top-0 right-0 flex flex-row gap-2 p-4">
              <Button
                buttonType="neutral"
                buttonStyle="soft"
                buttonSize="sm"
                onClick={() => setIsEditing(true)}
              >
                <PencilSquareIcon />
              </Button>
              <Button
                buttonType="neutral"
                buttonStyle="soft"
                buttonSize="sm"
                onClick={async () => {
                  const [file] = (await fileUpload()) ?? [];
                  if (file) setImage(file);
                }}
              >
                <ArrowUpTrayIcon />
              </Button>
            </div>
          </div>
        </div>
        <Button
          buttonType="primary"
          onClick={async () => {
            const loadedImage = image && (await loadImageFromBlob(image));
            if (loadedImage) {
              const url = getImageDataUrl(loadedImage);
              setCoverPhoto({
                url,
                alt: image.name,
                width: loadedImage.width,
                height: loadedImage.height,
              });
            }
            continueToNextStep();
          }}
        >
          Continue
        </Button>
      </div>
      {isEditing && (
        <EditImage
          aspectRatio="video"
          image={image}
          done={(editedImage?: File) => {
            if (editedImage) setImage(editedImage);
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
};
