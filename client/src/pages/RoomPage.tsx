import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Box,
  Button,
  CopyButton,
  Flex,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { useTranslation } from "react-i18next";
import { IconCheck, IconCopy, IconUsers, IconVideo } from "@tabler/icons-react";
import { useRoom } from "@/hooks/useRoom";
import { VideoTile } from "@/components/room/VideoTile";
import { ChatPanel } from "@/components/room/ChatPanel";
import { RoomControls } from "@/components/room/RoomControls";
import { DeviceSettings } from "@/components/room/DeviceSettings";
import { NameGate } from "@/components/room/NameGate";

function gridCols(total: number, mobile: boolean): number {
  if (mobile) return total <= 2 ? 1 : 2;
  if (total <= 1) return 1;
  if (total <= 4) return 2;
  if (total <= 9) return 3;
  return 4;
}

const BORDER = "1px solid var(--mantine-color-dark-4)";

function Room({
  roomId,
  name,
  onLeave,
}: {
  roomId: string;
  name: string;
  onLeave: () => void;
}) {
  const { t } = useTranslation();
  const room = useRoom(roomId, name);
  const [chatOpen, setChatOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 48em)") ?? false;

  const total = room.peers.length + 1;
  const cols = gridCols(room.tiles.length, isMobile);

  return (
    <Flex direction="column" h="100%">
      <Group
        justify="space-between"
        gap="sm"
        px="sm"
        py="xs"
        wrap="nowrap"
        style={{ borderBottom: BORDER }}
      >
        <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
          <ThemeIcon size={32} radius="md" variant="light" visibleFrom="xs">
            <IconVideo size={18} />
          </ThemeIcon>
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text fw={600} truncate>
              {t("room.title", { roomId })}
            </Text>
            <Group gap={6} wrap="nowrap">
              <IconUsers size={13} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed">
                {t("room.participants", { count: total })}
                {room.status === "connecting" && t("room.connecting")}
              </Text>
            </Group>
          </Stack>
        </Group>
        <CopyButton value={window.location.href} timeout={1500}>
          {({ copied, copy }) =>
            isMobile ? (
              <Tooltip label={copied ? t("room.copied") : t("room.copy")} withArrow>
                <ActionIcon
                  variant="default"
                  size="lg"
                  onClick={copy}
                  aria-label={t("room.copy")}
                >
                  {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                </ActionIcon>
              </Tooltip>
            ) : (
              <Button
                variant="default"
                size="xs"
                onClick={copy}
                leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              >
                {copied ? t("room.copied") : t("room.copy")}
              </Button>
            )
          }
        </CopyButton>
      </Group>

      {room.error && (
        <Alert color="yellow" radius={0} py="xs">
          {room.error}
        </Alert>
      )}

      <Flex mih={0} pos="relative" style={{ flex: 1 }}>
        <Box
          component="main"
          p={isMobile ? "xs" : "md"}
          style={{ flex: 1, minWidth: 0, overflow: "auto" }}
        >
          <Box mx="auto" maw={cols >= 3 ? "100%" : 1100}>
            {room.peers.length === 0 && (
              <Paper withBorder radius="md" p="md" mb="md">
                <Group justify="space-between" gap="md" wrap="wrap">
                  <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                    <Text fw={600} size="sm">
                      {t("room.alone.title")}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {t("room.alone.desc")}
                    </Text>
                  </Stack>
                  <CopyButton value={window.location.href} timeout={1500}>
                    {({ copied, copy }) => (
                      <Button
                        size="xs"
                        variant={copied ? "light" : "filled"}
                        onClick={copy}
                        leftSection={copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                      >
                        {copied ? t("room.copied") : t("room.copy")}
                      </Button>
                    )}
                  </CopyButton>
                </Group>
              </Paper>
            )}

            <SimpleGrid cols={cols} spacing={isMobile ? "xs" : "sm"}>
              {room.tiles.map((t) => (
                <VideoTile
                  key={t.key}
                  stream={t.stream}
                  name={t.name}
                  self={t.self}
                  muted={t.muted}
                  audioOff={t.audioOff}
                  videoOff={t.videoOff}
                  sharing={t.screen}
                  sinkId={room.speakerId}
                />
              ))}
            </SimpleGrid>
          </Box>
        </Box>

        {chatOpen && (
          <ChatPanel
            messages={room.messages}
            onSend={room.sendChat}
            onClose={() => setChatOpen(false)}
          />
        )}
      </Flex>

      <RoomControls
        compact={isMobile}
        micOn={room.micOn}
        camOn={room.camOn}
        sharing={room.sharing}
        chatOpen={chatOpen}
        onToggleMic={room.toggleMic}
        onToggleCam={room.toggleCam}
        onToggleShare={room.toggleShare}
        onToggleChat={() => setChatOpen((v) => !v)}
        onLeave={onLeave}
        settings={
          <DeviceSettings
            compact={isMobile}
            cameraId={room.cameraId}
            micId={room.micId}
            speakerId={room.speakerId}
            onCamera={room.setCamera}
            onMic={room.setMic}
            onSpeaker={room.setSpeaker}
          />
        }
      />
    </Flex>
  );
}

export default function RoomPage() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(() =>
    sessionStorage.getItem("meet:name")
  );

  // Remount the room fresh per join by keying on name+roomId.
  const key = useMemo(() => `${roomId}:${name}`, [roomId, name]);

  if (!name) {
    return <NameGate roomId={roomId} onJoin={setName} />;
  }

  return (
    <Room key={key} roomId={roomId} name={name} onLeave={() => navigate("/")} />
  );
}
