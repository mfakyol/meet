import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
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

export default function HomePage() {
  const navigate = useNavigate();
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
        <Stack gap={4} align="center">
          <Title order={1} size={40}>
            <Text
              component="span"
              inherit
              variant="gradient"
              gradient={{ from: "indigo", to: "violet", deg: 90 }}
            >
              Meet
            </Text>
          </Title>
          <Text c="dimmed" ta="center">
            Tarayıcıdan görüntülü görüşme — kurulum yok, linki paylaş, katıl.
          </Text>
        </Stack>

        <Paper withBorder radius="lg" p="lg" shadow="xl">
          <Stack gap="md">
            <TextInput
              label="Görünen adın"
              placeholder="Adın"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />

            <Button
              fullWidth
              size="md"
              variant="gradient"
              gradient={{ from: "indigo", to: "violet", deg: 90 }}
              disabled={!name.trim()}
              onClick={createRoom}
            >
              Yeni oda oluştur
            </Button>

            <Divider label="veya koda katıl" labelPosition="center" />

            <form onSubmit={joinRoom}>
              <Group gap="xs" wrap="nowrap">
                <TextInput
                  style={{ flex: 1 }}
                  placeholder="Oda kodu ya da linki"
                  value={code}
                  onChange={(e) => setCode(e.currentTarget.value)}
                />
                <Button type="submit" variant="default" disabled={!name.trim() || !code.trim()}>
                  Katıl
                </Button>
              </Group>
            </form>
          </Stack>
        </Paper>

        <Text c="dimmed" size="xs" ta="center">
          En fazla 8 kişi · uçtan uca P2P (medya sunucudan geçmez)
        </Text>
      </Stack>
    </Center>
  );
}
