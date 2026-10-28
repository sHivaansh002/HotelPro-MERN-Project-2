import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["guest", "admin"], default: "guest" }
}, { timestamps: true });

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ["Standard", "Deluxe", "Suite"], default: "Standard" },
  description: { type: String, default: "" },
  pricePerNight: { type: Number, required: true, min: 1 },
  capacity: { type: Number, default: 2, min: 1 },
  image: { type: String, default: "" },
  amenities: [{ type: String }],
  active: { type: Boolean, default: true }
}, { timestamps: true });

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  checkIn: { type: Date, required: true },
  checkOut: { type: Date, required: true },
  guests: { type: Number, required: true, min: 1 },
  totalPrice: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ["Confirmed", "Cancelled"], default: "Confirmed" }
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
export const Room = mongoose.model("Room", roomSchema);
export const Booking = mongoose.model("Booking", bookingSchema);
