import mongoose, { Schema, Document } from 'mongoose';

export interface IVehicle {
  make: string;
  model: string;
  licensePlate: string;
  color?: string;
}

export interface IUser extends Document {
  email: string;
  password?: string;
  name: string;
  role: 'PASSENGER' | 'DRIVER';
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
  isOnline: boolean;
  willingToGoOutside: boolean;
  vehicle?: IVehicle;
}

const VehicleSchema = new Schema<IVehicle>({
  make: { type: String, required: true },
  model: { type: String, required: true },
  licensePlate: { type: String, required: true },
  color: { type: String }
});

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['PASSENGER', 'DRIVER'], required: true },
    phone: { type: String },
    isOnline: { type: Boolean, default: false },
    willingToGoOutside: { type: Boolean, default: false },
    vehicle: { type: VehicleSchema, required: false }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// This ensures Mongoose maps `_id` to `id` in the JSON representation natively.
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
