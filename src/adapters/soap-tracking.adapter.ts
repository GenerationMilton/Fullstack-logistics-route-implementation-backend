import { createClientAsync, type Client } from "soap";
import { AppError } from "../utils/errors";
import type { TrackResponse, TrackingAdapter } from "./tracking.adapter";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapSoapPayload(raw: unknown): Record<string, unknown> {
  if (!isRecord(raw)) {
    return {};
  }
  const keys = Object.keys(raw);
  if (keys.length === 1 && isRecord(raw[keys[0] as string])) {
    return raw[keys[0] as string] as Record<string, unknown>;
  }
  return raw;
}

function pickFirst(
  source: Record<string, unknown>,
  keys: string[],
): unknown {
  for (const key of keys) {
    if (key in source) {
      return source[key];
    }
  }
  return undefined;
}

export function normalizeSoapTrackPayload(
  raw: unknown,
  routeId: string,
): TrackResponse {
  const root = unwrapSoapPayload(raw);
  const routeList = String(
    pickFirst(root, ["routeList", "RouteList", "route_list"]) ??
      `Route ${routeId}`,
  );
  const lastLocation = String(
    pickFirst(root, [
      "lastLocation",
      "LastLocation",
      "lasLocation",
      "LasLocation",
    ]) ?? "",
  );
  const progressRaw = pickFirst(root, [
    "progressPercent",
    "ProgressPercent",
    "progress_percent",
  ]);
  const etaRaw = pickFirst(root, ["etaMinutes", "EtaMinutes", "eta_minutes"]);
  const timestampRaw = pickFirst(root, [
    "timestamp",
    "Timestamp",
    "timeStamp",
  ]);

  const progressPercent = Number(progressRaw ?? 0);
  const etaMinutes = Number(etaRaw ?? 0);
  const timestamp =
    typeof timestampRaw === "string" && timestampRaw.length > 0
      ? timestampRaw
      : new Date().toISOString();

  return {
    routeList,
    lastLocation,
    progressPercent: Number.isFinite(progressPercent) ? progressPercent : 0,
    etaMinutes: Number.isFinite(etaMinutes) ? etaMinutes : 0,
    timestamp,
  };
}

export class SoapTrackingAdapter implements TrackingAdapter {
  private clientPromise: Promise<Client> | null = null;

  constructor(
    private readonly wsdlUrl: string,
    private readonly methodName: string,
    private readonly endpoint?: string,
  ) {}

  public async trackRoute(
    courierId: string,
    routeId: string,
  ): Promise<TrackResponse> {
    const client = await this.getClient();
    const asyncMethodName = `${this.methodName}Async`;
    const method = client[asyncMethodName] as
      | ((args: Record<string, unknown>) => Promise<[unknown]>)
      | undefined;

    if (typeof method !== "function") {
      throw new AppError(
        `SOAP client has no method ${asyncMethodName}. Check SOAP_TRACKING_METHOD and WSDL.`,
        502,
      );
    }

    try {
      const [rawResult] = await method.call(client, {
        routeId,
        courierId,
      });
      return normalizeSoapTrackPayload(rawResult, routeId);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "SOAP tracking failed";
      throw new AppError(`SOAP tracking error: ${message}`, 502);
    }
  }

  private async getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = createClientAsync(
        this.wsdlUrl,
        undefined,
        this.endpoint,
      );
    }
    return this.clientPromise;
  }
}
