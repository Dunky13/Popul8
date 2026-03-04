import React from "react";
import styles from "./TemplateEditor.module.css";

type DeletePlaceholderModalProps = {
  isOpen: boolean;
  placeholderName?: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export const DeletePlaceholderModal: React.FC<DeletePlaceholderModalProps> = ({
  isOpen,
  placeholderName,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalBackdrop} role="presentation" onClick={onClose}>
      <div
        className={styles.modalCard}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-placeholder-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h4 id="delete-placeholder-title" className={styles.modalTitle}>
          Delete placeholder?
        </h4>
        <p className={styles.modalText}>
          This will remove <strong>{placeholderName ?? "this placeholder"}</strong> from
          the SVG template.
        </p>
        <div className={styles.modalActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.dangerButtonInline}
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
