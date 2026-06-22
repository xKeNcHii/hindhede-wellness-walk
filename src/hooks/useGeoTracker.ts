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
  // Accuracy-gated reference used ONLY for distance accounting. Kept separate
  // from the store's lastFix so we can always show the player's position on the
  // map even when fixes are too coarse to count toward distance.
  const anchor = useRef<GeoFix | null>(null);

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

        // Distance accounting: compare against an accuracy-gated anchor and
        // only count movement when the new fix is precise enough.
        const d = acceptedDistance(anchor.current, fix, DEFAULT_FILTER);
        if (d > 0) {
          anchor.current = fix;
          addDistance(d, fix);
          return;
        }
        if (!anchor.current && fix.accuracy <= DEFAULT_FILTER.maxAccuracy) {
          anchor.current = fix;
        }

        // Always surface the latest position so the map marker + geofence work,
        // even if this fix is too coarse to add distance. addDistance(0, …)
        // updates lastFix without changing the total.
        addDistance(0, fix);
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
