import { CachedTrackingAdapter } from "./cached-tracking.adapter";
import { MockTrackingAdapter } from "./mock-tracking.adapter";
import { SoapTrackingAdapter } from "./soap-tracking.adapter";
import type { TrackingAdapter } from "./tracking.adapter";
import { env } from "../utils/env";

const TRACKING_CACHE_TTL_SECONDS = 60;

export function createTrackingAdapter(): TrackingAdapter {
  let inner: TrackingAdapter;

  if (env.TRACKING_ADAPTER === "soap") {
    const wsdl = env.SOAP_TRACKING_WSDL;
    if (!wsdl) {
      throw new Error("SOAP_TRACKING_WSDL is required when TRACKING_ADAPTER=soap");
    }
    inner = new SoapTrackingAdapter(
      wsdl,
      env.SOAP_TRACKING_METHOD,
      env.SOAP_TRACKING_ENDPOINT,
    );
  } else {
    inner = new MockTrackingAdapter();
  }

  return new CachedTrackingAdapter(inner, TRACKING_CACHE_TTL_SECONDS);
}
