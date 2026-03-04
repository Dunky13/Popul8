import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const CODE_HIGHLIGHT_STYLE = HighlightStyle.define([
  { tag: tags.comment, color: "#9fb4d8", fontStyle: "italic" },
  { tag: tags.meta, color: "#7aa2f7" },
  { tag: tags.keyword, color: "#c8a6ff" },
  { tag: [tags.name, tags.attributeName], color: "#ffd580" },
  { tag: tags.tagName, color: "#7ee787", fontWeight: "600" },
  { tag: tags.string, color: "#ffb86b" },
  { tag: [tags.number, tags.integer, tags.float], color: "#f0f1a6" },
  { tag: [tags.operator, tags.punctuation], color: "#e2e8f0" },
  { tag: tags.invalid, color: "#ff6b6b", textDecoration: "underline" },
]);

export const SYNTAX_HIGHLIGHTING = syntaxHighlighting(CODE_HIGHLIGHT_STYLE, {
  fallback: true,
});
