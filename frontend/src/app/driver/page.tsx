'use client';
import { useAuthStore } from '@/store/authStore';
import { useSocketStore } from '@/store/socketStore';
import { socket } from '@/lib/socket';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LogOut, Car, Power, PowerOff, MapPin, CheckCircle, Navigation, Loader2, Sparkles } from 'lucide-react';

export default function DriverDashboard() {
  const { user, token, logout, isAuthenticated } = useAuthStore();
  const { connect, disconnect, isConnected, incomingRides, activeRides, addActiveRide, removeActiveRide } = useSocketStore();
  const router = useRouter();
  
  const [isOnline, setIsOnline] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
    else if (token) connect(token);
    return () => disconnect();
  }, [isAuthenticated, router, token, connect, disconnect]);

  const toggleOnlineStatus = () => {
    if (isOnline) {
      socket.emit('driver_go_offline', (res: any) => {
        if (res && res.success) setIsOnline(false);
      });
    } else {
      socket.emit('driver_go_online', (res: any) => {
        if (res && res.success) setIsOnline(true);
      });
    }
  };

  const handleAcceptRide = (rideId: string) => {
    setAcceptingId(rideId);
    socket.emit('accept_ride', { rideId }, (res: any) => {
      if (res && res.success) {
        addActiveRide(res.ride); // Fix: Add ride to local driver state immediately!
      } else {
        alert(res?.error || 'Failed to accept ride. It may have been taken by someone else.');
      }
      setAcceptingId(null);
    });
  };

  const handleCompleteRide = (rideId: string) => {
    socket.emit('complete_ride', { rideId }, (res: any) => {
      if (res && res.success) {
        removeActiveRide(rideId);
      } else {
        alert(res?.error || 'Failed to complete ride.');
      }
    });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white relative overflow-hidden font-sans pb-12">
      {/* Premium Dark Mode Dynamic Background */}
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-teal-600/20 blur-[150px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8 relative z-10">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-10 bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-3 rounded-2xl shadow-[0_0_20px_rgba(52,211,153,0.3)]">
              <Car className="w-8 h-8 text-white" />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-black tracking-tight text-white">Driver Portal</h1>
              <p className="text-sm text-emerald-200 mt-1 font-medium flex items-center justify-center sm:justify-start gap-1">
                <Sparkles className="w-3 h-3" /> {user.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 bg-black/20 px-5 py-2.5 rounded-full border border-white/5">
              <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.8)]'}`}></span>
              <span className="text-sm font-bold text-slate-300 hidden sm:block tracking-wide">{isConnected ? 'System Online' : 'Reconnecting...'}</span>
            </div>
            <button 
              onClick={() => { logout(); router.push('/login'); }}
              className="flex items-center text-rose-400 hover:text-rose-300 hover:bg-rose-400/10 px-4 py-2 rounded-full transition-all text-sm font-bold tracking-wide"
            >
              <LogOut className="w-4 h-4 mr-2" /> EXIT
            </button>
          </div>
        </div>

        {/* Active Rides Section */}
        {activeRides.length > 0 && (
          <div className="mb-12 animate-in fade-in zoom-in duration-500">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center tracking-wide">
              <span className="bg-emerald-500/20 p-2 rounded-xl mr-3 border border-emerald-500/30">
                <CheckCircle className="w-5 h-5 text-emerald-400" /> 
              </span>
              Ongoing Trips ({activeRides.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeRides.map(ride => (
                <div key={ride.id} className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 backdrop-blur-xl border border-emerald-500/30 p-8 rounded-[2rem] shadow-[0_0_30px_rgba(52,211,153,0.15)] flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px]"></div>
                  
                  <div className="flex items-center justify-between mb-8">
                    <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(52,211,153,0.5)]">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                    <div className="bg-emerald-500/20 border border-emerald-500/30 px-4 py-2 rounded-full">
                      <span className="text-emerald-300 text-xs font-bold uppercase tracking-wider animate-pulse">In Progress</span>
                    </div>
                  </div>
                  
                  <div className="bg-black/40 rounded-2xl p-6 mb-6 border border-white/5 flex-1 relative z-10">
                    <div className="mb-4 pb-4 border-b border-white/10">
                      <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-[0.2em] mb-1">Pickup Point</p>
                      <p className="font-black text-white text-lg tracking-wide">{ride.pickupLocation}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-[0.2em] mb-1">Dropoff Point</p>
                      <p className="font-black text-white text-lg tracking-wide">{ride.dropLocation}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4 relative z-10">
                    <a href={`tel:${ride.passenger?.phone}`} className="py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all text-sm flex items-center justify-center px-8 flex-1">
                      Call Client
                    </a>
                    <button onClick={() => handleCompleteRide(ride.id)} className="py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)] hover:shadow-[0_0_30px_rgba(52,211,153,0.5)] text-sm flex-[2] transform hover:-translate-y-1">
                      Finish Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Power Button */}
          <div className="lg:col-span-4 bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col items-center justify-center min-h-[300px]">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Duty Status</h3>
            <button
              onClick={toggleOnlineStatus}
              className={`w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 transform hover:scale-105 active:scale-95 border-4 ${
                isOnline 
                  ? 'bg-gradient-to-br from-emerald-400 to-teal-500 border-emerald-300/50 shadow-[0_0_60px_rgba(52,211,153,0.6)]' 
                  : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-2xl'
              }`}
            >
              <Power className={`w-14 h-14 mb-3 transition-colors ${isOnline ? 'text-white' : 'text-slate-500'}`} />
              <span className={`font-black text-2xl tracking-[0.2em] transition-colors ${isOnline ? 'text-white' : 'text-slate-500'}`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </button>
            <p className={`mt-8 text-sm font-medium ${isOnline ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isOnline ? 'Receiving local dispatch pings' : 'Tap to start receiving rides'}
            </p>
          </div>

          {/* Incoming Requests */}
          <div className="lg:col-span-8 bg-white/5 backdrop-blur-xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center tracking-wide">
              <Navigation className="w-5 h-5 mr-3 text-indigo-400" /> Incoming Dispatches
            </h2>
            
            {!isOnline ? (
              <div className="bg-black/20 border border-dashed border-white/10 rounded-[2rem] p-12 text-center text-slate-400 h-[300px] flex flex-col items-center justify-center">
                <PowerOff className="w-12 h-12 mb-4 text-slate-600" />
                <p className="text-lg font-medium">You are offline.</p>
                <p className="text-sm mt-2 text-slate-500">Go online to connect with passengers.</p>
              </div>
            ) : incomingRides.length === 0 ? (
              <div className="bg-indigo-900/10 border border-dashed border-indigo-500/30 rounded-[2rem] p-12 text-center h-[300px] flex flex-col items-center justify-center relative overflow-hidden">
                <div className="relative w-20 h-20 mb-6 mx-auto">
                  <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-20"></div>
                  <div className="relative bg-indigo-500/20 w-20 h-20 rounded-full flex items-center justify-center border border-indigo-500/30">
                    <Navigation className="w-8 h-8 text-indigo-400" />
                  </div>
                </div>
                <p className="text-lg font-bold text-indigo-200 tracking-wide">Radar Active</p>
                <p className="text-sm mt-2 text-indigo-300/50">Scanning area for new passenger requests...</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {incomingRides.map((ride) => (
                  <div key={ride.id} className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row items-center justify-between animate-in slide-in-from-right-8 duration-300 gap-6 group hover:bg-white/15 transition-all">
                    <div className="flex-1 w-full">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="mt-1 bg-emerald-500/20 p-2 rounded-full border border-emerald-500/30"><MapPin className="w-4 h-4 text-emerald-400" /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Pickup Location</p>
                          <p className="font-black text-white text-lg tracking-wide">{ride.pickupLocation}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-4">
                        <div className="mt-1 bg-rose-500/20 p-2 rounded-full border border-rose-500/30"><MapPin className="w-4 h-4 text-rose-400" /></div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Dropoff Location</p>
                          <p className="font-black text-white text-lg tracking-wide">{ride.dropLocation}</p>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleAcceptRide(ride.id)}
                      disabled={acceptingId === ride.id}
                      className="w-full md:w-auto bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white px-8 py-5 rounded-xl font-black tracking-widest hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all disabled:opacity-50 min-w-[160px] flex justify-center transform hover:-translate-y-1"
                    >
                      {acceptingId === ride.id ? <Loader2 className="w-6 h-6 animate-spin" /> : 'ACCEPT RIDE'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
