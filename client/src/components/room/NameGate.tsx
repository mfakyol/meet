import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Button, Center, Paper, Stack, Text, TextInput, Title } from "@mantine/core";

interface Props {
  roomId: string;
  onJoin: (name: string) => void;
}

// Asks for a display name before entering a room (persists it for next time).
export function NameGate({ roomId, onJoin }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(() => sessionStorage.getItem("meet:name") ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n) {
      sessionStorage.setItem("meet:name", n);
      onJoin(n);
    }
  }

  return (
    <Center h="100%" p="md">
      <Paper withBorder radius="lg" p="lg" w="100%" maw={380}>
        <form onSubmit={submit}>
          <Stack gap="md" align="center">
            <Title order={2} size="h4">
              {t("nameGate.title")}
            </Title>
            <Text c="dimmed" size="sm">
              {t("nameGate.room", { roomId })}
            </Text>
            <TextInput
              w="100%"
              data-autofocus
              autoFocus
              placeholder={t("nameGate.namePlaceholder")}
              styles={{ input: { textAlign: "center" } }}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Button type="submit" fullWidth disabled={!name.trim()}>
              {t("nameGate.join")}
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
