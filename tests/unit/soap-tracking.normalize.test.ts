import { normalizeSoapTrackPayload } from "../../src/adapters/soap-tracking.adapter";

describe("normalizeSoapTrackPayload", () => {
  it("maps lasLocation typo to lastLocation", () => {
    const result = normalizeSoapTrackPayload(
      {
        lasLocation: "Near depot",
        progressPercent: 33,
        etaMinutes: 15,
        timestamp: "2024-01-01T00:00:00.000Z",
      },
      "99",
    );
    expect(result.lastLocation).toBe("Near depot");
    expect(result.progressPercent).toBe(33);
    expect(result.etaMinutes).toBe(15);
  });

  it("unwraps single nested SOAP result object", () => {
    const result = normalizeSoapTrackPayload(
      {
        TrackRouteResponse: {
          LastLocation: "City",
          ProgressPercent: 10,
          EtaMinutes: 5,
          Timestamp: "2024-02-02T00:00:00.000Z",
        },
      },
      "1",
    );
    expect(result.lastLocation).toBe("City");
    expect(result.progressPercent).toBe(10);
  });

  it("handles non-object raw", () => {
    const result = normalizeSoapTrackPayload(null, "1");
    expect(result.lastLocation).toBe("");
    expect(result.routeList).toContain("Route");
  });
});
