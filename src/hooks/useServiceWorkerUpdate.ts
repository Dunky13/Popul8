import React from "react";

type ServiceWorkerUpdateState = {
  isUpdateAvailable: boolean;
  isRefreshing: boolean;
  dismissUpdate: () => void;
  applyUpdate: () => void;
};

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

const canUseServiceWorker = () =>
  import.meta.env.PROD &&
  typeof window !== "undefined" &&
  "serviceWorker" in navigator;

export const useServiceWorkerUpdate = (): ServiceWorkerUpdateState => {
  const [isUpdateAvailable, setIsUpdateAvailable] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const registrationRef =
    React.useRef<ServiceWorkerRegistration | null>(null);
  const hasReloadedRef = React.useRef(false);

  React.useEffect(() => {
    if (!canUseServiceWorker()) {
      return;
    }

    let isDisposed = false;
    let currentInstallingWorker: ServiceWorker | null = null;

    const exposeWaitingWorker = (
      registration: ServiceWorkerRegistration | null,
    ) => {
      if (registration?.waiting) {
        registrationRef.current = registration;
        setIsUpdateAvailable(true);
      }
    };

    const handleControllerChange = () => {
      if (hasReloadedRef.current) return;
      hasReloadedRef.current = true;
      window.location.reload();
    };

    const handleUpdateFound = () => {
      const registration = registrationRef.current;
      if (!registration) return;

      const installingWorker = registration.installing;
      if (!installingWorker || installingWorker === currentInstallingWorker) {
        return;
      }

      currentInstallingWorker = installingWorker;
      installingWorker.addEventListener("statechange", () => {
        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          exposeWaitingWorker(registration);
        }
      });
    };

    const checkForUpdates = () => {
      const registration = registrationRef.current;
      if (!registration) return;

      void registration.update().catch(() => {
        // Avoid noisy logs for periodic background checks.
      });
    };

    void navigator.serviceWorker.ready.then((registration) => {
      if (isDisposed) return;

      registrationRef.current = registration;
      exposeWaitingWorker(registration);
      registration.addEventListener("updatefound", handleUpdateFound);
      checkForUpdates();
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    };

    window.addEventListener("online", checkForUpdates);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        checkForUpdates();
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      window.removeEventListener("online", checkForUpdates);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
      registrationRef.current?.removeEventListener(
        "updatefound",
        handleUpdateFound,
      );
      currentInstallingWorker = null;
    };
  }, []);

  const dismissUpdate = React.useCallback(() => {
    setIsUpdateAvailable(false);
  }, []);

  const applyUpdate = React.useCallback(() => {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) return;

    hasReloadedRef.current = false;
    setIsRefreshing(true);
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, []);

  return {
    isUpdateAvailable,
    isRefreshing,
    dismissUpdate,
    applyUpdate,
  };
};
