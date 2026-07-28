"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [selected, setSelected] = useState<MapPoint | null>(null);

  const renderLayer = useCallback(
    async (ymaps: YMaps) => {
      const map = mapRef.current;
      if (!map) return;

      // Qatlam almashsa (rejim/filtr) tanlangan nishon endi mavjud bo'lmasligi mumkin.
      setSelected(null);

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
        // Yandex balloon'i ATAYLAB ishlatilmaydi (`openBalloonOnClick: false`):
        // clusterni bosib zoomlangandan keyin nishonni bosish balloon layout'ini
        // cheksiz siklga solib, butun sahifani muzlatib qo'yadi ("Page Unresponsive").
        // Clusterer balloon'i ham, `map.balloon` ham bir xil qotadi — shuning uchun
        // murojaat ma'lumoti React kartochkasida ko'rsatiladi.
        const placemark = new ymaps.Placemark(
          [p.lat, p.lng],
          {},
          { preset: "islands#circleIcon", iconColor: color, openBalloonOnClick: false }
        );
        placemark.events.add("click", () => setSelected(p));
        return placemark;
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
    <div className="relative">
      <div
        ref={containerRef}
        style={{ height: "560px", width: "100%" }}
        className="yandex-map-container overflow-hidden rounded-inner"
      />
      {selected && (
        <div className="absolute right-3 top-3 z-[3000] w-64 max-w-[calc(100%-1.5rem)] rounded-inner border border-border bg-bg-surface p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <span className="font-semibold text-text-primary">{selected.ticket_number}</span>
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Yopish"
              className="-mr-1 -mt-1 rounded-control px-2 py-0.5 text-text-muted transition hover:bg-bg-subtle hover:text-text-primary"
            >
              ×
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[selected.status] ?? "var(--text-muted)" }}
            />
            <span className="text-text-primary">{STATUS_LABELS[selected.status]}</span>
          </div>
          <p className="mt-1 text-sm text-text-muted">{selected.category_name}</p>
        </div>
      )}
    </div>
  );
}
