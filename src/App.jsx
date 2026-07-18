import React, { useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import {
  Sword, Wand2, Sparkles, User, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  Users, Wifi, WifiOff, Heart, Star, X,
} from "lucide-react";

/* ---------------------------------- DATA ---------------------------------- */

const CLASSES = [
  { id: "pendekar", label: "Pendekar", accent: "#FF6B4A", icon: Sword },
  { id: "penyihir", label: "Penyihir", accent: "#7C5CFC", icon: Wand2 },
];
const HAIR_COLORS = [
  { id: "hitam", label: "Hitam", hex: "#1C1B1F" },
  { id: "coklat", label: "Cokelat", hex: "#5B3A24" },
  { id: "pirang", label: "Pirang", hex: "#D9A441" },
  { id: "merah", label: "Merah", hex: "#A6402F" },
  { id: "perak", label: "Perak", hex: "#D8DCE3" },
  { id: "biru", label: "Biru", hex: "#4A6FD9" },
];
const SKIN_TONES = [
  { id: "terang", hex: "#FCDDBB" },
  { id: "cerah", hex: "#F0B98D" },
  { id: "sawo", hex: "#C68A5B" },
  { id: "kecoklatan", hex: "#8D5B3B" },
  { id: "gelap", hex: "#5B3A28" },
];
const OUTFITS = [
  { id: "tunik", label: "Tunik", color: "#3D7A63", dark: "#274F40" },
  { id: "jubah", label: "Jubah", color: "#5B4A9E", dark: "#3C3070" },
  { id: "zirah", label: "Zirah", color: "#6B6F7A", dark: "#494D57" },
];

/* ------------------------------- LOCAL STORAGE ------------------------------ */

const STORAGE_KEY = "adventure_world_character";
const safeSave = (c) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); } catch (e) {} };
const safeLoad = () => { try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; } catch (e) { return null; } };
const safeClear = () => { try { localStorage.removeItem(STORAGE_KEY); } catch (e) {} };

/* --------------------------- WORLD MAP GENERATION --------------------------- */

const TILE = 16;
const ROWS = 36;
const COLS = 54;
const VIEW_COLS = 20;
const VIEW_ROWS = 13;
const SPAWN = { x: 5 * TILE + 8, y: 19 * TILE + 8 };

const riverCol = (r) => 22 + Math.round(3 * Math.sin(r / 6));

function buildWorld() {
  const grid = Array.from({ length: ROWS }, () => Array(COLS).fill("grass"));
  const setT = (r, c, t) => { if (r >= 0 && r < ROWS && c >= 0 && c < COLS) grid[r][c] = t; };

  for (let r = 0; r <= 7; r++) for (let c = 0; c <= 13; c++) setT(r, c, "mountain");
  for (let r = 8; r <= 10; r++) {
    const maxC = 13 - 2 * (r - 7);
    for (let c = 0; c <= maxC; c++) setT(r, c, "mountain");
  }

  for (let r = 0; r < ROWS; r++) {
    const c = riverCol(r);
    setT(r, c, "water");
    setT(r, c + 1, "water");
  }
  const bridgeRow = 19;
  const bc = riverCol(bridgeRow);
  setT(bridgeRow, bc, "bridge");
  setT(bridgeRow, bc + 1, "bridge");

  const forestZones = [
    { r0: 2, r1: 9, c0: 20, c1: 33 },
    { r0: 12, r1: 18, c0: 2, c1: 10 },
    { r0: 2, r1: 9, c0: 36, c1: 52 },
    { r0: 21, r1: 24, c0: 18, c1: 30 },
  ];
  forestZones.forEach((z) => {
    for (let r = z.r0; r <= z.r1; r++)
      for (let c = z.c0; c <= z.c1; c++)
        if (grid[r] && grid[r][c] === "grass" && (r + c) % 3 === 0) setT(r, c, "tree");
  });

  const road = (r, c) => { if (grid[r] && (grid[r][c] === "grass" || grid[r][c] === "tree")) setT(r, c, "road"); };
  const lineH = (r, c1, c2) => { const [a, b] = c1 < c2 ? [c1, c2] : [c2, c1]; for (let c = a; c <= b; c++) road(r, c); };
  const lineV = (c, r1, r2) => { const [a, b] = r1 < r2 ? [r1, r2] : [r2, r1]; for (let r = a; r <= b; r++) road(r, c); };

  lineH(19, 4, 21);
  lineH(19, 24, 40);
  lineV(40, 19, 26);
  lineH(26, 40, 46);
  lineV(10, 19, 29);
  lineV(42, 24, 33);
  lineV(46, 24, 33);

  for (let r = 27; r <= 29; r++) for (let c = 42; c <= 46; c++) setT(r, c, "plaza");

  const houses = [
    { r: 25, c: 36 }, { r: 25, c: 44 }, { r: 25, c: 49 },
    { r: 30, c: 36 }, { r: 30, c: 44 }, { r: 30, c: 49 },
  ];
  houses.forEach((h) => {
    setT(h.r, h.c, "house");
    setT(h.r, h.c + 1, "house_part");
    setT(h.r + 1, h.c, "house_part");
    setT(h.r + 1, h.c + 1, "house_part");
  });

  setT(28, 7, "sign");
  setT(31, 13, "sign");

  return grid;
}

