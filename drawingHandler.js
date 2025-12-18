/**
 * drawingHandler.js
 * 
 * Handles custom trajectory drawing functionality.
 */

export class DrawingHandler {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.points = [];
        this.onComplete = null;
        this.onCancel = null;
    }
    
    show(onComplete, onCancel) {
        this.onComplete = onComplete;
        this.onCancel = onCancel;
        this.points = [];
        
        const overlay = document.getElementById('drawing-overlay');
        this.canvas = document.getElementById('drawing-canvas');
        
        // Set canvas size
        const sceneWrapper = document.querySelector('.scene-wrapper');
        const width = Math.min(600, sceneWrapper.clientWidth - 40);
        const height = Math.min(400, sceneWrapper.clientHeight - 150);
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d');
        
        // Show overlay
        overlay.style.display = 'flex';
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    hide() {
        const overlay = document.getElementById('drawing-overlay');
        overlay.style.display = 'none';
        this.removeEventListeners();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Touch support
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleMouseUp.bind(this));
        
        // Button handlers
        document.getElementById('drawing-done-btn').onclick = () => this.complete();
        document.getElementById('drawing-clear-btn').onclick = () => this.clear();
        document.getElementById('drawing-cancel-btn').onclick = () => this.cancel();
    }
    
    removeEventListeners() {
        // Remove all listeners (they'll be recreated if shown again)
        document.getElementById('drawing-done-btn').onclick = null;
        document.getElementById('drawing-clear-btn').onclick = null;
        document.getElementById('drawing-cancel-btn').onclick = null;
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.points.push({ x, y });
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Add point if moved enough (reduce jitter)
        const lastPoint = this.points[this.points.length - 1];
        const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
        
        if (dist > 3) { // Minimum 3px movement
            this.points.push({ x, y });
            this.redraw();
        }
    }
    
    handleMouseUp(e) {
        this.isDrawing = false;
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        this.isDrawing = true;
        this.points.push({ x, y });
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (!this.isDrawing) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        const lastPoint = this.points[this.points.length - 1];
        const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
        
        if (dist > 3) {
            this.points.push({ x, y });
            this.redraw();
        }
    }
    
    redraw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.points.length < 2) return;
        
        // Draw path
        this.ctx.strokeStyle = '#F7941D';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.points[0].x, this.points[0].y);
        
        for (let i = 1; i < this.points.length; i++) {
            this.ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        
        this.ctx.stroke();
        
        // Draw start point
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.beginPath();
        this.ctx.arc(this.points[0].x, this.points[0].y, 6, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // Draw end point
        const lastPoint = this.points[this.points.length - 1];
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.beginPath();
        this.ctx.arc(lastPoint.x, lastPoint.y, 6, 0, 2 * Math.PI);
        this.ctx.fill();
    }
    
    clear() {
        this.points = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    complete() {
        if (this.points.length < 10) {
            alert('Please draw a longer path (at least 10 points)');
            return;
        }
        
        // Convert 2D canvas points to 3D trajectory
        const trajectory3D = this.convertTo3D(this.points);
        
        this.hide();
        
        if (this.onComplete) {
            this.onComplete(trajectory3D);
        }
    }
    
    cancel() {
        this.hide();
        
        if (this.onCancel) {
            this.onCancel();
        }
    }
    
    convertTo3D(canvasPoints) {
        // Smooth the path first
        const smoothedPoints = this.smoothPath(canvasPoints);
        
        // Resample to ~100 points for consistent animation
        const resampledPoints = this.resamplePath(smoothedPoints, 100);
        
        // Convert to 3D coordinates
        const positions = [];
        const normals = [];
        
        // Map canvas space to 3D space - VERTICAL PLANE (XY) with 3D depth variation
        // Canvas X → World X (lateral position, centered at 0)
        // Canvas Y → World Y (height, inverted - top of canvas = high Y)
        // Canvas Y also → World Z (depth): top = closer to light, bottom = further
        //
        // Goal: Position trajectory near light source at [-160, 869, 168]
        // - X range: -200 to +200 mm (centered at 0, close to light's -160)
        // - Y range: 500 to 800 mm (approaching light's height ~869)
        // - Z range: 100 to 200 mm (closer to light's Z=168)
        //   - Top of canvas → Z=200 (approaching light)
        //   - Bottom → Z=100 (receding from light)
        
        const centerX = this.canvas.width / 2;
        const scaleX = 400 / this.canvas.width;   // ~400mm lateral range
        const scaleY = 300 / this.canvas.height;  // ~300mm vertical range
        const baseHeight = 500; // Base height (bottom of canvas)
        
        for (let i = 0; i < resampledPoints.length; i++) {
            const point = resampledPoints[i];
            
            // Map canvas to 3D (XY vertical plane + Z depth)
            const x = (point.x - centerX) * scaleX;
            const y = baseHeight + (this.canvas.height - point.y) * scaleY; // Invert Y
            
            // Add 3D depth variation based on Y position in canvas
            // Top of canvas (point.y = 0) → normalized = 0 → Z = 200 (closer to light)
            // Bottom of canvas (point.y = height) → normalized = 1 → Z = 100 (further)
            const normalizedY = point.y / this.canvas.height; // 0 at top, 1 at bottom
            const z = 200 - normalizedY * 100; // Z range: 200 (top) to 100 (bottom)
            
            positions.push([x, y, z]);
            
            // Palm normal points DOWN [0, -1, 0]
            // So cell normal (back of hand) = -palm_normal = [0, 1, 0] points UP towards light
            normals.push([0, -1, 0]);
        }
        
        console.log('✓ Custom trajectory converted to 3D:');
        console.log(`  X range: ${Math.min(...positions.map(p => p[0])).toFixed(1)} to ${Math.max(...positions.map(p => p[0])).toFixed(1)} mm`);
        console.log(`  Y range: ${Math.min(...positions.map(p => p[1])).toFixed(1)} to ${Math.max(...positions.map(p => p[1])).toFixed(1)} mm`);
        console.log(`  Z range: ${Math.min(...positions.map(p => p[2])).toFixed(1)} to ${Math.max(...positions.map(p => p[2])).toFixed(1)} mm`);
        console.log(`  (Draw upward ↑ to approach light 💡)`);
        
        return { positions, normals };
    }
    
    smoothPath(points) {
        if (points.length < 3) return points;
        
        // Simple moving average smoothing
        const smoothed = [points[0]];
        const windowSize = 3;
        
        for (let i = 1; i < points.length - 1; i++) {
            let sumX = 0, sumY = 0, count = 0;
            
            for (let j = Math.max(0, i - windowSize); j <= Math.min(points.length - 1, i + windowSize); j++) {
                sumX += points[j].x;
                sumY += points[j].y;
                count++;
            }
            
            smoothed.push({ x: sumX / count, y: sumY / count });
        }
        
        smoothed.push(points[points.length - 1]);
        return smoothed;
    }
    
    resamplePath(points, targetCount) {
        if (points.length <= targetCount) return points;
        
        // Calculate total path length
        let totalLength = 0;
        const lengths = [0];
        
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);
            totalLength += segmentLength;
            lengths.push(totalLength);
        }
        
        // Resample at equal distances
        const resampled = [points[0]];
        const step = totalLength / (targetCount - 1);
        
        for (let i = 1; i < targetCount - 1; i++) {
            const targetDist = i * step;
            
            // Find segment containing this distance
            for (let j = 1; j < lengths.length; j++) {
                if (lengths[j] >= targetDist) {
                    // Interpolate between points[j-1] and points[j]
                    const segmentStart = lengths[j - 1];
                    const segmentEnd = lengths[j];
                    const t = (targetDist - segmentStart) / (segmentEnd - segmentStart);
                    
                    const x = points[j - 1].x + t * (points[j].x - points[j - 1].x);
                    const y = points[j - 1].y + t * (points[j].y - points[j - 1].y);
                    
                    resampled.push({ x, y });
                    break;
                }
            }
        }
        
        resampled.push(points[points.length - 1]);
        return resampled;
    }
}

