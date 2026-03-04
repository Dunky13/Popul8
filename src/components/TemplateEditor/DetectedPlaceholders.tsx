import React, { useMemo, useState } from "react";
import type { PlaceholderBlock } from "./types";
import styles from "./TemplateEditor.module.css";

type DetectedPlaceholdersProps = {
  placeholderBlocks: PlaceholderBlock[];
  selectedPlaceholderId?: string | null;
  onSelect: (block: PlaceholderBlock) => void;
};

export const DetectedPlaceholders: React.FC<DetectedPlaceholdersProps> = ({
  placeholderBlocks,
  selectedPlaceholderId,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const nameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    placeholderBlocks.forEach((block) => {
      counts.set(block.name, (counts.get(block.name) ?? 0) + 1);
    });
    return counts;
  }, [placeholderBlocks]);

  const duplicateNameCount = useMemo(
    () => Array.from(nameCounts.values()).filter((count) => count > 1).length,
    [nameCounts],
  );

  const visibleBlocks = useMemo(
    () =>
      placeholderBlocks.filter((block) => {
        const isDuplicate = (nameCounts.get(block.name) ?? 0) > 1;
        if (showDuplicatesOnly && !isDuplicate) return false;
        if (normalizedQuery.length === 0) return true;
        if (block.name.toLowerCase().includes(normalizedQuery)) return true;
        return String(block.index + 1).includes(normalizedQuery);
      }),
    [nameCounts, normalizedQuery, placeholderBlocks, showDuplicatesOnly],
  );

  if (placeholderBlocks.length === 0) return null;

  return (
    <div className={styles.listCard}>
      <h4>Detected Placeholders</h4>
      <div className={styles.placeholderToolsRow}>
        <label className={styles.placeholderSearchLabel}>
          Filter
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={styles.placeholderSearchInput}
            placeholder="Search name or index"
          />
        </label>
        <button
          type="button"
          className={`${styles.placeholderFilterButton} ${
            showDuplicatesOnly ? styles.placeholderFilterButtonActive : ""
          }`}
          onClick={() => setShowDuplicatesOnly((prev) => !prev)}
        >
          {showDuplicatesOnly ? "Showing duplicates" : "Duplicates only"}
        </button>
        <span className={styles.placeholderCountChip}>
          {visibleBlocks.length} / {placeholderBlocks.length}
        </span>
      </div>
      {duplicateNameCount > 0 && (
        <div className={styles.placeholderSummaryRow}>
          <span className={styles.placeholderSummaryChip}>
            {duplicateNameCount} duplicate name
            {duplicateNameCount === 1 ? "" : "s"}
          </span>
        </div>
      )}
      <div className={styles.placeholderList}>
        {visibleBlocks.map((block) => {
          const duplicateCount = nameCounts.get(block.name) ?? 0;
          const isDuplicate = duplicateCount > 1;
          return (
          <button
            key={block.id}
            className={`${styles.placeholderChip} ${
              selectedPlaceholderId === block.id
                ? styles.placeholderChipActive
                : ""
            } ${isDuplicate ? styles.placeholderChipDuplicate : ""}`}
            type="button"
            onClick={() => {
              onSelect(block);
            }}
          >
            {block.name}{" "}
            <span className={styles.placeholderIndex}>#{block.index + 1}</span>
            {isDuplicate && (
              <span className={styles.placeholderDuplicateBadge}>
                {duplicateCount}x
              </span>
            )}
          </button>
          );
        })}
        {visibleBlocks.length === 0 && (
          <div className={styles.placeholderEmptyState}>
            No placeholders match this filter.
          </div>
        )}
      </div>
    </div>
  );
};
