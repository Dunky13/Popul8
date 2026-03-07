import React from "react";
import Icon from "../Icon/Icon";
import { useServiceWorkerUpdate } from "../../hooks/useServiceWorkerUpdate";
import styles from "./ServiceWorkerUpdateBanner.module.css";

export const ServiceWorkerUpdateBanner: React.FC = () => {
  const {
    isUpdateAvailable,
    isRefreshing,
    dismissUpdate,
    applyUpdate,
  } = useServiceWorkerUpdate();

  if (!isUpdateAvailable) {
    return null;
  }

  return (
    <div className={styles.updateBanner} role="status" aria-live="polite">
      <div className={styles.updateCopy}>
        <span className={styles.updateIconWrap}>
          <Icon name="download" size={16} ariaLabel="Update available" />
        </span>
        <div>
          <strong>Update available</strong>
          <p>A newer version is ready. Refresh to load the latest files.</p>
        </div>
      </div>
      <div className={styles.updateActions}>
        <button
          type="button"
          className={styles.updatePrimaryButton}
          onClick={applyUpdate}
          disabled={isRefreshing}
        >
          {isRefreshing ? "Refreshing..." : "Refresh now"}
        </button>
        <button
          type="button"
          className={styles.updateSecondaryButton}
          onClick={dismissUpdate}
          disabled={isRefreshing}
          aria-label="Dismiss update notice"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
  );
};
