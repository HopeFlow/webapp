import { ReactNode, useState } from "react";
import { Modal } from "./modal";
import { Steps } from "./steps";
import { ArrowRightIcon } from "./icons/arrow_right";
import { Carousel } from "./carousel";

export {
  Carousel as ModernForm,
  type CarouselProps as ModernFormProps,
} from "./carousel";

export type ModernFormModalProps = {
  children: ReactNode[];
  nextButtonContent?: (stepIndex: number) => ReactNode;
  cancelButtonContent?: (stepIndex: number) => ReactNode;
  onNextButtonClick?: (stepIndex: number, close: () => void) => void;
  onCancelButtonClick?: (stepIndex: number, close: () => void) => void;
  modalId?: string;
  ref?: React.Ref<HTMLDialogElement | null>;
};

export const ModernFormModal = ({
  modalId,
  nextButtonContent,
  cancelButtonContent,
  onNextButtonClick,
  onCancelButtonClick,
  children,
  ref,
}: ModernFormModalProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  return (
    <Modal
      ref={ref}
      id={modalId}
      header={
        <Steps
          currentStep={activeStepIndex}
          numberOfSteps={children.length}
          onClick={(stepIndex) => setStepIndex(stepIndex)}
        />
      }
      defaultButton={{
        children: nextButtonContent ? (
          nextButtonContent(activeStepIndex)
        ) : stepIndex === children.length - 1 ? (
          "Submit"
        ) : (
          <>
            Next <ArrowRightIcon size={18} />
          </>
        ),
        onClick: (close) => {
          if (onNextButtonClick) {
            onNextButtonClick(activeStepIndex, close);
            return;
          }
          setStepIndex(
            Math.min(Math.max(0, stepIndex + 1), children.length - 1),
          );
        },
      }}
      cancelButton={{
        children: cancelButtonContent
          ? cancelButtonContent(activeStepIndex)
          : "Cancel",
        onClick: (close) => {
          if (onCancelButtonClick) {
            onCancelButtonClick(activeStepIndex, close);
            return;
          }
          close();
        },
      }}
    >
      <Carousel
        itemIndex={stepIndex}
        onItemIndexChange={(itemIndex) => {
          setStepIndex(itemIndex);
          setActiveStepIndex(itemIndex);
        }}
      >
        {children}
      </Carousel>
    </Modal>
  );
};
