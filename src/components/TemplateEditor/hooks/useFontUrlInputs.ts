import { useEffect, useState } from "react";

type FontUsage = {
  fonts: string[];
  embeddedFonts: Set<string>;
  linkedFonts: Record<string, string>;
};

type UseFontUrlInputsArgs = {
  svgContent: string | null;
  fontUsage: FontUsage;
  autoGoogleFontUrl: string | null;
  autoLinkFonts: string[];
};

export const useFontUrlInputs = ({
  svgContent,
  fontUsage,
  autoGoogleFontUrl,
  autoLinkFonts,
}: UseFontUrlInputsArgs) => {
  const [fontUrlInputs, setFontUrlInputs] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontUrlInputs({});
  }, [svgContent]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFontUrlInputs((prev) => {
      const next: Record<string, string> = { ...prev };
      fontUsage.fonts.forEach((font) => {
        const linked = fontUsage.linkedFonts[font];
        if (linked) {
          next[font] = linked;
          return;
        }
        if (
          (!next[font] || !next[font].trim()) &&
          autoGoogleFontUrl &&
          autoLinkFonts.includes(font)
        ) {
          next[font] = autoGoogleFontUrl;
          return;
        }
        if (next[font] === undefined) {
          next[font] = "";
        }
      });
      return next;
    });
  }, [autoGoogleFontUrl, autoLinkFonts, fontUsage]);

  const setFontUrl = (fontName: string, value: string) => {
    setFontUrlInputs((prev) => ({ ...prev, [fontName]: value }));
  };

  return { fontUrlInputs, setFontUrl };
};
