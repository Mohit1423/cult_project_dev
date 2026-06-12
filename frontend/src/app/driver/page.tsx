'use client';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore, Ride } from '@/store/socketStore';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Car, Power, MapPin, CheckCircle, Navigation, Loader2, Sparkles, Star, TrendingUp, History, IndianRupee, Activity, Phone, ClipboardList } from 'lucide-react';
import MapWrapper from '@/components/MapWrapper';
import toast from 'react-hot-toast';

// Distance helper
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const dp = ((lat2 - lat1) * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function DriverDashboard() {
  const { user, token, logout, isAuthenticated } = useAuthStore();
  const {
    connect,
    disconnect,
    isConnected,
    incomingRides,
    activeRides,
    driverStats,
    addActiveRide,
    removeActiveRide,
    driverLocations,
  } = useSocketStore();
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectedRides, setRejectedRides] = useState<string[]>([]);
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
    else if (token) connect(token);
    return () => disconnect();
  }, [isAuthenticated, router, token, connect, disconnect]);

  const handleToggleOnline = () => {
    if (isOnline) {
      socket.emit('driver_go_offline', (res: { success?: boolean; error?: string }) => {
        if (res?.success) {
          setIsOnline(false);
          toast.success('You are now offline.');
        } else {
          toast.error(res?.error || 'Could not go offline.');
        }
      });
    } else {
      toast.loading('Obtaining location...', { id: 'gps' });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            toast.dismiss('gps');
            socket.emit(
              'driver_go_online',
              { lat: pos.coords.latitude, lng: pos.coords.longitude },
              (res: { success?: boolean }) => {
                if (res?.success) {
                  setIsOnline(true);
                  toast.success('Duty active! You are online.');
                }
              }
            );
          },
          () => {
            toast.dismiss('gps');
            toast('Could not acquire precise GPS. Starting with default campus location.', { icon: '⚠️' });
            socket.emit('driver_go_online', {}, (res: { success?: boolean }) => {
              if (res?.success) setIsOnline(true);
            });
          }
        );
      } else {
        toast.dismiss('gps');
        socket.emit('driver_go_online', {}, (res: { success?: boolean }) => {
          if (res?.success) setIsOnline(true);
        });
      }
    }
  };

  const handleAcceptRide = (rideId: string) => {
    setAcceptingId(rideId);
    socket.emit('accept_ride', { rideId }, (res: { success?: boolean; error?: string; ride?: Ride }) => {
      if (res && res.success && res.ride) {
        addActiveRide(res.ride);
        toast.success('Ride request accepted!');
      } else {
        toast.error(res?.error || 'Could not accept ride.');
      }
      setAcceptingId(null);
    });
  };

  const handleDriverArrived = (rideId: string) => {
    socket.emit('driver_arrived', { rideId }, (res: { success?: boolean; error?: string; ride?: Ride }) => {
      if (res && res.success && res.ride) {
        addActiveRide(res.ride);
        toast.success('Arrived at pickup location. Client notified.');
      } else {
        toast.error(res?.error || 'Failed to update status.');
      }
    });
  };

  const handleStartRide = (rideId: string) => {
    socket.emit('start_ride', { rideId }, (res: { success?: boolean; error?: string; ride?: Ride }) => {
      if (res && res.success && res.ride) {
        addActiveRide(res.ride);
        toast.success('Ride started!');
      } else {
        toast.error(res?.error || 'Failed to start ride.');
      }
    });
  };

  const handleCompleteRide = (rideId: string) => {
    socket.emit('complete_ride', { rideId }, (res: { success?: boolean; error?: string; ride?: Ride }) => {
      if (res && res.success && res.ride) {
        removeActiveRide(rideId);
        toast.success('Trip completed successfully!');
      } else {
        toast.error(res?.error || 'Failed to complete ride.');
      }
    });
  };

  const handleRejectRide = (rideId: string) => {
    setRejectedRides((prev) => [...prev, rideId]);
  };

  const handleDriverCancelRide = (rideId: string) => {
    socket.emit('driver_cancel_ride', { rideId }, (res: { success?: boolean; error?: string; ride?: Ride }) => {
      if (res && res.success) {
        removeActiveRide(rideId);
        toast.success('You have cancelled the ride. It is back in the search pool.');
      } else {
        toast.error(res?.error || 'Failed to cancel ride.');
      }
    });
  };

  if (!user) return null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* 1. Full Screen Background Map */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapWrapper />
      </div>

      {/* 2. Floating Dashboard UI Containers */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-6 overflow-hidden">
        {/* HEADER PANEL */}
        <div className="w-full flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 pointer-events-auto bg-white/95 backdrop-blur-xl p-4 sm:px-6 rounded-2xl border border-slate-200 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl">
              <Car className="w-6 h-6 text-slate-900" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">Driver Portal</h1>
              <p className="text-xs text-emerald-700 font-bold mt-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> E-Rickshaw Partner: {user.name}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-4">
            {/* Quick stats banner */}
            {driverStats && (
              <div className="hidden lg:flex gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 text-xs font-semibold">
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Completed</p>
                  <p className="font-black text-slate-900 text-sm">{driverStats.totalRides}</p>
                </div>
                <div className="w-px bg-slate-100"></div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Rating</p>
                  <p className="font-black text-slate-900 flex items-center gap-1 text-sm">
                    {driverStats.averageRating.toFixed(1)} <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                  </p>
                </div>
                <div className="w-px bg-slate-100"></div>
                <div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Earnings</p>
                  <p className="font-black text-emerald-600 text-sm">₹{driverStats.totalEarnings || 0}</p>
                </div>
              </div>
            )}

            {/* Socket connection badge */}
            <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-100 text-xs font-black">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-rose-500 animate-ping'}`} />
              <span className="text-slate-300 uppercase tracking-wider">{isConnected ? 'System Live' : 'Connecting'}</span>
            </div>

            {/* Toggle Stats Drawer */}
            <button
              onClick={() => setShowStatsDrawer(!showStatsDrawer)}
              className="p-2.5 bg-slate-50 hover:bg-slate-800/80 border border-slate-200 rounded-xl transition-colors text-slate-300 flex items-center justify-center"
              title="Duty Analytics"
            >
              <ClipboardList className="w-5 h-5" />
            </button>

            {/* Exit/Logout */}
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="flex items-center justify-center p-2.5 bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500/20 px-4 rounded-xl transition-all text-xs font-black uppercase tracking-wider"
            >
              <LogOut className="w-4 h-4 mr-2" /> Exit
            </button>
          </div>
        </div>

        {/* BOTTOM SECTION: FLOATING ACTIONS & STATS DRAWER */}
        <div className="flex-1 w-full flex flex-col md:flex-row gap-6 items-stretch justify-end mt-4 overflow-hidden">
          {/* LEFT FLOATING CONTROL CARD: ONGOING & DISPATCHES */}
          <div className="w-full md:w-[26rem] pointer-events-auto bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-y-auto max-h-[72vh] md:max-h-full">
            
            {/* DUTY CONTROLLERS */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Duty Mode</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {isOnline ? 'Broadcasting location & receiving rides' : 'You are currently offline'}
                </p>
              </div>
              <button
                onClick={handleToggleOnline}
                className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all ${
                  isOnline
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 shadow-[0_4px_20px_rgba(52,211,153,0.3)] hover:brightness-110'
                    : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                }`}
              >
                <Power className="w-4 h-4" />
                <span>{isOnline ? 'Online' : 'Offline'}</span>
              </button>
            </div>

            {/* ACTIVE/ONGOING TRIP INFO */}
            {activeRides.length > 0 ? (
              <div className="space-y-4">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Active Passenger Trip
                </h4>

                {activeRides.map((ride) => {
                  const isAccepted = ride.status === 'ACCEPTED';
                  const isArrived = ride.status === 'ARRIVED';
                  const isProgress = ride.status === 'IN_PROGRESS';

                  return (
                    <div key={ride.id} className="bg-slate-100 border border-emerald-500/20 p-4 rounded-2xl shadow-lg space-y-4">
                      {/* Trip state status badge */}
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Route details</span>
                        <span className="text-[9px] px-2.5 py-0.5 rounded-full font-black bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 uppercase tracking-wider">
                          {isAccepted ? 'Going to Pickup' : isArrived ? 'Arrived & Waiting' : 'Heading to Drop'}
                        </span>
                      </div>

                      {/* Route specs */}
                      <div className="space-y-2.5 text-xs font-semibold text-slate-300">
                        <div>
                          <p className="text-[9px] text-emerald-600/80 font-black uppercase tracking-widest">Client Pickup Spot</p>
                          <p className="text-slate-900 mt-0.5">{ride.pickupLocation}</p>
                        </div>
                        <div className="border-t border-slate-100 pt-2">
                          <p className="text-[9px] text-emerald-600/80 font-black uppercase tracking-widest">Client Dropoff Spot</p>
                          <p className="text-slate-900 mt-0.5">{ride.dropLocation}</p>
                        </div>
                        {ride.fare && (
                          <div className="border-t border-slate-100 pt-2 flex justify-between items-center">
                            <span className="text-[9px] text-emerald-600/80 font-black uppercase tracking-widest">Estimated Fare</span>
                            <span className="text-base font-black text-emerald-600">₹{ride.fare}</span>
                          </div>
                        )}
                      </div>

                      {/* Passenger Details */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Passenger</p>
                          <p className="font-extrabold text-slate-900">{ride.passenger?.name || 'Assigned User'}</p>
                        </div>
                        {ride.passenger?.phone && (
                          <a
                            href={`tel:${ride.passenger.phone}`}
                            className="px-3 py-2 bg-white text-slate-950 hover:bg-slate-200 transition-colors rounded-xl flex items-center gap-2 justify-center font-bold border border-slate-200"
                          >
                            <Phone className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{ride.passenger.phone}</span>
                          </a>
                        )}
                      </div>

                      {/* WORKFLOW SEQUENTIAL BUTTONS */}
                      <div className="flex flex-col gap-3">
                        <div className="flex gap-3">
                          {isAccepted && (
                            <button
                              onClick={() => handleDriverArrived(ride.id)}
                              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest text-xs transition-transform transform active:scale-98 shadow-md"
                            >
                              Arrived at Pickup
                            </button>
                          )}

                          {isArrived && (
                            <button
                              onClick={() => handleStartRide(ride.id)}
                              className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs transition-transform transform active:scale-98 shadow-md animate-bounce"
                            >
                              Start Ride
                            </button>
                          )}

                          {isProgress && (
                            <button
                              onClick={() => handleCompleteRide(ride.id)}
                              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-xl font-black uppercase tracking-widest text-xs transition-transform transform active:scale-98 shadow-md"
                            >
                              End Ride (Complete)
                            </button>
                          )}
                        </div>
                        {isAccepted && (
                          <button
                            onClick={() => handleDriverCancelRide(ride.id)}
                            className="w-full py-3 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-600 rounded-xl font-black uppercase tracking-widest text-xs transition-colors shadow-sm"
                          >
                            Cancel Accepted Ride
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              // INCOMING RIDE OFFERS
              <div className="space-y-4 flex-1 flex flex-col overflow-hidden">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <Navigation className="w-4 h-4 text-indigo-600" /> Incoming Dispatches
                </h4>

                {!isOnline ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                    <Power className="w-10 h-10 mb-3 text-slate-300" />
                    <p className="text-xs font-bold uppercase tracking-wider">You are offline</p>
                    <p className="text-[10px] text-slate-600 mt-1.5">Activate duty mode to begin receiving ride requests.</p>
                  </div>
                ) : incomingRides.filter((r) => !rejectedRides.includes(r.id)).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="relative w-16 h-16 mb-4">
                      <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-15"></div>
                      <div className="relative bg-emerald-600/20 border border-emerald-500/30 w-full h-full rounded-full flex items-center justify-center text-emerald-600">
                        <Navigation className="w-5 h-5 animate-pulse" />
                      </div>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Radar Scanning</p>
                    <p className="text-[10px] text-slate-500 mt-1.5">Awaiting requests inside IIT Roorkee limits...</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {incomingRides
                      .filter((r) => !rejectedRides.includes(r.id))
                      .map((ride) => (
                        <div key={ride.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3.5 hover:bg-slate-50 transition-all">
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-2 text-xs font-semibold">
                              <div>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Pickup</p>
                                <p className="text-slate-900 font-extrabold">{ride.pickupLocation}</p>
                              </div>
                              <div>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Dropoff</p>
                                <p className="text-slate-900 font-extrabold">{ride.dropLocation}</p>
                              </div>
                              {ride.scheduledAt && (
                                <div className="mt-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] px-2 py-0.5 rounded inline-block font-extrabold">
                                  Scheduled: {new Date(ride.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Fare Offer</p>
                              <span className="text-lg font-black text-emerald-600">
                                {ride.fare ? `₹${ride.fare}` : 'Negotiable'}
                              </span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleAcceptRide(ride.id)}
                              disabled={acceptingId === ride.id}
                              className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 rounded-lg text-xs font-black uppercase tracking-wider flex items-center justify-center disabled:opacity-40"
                            >
                              {acceptingId === ride.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Accept'}
                            </button>
                            <button
                              onClick={() => handleRejectRide(ride.id)}
                              className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 rounded-lg text-xs font-black uppercase tracking-wider px-4"
                            >
                              Skip
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT FLOATING DRAWER: EARNINGS ANALYTICS */}
          {showStatsDrawer && driverStats && (
            <div className="w-full md:w-96 pointer-events-auto bg-white/90 backdrop-blur-xl p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-y-auto max-h-[72vh] md:max-h-full">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-emerald-600" /> Duty Analytics
                </h3>
              </div>

              {/* Analytics summary boxes */}
              <div className="grid grid-cols-3 gap-3.5 mb-5 text-center text-slate-300">
                <div className="bg-slate-100 border border-slate-100 p-3 rounded-2xl">
                  <TrendingUp className="w-4 h-4 text-indigo-600 mx-auto mb-1.5" />
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Total Trips</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">{driverStats.totalRides}</p>
                </div>
                <div className="bg-slate-100 border border-slate-100 p-3 rounded-2xl">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-100 mx-auto mb-1.5" />
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Rating</p>
                  <p className="text-base font-black text-slate-900 mt-0.5">{driverStats.averageRating.toFixed(1)}</p>
                </div>
                <div className="bg-slate-100 border border-slate-100 p-3 rounded-2xl">
                  <IndianRupee className="w-4 h-4 text-emerald-600 mx-auto mb-1.5" />
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Earnings</p>
                  <p className="text-base font-black text-emerald-600 mt-0.5">₹{driverStats.totalEarnings || 0}</p>
                </div>
              </div>

              {/* Completed Ride List */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                  <History className="w-3.5 h-3.5" /> Recent Completed
                </h4>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {!driverStats.rideHistory || driverStats.rideHistory.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500">
                      <History className="w-8 h-8 opacity-20 mb-2" />
                      <p className="text-[10px] font-bold">No completed history</p>
                    </div>
                  ) : (
                    driverStats.rideHistory.map((ride: Ride) => (
                      <div key={ride.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2">
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                          <span>{ride.completedAt ? new Date(ride.completedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'N/A'}</span>
                          <span className="text-emerald-600 font-black text-xs">₹{ride.fare || 0}</span>
                        </div>
                        <div className="font-semibold">
                          <p className="text-slate-300 truncate"><span className="text-emerald-600 text-[10px] font-bold mr-1">P:</span>{ride.pickupLocation}</p>
                          <p className="text-slate-300 truncate mt-0.5"><span className="text-rose-600 text-[10px] font-bold mr-1">D:</span>{ride.dropLocation}</p>
                        </div>
                        {ride.feedback && (
                          <div className="flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 inline-flex text-[9px] font-bold text-amber-600">
                            <span>{ride.feedback.rating} Rating</span>
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-500" />
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
