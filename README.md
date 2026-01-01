# SolarTrack Radiometric Simulator

An interactive web-based simulator for modeling power harvesting from wearable solar cells under controlled lighting conditions.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Testing

Run automated tests to validate the radiometric models:

```bash
npm test
```

This runs 20 test cases (5 trajectories × 4 model configurations) against precomputed expected outputs. See [Testing Guide](public/test.html) for details.

## Features

- Two physics-based radiometric models (Parallel Disk and Orientation Aware)
- Real-time 3D visualization of hand trajectories
- CSV import for motion capture data
- Export simulated power traces

## Documentation

See the [Help Page](public/help.html) for comprehensive documentation including:

- Model equations and theory
- Input/output CSV formats
- Configuration options
- Usage guide

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
