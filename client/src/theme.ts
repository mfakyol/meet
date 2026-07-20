import { createTheme, type MantineColorsTuple } from "@mantine/core";

// Zoom-style theme: bright Zoom blue on a dark charcoal/near-black UI.
// (Mantine merges these with its default colors, so red/yellow/green etc. still
// exist for danger buttons, alerts, and so on.)

const zblue: MantineColorsTuple = [
  "#eaf3ff",
  "#d0e4ff",
  "#a3c9ff",
  "#72abff",
  "#4a94ff",
  "#2d8cff", // primary — Zoom's signature bright blue
  "#1a7ef2",
  "#0e71eb",
  "#0b5cd6",
  "#0949ab",
];

// Zoom's meeting UI is basically black: near-black body + black video area,
// with only slightly lighter surfaces (control bar, cards, inputs).
const dark: MantineColorsTuple = [
  "#d6d6d6",
  "#bcbcbc",
  "#999999",
  "#6e6e6e",
  "#474747",
  "#2b2b2b", // borders / subtle surfaces
  "#171717", // cards / inputs
  "#0a0a0a", // body background (reads black)
  "#050505",
  "#000000", // video tiles (pure black)
];

export const theme = createTheme({
  primaryColor: "zblue",
  primaryShade: { light: 6, dark: 5 },
  colors: { zblue, dark },
  white: "#ffffff",
  black: "#1b1b1b",
  autoContrast: true,
  luminanceThreshold: 0.35,
  defaultRadius: "md",
  radius: {
    xs: "0.25rem",
    sm: "0.375rem",
    md: "0.5rem",
    lg: "0.875rem",
    xl: "1.25rem",
  },
  fontFamily: "Lato, -apple-system, system-ui, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: "Lato, -apple-system, system-ui, sans-serif",
    fontWeight: "700",
  },
  defaultGradient: { from: "zblue.6", to: "zblue.4", deg: 90 },
});
