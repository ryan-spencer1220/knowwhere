import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { act, render, screen } from "@testing-library/react-native";

import { OfflineBanner } from "@/components/offline-banner";

jest.mock("@react-native-community/netinfo", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => () => {}) },
}));

const addEventListener = NetInfo.addEventListener as jest.Mock;

function emit(state: Partial<NetInfoState>) {
  const cb = addEventListener.mock.calls[0][0];
  act(() => cb(state));
}

describe("OfflineBanner", () => {
  beforeEach(() => addEventListener.mockClear());

  it("renders nothing while connected", () => {
    render(<OfflineBanner />);
    emit({ isConnected: true, isInternetReachable: true });
    expect(screen.queryByText(/offline/i)).toBeNull();
  });

  it("shows the banner once the device goes offline", () => {
    render(<OfflineBanner />);
    emit({ isConnected: false, isInternetReachable: false });
    expect(screen.getByText(/offline/i)).toBeTruthy();
  });
});
