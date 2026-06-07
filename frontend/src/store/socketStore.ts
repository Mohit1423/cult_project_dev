import { create } from 'zustand';
import { socket } from '../lib/socket';

interface SocketState {
  isConnected: boolean;
  onlineDrivers: Record<string, boolean>;
  incomingRides: any[];
  activeRides: any[];
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
    socket.off('restore_active_rides');
    socket.off('initial_pending_rides');
    
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

    socket.on('new_ride_request', (ride: any) => {
      set((state) => ({ incomingRides: [...state.incomingRides, ride] }));
    });

    socket.on('ride_removed', (data: { rideId: string }) => {
      set((state) => ({
        incomingRides: state.incomingRides.filter((r) => r.id !== data.rideId)
      }));
    });

    socket.on('ride_accepted', (ride: any) => {
      set((state) => ({
        activeRides: state.activeRides.some(r => r.id === ride.id)
          ? state.activeRides.map(r => r.id === ride.id ? ride : r)
          : [...state.activeRides, ride]
      }));
    });

    socket.on('ride_completed', (ride: any) => {
      set((state) => ({ 
        activeRides: state.activeRides.map(r => r.id === ride.id ? { ...r, status: 'COMPLETED' } : r)
      }));
    });

    socket.on('restore_active_rides', (rides: any[]) => {
      set({ activeRides: rides });
    });

    socket.on('initial_pending_rides', (rides: any[]) => {
      set({ incomingRides: rides });
    });
  },
  
  disconnect: () => {
    socket.disconnect();
    set({ isConnected: false, onlineDrivers: {}, incomingRides: [], activeRides: [] });
  }
}));
