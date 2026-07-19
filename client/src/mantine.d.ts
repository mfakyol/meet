import type { DefaultMantineColor, MantineColorsTuple } from "@mantine/core";

// Register the custom theme color(s) so `theme.colors` and `primaryColor`
// accept them (Mantine's recommended module augmentation).
type ExtendedCustomColors = "Remoraid" | DefaultMantineColor;

declare module "@mantine/core" {
  export interface MantineThemeColorsOverride {
    colors: Record<ExtendedCustomColors, MantineColorsTuple>;
  }
}
