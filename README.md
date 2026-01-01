<p align="center">
  <img src="public/assets/solartrack_icon.svg" alt="SolarTrack" width="80">
</p>

# SolarTrack Radiometric Simulator

An interactive web-based simulator for modeling power harvesting from wearable solar cells under controlled lighting conditions.

<p align="center">
  <a href="https://youtu.be/5_jUuLd6N1Q">
    <img src="https://img.youtube.com/vi/5_jUuLd6N1Q/maxresdefault.jpg" alt="Watch Demo" width="500">
  </a>
  <br>
  <a href="https://youtu.be/5_jUuLd6N1Q">▶️ Watch 1-minute demo</a>
</p>

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

See the [Documentation Page](public/help.html) for model equations, CSV formats, and usage guide.

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
