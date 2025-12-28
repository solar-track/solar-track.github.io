# 🎨 Demo Updates - Change Summary

## ✅ Changes Implemented

### 1. **Fade Real Power Curve When Light Position Changes**

**What happens:**
- When you adjust X, Y, or Z light position sliders
- Real power curve becomes **faded/translucent** (30% opacity)
- Visual cue that real data doesn't match modified light position

**Implementation:**
```javascript
// In chart.js - updateData()
if (fadeRealData) {
    borderColor: 'rgba(96, 57, 19, 0.3)',  // Faded brown
    backgroundColor: 'rgba(96, 57, 19, 0.05)',
    borderWidth: 1
}
```

**Why:** Real power was measured with original light position. When you move the light, real data is no longer valid for comparison.

---

### 2. **Hide Metrics (RMSE, R², ρ) When Light Position Modified**

**What happens:**
- Metrics display shows "N/A" with faded appearance
- Automatically restored when light returns to original position

**Implementation:**
```javascript
// In main.js - updateMetrics()
if (this.lightPositionModified) {
    metricRmse.textContent = 'RMSE: N/A';
    metricR2.textContent = 'R²: N/A';
    metricCorr.textContent = 'ρ: N/A';
    // Set opacity to 0.3
}
```

**Detection:** Compares current light position to original (within 0.1mm threshold)

---

### 3. **Time Window Control for Chart X-Axis**

**New UI Control:**
- Slider: "Time Window" (0% to 100%)
- Controls how much of trajectory to display in chart

**Features:**
- **100%** (default): Shows full trajectory
- **50%**: Shows first half of trajectory
- **20%**: Shows first 20% for detailed view
- Dynamic label: "Full" or "XX%"

**Usage:**
```
Full trajectory: [0s ───────────────── 5.8s]
50% window:      [0s ─────── 2.9s]
20% window:      [0s ── 1.16s]
```

**Use case:** Zoom into specific time periods to see power variations in detail

---

### 4. **Animate Chart with Trajectory**

**New Feature:**
- Checkbox: "Animate chart with trajectory" (checked by default)
- When playing animation, chart x-axis follows the cursor

**Behavior:**

**Enabled (checked):**
- Chart shows **moving window** around current time (±2 seconds)
- Window scrolls as animation plays
- Like a "spotlight" following the trajectory

**Disabled (unchecked):**
- Chart shows full trajectory (or whatever time window you set)
- Only the red cursor moves
- Traditional static view

**Implementation:**
```javascript
// In chart.js - animateToCurrentIndex()
const currentTime = index / samplingRate;
const windowSize = 2.0; // ±2 seconds

chart.scales.x.min = currentTime - windowSize;
chart.scales.x.max = currentTime + windowSize;
```

**Visual effect:**
```
Time: 3.5s

Moving window shows: [1.5s ──▼── 5.5s]
                           Current position
```

---

## 🎮 Updated User Experience

### Scenario 1: Default Usage (Original Light Position)
```
1. Load Circle gesture
2. Click Play
3. Chart animates with moving window (±2s around cursor)
4. Full trajectory visible in 3D
5. Metrics (RMSE, R², ρ) displayed normally
6. Real power curve: Full opacity (brown)
7. Simulated curve: Full opacity (orange)
```

### Scenario 2: Modified Light Position
```
1. Load Three gesture
2. Move Y slider from 868 → 700mm
3. Real power curve: FADED (30% opacity)
4. Simulated curve: Full opacity (recomputed)
5. Metrics: "RMSE: N/A", "R²: N/A", "ρ: N/A" (faded)
6. Visual indication: "This is simulation only, not real comparison"
```

### Scenario 3: Detailed Time Analysis
```
1. Load Triangle gesture
2. Set time window to 30%
3. Uncheck "Animate chart with trajectory"
4. Click Play
5. Result: 
   - Chart shows fixed 0-0.69s window
   - Cursor moves through this window
   - See power variations in detail
```

---

## 📊 Visual Examples

### Normal State (Original Light)
```
Chart:
Power (μW)
    ↑
 60 |     ╱╲     ╱╲
 50 |    ╱  ╲   ╱  ╲
 40 |   ╱    ╲ ╱    ╲
    └────────────────────→ Time (s)
    Real: ──── (solid brown)
    Sim:  ──── (solid orange)
    
Metrics: RMSE: 2.34 μW  R²: 0.957  ρ: 0.978
```

