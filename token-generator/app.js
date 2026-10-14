const state = {
  tokens: [],
  settings: {
    tokenSizeIn: 1,
    borderEnabled: true,
    borderWidthMm: 1,
    borderStyle: "gilded",
    borderColor: "#c89b6a",
    tokenBgColor: "#ffffff",
    pageSize: "A4",
    orientation: "portrait",
    marginIn: 0.5,
  },
};

const pageSizes = {
  A4: { width: 8.27, height: 11.69 },
  Letter: { width: 8.5, height: 11 },
};

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const tokenGrid = document.getElementById("tokenGrid");
const tokenList = document.getElementById("tokenList");
const statusText = document.getElementById("statusText");
const printBtn = document.getElementById("printBtn");
const clearBtn = document.getElementById("clearBtn");

const tokenSizeInput = document.getElementById("tokenSize");
const borderToggle = document.getElementById("borderToggle");
const borderWidthInput = document.getElementById("borderWidth");
const borderStyleInput = document.getElementById("borderStyle");
const borderColorInput = document.getElementById("borderColor");
const borderColorHexInput = document.getElementById("borderColorHex");
const tokenBgColorInput = document.getElementById("tokenBgColor");
const tokenBgColorHexInput = document.getElementById("tokenBgColorHex");
const pageSizeInput = document.getElementById("pageSize");
const orientationInput = document.getElementById("orientation");
const pageMarginInput = document.getElementById("pageMargin");

const pageStyleTag = document.createElement("style");
pageStyleTag.id = "dynamic-page-style";
document.head.appendChild(pageStyleTag);

