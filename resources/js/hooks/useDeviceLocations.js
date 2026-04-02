import { useEffect, useRef, useState } from "react";

/**
 * Hook para polling de ubicaciones de dispositivos en tiempo real
 * Actualiza cada 15 segundos para mostrar posiciones actuales
 */
export function useDeviceLocations(devices, api, pollingIntervalMs = 15000) {
  const [locationsData, setLocationsData] = useState({});
  const pollingIntervalRef = useRef(null);
  const isPollingRef = useRef(false);

  const fetchLocations = async () => {
    if (isPollingRef.current || !devices.length) return;

    isPollingRef.current = true;

    try {
      const results = {};

      await Promise.all(
        devices.map(async (device) => {
          try {
            const locations = await api.getAdminDeviceLocations(device.id, 1);
            if (locations && locations.length > 0) {
              results[device.id] = locations[0];
            }
          } catch (err) {
            // Silent fail para polling
            console.warn(`Failed to fetch locations for device ${device.id}:`, err.message);
          }
        })
      );

      setLocationsData(results);
    } catch (err) {
      console.warn("Error fetching device locations:", err.message);
    } finally {
      isPollingRef.current = false;
    }
  };

  // Iniciar polling
  useEffect(() => {
    fetchLocations(); // Fetch inicial inmediatamente

    pollingIntervalRef.current = setInterval(() => {
      fetchLocations();
    }, pollingIntervalMs);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [devices, pollingIntervalMs]);

  return locationsData;
}
