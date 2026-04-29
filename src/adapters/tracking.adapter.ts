export interface TrackResponse {
  routeList: string;
  lastLocation: string;
  progressPercent: number;
  etaMinutes: number;
  timestamp: string;
}

export interface TrackingAdapter {
  trackRoute(courierId: string, routeId: string): Promise<TrackResponse>;
}
