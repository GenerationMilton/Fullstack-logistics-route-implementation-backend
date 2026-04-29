"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTrackingAdapter = void 0;
class MockTrackingAdapter {
    async trackRoute(courierId, routeId) {
        const seed = Number(routeId) || 1;
        const progressPercent = Math.min(99, (seed * 7) % 100);
        const etaMinutes = Math.max(5, (seed * 13) % 240);
        return {
            routeList: `Route ${routeId} (carrier ${courierId})`,
            lastLocation: `Checkpoint-${(seed % 5) + 1}`,
            progressPercent,
            etaMinutes,
            timestamp: new Date().toISOString(),
        };
    }
}
exports.MockTrackingAdapter = MockTrackingAdapter;
