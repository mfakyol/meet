import { ActionIcon, Group, Tooltip } from "@mantine/core";
import {
  IconMicrophone,
  IconMicrophoneOff,
  IconVideo,
  IconVideoOff,
  IconScreenShare,
  IconScreenShareOff,
  IconMessage,
  IconPhoneOff,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

function ControlButton({
  onClick,
  title,
  color,
  variant = "default",
  children,
}: {
  onClick: () => void;
  title: string;
  color?: string;
  variant?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip label={title} withArrow>
      <ActionIcon
        onClick={onClick}
        aria-label={title}
        size={52}
        radius="xl"
        variant={variant}
        color={color}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}

interface Props {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  chatOpen: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  /** Device-settings control (gear + popover), rendered in the bar. */
  settings?: ReactNode;
}

const ICON = 24;

// The bottom control bar: mic, camera, screen-share, chat, leave. A control that
// is "off" (mic/cam muted) is shown filled-red to read as an alert state.
export function RoomControls({
  micOn,
  camOn,
  sharing,
  chatOpen,
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleChat,
  onLeave,
  settings,
}: Props) {
  return (
    <Group justify="center" gap="sm" p="md" style={{ borderTop: "1px solid var(--mantine-color-dark-4)" }}>
      <ControlButton
        onClick={onToggleMic}
        title={micOn ? "Mikrofonu kapat" : "Mikrofonu aç"}
        variant={micOn ? "default" : "filled"}
        color={micOn ? undefined : "red"}
      >
        {micOn ? <IconMicrophone size={ICON} /> : <IconMicrophoneOff size={ICON} />}
      </ControlButton>

      <ControlButton
        onClick={onToggleCam}
        title={camOn ? "Kamerayı kapat" : "Kamerayı aç"}
        variant={camOn ? "default" : "filled"}
        color={camOn ? undefined : "red"}
      >
        {camOn ? <IconVideo size={ICON} /> : <IconVideoOff size={ICON} />}
      </ControlButton>

      <ControlButton
        onClick={onToggleShare}
        title={sharing ? "Paylaşımı durdur" : "Ekranı paylaş"}
        variant={sharing ? "light" : "default"}
      >
        {sharing ? <IconScreenShareOff size={ICON} /> : <IconScreenShare size={ICON} />}
      </ControlButton>

      <ControlButton
        onClick={onToggleChat}
        title="Sohbet"
        variant={chatOpen ? "light" : "default"}
      >
        <IconMessage size={ICON} />
      </ControlButton>

      {settings}

      <ControlButton onClick={onLeave} title="Görüşmeden ayrıl" variant="filled" color="red">
        <IconPhoneOff size={ICON} />
      </ControlButton>
    </Group>
  );
}