const NPCS = [
  { r: 16, c: 6, name: "Pak Tani", skin: "#F0B98D", hair: "#5B3A24", outfit: "#6B8E4E", dialog: "Musim tanam tahun ini cukup baik, semoga hujan datang tepat waktu." },
  { r: 19, c: 20, name: "Penjaga Kota", skin: "#C68A5B", hair: "#1C1B1F", outfit: "#4A5A7A", dialog: "Selamat datang di Adventure World. Jembatan ini menghubungkan kita ke kota." },
  { r: 28, c: 44, name: "Pedagang", skin: "#FCDDBB", hair: "#A6402F", outfit: "#7C5CFC", dialog: "Barang langka dari luar kota, mampir kalau sempat!" },
  { r: 11, c: 10, name: "Sesepuh", skin: "#8D5B3B", hair: "#D8DCE3", outfit: "#8A6A3D", dialog: "Gunung itu menyimpan banyak rahasia yang belum terjamah." },
  { r: 24, c: 45, name: "Anak Kecil", skin: "#F0B98D", hair: "#D9A441", outfit: "#C2555B", dialog: "Kamu pemain baru ya? Kota kami kecil tapi ramah kok!" },
  { r: 19, c: 33, name: "Pengembara", skin: "#C68A5B", hair: "#5B3A24", outfit: "#3D7A63", dialog: "Aku baru saja melewati jembatan. Sisi barat sungai masih sepi." },
];
const SIGNS = [
  { r: 28, c: 7, text: "Wilayah ini akan segera dikembangkan." },
  { r: 31, c: 13, text: "Rencana area baru sedang disiapkan." },
];

const BLOCKING = new Set(["mountain", "tree", "water", "house", "house_part"]);

/* ------------------------------ TILE RENDERING ------------------------------ */

const TILE_COLOR = {
  grass: "#3f7a3f", tree: "#2e6b3c", road: "#c2a878", water: "#3E7FBF",
  bridge: "#8a5a32", mountain: "#83858c", plaza: "#d8cba8",
  house: "#a6432d", house_part: "#a6432d", sign: "#3f7a3f",
};

function shadeFor(r, c) {
  const v = (r * 7 + c * 13) % 5;
  return ["#4C9A4C", "#469246", "#519F51", "#458D45", "#4E9B4E"][v];
}

function drawTileBase(ctx, type, x, y, r, c, t) {
  switch (type) {
    case "grass": case "tree": case "house": case "house_part": case "sign":
      ctx.fillStyle = shadeFor(r, c);
      ctx.fillRect(x, y, TILE, TILE);
      if ((r * 3 + c) % 7 === 0) {
        ctx.fillStyle = "#3E7F3E";
        ctx.fillRect(x + 4, y + 9, 2, 2);
        ctx.fillRect(x + 9, y + 5, 2, 2);
      }
      break;
    case "road":
      ctx.fillStyle = "#C2A878";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = "#AD9469";
      if ((r + c) % 4 === 0) ctx.fillRect(x + 6, y + 6, 3, 3);
      break;
    case "plaza":
      ctx.fillStyle = "#D8CBA8";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = "#C1B48C";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      break;
    case "mountain": {
      ctx.fillStyle = r <= 1 ? "#AEB2BC" : "#83858C";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = r <= 1 ? "#E8EAF0" : "#6E7077";
      ctx.beginPath();
      ctx.moveTo(x + 2, y + 14); ctx.lineTo(x + 8, y + 3); ctx.lineTo(x + 14, y + 14);
      ctx.closePath(); ctx.fill();
      break;
    }
    case "water": {
      ctx.fillStyle = "#3E7FBF";
      ctx.fillRect(x, y, TILE, TILE);
      const phase = Math.floor(t / 400) % 2;
      ctx.fillStyle = "#5C9FDE";
      ctx.fillRect(x, y + 4 + phase * 2, TILE, 2);
      ctx.fillRect(x, y + 11 - phase * 2, TILE, 2);
      break;
    }
    case "bridge":
      ctx.fillStyle = "#8A5A32";
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = "#6B421F";
      ctx.lineWidth = 1;
      for (let i = 2; i < TILE; i += 4) { ctx.beginPath(); ctx.moveTo(x, y + i); ctx.lineTo(x + TILE, y + i); ctx.stroke(); }
      break;
    default:
      ctx.fillStyle = "#4C9A4C";
      ctx.fillRect(x, y, TILE, TILE);
  }
}

