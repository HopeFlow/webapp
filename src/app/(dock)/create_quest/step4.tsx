"use client";

import { Button } from "@/components/button";
import { EditImage } from "@/components/edit_image";
import { FileImage } from "@/components/file_image";
import { ArrowUpTrayIcon } from "@/components/icons/arrow_up_tray";
import { PencilSquareIcon } from "@/components/icons/pencil_square";
import { loadFileFromUrl } from "@/helpers/client/common";
import { useGeneratedCoverImage } from "@/helpers/client/GENAI";
import { useFileUpload } from "@/helpers/client/hooks";
import { cn } from "@/helpers/client/tailwind_helpers";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";

export const Step4 = ({
  title,
  coverImage,
  setCoverImage,
  continueToNextStep,
}: {
  title: string;
  coverImage: File | undefined;
  setCoverImage: Dispatch<SetStateAction<File | undefined>>;
  continueToNextStep: () => void;
}) => {
  // const imageDataUrl = coverImage ? undefined : useMemo(() => useGeneratedCoverImage(title), [title]);
  const [image, setImage] = useState<File | undefined>(coverImage);
  const [isEditing, setIsEditing] = useState(false);
  const fileUpload = useFileUpload({ accept: "image/*", multiple: false });
  useEffect(() => {
    (async () => {
      const image = await loadFileFromUrl(
        "https://pub-7027dcead7294deeacde6da1a50ed32f.r2.dev/trek-520-grando-51cm-v0.jpeg",
        "trek-520-grando-51cm-v0.jpeg",
      );
      // const image =
      //   imageDataUrl === undefined
      //     ? undefined
      //     : await loadFileFromUrl(
      //         imageDataUrl,
      //         `cover-image-${Date.now()}.jpeg`,
      //       );
      setImage(image);
    })();
  }, []);
  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div
        className={cn(
          "w-full max-w-4xl p-4 md:p-8 flex-1 flex flex-col gap-4 justify-center",
        )}
      >
        <h1 className="font-normal text-2xl">
          Is this a good cover image for your quest? if not, upload another one
        </h1>
        <div className="w-full aspect-video card overflow-hidden relative">
          <div className="">
            <FileImage
              src={image}
              alt="Cover Image"
              className="left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 absolute w-full h-auto object-cover rounded"
            />
            <div className="absolute right-0 top-0 p-4 flex flex-row gap-2">
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
          onClick={() => {
            setCoverImage(image);
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
