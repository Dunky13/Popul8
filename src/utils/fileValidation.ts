export type FileValidator = (file: File) => string | null;

export type AcceptedFileRules = {
  extensions: string[];
  mimeTypes: string[];
  wildcardMimePrefixes: string[];
};

const hasAcceptedRules = (rules: AcceptedFileRules) => {
  return (
    rules.extensions.length > 0 ||
    rules.mimeTypes.length > 0 ||
    rules.wildcardMimePrefixes.length > 0
  );
};

const formatAcceptedRules = (rules: AcceptedFileRules) => {
  const wildcardMimeTokens = rules.wildcardMimePrefixes.map(
    (prefix) => `${prefix}*`,
  );
  const tokens = [
    ...rules.extensions,
    ...rules.mimeTypes,
    ...wildcardMimeTokens,
  ];
  return tokens.join(", ");
};

const dedupeValues = (values: string[]) => {
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    deduped.push(value);
  }
  return deduped;
};

export const parseAcceptedFileRules = (
  accept?: string | string[],
): AcceptedFileRules => {
  const entries =
    typeof accept === "string"
      ? accept.split(",")
      : Array.isArray(accept)
      ? accept.flatMap((value) => value.split(","))
      : [];

  const extensions: string[] = [];
  const mimeTypes: string[] = [];
  const wildcardMimePrefixes: string[] = [];

  for (const rawEntry of entries) {
    const entry = rawEntry.trim().toLowerCase();
    if (!entry) continue;

    if (entry.startsWith(".")) {
      extensions.push(entry);
      continue;
    }

    if (entry.includes("/")) {
      if (entry.endsWith("/*")) {
        wildcardMimePrefixes.push(entry.slice(0, -1));
      } else {
        mimeTypes.push(entry);
      }
      continue;
    }

    extensions.push(`.${entry}`);
  }

  return {
    extensions: dedupeValues(extensions),
    mimeTypes: dedupeValues(mimeTypes),
    wildcardMimePrefixes: dedupeValues(wildcardMimePrefixes),
  };
};

export const parseAcceptedExtensions = (
  accept?: string | string[],
): string[] => {
  return parseAcceptedFileRules(accept).extensions;
};

export const fileMatchesAcceptedRules = (
  file: File,
  rules: AcceptedFileRules,
) => {
  if (!hasAcceptedRules(rules)) return true;

  const fileName = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const extensionMatches = rules.extensions.some((extension) =>
    fileName.endsWith(extension),
  );
  const mimeTypeMatches = rules.mimeTypes.includes(mimeType);
  const wildcardMimeMatches = rules.wildcardMimePrefixes.some((prefix) =>
    mimeType.startsWith(prefix),
  );

  return extensionMatches || mimeTypeMatches || wildcardMimeMatches;
};

export const validateFileInput = ({
  file,
  accept,
  maxSize,
  validator,
  acceptedExtensions,
  acceptedRules,
}: {
  file: File;
  accept?: string;
  maxSize?: number;
  validator?: FileValidator;
  acceptedExtensions?: string[];
  acceptedRules?: AcceptedFileRules;
}): string | null => {
  const rules =
    acceptedRules ??
    (acceptedExtensions
      ? {
          extensions: acceptedExtensions,
          mimeTypes: [],
          wildcardMimePrefixes: [],
        }
      : parseAcceptedFileRules(accept));

  if (!fileMatchesAcceptedRules(file, rules)) {
    const acceptedLabel =
      accept?.trim() || formatAcceptedRules(rules) || "supported";
    return `Please upload only ${acceptedLabel} files`;
  }

  if (maxSize && file.size > maxSize) {
    return `File size exceeds maximum limit of ${Math.round(
      maxSize / 1024 / 1024,
    )}MB`;
  }

  if (validator) {
    return validator(file);
  }

  return null;
};
