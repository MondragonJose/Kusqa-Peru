import { useState, useCallback } from "react";
import type { UserLocationState, GeolocationErrorType } from "../types";

const GEOLOCATION_ERROR_MESSAGES: Record<GeolocationErrorType, string> = {
  PERMISSION_DENIED: "Permiso de ubicación denegado por el usuario.",
  POSITION_UNAVAILABLE: "Ubicación GPS no disponible o fuera de cobertura.",
  TIMEOUT: "Tiempo de espera agotado al consultar la ubicación.",
  UNKNOWN_ERROR: "Ocurrió un error desconocido al rastrear la ubicación.",
};

export function useUserLocation() {
  const [state, setState] = useState<UserLocationState>({
    coords: null,
    loading: false,
    error: null,
    errorMessage: null,
  });

  const requestUserLocation = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setState({
        coords: null,
        loading: false,
        error: "POSITION_UNAVAILABLE",
        errorMessage: "La geolocalización no está soportada en este navegador.",
      });
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null, errorMessage: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          loading: false,
          error: null,
          errorMessage: null,
        });
      },
      (error) => {
        let errorType: GeolocationErrorType = "UNKNOWN_ERROR";
        if (error.code === error.PERMISSION_DENIED) {
          errorType = "PERMISSION_DENIED";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorType = "POSITION_UNAVAILABLE";
        } else if (error.code === error.TIMEOUT) {
          errorType = "TIMEOUT";
        }

        setState({
          coords: null,
          loading: false,
          error: errorType,
          errorMessage: GEOLOCATION_ERROR_MESSAGES[errorType],
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0,
      }
    );
  }, []);

  return {
    ...state,
    requestUserLocation,
  };
}
