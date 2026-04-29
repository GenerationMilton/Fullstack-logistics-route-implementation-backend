import NodeCache from "node-cache";
import type { TrackResponse, TrackingAdapter } from "./tracking.adapter";

/** Step 8: SOAP (and downstream) tracking responses cached for 60 seconds. */
const CACHE_KEY_PREFIX = "track";

export class CachedTrackingAdapter implements TrackingAdapter {
  private readonly cache: NodeCache;

  constructor(
    private readonly inner: TrackingAdapter,
    ttlSeconds: number,
  ) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      useClones: false,
    });
  }

  public async trackRoute(
    courierId: string,
    routeId: string,
  ): Promise<TrackResponse> {
    const key = `${CACHE_KEY_PREFIX}:${courierId}:${routeId}`;
    const cached = this.cache.get<TrackResponse>(key);
    if (cached) {
      return cached;
    }

    const result = await this.inner.trackRoute(courierId, routeId);
    this.cache.set(key, result);
    return result;
  }
}
