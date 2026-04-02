import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Iconos por estado
const iconOnline = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzEwYjk4MSIvPjwvc3ZnPg==",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconOutOfZone = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI2YwYzk0YiIvPjwvc3ZnPg==",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconOffline = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iI2VmNDQ0NCIvPjwvc3ZnPg==",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const iconInactive = L.icon({
  iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzZhNzI4MCIvPjwvc3ZnPg==",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function getIcon(device) {
  if (device.is_active === false) {
    return iconInactive;
  }

  if (!device.last_latitude || !device.last_longitude) {
    return iconOffline;
  }

  const lastSeenMs = Date.now() - new Date(device.last_seen_at).getTime();
  if (lastSeenMs > 60000) {
    return iconOffline;
  }

  if (device.latest_location?.inside_expected_zone === false) {
    return iconOutOfZone;
  }

  return iconOnline;
}

export default function MapComponent({
  devices,
  onDeviceSelect,
  selectedDeviceId,
  zoneDraft,
  onPickZoneCenter,
  mapFocusTarget,
  zonePickerEnabled,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});
  const zoneDraftCircleRef = useRef(null);
  const zoneDraftMarkerRef = useRef(null);

  // Inicializar mapa
  useEffect(() => {
    if (map.current) return;

    map.current = L.map(mapContainer.current).setView([4.7110, -74.0721], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map.current);
  }, []);

  // Actualizar marcadores
  useEffect(() => {
    if (!map.current) return;

    devices.forEach((device) => {
      const markerId = `device_${device.id}`;

      // Eliminar marcador existente
      if (markersRef.current[markerId]) {
        map.current.removeLayer(markersRef.current[markerId]);
      }
      if (circlesRef.current[markerId]) {
        map.current.removeLayer(circlesRef.current[markerId]);
      }

      // Si tiene ubicación, agregar marcador
      if (device.last_latitude && device.last_longitude) {
        const icon = getIcon(device);

        const marker = L.marker([device.last_latitude, device.last_longitude], { icon }).addTo(map.current);

        marker.bindPopup(`
          <div class="leaflet-popup-content-wrapper" style="font-size: 12px;">
            <strong>${device.name}</strong><br/>
            <small>${device.identifier}</small><br/>
            Lat/Lng: ${Number(device.last_latitude).toFixed(6)}, ${Number(device.last_longitude).toFixed(6)}<br/>
            Precisión: ${device.last_accuracy_m ?? "—"} m<br/>
            ${device.latest_location?.city ? `Ciudad: ${device.latest_location.city}<br/>` : ""}
            ${device.latest_location?.country ? `País: ${device.latest_location.country}<br/>` : ""}
            ${device.latest_location?.distance_to_expected_m != null ? `Dist. objetivo: ${device.latest_location.distance_to_expected_m}m<br/>` : ""}
            Estado dispositivo: ${device.is_active ? "Activo" : "Inactivo"}<br/>
            Dueño: ${device.user?.name ?? "Sin asignar"}
          </div>
        `);

        marker.on("click", () => onDeviceSelect(device.id));

        if (selectedDeviceId === device.id) {
          marker.setIcon(
            L.icon({
              ...icon.options,
              className: "leaflet-marker-selected",
              iconSize: [40, 40],
              iconAnchor: [20, 40],
            })
          );
        }

        markersRef.current[markerId] = marker;

        // Zona esperada (círculo)
        if (device.expected_latitude && device.expected_longitude) {
          const circle = L.circle([device.expected_latitude, device.expected_longitude], {
            radius: device.expected_radius_m || 100,
            color: "#3b82f6",
            fill: true,
            fillColor: "#3b82f6",
            fillOpacity: 0.1,
            weight: 2,
            dashArray: "5, 5",
          }).addTo(map.current);

          circlesRef.current[markerId] = circle;
        }
      }
    });
  }, [devices, selectedDeviceId, onDeviceSelect]);

  // Click en mapa para fijar centro de zona esperada
  useEffect(() => {
    if (!map.current || !onPickZoneCenter) return;

    const handleMapClick = (event) => {
      if (!zonePickerEnabled) return;

      const { lat, lng } = event.latlng;
      onPickZoneCenter({ latitude: lat, longitude: lng });
    };

    map.current.on("click", handleMapClick);

    return () => {
      map.current.off("click", handleMapClick);
    };
  }, [onPickZoneCenter, zonePickerEnabled]);

  // Dibujar zona esperada en edición interactiva
  useEffect(() => {
    if (!map.current) return;

    if (zoneDraftMarkerRef.current) {
      map.current.removeLayer(zoneDraftMarkerRef.current);
      zoneDraftMarkerRef.current = null;
    }

    if (zoneDraftCircleRef.current) {
      map.current.removeLayer(zoneDraftCircleRef.current);
      zoneDraftCircleRef.current = null;
    }

    const lat = Number(zoneDraft?.latitude);
    const lng = Number(zoneDraft?.longitude);
    const radius = Number(zoneDraft?.radius || 100);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return;
    }

    zoneDraftMarkerRef.current = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDMyIDMyIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNCIgZmlsbD0iIzNiODJmNiIvPjwvc3ZnPg==",
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      }),
    }).addTo(map.current);

    zoneDraftCircleRef.current = L.circle([lat, lng], {
      radius: Number.isFinite(radius) ? Math.max(10, radius) : 100,
      color: "#2563eb",
      fill: true,
      fillColor: "#60a5fa",
      fillOpacity: 0.18,
      weight: 2,
    }).addTo(map.current);
  }, [zoneDraft]);

  // Recentrar mapa cuando se selecciona una ciudad
  useEffect(() => {
    if (!map.current || !mapFocusTarget) return;

    if (Number.isFinite(mapFocusTarget.latitude) && Number.isFinite(mapFocusTarget.longitude)) {
      map.current.flyTo([mapFocusTarget.latitude, mapFocusTarget.longitude], mapFocusTarget.zoom ?? 15, {
        duration: 1,
      });
    }
  }, [mapFocusTarget]);

  // Centrar en dispositivo seleccionado
  useEffect(() => {
    if (!map.current || !selectedDeviceId) return;

    const selected = devices.find((d) => d.id === selectedDeviceId);
    if (selected && selected.last_latitude && selected.last_longitude) {
      map.current.flyTo([selected.last_latitude, selected.last_longitude], 16, { duration: 1 });
    }
  }, [selectedDeviceId, devices]);

  return (
    <div className="aq-map-container">
      <div ref={mapContainer} className="aq-map" style={{ height: "400px", width: "100%" }} />
      <div className="aq-map-legend">
        <div className="aq-legend-item">
          <span className="aq-legend-dot online"></span> En zona
        </div>
        <div className="aq-legend-item">
          <span className="aq-legend-dot warning"></span> Fuera de zona
        </div>
        <div className="aq-legend-item">
          <span className="aq-legend-dot offline"></span> Offline
        </div>
        <div className="aq-legend-item">
          <span className="aq-legend-dot inactive"></span> Dispositivo inactivo
        </div>
        {zonePickerEnabled && (
          <div className="aq-legend-item">
            <span className="aq-legend-dot" style={{ background: "#2563eb" }}></span> Click para fijar zona
          </div>
        )}
      </div>
    </div>
  );
}
