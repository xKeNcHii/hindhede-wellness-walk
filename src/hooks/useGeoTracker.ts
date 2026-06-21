import { useEffect, useRef } from "react";
import { useGameStore } from "../store/useGameStore";
import { acceptedDistance, DEFAULT_FILTER, GeoFix } from "../lib/geo";

/**
 * Watches device GPS, filters jitter/vehicle-speed jumps, and feeds accepted
 * distance into the game store. Also exposes the latest fix for geofencing.
 */
export function useGeoTracker(enabled: boolean) {
  const setGpsStatus = useGameStore((s) => s.setGpsStatus);
  const addDistance = useGameStore((s) => s.addDistance);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (!("geolocation" in navigator)) {
      setGpsStatus("unavailable");
      return;
    }

    setGpsStatus("requesting");

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus("tracking");
        const fix: GeoFix = {
          coord: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: pos.coords.accuracy ?? 9999,
          timestamp: pos.timestamp,
        };
        const prev = useGameStore.getState().lastFix;
        const d = acceptedDistance(prev, fix, DEFAULT_FILTER);
        if (d > 0) {
          addDistance(d, fix);
        } else if (!prev && fix.accuracy <= DEFAULT_FILTER.maxAccuracy) {
          // Seed the reference fix without adding distance.
          addDistance(0, fix);
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus("denied");
        else setGpsStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    };
  }, [enabled, setGpsStatus, addDistance]);
}
