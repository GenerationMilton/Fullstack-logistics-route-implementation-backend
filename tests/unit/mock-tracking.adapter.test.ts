import { MockTrackingAdapter } from "../../src/adapters/mock-tracking.adapter";

describe("MockTrackingAdapter", () => {
  it("returns a stable TrackResponse shape", async () => {
    const adapter = new MockTrackingAdapter();
    const result = await adapter.trackRoute("7", "42");
    expect(result).toMatchObject({
      routeList: expect.any(String),
      lastLocation: expect.any(String),
      progressPercent: expect.any(Number),
      etaMinutes: expect.any(Number),
      timestamp: expect.any(String),
    });
  });
});
