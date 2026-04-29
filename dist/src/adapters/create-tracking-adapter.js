"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTrackingAdapter = createTrackingAdapter;
const cached_tracking_adapter_1 = require("./cached-tracking.adapter");
const mock_tracking_adapter_1 = require("./mock-tracking.adapter");
const soap_tracking_adapter_1 = require("./soap-tracking.adapter");
const env_1 = require("../utils/env");
const TRACKING_CACHE_TTL_SECONDS = 60;
function createTrackingAdapter() {
    let inner;
    if (env_1.env.TRACKING_ADAPTER === "soap") {
        const wsdl = env_1.env.SOAP_TRACKING_WSDL;
        if (!wsdl) {
            throw new Error("SOAP_TRACKING_WSDL is required when TRACKING_ADAPTER=soap");
        }
        inner = new soap_tracking_adapter_1.SoapTrackingAdapter(wsdl, env_1.env.SOAP_TRACKING_METHOD, env_1.env.SOAP_TRACKING_ENDPOINT);
    }
    else {
        inner = new mock_tracking_adapter_1.MockTrackingAdapter();
    }
    return new cached_tracking_adapter_1.CachedTrackingAdapter(inner, TRACKING_CACHE_TTL_SECONDS);
}
