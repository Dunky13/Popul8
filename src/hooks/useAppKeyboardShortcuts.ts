import { useEffect } from "react";
import { useAppStore } from "../store/appStore";
import { APP_EVENTS } from "../constants";
import type { StepId } from "../types/app";

type ShortcutEvent = {
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  key: string;
  preventDefault: () => void;
};

type ShortcutStore = {
  currentStep: StepId;
  setCurrentStep: (step: StepId) => void;
  isReadyForEdit: () => boolean;
  isReadyForMapping: () => boolean;
  isReadyForPreview: () => boolean;
};

const dispatchManagedPrintRequest = () => {
  window.setTimeout(() => {
    window.dispatchEvent(new Event(APP_EVENTS.PRINT_REQUEST));
  }, 50);
};

export const handleAppKeyboardShortcut = (
  event: ShortcutEvent,
  store: ShortcutStore,
  requestManagedPrint: () => void = dispatchManagedPrintRequest,
) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();

  switch (key) {
    case "p":
      if (event.shiftKey) {
        event.preventDefault();
        if (!store.isReadyForPreview()) {
          return;
        }
        if (store.currentStep !== "preview") {
          store.setCurrentStep("preview");
        }
        requestManagedPrint();
      }
      break;
    case "1":
      event.preventDefault();
      store.setCurrentStep("upload");
      break;
    case "2":
      event.preventDefault();
      if (store.isReadyForEdit()) {
        store.setCurrentStep("edit");
      }
      break;
    case "3":
      event.preventDefault();
      if (store.isReadyForMapping()) {
        store.setCurrentStep("mapping");
      }
      break;
    case "4":
      event.preventDefault();
      if (store.isReadyForPreview()) {
        store.setCurrentStep("select");
      }
      break;
    case "5":
      event.preventDefault();
      if (store.isReadyForPreview()) {
        store.setCurrentStep("preview");
      }
      break;
  }
};

export const useAppKeyboardShortcuts = () => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const store = useAppStore.getState();
      handleAppKeyboardShortcut(e, store);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
};
