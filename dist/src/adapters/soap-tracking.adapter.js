"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SoapTrackingAdapter = void 0;
exports.normalizeSoapTrackPayload = normalizeSoapTrackPayload;
const soap_1 = require("soap");
const errors_1 = require("../utils/errors");
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unwrapSoapPayload(raw) {
    if (!isRecord(raw)) {
        return {};
    }
    const keys = Object.keys(raw);
    if (keys.length === 1 && isRecord(raw[keys[0]])) {
        return raw[keys[0]];
    }
    return raw;
}
function pickFirst(source, keys) {
    for (const key of keys) {
        if (key in source) {
            return source[key];
        }
    }
    return undefined;
}
function normalizeSoapTrackPayload(raw, routeId) {
    const root = unwrapSoapPayload(raw);
    const routeList = String(pickFirst(root, ["routeList", "RouteList", "route_list"]) ??
        `Route ${routeId}`);
    const lastLocation = String(pickFirst(root, [
        "lastLocation",
        "LastLocation",
        "lasLocation",
        "LasLocation",
    ]) ?? "");
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
    const timestamp = typeof timestampRaw === "string" && timestampRaw.length > 0
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
class SoapTrackingAdapter {
    constructor(wsdlUrl, methodName, endpoint) {
        this.wsdlUrl = wsdlUrl;
        this.methodName = methodName;
        this.endpoint = endpoint;
        this.clientPromise = null;
    }
    async trackRoute(courierId, routeId) {
        const client = await this.getClient();
        const asyncMethodName = `${this.methodName}Async`;
        const method = client[asyncMethodName];
        if (typeof method !== "function") {
            throw new errors_1.AppError(`SOAP client has no method ${asyncMethodName}. Check SOAP_TRACKING_METHOD and WSDL.`, 502);
        }
        try {
            const [rawResult] = await method.call(client, {
                routeId,
                courierId,
            });
            return normalizeSoapTrackPayload(rawResult, routeId);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : "SOAP tracking failed";
            throw new errors_1.AppError(`SOAP tracking error: ${message}`, 502);
        }
    }
    async getClient() {
        if (!this.clientPromise) {
            this.clientPromise = (0, soap_1.createClientAsync)(this.wsdlUrl, undefined, this.endpoint);
        }
        return this.clientPromise;
    }
}
exports.SoapTrackingAdapter = SoapTrackingAdapter;
