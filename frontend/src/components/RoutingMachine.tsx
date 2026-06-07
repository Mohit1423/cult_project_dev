'use client';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet-routing-machine';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import { useMap } from 'react-leaflet';

interface RoutingMachineProps {
  start: [number, number];
  end: [number, number];
}

export default function RoutingMachine({ start, end }: RoutingMachineProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Remove any existing routing control if this rerenders
    const routingControl = L.Routing.control({
      waypoints: [
        L.latLng(start[0], start[1]),
        L.latLng(end[0], end[1])
      ],
      lineOptions: {
        styles: [{ color: "#6366f1", weight: 6, opacity: 0.8 }],
        extendToWaypoints: true,
        missingRouteTolerance: 0
      },
      show: false, // Hide the turn-by-turn itinerary panel
      addWaypoints: false,
      routeWhileDragging: false,
      fitSelectedRoutes: true,
      showAlternatives: false,
      createMarker: () => null // We'll render our own markers
    }).addTo(map);

    return () => {
      try {
        map.removeControl(routingControl);
      } catch (e) {
        // Ignore removal errors if map is already unmounted
      }
    };
  }, [map, start, end]);

  return null;
}
