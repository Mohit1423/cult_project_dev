'use client';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import { Polyline } from 'react-leaflet';

interface RoutingMachineProps {
  start: [number, number];
  end: [number, number];
}

export default function RoutingMachine({ start, end }: RoutingMachineProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  // Throttle API requests by only refetching when coordinates change by ~200m
  const startKey = `${start[0].toFixed(3)},${start[1].toFixed(3)}`;
  const endKey = `${end[0].toFixed(3)},${end[1].toFixed(3)}`;

  useEffect(() => {
    // Create a headless OSRM router with explicit serviceUrl to suppress demo server warning popups
    const router = L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    });
    
    router.route([
      L.Routing.waypoint(L.latLng(start[0], start[1])),
      L.Routing.waypoint(L.latLng(end[0], end[1]))
    // @ts-expect-error - leaflet-routing-machine types are inaccurate
    ], (err: Error | null, routes: { coordinates: L.LatLng[] }[]) => {
      if (!err && routes && routes.length > 0) {
        const coords = routes[0].coordinates.map((c: L.LatLng) => [c.lat, c.lng] as [number, number]);
        setRouteCoords(coords);
      } else {
        setRouteCoords([]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, endKey]);

  // If we have a route, dynamically prepend the exact current driver 'start' position 
  // so the line never detaches from the moving car marker!
  const displayCoords: [number, number][] = routeCoords.length > 0 
    ? [start, ...routeCoords, end] 
    : [start, end];

  if (routeCoords.length === 0) return null;

  return (
    <Polyline 
      positions={displayCoords} 
      color="#6366f1" 
      weight={6} 
      opacity={0.8}
      pathOptions={{ lineCap: 'round', lineJoin: 'round' }}
    />
  );
}
