import type { StepId } from "../types/app";

export const shouldRedirectToUploadForMissingSvg = ({
  currentStep,
  hasSvgTemplate,
}: {
  currentStep: StepId;
  hasSvgTemplate: boolean;
}) => !hasSvgTemplate && currentStep !== "upload";
