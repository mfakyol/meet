import { SegmentedControl } from "@mantine/core";
import { useTranslation } from "react-i18next";

// TR / EN toggle. Persists via i18next's localStorage detector.
export function LanguageSwitcher({ size }: { size?: string }) {
  const { i18n } = useTranslation();
  const value = i18n.resolvedLanguage === "en" ? "en" : "tr";

  return (
    <SegmentedControl
      size={size ?? "xs"}
      value={value}
      onChange={(v) => void i18n.changeLanguage(v)}
      data={[
        { value: "tr", label: "TR" },
        { value: "en", label: "EN" },
      ]}
    />
  );
}
