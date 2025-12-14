/**
 * main.js
 * 
 * Main application entry point.
 * Coordinates all modules and handles user interactions.
 */

import { Scene3D } from './scene3d.js';
import { PowerChart } from './chart.js';
import { DrawingHandler } from './drawingHandler.js';
import {
    simulateSolarPower,
    applyPerSegmentScaling,
    calculateRMSE,
    calculateR2,
    calculateCorrelation,
    CONSTANTS
} from './simulator.js';

class SolarTrackDemo {
    constructor() {
        // Core components
        this.scene3d = null;
        this.powerChart = null;
        this.drawingHandler = null;
        
        // Data
        this.currentGestureData = null;
        this.currentModel = 'oriented';
        this.lightPosition = [...CONSTANTS.SOURCE_CENTER];
        this.originalLightPosition = [...CONSTANTS.SOURCE_CENTER];
        this.lightPositionModified = false;
        
        // Animation state
        this.isPlaying = false;
        this.currentFrame = 0;
        this.animationSpeed = 1.0;
        this.animationId = null;
        
        // UI elements
        this.elements = {};
        
        // Chart animation settings
        this.animateChartWithTrajectory = true;
        this.timeWindowPercent = 100; // 100 = show full trajectory
        this.customAnimationSpeed = 0.3; // Slower for custom trajectories
        
        this.init();
    }
    
    async init() {
        console.log('🚀 Initializing Solar Track Demo...');
        
        // Get UI elements
        this.cacheElements();
        
        // Initialize 3D scene
        const sceneContainer = document.getElementById('scene-container');
        this.scene3d = new Scene3D(sceneContainer);
        console.log('✓ 3D Scene initialized');
        
        // Initialize chart
        const chartCanvas = document.getElementById('power-chart');
        this.powerChart = new PowerChart(chartCanvas);
        console.log('✓ Power Chart initialized');
        
        // Initialize drawing handler
        this.drawingHandler = new DrawingHandler();
        console.log('✓ Drawing Handler initialized');
        
        // Setup event listeners
        this.setupEventListeners();
        console.log('✓ Event listeners setup');
        
        // Load initial gesture
        await this.loadGesture('Circle');
        console.log('✓ Initial gesture loaded');
        
        console.log('✅ Demo ready!');
    }
    
    cacheElements() {
        this.elements = {
            gestureSelect: document.getElementById('gesture-select'),
            modelRadios: document.getElementsByName('model'),
            lightXSlider: document.getElementById('light-x'),
            lightYSlider: document.getElementById('light-y'),
            lightZSlider: document.getElementById('light-z'),
            lightXValue: document.getElementById('light-x-value'),
            lightYValue: document.getElementById('light-y-value'),
            lightZValue: document.getElementById('light-z-value'),
            playBtn: document.getElementById('play-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn'),
            speedSlider: document.getElementById('speed'),
            speedValue: document.getElementById('speed-value'),
            progressBar: document.getElementById('progress-bar'),
            stateA: document.getElementById('state-a'),
            stateH: document.getElementById('state-h'),
            stateTheta: document.getElementById('state-theta'),
            statePower: document.getElementById('state-power'),
            metricRmse: document.getElementById('metric-rmse'),
            metricR2: document.getElementById('metric-r2'),
            metricCorr: document.getElementById('metric-corr')
        };
    }
    
