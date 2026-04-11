# 🚀 CricfyTV Web Premium v3.0

A high-fidelity, cinematic web interface for live TV streaming, meticulously crafted for a premium user experience and seamless cross-platform performance.

<div align="center">
  <img src="https://img.shields.io/badge/Version-3.0.0-blueviolet?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/UI-Cinematic_Glass-blue?style=for-the-badge" alt="UI Theme">
  <img src="https://img.shields.io/badge/Stack-Vite_%2B_React_%2B_Express-green?style=for-the-badge" alt="Tech Stack">
  <img src="https://img.shields.io/badge/Platform-Windows_%2B_Web-orange?style=for-the-badge" alt="Platform">
</div>

---

## ✨ Premium Features

### 🌌 Aurora Atmosphere
Experience a living interface with our **Aurora Animated Background**. Shifting radial gradients create deep, atmospheric depth that moves behind your content, creating a truly immersive "lean-back" experience.

### 💎 Cinematic Glass Design
Every component is built using our custom **Glassmorphism 2.0** engine:
- **Specular Highlights**: Razor-sharp inner shadows and borders that catch the light.
- **Dynamic Glow**: Components emit a subtle radial aura that reacts to your interactions.
- **Multi-Layer Blurs**: Refined backdrop filters that maintain readability while looking elegant.

### 🍱 Intelligent Navigation
- **Horizontal Genre Ribbon**: A high-contrast, smooth-scrolling bar to filter channels instantly.
- **Logo-First Experience**: High-quality channel iconography with magnetic 3D tilt effects on hover.
- **Ambilight Video Player**: A custom-engineered video environment where the UI glow dynamically reflects the colors of the live stream.

---

## 📥 Get CricfyTV for Windows

You can now download the standalone desktop version of CricfyTV for the best experience:

1. Go to the [**GitHub Releases**](https://github.com/utkarshgupta188/cricfy-web/releases) page.
2. Download the `CricfyTV-Setup-3.0.0.exe` installer.
3. Install and enjoy live TV with zero browser clutter.

---

## 🛠 Local Development

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [npm](https://www.npmjs.com/)

### 2. Installation
```bash
git clone https://github.com/utkarshgupta188/cricfy-web.git
cd cricfy-web
npm install
```

### 3. Launching the App
Run both the frontend and the proxy backend simultaneously:
```bash
npm run dev:all
```
- **Web App**: [http://localhost:5173](http://localhost:5173)
- **Proxy Server**: [http://localhost:3001](http://localhost:3001)

### 4. Building the Desktop App
```bash
npm run electron:build
```
The packaged installers will be generated in the `release/` directory.

---

## 🏛 Technical Architecture

- **Frontend Core**: Vite + React 19 for lightning-fast state management and rendering.
- **Resilient Proxy**: Node.js Express backend that handles stream segments, DRM headers, and multi-domain fallback mechanisms.
- **Player Engine**: Shaka Player integrated with custom UI and clear-key support.
- **Visuals**: Hardware-accelerated CSS animations and modern custom properties.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <b>Meticulously crafted by <a href="https://github.com/utkarshgupta188">Utkarsh Gupta</a></b><br>
  <i>Bringing the cinema to your desktop.</i>
</div>
