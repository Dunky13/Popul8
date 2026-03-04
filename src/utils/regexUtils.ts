export const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const createPlaceholderRegex = (name: string, flags?: string) =>
  new RegExp(`\\{\\{\\s*${escapeRegExp(name)}\\s*\\}\\}`, flags);

export const createPlaceholderCaptureRegex = () => /\{\{\s*([^}]+?)\s*\}\}/g;

export const replacePlaceholderTokens = (
  value: string,
  prevName: string,
  nextName: string,
) => {
  if (!value || !prevName || prevName === nextName) return value;
  const pattern = createPlaceholderRegex(prevName, "g");
  return value.replace(pattern, `{{${nextName}}}`);
};

export const extractPlaceholdersFromString = (value: string) => {
  const matches: string[] = [];
  if (!value) return matches;
  const regex = createPlaceholderCaptureRegex();
  let match;
  while ((match = regex.exec(value)) !== null) {
    const name = match[1]?.trim();
    if (name) {
      matches.push(name);
    }
  }
  return matches;
};

export const normalizePlaceholderName = (value: string): string => {
  const trimmed = value.trim();
  const hasRequiredSuffix = trimmed.endsWith("!");
  const base = hasRequiredSuffix ? trimmed.slice(0, -1) : trimmed;
  let normalized = base
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_-]/g, "_");
  if (!normalized) return "";
  if (!/^[A-Za-z_]/.test(normalized)) {
    normalized = `field_${normalized}`;
  }
  return hasRequiredSuffix ? `${normalized}!` : normalized;
};

export const escapeXmlText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export const applyPlaceholderTemplate = (template: string, data: {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}) =>
  template
    .replace(/\{\{\s*placeholder\s*\}\}/g, `{{${data.name}}}`)
    .replace(/\{\{\s*name\s*\}\}/g, data.name)
    .replace(/\{\{\s*x\s*\}\}/g, String(data.x))
    .replace(/\{\{\s*y\s*\}\}/g, String(data.y))
    .replace(/\{\{\s*width\s*\}\}/g, String(data.width))
    .replace(/\{\{\s*height\s*\}\}/g, String(data.height));

export const stripSvgExtension = (fileName: string) =>
  fileName.replace(/\.svg$/i, "");

export const parseFirstNumberToken = (value: string | null) => {
  if (!value) return Number.NaN;
  const token = value.split(/[ ,]+/)[0];
  return Number.parseFloat(token);
};

export const createOpenTagRegex = (tagName: string) =>
  new RegExp(`<${tagName}\\b[^>]*?>`, "g");

export const createCloseTagRegex = (tagName: string) =>
  new RegExp(`</${tagName}\\b[^>]*?>`, "g");

export const matchOpenTag = (value: string) =>
  value.match(/<([A-Za-z][\w:-]*)\b[^>]*?>/);

export const matchSvgOpenTag = (value: string) =>
  value.match(/<svg\b[^>]*?>/i);

export const matchTagNameFromOpenTag = (value: string) =>
  value.match(/^<\s*([\w:-]+)/i);

export const matchFontSize = (value: string) =>
  value.match(/font-size\s*:\s*([^;]+)/i);

export const matchFontSizeLoose = (value: string) =>
  value.match(/font-size\s*:\s*([^;!]+)/i);

export const isNumericString = (value: string) =>
  /^\d+(\.\d+)?$/.test(value);
