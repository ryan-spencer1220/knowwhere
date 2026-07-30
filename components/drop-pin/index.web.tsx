export type DroppedPin = { name: string; latitude: number; longitude: number };

// Maps are native-only, so dropping a pin isn't available in the web preview.
// The entry points guard on Platform.OS, so this never actually renders.
export function DropPinModal(_props: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (pin: DroppedPin) => void;
  saving?: boolean;
}) {
  return null;
}
