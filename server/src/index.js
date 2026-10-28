import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Room, Booking } from "./models.js";
import { requireAuth, requireAdmin } from "./auth.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "HotelPro API" }));

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8)
      return res.status(400).json({ message: "Name, email, and a password of at least 8 characters are required." });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const user = await User.create({ name: name.trim(), email: normalizedEmail, passwordHash: await bcrypt.hash(password, 12) });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: String(req.body.email || "").toLowerCase().trim() });
    if (!user || !(await bcrypt.compare(req.body.password || "", user.passwordHash)))
      return res.status(401).json({ message: "Incorrect email or password." });
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (e) { next(e); }
});

app.get("/api/rooms", async (req, res, next) => {
  try {
    const query = { active: true };
    if (req.query.type && req.query.type !== "All") query.type = req.query.type;
    const rooms = await Room.find(query).sort({ pricePerNight: 1 });
    res.json(rooms);
  } catch (e) { next(e); }
});

app.get("/api/rooms/:id", async (req, res, next) => {
  try {
    const room = await Room.findOne({ _id: req.params.id, active: true });
    if (!room) return res.status(404).json({ message: "Room not found." });
    res.json(room);
  } catch (e) { next(e); }
});

app.post("/api/bookings", requireAuth, async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut, guests } = req.body;
    const start = new Date(checkIn), end = new Date(checkOut), today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!checkIn || !checkOut || Number.isNaN(+start) || Number.isNaN(+end) || start < today || end <= start)
      return res.status(400).json({ message: "Choose valid dates. Check-out must be after check-in and check-in cannot be in the past." });
    const room = await Room.findOne({ _id: roomId, active: true });
    if (!room) return res.status(404).json({ message: "Room not found." });
    const guestCount = Number(guests);
    if (!Number.isInteger(guestCount) || guestCount < 1 || guestCount > room.capacity)
      return res.status(400).json({ message: `This room accommodates 1–${room.capacity} guests.` });
    const conflict = await Booking.findOne({
      room: roomId, status: "Confirmed", checkIn: { $lt: end }, checkOut: { $gt: start }
    });
    if (conflict) return res.status(409).json({ message: "This room is already booked for those dates. Please choose another date or room." });
    const nights = Math.ceil((end - start) / 86400000);
    const booking = await Booking.create({ user: req.user.id, room: roomId, checkIn: start, checkOut: end, guests: guestCount, totalPrice: nights * room.pricePerNight });
    await booking.populate("room");
    res.status(201).json(booking);
  } catch (e) { next(e); }
});

app.get("/api/bookings/mine", requireAuth, async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate("room").sort({ createdAt: -1 });
    res.json(bookings);
  } catch (e) { next(e); }
});

app.patch("/api/bookings/:id/cancel", requireAuth, async (req, res, next) => {
  try {
    const booking = await Booking.findOne({ _id: req.params.id, user: req.user.id });
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    if (booking.status === "Cancelled") return res.status(400).json({ message: "This booking is already cancelled." });
    if (new Date(booking.checkIn) <= new Date()) return res.status(400).json({ message: "Bookings cannot be cancelled on or after check-in through this demo." });
    booking.status = "Cancelled";
    await booking.save();
    res.json(booking);
  } catch (e) { next(e); }
});

// Admin endpoints
app.get("/api/admin/summary", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [rooms, bookings, users, revenue] = await Promise.all([
      Room.countDocuments({ active: true }),
      Booking.countDocuments(),
      User.countDocuments({ role: "guest" }),
      Booking.aggregate([{ $match: { status: "Confirmed" } }, { $group: { _id: null, total: { $sum: "$totalPrice" } } }])
    ]);
    res.json({ rooms, bookings, users, revenue: revenue[0]?.total || 0 });
  } catch (e) { next(e); }
});

app.get("/api/admin/bookings", requireAuth, requireAdmin, async (_req, res, next) => {
  try { res.json(await Booking.find().populate("room").populate("user", "name email").sort({ createdAt: -1 })); }
  catch (e) { next(e); }
});

app.post("/api/admin/rooms", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { name, type, description, pricePerNight, capacity, image, amenities } = req.body;
    if (!name?.trim() || !Number.isFinite(Number(pricePerNight)) || Number(pricePerNight) <= 0)
      return res.status(400).json({ message: "Room name and a positive nightly price are required." });
    const room = await Room.create({ name: name.trim(), type, description, pricePerNight: Number(pricePerNight), capacity: Number(capacity || 2), image, amenities: Array.isArray(amenities) ? amenities : [] });
    res.status(201).json(room);
  } catch (e) { next(e); }
});

app.patch("/api/admin/rooms/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!room) return res.status(404).json({ message: "Room not found." });
    res.json(room);
  } catch (e) { next(e); }
});

app.patch("/api/admin/bookings/:id/status", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (!["Confirmed", "Cancelled"].includes(req.body.status)) return res.status(400).json({ message: "Invalid status." });
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }).populate("room").populate("user", "name email");
    if (!booking) return res.status(404).json({ message: "Booking not found." });
    res.json(booking);
  } catch (e) { next(e); }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  if (err?.code === 11000) return res.status(409).json({ message: "That value is already in use." });
  if (err?.name === "CastError") return res.status(400).json({ message: "Invalid ID or input." });
  res.status(500).json({ message: "Server error. Check the backend terminal for details." });
});

const port = process.env.PORT || 5000;
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is missing. Copy .env.example to .env and set a secret.");
await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hotelpro");
app.listen(port, () => console.log(`HotelPro API running at http://localhost:${port}`));