function drawFeature(ctx, type, x, y) {
  if (type === "tree") {
    ctx.fillStyle = "#6B4226"; ctx.fillRect(x + 6, y + 10, 4, 6);
    ctx.fillStyle = "#2E6B3C"; ctx.beginPath(); ctx.arc(x + 8, y + 6, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#357E46"; ctx.beginPath(); ctx.arc(x + 5, y + 8, 5, 0, Math.PI * 2); ctx.fill();
  } else if (type === "house") {
    ctx.fillStyle = "#EDD9AF"; ctx.fillRect(x + 2, y + 16, 28, 16);
    ctx.fillStyle = "#A6432D";
    ctx.beginPath(); ctx.moveTo(x, y + 16); ctx.lineTo(x + 16, y - 2); ctx.lineTo(x + 32, y + 16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#7A3320"; ctx.fillRect(x + 13, y + 22, 6, 10);
    ctx.fillStyle = "#F4E2A8"; ctx.fillRect(x + 5, y + 20, 4, 4); ctx.fillRect(x + 23, y + 20, 4, 4);
  } else if (type === "sign") {
    ctx.fillStyle = "#7A5A34"; ctx.fillRect(x + 7, y + 8, 2, 8);
    ctx.fillStyle = "#B08A54"; ctx.fillRect(x + 2, y + 3, 12, 7);
    ctx.fillStyle = "#4A3A22"; ctx.font = "7px monospace"; ctx.textAlign = "center"; ctx.fillText("?", x + 8, y + 9);
  }
}

function drawPerson(ctx, px, py, skin, hair, outfit, facing, bob, mirror) {
  ctx.save();
  if (mirror) { ctx.translate(px, 0); ctx.scale(-1, 1); ctx.translate(-px, 0); }
  const legOffset = bob ? 1 : 0;
  ctx.fillStyle = "#000"; ctx.globalAlpha = 0.25;
  ctx.beginPath(); ctx.ellipse(px, py + 1, 6, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = outfit;
  ctx.fillRect(px - 3 + legOffset, py - 7, 3, 7);
  ctx.fillRect(px - legOffset, py - 7, 3, 7);
  ctx.fillRect(px - 5, py - 18, 10, 12);
  ctx.fillStyle = skin;
  ctx.fillRect(px - 4, py - 27, 8, 9);
  ctx.fillStyle = hair;
  ctx.fillRect(px - 5, py - 29, 10, 4);
  if (facing !== "up") {
    ctx.fillStyle = "#20222A";
    ctx.fillRect(px - 2, py - 23, 1.5, 1.5);
    ctx.fillRect(px + 1, py - 23, 1.5, 1.5);
  }
  ctx.restore();
}

function drawNameTag(ctx, x, y, text, color) {
  ctx.font = "7px monospace";
  ctx.textAlign = "center";
  const w = ctx.measureText(text).width + 6;
  ctx.fillStyle = "rgba(8,10,16,0.78)";
  ctx.fillRect(x - w / 2, y - 8, w, 9);
  ctx.fillStyle = color || "#F4F5F9";
  ctx.fillText(text, x, y - 1);
}

function buildMinimapCanvas(grid) {
  const canvas = document.createElement("canvas");
  canvas.width = COLS; canvas.height = ROWS;
  const ctx = canvas.getContext("2d");
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ctx.fillStyle = TILE_COLOR[grid[r][c]] || "#3f7a3f";
      ctx.fillRect(c, r, 1, 1);
    }
  }
  return canvas;
}

/* --------------------------------- WORLD SCREEN --------------------------------- */

const MAX_MSGS = 100;

function WorldScreen({ character, onExit }) {
  const canvasRef = useRef(null);
  const minimapRef = useRef(null);
  const worldRef = useRef(null);
  if (!worldRef.current) worldRef.current = buildWorld();
  const minimapImgRef = useRef(null);
  if (!minimapImgRef.current) minimapImgRef.current = buildMinimapCanvas(worldRef.current);

  const keysRef = useRef({ up: false, down: false, left: false, right: false });
  const playerRef = useRef({ x: SPAWN.x, y: SPAWN.y, facing: "down", moving: false });
  const remotePlayersRef = useRef(new Map());
  const nearbyRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatEndRef = useRef(null);
  const socketRef = useRef(null);
  const lastSentRef = useRef({ x: 0, y: 0, t: 0 });

  const [nearby, setNearby] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatText, setChatText] = useState("");
  const [online, setOnline] = useState(1);
  const [ping, setPing] = useState(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);

  const ClassIcon = character.classLabel === "Pendekar" ? Sword : Wand2;

  /* ---- socket connection ---- */
  useEffect(() => {
    const socket = io(window.location.origin, {
      path: "/api/socket",
      reconnectionAttempts: 5,
      timeout: 4000,
    });
    socketRef.current = socket;
    const connectTimer = setTimeout(() => setConnecting(false), 4500);

    socket.on("connect", () => {
      setConnected(true);
      setConnecting(false);
      socket.emit("join", { ...character, x: playerRef.current.x, y: playerRef.current.y });
    });

    socket.on("init", (data) => {
      remotePlayersRef.current.clear();
      Object.values(data.players || {}).forEach((p) => {
        if (p.id === socket.id) return;
        remotePlayersRef.current.set(p.id, { ...p, targetX: p.x, targetY: p.y });
      });
      setOnline(remotePlayersRef.current.size + 1);
    });

    socket.on("player-joined", (p) => {
      if (p.id === socket.id) return;
      remotePlayersRef.current.set(p.id, { ...p, targetX: p.x, targetY: p.y });
      setOnline(remotePlayersRef.current.size + 1);
    });

    socket.on("player-moved", (d) => {
      const rp = remotePlayersRef.current.get(d.id);
      if (rp) { rp.targetX = d.x; rp.targetY = d.y; rp.facing = d.facing; rp.moving = d.moving; }
    });

    socket.on("player-left", (d) => {
      remotePlayersRef.current.delete(d.id);
      setOnline(remotePlayersRef.current.size + 1);
    });

    socket.on("chat-message", (msg) => {
      setMessages((prev) => [...prev.slice(-(MAX_MSGS - 1)), msg]);
    });

    socket.on("pong-check", (t) => setPing(Date.now() - t));
    socket.on("connect_error", () => { setConnected(false); setConnecting(false); });
    socket.on("disconnect", () => setConnected(false));

    const pingTimer = setInterval(() => {
      if (socket.connected) socket.emit("ping-check", Date.now());
    }, 3000);

    return () => {
      clearTimeout(connectTimer);
      clearInterval(pingTimer);
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- chat autoscroll ---- */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const isTyping = () => document.activeElement === chatInputRef.current;

  /* ---- keyboard controls ---- */
  useEffect(() => {
    const map = { w: "up", ArrowUp: "up", s: "down", ArrowDown: "down", a: "left", ArrowLeft: "left", d: "right", ArrowRight: "right" };
    const down = (e) => {
      if (isTyping()) return;
      const k = map[e.key];
      if (k) { keysRef.current[k] = true; e.preventDefault(); }
      if (e.key.toLowerCase() === "e") {
        setDialog((prev) => (prev ? null : nearbyRef.current));
      }
      if (e.key === "Escape") setDialog(null);
    };
    const up = (e) => {
      const k = map[e.key];
      if (k) keysRef.current[k] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  /* ---- game loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const mmCanvas = minimapRef.current;
    const mmCtx = mmCanvas.getContext("2d");
    mmCtx.imageSmoothingEnabled = false;

    const grid = worldRef.current;
    const worldW = COLS * TILE, worldH = ROWS * TILE;
    const viewW = VIEW_COLS * TILE, viewH = VIEW_ROWS * TILE;
    const SPEED = 92;
    let last = performance.now();
    let raf;

    const collides = (x, y) => {
      const pts = [[x - 5, y - 3], [x + 5, y - 3], [x - 5, y + 3], [x + 5, y + 3]];
      for (const [px, py] of pts) {
        const c = Math.floor(px / TILE), r = Math.floor(py / TILE);
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) return true;
        if (BLOCKING.has(grid[r][c])) return true;
      }
      return false;
    };

    const loop = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const k = keysRef.current;
      let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
      const p = playerRef.current;
      p.moving = dx !== 0 || dy !== 0;
      if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
      if (dx !== 0) p.facing = dx > 0 ? "right" : "left";
      else if (dy !== 0) p.facing = dy > 0 ? "down" : "up";

      const nx = p.x + dx * SPEED * dt;
      if (!collides(nx, p.y)) p.x = nx;
      const ny = p.y + dy * SPEED * dt;
      if (!collides(p.x, ny)) p.y = ny;
      p.x = Math.max(6, Math.min(worldW - 6, p.x));
      p.y = Math.max(6, Math.min(worldH - 6, p.y));

      const sock = socketRef.current;
      if (sock && sock.connected) {
        const ls = lastSentRef.current;
        if (now - ls.t > 60 && (Math.abs(p.x - ls.x) > 0.5 || Math.abs(p.y - ls.y) > 0.5 || p.moving)) {
          sock.emit("move", { x: p.x, y: p.y, facing: p.facing, moving: p.moving });
          lastSentRef.current = { x: p.x, y: p.y, t: now };
        }
      }

      remotePlayersRef.current.forEach((rp) => {
        rp.x += (rp.targetX - rp.x) * 0.25;
        rp.y += (rp.targetY - rp.y) * 0.25;
      });

      let camX = p.x - viewW / 2, camY = p.y - viewH / 2;
      camX = Math.max(0, Math.min(worldW - viewW, camX));
      camY = Math.max(0, Math.min(worldH - viewH, camY));

      ctx.clearRect(0, 0, viewW, viewH);
      const c0 = Math.floor(camX / TILE), c1 = Math.ceil((camX + viewW) / TILE);
      const r0 = Math.floor(camY / TILE), r1 = Math.ceil((camY + viewH) / TILE);

      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        drawTileBase(ctx, grid[r][c], c * TILE - camX, r * TILE - camY, r, c, now);
      }
      for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
        if (r < 0 || c < 0 || r >= ROWS || c >= COLS) continue;
        const type = grid[r][c];
        if (type === "tree" || type === "house" || type === "sign") drawFeature(ctx, type, c * TILE - camX, r * TILE - camY);
      }

      let closest = null, closestD = 26;
      NPCS.forEach((n) => {
        const wx = n.c * TILE + 8, wy = n.r * TILE + 8;
        const sx = wx - camX, sy = wy - camY;
        if (sx > -20 && sx < viewW + 20 && sy > -20 && sy < viewH + 20) {
          const bob = Math.sin(now / 300 + n.r) > 0;
          drawPerson(ctx, sx, sy + 8, n.skin, n.hair, n.outfit, "down", bob, false);
          drawNameTag(ctx, sx, sy - 20, n.name, "#F4C542");
        }
        const d = Math.hypot(p.x - wx, p.y - wy);
        if (d < closestD) { closestD = d; closest = { type: "npc", name: n.name, dialog: n.dialog }; }
      });
      SIGNS.forEach((s) => {
        const wx = s.c * TILE + 8, wy = s.r * TILE + 8;
        const d = Math.hypot(p.x - wx, p.y - wy);
        if (d < closestD) { closestD = d; closest = { type: "sign", name: "Papan Pengumuman", dialog: s.text }; }
      });
      nearbyRef.current = closest;
      setNearby((prev) => {
        if (!prev && !closest) return prev;
        if (prev && closest && prev.name === closest.name) return prev;
        return closest;
      });

      remotePlayersRef.current.forEach((rp) => {
        const sx = rp.x - camX, sy = rp.y - camY;
        if (sx > -20 && sx < viewW + 20 && sy > -20 && sy < viewH + 20) {
          const bob = rp.moving && Math.floor(now / 150) % 2 === 0;
          drawPerson(ctx, sx, sy + 8, rp.skin, rp.hair, rp.outfit, rp.facing, bob, rp.facing === "left");
          drawNameTag(ctx, sx, sy - 20, rp.name, rp.classAccent);
        }
      });

      const bobWalk = p.moving && Math.floor(now / 150) % 2 === 0;
      drawPerson(ctx, p.x - camX, p.y - camY + 8, character.skin, character.hair, character.outfit, p.facing, bobWalk, p.facing === "left");
      drawNameTag(ctx, p.x - camX, p.y - camY - 20, character.name, character.classAccent);

      mmCtx.clearRect(0, 0, COLS, ROWS);
      mmCtx.drawImage(minimapImgRef.current, 0, 0);
      remotePlayersRef.current.forEach((rp) => {
        mmCtx.fillStyle = "#C7CBD8";
        mmCtx.fillRect(rp.x / TILE - 0.5, rp.y / TILE - 0.5, 1.4, 1.4);
      });
      mmCtx.fillStyle = character.classAccent;
      mmCtx.fillRect(p.x / TILE - 0.75, p.y / TILE - 0.75, 1.8, 1.8);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character]);

  const setKey = (dir, val) => (e) => { e.preventDefault(); keysRef.current[dir] = val; };

  const sendChat = () => {
    const text = chatText.trim();
    if (!text || !socketRef.current) return;
    socketRef.current.emit("chat", { text });
    setChatText("");
  };

  const fmtTime = (ts) => {
    const d = new Date(ts);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0D12", color: "#F4F5F9", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
        .heading { font-family: 'Space Grotesk', sans-serif; }
        canvas { image-rendering: pixelated; image-rendering: crisp-edges; }
        .dpad-btn { user-select: none; -webkit-user-select: none; touch-action: none; }
        input::placeholder { color: #5B6072; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #262A38; border-radius: 3px; }
      `}</style>

      <div className="max-w-5xl mx-auto px-3 md:px-6 py-4 md:py-6">
        <div className="flex items-center justify-between mb-2">
          <button onClick={onExit} style={{ border: "1px solid #262A38", color: "#8B90A3" }} className="text-xs px-3 py-1.5 rounded-full">
            Ubah Karakter
          </button>
          <p className="text-xs" style={{ color: connected ? "#43B58A" : connecting ? "#D9A441" : "#FF6B4A" }}>
            {connected ? "● Online" : connecting ? "Menghubungkan..." : "○ Mode Offline"}
          </p>
        </div>

        <div
          className="relative rounded-2xl overflow-hidden mx-auto"
          style={{ border: "1px solid #21242F", background: "#000", maxWidth: VIEW_COLS * TILE * 2 }}
        >
          <canvas ref={canvasRef} width={VIEW_COLS * TILE} height={VIEW_ROWS * TILE} style={{ width: "100%", height: "auto", display: "block" }} />

          {/* HUD top-left: name / level / HP / EXP */}
          <div className="absolute rounded-xl px-3 py-2" style={{ top: 8, left: 8, background: "#0B0D12cc", border: "1px solid #262A38", minWidth: 132 }}>
            <div className="flex items-center gap-1.5 mb-1">
              <ClassIcon size={11} color={character.classAccent} />
              <p className="text-xs font-semibold" style={{ color: "#F4F5F9" }}>{character.name}</p>
              <span className="text-[10px] ml-auto" style={{ color: "#8B90A3" }}>Lv.1</span>
            </div>
            <div className="flex items-center gap-1 mb-1">
              <Heart size={9} color="#FF6B4A" />
              <div style={{ flex: 1, height: 5, background: "#1B2036", borderRadius: 999 }}>
                <div style={{ width: "100%", height: 5, background: "#FF6B4A", borderRadius: 999 }} />
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star size={9} color="#F4C542" />
              <div style={{ flex: 1, height: 5, background: "#1B2036", borderRadius: 999 }}>
                <div style={{ width: "8%", height: 5, background: "#F4C542", borderRadius: 999 }} />
              </div>
            </div>
          </div>

          {/* HUD top-right: online + ping + minimap */}
          <div className="absolute flex flex-col items-end gap-1.5" style={{ top: 8, right: 8 }}>
            <div className="rounded-xl px-2.5 py-1.5 flex items-center gap-3" style={{ background: "#0B0D12cc", border: "1px solid #262A38" }}>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#8B90A3" }}><Users size={10} />{online}</span>
              <span className="flex items-center gap-1 text-[10px]" style={{ color: "#8B90A3" }}>
                {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {ping !== null ? `${ping}ms` : "--"}
              </span>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ border: "1px solid #262A38", width: 108, height: 72 }}>
              <canvas ref={minimapRef} width={COLS} height={ROWS} style={{ width: "100%", height: "100%", display: "block" }} />
            </div>
          </div>

          {/* nearby interact hint */}
          {nearby && !dialog && (
            <div className="absolute left-1/2 -translate-x-1/2 rounded-lg px-2.5 py-1 text-[10px]" style={{ bottom: 10, background: "#0B0D12cc", border: "1px solid #262A38", color: "#C7CBD8" }}>
              Dekat <span style={{ color: character.classAccent }}>{nearby.name}</span> — tekan <b>E</b>
            </div>
          )}

          {/* RPG dialog box */}
          {dialog && (
            <div className="absolute left-3 right-3 md:left-8 md:right-8 rounded-xl px-4 py-3" style={{ bottom: 10, background: "#12141Cf2", border: `1px solid ${character.classAccent}` }}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold" style={{ color: character.classAccent }}>{dialog.name}</p>
                <button onClick={() => setDialog(null)}><X size={13} color="#8B90A3" /></button>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#E4E6EC" }}>&ldquo;{dialog.dialog}&rdquo;</p>
              <p className="text-[10px] mt-1.5" style={{ color: "#5B6072" }}>tekan E atau Esc untuk menutup</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-2" style={{ color: "#5B6072" }}>WASD / Panah untuk bergerak &middot; E untuk berinteraksi</p>

        {/* touch dpad */}
        <div className="flex justify-center mt-3 md:hidden">
          <div style={{ width: 132, height: 132, position: "relative" }}>
            {[
              { dir: "up", icon: ArrowUp, style: { top: 0, left: 46 } },
              { dir: "down", icon: ArrowDown, style: { bottom: 0, left: 46 } },
              { dir: "left", icon: ArrowLeft, style: { top: 46, left: 0 } },
              { dir: "right", icon: ArrowRight, style: { top: 46, right: 0 } },
            ].map(({ dir, icon: I, style }) => (
              <button key={dir} className="dpad-btn absolute rounded-xl flex items-center justify-center"
                style={{ width: 40, height: 40, background: "#161922", border: "1px solid #262A38", ...style }}
                onPointerDown={setKey(dir, true)} onPointerUp={setKey(dir, false)} onPointerLeave={setKey(dir, false)} onPointerCancel={setKey(dir, false)}>
                <I size={18} color="#8B90A3" />
              </button>
            ))}
          </div>
        </div>

        {/* hotbar */}
        <div className="flex justify-center gap-1.5 mt-4 flex-wrap px-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="rounded-lg flex items-center justify-center text-[10px]" style={{ width: 34, height: 34, background: "#12141C", border: "1px solid #262A38", color: "#3D4152" }}>
              {i + 1}
            </div>
          ))}
        </div>

        {/* chat panel bottom-right */}
        <div className="fixed bottom-4 right-4 rounded-2xl overflow-hidden flex flex-col" style={{ width: 280, maxWidth: "calc(100vw - 32px)", height: 220, background: "#12141Cf5", border: "1px solid #21242F", backdropFilter: "blur(6px)" }}>
          <div className="px-3 py-2" style={{ borderBottom: "1px solid #21242F" }}>
            <p className="text-xs font-semibold" style={{ color: "#F4F5F9" }}>Chat Global</p>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1">
            {messages.length === 0 && <p className="text-[11px]" style={{ color: "#5B6072" }}>Belum ada pesan.</p>}
            {messages.map((m, i) => (
              <p key={i} className="text-[11px] leading-snug" style={{ color: "#C7CBD8" }}>
                <span style={{ color: "#5B6072" }}>{fmtTime(m.ts)}</span>{" "}
                <span style={{ color: m.id === socketRef.current?.id ? character.classAccent : "#8FD3C0", fontWeight: 600 }}>{m.name}:</span>{" "}
                {m.text}
              </p>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-1.5 px-2 py-2" style={{ borderTop: "1px solid #21242F" }}>
            <input
              ref={chatInputRef}
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") sendChat(); }}
              placeholder="Ketik pesan..."
              maxLength={200}
              style={{ background: "#0D0F16", border: "1px solid #262A38", color: "#F4F5F9" }}
              className="flex-1 px-2.5 py-1.5 rounded-lg text-xs outline-none"
            />
            <button onClick={sendChat} style={{ background: character.classAccent, color: "#0B0D12" }} className="px-3 py-1.5 rounded-lg text-xs font-semibold">
              Kirim
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ CHARACTER PREVIEW SVG ------------------------------ */

function CharacterPreview({ gender, hairHex, outfit, skinHex, classId }) {
  const cls = CLASSES.find((c) => c.id === classId);
  const isFemale = gender === "P";
  return (
    <svg viewBox="0 0 220 300" width="100%" height="100%" role="img" aria-label="Preview karakter">
      <ellipse cx="110" cy="292" rx="66" ry="9" fill="#000" opacity="0.35" style={{ filter: "blur(4px)" }} />
      {cls.id === "pendekar" ? (
        <g>
          <rect x="188" y="128" width="8" height="98" rx="2" fill="#C7CCD6" />
          <rect x="178" y="222" width="28" height="8" rx="2" fill="#C9A24B" />
          <rect x="184" y="228" width="16" height="32" rx="3" fill="#7A5A34" />
          <circle cx="192" cy="262" r="7" fill="#C9A24B" />
        </g>
      ) : (
        <g>
          <circle cx="193" cy="122" r="20" fill={cls.accent} opacity="0.35" style={{ filter: "blur(6px)" }} />
          <rect x="190" y="128" width="6" height="150" rx="3" fill="#4A3626" />
          <circle cx="193" cy="122" r="13" fill={cls.accent} />
        </g>
      )}
      {outfit.id === "tunik" && (
        <g>
          <path d="M62,150 C62,138 90,130 110,130 C130,130 158,138 158,150 L172,300 L48,300 Z" fill={outfit.color} />
          <rect x="85" y="205" width="50" height="10" rx="4" fill={outfit.dark} />
        </g>
      )}
      {outfit.id === "jubah" && (
        <g>
          <path d="M55,148 C55,134 88,124 110,124 C132,124 165,134 165,148 L200,300 L20,300 Z" fill={outfit.color} />
          <path d="M85,150 L75,288" stroke={outfit.dark} strokeWidth="2" opacity="0.5" />
          <path d="M135,150 L145,288" stroke={outfit.dark} strokeWidth="2" opacity="0.5" />
          <path d="M96,132 L110,158 L124,132 Z" fill={skinHex} />
        </g>
      )}
      {outfit.id === "zirah" && (
        <g>
          <path d="M65,150 L155,150 L168,300 L52,300 Z" fill={outfit.color} />
          <ellipse cx="65" cy="148" rx="18" ry="12" fill={outfit.dark} />
          <ellipse cx="155" cy="148" rx="18" ry="12" fill={outfit.dark} />
          <rect x="104" y="155" width="12" height="110" rx="3" fill={outfit.dark} opacity="0.7" />
          <rect x="80" y="228" width="60" height="12" rx="4" fill={outfit.dark} />
        </g>
      )}
      <rect x="98" y="120" width="24" height="22" rx="6" fill={skinHex} />
      <circle cx="110" cy="92" r="40" fill={skinHex} />
      {isFemale && (
        <g>
          <path d="M70,75 C58,102 53,142 59,186 C62,201 72,206 79,200 C74,160 74,110 78,80 Z" fill={hairHex} />
          <path d="M150,75 C162,102 167,142 161,186 C158,201 148,206 141,200 C146,160 146,110 142,80 Z" fill={hairHex} />
        </g>
      )}
      <path d="M70,72 C70,45 90,27 110,27 C130,27 150,45 150,72 C150,81 146,87 146,87 C146,87 140,59 110,59 C80,59 74,87 74,87 C74,87 70,81 70,72 Z" fill={hairHex} />
    </svg>
  );
}

/* --------------------------------- CREATE SCREEN --------------------------------- */

function CreateScreen({ onStart }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(false);
  const [gender, setGender] = useState("L");
  const [classId, setClassId] = useState("pendekar");
  const [hairId, setHairId] = useState(HAIR_COLORS[0].id);
  const [skinId, setSkinId] = useState(SKIN_TONES[0].id);
  const [outfitId, setOutfitId] = useState(OUTFITS[0].id);

  const cls = CLASSES.find((c) => c.id === classId);
  const hair = HAIR_COLORS.find((h) => h.id === hairId);
  const skin = SKIN_TONES.find((s) => s.id === skinId);
  const outfit = OUTFITS.find((o) => o.id === outfitId);

  const handleStart = () => {
    if (!name.trim()) { setError(true); return; }
    onStart({ name: name.trim(), classLabel: cls.label, classAccent: cls.accent, skin: skin.hex, hair: hair.hex, outfit: outfit.color });
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B0D12", color: "#F4F5F9", fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        .heading { font-family: 'Space Grotesk', sans-serif; }
        input::placeholder { color: #5B6072; }
        .swatch { transition: transform 0.15s ease; }
        .swatch:hover { transform: translateY(-2px); }
      `}</style>
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="mb-10">
          <p className="uppercase text-xs mb-2" style={{ color: cls.accent, letterSpacing: "0.3em", fontWeight: 600 }}>Character Creator</p>
          <h1 className="heading text-3xl md:text-5xl" style={{ fontWeight: 700 }}>Buat Karaktermu</h1>
        </div>

        <div className="grid md:grid-cols-[minmax(280px,380px)_1fr] gap-8">
          <div className="md:sticky md:top-8 self-start rounded-3xl p-6 flex flex-col items-center" style={{ background: "#12141C", border: "1px solid #21242F", height: "fit-content" }}>
            <div className="relative w-full flex items-center justify-center mb-5" style={{ height: 300 }}>
              <div className="absolute rounded-full" style={{ width: 220, height: 60, bottom: 6, background: `radial-gradient(ellipse, ${cls.accent}33 0%, transparent 70%)`, filter: "blur(6px)" }} />
              <div style={{ width: 200, height: 280 }}>
                <CharacterPreview gender={gender} hairHex={hair.hex} outfit={outfit} skinHex={skin.hex} classId={classId} />
              </div>
            </div>
            <p className="heading text-lg" style={{ fontWeight: 600 }}>{name.trim() || "Nama Karakter"}</p>
            <p className="text-xs mt-1" style={{ color: cls.accent }}>{cls.label}</p>
            <div className="flex gap-2 mt-5 w-full">
              {CLASSES.map((c) => {
                const CIcon = c.icon;
                const active = c.id === classId;
                return (
                  <button key={c.id} onClick={() => setClassId(c.id)}
                    style={{ flex: 1, border: `1px solid ${active ? c.accent : "#262A38"}`, background: active ? `${c.accent}22` : "transparent", color: active ? c.accent : "#8B90A3" }}
                    className="flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium">
                    <CIcon size={15} />{c.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl p-6 md:p-8" style={{ background: "#12141C", border: "1px solid #21242F" }}>
            <section className="mb-8">
              <p className="text-xs uppercase mb-2" style={{ color: "#5B6072", letterSpacing: "0.12em" }}>01 &middot; Nama Karakter</p>
              <input type="text" value={name} onChange={(e) => { setName(e.target.value); if (error) setError(false); }} maxLength={20}
                placeholder="Tulis nama karaktermu..." style={{ background: "#0D0F16", border: `1px solid ${error ? "#FF6B4A" : "#262A38"}`, color: "#F4F5F9" }}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none" />
              {error && <p className="text-xs mt-2" style={{ color: "#FF6B4A" }}>Karaktermu butuh nama sebelum memulai.</p>}
            </section>

            <section className="mb-8">
              <p className="text-xs uppercase mb-3" style={{ color: "#5B6072", letterSpacing: "0.12em" }}>02 &middot; Jenis Karakter</p>
              <div className="flex gap-3">
                {[{ id: "L", label: "Laki-laki" }, { id: "P", label: "Perempuan" }].map((g) => {
                  const active = gender === g.id;
                  return (
                    <button key={g.id} onClick={() => setGender(g.id)}
                      style={{ border: `1px solid ${active ? cls.accent : "#262A38"}`, background: active ? `${cls.accent}1F` : "transparent", color: active ? cls.accent : "#8B90A3" }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium">
                      <User size={15} />{g.label}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mb-8">
              <p className="text-xs uppercase mb-3" style={{ color: "#5B6072", letterSpacing: "0.12em" }}>03 &middot; Warna Rambut</p>
              <div className="flex gap-3 flex-wrap">
                {HAIR_COLORS.map((h) => {
                  const active = h.id === hairId;
                  return <button key={h.id} onClick={() => setHairId(h.id)} aria-label={h.label} title={h.label} className="swatch rounded-full"
                    style={{ width: 34, height: 34, background: h.hex, border: active ? `2px solid ${cls.accent}` : "2px solid transparent", boxShadow: active ? `0 0 0 2px #12141C, 0 0 0 4px ${cls.accent}` : "0 0 0 1px #262A38" }} />;
                })}
              </div>
            </section>

            <section className="mb-8">
              <p className="text-xs uppercase mb-3" style={{ color: "#5B6072", letterSpacing: "0.12em" }}>04 &middot; Pakaian</p>
              <div className="grid grid-cols-3 gap-3">
                {OUTFITS.map((o) => {
                  const active = o.id === outfitId;
                  return (
                    <button key={o.id} onClick={() => setOutfitId(o.id)}
                      style={{ border: `1px solid ${active ? cls.accent : "#262A38"}`, background: active ? `${cls.accent}14` : "#0D0F16" }}
                      className="rounded-xl p-3 flex flex-col items-center gap-2">
                      <div style={{ width: 32, height: 32, borderRadius: 10, background: o.color }} />
                      <span className="text-xs" style={{ color: active ? cls.accent : "#8B90A3" }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mb-9">
              <p className="text-xs uppercase mb-3" style={{ color: "#5B6072", letterSpacing: "0.12em" }}>05 &middot; Warna Kulit</p>
              <div className="flex gap-3 flex-wrap">
                {SKIN_TONES.map((s) => {
                  const active = s.id === skinId;
                  return <button key={s.id} onClick={() => setSkinId(s.id)} aria-label={s.id} className="swatch rounded-full"
                    style={{ width: 34, height: 34, background: s.hex, border: active ? `2px solid ${cls.accent}` : "2px solid transparent", boxShadow: active ? `0 0 0 2px #12141C, 0 0 0 4px ${cls.accent}` : "0 0 0 1px #262A38" }} />;
                })}
              </div>
            </section>

            <button onClick={handleStart} style={{ background: `linear-gradient(135deg, ${cls.accent}, ${cls.accent}CC)`, color: "#0B0D12" }}
              className="w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
              <Sparkles size={16} />Mulai Petualangan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------- APP ------------------------------------- */

export default function App() {
  const [screen, setScreen] = useState("create");
  const [character, setCharacter] = useState(null);

  useEffect(() => {
    const saved = safeLoad();
    if (saved) { setCharacter(saved); setScreen("world"); }
  }, []);

  if (screen === "world" && character) {
    return (
      <WorldScreen
        character={character}
        onExit={() => { safeClear(); setCharacter(null); setScreen("create"); }}
      />
    );
  }
  return (
    <CreateScreen
      onStart={(c) => { safeSave(c); setCharacter(c); setScreen("world"); }}
    />
  );
}
