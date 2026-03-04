import {
  fileMatchesAcceptedRules,
  parseAcceptedFileRules,
  type AcceptedFileRules,
} from "../utils/fileValidation";

export const normalizeDropAcceptRules = (
  accept: string[] = [],
): AcceptedFileRules => parseAcceptedFileRules(accept);

export const filterDroppedFilesByAcceptedRules = (
  files: File[],
  acceptedRules: AcceptedFileRules,
) => {
  return files.filter((file) => fileMatchesAcceptedRules(file, acceptedRules));
};