### Modified Light State
```
Chart:
Power (μW)
    ↑
 60 |     ╱╲     ╱╲    (faded)
 50 |    ╱  ╲   ╱  ╲
 40 |   ╱    ╲ ╱    ╲
    └────────────────────→ Time (s)
    Real: ···· (faded, 30% opacity)
    Sim:  ──── (solid orange, recomputed)
    
Metrics: RMSE: N/A  R²: N/A  ρ: N/A (faded)
```

### Animated Chart Window
```
At t=2.5s (with animate enabled):

Visible window: [0.5s ──▼── 4.5s]
                       2.5s

Full trajectory: [░░▓▓▓▓▓░░░░]
                   ↑
                Visible portion
```

---

## 🔧 Technical Details

### Light Position Detection
```javascript
// Threshold: 0.1mm
lightPositionModified = 
    |X - X₀| > 0.1 || 
    |Y - Y₀| > 0.1 || 
    |Z - Z₀| > 0.1

// Automatically tracks original position per gesture
```

### Chart Animation Window
```javascript
// Default: ±2 seconds around cursor
windowSize = 2.0

// At time t:
xMin = max(0, t - 2.0)
xMax = t + 2.0
```

### Time Window Calculation
```javascript
// User sets: 50%
// Gesture duration: 5.8s
visibleTime = 5.8 × 0.5 = 2.9s

// Chart shows: [0s → 2.9s]
```

---

## 🎯 Behavior Matrix

| Action | Real Curve | Sim Curve | Metrics | Chart Animation |
|--------|------------|-----------|---------|-----------------|
| Load gesture | Solid | Solid | Shown | Enabled |
| Play (original light) | Solid | Solid | Shown | Moves ±2s window |
| Move light slider | **Faded** | Solid (updated) | **Hidden (N/A)** | Still works |
| Uncheck animate | Solid | Solid | Shown | Static, cursor only |
| Set time window 50% | Solid | Solid | Shown | Shows 0-50% |
| Reset light to original | Solid | Solid | **Shown** | Works normally |

---

## 🧪 Testing Checklist

Test these scenarios:

- [ ] Load Circle, see both curves solid
- [ ] Play animation, chart window moves
- [ ] Adjust Y slider, real curve fades
- [ ] Metrics show "N/A"
- [ ] Move slider back to 868.82, curves restore
- [ ] Set time window to 30%, see zoomed view
- [ ] Uncheck animate, chart stays static during play
- [ ] Check animate again, window follows cursor
- [ ] Try with Three and Triangle gestures
- [ ] Verify simulation updates when moving light

---

## 💡 User Tips

**For Presentations:**
1. Start with original light (show metrics working)
2. Play animation with moving window (impressive!)
3. Pause and adjust light position
4. Show how simulation updates in real-time
5. Point out faded real curve and N/A metrics
6. Explain: "Real data collected at original position"

**For Analysis:**
1. Use time window control to zoom into interesting regions
2. Disable chart animation for detailed inspection
3. Adjust light position to test "what-if" scenarios
4. Compare how orientation/parallel models respond

**For Teaching:**
1. Show full trajectory first (100% window)
2. Zoom to specific segments (30-50% window)
3. Use animation to follow hand motion
4. Demonstrate light position sensitivity

---

## 📝 Files Modified

1. **main.js**
   - Added `lightPositionModified` tracking
   - Added `checkLightPositionModified()` method
   - Updated `updateMetrics()` to hide when modified
   - Added time window controls
   - Added animate chart checkbox handler
   - Updated `updateFrame()` for animated chart

2. **chart.js**
   - Added `fadeRealData` parameter to `updateData()`
   - Added `setXAxisRange()` method
   - Added `resetXAxisRange()` method
   - Added `animateToCurrentIndex()` method

3. **index.html**
   - Added time window slider
   - Added animate chart checkbox
   - Added "Chart View" section

4. **style.css**
   - Added `.checkbox-group` styles
   - Checkbox hover effects

---

## 🚀 What's Next?

**Possible Future Enhancements:**
- [ ] Save/load custom light positions
- [ ] Multiple light sources
- [ ] Comparison mode (side-by-side charts)
- [ ] Export animation as video
- [ ] Adjustable animation window size (currently ±2s)
- [ ] Bookmarks for interesting time points

---

## 📞 If Something Doesn't Work

**Real curve not fading:**
- Check browser console for errors
- Verify light sliders are working
- Try moving slider significantly (>1mm)

**Metrics still showing:**
- Refresh page
- Check original light position values
- Verify threshold detection (0.1mm)

**Chart animation not smooth:**
- Reduce animation speed
- Close other browser tabs
- Check system performance

**Time window not updating:**
- Make sure you moved the slider
- Check if gesture is loaded
- Try clicking Reset

---

Enjoy the enhanced demo! 🎉



