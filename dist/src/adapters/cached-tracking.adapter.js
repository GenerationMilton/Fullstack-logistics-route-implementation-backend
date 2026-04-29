"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedTrackingAdapter = void 0;
const node_cache_1 = __importDefault(require("node-cache"));
const CACHE_KEY_PREFIX = "track";
class CachedTrackingAdapter {
    constructor(inner, ttlSeconds) {
        this.inner = inner;
        this.cache = new node_cache_1.default({
            stdTTL: ttlSeconds,
            useClones: false,
        });
    }
    async trackRoute(courierId, routeId) {
        const key = `${CACHE_KEY_PREFIX}:${courierId}:${routeId}`;
        const cached = this.cache.get(key);
        if (cached) {
            return cached;
        }
        const result = await this.inner.trackRoute(courierId, routeId);
        this.cache.set(key, result);
        return result;
    }
}
exports.CachedTrackingAdapter = CachedTrackingAdapter;
