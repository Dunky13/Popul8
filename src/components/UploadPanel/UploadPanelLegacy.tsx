import type {
  ButtonHTMLAttributes,
  DragEventHandler,
  MouseEventHandler,
  ReactNode,
} from "react";
import styles from "./UploadPanelLegacy.module.css";

export type UploadPanelTone = "csv" | "svg";

interface UploadPanelProps {
  tone: UploadPanelTone;
  title: string;
  description: ReactNode;
  icon: ReactNode;
  isDragging: boolean;
  dragText: ReactNode;
  dropText: ReactNode;
  subText?: ReactNode;
  onClick: MouseEventHandler<HTMLDivElement>;
  onDragOver: DragEventHandler<HTMLDivElement>;
  onDragLeave: DragEventHandler<HTMLDivElement>;
  onDrop: DragEventHandler<HTMLDivElement>;
  fileInputs: ReactNode;
  uploadProgress?: number;
  successMessage?: ReactNode;
  children?: ReactNode;
}

type UploadPanelButtonVariant = "primary" | "secondary" | "ghost";

interface UploadPanelButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: UploadPanelButtonVariant;
}

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function UploadPanel({
  tone,
  title,
  description,
  icon,
  isDragging,
  dragText,
  dropText,
  subText,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
  fileInputs,
  uploadProgress = 0,
  successMessage,
  children,
}: UploadPanelProps) {
  return (
    <section className={styles.panel} data-tone={tone}>
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        <div className={styles.description}>{description}</div>
      </div>

      <div
        className={joinClassNames(styles.dropZone, isDragging && styles.dragging)}
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className={styles.dropZoneContent}>
          <div className={styles.uploadIcon}>{icon}</div>
          {isDragging ? (
            <p className={styles.dragText}>{dragText}</p>
          ) : (
            <>
              <p className={styles.dropText}>{dropText}</p>
              {subText ? <p className={styles.subText}>{subText}</p> : null}
            </>
          )}
        </div>

        <div className={styles.fileInputs}>{fileInputs}</div>
      </div>

      {uploadProgress > 0 ? (
        <div className={styles.progressContainer}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className={styles.progressText}>{uploadProgress}%</span>
        </div>
      ) : null}

      {successMessage ? (
        <div className={styles.successMessage}>{successMessage}</div>
      ) : null}

      {children ? <div className={styles.content}>{children}</div> : null}
    </section>
  );
}

export function UploadPanelActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

export function UploadPanelButton({
  variant = "secondary",
  className,
  type = "button",
  ...props
}: UploadPanelButtonProps) {
  return (
    <button
      type={type}
      className={joinClassNames(
        styles.button,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "ghost" && styles.buttonGhost,
        className,
      )}
      {...props}
    />
  );
}
