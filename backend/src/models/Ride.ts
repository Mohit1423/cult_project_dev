import mongoose, { Schema, Document } from 'mongoose';

export interface IRide extends Document {
  passengerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  status: 'REQUESTED' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'SCHEDULED';
  pickupLocation: string;
  pickupLat?: number;
  pickupLng?: number;
  dropLocation: string;
  dropLat?: number;
  dropLng?: number;
  fare?: number;
  requestedAt: Date;
  scheduledAt?: Date;
  acceptedAt?: Date;
  waitingStartTime?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

const RideSchema = new Schema<IRide>(
  {
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'SCHEDULED'],
      default: 'REQUESTED'
    },
    pickupLocation: { type: String, required: true },
    pickupLat: { type: Number },
    pickupLng: { type: Number },
    dropLocation: { type: String, required: true },
    dropLat: { type: Number },
    dropLng: { type: Number },
    fare: { type: Number },
    requestedAt: { type: Date, default: Date.now },
    scheduledAt: { type: Date },
    acceptedAt: { type: Date },
    waitingStartTime: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for frontend compatibility
RideSchema.virtual('passenger', {
  ref: 'User',
  localField: 'passengerId',
  foreignField: '_id',
  justOne: true
});

RideSchema.virtual('driver', {
  ref: 'User',
  localField: 'driverId',
  foreignField: '_id',
  justOne: true
});

export default mongoose.models.Ride || mongoose.model<IRide>('Ride', RideSchema);
