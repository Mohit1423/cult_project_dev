'use client';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore, Ride, InAppNotification } from '@/store/socketStore';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, MapPin, Navigation, Loader2, CheckCircle2, CarFront, Star, Sparkles, AlertTriangle, Bell, Trash2, Clock, Calendar, History, Phone, IndianRupee } from 'lucide-react';
import MapWrapper from '@/components/MapWrapper';
import { IITRLocation, isPointInCampus, IITR_LOCATIONS } from '@/lib/iitrLocations';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// Sub-component for Waiting Timer & Penalty calculation
function ArrivedWaitingTimer({ waitingStartTime, baseFare }: { waitingStartTime?: string | Date | null; baseFare?: number | null }) {
  const [elapsedSecs, setElapsedSecs] = useState(0);

  useEffect(() => {
    if (!waitingStartTime) return;
    const startMs = new Date(waitingStartTime).getTime();

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startMs) / 1000);
      setElapsedSecs(diff > 0 ? diff : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [waitingStartTime]);

  const minutes = Math.floor(elapsedSecs / 60);
  const seconds = elapsedSecs % 60;
  const waitingCharge = Math.floor(elapsedSecs / 90); // 1 rupee per 1.5 minutes (90 seconds)
  const finalEstimated = baseFare !== null && baseFare !== undefined ? baseFare + waitingCharge : null;

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 text-center my-3 relative overflow-hidden animate-pulse">
      <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
      <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Waiting Time Active
      </p>
      <div className="text-2xl font-black text-slate-900 tracking-wider">
        {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
      </div>
      <div className="mt-1 text-xs font-semibold text-slate-300">
        Waiting Surcharge: <span className="text-emerald-600 font-extrabold">₹{waitingCharge}</span> (₹1 / 1.5m)
      </div>
      {finalEstimated !== null && (
        <div className="text-sm font-black mt-2 border-t border-slate-200 pt-2 text-slate-900">
          Updated Fare: <span className="text-emerald-600">₹{finalEstimated}</span>
        </div>
      )}
    </div>
  );
}

