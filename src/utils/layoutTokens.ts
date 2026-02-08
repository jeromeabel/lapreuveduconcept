export const layoutTokens = {
  remBase: 16,
  // Keep 2-column slot width at an integer pixel (624px) to avoid fractional scaling blur.
  // Formula: twoCol = (pageMax - 2 * pagePad - comicGap) / 2.
  // With pagePad=1rem and comicGap=1rem, pageMax must be 81rem to yield 624px.
  pageMaxRem: 81,
  // Adjusting pad/gap affects the column math; re-check twoCol pixels if you change these.
  pagePadRem: 1,
  comicGapRem: 1,
  comicMarginRem: 0,
};
