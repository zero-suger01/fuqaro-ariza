"use client";

import { useCallback, useEffect, useRef } from "react";
import { loadYandexMaps, type YMaps } from "@/lib/yandexMaps";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/status";
import type { HeatmapPoint, MapPoint } from "@/lib/types";

// Uychi shahri (tuman markazi) — Step2Location.tsx bilan bir xil manba/izoh.
const UYCHI_CENTER: [number, number] = [41.0294, 71.8483];

/**
 * `var(--token)` ni haqiqiy hex rangga aylantiradi.
 *
 * Yandex Maps `iconColor` ni o'z ichki SVG ikonasiga uzatadi va CSS
 * custom property'ni HAL QILA OLMAYDI — `STATUS_COLORS` esa `var(--info)`
 * ko'rinishidagi qiymatlarni qaytaradi, ya'ni xarita nishonlari haqiqiy
 * rangni hech qachon olmagan (faqat status xaritada yo'q bo'lganda
 * ishlaydigan hardcode fallback real hex edi). Shu yerda tokenni
 * hujjatning hisoblangan uslubidan o'qib beramiz — natijada nishonlar
 * light/dark temaga ham to'g'ri moslashadi.
 */
function resolveColor(value: string): string {
  const token = value.match(/^var\((--[\w-]+)\)$/);
  if (!token) return value;
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(token[1])
    .trim();
  return resolved || "#66667e";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMaps | null>(null);
  const layerRef = useRef<YMaps | null>(null);

  const renderLayer = useCallback(
    async (ymaps: YMaps) => {
      const map = mapRef.current;
      if (!map) return;

      if (layerRef.current) {
        if (typeof layerRef.current.destroy === "function") {
          layerRef.current.destroy();
        } else {
          map.geoObjects.remove(layerRef.current);
        }
        layerRef.current = null;
      }

      if (mode === "heatmap") {
        // ymaps.Heatmap isn't in the standard 2.1 bundle (and Yandex hasn't
        // published a reliably loadable module URL for it) — approximate a
        // heatmap with overlapping translucent circles instead: denser
        // clusters of points naturally layer into a hotter-looking area.
        // Radius/opacity scale with each point's weight.
        const maxWeight = Math.max(1, ...heatmapPoints.map((p) => p.weight));
        const collection = new ymaps.GeoObjectCollection();
        for (const p of heatmapPoints) {
          const intensity = p.weight / maxWeight;
          const circle = new ymaps.Circle(
            [[p.lat, p.lng], 150 + intensity * 250],
            {},
            {
              // Issiqlik xaritasi ataylab iliq rangda (universal metafora),
              // lekin endi palitraning qizilidan olinadi — avvalgi #e04b29
              // eski to'q sariq accent oilasidan qolgan yetim rang edi.
              fillColor: `${resolveColor("var(--danger)")}55`,
              strokeWidth: 0,
              fillOpacity: 0.25 + intensity * 0.35,
            }
          );
          collection.add(circle);
        }
        map.geoObjects.add(collection);
        layerRef.current = collection;
        return;
      }

      const clusterer = new ymaps.Clusterer({
        preset: "islands#invertedVioletClusterIcons",
        groupByCoordinates: false,
      });
      const placemarks = points.map((p) => {
        const color = resolveColor(STATUS_COLORS[p.status] ?? "var(--text-muted)");
        return new ymaps.Placemark(
          [p.lat, p.lng],
          {
            balloonContentHeader: p.ticket_number,
            balloonContentBody: `${STATUS_LABELS[p.status]}<br/>${p.category_name}`,
          },
          { preset: "islands#circleIcon", iconColor: color }
        );
      });
      clusterer.add(placemarks);
      map.geoObjects.add(clusterer);
      layerRef.current = clusterer;
    },
    [mode, points, heatmapPoints]
  );

  useEffect(() => {
    let cancelled = false;

    loadYandexMaps().then((ymaps) => {
      if (cancelled || !containerRef.current) return;
      const map = new ymaps.Map(containerRef.current, {
        center: UYCHI_CENTER,
        zoom: 12,
        controls: ["zoomControl", "fullscreenControl"],
      });
      mapRef.current = map;
      renderLayer(ymaps);
    });

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      layerRef.current = null;
    };
    // Map is created once; renderLayer's own dependencies handle re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    loadYandexMaps().then((ymaps) => renderLayer(ymaps));
  }, [renderLayer]);

  return (
    <div
      ref={containerRef}
      style={{ height: "560px", width: "100%" }}
      className="yandex-map-container overflow-hidden rounded-inner"
    />
  );
}