const numberPattern = /^-?\d+$/;
const hexPattern = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(value, fallback = "#c89b6a") {
  if (!value) return fallback;
  const match = value.trim().match(hexPattern);
  if (!match) return fallback;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  return `#${hex.toLowerCase()}`;
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  const value = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }) {
  const clamp = (value) => Math.max(0, Math.min(255, Math.round(value)));
  const toHex = (value) => clamp(value).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixColors(color, target, amount) {
  return {
    r: color.r + (target.r - color.r) * amount,
    g: color.g + (target.g - color.g) * amount,
    b: color.b + (target.b - color.b) * amount,
  };
}

function deriveBorderTones(color) {
  const baseHex = normalizeHex(color);
  const base = hexToRgb(baseHex);
  const highlight = rgbToHex(mixColors(base, { r: 255, g: 255, b: 255 }, 0.55));
  const mid = rgbToHex(mixColors(base, { r: 255, g: 255, b: 255 }, 0.25));
  const shadow = rgbToHex(mixColors(base, { r: 0, g: 0, b: 0 }, 0.35));
  return { base: baseHex, highlight, mid, shadow };
}

function syncColorInputs(colorInput, hexInput, value) {
  const normalized = normalizeHex(value, colorInput.value);
  colorInput.value = normalized;
  hexInput.value = normalized;
  return normalized;
}

function updatePageStyles() {
  const dims = pageSizes[state.settings.pageSize];
  const isPortrait = state.settings.orientation === "portrait";
  const width = isPortrait ? dims.width : dims.height;
  const height = isPortrait ? dims.height : dims.width;

  document.documentElement.style.setProperty("--page-width", `${width}in`);
  document.documentElement.style.setProperty("--page-height", `${height}in`);
  document.documentElement.style.setProperty(
    "--page-margin",
    `${state.settings.marginIn}in`
  );

  pageStyleTag.textContent = `@page { size: ${width}in ${height}in; margin: ${state.settings.marginIn}in; }`;
}

function updateTokenStyles() {
  const baseWidth = state.settings.borderEnabled
    ? Math.max(0, state.settings.borderWidthMm)
    : 0;
  const tones = deriveBorderTones(state.settings.borderColor);
  const tokenBg = normalizeHex(state.settings.tokenBgColor, "#ffffff");

  document.documentElement.style.setProperty(
    "--token-size",
    `${state.settings.tokenSizeIn}in`
  );
  document.documentElement.style.setProperty(
    "--border-width",
    `${baseWidth}mm`
  );
  document.documentElement.style.setProperty(
    "--border-color",
    tones.base
  );
  document.documentElement.style.setProperty(
    "--border-highlight",
    tones.highlight
  );
  document.documentElement.style.setProperty(
    "--border-mid",
    tones.mid
  );
  document.documentElement.style.setProperty(
    "--border-shadow",
    tones.shadow
  );
  document.documentElement.style.setProperty("--token-bg", tokenBg);
  document.documentElement.dataset.borderStyle = state.settings.borderStyle;
  document.documentElement.dataset.borderDisabled = state.settings.borderEnabled
    ? "false"
    : "true";
}

function applySettings() {
  updatePageStyles();
  updateTokenStyles();
}

function createToken(file) {
  return {
    id: `${file.name}-${file.lastModified}-${Math.random().toString(16).slice(2)}`,
    name: file.name,
    url: URL.createObjectURL(file),
    number: "",
  };
}

function addFiles(files) {
  const incoming = Array.from(files || []);
  const imageFiles = incoming.filter((file) => file.type.startsWith("image/"));
  const rejected = incoming.length - imageFiles.length;

  if (imageFiles.length === 0) {
    statusText.textContent = "No image files detected.";
    return;
  }

  const newTokens = imageFiles.map(createToken);
  state.tokens = [...state.tokens, ...newTokens];

  statusText.textContent = rejected
    ? `Added ${imageFiles.length} image(s). Skipped ${rejected} non-image file(s).`
    : `Added ${imageFiles.length} image(s).`;

  render();
}

function removeToken(id) {
  const index = state.tokens.findIndex((token) => token.id === id);
  if (index === -1) return;
  const [removed] = state.tokens.splice(index, 1);
  if (removed?.url) URL.revokeObjectURL(removed.url);
  render();
}

function clearTokens() {
  state.tokens.forEach((token) => URL.revokeObjectURL(token.url));
  state.tokens = [];
  render();
  statusText.textContent = "Cleared all tokens.";
}

function renderEmptyState() {
  tokenList.innerHTML = "";
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = "Drop images to create tokens.";
  tokenList.appendChild(empty);
  tokenGrid.innerHTML = "";
}

function render() {
  applySettings();

  if (state.tokens.length === 0) {
    renderEmptyState();
    return;
  }

  tokenList.innerHTML = "";
  tokenGrid.innerHTML = "";

  state.tokens.forEach((token) => {
    const row = document.createElement("div");
    row.className = "token-row";

    const thumb = document.createElement("img");
    thumb.src = token.url;
    thumb.alt = token.name;

    const name = document.createElement("div");
    name.textContent = token.name;
    name.title = token.name;

    const numberInput = document.createElement("input");
    numberInput.type = "text";
    numberInput.inputMode = "numeric";
    numberInput.placeholder = "none";
    numberInput.value = token.number;
    numberInput.addEventListener("input", (event) => {
      token.number = event.target.value.trim();
      updateTokenBadge(token);
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeToken(token.id));

    row.append(thumb, name, numberInput, removeBtn);
    tokenList.appendChild(row);

    const tile = document.createElement("div");
    tile.className = "token";
    tile.dataset.id = token.id;

    const inner = document.createElement("div");
    inner.className = "token-inner";

    const tileImg = document.createElement("img");
    tileImg.src = token.url;
    tileImg.alt = token.name;
    inner.appendChild(tileImg);
    tile.appendChild(inner);

    const badge = buildNumberBadge(token.number);
    if (badge) tile.appendChild(badge);

    tokenGrid.appendChild(tile);
  });
}

function buildNumberBadge(value) {
  if (!numberPattern.test(value)) return null;
  const badge = document.createElement("div");
  badge.className = "token-number";
  badge.textContent = value;
  return badge;
}

function updateTokenBadge(token) {
  const tile = tokenGrid.querySelector(`[data-id="${token.id}"]`);
  if (!tile) return;
  const existing = tile.querySelector(".token-number");
  const nextBadge = buildNumberBadge(token.number);
  if (!nextBadge && existing) {
    existing.remove();
    return;
  }
  if (nextBadge && !existing) {
    tile.appendChild(nextBadge);
    return;
  }
  if (existing && nextBadge) {
    existing.textContent = nextBadge.textContent;
  }
}

function handleDragOver(event) {
  event.preventDefault();
  dropZone.classList.add("is-dragging");
}

function handleDragLeave() {
  dropZone.classList.remove("is-dragging");
}

function handleDrop(event) {
  event.preventDefault();
  dropZone.classList.remove("is-dragging");
  addFiles(event.dataTransfer.files);
}

fileInput.addEventListener("change", (event) => {
  addFiles(event.target.files);
  event.target.value = "";
});

["dragenter", "dragover"].forEach((type) =>
  dropZone.addEventListener(type, handleDragOver)
);
["dragleave", "dragend"].forEach((type) =>
  dropZone.addEventListener(type, handleDragLeave)
);
dropZone.addEventListener("drop", handleDrop);

printBtn.addEventListener("click", () => window.print());
clearBtn.addEventListener("click", clearTokens);

function parseNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

tokenSizeInput.addEventListener("input", (event) => {
  state.settings.tokenSizeIn = Math.max(
    0.25,
    parseNumber(event.target.value, 1)
  );
  render();
});

borderToggle.addEventListener("change", (event) => {
  state.settings.borderEnabled = event.target.checked;
  render();
});

borderWidthInput.addEventListener("input", (event) => {
  state.settings.borderWidthMm = Math.max(
    0,
    parseNumber(event.target.value, 1)
  );
  render();
});

borderStyleInput.addEventListener("change", (event) => {
  state.settings.borderStyle = event.target.value;
  render();
});

borderColorInput.addEventListener("input", (event) => {
  state.settings.borderColor = syncColorInputs(
    borderColorInput,
    borderColorHexInput,
    event.target.value
  );
  render();
});

borderColorHexInput.addEventListener("change", (event) => {
  state.settings.borderColor = syncColorInputs(
    borderColorInput,
    borderColorHexInput,
    event.target.value
  );
  render();
});

tokenBgColorInput.addEventListener("input", (event) => {
  state.settings.tokenBgColor = syncColorInputs(
    tokenBgColorInput,
    tokenBgColorHexInput,
    event.target.value
  );
  render();
});

tokenBgColorHexInput.addEventListener("change", (event) => {
  state.settings.tokenBgColor = syncColorInputs(
    tokenBgColorInput,
    tokenBgColorHexInput,
    event.target.value
  );
  render();
});

pageSizeInput.addEventListener("change", (event) => {
  state.settings.pageSize = event.target.value;
  render();
});

orientationInput.addEventListener("change", (event) => {
  state.settings.orientation = event.target.value;
  render();
});

pageMarginInput.addEventListener("input", (event) => {
  state.settings.marginIn = Math.max(
    0,
    parseNumber(event.target.value, 0.5)
  );
  render();
});

render();
