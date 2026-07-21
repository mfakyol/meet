import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { useTranslation } from "react-i18next";
import {
  Box,
  Button,
  Center,
  Container,
  Divider,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconBolt,
  IconScreenShare,
  IconShieldLock,
  IconUsers,
  IconVideo,
  IconVideoPlus,
} from "@tabler/icons-react";
import { extractRoomId } from "@/utils/roomId";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

const FEATURES = [
  { key: "noSetup", Icon: IconBolt },
  { key: "private", Icon: IconShieldLock },
  { key: "tools", Icon: IconScreenShare },
  { key: "capacity", Icon: IconUsers },
] as const;

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
    <Box h="100%" style={{ overflowY: "auto" }}>
      <Flex direction="column" mih="100%">
        <Group component="header" justify="space-between" px="lg" py="md">
          <Group gap="xs">
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
          <LanguageSwitcher />
        </Group>

        <Container size="lg" w="100%" py="xl" style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing={48} verticalSpacing="xl" w="100%">
            <Stack gap="xl" justify="center">
              <Stack gap="sm">
                <Title order={1} fz={{ base: 30, sm: 40 }} lh={1.15}>
                  {t("home.headline")}
                </Title>
                <Text size="lg" c="dimmed">
                  {t("home.tagline")}
                </Text>
              </Stack>

              <Stack gap="lg">
                {FEATURES.map(({ key, Icon }) => (
                  <Group key={key} gap="md" wrap="nowrap" align="flex-start">
                    <ThemeIcon size={40} radius="md" variant="light">
                      <Icon size={21} />
                    </ThemeIcon>
                    <Box>
                      <Text fw={600}>{t(`home.features.${key}.title`)}</Text>
                      <Text size="sm" c="dimmed">
                        {t(`home.features.${key}.desc`)}
                      </Text>
                    </Box>
                  </Group>
                ))}
              </Stack>
            </Stack>

            <Center>
              <Paper withBorder radius="lg" p="xl" shadow="xl" w="100%" maw={420}>
                <Stack gap="md">
                  <Title order={2} size="h4">
                    {t("home.cardTitle")}
                  </Title>

                  <TextInput
                    size="md"
                    label={t("home.displayName")}
                    placeholder={t("home.namePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.currentTarget.value)}
                  />

                  <Button
                    fullWidth
                    size="md"
                    leftSection={<IconVideoPlus size={18} />}
                    disabled={!name.trim()}
                    onClick={createRoom}
                  >
                    {t("home.createRoom")}
                  </Button>

                  <Divider label={t("home.orJoinCode")} labelPosition="center" />

                  <form onSubmit={joinRoom}>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <TextInput
                        size="md"
                        style={{ flex: 1 }}
                        placeholder={t("home.codePlaceholder")}
                        value={code}
                        onChange={(e) => setCode(e.currentTarget.value)}
                      />
                      <Button
                        type="submit"
                        size="md"
                        variant="default"
                        disabled={!name.trim() || !code.trim()}
                      >
                        {t("home.join")}
                      </Button>
                    </Group>
                  </form>
                </Stack>
              </Paper>
            </Center>
          </SimpleGrid>
        </Container>

        <Text component="footer" c="dimmed" size="xs" ta="center" px="md" pb="lg">
          {t("home.footer")}
        </Text>
      </Flex>
    </Box>
  );
}
