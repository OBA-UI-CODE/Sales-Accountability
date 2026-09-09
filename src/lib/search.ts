/*
 * Matching text the way a shop owner types it.
 *
 * A plain `haystack.toLowerCase().includes(query)` looks fine until someone
 * searches for a size. "Small 12-pack" does not contain the string "12 pack",
 * because of the hyphen, so the one product they were looking for is the one
 * that does not come back.
 *
 * Punctuation is stripped from both sides before comparing, and the query is
 * split into words that must all appear somewhere — so "relaxer big" finds
 * "Relaxer" in its "Big 6-pack" size, in either order, and "12pack",
 * "12-pack" and "12 pack" are all the same search.
 *
 * Deliberately not fuzzy. Guessing at typos would start returning products
 * the owner did not ask for, and in a list of prices and stock counts a
 * wrong match is worse than no match.
 */

/** Lower-cases, drops punctuation, collapses runs of whitespace. */
export function normalise(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * True when every word in `query` appears somewhere in `haystacks`.
 * An empty query matches everything, so callers can pass the raw input.
 */
export function matchesSearch(
  query: string,
  ...haystacks: (string | null | undefined)[]
): boolean {
  const terms = normalise(query).split(" ").filter(Boolean);
  if (terms.length === 0) return true;

  const hay = normalise(haystacks.filter(Boolean).join(" "));
  const squashed = hay.replace(/ /g, "");

  return terms.every((t) => hay.includes(t) || squashed.includes(t));
}
