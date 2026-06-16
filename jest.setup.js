// Test environment shims.

// Stub the Supabase client. The real one is constructed at module load and
// needs env vars + a WebSocket impl (absent under Node < 22). Our unit tests
// cover pure logic that never touches the network, so an empty stub is enough
// to let those modules import.
jest.mock("@/lib/supabase", () => ({ supabase: {} }));

// AsyncStorage has no native module under Jest; use its official mock.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Safe-area context needs native metrics; stub it with zero insets.
jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  const insets = { top: 0, right: 0, bottom: 0, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const Passthrough = ({ children, ...props }) => React.createElement(View, props, children);
  return {
    SafeAreaProvider: Passthrough,
    SafeAreaView: Passthrough,
    SafeAreaConsumer: ({ children }) => children(insets),
    SafeAreaInsetsContext: React.createContext(insets),
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

// react-native-svg renders to native views; stub every element to a plain View
// so components using the dot-grid Texture render under Jest.
jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  const stub = (name) => {
    const C = ({ children, ...props }) => React.createElement(View, props, children);
    C.displayName = name;
    return C;
  };
  const names = [
    "Circle", "Rect", "Path", "Defs", "Pattern", "LinearGradient", "RadialGradient",
    "Stop", "G", "ClipPath", "Mask", "Line", "Polygon", "Polyline", "Ellipse", "Text", "TSpan",
  ];
  const mod = { __esModule: true, default: stub("Svg"), Svg: stub("Svg") };
  names.forEach((n) => (mod[n] = stub(n)));
  return mod;
});
