import { CachedTrackingAdapter } from "../../src/adapters/cached-tracking.adapter";
import type { TrackResponse, TrackingAdapter } from "../../src/adapters/tracking.adapter";

describe("CachedTrackingAdapter", () => {
  it("calls inner adapter once for the same key within TTL", async () => {
    const inner: TrackingAdapter = {
      trackRoute: jest.fn().mockResolvedValue({
        routeList: "R1",
        lastLocation: "L1",
        progressPercent: 10,
        etaMinutes: 20,
        timestamp: "2024-01-01T00:00:00.000Z",
      } satisfies TrackResponse),
    };

    const cached = new CachedTrackingAdapter(inner, 60);
    await cached.trackRoute("1", "2");
    await cached.trackRoute("1", "2");
    expect(inner.trackRoute).toHaveBeenCalledTimes(1);
  });
});
