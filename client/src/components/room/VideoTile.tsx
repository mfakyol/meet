import { useEffect, useRef } from "react";
import { AspectRatio, Avatar, Paper, Text } from "@mantine/core";
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
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

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
            <Avatar size={80} radius="xl" color="yellow" variant="light">
              {initials(name)}
            </Avatar>
          </div>
        )}
      </AspectRatio>

      <div className={classes.caption}>
        {audioOff && (
          <IconMicrophoneOff size={16} color="var(--mantine-color-red-4)" aria-label="Mikrofon kapalı" />
        )}
        <Text size="sm" fw={500} c="white" truncate>
          {name}
          {self && " (sen)"}
        </Text>
      </div>
    </Paper>
  );
}
