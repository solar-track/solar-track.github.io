# 🚀 Quick Deployment Guide

## Initial Setup (One-Time)

### Step 1: Initialize Git Repository

```bash
cd /Users/kha053/Work/Collaboration/Yassein/radiometric_model/solartrack_demo
git init
git add .
git commit -m "Initial commit: SolarTrack Demo"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `solartrack-demo` (or your choice)
3. **Important**: Keep it PUBLIC (required for free GitHub Pages)
4. **Don't** initialize with README (we already have files)
5. Click "Create repository"

### Step 3: Connect and Push

```bash
# Replace 'yourusername' with your GitHub username
git remote add origin https://github.com/yourusername/solartrack-demo.git
git branch -M main
git push -u origin main
```

### Step 4: Deploy to GitHub Pages

```bash
npm run deploy
```

This will:
- Build the production bundle (`npm run build`)
- Create/update `gh-pages` branch
- Push to GitHub

### Step 5: Enable GitHub Pages (First Time Only)

1. Go to your repo: `https://github.com/yourusername/solartrack-demo`
2. Click "Settings" → "Pages"
3. Source: Select `gh-pages` branch
4. Click "Save"
5. Wait 1-2 minutes

**Your demo will be live at:**
`https://yourusername.github.io/solartrack-demo/`

---

## 📝 Future Updates (Super Easy!)

### Every time you make changes:

```bash
# Make your changes to code
# Test locally: http://localhost:3001/

# When ready to deploy:
git add .
git commit -m "Description of changes"
git push origin main
npm run deploy
```

**That's it!** Changes go live in ~1 minute.

---

## 🔄 One-Command Deploy

For even easier deployment, I've created a script:

```bash
./deploy.sh "Your commit message"
```

This does everything: commit, push, and deploy.

---

## 🧪 Testing Workflow

### Local Testing
```bash
cd solartrack_demo
npm run dev
# Test at http://localhost:3001/
```

### Production Preview (before deploying)
```bash
npm run build
npm run preview
# Test at http://localhost:4173/
```

### Deploy to GitHub Pages
```bash
npm run deploy
# Wait 1 minute
# Test at https://yourusername.github.io/solartrack-demo/
```

---

## 📂 What Gets Deployed

Only the `dist/` folder (production build):
- ✅ Minified JavaScript
- ✅ Optimized CSS
- ✅ Gesture JSON files
- ✅ SVG assets
- ✅ index.html

Not deployed:
- ❌ node_modules/
- ❌ Python scripts
- ❌ Source .js files (only built versions)

---

## 🔧 Troubleshooting

### If `npm run deploy` fails:

**Error: "gh-pages not found"**
```bash
npm install gh-pages --save-dev
```

**Error: "Permission denied"**
```bash
# Make sure you're authenticated
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

**Error: "Updates were rejected"**
```bash
# Force push to gh-pages (safe, it's just the build)
npm run deploy -- -f
```

### If live site shows 404:

1. Check GitHub Pages settings (must be enabled)
2. Wait 2-3 minutes after first deploy
3. Clear browser cache (Cmd+Shift+R)
4. Verify `gh-pages` branch exists in repo

### If assets don't load:

1. Check `vite.config.js` has `base: './'`
2. Rebuild: `npm run build`
3. Redeploy: `npm run deploy`

---

## 📊 Deployment Checklist

Before deploying:
- [ ] Test locally (`npm run dev`)
- [ ] Test production build (`npm run preview`)
- [ ] Check browser console for errors (F12)
- [ ] Test all gestures (Circle, One, Two, Three, Triangle, Custom)
- [ ] Test both models (Orientation Aware, Parallel)
- [ ] Test light position adjustment
- [ ] Test animation controls
- [ ] Test on mobile (responsive design)

After deploying:
- [ ] Visit live URL
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] Test all features again
- [ ] Check console for 404s or errors
- [ ] Share with colleagues for feedback!

---

## 🎯 Quick Reference

```bash
# Local development
npm run dev

# Test production locally
npm run preview

# Deploy to GitHub
npm run deploy

# One-command deploy with commit
./deploy.sh "Add custom trajectory feature"
```

---

## 📞 Need Help?

If something goes wrong:
1. Check the console output
2. Verify you're on the right branch: `git branch`
3. Check remote: `git remote -v`
4. Look at GitHub Actions (if enabled) for deployment logs

