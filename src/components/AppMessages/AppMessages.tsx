import React from "react";
import { useAppStore } from "../../store/appStore";
import { useShallow } from "zustand/react/shallow";
import Icon from "../Icon/Icon";
import styles from "../../styles/App.module.css";

export const AppMessages: React.FC = () => {
  const {
    errors,
    warnings,
    clearErrors,
    clearWarnings,
    setErrors,
    setWarnings,
  } = useAppStore(
    useShallow((state) => ({
      errors: state.errors,
      warnings: state.warnings,
      clearErrors: state.clearErrors,
      clearWarnings: state.clearWarnings,
      setErrors: state.setErrors,
      setWarnings: state.setWarnings,
    })),
  );

  if (errors.length === 0 && warnings.length === 0) return null;

  return (
    <div className={styles.messages}>
      {errors.length > 0 && (
        <div className={styles.errors}>
          <h3>
            <Icon name="error" size={20} />
            Errors ({errors.length})
          </h3>
          <ul>
            {errors.map((error, index) => (
              <li key={`error-${index}`}>
                <span className={styles.errorText}>{error}</span>
                <button
                  onClick={() => {
                    const nextErrors = errors.filter((_, i) => i !== index);
                    setErrors(nextErrors);
                  }}
                  className={styles.dismissButton}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button onClick={clearErrors} className={styles.clearAllButton}>
            Clear All Errors
          </button>
        </div>
      )}

      {warnings.length > 0 && (
        <div className={styles.warnings}>
          <h3>
            <Icon name="warning" size={20} />
            Warnings ({warnings.length})
          </h3>
          <ul>
            {warnings.map((warning, index) => (
              <li key={`warning-${index}`}>
                <span className={styles.warningText}>{warning}</span>
                <button
                  onClick={() => {
                    const nextWarnings = warnings.filter((_, i) => i !== index);
                    setWarnings(nextWarnings);
                  }}
                  className={styles.dismissButton}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
          <button onClick={clearWarnings} className={styles.clearAllButton}>
            Clear All Warnings
          </button>
        </div>
      )}
    </div>
  );
};
