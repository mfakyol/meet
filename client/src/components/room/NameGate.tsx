import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import {
  Button,
  Center,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconVideo } from "@tabler/icons-react";

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
      <Stack w="100%" maw={420} gap="lg">
        <Group gap="xs" justify="center">
          <ThemeIcon size={32} radius="md" variant="light">
            <IconVideo size={20} />
          </ThemeIcon>
          <Text
            fw={700}
            size="xl"
            variant="gradient"
            gradient={{ from: "zblue.6", to: "zblue.4", deg: 90 }}
          >
            Meet
          </Text>
        </Group>

        <Paper withBorder radius="lg" p="xl" shadow="xl">
          <form onSubmit={submit}>
            <Stack gap="md">
              <Stack gap={4}>
                <Title order={2} size="h4">
                  {t("nameGate.title")}
                </Title>
                <Text size="sm" c="dimmed">
                  {t("nameGate.subtitle")}
                </Text>
              </Stack>

              <TextInput
                size="md"
                data-autofocus
                autoFocus
                placeholder={t("nameGate.namePlaceholder")}
                value={name}
                onChange={(e) => setName(e.currentTarget.value)}
              />

              <Button type="submit" fullWidth size="md" disabled={!name.trim()}>
                {t("nameGate.join")}
              </Button>

              <Text size="xs" c="dimmed" ta="center">
                {t("nameGate.room", { roomId })}
              </Text>
            </Stack>
          </form>
        </Paper>
      </Stack>
    </Center>
  );
}
