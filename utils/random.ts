/** Returns an integer in the inclusive range [min, max]. */
export const getRandomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Returns a random element from a non-empty array. */
export const getRandomElement = <T>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

/**
 * Selects one item using positive weights while keeping low-probability items possible.
 *
 * Non-positive weights are clamped to zero. If every computed weight is zero,
 * the first item is returned as a stable fallback.
 */
export const getWeightedRandomElement = <T>(
  items: T[],
  getWeight: (item: T) => number,
): T => {
  if (items.length === 0) {
    throw new Error("Cannot select from an empty weighted collection.");
  }

  const weightedItems = items.map((item) => ({
    item,
    weight: Math.max(0, getWeight(item)),
  }));
  const totalWeight = weightedItems.reduce(
    (sum, entry) => sum + entry.weight,
    0,
  );

  if (totalWeight <= 0) {
    return items[0];
  }

  let threshold = Math.random() * totalWeight;
  for (const entry of weightedItems) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.item;
    }
  }

  return weightedItems[weightedItems.length - 1].item;
};