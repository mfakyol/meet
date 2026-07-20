import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ActionIcon,
  Group,
  Popover,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  UnstyledButton,
} from "@mantine/core";
import { IconMoodSmile, IconSend, IconX } from "@tabler/icons-react";
import type { ChatMessage } from "@/types";
import classes from "./ChatPanel.module.scss";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

// A small curated set — enough for quick reactions without a heavy picker lib.
const EMOJIS = [
  "😀", "😂", "🤣", "😊", "😍", "😘", "😎", "🤩",
  "🙂", "😉", "😌", "🤔", "🤗", "😴", "😢", "😭",
  "😤", "😡", "🥳", "🤯", "😱", "🥺", "😅", "🙃",
  "👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "👀",
  "🔥", "✨", "🎉", "❤️", "💯", "✅", "❌", "💬",
];

export function ChatPanel({ messages, onSend, onClose }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText("");
  }

  function addEmoji(emoji: string) {
    setText((t) => t + emoji);
    inputRef.current?.focus();
  }

  return (
    <aside className={classes.panel}>
      <Group
        justify="space-between"
        p="sm"
        style={{ borderBottom: "1px solid var(--mantine-color-dark-4)" }}
      >
        <Title order={2} size="h5">
          Sohbet
        </Title>
        <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label="Sohbeti kapat">
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <ScrollArea style={{ flex: 1 }} p="sm">
        <Stack gap="sm">
          {messages.length === 0 && (
            <Text c="dimmed" size="sm">
              Henüz mesaj yok.
            </Text>
          )}
          {messages.map((m) => (
            <div key={m.id} className={classes.row} data-mine={m.mine ? "true" : undefined}>
              {!m.mine && (
                <Text size="xs" fw={500} c="dimmed" mb={2}>
                  {m.name}
                </Text>
              )}
              <div className={classes.bubble} data-mine={m.mine ? "true" : undefined}>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </Stack>
      </ScrollArea>

      <form onSubmit={submit}>
        <Group
          gap="xs"
          p="sm"
          wrap="nowrap"
          style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}
        >
          <Popover position="top-start" withArrow shadow="md" width={280}>
            <Popover.Target>
              <Tooltip label="Emoji ekle" withArrow>
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="gray"
                  size={36}
                  aria-label="Emoji ekle"
                >
                  <IconMoodSmile size={20} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p="xs">
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                <SimpleGrid cols={8} spacing={2}>
                  {EMOJIS.map((emoji) => (
                    <UnstyledButton
                      key={emoji}
                      type="button"
                      className={classes.emojiBtn}
                      onClick={() => addEmoji(emoji)}
                      aria-label={emoji}
                    >
                      {emoji}
                    </UnstyledButton>
                  ))}
                </SimpleGrid>
              </div>
            </Popover.Dropdown>
          </Popover>

          <TextInput
            ref={inputRef}
            style={{ flex: 1 }}
            placeholder="Mesaj yaz…"
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
          />
          <ActionIcon type="submit" size={36} variant="filled" disabled={!text.trim()} aria-label="Gönder">
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </form>
    </aside>
  );
}
