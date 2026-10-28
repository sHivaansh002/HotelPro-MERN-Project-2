import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, Room } from "./models.js";

await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/hotelpro");
const email = "admin@hotelpro.local";
await User.updateOne(
  { email },
  { $set: { name: "HotelPro Admin", email, role: "admin", passwordHash: await bcrypt.hash("Admin123!", 12) } },
  { upsert: true }
);
if (await Room.countDocuments() === 0) {
  await Room.insertMany([
    { name: "Classic Comfort Room", type: "Standard", description: "A calm, comfortable room for a relaxing stay.", pricePerNight: 2499, capacity: 2, image: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=80", amenities: ["Wi-Fi", "Air conditioning", "Queen bed"] },
    { name: "Deluxe City View", type: "Deluxe", description: "A spacious room with refined details and city views.", pricePerNight: 3999, capacity: 3, image: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80", amenities: ["Wi-Fi", "City view", "Mini fridge", "Breakfast"] },
    { name: "Signature Suite", type: "Suite", description: "A premium suite with a separate lounge area.", pricePerNight: 6999, capacity: 4, image: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80", amenities: ["Wi-Fi", "Lounge", "King bed", "Breakfast", "Room service"] }
  ]);
}
console.log("Seed complete. Admin: admin@hotelpro.local / Admin123!");
await mongoose.disconnect();
