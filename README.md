# UltraPlan-Application
An ultramarathon planning and pacing application that allows runners to input checkpoints, pacing goals, elevation data, terrain type, and nutrition strategies to create a comprehensive race plan.


# UltraPlan - Open Source Ultramarathon Race Planner

<p align="center">
  <img src="assets/icon-256.png" alt="UltraPlan Logo" width="128" height="128">
</p>

<p align="center">
  <strong>A powerful desktop application for planning ultramarathon and endurance races</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#building-from-source">Build</a> •
  <a href="#contributing">Contributing</a> •
  <a href="#license">License</a>
</p>

---

## Overview

UltraPlan is a cross-platform desktop application built with Electron and React that helps ultramarathon runners plan their races. It provides comprehensive tools for route analysis, pacing strategy, nutrition planning, and checkpoint management - all working offline with your data stored locally.

**Tech Stack:** React 19 • TypeScript • Vite • Electron • Tailwind CSS

---

## Features

- **Route Analysis** - Import GPX files and visualize elevation profiles
- **3D Terrain Visualization** - Explore your race route in 3D with terrain flyovers
- **Grade-Adjusted Pacing** - Calculate realistic pace targets based on terrain
- **Nutrition Planning** - Track calories, hydration, and caffeine intake by segment
- **Checkpoint Management** - Plan crew stops and mandatory kit
- **Weather Integration** - Get forecasts for your race day
- **PDF Export** - Generate printable race plans
- **FIT File Comparison** - Compare against previous race data
- **Dark/Light Themes** - Comfortable viewing in any conditions
- **Metric/Imperial Units** - Choose your preferred measurement system
- **Offline-First** - All data stored locally, no internet required

---

## Installation

### Download Pre-built Installers

Download the latest release for your platform from the [Releases](../../releases) page:

