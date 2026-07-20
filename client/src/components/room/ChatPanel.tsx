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
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
          {t("chat.title")}
        </Title>
        <ActionIcon variant="subtle" color="gray" onClick={onClose} aria-label={t("chat.close")}>
          <IconX size={18} />
        </ActionIcon>
      </Group>

      <ScrollArea style={{ flex: 1 }} p="sm">
        <Stack gap="sm">
          {messages.length === 0 && (
            <Text c="dimmed" size="sm">
              {t("chat.empty")}
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
              <Tooltip label={t("chat.emoji")} withArrow>
                <ActionIcon
                  type="button"
                  variant="subtle"
                  color="gray"
                  size={36}
                  aria-label={t("chat.emoji")}
                >
                  <IconMoodSmile size={20} />
                </ActionIcon>
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p="xs">
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
            </Popover.Dropdown>
          </Popover>

          <TextInput
            ref={inputRef}
            style={{ flex: 1 }}
            placeholder={t("chat.placeholder")}
            value={text}
            onChange={(e) => setText(e.currentTarget.value)}
          />
          <ActionIcon type="submit" size={36} variant="filled" disabled={!text.trim()} aria-label={t("chat.send")}>
            <IconSend size={18} />
          </ActionIcon>
        </Group>
      </form>
    </aside>
  );
}
