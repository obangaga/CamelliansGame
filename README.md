# Adventure World — Multiplayer

## Struktur
- `src/App.jsx` — seluruh game: buat karakter, peta pixel-art, HUD, chat, dialog NPC.
- `api/socket.js` — server Socket.io, jalan sebagai Vercel Function (native WebSocket, beta).
- Karakter tersimpan otomatis di `localStorage` browser — refresh tidak akan minta buat ulang karakter.

## Jalankan di lokal
```bash
npm install
npm run dev
```
`npm run dev` menjalankan `vercel dev`, supaya file statis Vite **dan** `api/socket.js` jalan bareng persis seperti di production (dev server Vite biasa tidak bisa menjalankan Vercel Function).

Kalau belum pernah pakai Vercel CLI di mesin ini:
```bash
npm i -g vercel
vercel login
```

## Deploy ke Vercel
```bash
vercel
```
Ikuti prompt (link ke project baru), lalu:
```bash
vercel --prod
```

## Catatan penting soal WebSocket di Vercel
- Vercel baru mendukung WebSocket native (public beta, Juni 2026), termasuk Socket.io — makanya `api/socket.js` bisa langsung `export default server` tanpa server terpisah.
- Koneksi WebSocket "dipin" ke satu instance Function selama durasinya (`maxDuration` di `vercel.json`, sekarang 60 detik). Kalau paket Vercel-mu membatasi durasi function lebih pendek, sesuaikan angka itu.
- **Keterbatasan:** state pemain online disimpan di memory (`Map` di `api/socket.js`). Untuk pemakaian ringan/testing ini cukup. Kalau traffic naik dan pemain mulai tidak saling melihat, itu tandanya request sudah kebagian instance Function yang berbeda — solusinya pindahkan state ke Redis (Upstash, ada di Vercel Marketplace) dengan pub/sub. Kabari saya kalau butuh ini, saya bisa bantu tambahkan.

## Fitur yang sudah ada
- Real-time posisi pemain lain, nama di atas kepala, otomatis hilang saat keluar.
- Chat global panel kanan-bawah (bukan bubble), nama pengirim, timestamp, auto-scroll, Enter untuk kirim.
- 6 NPC — dekati lalu tekan **E** untuk dialog gaya RPG.
- HUD: nama/level/HP/EXP (kiri-atas), jumlah online + ping (kanan-atas), minimap (kanan-atas), hotbar 10 slot kosong (bawah).
- Mode Offline otomatis kalau server belum jalan/tidak terjangkau — tetap bisa main sendiri.
