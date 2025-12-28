# ✅ Pre-Deployment Checklist

## 🧪 Testing Phase

### Local Testing (http://localhost:3001/)
- [ ] **All 5 gestures load**: Circle, One, Two, Three, Triangle
- [ ] **Custom drawing works**: Draw, Done, Clear, Cancel
- [ ] **Model switching**: Orientation Aware ↔ Parallel Disk
- [ ] **Light position sliders**: X, Y, Z all update correctly
- [ ] **Animation controls**: Play, Pause, Reset
- [ ] **Speed control**: 0.5x to 3.0x works
- [ ] **Real curve fades**: When moving light (for real gestures)
- [ ] **Metrics hide**: Show N/A when light moved
- [ ] **θ visibility**: Hidden for Parallel Disk and Custom
- [ ] **Trajectory colors**: Copper colormap updates with light position
- [ ] **Chart animation**: Moving window follows cursor
- [ ] **State display**: a, H, θ, Power values correct
- [ ] **Info icons**: Click to show/hide tooltips
- [ ] **SVG icons**: Hand and light icons display
- [ ] **Header buttons**: Code & Dataset, Paper (placeholder)
- [ ] **No console errors**: Check browser console (F12)

### Production Build Testing
```bash
npm run build
npm run preview
# Test at http://localhost:4173/
```
- [ ] All features work in production build
- [ ] Assets load correctly
- [ ] No 404 errors in console

---

## 🚀 Deployment Steps

### First-Time Setup

1. **Initialize Git** (if not done):
```bash
cd /Users/kha053/Work/Collaboration/Yassein/radiometric_model/solartrack_demo
git init
```

2. **Create .gitignore** (already done ✓):
```
node_modules/
dist/
```

3. **Initial commit**:
```bash
git add .
git commit -m "Initial commit: SolarTrack Demo with custom trajectory"
```

4. **Create GitHub repo**:
   - Go to https://github.com/new
   - Name: `solartrack-demo`
   - Public repository
   - Don't initialize with anything
   - Create

5. **Connect and push**:
```bash
# Replace 'yourusername' with your actual GitHub username
git remote add origin https://github.com/yourusername/solartrack-demo.git
git push -u origin main
```

6. **Deploy to GitHub Pages**:
```bash
npm run deploy
```

7. **Enable Pages** (first time only):
   - Repo → Settings → Pages
   - Source: `gh-pages` branch
   - Save
   - Wait 1-2 minutes

8. **Visit your site**:
```
https://yourusername.github.io/solartrack-demo/
```

---

## 🔄 Future Updates (Easy!)

### Method 1: Manual Commands
```bash
# Make changes
# Test locally: npm run dev

# Deploy
git add .
git commit -m "Description of changes"
git push origin main
npm run deploy
```

### Method 2: One-Command Script
```bash
./deploy.sh "Description of changes"
```

That's it! Live in ~1 minute.

---

## 📋 After First Deployment

- [ ] Visit live URL
- [ ] Hard refresh (Cmd+Shift+R)
- [ ] Test all features
- [ ] Test on mobile device
- [ ] Share with colleagues
- [ ] Gather feedback

---

## 🔗 Update Links

After deployment, update the header button URLs in `main.js`:

```javascript
// In setupHeaderButtons()
codeBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://github.com/yourusername/solartrack-demo', '_blank');
});

paperBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open('https://your-paper-url', '_blank');
});
```

Then redeploy:
```bash
./deploy.sh "Add GitHub and paper links"
```

---

## 📊 Deployment Status

After running `npm run deploy`, you'll see:
```
Published
```

Check gh-pages branch exists:
```bash
git branch -a
# Should show: remotes/origin/gh-pages
```

---

## 🎯 Quick Commands Reference

| Task | Command |
|------|---------|
| Local dev | `npm run dev` |
| Production preview | `npm run preview` |
| Build only | `npm run build` |
| Deploy | `npm run deploy` |
| Quick deploy | `./deploy.sh "message"` |
| Check status | `git status` |
| View branches | `git branch -a` |

---

## ⚠️ Important Notes

1. **Always test locally first** before deploying
2. **Production build** might look slightly different (check with `npm run preview`)
3. **GitHub Pages** can take 1-2 minutes to update
4. **Hard refresh** browsers after deploy (cache issues)
5. **Mobile testing** important (responsive design)
6. **Console errors** should be zero before deploying

---

## 🎉 You're Ready!

Follow the steps above and your demo will be live on GitHub Pages!

**Next steps after deployment:**
1. Test thoroughly on the live site
2. Share the URL for feedback
3. Iterate based on feedback
4. Redeploy easily with `./deploy.sh`



