import { create } from 'zustand';
import { socket } from '@/lib/socket';
import { toast } from 'react-hot-toast';

interface SocketState {
  isConnected: boolean;
  onlineDrivers: Record<string, boolean>;
  incomingRides: any[];
  activeRides: any[];
  driverStats: any | null;
  driverLocations: Record<string, { lat: number, lng: number }>;
  connect: (token: string) => void;
  disconnect: () => void;
  addActiveRide: (ride: any) => void;
  removeActiveRide: (rideId: string) => void;
}

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  onlineDrivers: {},
  incomingRides: [],
  activeRides: [],
  driverStats: null,
  driverLocations: {},
  
  addActiveRide: (ride) => set((state) => ({ activeRides: [...state.activeRides, ride] })),
  removeActiveRide: (rideId) => set((state) => ({ activeRides: state.activeRides.filter((r) => r.id !== rideId) })),
  
  connect: (token: string) => {
    if (socket.connected) return;
    
    socket.off('connect');
    socket.off('disconnect');
    socket.off('initial_drivers_state');
    socket.off('driver_status_change');
    socket.off('new_ride_request');
    socket.off('ride_removed');
    socket.off('ride_accepted');
    socket.off('ride_completed');
    socket.off('ride_cancelled');
    socket.off('restore_active_rides');
    socket.off('initial_pending_rides');
    socket.off('initial_driver_stats');
    socket.off('all_driver_locations');
    
    socket.auth = { token };
    socket.connect();
    
    socket.on('connect', () => {
      set({ isConnected: true });
    });
    
    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('initial_drivers_state', (driverIds: string[]) => {
      set((state) => {
        const newDrivers: Record<string, boolean> = {};
        driverIds.forEach(id => { newDrivers[id] = true; });
        return { onlineDrivers: newDrivers };
      });
    });

    socket.on('driver_status_change', (data: { driverId: string; isOnline: boolean }) => {
      set((state) => {
        const newDrivers = { ...state.onlineDrivers };
        if (data.isOnline) {
          newDrivers[data.driverId] = true;
        } else {
          delete newDrivers[data.driverId];
        }
        return { onlineDrivers: newDrivers };
      });
    });

    socket.on('new_ride_request', (ride) => {
      set((state) => ({ incomingRides: [...state.incomingRides, ride] }));
      toast.success('New ride dispatch available!', { icon: '📡' });
    });

    socket.on('ride_removed', (data: { rideId: string }) => {
      set((state) => ({
        incomingRides: state.incomingRides.filter((r) => r.id !== data.rideId)
      }));
    });

    socket.on('ride_accepted', (data) => {
      set((state) => ({ activeRides: state.activeRides.map(r => r.id === data.id ? { ...r, status: 'IN_PROGRESS', driverId: data.driverId, driver: data.driver } : r) }));
      toast.success('A driver has accepted your ride!', { icon: '🚘' });
    });

    socket.on('ride_completed', (data) => {
      set((state) => ({ activeRides: state.activeRides.map(r => r.id === data.id ? { ...r, status: 'COMPLETED' } : r) }));
      toast.success('Ride completed! You arrived at your destination.', { icon: '🏁' });
    });

    socket.on('ride_cancelled', (data) => {
      set((state) => ({ 
        incomingRides: state.incomingRides.filter(r => r.id !== data.rideId),
        activeRides: state.activeRides.filter(r => r.id !== data.rideId)
      }));
      toast.error('A ride was cancelled.');
    });

    socket.on('restore_active_rides', (rides: any[]) => {
      set({ activeRides: rides });
    });

    socket.on('initial_pending_rides', (rides: any[]) => {
      set({ incomingRides: rides });
    });

    socket.on('initial_driver_stats', (stats: any) => {
      set({ driverStats: stats });
    });

    socket.on('all_driver_locations', (locations: Record<string, { lat: number, lng: number }>) => {
      set({ driverLocations: locations });
    });
  },
  
  disconnect: () => {
    socket.disconnect();
    set({ isConnected: false, onlineDrivers: {}, incomingRides: [], activeRides: [], driverStats: null, driverLocations: {} });
  }
}));
