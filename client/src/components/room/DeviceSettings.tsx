import { ActionIcon, Popover, Select, Stack, Tooltip } from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { canPickSpeaker, useMediaDevices } from "@/hooks/useMediaDevices";

interface Props {
  cameraId: string | null;
  micId: string | null;
  speakerId: string | null;
  onCamera: (deviceId: string) => void;
  onMic: (deviceId: string) => void;
  onSpeaker: (deviceId: string) => void;
}

// Gear button → popover with camera / microphone / speaker pickers.
export function DeviceSettings({
  cameraId,
  micId,
  speakerId,
  onCamera,
  onMic,
  onSpeaker,
}: Props) {
  const { cameras, mics, speakers, refresh } = useMediaDevices();

  return (
    <Popover width={280} position="top" withArrow shadow="md" onOpen={refresh}>
      <Popover.Target>
        <Tooltip label="Cihaz ayarları" withArrow>
          <ActionIcon size={52} radius="xl" variant="default" aria-label="Cihaz ayarları">
            <IconSettings size={24} />
          </ActionIcon>
        </Tooltip>
      </Popover.Target>
      <Popover.Dropdown>
        <Stack gap="sm">
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
