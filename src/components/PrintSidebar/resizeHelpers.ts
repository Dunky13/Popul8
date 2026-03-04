import type { TextResizeRules } from "../../types/textResize";

export const removeDraftField = (
  draftValues: Record<string, string>,
  field: string,
): Record<string, string> => {
  if (!(field in draftValues)) {
    return draftValues;
  }

  const next = { ...draftValues };
  delete next[field];
  return next;
};

export const removeFieldResizeRules = ({
  rules,
  selectedCardIds,
  field,
}: {
  rules: TextResizeRules;
  selectedCardIds: string[];
  field: string;
}): TextResizeRules => {
  const nextRules = {
    allCards: { ...rules.allCards },
    perCard: { ...rules.perCard },
  };

  if (selectedCardIds.length === 0) {
    delete nextRules.allCards[field];
    return nextRules;
  }

  selectedCardIds.forEach((cardId) => {
    const cardRules = nextRules.perCard[cardId];
    if (!cardRules) return;

    const nextCardRules = { ...cardRules };
    delete nextCardRules[field];

    if (Object.keys(nextCardRules).length === 0) {
      delete nextRules.perCard[cardId];
      return;
    }

    nextRules.perCard[cardId] = nextCardRules;
  });

  return nextRules;
};
