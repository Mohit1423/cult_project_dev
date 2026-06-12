'use client';
import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useSocketStore } from '@/store/socketStore';
import { useAuthStore } from '@/store/authStore';
import RoutingMachine from './RoutingMachine';
import { getClosestLocation, isPointInCampus } from '@/lib/iitrLocations';
import { socket } from '@/lib/socket';
import { Star, Phone, X } from 'lucide-react';

// Custom Premium markers using L.divIcon
const userIcon = L.divIcon({
  className: 'custom-user-marker-icon',
  html: `<div class="relative flex items-center justify-center w-6 h-6">
    <div class="absolute w-full h-full bg-blue-500 rounded-full animate-ping opacity-40"></div>
    <div class="relative w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12]
});

const carIcon = L.divIcon({
  className: 'custom-car-marker-icon',
  html: `<div class="relative flex items-center justify-center w-10 h-10 bg-slate-900 rounded-full border-2 border-emerald-400 shadow-xl hover:scale-110 transition-transform">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 text-emerald-400">
      <path d="M4.5 10.5C3.67 10.5 3 11.17 3 12v3c0 .83.67 1.5 1.5 1.5h15c.83 0 1.5-.67 1.5-1.5v-3c0-.83-.67-1.5-1.5-1.5h-15zM6 14.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm12 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM5.5 9h13L16 5.5H8L5.5 9z"/>
    </svg>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20]
});

const pickupIcon = L.divIcon({
  className: 'custom-pickup-marker-icon',
  html: `<div class="flex flex-col items-center">
    <div class="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs">A</div>
    <div class="w-1.5 h-2 bg-emerald-500 -mt-0.5 rounded-b"></div>
  </div>`,
  iconSize: [32, 36],
  iconAnchor: [16, 36],
  popupAnchor: [0, -36]
});

const dropoffIcon = L.divIcon({
  className: 'custom-dropoff-marker-icon',
  html: `<div class="flex flex-col items-center">
    <div class="w-8 h-8 rounded-full bg-rose-500 border-2 border-white shadow-lg flex items-center justify-center text-white font-black text-xs">B</div>
    <div class="w-1.5 h-2 bg-rose-500 -mt-0.5 rounded-b"></div>
  </div>`,
  iconSize: [32, 36],
  iconAnchor: [16, 36],
  popupAnchor: [0, -36]
});