| Platform | Download |
|----------|----------|
| macOS (Intel/Apple Silicon) | `UltraPlan-x.x.x.dmg` |
| Windows (Installer) | `UltraPlan Setup x.x.x.exe` |
| Windows (Portable) | `UltraPlan x.x.x.exe` |
| Linux | See [Building for Linux](#building-for-linux) |

### macOS Installation

1. Download the `.dmg` file
2. Open the disk image
3. Drag UltraPlan to your Applications folder
4. On first launch, right-click and select "Open" to bypass Gatekeeper

### Windows Installation

1. Download the installer (`.exe`)
2. Run the installer and follow the prompts
3. Choose installation directory if desired
4. Launch from Start Menu or Desktop shortcut

---

## Building from Source

### Prerequisites

- **Node.js** 18.x or later
- **npm** 9.x or later
- **Git**

### Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/UltraPlan.git
cd UltraPlan
```

### Install Dependencies

```bash
npm install
```

### Development Mode

Run the app in development mode with hot reloading:

```bash
npm run electron:dev
```

This starts:
- Vite dev server on `http://localhost:5173`
- Electron app connected to the dev server
- DevTools automatically opened

### Preview Production Build

Test the production build without creating installers:

```bash
npm run electron:preview
```

---

## Creating Installers

### Build for Current Platform

The simplest way to create an installer for your current operating system:

```bash
npm run electron:build
```

Installers will be created in the `release/` directory.

### Building for macOS

**Requirements:** macOS with Xcode Command Line Tools

```bash
# On macOS
npm run electron:build
```

**Output:**
- `release/UltraPlan-x.x.x.dmg` - Disk image installer
- `release/UltraPlan-x.x.x-mac.zip` - ZIP archive

**Code Signing (Optional):**

For distribution outside the Mac App Store, you can sign the app:

1. Obtain an Apple Developer certificate
2. Set environment variables:
   ```bash
   export CSC_NAME="Developer ID Application: Your Name (XXXXXXXXXX)"
   ```
3. Run the build command

### Building for Windows

**Requirements:** Windows with Visual Studio Build Tools, or cross-compile from macOS/Linux

```bash
# On Windows
npm run electron:build
```

**Cross-compiling from macOS/Linux:**

```bash
# Install Wine (required for cross-compilation)
# macOS:
brew install --cask wine-stable

# Linux:
sudo apt install wine64

# Build for Windows
npx electron-builder --win
```

**Output:**
- `release/UltraPlan Setup x.x.x.exe` - NSIS installer
- `release/UltraPlan x.x.x.exe` - Portable executable

### Building for Linux

Linux support requires adding configuration to `package.json`. Add the following to the `build` section:

```json
"linux": {
  "icon": "assets/icon.png",
  "target": ["AppImage", "deb", "rpm"],
  "category": "Utility"
}
```

Then build:

```bash
# On Linux
npm run electron:build

# Cross-compile from macOS (limited support)
npx electron-builder --linux
```

**Output:**
- `release/UltraPlan-x.x.x.AppImage` - Universal Linux package
- `release/ultraplan_x.x.x_amd64.deb` - Debian/Ubuntu package
- `release/ultraplan-x.x.x.x86_64.rpm` - Fedora/RHEL package

### Build All Platforms

To build for all platforms (requires appropriate tools installed):

```bash
# Build for all configured platforms
npx electron-builder -mwl
```

Flags:
- `-m` or `--mac` - Build for macOS
- `-w` or `--win` - Build for Windows
- `-l` or `--linux` - Build for Linux

---

## Project Structure

```
UltraPlan/
├── src/
│   ├── react-app/          # React application
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utility functions
│   │   └── types/          # TypeScript types
│   └── shared/             # Shared utilities
├── electron/               # Electron main process
│   ├── main.ts             # Main process entry
│   └── preload.ts          # Preload script
├── assets/                 # Application icons
├── public/                 # Static assets
├── dist/                   # Built web app
├── dist-electron/          # Built Electron code
└── release/                # Installer output
```

---

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure as needed:

```bash
cp .env.example .env
```

**Note:** The app works fully offline. Environment variables are only needed for optional cloud features.

### Customizing the Build

Edit the `build` section in `package.json`:

```json
{
  "build": {
    "appId": "com.ultraplan.desktop",
    "productName": "UltraPlan",
    "directories": {
      "output": "release"
    },
    "mac": {
      "category": "public.app-category.sports",
      "target": ["dmg", "zip"]
    },
    "win": {
      "target": ["nsis", "portable"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

---

## Contributing

We welcome contributions! Here's how you can help:

### Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your feature or fix
4. **Make changes** and test thoroughly
5. **Submit a Pull Request**

### Development Guidelines

- Follow the existing code style
- Write TypeScript with proper types
- Test your changes in both dev and production builds
- Update documentation if needed
- Keep commits focused and atomic

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](../../issues) with:

- Clear description of the problem or feature
- Steps to reproduce (for bugs)
- Your operating system and app version
- Screenshots if applicable

### Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help others learn and grow

---

## Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (web only) |
| `npm run build` | Build web app for production |
| `npm run electron:dev` | Run Electron app in dev mode |
| `npm run electron:preview` | Preview production build |
| `npm run electron:build` | Build installers for current platform |
| `npm run lint` | Run ESLint |

---

## Troubleshooting

### macOS: "App is damaged and can't be opened"

This happens with unsigned apps. To fix:

```bash
xattr -cr /Applications/UltraPlan.app
```

### Windows: SmartScreen Warning

Click "More info" → "Run anyway" to launch unsigned apps.

### Linux: AppImage Won't Run

Make it executable:

```bash
chmod +x UltraPlan-x.x.x.AppImage
./UltraPlan-x.x.x.AppImage
```

### Build Fails

1. Clear caches: `rm -rf node_modules dist dist-electron release`
2. Reinstall: `npm install`
3. Try building again: `npm run electron:build`

---

## License

This project is licensed under the **MIT License** - see the [LICENSE](#mit-license) section below.

### MIT License

```
MIT License

Copyright (c) 2024 UltraPlan Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Third-Party Licenses

This project uses the following open-source libraries:

| Library | License |
|---------|---------|
| React | MIT |
| Electron | MIT |
| Vite | MIT |
| Tailwind CSS | MIT |
| Leaflet | BSD-2-Clause |
| MapLibre GL | BSD-3-Clause |
| Recharts | MIT |
| jsPDF | MIT |
| Lucide Icons | ISC |

See `package.json` for the complete list of dependencies.

---

## Acknowledgments

- The ultramarathon running community for inspiration
- All contributors who help improve this project
- The open-source projects that make this possible

---

<p align="center">
  Made with determination for the ultra community
</p>
