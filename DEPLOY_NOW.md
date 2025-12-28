# 🚀 Deploy to GitHub Pages - solar-track Account

## Your GitHub Account: `solar-track`

---

## 📝 Step-by-Step Deployment

### Step 1: Create Repository on GitHub

1. Go to: https://github.com/new
2. **Repository name**: `solartrack-demo`
3. **Description**: "Interactive demonstration of radiometric power modeling"
4. **Public** (must be public for free GitHub Pages)
5. **Don't** check "Initialize with README"
6. Click **"Create repository"**

---

### Step 2: Deploy from Terminal

Run these commands:

```bash
cd /Users/kha053/Work/Collaboration/Yassein/radiometric_model/solartrack_demo

# Initialize git repository
git init

# Add all files
git add .

# Initial commit
git commit -m "Initial commit: SolarTrack Demo with custom trajectory feature"

# Connect to your GitHub repo
git remote add origin https://github.com/solar-track/solartrack-demo.git

# Push to GitHub
git push -u origin main

# Build and deploy to GitHub Pages
npm run deploy
```

---

### Step 3: Enable GitHub Pages

1. Go to: https://github.com/solar-track/solartrack-demo
2. Click **"Settings"** tab
3. Click **"Pages"** in left sidebar
4. Under "Source", select **`gh-pages`** branch
5. Click **"Save"**
6. Wait 1-2 minutes

---

### Step 4: Visit Your Live Demo! 🎉

Your demo will be live at:

**https://solar-track.github.io/solartrack-demo/**

---

## 🔄 Future Updates

### Easy Method (One Command):
```bash
./deploy.sh "Description of your changes"
```

### Manual Method:
```bash
git add .
git commit -m "Your changes"
git push origin main
npm run deploy
```

Changes go live in ~1 minute!

---

## 🔗 Update Header Button Links

After deployment, edit `main.js` (line ~172):

```javascript
setupHeaderButtons() {
    const codeBtn = document.getElementById('code-btn');
    const paperBtn = document.getElementById('paper-btn');
    
    codeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://github.com/solar-track/solartrack-demo', '_blank');
    });
    
    paperBtn.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://your-paper-url-here', '_blank');
    });
}
```

Then redeploy:
```bash
./deploy.sh "Update header button links"
```

---

## ✅ All Set!

Your demo is ready to go live. Just run the commands in **Step 2** above!

**Expected result:**
- Code pushed to: `https://github.com/solar-track/solartrack-demo`
- Demo live at: `https://solar-track.github.io/solartrack-demo/`

🚀 Ready when you are!



