import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import Ride from '../models/Ride';
import Feedback from '../models/Feedback';
import mongoose from 'mongoose';
import fs from 'fs';

export interface ConnectedUser {
  socketId: string;
  userId: string;
  role: string;
}

export const connectedUsers = new Map<string, ConnectedUser>();
const onlineDrivers = new Map<string, boolean>();
const driverLocations = new Map<string, { lat: number, lng: number, name?: string, phone?: string }>();
const IITR_CENTER = { lat: 29.8649, lng: 77.8966 };

export function initializeSockets(io: Server) {
  let lastEmittedCount = 0;
  setInterval(() => {
    if (onlineDrivers.size > 0 || lastEmittedCount > 0) {
      const locations: Record<string, { lat: number, lng: number, name?: string, phone?: string }> = {};
      for (const driverId of onlineDrivers.keys()) {
        let loc = driverLocations.get(driverId);
        if (!loc) {
          loc = {
            lat: IITR_CENTER.lat,
            lng: IITR_CENTER.lng
          };
          driverLocations.set(driverId, loc);
        }
        locations[driverId] = loc;
      }
      io.emit('all_driver_locations', locations);
      lastEmittedCount = onlineDrivers.size;
    }
  }, 1000);

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
    
    // Protect against old UUID JWT tokens crashing Mongoose
    if (!mongoose.Types.ObjectId.isValid(user.id)) {
      socket.disconnect();
      return;
    }
    
    connectedUsers.set(socket.id, {
      socketId: socket.id,
      userId: user.id,
      role: user.role
    });

    console.log(`User connected via Socket.IO: ${user.id} (${user.role})`);

    const onlineDriversList = await User.find({ role: 'DRIVER', isOnline: true }, '_id');
    socket.emit('initial_drivers_state', onlineDriversList.map(d => d.id));

    let activeRides: any[] = [];
    if (user.role === 'PASSENGER') {
      activeRides = await Ride.find({
        passengerId: user.id,
        status: { $in: ['REQUESTED', 'SCHEDULED', 'ACCEPTED', 'IN_PROGRESS'] }
      }).populate('driver', 'name phone');
    }
    
    const sendDriverStats = async () => {
      if (user.role !== 'DRIVER') return;
      const completedCount = await Ride.countDocuments({ driverId: user.id, status: 'COMPLETED' });
      
      const feedbacks = await Feedback.find().populate({
        path: 'rideId',
        match: { driverId: user.id }
      });
      // Filter out feedbacks where ride didn't match
      const validFeedbacks = feedbacks.filter(f => f.rideId);
      
      const avgRating = validFeedbacks.length > 0 
        ? validFeedbacks.reduce((acc, curr) => acc + curr.rating, 0) / validFeedbacks.length 
        : 0;
        
      // Fetch History and Earnings
      const rideHistory = await Ride.find({ driverId: user.id, status: 'COMPLETED' })
        .sort({ completedAt: -1 })
        .limit(10)
        .populate('passenger', 'name');
        
      // Mongoose mapping for feedback
      const historyIds = rideHistory.map(r => r._id);
      const historyFeedbacks = await Feedback.find({ rideId: { $in: historyIds } });

      const mappedHistory = rideHistory.map(r => {
        const fb = historyFeedbacks.find(f => f.rideId.toString() === r.id);
        const rObj = r.toObject();
        return {
          ...rObj,
          feedback: fb ? { rating: fb.rating, comment: fb.comment } : null
        };
      });
      
      const totalEarnings = mappedHistory.reduce((acc, curr) => acc + (curr.fare || 0), 0);

      socket.emit('initial_driver_stats', {
        totalRides: completedCount, 
        averageRating: avgRating,
        totalEarnings,
        rideHistory: mappedHistory
      });
    };

    if (user.role === 'DRIVER') {
      await sendDriverStats();

      activeRides = await Ride.find({
        driverId: user.id,
        status: { $in: ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] }
      }).populate('passenger', 'name phone').populate('driver', 'name phone');
    }
    
    if (activeRides.length > 0) {
      socket.emit('restore_active_rides', activeRides);
    }

    if (user.role === 'DRIVER') {
      const driver = await User.findById(user.id);
      if (driver?.isOnline) {
        onlineDrivers.set(user.id, true);
        socket.join('online_drivers');
        io.emit('driver_status_change', { driverId: user.id, isOnline: true });
      }
    } else {
      socket.join('passengers');
    }

    socket.on('driver_go_online', async (data, callback) => {
      let payload = data;
      let cb = callback;
      if (typeof data === 'function') {
        cb = data;
        payload = {};
      }

      fs.appendFileSync('socket-debug.log', `--- RECEIVED driver_go_online from ${user.id} ---\n`);
      if (user.role !== 'DRIVER') return;
      try {
        fs.appendFileSync('socket-debug.log', `Updating DB...\n`);
        await User.findByIdAndUpdate(user.id, { isOnline: true });
        onlineDrivers.set(user.id, true);
        
        const driverData = await User.findById(user.id);
        if (payload && payload.lat && payload.lng) {
          driverLocations.set(user.id, { lat: payload.lat, lng: payload.lng, name: driverData?.name, phone: driverData?.phone || undefined });
        } else {
          driverLocations.set(user.id, {
            lat: IITR_CENTER.lat + (Math.random() - 0.5) * 0.01,
            lng: IITR_CENTER.lng + (Math.random() - 0.5) * 0.01,
            name: driverData?.name,
            phone: driverData?.phone || undefined
          });
        }

        fs.appendFileSync('socket-debug.log', `Joining room...\n`);
        socket.join('online_drivers');
        fs.appendFileSync('socket-debug.log', `Emitting status...\n`);
        io.emit('driver_status_change', { driverId: user.id, isOnline: true });
        
        const pendingRides = await Ride.find({ status: { $in: ['REQUESTED', 'SCHEDULED'] } })
          .populate('passenger', 'name phone');
        socket.emit('initial_pending_rides', pendingRides);
        
        fs.appendFileSync('socket-debug.log', `Firing callback...\n`);
        if (typeof cb === 'function') cb({ success: true });
      } catch (err: any) {
        fs.appendFileSync('socket-debug.log', `Error: ${err.message}\n`);
        if (typeof cb === 'function') cb({ success: false, error: err.message });
      }
    });

    socket.on('driver_go_offline', async (callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const activeRide = await Ride.findOne({
          driverId: user.id,
          status: { $in: ['ACCEPTED', 'IN_PROGRESS', 'ARRIVED'] }
        });

        if (activeRide) {
          if (callback) callback({ success: false, error: 'You cannot go offline while you have an active ride.' });
          return;
        }

        await User.findByIdAndUpdate(user.id, { isOnline: false });
        onlineDrivers.delete(user.id);
        driverLocations.delete(user.id);
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
          await User.findByIdAndUpdate(user.id, { isOnline: false });
          onlineDrivers.delete(user.id);
          driverLocations.delete(user.id);
          io.emit('driver_status_change', { driverId: user.id, isOnline: false });
        } catch (e) {}
      }
    });

    socket.on('request_ride', async (data, callback) => {
      if (user.role !== 'PASSENGER') return;
      try {
        const existingRide = await Ride.findOne({
          passengerId: user.id,
          status: { $in: ['REQUESTED', 'SCHEDULED', 'ACCEPTED', 'IN_PROGRESS', 'ARRIVED'] }
        });
        if (existingRide) {
          if (typeof callback === 'function') callback({ success: false, error: 'You already have an active ride request.' });
          return;
        }

        const { pickupLocation, pickupLat, pickupLng, dropoffLocation, dropoffLat, dropoffLng, scheduledAt, isOutsideCampus } = data;
        
        if (scheduledAt) {
          const scheduledTime = new Date(scheduledAt).getTime();
          const now = new Date().getTime();
          if (scheduledTime < now) {
            if (typeof callback === 'function') callback({ success: false, error: 'Cannot schedule a ride in the past.' });
            return;
          }
        }
        
        const status = scheduledAt ? 'SCHEDULED' : 'REQUESTED';
        let calculatedFare: number | null = isOutsideCampus ? null : 10;

        let ride = await Ride.create({
          passengerId: user.id,
          pickupLocation,
          pickupLat,
          pickupLng,
          dropLocation: dropoffLocation,
          dropLat: dropoffLat,
          dropLng: dropoffLng,
          fare: calculatedFare,
          scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
          status
        });
        
        ride = await ride.populate('passenger', 'name phone');

        // Broadcast to all online drivers
        io.to('online_drivers').emit('new_ride_request', ride);
        
        if (typeof callback === 'function') callback({ success: true, ride });

        // 60-second timeout logic
        if (!scheduledAt) {
          setTimeout(async () => {
            const checkRide = await Ride.findById(ride._id);
            if (checkRide && checkRide.status === 'REQUESTED') {
              await Ride.findByIdAndUpdate(ride._id, { status: 'CANCELLED' });
              io.to('online_drivers').emit('ride_removed', { rideId: ride._id });
              
              const passengerSocket = [...connectedUsers.values()].find(u => u.userId === checkRide.passengerId.toString());
              if (passengerSocket) {
                io.to(passengerSocket.socketId).emit('ride_timeout', { rideId: ride._id });
              }
            }
          }, 60000);
        }
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Driver Acceptance Logic
    socket.on('accept_ride', async (data, callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const { rideId } = data;
        
        const ride = await Ride.findOne({ _id: rideId, status: 'REQUESTED' });

        if (!ride) {
          if (typeof callback === 'function') callback({ success: false, error: 'Ride is no longer available or already accepted.' });
          return;
        }

        const updatedRide = await Ride.findByIdAndUpdate(
          rideId,
          { driverId: user.id, status: 'ACCEPTED' },
          { new: true }
        ).populate('driver', 'name phone').populate('passenger', 'name phone');

        // Notify the specific passenger
        if (updatedRide) {
          const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId.toString());
          if (passengerSocket) {
            io.to(passengerSocket.socketId).emit('ride_accepted', updatedRide);
          }
        }

        // Notify all other drivers to remove it from their dashboards
        io.to('online_drivers').emit('ride_removed', { rideId });

        if (typeof callback === 'function') callback({ success: true, ride: updatedRide });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Driver Arrived
    socket.on('driver_arrived', async (data, callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const { rideId } = data;
        const updatedRide = await Ride.findOneAndUpdate(
          { _id: rideId, driverId: user.id },
          { status: 'ARRIVED', waitingStartTime: new Date() },
          { new: true }
        ).populate('driver', 'name phone').populate('passenger', 'name phone');

        if (updatedRide) {
          const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId.toString());
          if (passengerSocket) {
            io.to(passengerSocket.socketId).emit('ride_arrived', updatedRide);
          }
        }

        if (typeof callback === 'function') callback({ success: true, ride: updatedRide });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Start Ride
    socket.on('start_ride', async (data, callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const { rideId } = data;
        const ride = await Ride.findById(rideId);
        if (!ride) {
          if (typeof callback === 'function') callback({ success: false, error: 'Ride not found' });
          return;
        }

        let additionalFare = 0;
        if (ride.waitingStartTime && ride.fare !== null && ride.fare !== undefined) {
           const waitingMs = new Date().getTime() - new Date(ride.waitingStartTime).getTime();
           const waitingMinutes = waitingMs / 60000;
           additionalFare = Math.floor(waitingMinutes / 1.5);
        }

        const newFare = (ride.fare !== null && ride.fare !== undefined) ? ride.fare + additionalFare : null;

        const updatedRide = await Ride.findOneAndUpdate(
          { _id: rideId, driverId: user.id },
          { status: 'IN_PROGRESS', startedAt: new Date(), fare: newFare },
          { new: true }
        ).populate('driver', 'name phone').populate('passenger', 'name phone');

        if (updatedRide) {
          const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId.toString());
          if (passengerSocket) {
            io.to(passengerSocket.socketId).emit('ride_started', updatedRide);
          }
        }

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
        
        const updatedRide = await Ride.findOneAndUpdate(
          { _id: rideId, driverId: user.id },
          { status: 'COMPLETED', completedAt: new Date() },
          { new: true }
        ).populate('driver', 'name phone').populate('passenger', 'name phone');

        if (updatedRide) {
          const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId.toString());
          if (passengerSocket) {
            io.to(passengerSocket.socketId).emit('ride_completed', updatedRide);
          }
          await sendDriverStats();
        }

        if (typeof callback === 'function') callback({ success: true, ride: updatedRide });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Cancel Ride
    socket.on('cancel_ride', async (data, callback) => {
      if (user.role !== 'PASSENGER') return;
      try {
        const { rideId } = data;
        const cancelledRide = await Ride.findOneAndUpdate(
          { _id: rideId, passengerId: user.id },
          { status: 'CANCELLED' }
        );
        io.to('online_drivers').emit('ride_removed', { rideId });
        socket.emit('ride_cancelled', { rideId });

        // If a driver had already accepted, notify them and warn the passenger
        if (cancelledRide && cancelledRide.driverId) {
          const driverSocket = [...connectedUsers.values()].find(u => u.userId === cancelledRide.driverId.toString());
          if (driverSocket) {
            io.to(driverSocket.socketId).emit('ride_cancelled', { rideId });
            io.to(driverSocket.socketId).emit('in_app_notification', { message: 'The passenger cancelled the ride.' });
          }
          
          socket.emit('in_app_notification', { message: '⚠️ Warning: You cancelled a ride after a driver accepted. Frequent cancellations may result in a ₹5 penalty fee.' });
        }
        
        if (typeof callback === 'function') callback({ success: true });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Driver Cancels Accepted Ride
    socket.on('driver_cancel_ride', async (data, callback) => {
      if (user.role !== 'DRIVER') return;
      try {
        const { rideId } = data;
        const updatedRide = await Ride.findOneAndUpdate(
          { _id: rideId, driverId: user.id, status: { $in: ['ACCEPTED', 'ARRIVED'] } },
          { $set: { status: 'REQUESTED' }, $unset: { driverId: 1 } },
          { new: true }
        ).populate('passenger', 'name phone');

        if (updatedRide) {
          // Re-broadcast to all online drivers
          io.to('online_drivers').emit('new_ride_request', updatedRide);
          
          // Notify passenger
          const passengerSocket = [...connectedUsers.values()].find(u => u.userId === updatedRide.passengerId.toString());
          if (passengerSocket) {
            io.to(passengerSocket.socketId).emit('driver_cancelled_rebooking', updatedRide);
          }
        }

        if (typeof callback === 'function') callback({ success: true, ride: updatedRide });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Submit Feedback
    socket.on('submit_feedback', async (data, callback) => {
      if (user.role !== 'PASSENGER') return;
      try {
        const { rideId, rating, comment } = data;
        const ride = await Ride.findById(rideId);
        
        if (!ride || ride.status !== 'COMPLETED') {
          if (typeof callback === 'function') callback({ success: false, error: 'Ride not completed or not found.' });
          return;
        }

        const feedback = await Feedback.create({
          rideId,
          passengerId: user.id,
          driverId: ride.driverId,
          rating,
          comment
        });

        // Push stats update to the driver
        const checkRide = await Ride.findById(rideId);
        if (checkRide) {
          const driverSocket = [...connectedUsers.values()].find(u => u.userId === checkRide.driverId?.toString());
          if (driverSocket) {
            io.to(driverSocket.socketId).emit('refresh_stats_trigger');
          }
        }

        if (typeof callback === 'function') callback({ success: true, feedback });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Get Top Drivers
    socket.on('get_top_drivers', async (data, callback) => {
      // Handle missing data argument if frontend doesn't send it
      if (typeof data === 'function') {
        callback = data;
      }
      try {
        const drivers = await User.find({ role: 'DRIVER' });
        const driverIds = drivers.map(d => d._id);
        
        const driverStatsAgg = await Ride.aggregate([
          { $match: { driverId: { $in: driverIds }, status: 'COMPLETED' } },
          { $lookup: {
              from: 'feedbacks',
              localField: '_id',
              foreignField: 'rideId',
              as: 'feedback'
          }},
          { $unwind: { path: '$feedback', preserveNullAndEmptyArrays: true } },
          { $group: {
              _id: '$driverId',
              count: { $sum: 1 },
              avgRating: { $avg: '$feedback.rating' }
          }}
        ]);

        const ratingMap = new Map();
        driverStatsAgg.forEach(r => ratingMap.set(r._id.toString(), { rating: r.avgRating || 5.0, count: r.count }));

        const driverStats = drivers.map(d => {
          const stats = ratingMap.get(d._id.toString()) || { rating: 5, count: 0 };
          return {
            id: d._id,
            name: d.name,
            phone: d.phone,
            rating: stats.rating,
            trips: stats.count
          };
        }).sort((a, b) => b.rating - a.rating || b.trips - a.trips).slice(0, 5);

        if (typeof callback === 'function') callback({ success: true, drivers: driverStats });
      } catch (err: any) {
        if (typeof callback === 'function') callback({ success: false, error: err.message });
      }
    });

    // Hidden event for driver to pull stats when passenger submits feedback
    socket.on('refresh_driver_stats', async () => {
      await sendDriverStats();
    });
  });
}