// Custom autocomplete input component using live search from local data
function LocationSearchInput({
  label,
  value,
  onChange,
  onSelectLocation,
  placeholder,
  selecting,
  onStartPinning,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onSelectLocation: (loc: IITRLocation) => void;
  placeholder: string;
  selecting: boolean;
  onStartPinning: () => void;
}) {
  const [suggestions, setSuggestions] = useState<IITRLocation[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = (val: string) => {
    onChange(val);
    if (val.trim().length === 0) {
      setSuggestions(IITR_LOCATIONS);
      return;
    }
    
    const query = val.toLowerCase();
    const filtered = IITR_LOCATIONS.filter((loc) => 
      loc.name.toLowerCase().includes(query)
    );
    setSuggestions(filtered);
  };

  return (
    <div className="relative">
      <label className="block text-[10px] font-black text-indigo-600/80 uppercase tracking-widest mb-1.5 pl-1">{label}</label>
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            handleInputChange(e.target.value);
            setShowSuggestions(true);
          }}
          onFocus={() => setShowSuggestions(true)}
          placeholder={placeholder}
          className="w-full pl-4 pr-10 py-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-900/20 text-sm font-semibold"
          required
        />
        <button
          type="button"
          onClick={onStartPinning}
          className={`absolute right-2.5 p-2 rounded-lg transition-colors ${selecting ? 'bg-indigo-600 text-white' : 'hover:bg-slate-100 text-slate-500'}`}
          title="Pin coordinates on map"
        >
          <MapPin className="w-4 h-4" />
        </button>
      </div>

      {showSuggestions && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowSuggestions(false)}></div>
          <div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-20 overflow-hidden divide-y divide-slate-100 max-h-60 overflow-y-auto">
            {suggestions.length === 0 && value.trim().length >= 1 && (
              <div className="p-4 text-xs text-rose-600 bg-rose-50 font-bold text-center">
                <AlertTriangle className="w-5 h-5 mx-auto mb-1.5" />
                Oops! This place is not in our campus list or is outside the IIT campus. Please tap the map to drop a pin manually, or call drivers below for outside trips.
              </div>
            )}

            {suggestions.map((loc) => (
              <button
                key={`${loc.name}-${loc.lat}-${loc.lng}`}
                type="button"
                onClick={() => {
                  onSelectLocation(loc);
                  setShowSuggestions(false);
                }}
                className="w-full px-4 py-3 text-left text-sm text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-between font-semibold"
              >
                <span className="truncate pr-4">{loc.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider flex-shrink-0 ${loc.isOutsideCampus ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'}`}>
                  {loc.isOutsideCampus ? 'Outside' : 'Campus'}
                </span>
              </button>
            ))}
            
            <button
              type="button"
              onClick={() => {
                onStartPinning();
                setShowSuggestions(false);
              }}
              className="w-full px-4 py-3 text-left text-xs text-indigo-600 hover:bg-slate-100 transition-colors font-bold flex items-center gap-2"
            >
              <Navigation className="w-3.5 h-3.5" />
              Pin coordinates manually on map
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function PassengerDashboard() {
  const { user, token, logout, isAuthenticated } = useAuthStore();
  const {
    connect,
    disconnect,
    isConnected,
    onlineDrivers,
    activeRides,
    addActiveRide,
    removeActiveRide,
    passengerSelection,
    setPassengerSelection,
    resetPassengerSelection,
    notifications,
    clearNotifications,
    markNotificationsAsRead,
  } = useSocketStore();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'book' | 'history'>('book');
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState('');
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [minDateTime, setMinDateTime] = useState('');
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState(false);

  // Outside limits drivers list state
  const [outsideDrivers, setOutsideDrivers] = useState<any[]>([]);
  const [loadingOutsideDrivers, setLoadingOutsideDrivers] = useState(false);

  // Passenger ride history dashboard state
  const [rideHistory, setRideHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (token) {
      connect(token);
    }

    const timer = setTimeout(() => {
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setMinDateTime(now.toISOString().slice(0, 16));
    }, 0);

    return () => {
      clearTimeout(timer);
      disconnect();
    };
  }, [isAuthenticated, router, token, connect, disconnect]);

  const activeDriverCount = Object.keys(onlineDrivers).length;

  // Compute bounding box locks
  const pickupIn = passengerSelection.pickupLat && passengerSelection.pickupLng ? isPointInCampus(passengerSelection.pickupLat, passengerSelection.pickupLng) : true;
  const dropIn = passengerSelection.dropLat && passengerSelection.dropLng ? isPointInCampus(passengerSelection.dropLat, passengerSelection.dropLng) : true;
  const isOutside = !pickupIn || !dropIn;

  // Load top-rated willing outside drivers when coordinates fall outside campus
  useEffect(() => {
    if (isOutside && (passengerSelection.pickupLat || passengerSelection.dropLat)) {
      setLoadingOutsideDrivers(true);
      api.get('/auth/drivers-outside')
        .then((res) => {
          setOutsideDrivers(res.data);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoadingOutsideDrivers(false);
        });
    }
  }, [isOutside, passengerSelection.pickupLat, passengerSelection.dropLat]);

  // Load passenger history on active tab trigger
  const fetchHistory = () => {
    setLoadingHistory(true);
    api.get('/auth/passenger-history')
      .then((res) => {
        setRideHistory(res.data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        setLoadingHistory(false);
      });
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'history') {
      fetchHistory();
    }
  }, [isAuthenticated, activeTab]);

  if (!user) return null;

  const handleRequestRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOutside) {
      setError('Cannot book trips outside the campus bounds. Please contact drivers below.');
      return;
    }

    if (!passengerSelection.pickupName || !passengerSelection.dropName) return;

    if (!passengerSelection.pickupLat || !passengerSelection.dropLat) {
      setError('Please select coordinates on the map or choose a preset landmark.');
      return;
    }

    if (isScheduled) {
      if (!scheduledDate) {
        setError('Please select a date and time for your scheduled ride.');
        return;
      }
      const selectedTime = new Date(scheduledDate).getTime();
      const now = new Date().getTime();
      if (selectedTime < now) {
        setError('Cannot schedule a ride in the past.');
        return;
      }
    }

    setIsRequesting(true);
    setError('');

    socket.emit(
      'request_ride',
      {
        pickupLocation: passengerSelection.pickupName,
        pickupLat: passengerSelection.pickupLat,
        pickupLng: passengerSelection.pickupLng,
        dropoffLocation: passengerSelection.dropName,
        dropoffLat: passengerSelection.dropLat,
        dropoffLng: passengerSelection.dropLng,
        scheduledAt: isScheduled ? scheduledDate : null,
        isOutsideCampus: false, // Strict campus constraint
      },
      (res: { success?: boolean; error?: string; ride?: Ride }) => {
        if (res && res.success && res.ride) {
          addActiveRide(res.ride);
          resetPassengerSelection();
          setIsScheduled(false);
          setScheduledDate('');
        } else {
          setError(res?.error || 'Failed to request ride');
        }
        setIsRequesting(false);
      }
    );
  };

  const handleCancelRide = (rideId: string) => {
    socket.emit('cancel_ride', { rideId }, (res: { success?: boolean; error?: string }) => {
      if (!res || !res.success) {
        alert(res?.error || 'Failed to cancel ride');
      }
    });
  };

  const handleSubmitFeedback = (rideId: string) => {
    const rating = ratings[rideId] || 5;
    socket.emit('submit_feedback', { rideId, rating, comment: '' }, (res: { success?: boolean; error?: string }) => {
      if (res && res.success) {
        removeActiveRide(rideId);
        fetchHistory(); // Refresh history
      } else {
        alert(res?.error || 'Failed to submit feedback');
      }
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* 1. Full Screen Background Map */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapWrapper />
      </div>

      {/* 2. Floating Dashboard UI Containers */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* TOP BAR / HEADER PANEL */}
        <div className="w-full flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pointer-events-auto bg-white/95 backdrop-blur-xl p-4 sm:px-6 rounded-2xl border border-slate-200 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2.5 rounded-xl">
              <CarFront className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 leading-none">
                IITR E-Rickshaw
              </h1>
              <p className="text-xs text-indigo-600/80 font-bold mt-1">IIT Roorkee Campus Mobility</p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            {/* Active Driver Badge */}
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 text-xs font-black">
              <span className={`w-2 h-2 rounded-full ${activeDriverCount > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-slate-300 uppercase tracking-wider">{activeDriverCount} Online</span>
            </div>

            {/* Socket connection badge */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 text-xs font-black">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
              <span className="text-slate-300 uppercase tracking-wider">{isConnected ? 'System Live' : 'Connecting'}</span>
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotificationsDrawer(!showNotificationsDrawer);
                  markNotificationsAsRead();
                }}
                className="p-2.5 bg-slate-50 hover:bg-slate-800/80 border border-slate-200 rounded-xl transition-colors text-slate-300 relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-slate-900 rounded-full flex items-center justify-center text-[9px] font-black border border-slate-900 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Exit/Logout */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="flex items-center justify-center p-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 px-4 rounded-xl transition-all text-xs font-black uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4 mr-2" /> Logout
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: FLOATING BOOKING PANEL & SIDE DRAWER */}
        <div className="flex-1 w-full flex flex-col md:flex-row gap-6 items-stretch justify-end mt-4 overflow-hidden">
          
          {/* MAP CLICK PIN HINT BUBBLE */}
          {passengerSelection.selectingField && (
            <div className="absolute top-24 left-1/2 -translate-x-1/2 z-20 pointer-events-auto bg-indigo-600 text-white px-6 py-3 rounded-full border border-indigo-400 shadow-2xl flex items-center gap-2 animate-bounce font-black text-sm">
              <MapPin className="w-4 h-4 text-emerald-700" />
              <span>Tap anywhere on the map to set your {passengerSelection.selectingField} location!</span>
            </div>
          )}

          {/* LEFT FLOATING PANEL: BOOKING FORM / ACTIVE RIDE */}
          <div className="w-full md:w-[26rem] pointer-events-auto bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-y-auto max-h-[72vh] md:max-h-full">
            
            {/* FLOATING PANEL TABS */}
            {activeRides.length === 0 && (
              <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-100">
                <button
                  onClick={() => setActiveTab('book')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'book' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  Summon Ride
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}
                >
                  My Trips
                </button>
              </div>
            )}

            {activeRides.length > 0 ? (
              // ACTIVE RIDE OVERLAYS (Shown regardless of tab to ensure focus)
              <div className="space-y-4">
                {activeRides.map((ride) => {
                  const isArrived = ride.status === 'ARRIVED';
                  const isCompleted = ride.status === 'COMPLETED';
                  const isProgress = ride.status === 'IN_PROGRESS';
                  const isAccepted = ride.status === 'ACCEPTED';
                  const isRequested = ride.status === 'REQUESTED';
                  const isSched = ride.status === 'SCHEDULED';

                  return (
                    <div key={ride.id} className="space-y-4 animate-in slide-in-from-bottom-6 duration-300">
                      {/* HEADER TRIP STATUS */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">Trip Status</h4>
                        <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider ${
                          isCompleted
                            ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                            : isProgress
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse'
                            : isArrived
                            ? 'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 animate-bounce'
                            : isAccepted
                            ? 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20'
                            : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                        }`}>
                          {isCompleted
                            ? 'Reached'
                            : isProgress
                            ? 'On Trip'
                            : isArrived
                            ? 'Arrived'
                            : isAccepted
                            ? 'En Route'
                            : isSched
                            ? 'Scheduled'
                            : 'Dispatching'}
                        </span>
                      </div>

                      {/* STATS BUBBLE */}
                      {isArrived && (
                        <ArrivedWaitingTimer waitingStartTime={ride.waitingStartTime} baseFare={ride.fare} />
                      )}

                      {/* TRIP CARD */}
                      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-sm font-semibold">
                        <div>
                          <p className="text-[9px] text-indigo-600/80 font-black uppercase tracking-widest">Pickup Location</p>
                          <p className="text-slate-900 mt-0.5">{ride.pickupLocation}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-2">
                          <p className="text-[9px] text-indigo-600/80 font-black uppercase tracking-widest">Dropoff Location</p>
                          <p className="text-slate-900 mt-0.5">{ride.dropLocation}</p>
                        </div>
                        {ride.fare && !isArrived && (
                          <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                            <span className="text-[9px] text-indigo-600/80 font-black uppercase tracking-widest">Fare</span>
                            <span className="text-base font-black text-emerald-600">₹{ride.fare}</span>
                          </div>
                        )}
                      </div>

                      {/* STATUS-SPECIFIC BODIES */}
                      {isSched && (
                        <div className="text-center py-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <p className="text-xs text-amber-600 font-bold mb-3">
                            Scheduled for: {new Date(ride.scheduledAt as string).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </p>
                          <button
                            onClick={() => handleCancelRide(ride.id)}
                            className="px-5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-full"
                          >
                            Cancel Scheduled Ride
                          </button>
                        </div>
                      )}

                      {isRequested && (
                        <div className="text-center py-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                          <div className="relative w-14 h-14 mb-4">
                            <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>
                            <div className="relative bg-indigo-600/30 border border-indigo-500 w-full h-full rounded-full flex items-center justify-center text-indigo-600 font-black">
                              <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                          </div>
                          <p className="text-xs font-bold text-slate-300 mb-4">Broadcasting coordinates to available drivers...</p>
                          <button
                            onClick={() => handleCancelRide(ride.id)}
                            className="px-5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest transition-all w-full"
                          >
                            Cancel Request
                          </button>
                        </div>
                      )}

                      {(isAccepted || isArrived || isProgress) && (
                        <div className="space-y-4">
                          <div className="bg-white shadow-sm border border-slate-100 rounded-2xl p-4 relative overflow-hidden">
                            <div className="flex items-center gap-3.5">
                              <div className="bg-slate-100 p-3 rounded-xl border border-slate-100">
                                <CarFront className="w-6 h-6 text-emerald-600" />
                              </div>
                              <div className="text-left">
                                <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-0.5">Assigned Driver</p>
                                <p className="font-black text-base text-slate-900">{ride.driver?.name}</p>
                                <p className="text-xs text-slate-500 font-semibold">{ride.driver?.phone}</p>
                              </div>
                            </div>
                            <div className="mt-4 flex gap-3">
                              <a
                                href={`tel:${ride.driver?.phone}`}
                                className="flex-1 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-black uppercase tracking-widest text-center rounded-xl text-xs transition-colors hover:bg-emerald-100"
                              >
                                Call Driver
                              </a>
                              <button
                                onClick={() => handleCancelRide(ride.id)}
                                className="flex-1 py-3 bg-rose-50 border border-rose-200 text-rose-600 font-black uppercase tracking-widest text-center rounded-xl text-xs transition-colors hover:bg-rose-100"
                              >
                                Cancel Trip
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="p-4 bg-white shadow-sm rounded-2xl border border-slate-100 space-y-4 text-center">
                          <div className="bg-amber-500/10 border border-amber-500/30 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-amber-500">
                            <Star className="w-6 h-6 fill-amber-100" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900">Rate your Journey!</h4>
                            <p className="text-xs text-slate-500 mt-1">Please provide feedback for {ride.driver?.name}</p>
                          </div>

                          <div className="flex justify-center gap-2 py-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRatings((prev) => ({ ...prev, [ride.id]: star }))}
                                className={`transition-transform hover:scale-125 ${ratings[ride.id] >= star ? 'text-amber-500 drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]' : 'text-slate-300'}`}
                              >
                                <Star className={`w-8 h-8 ${ratings[ride.id] >= star ? 'fill-amber-400' : ''}`} />
                              </button>
                            ))}
                          </div>

                          <button
                            onClick={() => handleSubmitFeedback(ride.id)}
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-transform transform active:scale-95"
                          >
                            Submit Review
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : activeTab === 'book' ? (
              // summon tab
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-black text-slate-900 flex items-center tracking-wide">
                    <Navigation className="w-4 h-4 mr-2 text-indigo-600" /> Summon E-Rickshaw
                  </h3>
                  <span className="text-xs bg-indigo-500/10 text-indigo-600 font-extrabold px-2.5 py-1 rounded-lg border border-indigo-500/20 uppercase tracking-widest">
                    Fixed ₹10
                  </span>
                </div>

                {error && (
                  <div className="p-3 bg-rose-500/10 text-rose-600 text-xs font-medium rounded-xl border border-rose-500/20">
                    {error}
                  </div>
                )}

                <form onSubmit={handleRequestRide} className="space-y-4">
                  {/* Pickup search */}
                  <LocationSearchInput
                    label="Pickup Location"
                    value={passengerSelection.pickupName}
                    onChange={(val) => setPassengerSelection({ pickupName: val })}
                    onSelectLocation={(loc) =>
                      setPassengerSelection({
                        pickupName: loc.name,
                        pickupLat: loc.lat,
                        pickupLng: loc.lng,
                      })
                    }
                    placeholder="Search pickup point or tap map..."
                    selecting={passengerSelection.selectingField === 'pickup'}
                    onStartPinning={() => setPassengerSelection({ selectingField: 'pickup' })}
                  />

                  {/* Dropoff search */}
                  <LocationSearchInput
                    label="Dropoff Location"
                    value={passengerSelection.dropName}
                    onChange={(val) => setPassengerSelection({ dropName: val })}
                    onSelectLocation={(loc) =>
                      setPassengerSelection({
                        dropName: loc.name,
                        dropLat: loc.lat,
                        dropLng: loc.lng,
                      })
                    }
                    placeholder="Search dropoff point or tap map..."
                    selecting={passengerSelection.selectingField === 'drop'}
                    onStartPinning={() => setPassengerSelection({ selectingField: 'drop' })}
                  />

                  {/* Fare estimation display */}
                  {passengerSelection.pickupLat && passengerSelection.dropLat && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      {isOutside ? (
                        <div className="space-y-3">
                          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 font-bold flex items-start gap-2.5">
                            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span>Oops! The selected location is outside the IIT Roorkee campus. Our automatic summoning only operates inside. Please contact these drivers directly for outside bookings:</span>
                          </div>
                          
                          {/* LIST OF OUTSIDE DRIVERS */}
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {loadingOutsideDrivers ? (
                              <div className="text-center py-4 text-xs font-bold text-slate-500 flex items-center justify-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Querying active drivers...
                              </div>
                            ) : outsideDrivers.length === 0 ? (
                              <div className="text-center py-4 text-xs font-bold text-slate-500">
                                No drivers registered for outside campus rides right now.
                              </div>
                            ) : (
                              outsideDrivers.map((d: any) => (
                                <div key={d.phone} className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between text-xs font-semibold">
                                  <div>
                                    <p className="font-extrabold text-slate-900">{d.name}</p>
                                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                                      <span className="flex items-center text-amber-500"><Star className="w-3 h-3 fill-amber-400 mr-0.5" /> {d.rating.toFixed(1)}</span>
                                      <span>•</span>
                                      <span>Willing for outside</span>
                                    </div>
                                  </div>
                                  <a href={`tel:${d.phone}`} className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors flex items-center justify-center font-bold">
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Estimated Fare</span>
                          <span className="text-lg font-black text-emerald-600">₹10.00</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!isOutside && (
                    <button
                      type="submit"
                      disabled={isRequesting || activeDriverCount === 0}
                      className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-black tracking-widest transition-all disabled:opacity-40 disabled:grayscale flex justify-center items-center mt-2 shadow-[0_4px_20px_rgba(99,102,241,0.3)] text-xs uppercase"
                    >
                      {isRequesting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : activeDriverCount === 0 ? (
                        <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> No Drivers Available</span>
                      ) : (
                        <span className="flex items-center gap-1.5"><CarFront className="w-4 h-4" /> Summon Now</span>
                      )}
                    </button>
                  )}
                </form>
              </div>
            ) : (
              // passenger history tab
              <div className="space-y-4 flex flex-col flex-1 overflow-hidden">
                <h3 className="text-base font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2 uppercase tracking-wide">
                  <History className="w-4 h-4 text-indigo-600" /> My Trip Bookings
                </h3>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {loadingHistory ? (
                    <div className="text-center py-12 text-slate-500 font-bold flex items-center justify-center gap-2 text-xs">
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Fetching history logs...
                    </div>
                  ) : rideHistory.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center">
                      <History className="w-10 h-10 opacity-20 mb-2" />
                      <p className="text-xs font-bold">No ride history records.</p>
                      <p className="text-[10px] text-slate-600 mt-1">Book your first E-Rickshaw trip inside the campus.</p>
                    </div>
                  ) : (
                    rideHistory.map((h: any) => (
                      <div key={h.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold border-b border-slate-100 pb-1.5">
                          <span>{new Date(h.requestedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                            h.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>{h.status}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="truncate text-slate-300"><span className="text-emerald-500 text-[10px] font-bold mr-1">A:</span>{h.pickupLocation}</p>
                          <p className="truncate text-slate-300"><span className="text-rose-600 text-[10px] font-bold mr-1">B:</span>{h.dropLocation}</p>
                        </div>
                        <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-1.5 mt-1">
                          <span className="text-slate-500">Driver: {h.driver?.name || 'Unassigned'}</span>
                          {h.fare && <span className="font-extrabold text-emerald-600 flex items-center"><IndianRupee className="w-3 h-3" />{h.fare}</span>}
                        </div>
                        {h.feedback && (
                          <div className="flex items-center gap-1 bg-amber-500/15 border border-amber-500/20 text-amber-600 text-[9px] font-bold px-2 py-0.5 rounded-lg inline-flex">
                            <span>Rated {h.feedback.rating}</span>
                            <Star className="w-2.5 h-2.5 fill-amber-300" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT FLOATING PANEL: NOTIFICATIONS DRAWER */}
          {showNotificationsDrawer && (
            <div className="w-full md:w-80 pointer-events-auto bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-y-auto max-h-[50vh] md:max-h-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Bell className="w-4 h-4 text-indigo-600" /> Notifications
                </h3>
                {notifications.length > 0 && (
                  <button
                    onClick={clearNotifications}
                    className="p-1.5 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg transition-colors"
                    title="Clear All"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex-1 mt-3 space-y-3.5 overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500">
                    <Bell className="w-8 h-8 opacity-20 mb-2" />
                    <p className="text-xs font-bold">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs relative overflow-hidden">
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>
                      <p className="font-semibold text-slate-800 pl-1">{notif.message}</p>
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold pl-1 pt-1.5 border-t border-slate-100">
                        <span>Status Dispatch</span>
                        <span>{new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
