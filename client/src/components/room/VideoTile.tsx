import { useEffect, useRef } from "react";
import { AspectRatio, Avatar, Paper, Text } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { IconMicrophoneOff } from "@tabler/icons-react";
import classes from "./VideoTile.module.scss";

interface Props {
  stream: MediaStream | null;
  name: string;
  self?: boolean;
  muted?: boolean;
  audioOff?: boolean;
  videoOff?: boolean;
  sharing?: boolean;
  /** Selected audio output device (speaker) to route this tile's audio to. */
  sinkId?: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function VideoTile({
  stream,
  name,
  self,
  muted,
  audioOff,
  videoOff,
  sharing,
  sinkId,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLVideoElement>(null);
  const label = sharing
    ? t("tile.screen", { name })
    : self
      ? t("tile.self", { name })
      : name;

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  // Route audio to the selected speaker (where supported; not for muted self tiles).
  useEffect(() => {
    const el = ref.current as (HTMLVideoElement & { setSinkId?: (id: string) => Promise<void> }) | null;
    if (el && sinkId && !muted && typeof el.setSinkId === "function") {
      void el.setSinkId(sinkId).catch(() => {});
    }
  }, [sinkId, muted, stream]);

  return (
    <Paper radius="md" withBorder className={classes.tile}>
      <AspectRatio ratio={16 / 9}>
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={muted}
          className={classes.video}
          data-sharing={sharing ? "true" : undefined}
          data-mirror={self && !sharing ? "true" : undefined}
          data-hidden={videoOff ? "true" : undefined}
        />

        {videoOff && (
          <div className={classes.placeholder}>
            <Avatar size={80} radius="xl" variant="light">
              {initials(name)}
            </Avatar>
          </div>
        )}
      </AspectRatio>

      <div className={classes.caption}>
        {audioOff && (
          <IconMicrophoneOff size={16} color="var(--mantine-color-red-4)" aria-label={t("tile.micOff")} />
        )}
        <Text size="sm" fw={500} c="white" truncate>
          {label}
        </Text>
      </div>
    </Paper>
  );
}
