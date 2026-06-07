import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import fs from 'fs';

export interface ConnectedUser {
  socketId: string;
  userId: string;
  role: string;
}

export const connectedUsers = new Map<string, ConnectedUser>();

export function initializeSockets(io: Server) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication error'));

    jwt.verify(token, process.env.JWT_SECRET || 'secret123', (err: any, decoded: any) => {
      if (err) return next(new Error('Authentication error'));
      socket.data.user = decoded;
      next();
    });
  });

  io.on('connection', async (socket: Socket) => {
    const user = socket.data.user;
    
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: user.id,
      role: user.role
    });

    console.log(`User connected via Socket.IO: ${user.id} (${user.role})`);

    // Send the initial state of all currently online drivers to the newly connected user
    const onlineDriversList = await prisma.user.findMany({
      where: { role: 'DRIVER', isOnline: true },
      select: { id: true }
    });
    socket.emit('initial_drivers_state', onlineDriversList.map(d => d.id));

    // Restore active rides if the user refreshed the page while in a ride
    let activeRides: any[] = [];
    if (user.role === 'PASSENGER') {
      activeRides = await prisma.ride.findMany({
        where: { passengerId: user.id, status: { in: ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] } },
        include: { driver: { select: { name: true, phone: true } } }
      });
    } else if (user.role === 'DRIVER') {
      activeRides = await prisma.ride.findMany({
        where: { driverId: user.id, status: { in: ['ACCEPTED', 'IN_PROGRESS'] } },
        include: { passenger: { select: { name: true, phone: true } } }
      });
    }
    if (activeRides.length > 0) {
      socket.emit('restore_active_rides', activeRides);
    }

    if (user.role === 'DRIVER') {
      const driver = await prisma.user.findUnique({ where: { id: user.id } });
      if (driver?.isOnline) {
        socket.join('online_drivers');
        io.emit('driver_status_change', { driverId: user.id, isOnline: true });
      }
    } else {
      socket.join('passengers');
    }

    socket.on('driver_go_online', async (callback) => {
      fs.appendFileSync('socket-debug.log', `--- RECEIVED driver_go_online from ${user.id} ---\n`);
      if (user.role !== 'DRIVER') return;
      try {
        fs.appendFileSync('socket-debug.log', `Updating DB...\n`);
        await prisma.user.update({ where: { id: user.id }, data: { isOnline: true } });
        fs.appendFileSync('socket-debug.log', `Joining room...\n`);
        socket.join('online_drivers');
        fs.appendFileSync('socket-debug.log', `Emitting status...\n`);
        io.emit('driver_status_change', { driverId: user.id, isOnline: true });
        
        // Send all currently pending rides to the driver
        const pendingRides = await prisma.ride.findMany({
          where: { status: 'REQUESTED' },
          include: { passenger: { select: { name: true, phone: true } } }
        });
        socket.emit('initial_pending_rides', pendingRides);
        
        fs.appendFileSync('socket-debug.log', `Firing callback...\n`);
        if (typeof callback === 'function') callback({ success: true });
      } catch (err: any) {
        fs.appendFileSync('socket-debug.log', `Error: ${err.message}\n`);
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    socket.on('driver_go_offline', async (callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        await prisma.user.update({ where: { id: user.id }, data: { isOnline: false } });
        socket.leave('online_drivers');
        io.emit('driver_status_change', { driverId: user.id, isOnline: false });
        if (callback) callback({ success: true });
      } catch (err: any) {
        if (callback) callback({ success: false, error: err.message });
      }
    });

    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${user.id}`);
      connectedUsers.delete(socket.id);
      
      if (user.role === 'DRIVER') {
        try {
          await prisma.user.update({ where: { id: user.id }, data: { isOnline: false } });
          io.emit('driver_status_change', { driverId: user.id, isOnline: false });
        } catch (e) {}
      }
    });

    // Ride Request Flow
    socket.on('request_ride', async (data, callback) => {
      if (user.role !== 'PASSENGER') return;
      try {
        const { pickupLocation, dropoffLocation } = data;
        
        const ride = await prisma.ride.create({
          data: {
            passengerId: user.id,
            pickupLocation,
            dropLocation: dropoffLocation,
            status: 'REQUESTED'
          },
          include: { passenger: { select: { name: true, phone: true } } }
        });

        // Broadcast to all online drivers
        io.to('online_drivers').emit('new_ride_request', ride);
        
        if (typeof callback === 'function') callback({ success: true, ride });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Driver Acceptance Logic
    socket.on('accept_ride', async (data, callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const { rideId } = data;
        
        const ride = await prisma.ride.findFirst({
          where: { id: rideId, status: 'REQUESTED' }
        });

        if (!ride) {
          if (typeof callback === 'function') callback({ success: false, error: 'Ride is no longer available or already accepted.' });
          return;
        }

        const updatedRide = await prisma.ride.update({
          where: { id: rideId },
          data: {
            driverId: user.id,
            status: 'ACCEPTED'
          },
          include: { driver: { select: { name: true, phone: true } } }
        });

        // Notify the specific passenger
        const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId);
        if (passengerSocket) {
          io.to(passengerSocket.socketId).emit('ride_accepted', updatedRide);
        }

        // Notify all other drivers to remove it from their dashboards
        io.to('online_drivers').emit('ride_removed', { rideId });

        if (typeof callback === 'function') callback({ success: true, ride: updatedRide });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Driver Completion Logic
    socket.on('complete_ride', async (data, callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const { rideId } = data;
        
        const updatedRide = await prisma.ride.update({
          where: { id: rideId },
          data: { status: 'COMPLETED' }
        });

        const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId);
        if (passengerSocket) {
          io.to(passengerSocket.socketId).emit('ride_completed', updatedRide);
        }

        if (typeof callback === 'function') callback({ success: true, ride: updatedRide });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });
  });
}
