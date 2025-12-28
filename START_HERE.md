# 🎯 START HERE - Quick Deploy

## Option 1: Automatic Script (Easiest)

```bash
cd /Users/kha053/Work/Collaboration/Yassein/radiometric_model/solartrack_demo

# Initialize git (first time only)
git init
git add .
git commit -m "Initial commit"

# Create GitHub repo at: https://github.com/new
# Name it: solartrack-demo
# Keep it PUBLIC

# Connect to GitHub (replace 'yourusername')
git remote add origin https://github.com/yourusername/solartrack-demo.git
git push -u origin main

# Deploy!
npm run deploy

# Enable GitHub Pages:
# Repo → Settings → Pages → Source: gh-pages branch → Save

# Done! Visit: https://yourusername.github.io/solartrack-demo/
```

---

## Option 2: Step-by-Step (First Time)

### 1. Create GitHub Repository
- Go to: https://github.com/new
- Name: `solartrack-demo`
- **Public** (required for free Pages)
- **Don't** check "Initialize with README"
- Click "Create repository"

### 2. Deploy from Terminal
```bash
cd /Users/kha053/Work/Collaboration/Yassein/radiometric_model/solartrack_demo

git init
git add .
git commit -m "Initial commit: SolarTrack Demo"

# Use YOUR GitHub username below:
git remote add origin https://github.com/YOURUSERNAME/solartrack-demo.git
git push -u origin main

npm run deploy
```

### 3. Enable GitHub Pages
- Go to your repo
- Settings → Pages
- Source: `gh-pages` branch
- Save
- Wait 1-2 minutes

### 4. Visit Your Live Demo!
```
https://YOURUSERNAME.github.io/solartrack-demo/
```

---

## Future Updates (Super Easy!)

```bash
# Make changes, test locally
npm run dev

# Deploy when ready
./deploy.sh "Description of what you changed"
```

That's it! Changes live in ~1 minute.

---

## 🧪 Test Before Deploying

```bash
# Test production build locally
npm run build
npm run preview

# If everything works, deploy
npm run deploy
```

---

## ✅ Current Features (Ready to Deploy)

- ✅ 5 pre-loaded trajectories (Circle, One, Two, Three, Triangle)
- ✅ Custom trajectory drawing
- ✅ 2 models (Orientation Aware, Parallel Disk)
- ✅ Interactive light positioning
- ✅ Real-time simulation
- ✅ Animated 3D visualization with SVG icons
- ✅ Power comparison charts
- ✅ Copper colormap on trajectory
- ✅ Info tooltips
- ✅ Professional UI matching paper aesthetic

---

## 📞 Need Help?

See: `DEPLOY_GUIDE.md` for detailed troubleshooting.

---

**Ready to deploy? Just follow Option 1 above!** 🚀



