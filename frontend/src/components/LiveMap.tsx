'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';

// Fix for default Leaflet markers in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom Icons
const carIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3204/3204094.png',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png', // Just a placeholder, you might want a green pin
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
  className: 'hue-rotate-90 brightness-200' // Make it greenish via CSS filter
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/64/64113.png', 
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
  className: 'hue-rotate-[320deg] brightness-150' // Make it rose/reddish
});

const IITR_CENTER: [number, number] = [29.8649, 77.8966];

export default function LiveMap() {
  const { driverLocations, activeRides } = useSocketStore();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-slate-900 animate-pulse rounded-[2rem]"></div>;

  return (
    <div className="w-full h-full relative rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
      <MapContainer 
        center={IITR_CENTER} 
        zoom={15} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Render Online Drivers */}
        {Object.entries(driverLocations).map(([driverId, loc]) => (
          // Don't render the driver's own car if they are the driver (we'll render it differently or keep it)
          <Marker 
            key={driverId} 
            position={[loc.lat, loc.lng]} 
            icon={carIcon}
          >
            <Popup className="custom-popup">
              <div className="text-center font-bold text-slate-800">
                {user?.id === driverId ? "Your Vehicle" : "Online Driver"}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Active Ride Points (Static for now as string locations don't have lat/lng)
            In a real app, you would geocode the pickupLocation string to coords.
            For this demo, we'll just plot some placeholder markers if there's an active ride. */}
        {activeRides.length > 0 && (
          <>
            <Marker position={[29.8630, 77.8970]} icon={pickupIcon}>
              <Popup>Pickup: {activeRides[0].pickupLocation}</Popup>
            </Marker>
            <Marker position={[29.8670, 77.8950]} icon={dropoffIcon}>
              <Popup>Dropoff: {activeRides[0].dropLocation}</Popup>
            </Marker>
            <Polyline positions={[[29.8630, 77.8970], [29.8670, 77.8950]]} color="#6366f1" weight={4} dashArray="5, 10" />
          </>
        )}
      </MapContainer>
      
      {/* Map Overlay Gradient */}
      <div className="absolute inset-0 pointer-events-none rounded-[2rem] shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] z-10"></div>
    </div>
  );
}
