# Deployment Guide

## Option 1: GitHub Pages (Recommended)

### Setup

1. Create a new GitHub repository:
   ```bash
   cd solartrack_demo
   git init
   git add .
   git commit -m "Initial commit: Interactive radiometric simulator"
   ```

2. Create repository on GitHub (e.g., `radiometric-demo`)

3. Push to GitHub:
   ```bash
   git remote add origin https://github.com/yourusername/radiometric-demo.git
   git branch -M main
   git push -u origin main
   ```

4. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

5. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: `gh-pages` branch
   - Save

Your demo will be live at: `https://yourusername.github.io/radiometric-demo/`

### Update Deployment

```bash
# Make changes to code
npm run build
npm run deploy
```

---

## Option 2: Netlify

### One-Click Deploy

1. Push code to GitHub (see above)
2. Go to https://netlify.com
3. Click "New site from Git"
4. Select your repository
5. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

Your demo will be live at: `https://random-name.netlify.app/`

### Drag & Drop Deploy

1. Build locally:
   ```bash
   npm run build
   ```

2. Go to https://app.netlify.com/drop
3. Drag the `dist/` folder into the browser
4. Done! Instant deployment

---

## Option 3: Vercel

### Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd solartrack_demo
vercel
```

Follow the prompts. Your demo will be live instantly!

### Deploy from GitHub

1. Push code to GitHub
2. Go to https://vercel.com
3. Import your repository
4. Vercel will auto-detect Vite and configure everything
5. Click "Deploy"

---

## Option 4: Local Sharing

### Simple HTTP Server

```bash
# Build
npm run build

# Serve the dist folder
cd dist
python3 -m http.server 8000
```

Share your local IP address with others on the same network:
`http://your-local-ip:8000/`

### Ngrok (Public URL)

```bash
# Install ngrok: https://ngrok.com/

# Build and serve
npm run build
npx http-server dist -p 8000

# In another terminal, create public URL
ngrok http 8000
```

Share the `https://...ngrok.io` URL with anyone!

---

## Testing Before Deployment

```bash
# Build production version
npm run build

# Preview production build locally
npm run preview
```

Visit the preview URL to test before deploying.

---

## Performance Optimization

### Reduce Bundle Size

The current build is already optimized, but if you add more gestures:

```javascript
// In vite.config.js, add:
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'three': ['three'],
        'chart': ['chart.js']
      }
    }
  }
}
```

### Compress JSON Data

If JSON files get large:

```bash
# Install gzip compression
npm install vite-plugin-compression --save-dev
```

```javascript
// In vite.config.js:
import viteCompression from 'vite-plugin-compression'

plugins: [viteCompression()]
```

---

## Custom Domain

### GitHub Pages

1. Buy domain (e.g., from Namecheap, GoDaddy)
2. Add `CNAME` file to `public/` folder with your domain:
   ```
   demo.yourdomain.com
   ```
3. Configure DNS:
   - Add CNAME record pointing to `yourusername.github.io`
4. Enable HTTPS in GitHub Pages settings

### Netlify/Vercel

1. Go to domain settings
2. Add custom domain
3. Follow DNS configuration instructions
4. SSL certificate auto-generated

---

## Troubleshooting

### GitHub Pages Shows 404

- Make sure `base: './'` is set in `vite.config.js`
- Check that `gh-pages` branch was created
- Wait a few minutes for DNS propagation

### Images/Data Not Loading

- Check browser console for 404 errors
- Verify file paths use relative paths
- Ensure `data/` folder is included in build

### Blank Page After Deploy

- Check browser console for errors
- Verify all imports use correct paths
- Test with `npm run preview` before deploying

---

## Analytics (Optional)

### Google Analytics

Add to `index.html` before `</head>`:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

### Simple Analytics

Add to `index.html`:

```html
<script async defer src="https://scripts.simpleanalyticscdn.com/latest.js"></script>
<noscript><img src="https://queue.simpleanalyticscdn.com/noscript.gif" alt="" /></noscript>
```

---

## Maintenance

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all dependencies
npm update

# Update specific package
npm install three@latest
```

### Add New Gestures

1. Export gesture data:
   ```python
   python export_gestures_to_json.py
   ```

2. Add to gesture selector in `index.html`:
   ```html
   <option value="NewGesture">New Gesture</option>
   ```

3. Rebuild and redeploy:
   ```bash
   npm run build
   npm run deploy
   ```

---

## Security

### Content Security Policy (Optional)

Add to `index.html` for extra security:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:;">
```

### HTTPS Only

All modern hosting platforms (GitHub Pages, Netlify, Vercel) provide HTTPS by default. Never deploy without HTTPS!

---

## License

Remember to add a LICENSE file to your repository. MIT is recommended for open-source demos:

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy...
```



