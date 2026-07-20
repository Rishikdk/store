import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tokenHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ tokenHash: 1 }, { unique: true });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model<IRefreshToken>('RefreshToken', refreshTokenSchema);
