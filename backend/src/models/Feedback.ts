import mongoose, { Schema, Document } from 'mongoose';

export interface IFeedback extends Document {
  rideId: mongoose.Types.ObjectId;
  passengerId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    rideId: { type: Schema.Types.ObjectId, ref: 'Ride', required: true, unique: true },
    passengerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual field for frontend compatibility
FeedbackSchema.virtual('passenger', {
  ref: 'User',
  localField: 'passengerId',
  foreignField: '_id',
  justOne: true
});

FeedbackSchema.virtual('ride', {
  ref: 'Ride',
  localField: 'rideId',
  foreignField: '_id',
  justOne: true
});

export default mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);
