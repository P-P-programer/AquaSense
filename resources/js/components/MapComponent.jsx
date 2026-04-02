import { useEffect, useRef, useState } from "react";
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

function getIcon(device) {
  if (!device.last_latitude || !device.last_longitude) {
    return iconOffline;
  }

  const lastSeenMs = Date.now() - new Date(device.last_seen_at).getTime();
  if (lastSeenMs > 60000) {
    return iconOffline;
  }

  if (device.last_location_meta?.inside_expected_zone === false) {
    return iconOutOfZone;
  }

  return iconOnline;
}

export default function MapComponent({ devices, onDeviceSelect, selectedDeviceId }) {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const markersRef = useRef({});
  const circlesRef = useRef({});

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
            ${device.last_location_meta?.city ? `Ciudad: ${device.last_location_meta.city}<br/>` : ""}
            ${device.last_location_meta?.country ? `País: ${device.last_location_meta.country}<br/>` : ""}
            ${device.distance_to_expected_m ? `Dist. objetivo: ${device.distance_to_expected_m}m<br/>` : ""}
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
      </div>
    </div>
  );
}
