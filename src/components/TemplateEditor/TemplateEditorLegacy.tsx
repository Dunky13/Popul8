import React, { useEffect, useMemo } from "react";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import { parseSVGTemplate } from "../../utils/svgManipulator";
import { stripSvgExtension } from "../../utils/regexUtils";
import styles from "./TemplateEditorLegacy.module.css";
import { TemplateEditorEmptyState } from "./TemplateEditorEmptyState";
import { TemplateEditorWorkspace } from "./TemplateEditorWorkspaceLegacy";
import { useTemplateContent } from "./hooks/useTemplateContent";
import { useEditorSettings } from "./hooks/useEditorSettings";

export const TemplateEditor: React.FC = () => {
  const { svgTemplate, setSvgTemplate } = useAppStore(
    useShallow((state) => ({
      svgTemplate: state.svgTemplate,
      setSvgTemplate: state.setSvgTemplate,
    })),
  );
  const {
    localContent,
    handleApplyContent,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
  } = useTemplateContent(svgTemplate, setSvgTemplate);
  const {
    viewMode,
    setViewMode,
    isAdvanced,
    hasEnabledAdvancedBefore,
    setIsAdvanced,
  } = useEditorSettings();

  const contentSummary = useMemo(() => {
    if (!localContent) return null;
    const template = parseSVGTemplate(localContent, svgTemplate?.fileName);
    return {
      placeholders: template.placeholders,
      elementIds: template.elementIds,
    };
  }, [localContent, svgTemplate?.fileName]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (viewMode !== "visual") return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, viewMode]);

  const handleDownload = () => {
    if (!localContent) return;
    const fileName = svgTemplate?.fileName
      ? stripSvgExtension(svgTemplate.fileName)
      : "template";
    const blob = new Blob([localContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}-edited.svg`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  if (!svgTemplate || !localContent) {
    return <TemplateEditorEmptyState />;
  }

  return (
    <div className={styles.editor}>
      <TemplateEditorWorkspace
        view={{ mode: viewMode, isAdvanced, hasEnabledAdvancedBefore }}
        content={{
          localContent,
          summary: contentSummary,
          onApplyContent: handleApplyContent,
        }}
        meta={{
          fileName: svgTemplate.fileName ?? "Untitled",
          placeholderCount: contentSummary?.placeholders.length ?? 0,
          elementIdCount: contentSummary?.elementIds.length ?? 0,
          onDownload: handleDownload,
          onToggleAdvanced: setIsAdvanced,
          onSetViewMode: setViewMode,
          onUndo: handleUndo,
          onRedo: handleRedo,
          canUndo,
          canRedo,
        }}
      />
    </div>
  );
};
