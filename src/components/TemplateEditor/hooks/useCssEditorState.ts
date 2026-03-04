import { useEffect, useMemo, useState } from "react";
import { buildCssDraft, countCssRuleBlocks, getSvgCssBlocks } from "../cssHelpers";

export const useCssEditorState = (svgContent: string | null) => {
  const [isOpen, setIsOpen] = useState(false);
  const [cssDraft, setCssDraft] = useState("");
  const [cssNotice, setCssNotice] = useState<string | null>(null);
  const [cssError, setCssError] = useState<string | null>(null);

  const embeddedCssBlocks = useMemo(
    () => (svgContent ? getSvgCssBlocks(svgContent) : []),
    [svgContent],
  );

  const embeddedCss = useMemo(
    () => buildCssDraft(embeddedCssBlocks),
    [embeddedCssBlocks],
  );

  const cssRuleCount = useMemo(
    () => countCssRuleBlocks(cssDraft || embeddedCss),
    [cssDraft, embeddedCss],
  );

  useEffect(() => {
    if (!svgContent) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCssDraft(buildCssDraft(embeddedCssBlocks));
    setCssNotice(null);
    setCssError(null);
  }, [embeddedCssBlocks, svgContent]);

  return {
    cssDraft,
    cssError,
    cssNotice,
    cssRuleCount,
    embeddedCss,
    embeddedCssBlocks,
    isOpen,
    setCssDraft,
    setCssError,
    setCssNotice,
    setIsOpen,
  };
};
