export const layoutTokens = {
  remBase: 16,
  // Keep 2-column slot width at an integer pixel to avoid fractional scaling blur.
  // Formula: twoCol = (pageMax - 2*pagePad - 2*cardPadDesktop - 2*cardBorderPx - comicGap) / 2.
  pageMaxRem: 81,
  // Adjusting pad/gap/card-chrome affects the column math; re-check twoCol pixels if you change these.
  pagePadRem: 1,
  comicGapRem: 1,
  comicMarginRem: 0,
  // Card chrome — must match ComicCard.astro's px-8 / md:px-12 and border.
  cardPadMobileRem: 2,  // px-8
  cardPadDesktopRem: 3,  // md:px-12
  cardBorderPx: 1,       // border (1px)
};
