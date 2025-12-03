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
  onCloseAttempt?: (close: () => void) => void;
  onClose?: () => void;
  modalId?: string;
  contentClassName?: string;
  stepValidity?: boolean[];
  ref?: React.Ref<HTMLDialogElement | null>;
};

export const ModernFormModal = ({
  modalId,
  nextButtonContent,
  cancelButtonContent,
  onNextButtonClick,
  onCancelButtonClick,
  onCloseAttempt,
  onClose,
  children,
  contentClassName,
  ref,
  stepValidity,
}: ModernFormModalProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const childArray = (Array.isArray(children) ? children : [children]).filter(
    (c) => !!c,
  );

  const isCurrentStepValid =
    !stepValidity || stepValidity[activeStepIndex] !== false;

  const handleInternalClose = () => {
    setStepIndex(0);
    setActiveStepIndex(0);
    onClose?.();
  };

  return (
    <Modal
      ref={ref}
      id={modalId}
      onCloseAttempt={onCloseAttempt}
      onClose={handleInternalClose}
      header={
        <Steps
          currentStep={activeStepIndex}
          numberOfSteps={childArray.length}
          stepValidity={stepValidity}
          onClick={(targetIndex) => {
            // Allow navigation only if all steps before the target step are valid
            const canNavigate =
              !stepValidity ||
              stepValidity
                .slice(0, targetIndex)
                .every((isValid) => isValid !== false);

            if (canNavigate) {
              setStepIndex(targetIndex);
            }
          }}
        />
      }
      defaultButton={{
        disabled: !isCurrentStepValid,
        children: nextButtonContent ? (
          nextButtonContent(activeStepIndex)
        ) : stepIndex === childArray.length - 1 ? (
          "Submit"
        ) : (
          <>
            Next <ArrowRightIcon size={18} />
          </>
        ),
        onClick: (close) => {
          if (!isCurrentStepValid) return;
          if (onNextButtonClick) {
            onNextButtonClick(activeStepIndex, close);
            return;
          }
          setStepIndex(
            Math.min(Math.max(0, stepIndex + 1), childArray.length - 1),
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
        childClassName={contentClassName}
      >
        {childArray}
      </Carousel>
    </Modal>
  );
};
