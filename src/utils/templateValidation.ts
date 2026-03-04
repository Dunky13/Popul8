export const TEMPLATE_WARNING_PREFIX = "Warning:";

export const isTemplateValidationWarning = (message: string) => {
  return message.startsWith(TEMPLATE_WARNING_PREFIX);
};

export const handleTemplateValidationMessages = (
  messages: string[],
  onWarning?: (message: string) => void,
) => {
  for (const message of messages) {
    if (isTemplateValidationWarning(message)) {
      onWarning?.(message);
      continue;
    }
    throw new Error(message);
  }
};
