import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { BedDouble, CalendarDays, Check, ChevronDown, CircleUserRound, Hotel, LogOut, Menu, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const money = n => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);
const dateText = d => d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
async function request(path, options = {}, token) {
  const res = await fetch(`${API}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}
function App() {
  const [auth, setAuth] = useState(() => { try { return JSON.parse(localStorage.getItem("hotelpro-auth") || "null"); } catch { return null; } });
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [adminData, setAdminData] = useState({ rooms: 0, bookings: 0, users: 0, revenue: 0 });
  const [adminBookings, setAdminBookings] = useState([]);
  const [view, setView] = useState("home");
  const [roomType, setRoomType] = useState("All");
  const [dates, setDates] = useState({ checkIn: "", checkOut: "", guests: "2" });
  const [modal, setModal] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [form, setForm] = useState({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const token = auth?.token;

  async function loadRooms() { try { setRooms(await request(`/rooms?type=${encodeURIComponent(roomType)}`)); } catch (e) { setError(e.message); } }
  async function loadBookings() { if (!token) return; try { setBookings(await request("/bookings/mine", {}, token)); } catch (e) { setError(e.message); } }
  async function loadAdmin() {
    if (auth?.user?.role !== "admin") return;
    try { const [s, b] = await Promise.all([request("/admin/summary", {}, token), request("/admin/bookings", {}, token)]); setAdminData(s); setAdminBookings(b); } catch (e) { setError(e.message); }
  }
  useEffect(() => { loadRooms(); }, [roomType]);
  useEffect(() => { loadBookings(); loadAdmin(); }, [token, view]);
  useEffect(() => { if (notice || error) { const id = setTimeout(() => { setNotice(""); setError(""); }, 4500); return () => clearTimeout(id); } }, [notice, error]);

  const filteredRooms = useMemo(() => rooms, [rooms]);
  const nights = dates.checkIn && dates.checkOut && new Date(dates.checkOut) > new Date(dates.checkIn) ? Math.ceil((new Date(dates.checkOut) - new Date(dates.checkIn)) / 86400000) : 0;
  const today = new Date().toLocaleDateString("en-CA");
  const setField = (key, value) => setForm(f => ({ ...f, [key]: value }));
  const signOut = () => { localStorage.removeItem("hotelpro-auth"); setAuth(null); setView("home"); setNotice("You have signed out."); };
  async function submitAuth(e) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = await request(`/auth/${modal === "register" ? "register" : "login"}`, { method: "POST", body: JSON.stringify(form) });
      setAuth(result); localStorage.setItem("hotelpro-auth", JSON.stringify(result)); setModal(""); setForm({}); setNotice(`Welcome${result.user.name ? `, ${result.user.name}` : ""}!`);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function bookRoom(room) {
    if (!auth) { setSelectedRoom(room); setModal("login"); setNotice("Log in to continue your booking."); return; }
    if (!dates.checkIn || !dates.checkOut) { setError("Please choose check-in and check-out dates first."); return; }
    setBusy(true);
    try {
      await request("/bookings", { method: "POST", body: JSON.stringify({ roomId: room._id, ...dates, guests: Number(dates.guests) }) }, token);
      setNotice("Booking confirmed! You can view it under My bookings."); setView("bookings"); await loadBookings();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function cancelBooking(id) {
    try { await request(`/bookings/${id}/cancel`, { method: "PATCH" }, token); setNotice("Booking cancelled."); await loadBookings(); }
    catch (e) { setError(e.message); }
  }
  async function addRoom(e) {
    e.preventDefault(); setBusy(true);
    try {
      await request("/admin/rooms", { method: "POST", body: JSON.stringify({ ...form, pricePerNight: Number(form.pricePerNight), capacity: Number(form.capacity || 2), amenities: String(form.amenities || "").split(",").map(s => s.trim()).filter(Boolean) }) }, token);
      setModal(""); setForm({}); setNotice("Room added successfully."); await loadRooms(); await loadAdmin();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function updateStatus(id, status) {
    try { await request(`/admin/bookings/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token); setNotice(`Booking ${status.toLowerCase()}.`); await loadAdmin(); }
    catch (e) { setError(e.message); }
  }
  const go = v => { setView(v); setMobileNav(false); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); go("home"); }}><span className="brand-icon"><Hotel size={20}/></span><span>hotelpro<small>STAY BEAUTIFULLY</small></span></a>
      <button className="mobile-toggle" onClick={() => setMobileNav(!mobileNav)} aria-label="Toggle menu">{mobileNav ? <X/> : <Menu/>}</button>
      <nav className={mobileNav ? "nav open" : "nav"}>
        <button className={view === "home" ? "nav-link active" : "nav-link"} onClick={() => go("home")}>Discover</button>
        {auth && <button className={view === "bookings" ? "nav-link active" : "nav-link"} onClick={() => go("bookings")}>My bookings</button>}
        {auth?.user?.role === "admin" && <button className={view === "admin" ? "nav-link active" : "nav-link"} onClick={() => go("admin")}>Admin</button>}
        {auth ? <button className="account-btn" onClick={signOut}><LogOut size={16}/> Sign out</button> : <><button className="nav-link" onClick={() => { setModal("login"); setForm({}); }}>Log in</button><button className="primary small" onClick={() => { setModal("register"); setForm({}); }}>Create account</button></>}
      </nav>
    </header>

    {notice && <div className="toast success"><Check size={17}/>{notice}<button onClick={() => setNotice("")}><X size={15}/></button></div>}
    {error && <div className="toast danger">{error}<button onClick={() => setError("")}><X size={15}/></button></div>}

    {view === "home" && <>
      <section className="hero">
        <div className="hero-content"><div className="eyebrow"><Sparkles size={15}/> A MORE THOUGHTFUL STAY</div><h1>Find your place<br/>to <em>slow down.</em></h1><p>Considered spaces, warm hospitality, and stays worth remembering. Your next getaway starts here.</p><div className="hero-points"><span><Check size={15}/> Handpicked rooms</span><span><Check size={15}/> Simple booking</span></div></div>
        <div className="hero-image"><div className="image-label"><span className="label-dot"></span> YOUR NEXT ESCAPE <span>✳</span></div></div>
        <div className="hero-stamp"><span>H</span><small>HOSPITALITY<br/>REIMAGINED</small></div>
      </section>
      <section className="search-wrap"><div className="search-heading"><span>MAKE IT YOURS</span><strong>Where comfort meets you.</strong></div><div className="search-grid">
        <label><span><CalendarDays size={16}/> CHECK IN</span><input type="date" min={today} value={dates.checkIn} onChange={e => setDates(d => ({ ...d, checkIn: e.target.value, checkOut: d.checkOut && d.checkOut <= e.target.value ? "" : d.checkOut }))}/></label>
        <label><span><CalendarDays size={16}/> CHECK OUT</span><input type="date" min={dates.checkIn || today} value={dates.checkOut} onChange={e => setDates(d => ({ ...d, checkOut: e.target.value }))}/></label>
        <label><span><Users size={16}/> GUESTS</span><select value={dates.guests} onChange={e => setDates(d => ({ ...d, guests: e.target.value }))}>{[1,2,3,4].map(n => <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>)}</select></label>
        <button className="primary search-button" onClick={() => document.getElementById("rooms").scrollIntoView({ behavior: "smooth" })}>Explore rooms <span>↗</span></button>
      </div>{nights > 0 && <p className="date-hint">{nights} night{nights > 1 ? "s" : ""} selected · Choose a room below to see your total.</p>}</section>
      <section id="rooms" className="rooms-section"><div className="section-top"><div><div className="eyebrow">THE COLLECTION</div><h2>Rooms made for <em>rest.</em></h2><p>Find the right space for your kind of getaway.</p></div><label className="filter-label">ROOM TYPE <span><ChevronDown size={15}/></span><select value={roomType} onChange={e => setRoomType(e.target.value)}><option>All</option><option>Standard</option><option>Deluxe</option><option>Suite</option></select></label></div>
        {filteredRooms.length ? <div className="room-grid">{filteredRooms.map((room, i) => <article className="room-card" key={room._id}><div className="room-photo">{room.image ? <img src={room.image} alt={room.name} loading="lazy"/> : <div className="photo-fallback"><BedDouble size={40}/></div>}<span className="room-type">{room.type}</span><span className="room-number">0{i + 1}</span></div><div className="room-info"><div className="room-title-row"><h3>{room.name}</h3><span className="capacity"><Users size={14}/> {room.capacity}</span></div><p>{room.description}</p><div className="amenities">{(room.amenities || []).slice(0, 3).map(a => <span key={a}>{a}</span>)}</div><div className="room-bottom"><div><strong>{money(room.pricePerNight)}</strong><span> / night</span>{nights > 0 && <small>{money(room.pricePerNight * nights)} total</small>}</div><button className="book-btn" disabled={busy} onClick={() => bookRoom(room)}>Book stay <span>↗</span></button></div></div></article>)}</div> : <div className="empty"><BedDouble size={30}/><h3>No rooms found</h3><p>Try a different room category.</p></div>}
      </section>
      <section className="promise"><div className="promise-icon"><ShieldCheck size={25}/></div><div><div className="eyebrow">THE HOTELPRO PROMISE</div><h2>A little more care.<br/><em>A lot more comfort.</em></h2></div><p>From the first search to the final checkout, we make every step feel effortless. Secure accounts, clear pricing, and a stay that feels like yours.</p><button className="text-btn" onClick={() => auth ? go("bookings") : setModal("register")}>Plan your stay <span>↗</span></button></section>
    </>}

    {view === "bookings" && <main className="page-section"><div className="eyebrow">YOUR JOURNEY</div><h1 className="page-title">My <em>bookings.</em></h1><p className="page-subtitle">All your upcoming and past stays, in one place.</p>{bookings.length ? <div className="booking-list">{bookings.map(b => <article className="booking-card" key={b._id}><div className="booking-image">{b.room?.image && <img src={b.room.image} alt=""/>}</div><div className="booking-detail"><span className={`status ${b.status.toLowerCase()}`}>{b.status}</span><h3>{b.room?.name || "Hotel room"}</h3><p><CalendarDays size={15}/> {dateText(b.checkIn)} — {dateText(b.checkOut)}</p><p><Users size={15}/> {b.guests} guests · {Math.ceil((new Date(b.checkOut)-new Date(b.checkIn))/86400000)} nights</p><strong>{money(b.totalPrice)}</strong></div>{b.status === "Confirmed" && new Date(b.checkIn) > new Date() && <button className="outline-btn cancel-btn" onClick={() => cancelBooking(b._id)}>Cancel booking</button>}</article>)}</div> : <div className="empty"><CalendarDays size={32}/><h3>Your next stay awaits.</h3><p>You haven't made any bookings yet.</p><button className="primary" onClick={() => go("home")}>Explore rooms</button></div>}</main>}

    {view === "admin" && auth?.user?.role === "admin" && <main className="page-section admin-page"><div className="eyebrow">HOTEL OPERATIONS</div><h1 className="page-title">Admin <em>overview.</em></h1><p className="page-subtitle">A clear view of your property and reservations.</p><div className="stats-grid">{[["Active rooms",adminData.rooms,"Rooms available"],["Total bookings",adminData.bookings,"All reservations"],["Guest accounts",adminData.users,"Registered guests"],["Confirmed value",money(adminData.revenue),"Booking total"]].map(([label,value,desc])=><div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{desc}</small></div>)}</div><div className="admin-heading"><div><h2>Reservations</h2><p>Review and update booking status.</p></div><button className="primary" onClick={() => { setForm({ type: "Standard", capacity: 2 }); setModal("add-room"); }}>+ Add room</button></div><div className="table-wrap"><table><thead><tr><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>{adminBookings.map(b=><tr key={b._id}><td>{b.user?.name}<small>{b.user?.email}</small></td><td>{b.room?.name}</td><td>{dateText(b.checkIn)}<small>to {dateText(b.checkOut)}</small></td><td>{money(b.totalPrice)}</td><td><span className={`status ${b.status.toLowerCase()}`}>{b.status}</span></td><td>{b.status === "Confirmed" ? <button className="table-action" onClick={() => updateStatus(b._id,"Cancelled")}>Cancel</button> : <button className="table-action" onClick={() => updateStatus(b._id,"Confirmed")}>Confirm</button>}</td></tr>)}</tbody></table>{!adminBookings.length && <div className="empty compact">No bookings yet.</div>}</div></main>}

    <footer><a className="brand footer-brand" href="#" onClick={e => { e.preventDefault(); go("home"); }}><span className="brand-icon"><Hotel size={18}/></span><span>hotelpro<small>STAY BEAUTIFULLY</small></span></a><p>Thoughtful stays. Effortless planning.</p><span>© {new Date().getFullYear()} HotelPro</span></footer>

    {modal && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setModal(""); }}><div className="modal"><button className="modal-close" onClick={() => setModal("")}><X size={19}/></button><div className="modal-mark"><Hotel size={23}/></div><div className="eyebrow">{modal === "add-room" ? "PROPERTY MANAGEMENT" : "WELCOME TO HOTELPRO"}</div><h2>{modal === "login" ? "Welcome back." : modal === "register" ? "Make yourself at home." : "Add a room."}</h2><p>{modal === "login" ? "Sign in to manage your stay." : modal === "register" ? "Create an account to book your next stay." : "Add a room to your collection."}</p>
      {modal === "add-room" ? <form onSubmit={addRoom} className="form-stack"><label>Room name<input required value={form.name || ""} onChange={e => setField("name",e.target.value)} placeholder="e.g. Garden Deluxe"/></label><label>Room type<select value={form.type || "Standard"} onChange={e => setField("type",e.target.value)}><option>Standard</option><option>Deluxe</option><option>Suite</option></select></label><div className="form-row"><label>Price per night (₹)<input type="number" min="1" required value={form.pricePerNight || ""} onChange={e => setField("pricePerNight",e.target.value)}/></label><label>Guest capacity<input type="number" min="1" max="4" required value={form.capacity || 2} onChange={e => setField("capacity",e.target.value)}/></label></div><label>Description<textarea value={form.description || ""} onChange={e => setField("description",e.target.value)} placeholder="Describe this room"/></label><label>Image URL<input value={form.image || ""} onChange={e => setField("image",e.target.value)} placeholder="https://..."/></label><label>Amenities<input value={form.amenities || ""} onChange={e => setField("amenities",e.target.value)} placeholder="Wi-Fi, Breakfast, King bed"/></label><button className="primary full" disabled={busy}>{busy ? "Saving…" : "Add room"}</button></form> : <form onSubmit={submitAuth} className="form-stack">{modal === "register" && <label>Full name<input required value={form.name || ""} onChange={e => setField("name",e.target.value)} placeholder="Your name"/></label>}<label>Email address<input type="email" required value={form.email || ""} onChange={e => setField("email",e.target.value)} placeholder="you@example.com"/></label><label>Password<input type="password" minLength="8" required value={form.password || ""} onChange={e => setField("password",e.target.value)} placeholder="At least 8 characters"/></label><button className="primary full" disabled={busy}>{busy ? "Please wait…" : modal === "login" ? "Log in" : "Create account"}</button><div className="switch-auth">{modal === "login" ? "New to HotelPro?" : "Already have an account?"} <button type="button" onClick={() => { setModal(modal === "login" ? "register" : "login"); setForm({}); }}>{modal === "login" ? "Create account" : "Log in"}</button></div></form>}
    </div></div>}
  </div>;
}
createRoot(document.getElementById("root")).render(<App/>);
