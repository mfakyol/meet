import { createTheme } from "@mantine/core";

// App-wide Mantine theme. The product is dark-only with an indigo→violet accent.
export const theme = createTheme({
  primaryColor: "violet",
  defaultRadius: "md",
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: "700" },
});
