import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";
import {
  Button,
  Center,
  Divider,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { extractRoomId } from "@/utils/roomId";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState(() => sessionStorage.getItem("meet:name") ?? "");
  const [code, setCode] = useState("");

  function persistName() {
    const n = name.trim();
    if (n) sessionStorage.setItem("meet:name", n);
  }

  function createRoom() {
    persistName();
    navigate(`/room/${nanoid(10)}`);
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    persistName();
    // Accept a bare code or a full room URL; reject anything that isn't a safe slug.
    const id = extractRoomId(code);
    if (id) navigate(`/room/${id}`);
  }

  return (
    <Center h="100%" p="md">
      <Stack w="100%" maw={420} gap="lg">
        <Group justify="flex-end">
          <LanguageSwitcher />
        </Group>

        <Stack gap={4} align="center">
          <Title order={1} size={40}>
            <Text
              component="span"
              inherit
              variant="gradient"
              gradient={{ from: "zblue.6", to: "zblue.4", deg: 90 }}
            >
              Meet
            </Text>
          </Title>
          <Text c="dimmed" ta="center">
            {t("home.tagline")}
          </Text>
        </Stack>

        <Paper withBorder radius="lg" p="lg" shadow="xl">
          <Stack gap="md">
            <TextInput
              label={t("home.displayName")}
              placeholder={t("home.namePlaceholder")}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            <Button fullWidth size="md" disabled={!name.trim()} onClick={createRoom}>
              {t("home.createRoom")}
            </Button>

            <Divider label={t("home.orJoinCode")} labelPosition="center" />

            <form onSubmit={joinRoom}>
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder={t("home.codePlaceholder")}
                  value={code}
                  onChange={(e) => setCode(e.currentTarget.value)}
                />
                <Button type="submit" variant="default" disabled={!name.trim() || !code.trim()}>
                  {t("home.join")}
                </Button>
              </Group>
            </form>
          </Stack>
        </Paper>

        <Text c="dimmed" size="xs" ta="center">
          {t("home.footer")}
        </Text>
      </Stack>
    </Center>
  );
}
