/**
 * Design tokens for the ops app, mirrored from the marketing site's
 * `apps/site/tailwind.config.mjs` so the two look like one company.
 *
 * If you change a colour here, change it there too.
 */
export const colors = {
  paper: "#FCFBF8",
  sand: "#F4EEE4",
  sandSoft: "#F9F5EE",
  deep: "#0F4A5C",
  brand: "#1C7FA8",
  brand50: "#EAF4F9",
  brand100: "#D3E9F2",
  brand700: "#114B5F",
  sky: "#6FB7DC",
  care: "#E0855C",
  careSoft: "#F6E4D8",
  ink: "#17262C",
  muted: "#54646C",
  border: "#E6E0D6",
  white: "#FFFFFF",
  danger: "#B4402C",
  dangerSoft: "#FBEAE5",
  warning: "#9A6414",
  warningSoft: "#FBF1DE",
  success: "#1F6B4F",
  successSoft: "#E4F1EA",
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

/** Ops work happens on a laptop; cap the reading width rather than letting
 *  tables sprawl across a 27" monitor. */
export const CONTENT_MAX_WIDTH = 1040;
