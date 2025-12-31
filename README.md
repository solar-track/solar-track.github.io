# SolarTrack Radiometric Simulator

An interactive web-based simulator for modeling power harvesting from wearable solar cells under controlled lighting conditions.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Features

- Two physics-based radiometric models (Parallel Disk and Orientation Aware)
- CSV import for motion capture data
- Export simulated power traces

## Documentation

See the [Help Page](public/help.html) for comprehensive documentation including:

- Model equations and theory
- Input/output CSV formats
- Configuration options
- Usage guide

## Build

```bash
# Production build
npm run build

# Deploy to GitHub Pages
npm run deploy
```

## Citation

If you use this simulator in your research, please cite:

```bibtex
@inproceedings{ghalwash2026solartrack,
  title     = {SolarTrack: Exploring the Continuous Tracking Capabilities of Wearable Solar Harvesters},
  author    = {Yasien Ghalwash and Abdelwahed Khamis and Moid Sandhu and Sara Khalifa and Raja Jurdak},
  booktitle = {Proceedings of the 24th IEEE International Conference on Pervasive Computing and Communications (PerCom)},
  year      = {2026}
}
```

## License

MIT License - See [LICENSE](LICENSE) file for details.
