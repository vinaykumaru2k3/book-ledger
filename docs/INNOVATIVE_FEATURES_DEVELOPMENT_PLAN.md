# 🚀 Development Plan: Innovative Features for Pusthaka Reading Ledger

This document serves as the master implementation blueprint for developing **Feature 2 (3D Interactive Knowledge Galaxy)** and **Feature 4 (Smart Ambient Soundscape Player)**.

---

## 🌌 Feature 2: 3D / 2D Interactive Knowledge Galaxy (Constellation Graph)

### 1. Concept & Objectives
Transform the traditional flat grid/list of books into a dynamic, interactive celestial space where every book in the user's library floats as a glowing particle (star). Books are connected by luminous filaments (constellation lines) based on shared tags, authors, genres, and custom shelves.

### 2. Architecture & Data Flow
- **Data Processor (`src/utils/graph.js`)**:
  - Extracts nodes (`id`, `title`, `author`, `status`, `coverUrl`, `rating`, `val`) from library books.
  - Computes edges (`source`, `target`, `weight`, `relationType`) by analyzing shared tags, authors, and shelf memberships.
- **Rendering Engine (`src/components/ConstellationGraph.jsx`)**:
  - Uses Canvas 2D / WebGL with a physics-based force simulation (charge, repulsion, collision distance, link attraction).
  - Renders interactive elements: glowing stars, pulsing link filaments, floating labels, pan/zoom camera controls, hover tooltips, and click-to-open detail modals.

### 3. Step-by-Step Task Breakdown

- [ ] **Task 2.1: Graph Data Generator (`src/utils/graph.js`)**
  - Implement `buildGraphData(books)` that parses library books into `{ nodes, links }`.
  - Calculate link weights based on relationship strength (e.g., same author = weight 3, same shelf = weight 2, same tag = weight 1).
  - Assign star colors matching status or primary genre palette.

- [ ] **Task 2.2: Force Simulation & Canvas Component (`src/components/ConstellationGraph.jsx`)**
  - Build force-directed spatial calculation loop (velocity, attraction, edge constraints).
  - Support high-DPI canvas rendering, pan (drag background) and zoom (mouse wheel / pinch).
  - Render glowing star halos using radial gradients and animated pulse effects for active/selected books.

- [ ] **Task 2.3: User Interactivity & Inspection**
  - Add hover detection (`isPointInPath` or distance checking) displaying a sleek floating card preview.
  - Add node drag capability (re-positioning stars in space).
  - Add click handler to launch `BookDetailsModal` for inspecting the selected book.

- [ ] **Task 2.4: Integration into App Shell (`src/App.jsx`)**
  - Add a new "Galaxy View" option to the sidebar navigation (`<Sparkles />` / `<Layers />` icon).
  - Render `<ConstellationGraph />` full-screen inside the workspace when selected.

---

## 🎵 Feature 4: Smart Soundscape & Ambient Mood Player

### 1. Concept & Objectives
An embedded procedural Web Audio API player that generates immersive ambient audio environments tailored to the genre or mood of the currently selected book or reading session.

### 2. Audio Engine Architecture
- **Web Audio API Engine (`src/utils/soundscapes.js`)**:
  - Generates zero-dependency audio procedurally without external file dependencies:
    - 🌧️ *Rain Noise*: Filtered pink/white noise with random amplitude droplets.
    - 🔥 *Fireplace Crackle*: Sub-bass rumble + randomized impulse spikes.
    - 🌌 *Cosmic Synth*: Multi-oscillator detuned sine/saw waves passing through a low-pass filter.
    - ☕ *Cafe Ambiance*: Soft bandpass noise + warm electric piano chord loops.
- **State Management & Controller (`src/hooks/useSoundscape.js`)**:
  - Manages playing state (`isPlaying`), master volume (`volume`), active preset (`presetId`), and auto-genre matching.

### 3. Step-by-Step Task Breakdown

- [ ] **Task 4.1: Audio Generator Core (`src/utils/soundscapes.js`)**
  - Initialize `AudioContext` with browser user-interaction resume policy.
  - Implement synthesized audio modules: `createRainNode`, `createFireNode`, `createSpaceSynthNode`, `createCafeNode`.
  - Add crossfade transitions between ambient presets.

- [ ] **Task 4.2: Soundscape React Hook (`src/hooks/useSoundscape.js`)**
  - Provide `play()`, `pause()`, `setPreset(id)`, `setVolume(val)`, and `autoMatchBookGenre(book)`.

- [ ] **Task 4.3: Ambient Player UI Component (`src/components/SoundscapePlayer.jsx`)**
  - Design a compact floating or topbar widget with:
    - Play / Pause toggle with animated frequency bars.
    - Preset selector dropdown (Rainy Study, Cosmic Synth, Fireplace Hearth, Lo-Fi Cafe).
    - Volume slider with mute button.

- [ ] **Task 4.4: App Header Integration (`src/App.jsx`)**
  - Integrate `<SoundscapePlayer />` into the workspace topbar next to theme toggle and search controls.

---

## 📅 Execution Strategy & Next Steps

1. **Phase 1**: Develop Soundscape Web Audio Engine & UI Player Component (`Task 4.1 - 4.4`).
2. **Phase 2**: Develop Graph Data Engine & Canvas Constellation Component (`Task 2.1 - 2.4`).
3. **Phase 3**: End-to-end testing, visual styling, responsive design polish, and deployment.
