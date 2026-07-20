import { ActionIcon, Button, Popover, Select, Stack, Text, Tooltip } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { canPickSpeaker, useMediaDevices } from "@/hooks/useMediaDevices";

interface Props {
  cameraId: string | null;
  micId: string | null;
  speakerId: string | null;
  compact?: boolean;
  onCamera: (deviceId: string) => void;
  onMic: (deviceId: string) => void;
  onSpeaker: (deviceId: string) => void;
}

// Gear button → popover with camera / microphone / speaker pickers.
export function DeviceSettings({
  cameraId,
  micId,
  speakerId,
  compact,
  onCamera,
  onMic,
  onSpeaker,
}: Props) {
  const { cameras, mics, speakers, refresh } = useMediaDevices();
  const empty = cameras.length === 0 && mics.length === 0 && speakers.length === 0;

  return (
    <Popover width={280} position="top" withArrow shadow="md" onOpen={() => void refresh()}>
      <Popover.Target>
        <Tooltip label="Cihaz ayarları" withArrow>
          <ActionIcon
            size={compact ? 42 : 52}
            radius="xl"
            variant="default"
            aria-label="Cihaz ayarları"
          >
            <IconSettings size={compact ? 20 : 24} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
          {empty && (
            <Stack gap={6}>
              <Text size="xs" c="dimmed">
                Cihazları görmek için kamera/mikrofon izni gerekiyor.
              </Text>
              <Button size="xs" variant="light" onClick={() => void refresh(true)}>
                Cihazlara izin ver
              </Button>
            </Stack>
          )}
          <Select
            label="Kamera"
            placeholder="Kamera seç"
            data={cameras.map((d) => ({ value: d.deviceId, label: d.label }))}
            value={cameraId}
            onChange={(v) => v && onCamera(v)}
            disabled={cameras.length === 0}
            comboboxProps={{ withinPortal: false }}
            checkIconPosition="right"
          />
          <Select
            label="Mikrofon"
            placeholder="Mikrofon seç"
            data={mics.map((d) => ({ value: d.deviceId, label: d.label }))}
            value={micId}
            onChange={(v) => v && onMic(v)}
            disabled={mics.length === 0}
            comboboxProps={{ withinPortal: false }}
            checkIconPosition="right"
          />
          {canPickSpeaker && (
            <Select
              label="Hoparlör"
              placeholder="Hoparlör seç"
              data={speakers.map((d) => ({ value: d.deviceId, label: d.label }))}
              value={speakerId}
              onChange={(v) => v && onSpeaker(v)}
              disabled={speakers.length === 0}
              comboboxProps={{ withinPortal: false }}
              checkIconPosition="right"
            />
          )}
        </Stack>
      </Popover.Dropdown>
    </Popover>
  );
}
