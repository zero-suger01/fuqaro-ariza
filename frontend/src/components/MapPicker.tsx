"use client";

import { useEffect, useRef } from "react";
import { loadYandexMaps, type YMaps } from "@/lib/yandexMaps";

export default function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<YMaps | null>(null);
  const placemarkRef = useRef<YMaps | null>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let cancelled = false;

    loadYandexMaps().then((ymaps) => {
      if (cancelled || !containerRef.current) return;

      const map = new ymaps.Map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        controls: ["zoomControl"],
      });
      mapRef.current = map;

      const placemark = new ymaps.Placemark(
        [lat, lng],
        {},
        { preset: "islands#goldDotIcon", draggable: true }
      );
      placemarkRef.current = placemark;
      map.geoObjects.add(placemark);

      map.events.add("click", (e: YMaps) => {
        const coords = e.get("coords") as [number, number];
        placemark.geometry.setCoordinates(coords);
        onChangeRef.current(coords[0], coords[1]);
      });
      placemark.events.add("dragend", () => {
        const coords = placemark.geometry.getCoordinates() as [number, number];
        onChangeRef.current(coords[0], coords[1]);
      });
    });

    return () => {
      cancelled = true;
      mapRef.current?.destroy();
      mapRef.current = null;
      placemarkRef.current = null;
    };
    // Map is only ever created once — lat/lng changes after that are handled
    // by the effect below (moving the existing placemark), not a re-create.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const placemark = placemarkRef.current;
    if (!placemark) return;
    const current = placemark.geometry.getCoordinates() as [number, number];
    if (current[0] !== lat || current[1] !== lng) {
      placemark.geometry.setCoordinates([lat, lng]);
      mapRef.current?.setCenter([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div
      ref={containerRef}
      style={{ height: "260px", width: "100%" }}
      className="yandex-map-container overflow-hidden rounded-inner"
    />
  );
}