    setupEventListeners() {
        // Gesture selection
        this.elements.gestureSelect.addEventListener('change', (e) => {
            this.loadGesture(e.target.value);
        });
        
        // Model selection
        this.elements.modelRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentModel = e.target.value;
                this.updateThetaVisibility();
                this.recomputeSimulation();
            });
        });
        
        // Light position sliders
        this.elements.lightXSlider.addEventListener('input', (e) => {
            this.lightPosition[0] = parseFloat(e.target.value);
            this.elements.lightXValue.textContent = this.lightPosition[0].toFixed(1);
            this.checkLightPositionModified();
            this.updateLightPosition();
        });
        
        this.elements.lightYSlider.addEventListener('input', (e) => {
            this.lightPosition[1] = parseFloat(e.target.value);
            this.elements.lightYValue.textContent = this.lightPosition[1].toFixed(1);
            this.checkLightPositionModified();
            this.updateLightPosition();
        });
        
        this.elements.lightZSlider.addEventListener('input', (e) => {
            this.lightPosition[2] = parseFloat(e.target.value);
            this.elements.lightZValue.textContent = this.lightPosition[2].toFixed(1);
            this.checkLightPositionModified();
            this.updateLightPosition();
        });
        
        // Animation controls
        this.elements.playBtn.addEventListener('click', () => this.play());
        this.elements.pauseBtn.addEventListener('click', () => this.pause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        
        // Speed control
        this.elements.speedSlider.addEventListener('input', (e) => {
            this.animationSpeed = parseFloat(e.target.value);
            this.elements.speedValue.textContent = this.animationSpeed.toFixed(1);
        });
        
        // Info icon tooltips
        this.setupTooltips();
        
        // Header buttons (URLs can be updated later)
        this.setupHeaderButtons();
        
        // Mobile controls
        this.setupMobileControls();
    }
    
    setupMobileControls() {
        // Mobile gesture selector
        const mobileGestureSelect = document.getElementById('mobile-gesture-select');
        if (mobileGestureSelect) {
            mobileGestureSelect.addEventListener('change', (e) => {
                this.elements.gestureSelect.value = e.target.value;
                this.loadGesture(e.target.value);
            });
        }
        
        // Mobile model selector
        const modelBtns = document.querySelectorAll('.model-btn');
        modelBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const model = btn.dataset.model;
                modelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Sync with desktop radio buttons
                if (model === 'oriented') {
                    document.getElementById('model-oriented').checked = true;
                } else {
                    document.getElementById('model-parallel').checked = true;
                }
                
                this.currentModel = model;
                this.recomputeSimulation();
            });
        });
        
        // Mobile animation controls
        const mobilePlayBtn = document.getElementById('mobile-play-btn');
        const mobilePauseBtn = document.getElementById('mobile-pause-btn');
        const mobileResetBtn = document.getElementById('mobile-reset-btn');
        
        if (mobilePlayBtn) mobilePlayBtn.addEventListener('click', () => this.play());
        if (mobilePauseBtn) mobilePauseBtn.addEventListener('click', () => this.pause());
        if (mobileResetBtn) mobileResetBtn.addEventListener('click', () => this.reset());
        
        // Mobile light position arrows
        const arrowBtns = document.querySelectorAll('.arrow-btn');
        arrowBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const axis = btn.dataset.axis;
                const dir = parseInt(btn.dataset.dir);
                const step = 20; // 20mm per click
                
                if (axis === 'x') {
                    this.lightPosition[0] += dir * step;
                    this.elements.lightXSlider.value = this.lightPosition[0];
                    this.elements.lightXValue.textContent = this.lightPosition[0].toFixed(1);
                } else if (axis === 'y') {
                    this.lightPosition[1] += dir * step;
                    this.elements.lightYSlider.value = this.lightPosition[1];
                    this.elements.lightYValue.textContent = this.lightPosition[1].toFixed(1);
                } else if (axis === 'z') {
                    this.lightPosition[2] += dir * step;
                    this.elements.lightZSlider.value = this.lightPosition[2];
                    this.elements.lightZValue.textContent = this.lightPosition[2].toFixed(1);
                }
                
                this.checkLightPositionModified();
                this.updateLightPosition();
            });
        });
    }
    
    setupHeaderButtons() {
        const codeBtn = document.getElementById('code-btn');
        const paperBtn = document.getElementById('paper-btn');
        
        // Placeholder URLs - update these with actual links
        codeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: Update with actual GitHub/dataset URL
            alert('Code & Dataset link will be added here.\nUpdate the URL in main.js setupHeaderButtons()');
            // window.open('https://github.com/yourusername/solartrack', '_blank');
        });
        
        paperBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // TODO: Update with actual paper URL
            alert('Paper link will be added here.\nUpdate the URL in main.js setupHeaderButtons()');
            // window.open('https://arxiv.org/abs/yourpaper', '_blank');
        });
    }
    
    setupTooltips() {
        const infoIcons = document.querySelectorAll('.info-icon');
        
        infoIcons.forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const tooltipId = icon.getAttribute('data-tooltip');
                const tooltip = document.getElementById(`${tooltipId}-tooltip`);
                
                // Hide all other tooltips
                document.querySelectorAll('.tooltip-content').forEach(t => {
                    if (t !== tooltip) {
                        t.style.display = 'none';
                    }
                });
                
                // Toggle current tooltip
                if (tooltip.style.display === 'none') {
                    tooltip.style.display = 'block';
                } else {
                    tooltip.style.display = 'none';
                }
            });
        });
        
        // Close tooltips when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('info-icon')) {
                document.querySelectorAll('.tooltip-content').forEach(t => {
                    t.style.display = 'none';
                });
            }
        });
    }
    
    
    updateThetaVisibility() {
        const thetaItem = document.getElementById('theta-state-item');
        if (thetaItem) {
            // Hide theta for parallel disk OR for custom trajectories (since normals are fixed)
            if (this.currentModel === 'parallel' || 
                (this.currentGestureData && this.currentGestureData.name === 'Custom')) {
                thetaItem.style.display = 'none';
            } else {
                thetaItem.style.display = 'flex';
            }
        }
    }
    
    showDrawingInterface() {
        this.drawingHandler.show(
            (trajectory3D) => this.handleCustomTrajectory(trajectory3D),
            () => this.handleDrawingCancel()
        );
    }
    
    handleCustomTrajectory(trajectory3D) {
        console.log('Custom trajectory drawn with', trajectory3D.positions.length, 'points');
        
        // Create custom gesture data
        this.currentGestureData = {
            name: 'Custom',
            positions: trajectory3D.positions,
            normals: trajectory3D.normals,
            real_power: null, // No real data for custom
            num_samples: trajectory3D.positions.length,
            sampling_rate: 100,
            light_source: {
                position: [...CONSTANTS.SOURCE_CENTER],
                diameter: CONSTANTS.SOURCE_DIAMETER
            }
        };
        
        // Reset light position
        this.lightPosition = [...CONSTANTS.SOURCE_CENTER];
        this.originalLightPosition = [...CONSTANTS.SOURCE_CENTER];
        this.lightPositionModified = false;
        this.updateLightSliders();
        this.scene3d.updateLightPosition(this.lightPosition);
        
        // Simulate power for custom trajectory
        console.log('Simulating custom trajectory...');
        const result = simulateSolarPower(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            this.currentModel,
            this.lightPosition,
            this.currentGestureData.light_source.diameter
        );
        
        console.log('Simulation result:', {
            powerRange: [Math.min(...result.power), Math.max(...result.power)],
            numSamples: result.power.length
        });
        
        // For custom, scale to a reasonable power range (e.g., 0-100 μW)
        const minPower = Math.min(...result.power);
        const maxPower = Math.max(...result.power);
        const range = maxPower - minPower;
        
        let scaledPower;
        if (range > 0) {
            // Normalize to 0-1, then scale to 20-80 μW range
            const normalized = result.power.map(p => (p - minPower) / range);
            scaledPower = normalized.map(p => (20 + p * 60) * 1e-6); // Convert to Watts
        } else {
            scaledPower = result.power.map(() => 50 * 1e-6); // Default 50 μW
        }
        
        console.log('Scaled power:', {
            min: Math.min(...scaledPower) * 1e6,
            max: Math.max(...scaledPower) * 1e6,
            unit: 'μW'
        });
        
        this.currentGestureData.current_sim = scaledPower;
        this.currentGestureData.current_a = result.a_values;
        this.currentGestureData.current_H = result.H_values;
        this.currentGestureData.sim_oriented = scaledPower;
        this.currentGestureData.sim_parallel = scaledPower;
        
        // Update visualization with scaled power for color coding
        this.scene3d.setTrajectory(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            scaledPower
        );
        
        // Update chart (show only simulated)
        this.powerChart.updateData(
            scaledPower, // Use simulated as "real" for display
            scaledPower,
            this.currentGestureData.sampling_rate,
            false,
            true // Flag for custom mode
        );
        
        // Hide metrics for custom
        this.elements.metricRmse.textContent = 'RMSE: N/A (Custom)';
        this.elements.metricRmse.style.opacity = '0.5';
        this.elements.metricR2.textContent = 'R²: N/A (Custom)';
        this.elements.metricR2.style.opacity = '0.5';
        this.elements.metricCorr.textContent = 'ρ: N/A (Custom)';
        this.elements.metricCorr.style.opacity = '0.5';
        
        this.reset();
        this.updateThetaVisibility();
    }
    
    handleDrawingCancel() {
        console.log('Drawing cancelled');
        // Reset to first gesture
        this.elements.gestureSelect.value = 'Circle';
        this.loadGesture('Circle');
    }
    
    checkLightPositionModified() {
        // Check if current light position differs from original
        const threshold = 0.1;
        this.lightPositionModified = 
            Math.abs(this.lightPosition[0] - this.originalLightPosition[0]) > threshold ||
            Math.abs(this.lightPosition[1] - this.originalLightPosition[1]) > threshold ||
            Math.abs(this.lightPosition[2] - this.originalLightPosition[2]) > threshold;
    }
    
    async loadGesture(gestureName) {
        console.log(`Loading gesture: ${gestureName}...`);
        
        // Check if custom drawing mode
        if (gestureName === 'Custom') {
            this.pause();
            // Disable orientation-aware model for custom trajectories
            document.getElementById('model-oriented').disabled = true;
            document.getElementById('model-parallel').checked = true;
            this.currentModel = 'parallel';
            this.showDrawingInterface();
            return;
        }
        
        // Re-enable orientation-aware model for pre-loaded gestures
        document.getElementById('model-oriented').disabled = false;
        
        try {
            this.pause();
            
            const response = await fetch(`./data/${gestureName.toLowerCase()}.json`);
            if (!response.ok) {
                throw new Error(`Failed to load gesture: ${response.statusText}`);
            }
            
            this.currentGestureData = await response.json();
            console.log(`✓ Loaded ${this.currentGestureData.num_samples} samples`);
            
            // Reset light position to default
            this.lightPosition = [...this.currentGestureData.light_source.position];
            this.originalLightPosition = [...this.currentGestureData.light_source.position];
            this.lightPositionModified = false;
            this.updateLightSliders();
            
            // Update light position in 3D scene
            this.scene3d.updateLightPosition(this.lightPosition);
            
            // Update visualization
            this.updateVisualization();
            this.reset();
            
            // Update theta visibility based on current model
            this.updateThetaVisibility();
            
        } catch (error) {
            console.error('Error loading gesture:', error);
            alert(`Failed to load gesture: ${error.message}`);
        }
    }
    
    updateLightSliders() {
        this.elements.lightXSlider.value = this.lightPosition[0];
        this.elements.lightYSlider.value = this.lightPosition[1];
        this.elements.lightZSlider.value = this.lightPosition[2];
        this.elements.lightXValue.textContent = this.lightPosition[0].toFixed(1);
        this.elements.lightYValue.textContent = this.lightPosition[1].toFixed(1);
        this.elements.lightZValue.textContent = this.lightPosition[2].toFixed(1);
    }
    
    updateLightPosition() {
        if (!this.currentGestureData) return;
        
        // Update 3D scene
        this.scene3d.updateLightPosition(this.lightPosition);
        
        // Recompute simulation with new light position
        this.recomputeSimulation();
    }
    
    recomputeSimulation() {
        if (!this.currentGestureData) return;
        
        console.log(`Recomputing with model: ${this.currentModel}, light: ${this.lightPosition}`);
        
        // Simulate with current settings
        const result = simulateSolarPower(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            this.currentModel,
            this.lightPosition,
            this.currentGestureData.light_source.diameter
        );
        
        let scaledPower;
        
        // Different scaling for custom vs real trajectories
        if (this.currentGestureData.name === 'Custom') {
            // For custom, scale to a reasonable power range (20-80 μW)
            const minPower = Math.min(...result.power);
            const maxPower = Math.max(...result.power);
            const range = maxPower - minPower;
            
            if (range > 0) {
                const normalized = result.power.map(p => (p - minPower) / range);
                scaledPower = normalized.map(p => (20 + p * 60) * 1e-6);
            } else {
                scaledPower = result.power.map(() => 50 * 1e-6);
            }
        } else {
            // For real gestures, scale to match real power range
            scaledPower = applyPerSegmentScaling(
                result.power,
                this.currentGestureData.real_power
            );
        }
        
        // Update current gesture data with new simulation
        this.currentGestureData.current_sim = scaledPower;
        this.currentGestureData.current_a = result.a_values;
        this.currentGestureData.current_H = result.H_values;
        
        // Update 3D trajectory with new power colors
        this.scene3d.setTrajectory(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            scaledPower  // Use new simulated power for color coding
        );
        
        // Update chart
        const isCustom = this.currentGestureData.name === 'Custom';
        this.powerChart.updateData(
            isCustom ? scaledPower : this.currentGestureData.real_power,
            scaledPower,
            this.currentGestureData.sampling_rate,
            this.lightPositionModified && !isCustom,
            isCustom
        );
        
        // Update metrics (hide if light position modified)
        this.updateMetrics();
        
        // Update current state display
        if (this.currentFrame < this.currentGestureData.num_samples) {
            this.updateStateDisplay(this.currentFrame);
        }
    }
    
    updateVisualization() {
        if (!this.currentGestureData) return;
        
        // Use pre-computed simulation from JSON or recompute based on model
        let simulatedPower;
        if (this.currentModel === 'oriented') {
            simulatedPower = this.currentGestureData.sim_oriented;
        } else {
            simulatedPower = this.currentGestureData.sim_parallel;
        }
        
        // Store for current use
        this.currentGestureData.current_sim = simulatedPower;
        
        // Update 3D scene
        this.scene3d.setTrajectory(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            this.currentGestureData.real_power
        );
        
        // Update chart
        this.powerChart.updateData(
            this.currentGestureData.real_power,
            simulatedPower,
            this.currentGestureData.sampling_rate,
            this.lightPositionModified
        );
        
        // Update metrics
        this.updateMetrics();
    }
    
    updateMetrics() {
        if (!this.currentGestureData) return;
        
        // Hide metrics if light position is modified or no real power data (custom trajectory)
        if (this.lightPositionModified || !this.currentGestureData.real_power) {
            this.elements.metricRmse.style.display = 'none';
            this.elements.metricR2.style.display = 'none';
            this.elements.metricCorr.style.display = 'none';
            return;
        }
        
        // Show metrics
        this.elements.metricRmse.style.display = 'inline-block';
        this.elements.metricR2.style.display = 'inline-block';
        this.elements.metricCorr.style.display = 'inline-block';
        
        const real = this.currentGestureData.real_power;
        const sim = this.currentGestureData.current_sim;
        
        const rmse = calculateRMSE(real, sim) * 1e6; // Convert to μW
        const r2 = calculateR2(real, sim);
        const corr = calculateCorrelation(real, sim);

        this.elements.metricRmse.textContent = `RMSE: ${rmse.toFixed(2)} μW`;
        this.elements.metricRmse.style.opacity = '1';
        this.elements.metricR2.textContent = `R²: ${r2.toFixed(3)}`;
        this.elements.metricR2.style.opacity = '1';
        this.elements.metricCorr.textContent = `ρ: ${corr.toFixed(3)}`;
        this.elements.metricCorr.style.opacity = '1';
    }
    
    updateStateDisplay(index) {
        if (!this.currentGestureData || index >= this.currentGestureData.num_samples) return;
        
        const pos = this.currentGestureData.positions[index];
        const normal = this.currentGestureData.normals[index];
        const power = this.currentGestureData.current_sim[index];
        
        // Calculate a and H
        const a = this.currentGestureData.current_a ? 
                  this.currentGestureData.current_a[index] :
                  Math.sqrt(
                      Math.pow(this.lightPosition[0] - pos[0], 2) +
                      Math.pow(this.lightPosition[2] - pos[2], 2)
                  );
        
        const H = this.currentGestureData.current_H ?
                  this.currentGestureData.current_H[index] :
                  this.lightPosition[1] - pos[1];
        
        // Calculate theta (angle between normal and upward vector)
        const cellNormal = [-normal[0], -normal[1], -normal[2]];
        const vecToLight = [
            this.lightPosition[0] - pos[0],
            this.lightPosition[1] - pos[1],
            this.lightPosition[2] - pos[2]
        ];
        
        const dot = cellNormal[0] * vecToLight[0] + 
                   cellNormal[1] * vecToLight[1] + 
                   cellNormal[2] * vecToLight[2];
        
        const normCellNormal = Math.sqrt(
            cellNormal[0] ** 2 + cellNormal[1] ** 2 + cellNormal[2] ** 2
        );
        
        const normVecToLight = Math.sqrt(
            vecToLight[0] ** 2 + vecToLight[1] ** 2 + vecToLight[2] ** 2
        );
        
        const cosTheta = dot / (normCellNormal * normVecToLight);
        const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);
        
        // Update display
        this.elements.stateA.textContent = a.toFixed(1);
        this.elements.stateH.textContent = H.toFixed(1);
        this.elements.stateTheta.textContent = theta.toFixed(1);
        this.elements.statePower.textContent = (power * 1e6).toFixed(2);
    }
    
    play() {
        if (this.isPlaying) return;
        
        this.isPlaying = true;
        this.elements.playBtn.disabled = true;
        this.elements.pauseBtn.disabled = false;
        
        // Sync mobile buttons
        const mobilePlayBtn = document.getElementById('mobile-play-btn');
        const mobilePauseBtn = document.getElementById('mobile-pause-btn');
        if (mobilePlayBtn) mobilePlayBtn.disabled = true;
        if (mobilePauseBtn) mobilePauseBtn.disabled = false;
        
        this.animate();
    }
    
    pause() {
        this.isPlaying = false;
        this.elements.playBtn.disabled = false;
        this.elements.pauseBtn.disabled = true;
        
        // Sync mobile buttons
        const mobilePlayBtn = document.getElementById('mobile-play-btn');
        const mobilePauseBtn = document.getElementById('mobile-pause-btn');
        if (mobilePlayBtn) mobilePlayBtn.disabled = false;
        if (mobilePauseBtn) mobilePauseBtn.disabled = true;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    reset() {
        this.pause();
        this.currentFrame = 0;
        this.updateFrame();
    }
    
    animate() {
        if (!this.isPlaying || !this.currentGestureData) return;
        
        // Use slower speed for custom trajectories
        const speed = this.currentGestureData.name === 'Custom' ? 
                      this.animationSpeed * this.customAnimationSpeed : 
                      this.animationSpeed;
        
        this.currentFrame += speed;
        
        if (this.currentFrame >= this.currentGestureData.num_samples) {
            this.currentFrame = 0; // Loop
        }
        
        this.updateFrame();
        
        // Schedule next frame (60 FPS base rate)
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    updateFrame() {
        if (!this.currentGestureData) return;
        
        const index = Math.floor(this.currentFrame);
        
        // Update 3D scene
        this.scene3d.updateHandPosition(index);
        
        // Update chart cursor and window
        if (this.animateChartWithTrajectory && this.isPlaying) {
            // Animate chart with moving window
            this.powerChart.animateToCurrentIndex(
                index, 
                this.currentGestureData.sampling_rate,
                this.currentGestureData.num_samples
            );
        } else {
            // Just update cursor position
            this.powerChart.setCurrentIndex(index, this.currentGestureData.sampling_rate);
        }
        
        // Update progress bar
        const progress = (index / this.currentGestureData.num_samples) * 100;
        this.elements.progressBar.style.width = `${progress}%`;
        
        // Update state display
        this.updateStateDisplay(index);
    }
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    new SolarTrackDemo();
});

