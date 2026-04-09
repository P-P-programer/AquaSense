import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function SurveyMap({ points }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    mapRef.current = L.map(containerRef.current).setView([4.4389, -75.2322], 8);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    layerRef.current = L.layerGroup().addTo(mapRef.current);
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;

    layerRef.current.clearLayers();

    if (!Array.isArray(points) || points.length === 0) return;

    const bounds = [];

    points.forEach((row) => {
      const lat = Number(row.latitude);
      const lng = Number(row.longitude);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const marker = L.circleMarker([lat, lng], {
        radius: 7,
        fillColor: "#0ea5e9",
        color: "#0369a1",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.75,
      });

      marker.bindPopup(`
        <div style="font-size:12px;line-height:1.35;min-width:220px;">
          <strong>${row.full_name}</strong><br/>
          Documento: ${row.document_id}<br/>
          Ciudad seleccionada: ${row.selected_city}<br/>
          Nivel educativo: ${row.education_level}<br/>
          Ubicacion: ${lat.toFixed(5)}, ${lng.toFixed(5)}<br/>
          ${row.address ? `Direccion aproximada: ${row.address}<br/>` : ""}
          Fecha: ${new Date(row.created_at).toLocaleString()}
        </div>
      `);

      marker.addTo(layerRef.current);
      bounds.push([lat, lng]);
    });

    if (bounds.length > 0) {
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [points]);

  return <div ref={containerRef} className="survey-map" />;
}
