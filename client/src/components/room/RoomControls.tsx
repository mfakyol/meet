import { ActionIcon, Group, Tooltip } from "@mantine/core";
import { useTranslation } from "react-i18next";
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
  size,
  children,
}: {
  onClick: () => void;
  title: string;
  color?: string;
  variant?: string;
  size: number;
  children: ReactNode;
}) {
  return (
    <Tooltip label={title} withArrow>
      <ActionIcon
        onClick={onClick}
        aria-label={title}
        size={size}
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
  /** Smaller buttons / tighter gaps so all controls fit on a phone. */
  compact?: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
  /** Device-settings control (gear + popover), rendered in the bar. */
  settings?: ReactNode;
}

// The bottom control bar: mic, camera, screen-share, chat, settings, leave. A
// control that is "off" (mic/cam muted) is shown filled-red as an alert state.
export function RoomControls({
  micOn,
  camOn,
  sharing,
  chatOpen,
  compact,
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleChat,
  onLeave,
  settings,
}: Props) {
  const { t } = useTranslation();
  const size = compact ? 42 : 52;
  const icon = compact ? 20 : 24;

  return (
    <Group
      justify="center"
      gap={compact ? 6 : "sm"}
      wrap="nowrap"
      px="xs"
      py={compact ? "xs" : "md"}
      style={{
        borderTop: "1px solid var(--mantine-color-dark-4)",
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${compact ? "0.625rem" : "1rem"})`,
      }}
    >
      <ControlButton
        onClick={onToggleMic}
        title={micOn ? t("controls.micOff") : t("controls.micOn")}
        variant={micOn ? "default" : "filled"}
        color={micOn ? undefined : "red"}
        size={size}
      >
        {micOn ? <IconMicrophone size={icon} /> : <IconMicrophoneOff size={icon} />}
      </ControlButton>

      <ControlButton
        onClick={onToggleCam}
        title={camOn ? t("controls.camOff") : t("controls.camOn")}
        variant={camOn ? "default" : "filled"}
        color={camOn ? undefined : "red"}
        size={size}
      >
        {camOn ? <IconVideo size={icon} /> : <IconVideoOff size={icon} />}
      </ControlButton>

      <ControlButton
        onClick={onToggleShare}
        title={sharing ? t("controls.stopShare") : t("controls.share")}
        variant={sharing ? "light" : "default"}
        size={size}
      >
        {sharing ? <IconScreenShareOff size={icon} /> : <IconScreenShare size={icon} />}
      </ControlButton>

      <ControlButton
        onClick={onToggleChat}
        title={t("controls.chat")}
        variant={chatOpen ? "light" : "default"}
        size={size}
      >
        <IconMessage size={icon} />
      </ControlButton>

      {settings}

      <ControlButton
        onClick={onLeave}
        title={t("controls.leave")}
        variant="filled"
        color="red"
        size={size}
      >
        <IconPhoneOff size={icon} />
      </ControlButton>
    </Group>
  );
}
