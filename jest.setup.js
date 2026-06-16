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
