# 🌞 SolarTrack Demo - Interactive Radiometric Power Simulator

An interactive web demonstration of orientation-aware radiometric power modeling for hand gesture tracking.

## Features

- ✨ Real-time 3D visualization of hand trajectories
- 📊 Power comparison charts (Real vs. Simulated)
- 🎮 Interactive controls for model selection and light positioning
- 🔄 Smooth animation with adjustable speed
- 📱 Responsive design (works on desktop, tablet, mobile)
- 🚀 Pure client-side (no backend required)

## Models

### Oriented Disk Model
Accounts for hand orientation using Lambert's cosine law. The solar cell's power reception depends on the angle between the cell normal and the incoming light.

### Parallel Disk Model
Simplified model assuming the palm normal always points upward, ignoring orientation effects.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development

The app will be available at `http://localhost:3000`

## Project Structure

```
solartrack_demo/
├── index.html          # Main HTML file
├── style.css           # Styles
├── main.js             # Main application logic
├── simulator.js        # Physics simulation (JS port from Python)
├── scene3d.js          # Three.js 3D visualization
├── chart.js            # Chart.js power comparison
├── data/               # Gesture data (JSON)
│   ├── circle.json
│   ├── three.json
│   └── triangle.json
├── package.json        # Dependencies
└── vite.config.js      # Build configuration
```

## Deployment

### GitHub Pages

```bash
# Build and deploy to GitHub Pages
npm run deploy
```

This will:
1. Build the production bundle
2. Push to `gh-pages` branch
3. Make it available at `https://yourusername.github.io/solartrack-demo/`

### Manual Deployment

```bash
# Build
npm run build

# Upload the dist/ folder to any static hosting service
# (Netlify, Vercel, AWS S3, etc.)
```

## Controls

- **Gesture Selector**: Choose between Circle, Three, and Triangle gestures
- **Model Selector**: Switch between Oriented and Parallel disk models
- **Light Position Sliders**: Adjust X, Y, Z position of the light source
- **Play/Pause/Reset**: Control the animation
- **Speed Slider**: Adjust animation playback speed (0.5x to 3x)

## Metrics

- **RMSE**: Root Mean Square Error between real and simulated power
- **R²**: Coefficient of determination (goodness of fit)
- **ρ**: Pearson correlation coefficient

## Physics

The simulator uses the disk view factor calculation to model solar cell power reception:

```
F = (L²/π) ∫∫ [r' / (r'² - 2ar'cos(φ) + a² + L²)²] dr' dφ
```

Where:
- `a`: Lateral offset between hand and light source
- `L` (H): Height difference
- `r'`: Radial coordinate on light source disk
- `φ`: Angular coordinate

For the oriented model, this is multiplied by the orientation factor (Lambert's cosine law):

```
P = k × F × max(0, cos(θ))
```

Where `θ` is the angle between the cell normal and the light direction.

## Browser Compatibility

- Chrome/Edge: ✅ Fully supported
- Firefox: ✅ Fully supported
- Safari: ✅ Fully supported
- Mobile browsers: ✅ Responsive design

## License

MIT License - See LICENSE file for details

## Citation

If you use this simulator in your research, please cite:

```bibtex
@inproceedings{yourpaper2025,
  title={Your Paper Title},
  author={Your Name},
  booktitle={Conference Name},
  year={2025}
}
```

## Acknowledgments

- Three.js for 3D visualization
- Chart.js for power comparison charts
- Vite for fast development and building

