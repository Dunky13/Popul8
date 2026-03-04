import React from "react";
import styles from "./TemplateEditor.module.css";
import { buildGoogleFontsUrl, updateSvgWithFontLink } from "../../utils/svgFonts";
import { useFontUrlInputs } from "./hooks/useFontUrlInputs";

type FontSourcesPanelProps = {
  mode: {
    isAdvanced: boolean;
  };
  sources: {
    svgContent: string | null;
    missingFontCount: number;
    fontUsage: {
      fonts: string[];
      embeddedFonts: Set<string>;
      linkedFonts: Record<string, string>;
    };
    autoGoogleFontUrl: string | null;
    autoLinkFonts: string[];
    inferredFontWeights: Record<string, number[]>;
  };
  actions: {
    onApplyContent: (updatedContent: string) => void;
    onError: (message: string) => void;
  };
};

export const FontSourcesPanel: React.FC<FontSourcesPanelProps> = ({
  mode,
  sources,
  actions,
}) => {
  const { isAdvanced } = mode;
  const {
    svgContent,
    missingFontCount,
    fontUsage,
    autoGoogleFontUrl,
    autoLinkFonts,
    inferredFontWeights,
  } = sources;
  const { onApplyContent, onError } = actions;
  const { fontUrlInputs, setFontUrl } = useFontUrlInputs({
    svgContent,
    fontUsage,
    autoGoogleFontUrl,
    autoLinkFonts,
  });

  const handleFontUrlChange = (fontName: string, value: string) => {
    setFontUrl(fontName, value);
  };

  const handleSuggestFontUrl = (fontName: string) => {
    const suggestion = buildGoogleFontsUrl([fontName], inferredFontWeights);
    if (!suggestion) return;
    setFontUrl(fontName, suggestion);
  };

  const handleLinkFont = (fontName: string) => {
    if (!svgContent) return;
    const url = (fontUrlInputs[fontName] ?? "").trim();
    if (!url) {
      onError("Provide a font URL to link.");
      return;
    }
    const updated = updateSvgWithFontLink(svgContent, fontName, url);
    onApplyContent(updated);
  };

  if (!isAdvanced) return null;

  return (
    <details className={`${styles.fontCard} ${styles.collapsibleDisclosure}`}>
      <summary className={styles.collapsibleSummary}>
        <div className={styles.collapsibleTitle}>
          <span className={styles.collapsibleIcon} aria-hidden="true" />
          <h4>Font Sources</h4>
        </div>
        <div className={styles.collapsibleMeta}>
          <span
            className={`${styles.fontSummaryChip} ${
              missingFontCount > 0
                ? styles.fontSummaryChipMissing
                : styles.fontSummaryChipOk
            }`}
          >
            Missing {missingFontCount}
          </span>
          <span className={styles.collapsibleHint}>Click to expand</span>
        </div>
      </summary>
      <div className={styles.collapsibleBody}>
        <p>Detected fonts from the SVG. Link a font to load it dynamically.</p>
        {fontUsage.fonts.length === 0 ? (
          <div className={styles.selectionHint}>
            No custom fonts detected in this SVG.
          </div>
        ) : (
          <div className={styles.fontList}>
            {fontUsage.fonts.map((font) => {
              const isEmbedded = fontUsage.embeddedFonts.has(font);
              const autoLinked =
                autoGoogleFontUrl && autoLinkFonts.includes(font);
              const linkedUrl =
                fontUsage.linkedFonts[font] ??
                (autoLinked ? autoGoogleFontUrl : undefined);
              const status = isEmbedded
                ? "Embedded"
                : linkedUrl
                  ? "Linked"
                  : "Missing";
              const statusClass =
                status === "Missing"
                  ? styles.fontStatusMissing
                  : status === "Linked"
                    ? styles.fontStatusLinked
                    : styles.fontStatusEmbedded;
              return (
                <div key={font} className={styles.fontRow}>
                  <div className={styles.fontRowHeader}>
                    <div className={styles.fontName}>{font}</div>
                    <span className={`${styles.fontStatus} ${statusClass}`}>
                      {status}
                    </span>
                  </div>
                  <div className={styles.fontInputRow}>
                    <input
                      className={styles.fontInput}
                      type="url"
                      placeholder="https://fonts.googleapis.com/..."
                      value={fontUrlInputs[font] ?? ""}
                      onChange={(e) => handleFontUrlChange(font, e.target.value)}
                      disabled={isEmbedded}
                    />
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => handleSuggestFontUrl(font)}
                      disabled={isEmbedded}
                    >
                      Suggest
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => handleLinkFont(font)}
                      disabled={isEmbedded || !(fontUrlInputs[font] ?? "").trim()}
                    >
                      {linkedUrl ? "Update Link" : "Link Font"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className={styles.helperNote}>
          Linked fonts are stored in the SVG via comments and <code>@import</code>
          rules so the template stays portable.
        </div>
      </div>
    </details>
  );
};
