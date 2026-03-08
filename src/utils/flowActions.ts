import type { StepId } from "../types/app";

export type FlowAction = {
  label: string;
  shortLabel: string;
  helper: string;
  targetStep: StepId;
  enabled: boolean;
};

type FlowActionContext = {
  currentStep: StepId;
  hasCsvUpload: boolean;
  hasTemplateUpload: boolean;
  readyForMapping: boolean;
  readyForPreview: boolean;
  selectedCount: number;
  remainingPlaceholderCount: number;
  requireCompleteUploadForEdit?: boolean;
};

export const getFlowAction = ({
  currentStep,
  hasCsvUpload,
  hasTemplateUpload,
  readyForMapping,
  readyForPreview,
  selectedCount,
  remainingPlaceholderCount,
  requireCompleteUploadForEdit = false,
}: FlowActionContext): FlowAction | null => {
  switch (currentStep) {
    case "upload":
      if (requireCompleteUploadForEdit) {
        if (hasCsvUpload && hasTemplateUpload) {
          return {
            label: "Continue To Template Editing",
            shortLabel: "Continue",
            helper:
              "Both files are loaded. Open the editor to refine placeholder regions.",
            targetStep: "edit",
            enabled: true,
          };
        }

        return {
          label:
            hasTemplateUpload || hasCsvUpload
              ? "Upload The Remaining Source File"
              : "Upload Source Files To Continue",
          shortLabel: "Finish upload",
          helper:
            hasTemplateUpload || hasCsvUpload
              ? "Both the CSV dataset and SVG template are required before the editor unlocks."
              : "Load the CSV dataset and SVG template to unlock the editor.",
          targetStep: "edit",
          enabled: false,
        };
      }

      return {
        label: hasTemplateUpload
          ? "Continue To Template Editing"
          : "Upload SVG To Continue",
        shortLabel: hasTemplateUpload ? "Continue" : "Upload SVG",
        helper: hasTemplateUpload
          ? hasCsvUpload
            ? "Both files are loaded. Open the editor to refine placeholder regions."
            : "CSV can be uploaded now or right before mapping."
          : "The SVG template unlocks the editor and placeholder workflow.",
        targetStep: "edit",
        enabled: hasTemplateUpload,
      };
    case "edit":
      return {
        label: "Continue To Data Mapping",
        shortLabel: "Map Data",
        helper: readyForMapping
          ? "Template and CSV are ready. Connect each placeholder to a column."
          : "Upload a CSV dataset to unlock the data mapping step.",
        targetStep: "mapping",
        enabled: readyForMapping,
      };
    case "mapping":
      return {
        label: readyForPreview
          ? "Continue To Row Selection"
          : "Finish Mapping To Continue",
        shortLabel: readyForPreview ? "Continue" : "Finish mapping",
        helper: readyForPreview
          ? "Mapping is complete. Pick the rows you want to generate."
          : `${Math.max(remainingPlaceholderCount, 0)} placeholder${
              remainingPlaceholderCount === 1 ? "" : "s"
            } still need mapping.`,
        targetStep: "select",
        enabled: readyForPreview,
      };
    case "select":
      return {
        label:
          readyForPreview && selectedCount > 0
            ? "Open Preview"
            : "Select Rows To Preview",
        shortLabel:
          readyForPreview && selectedCount > 0 ? "Open preview" : "Select rows",
        helper:
          readyForPreview && selectedCount > 0
            ? "Preview is available with your current row selection."
            : "Select at least one row so cards can be generated.",
        targetStep: "preview",
        enabled: readyForPreview && selectedCount > 0,
      };
    default:
      return null;
  }
};
