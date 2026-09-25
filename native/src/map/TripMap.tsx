import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { apiClient } from '../api/client';
import { useTheme } from '../theme';
import { defaultStyle, resolveMapStyle, type MapStyle } from './basemap';
import type { MapPoint } from './points';

function mapDocument(style: MapStyle, ink: string, fg: string): string {
  const styleLiteral = JSON.stringify(style).replaceAll('<', '\\u003c');
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
<style>
  html, body, #map { margin: 0; height: 100%; background: #e8e6e1; }
  .pin {
    width: 28px; height: 28px; border-radius: 14px;
    background: ${ink}; color: ${fg};
    display: flex; align-items: center; justify-content: center;
    font: 700 13px -apple-system, sans-serif;
    border: 2.5px solid #fff;
    box-shadow: 0 4px 14px rgba(0,0,0,.35);
  }
  .maplibregl-ctrl-attrib { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
<script>
  var pending = [];
  var pendingRoute = [];
  var apply = null;
  window.__setPlaces = function (places, route) {
    pending = places || [];
    pendingRoute = route || [];
    if (apply) apply(pending, pendingRoute);
  };
  var map = new maplibregl.Map({
    container: 'map',
    style: ${styleLiteral},
    center: [0, 20],
    zoom: 1.4,
    attributionControl: false
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }));
  var markers = [];
  map.on('load', function () {
    apply = function (places, route) {
      markers.forEach(function (marker) { marker.remove(); });
      markers = [];
      if (map.getLayer('route-line-casing')) map.removeLayer('route-line-casing');
      if (map.getLayer('route-line')) map.removeLayer('route-line');
      if (map.getSource('route')) map.removeSource('route');

      if (!places.length) return;
      var bounds = new maplibregl.LngLatBounds();
      places.forEach(function (place, index) {
        var el = document.createElement('div');
        el.className = 'pin';
        el.textContent = String(index + 1);
        markers.push(new maplibregl.Marker({ element: el })
          .setLngLat([place.lng, place.lat])
          .setPopup(new maplibregl.Popup({ offset: 18, closeButton: false }).setText(place.name))
          .addTo(map));
        bounds.extend([place.lng, place.lat]);
      });

      var lineCoords = (route && route.length >= 2)
        ? route
        : places.map(function(p) { return [p.lng, p.lat]; });

      if (lineCoords.length >= 2) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: lineCoords
            }
          }
        });

        map.addLayer({
          id: 'route-line-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '${ink}',
            'line-width': 7,
            'line-opacity': 0.22
          }
        });

        map.addLayer({
          id: 'route-line',
          type: 'line',
          source: 'route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '${ink}',
            'line-width': 3.5,
            'line-dasharray': [1.5, 1.5]
          }
        });

        lineCoords.forEach(function (c) { bounds.extend(c); });
      }

      if (places.length === 1) {
        map.jumpTo({ center: [places[0].lng, places[0].lat], zoom: 13 });
      } else {
        map.fitBounds(bounds, { padding: { top: 150, bottom: 130, left: 48, right: 48 }, maxZoom: 14, duration: 0 });
      }
    };
    apply(pending, pendingRoute);
  });
</script>
</body>
</html>`;
}

export function TripMap({ points, routeCoordinates }: { points: MapPoint[]; routeCoordinates?: [number, number][] }) {
  const { m, isDark } = useTheme();
  const webRef = useRef<WebView>(null);
  const [style, setStyle] = useState<MapStyle>(defaultStyle(isDark));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await apiClient.get<{ settings?: Record<string, unknown> }>('/settings');
        const settings = data.settings ?? {};
        const template = typeof settings.map_tile_url === 'string' ? settings.map_tile_url : '';
        const cartoKey = typeof settings.carto_api_key === 'string' ? settings.carto_api_key : '';
        if (!cancelled) setStyle(resolveMapStyle(template, isDark, cartoKey));
      } catch {
        if (!cancelled) setStyle(defaultStyle(isDark));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isDark]);

  const html = useMemo(
    () => mapDocument(style, isDark ? '#F5F5F7' : '#101013', isDark ? '#101013' : '#ffffff'),
    [style, isDark],
  );

  useEffect(() => {
    setReady(false);
  }, [html]);

  useEffect(() => {
    if (!ready) return;
    const payload = JSON.stringify(points).replaceAll('<', '\\u003c');
    const routePayload = JSON.stringify(routeCoordinates ?? []).replaceAll('<', '\\u003c');
    webRef.current?.injectJavaScript(`window.__setPlaces(${payload}, ${routePayload}); true;`);
  }, [points, routeCoordinates, ready, style]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://tiles.openfreemap.org' }}
        style={{ flex: 1, backgroundColor: m.mapBg }}
        onLoadEnd={() => setReady(true)}
        setSupportMultipleWindows={false}
      />
      {!ready ? (
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <ActivityIndicator color={m.ink} />
        </View>
      ) : null}
    </View>
  );
}
