"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet.heat";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/status";
import type { HeatmapPoint, MapPoint } from "@/lib/types";

// Uychi shahri (tuman markazi) — Step2Location.tsx bilan bir xil manba/izoh.
const UYCHI_CENTER: [number, number] = [41.0294, 71.8483];

function markerIcon(status: MapPoint["status"]) {
  const color = STATUS_COLORS[status] ?? "var(--accent)";
  return L.divIcon({
    className: "",
    html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${color};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 5px rgba(10,30,60,0.35)"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
}

function HeatLayer({ points }: { points: HeatmapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const layer = L.heatLayer(
      points.map((p) => [p.lat, p.lng, p.weight]),
      { radius: 28, blur: 20, maxZoom: 16 }
    );
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);

  return null;
}

export default function ComplaintsMap({
  mode,
  points,
  heatmapPoints,
}: {
  mode: "cluster" | "heatmap";
  points: MapPoint[];
  heatmapPoints: HeatmapPoint[];
}) {
  return (
    <MapContainer
      center={UYCHI_CENTER}
      zoom={12}
      style={{ height: "560px", width: "100%" }}
      className="rounded-inner overflow-hidden"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {mode === "heatmap" ? (
        <HeatLayer points={heatmapPoints} />
      ) : (
        <MarkerClusterGroup chunkedLoading>
          {points.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={markerIcon(p.status)}>
              <Popup>
                <div className="flex flex-col gap-0.5 text-sm">
                  <strong>{p.ticket_number}</strong>
                  <span>{STATUS_LABELS[p.status]}</span>
                  <span className="text-text-muted">{p.category_name}</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}
    </MapContainer>
  );
}
