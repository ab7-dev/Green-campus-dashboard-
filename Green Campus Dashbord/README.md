# 🌿 Green Campus IoT Dashboard

A real-time 3D IoT monitoring dashboard for a university campus, built with Three.js and Chart.js. Monitor water tanks, electricity meters, and waste collection systems across all campus blocks — live, in an interactive 3D environment.

---

## 🚀 Features

- **Interactive 3D Campus Map** — Realistic architectural scene with buildings, trees, lamp posts, underground tanks, and a day/night lighting toggle
- **Live IoT Simulation** — Water levels, waste fill rates, and electricity readings update every 500 ms with realistic noise, burst events, and refill cycles
- **4 Campus Blocks** — Block A (Engineering), B (Science), C (Admin), D (Hostel), each with unique capacities and usage profiles
- **Full Analytics Dashboard** — Per-block and master-view charts (live stream, daily, weekly, monthly) plus predictive analysis (time-to-empty, time-to-full, daily estimates)
- **Light / Dark Theme** — Toggle between a clean architectural day mode and a dark cyberpunk night mode
- **Responsive Controls** — Orbit (drag), zoom (scroll), tilt-down to reveal underground waste tanks, camera reset

---

## 📁 Project Structure

```
green_campus_dashboard/
├── index.html      # Main HTML shell — layout, buttons, dashboard overlay
├── styles.css      # All CSS — dark/light themes, cards, dashboard, animations
├── scene.js        # Three.js 3D scene — buildings, campus, lights, camera, orbit
└── app.js          # App logic — IoT simulation, sensor data, charts, UI updates
```

---

## 🛠️ Tech Stack

| Library | Version | Purpose |
|---|---|---|
| [Three.js](https://threejs.org/) | r128 | 3D campus scene rendering |
| [Chart.js](https://www.chartjs.org/) | 3.9.1 | Analytics charts and live graphs |
| Google Fonts | — | Orbitron, Share Tech Mono, Rajdhani |

No build tools or npm required — pure HTML/CSS/JS.

---

## ▶️ Getting Started

1. Clone or download this repository
2. Open `index.html` in any modern browser
3. No server required — runs fully offline

```bash
git clone https://github.com/your-username/green-campus-dashboard.git
cd green-campus-dashboard
open index.html   # or just double-click it
```

---

## 🖱️ Controls

| Action | Result |
|---|---|
| **Drag** | Rotate camera around campus |
| **Scroll** | Zoom in / out |
| **Drag downward** | Tilt camera to reveal underground waste tanks |
| **Block buttons** | Switch active block |
| **DASHBOARD button** | Open analytics overlay |
| **LIGHTS ON/OFF** | Toggle campus lamp posts |
| **DARK MODE / LIGHT** | Toggle theme |
| **RESET VIEW** | Return camera to default position |

---

## 📊 Dashboard Views

- **Block View** — Water level %, waste fill %, electricity KPIs + Chart.js graph (live / daily / weekly / monthly)
- **Analysis View** — Predictive time-to-empty, time-to-full, daily water & electricity estimates with progress bars
- **Master View** — All 4 blocks compared side-by-side on a single chart

---

## 📡 Simulated Sensors

Each block simulates:
- **Water Tank** — Level %, volume (L), head pressure (bar), TDS purity %, auto-refill at 10%
- **Waste Tank** — Fill %, volume (L), fill rate (L/hr), auto-collection at 90%
- **Electricity** — HT supply (11 kV), LT voltage (415 V), current (A), active power (kW), frequency (Hz), power factor, voltage fluctuation waveform

---

## 🌱 About

Built as a demonstration of a university green campus IoT monitoring system. All sensor data is simulated — no real hardware required.
