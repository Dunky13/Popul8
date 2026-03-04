import check from "./check.svg";
import checklist from "./checklist.svg";
import close from "./close.svg";
import code from "./code.svg";
import darkMode from "./dark-mode.svg";
import download from "./download.svg";
import edit from "./edit.svg";
import error from "./error.svg";
import image from "./image.svg";
import infoOutline from "./info-outline.svg";
import lightMode from "./light-mode.svg";
import mouse from "./mouse.svg";
import print from "./print.svg";
import redo from "./redo.svg";
import schema from "./schema.svg";
import textFields from "./text-fields.svg";
import trash from "./trash.svg";
import undo from "./undo.svg";
import upload from "./upload.svg";
import visibility from "./visibility.svg";
import warning from "./warning.svg";
import wifiOff from "./wifi-off.svg";
import zoomIn from "./zoom-in.svg";
import zoomOut from "./zoom-out.svg";

export const materialIcons = {
  check,
  checklist,
  close,
  code,
  darkMode,
  download,
  edit,
  error,
  image,
  infoOutline,
  lightMode,
  mouse,
  print,
  redo,
  schema,
  textFields,
  trash,
  undo,
  upload,
  visibility,
  warning,
  wifiOff,
  zoomIn,
  zoomOut,
} as const;

export type MaterialIconName = keyof typeof materialIcons;