// Pin icon for temporary clicks
const clickPinIcon = L.divIcon({
  className: 'custom-click-pin-icon',
  html: `<div class="relative flex items-center justify-center w-8 h-8 bg-slate-900 border-2 border-indigo-400 rounded-full shadow-2xl animate-bounce">
    <div class="w-2.5 h-2.5 bg-indigo-500 rounded-full"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const IITR_CENTER: [number, number] = [29.8649, 77.8966];

function MapController({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, map.getZoom());
  }, [center, map]);
  return null;
}

function MapEventsHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

export default function LiveMap() {
  const { driverLocations, activeRides, passengerSelection, setPassengerSelection } = useSocketStore();
  const { user } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [center, setCenter] = useState<[number, number]>(IITR_CENTER);
  const [clickPos, setClickPos] = useState<[number, number] | null>(null);
  const [lastPannedStatus, setLastPannedStatus] = useState<string | null>(null);
  const [showOutsideModal, setShowOutsideModal] = useState(false);
  const [topDrivers, setTopDrivers] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setCenter(loc);
          setUserLoc(loc);
        },
        (error) => {
          console.warn('Geolocation failed, falling back to default center.', error);
        }
      );
    }
    return () => clearTimeout(timer);
  }, []);

  // Sync map center when selection variables are updated in passenger dashboard
  useEffect(() => {
    if (passengerSelection.pickupLat && passengerSelection.pickupLng) {
      setCenter([passengerSelection.pickupLat, passengerSelection.pickupLng]);
    }
  }, [passengerSelection.pickupLat, passengerSelection.pickupLng]);

  useEffect(() => {
    if (passengerSelection.dropLat && passengerSelection.dropLng) {
      setCenter([passengerSelection.dropLat, passengerSelection.dropLng]);
    }
  }, [passengerSelection.dropLat, passengerSelection.dropLng]);

  // Auto-pan to driver during an active ride (Uber style) - but only ONCE per status change so user can pan freely!
  useEffect(() => {
    if (activeRides.length > 0) {
      const ride = activeRides[0];
      const statusKey = `${ride.id}-${ride.status}`;
      
      if ((ride.status === 'ACCEPTED' || ride.status === 'IN_PROGRESS' || ride.status === 'ARRIVED') && ride.driverId) {
        if (lastPannedStatus !== statusKey) {
          const driverLoc = driverLocations[ride.driverId];
          if (driverLoc) {
            setCenter([driverLoc.lat, driverLoc.lng]);
            setLastPannedStatus(statusKey);
          }
        }
      }
    } else {
      setLastPannedStatus(null);
    }
  }, [activeRides, driverLocations, lastPannedStatus]);

  if (!mounted) return <div className="w-full h-full bg-slate-950 animate-pulse"></div>;

  const activeRide = activeRides[0];
  const hasActiveRidePoints = activeRide && activeRide.pickupLat && activeRide.pickupLng && activeRide.dropLat && activeRide.dropLng;

  // Handle map click
  const handleMapClick = (lat: number, lng: number) => {
    // Drivers should not be able to drop pins
    if (user?.role === 'DRIVER') return;
    
    // If selectingField was set, geocode directly
    if (passengerSelection.selectingField) {
      const field = passengerSelection.selectingField;
      geocodeAndSet(lat, lng, field);
    } else {
      // Otherwise, open the selection popup
      setClickPos([lat, lng]);
    }
  };

  const geocodeAndSet = async (lat: number, lng: number, field: 'pickup' | 'drop') => {
    setClickPos(null); // Close click pin popup
    
    // Enforce Campus-Only Rides
    if (!isPointInCampus(lat, lng)) {
      setShowOutsideModal(true);
      socket.emit('get_top_drivers', {}, (res: { success: boolean, drivers?: any[] }) => {
        if (res && res.success) {
          setTopDrivers(res.drivers || []);
        }
      });
      return;
    }

    // Inside Campus: Try to snap to the closest named location, or fallback to generic name
    const closest = getClosestLocation(lat, lng);
    let name = closest ? closest.name : `Inside IIT Campus`;
    
    if (field === 'pickup') {
      setPassengerSelection({ pickupLat: lat, pickupLng: lng, pickupName: name, selectingField: null });
    } else {
      setPassengerSelection({ dropLat: lat, dropLng: lng, dropName: name, selectingField: null });
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapContainer 
        center={center} 
        zoom={16} 
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <MapController center={center} />
        <MapEventsHandler onMapClick={handleMapClick} />
        <TileLayer
          url="http://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          attribution="&copy; Google Maps"
          maxZoom={20}
        />

        {/* User Current Location Marker */}
        {userLoc && (
          <Marker position={userLoc} icon={userIcon}>
            <Popup>
              <div className="font-semibold text-slate-800">You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Render Online Drivers */}
        {Object.entries(driverLocations).map(([driverId, loc]) => (
          <Marker 
            key={driverId} 
            position={[loc.lat, loc.lng]} 
            icon={carIcon}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1}>
              <div className="p-1 text-slate-950 font-sans">
                <p className="font-extrabold text-sm">{user?.id === driverId ? "Your Vehicle" : (loc.name || "E-Rickshaw Driver")}</p>
                {loc.phone && <p className="text-xs text-slate-600 font-bold mt-0.5">{loc.phone}</p>}
              </div>
            </Tooltip>
          </Marker>
        ))}

        {/* Temporary click pin popup */}
        {clickPos && (
          <Marker position={clickPos} icon={clickPinIcon}>
            <Popup minWidth={150}>
              <div className="flex flex-col gap-2 p-1 font-sans">
                <p className="text-[10px] text-slate-400 font-bold uppercase text-center tracking-wider">Set Point</p>
                <button 
                  onClick={() => geocodeAndSet(clickPos[0], clickPos[1], 'pickup')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-2 px-3 rounded-lg shadow transition-colors"
                >
                  Set as Pickup
                </button>
                <button 
                  onClick={() => geocodeAndSet(clickPos[0], clickPos[1], 'drop')}
                  className="bg-rose-500 hover:bg-rose-400 text-white font-black text-xs py-2 px-3 rounded-lg shadow transition-colors"
                >
                  Set as Dropoff
                </button>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Render Pre-Booking Draft Markers and Route */}
        {!hasActiveRidePoints && passengerSelection.pickupLat && passengerSelection.pickupLng && (
          <Marker position={[passengerSelection.pickupLat, passengerSelection.pickupLng]} icon={pickupIcon}>
            <Popup>Pickup: {passengerSelection.pickupName}</Popup>
          </Marker>
        )}

        {!hasActiveRidePoints && passengerSelection.dropLat && passengerSelection.dropLng && (
          <Marker position={[passengerSelection.dropLat, passengerSelection.dropLng]} icon={dropoffIcon}>
            <Popup>Dropoff: {passengerSelection.dropName}</Popup>
          </Marker>
        )}

        {!hasActiveRidePoints && passengerSelection.pickupLat && passengerSelection.pickupLng && passengerSelection.dropLat && passengerSelection.dropLng && (
          <RoutingMachine 
            start={[passengerSelection.pickupLat, passengerSelection.pickupLng]} 
            end={[passengerSelection.dropLat, passengerSelection.dropLng]} 
          />
        )}

        {/* Render Active Ride Points with True Geocoded Coordinates */}
        {hasActiveRidePoints && (
          <>
            <Marker position={[activeRide.pickupLat!, activeRide.pickupLng!]} icon={pickupIcon}>
              <Popup>Pickup: {activeRide.pickupLocation}</Popup>
            </Marker>
            <Marker position={[activeRide.dropLat!, activeRide.dropLng!]} icon={dropoffIcon}>
              <Popup>Dropoff: {activeRide.dropLocation}</Popup>
            </Marker>
            {activeRide.status === 'ACCEPTED' && activeRide.driverId && driverLocations[activeRide.driverId] ? (
              <RoutingMachine 
                start={[driverLocations[activeRide.driverId].lat, driverLocations[activeRide.driverId].lng]} 
                end={[activeRide.pickupLat!, activeRide.pickupLng!]} 
              />
            ) : activeRide.status === 'IN_PROGRESS' && activeRide.driverId && driverLocations[activeRide.driverId] ? (
              <RoutingMachine 
                start={[driverLocations[activeRide.driverId].lat, driverLocations[activeRide.driverId].lng]} 
                end={[activeRide.dropLat!, activeRide.dropLng!]} 
              />
            ) : (
              <RoutingMachine 
                start={[activeRide.pickupLat!, activeRide.pickupLng!]} 
                end={[activeRide.dropLat!, activeRide.dropLng!]} 
              />
            )}
          </>
        )}
      </MapContainer>

      {/* Out of Bounds Modal */}
      {showOutsideModal && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowOutsideModal(false)}
              className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors z-10"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="bg-indigo-600 p-6 text-white text-center">
              <h3 className="font-black text-xl mb-1">Out of Bounds!</h3>
              <p className="text-indigo-200 text-xs font-semibold">Campus cab service is restricted to inside IIT Roorkee.</p>
            </div>
            
            <div className="p-5">
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider text-center mb-4">
                Call our top rated external drivers
              </p>
              
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {topDrivers.length > 0 ? topDrivers.map((d: any, idx: number) => (
                  <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-xs border border-indigo-200">
                        #{idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{d.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] flex items-center font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                            <Star className="w-2.5 h-2.5 fill-amber-500 mr-0.5" />
                            {Number(d.rating).toFixed(1)}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">
                            {d.trips} Trips
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <a href={`tel:${d.phone}`} className="p-2.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-xl transition-all shadow-sm">
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                )) : (
                  <p className="text-center text-xs text-slate-400 italic">No external drivers available at the moment.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
