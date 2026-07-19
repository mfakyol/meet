import { useState, type FormEvent } from "react";
import { Button, Center, Paper, Stack, Text, TextInput, Title } from "@mantine/core";

interface Props {
  roomId: string;
  onJoin: (name: string) => void;
}

// Asks for a display name before entering a room (persists it for next time).
export function NameGate({ roomId, onJoin }: Props) {
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
              Odaya katıl
            </Title>
            <Text c="dimmed" size="sm">
              Oda: {roomId}
            </Text>
            <TextInput
              w="100%"
              data-autofocus
              autoFocus
              placeholder="Görünen adın"
              styles={{ input: { textAlign: "center" } }}
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <Button type="submit" fullWidth variant="gradient" disabled={!name.trim()}>
              Katıl
            </Button>
          </Stack>
        </form>
      </Paper>
    </Center>
  );
}
