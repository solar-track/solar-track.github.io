/**
 * main.js
 * 
 * Main application entry point.
 * Coordinates all modules and handles user interactions.
 */

import { Scene3D } from './scene3d.js';
import { PowerChart } from './chart.js';
import { DrawingHandler } from './drawingHandler.js';
import { CSVUploader } from './csvUploader.js';
import {
    simulateSolarPower,
    applyPerSegmentScaling,
    calculateKappa,
    applyKappaScaling,
    calculateKappaFromPhysics,
    calculateRMSE,
    calculateR2,
    calculateCorrelation,
    CONSTANTS
} from './simulator.js';
import { 
    simulateSolarPowerExact, 
    updateSettings as updateExactSettings, 
    resetSettings as resetExactSettings,
    getSettings as getExactSettings,
    getIntegrationInfo,
    DEFAULT_INTEGRATION_R,
    DEFAULT_INTEGRATION_PHI
} from './simulator_exact.js';

class SolarTrackDemo {
    constructor() {
        // Core components
        this.scene3d = null;
        this.powerChart = null;
        this.drawingHandler = null;
        this.csvUploader = null;
        
        // Data
        this.currentGestureData = null;
        this.uploadedGestureCache = null; // Cache for uploaded CSV data
        this.currentModel = 'oriented';
        this.currentAccuracy = 'fast'; // 'fast' (approximate) or 'exact' (Eq. A.4)
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
        
        // Initialize CSV uploader
        this.csvUploader = new CSVUploader(this);
        console.log('✓ CSV Uploader initialized');
        
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
            modelRadios: document.querySelectorAll('input[name="model"]'),
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
            metricCorr: document.getElementById('metric-corr'),
            exportCsvBtn: document.getElementById('export-csv-btn'),
            // Settings modal elements
            settingsBtn: document.getElementById('settings-btn'),
            settingsModal: document.getElementById('settings-modal'),
            settingsModalClose: document.getElementById('settings-modal-close'),
            settingsAccuracyFast: document.getElementById('settings-accuracy-fast'),
            settingsAccuracyExact: document.getElementById('settings-accuracy-exact'),
            settingsLightDiameter: document.getElementById('settings-light-diameter'),
            settingsGridRadial: document.getElementById('settings-grid-radial'),
            settingsGridAngular: document.getElementById('settings-grid-angular'),
            settingsIntegrationPoints: document.getElementById('settings-integration-points'),
            settingsEstimatedTime: document.getElementById('settings-estimated-time'),
            settingsIntegrationSection: document.getElementById('settings-integration-section'),
            settingsColorThreshold: document.getElementById('settings-color-threshold'),
            settingsAccuracyNote: document.getElementById('settings-accuracy-note'),
            settingsResetBtn: document.getElementById('settings-reset-btn'),
            settingsCancelBtn: document.getElementById('settings-cancel-btn'),
            settingsApplyBtn: document.getElementById('settings-apply-btn')
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
                this.updateAccuracyVisibility();
                this.recomputeSimulation();
            });
        });
        
        // Settings modal
        this.setupSettingsModal();
        
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
        
        // Export CSV button
        this.elements.exportCsvBtn.addEventListener('click', () => this.exportPowerTraceCSV());
        
        // Info icon tooltips
        this.setupTooltips();
        
        // Header buttons (URLs can be updated later)
        this.setupHeaderButtons();
        
        // Kappa configuration modal
        this.setupKappaModal();
        
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
        // Paper button - shows placeholder until paper URL is set
        const paperBtn = document.getElementById('paper-btn');
        if (paperBtn && paperBtn.getAttribute('href') === '#') {
            paperBtn.addEventListener('click', (e) => {
                e.preventDefault();
                alert('Paper link coming soon!\nThe camera-ready version will be linked here.');
            });
        }
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
    
    updateAccuracyVisibility() {
        // Exact mode only applies to Orientation Aware model
        // Force fast mode if parallel is selected and exact was chosen
        if (this.currentModel === 'parallel' && this.currentAccuracy === 'exact') {
            this.currentAccuracy = 'fast';
            console.log('Switched to fast mode (exact not available for Parallel Disk model)');
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
        
        // Check if this is an uploaded file - restore from cache
        if (gestureName === 'Uploaded') {
            if (this.uploadedGestureCache) {
                console.log('Restoring uploaded gesture from cache...');
                this.loadUploadedGesture(this.uploadedGestureCache);
                return;
            } else {
                alert('Uploaded data not found. Please upload the file again.');
                return;
            }
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
        
        // Determine which simulator to use
        const useExact = this.currentAccuracy === 'exact' && this.currentModel === 'oriented';
        
        // Get effective diameter - use settings override if set, otherwise gesture's diameter
        const exactSettings = getExactSettings();
        const effectiveDiameter = exactSettings.lightDiameterOverride !== null 
            ? exactSettings.lightDiameterOverride 
            : this.currentGestureData.light_source.diameter;
        
        console.log(`Recomputing with model: ${this.currentModel}, accuracy: ${this.currentAccuracy}, useExact: ${useExact}, light: ${this.lightPosition}, diameter: ${effectiveDiameter}mm`);
        
        // Simulate with current settings - use exact or approximate based on accuracy mode
        let result;
        if (useExact) {
            console.log('🔬 Using EXACT simulator (Eq. A.4)...');
            const startTime = performance.now();
            result = simulateSolarPowerExact(
                this.currentGestureData.positions,
                this.currentGestureData.normals,
                this.lightPosition,
                effectiveDiameter,
                this.currentModel
            );
            const elapsed = performance.now() - startTime;
            console.log(`🔬 Exact simulation completed in ${elapsed.toFixed(1)}ms`);
        } else {
            result = simulateSolarPower(
                this.currentGestureData.positions,
                this.currentGestureData.normals,
                this.currentModel,
                this.lightPosition,
                effectiveDiameter
            );
        }
        
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
        } else if (this.currentGestureData.scaling_method === 'kappa' && this.currentGestureData.kappa) {
            // For uploaded files with kappa scaling, apply kappa to new view factors
            scaledPower = applyKappaScaling(result.power, this.currentGestureData.kappa);
            console.log(`✓ Applied κ = ${this.currentGestureData.kappa.toExponential(3)} to recomputed simulation`);
            
            // Update raw view factors for this model
            if (this.currentModel === 'oriented') {
                this.currentGestureData.raw_view_factors_oriented = result.power;
            } else {
                this.currentGestureData.raw_view_factors_parallel = result.power;
            }
        } else {
            // For preset gestures or uploaded without kappa, scale to match real power range
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
    
    loadUploadedGesture(gestureData) {
        console.log(`Loading uploaded gesture: ${gestureData.name} (${gestureData.positions.length} samples)`);
        
        // Cache the uploaded gesture data for later restoration
        this.uploadedGestureCache = gestureData;
        
        this.pause();
        
        // Prepare gesture data in the format expected by the app
        const numSamples = gestureData.positions.length;
        const samplingRate = gestureData.timestamps 
            ? 1.0 / (gestureData.timestamps[1] - gestureData.timestamps[0])
            : 30.0; // Default 30 fps
        
        // Simulate with current model - use exact if selected for oriented model
        const useExact = this.currentAccuracy === 'exact';
        let resultOriented;
        
        if (useExact) {
            console.log('🔬 Using EXACT simulator for uploaded gesture...');
            const startTime = performance.now();
            resultOriented = simulateSolarPowerExact(
                gestureData.positions,
                gestureData.normals,
                this.lightPosition,
                CONSTANTS.SOURCE_DIAMETER,
                'oriented'
            );
            console.log(`🔬 Exact simulation completed in ${(performance.now() - startTime).toFixed(1)}ms`);
        } else {
            resultOriented = simulateSolarPower(
                gestureData.positions,
                gestureData.normals,
                'oriented',
                this.lightPosition,
                CONSTANTS.SOURCE_DIAMETER
            );
        }
        
        // Parallel model doesn't benefit from exact integration
        const resultParallel = simulateSolarPower(
            gestureData.positions,
            gestureData.normals,
            'parallel',
            this.lightPosition,
            CONSTANTS.SOURCE_DIAMETER
        );
        
        // Scale power: Use κ-based scaling for uploaded files with real power
        let scaledOriented, scaledParallel, kappa, kappaSource, scalingMethod;
        
        if (gestureData.real_power && gestureData.real_power.length === numSamples) {
            // Calculate κ using least squares
            kappa = calculateKappa(resultOriented.power, gestureData.real_power);
            console.log(`✓ Calculated κ = ${kappa.toExponential(3)} for ${gestureData.name}`);
            
            // Apply κ scaling
            scaledOriented = applyKappaScaling(resultOriented.power, kappa);
            scaledParallel = applyKappaScaling(resultParallel.power, kappa);
            
            kappaSource = 'calculated';
            scalingMethod = 'kappa';
        } else {
            // Scale to reasonable range (20-80 μW) if no real power data
            const scaleToRange = (power) => {
                const minP = Math.min(...power);
                const maxP = Math.max(...power);
                const range = maxP - minP;
                if (range > 0) {
                    return power.map(p => ((p - minP) / range) * 60 + 20).map(p => p * 1e-6);
                }
                return power.map(() => 50 * 1e-6);
            };
            
            scaledOriented = scaleToRange(resultOriented.power);
            scaledParallel = scaleToRange(resultParallel.power);
            
            kappa = null;
            kappaSource = null;
            scalingMethod = 'range';
        }
        
        // Create full gesture data object
        this.currentGestureData = {
            name: gestureData.name,
            positions: gestureData.positions,
            normals: gestureData.normals,
            real_power: gestureData.real_power, // May be null
            sim_oriented: scaledOriented,
            sim_parallel: scaledParallel,
            current_sim: scaledOriented,
            current_a: resultOriented.a_values,
            current_H: resultOriented.H_values,
            num_samples: numSamples,
            sampling_rate: samplingRate,
            timestamps: gestureData.timestamps,
            light_source: {
                position: [...this.lightPosition],
                diameter: CONSTANTS.SOURCE_DIAMETER
            },
            kappa: kappa,                    // Scaling factor (null if not used)
            kappa_source: kappaSource,       // 'calculated', 'manual', 'physics', or null
            scaling_method: scalingMethod,   // 'kappa' or 'range'
            raw_view_factors_oriented: resultOriented.power,  // Store for recalculation
            raw_view_factors_parallel: resultParallel.power,
            isUploaded: true
        };
        
        // Update gesture selector to show "Uploaded"
        const gestureSelect = document.getElementById('gesture-select');
        const mobileGestureSelect = document.getElementById('mobile-gesture-select');
        
        // Add "Uploaded" option if not exists
        if (!gestureSelect.querySelector('option[value="Uploaded"]')) {
            const option = document.createElement('option');
            option.value = 'Uploaded';
            option.textContent = gestureData.name;
            gestureSelect.appendChild(option);
            
            const mobileOption = option.cloneNode(true);
            mobileGestureSelect.appendChild(mobileOption);
        } else {
            // Update existing option text
            gestureSelect.querySelector('option[value="Uploaded"]').textContent = gestureData.name;
            mobileGestureSelect.querySelector('option[value="Uploaded"]').textContent = gestureData.name;
        }
        
        gestureSelect.value = 'Uploaded';
        mobileGestureSelect.value = 'Uploaded';
        
        // Re-enable orientation-aware model for uploaded data
        document.getElementById('model-oriented').disabled = false;
        
        // Update 3D visualization
        this.scene3d.setTrajectory(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            this.currentGestureData.current_sim
        );
        
        // Update chart - Show real power if available in uploaded file
        console.log('Chart update for uploaded file:', {
            hasRealPower: this.currentGestureData.real_power !== null,
            realPowerLength: this.currentGestureData.real_power?.length,
            realPowerSample: this.currentGestureData.real_power?.slice(0, 3),
            simLength: this.currentGestureData.current_sim?.length
        });
        this.powerChart.updateData(
            this.currentGestureData.real_power, // Show real power if available
            this.currentGestureData.current_sim,
            this.currentGestureData.sampling_rate,
            false, // No fade
            false // Not custom
        );
        
        // Update metrics (will be hidden since no real power shown)
        this.updateMetrics();
        
        // Reset animation
        this.currentFrame = 0;
        this.updateFrame();
        
        console.log('✓ Uploaded gesture loaded successfully');
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
        
        // Update κ display (only for uploaded files with kappa scaling)
        const kappaItem = document.getElementById('kappa-state-item');
        const kappaValue = document.getElementById('state-kappa');
        
        if (this.currentGestureData.kappa !== null && this.currentGestureData.kappa !== undefined &&
            this.currentGestureData.scaling_method === 'kappa') {
            kappaItem.style.display = 'flex';
            kappaValue.textContent = this.currentGestureData.kappa.toExponential(2);
        } else {
            kappaItem.style.display = 'none';
        }
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
        
        // Start trajectory drawing from current position
        this.scene3d.setPlayState(true);
        
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
        
        // Keep partial trajectory visible when paused
        // (don't call setPlayState(false) to preserve current draw state)
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    reset() {
        this.pause();
        this.currentFrame = 0;
        
        // Show full trajectory when reset
        this.scene3d.resetTrajectory();
        
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
    
    exportPowerTraceCSV() {
        if (!this.currentGestureData) {
            alert('No data to export. Please load a gesture or upload motion capture data first.');
            return;
        }
        
        console.log('Exporting power trace CSV...');
        
        const data = this.currentGestureData;
        const numSamples = data.num_samples;
        
        // Generate timestamps
        let timestamps;
        if (data.timestamps && data.timestamps.length === numSamples) {
            // Use original timestamps from uploaded file or JSON
            timestamps = data.timestamps;
        } else {
            // Generate timestamps based on sampling rate
            const dt = 1.0 / data.sampling_rate;
            timestamps = Array.from({ length: numSamples }, (_, i) => i * dt);
        }
        
        // Build CSV content
        let csvContent = '';
        
        // Add metadata header
        csvContent += `# SolarTrack Power Trace Export\n`;
        csvContent += `# Gesture: ${data.name}\n`;
        csvContent += `# Model: ${this.currentModel === 'oriented' ? 'Orientation-aware' : 'Parallel disk'}\n`;
        csvContent += `# Light position (mm): [${this.lightPosition.map(v => v.toFixed(1)).join(', ')}]\n`;
        
        // Add κ metadata if available (for uploaded files with kappa scaling)
        if (data.kappa !== null && data.kappa !== undefined && data.scaling_method === 'kappa') {
            csvContent += `# Scaling factor kappa: ${data.kappa.toExponential(6)}\n`;
            csvContent += `# Kappa source: ${data.kappa_source}\n`;
            csvContent += `# Scaling method: ${data.scaling_method}\n`;
        }
        
        csvContent += `# \n`;
        
        // Add header row
        csvContent += 'timestamp,simulated_power_W,a_mm,H_mm';
        
        // Add theta column only if orientation-aware model
        if (this.currentModel === 'oriented') {
            csvContent += ',theta_deg';
        }
        
        csvContent += '\n';
        
        // Add data rows
        for (let i = 0; i < numSamples; i++) {
            const time = timestamps[i];
            const power = data.current_sim[i];
            const a = data.current_a ? data.current_a[i] : 0;
            const H = data.current_H ? data.current_H[i] : 0;
            
            csvContent += `${time.toFixed(6)},${power.toExponential(6)},${a.toFixed(2)},${H.toFixed(2)}`;
            
            // Add theta if orientation-aware
            if (this.currentModel === 'oriented') {
                const pos = data.positions[i];
                const normal = data.normals[i];
                const cellNormal = [-normal[0], -normal[1], -normal[2]];
                const vecToLight = [
                    this.lightPosition[0] - pos[0],
                    this.lightPosition[1] - pos[1],
                    this.lightPosition[2] - pos[2]
                ];
                
                const dot = cellNormal[0] * vecToLight[0] + 
                           cellNormal[1] * vecToLight[1] + 
                           cellNormal[2] * vecToLight[2];
                const magNormal = Math.sqrt(cellNormal[0]**2 + cellNormal[1]**2 + cellNormal[2]**2);
                const magVec = Math.sqrt(vecToLight[0]**2 + vecToLight[1]**2 + vecToLight[2]**2);
                
                const cosTheta = dot / (magNormal * magVec);
                const theta = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);
                
                csvContent += `,${theta.toFixed(2)}`;
            }
            
            csvContent += '\n';
        }
        
        // Create filename
        const gestureName = data.name.replace(/[^a-z0-9]/gi, '_');
        const modelName = this.currentModel === 'oriented' ? 'oriented' : 'parallel';
        const filename = `power_trace_${gestureName}_${modelName}.csv`;
        
        // Download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`✓ Exported ${numSamples} samples to ${filename}`);
    }
    
    setupKappaModal() {
        this.kappaModal = document.getElementById('kappa-modal');
        this.kappaEditBtn = document.getElementById('kappa-edit-btn');
        
        if (!this.kappaModal || !this.kappaEditBtn) {
            console.warn('Kappa modal elements not found');
            return;
        }
        
        // Open modal
        this.kappaEditBtn.addEventListener('click', () => this.openKappaModal());
        
        // Close modal
        document.getElementById('kappa-modal-close').addEventListener('click', () => this.closeKappaModal());
        document.getElementById('kappa-cancel-btn').addEventListener('click', () => this.closeKappaModal());
        
        // Close on background click
        this.kappaModal.addEventListener('click', (e) => {
            if (e.target === this.kappaModal) {
                this.closeKappaModal();
            }
        });
        
        // Radio button toggle
        document.querySelectorAll('input[name="kappa-method"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.handleKappaMethodChange(e.target.value);
            });
        });
        
        // Calculate physics button
        document.getElementById('calculate-physics-btn').addEventListener('click', () => {
            this.calculatePhysicsKappa();
        });
        
        // Apply button
        document.getElementById('kappa-apply-btn').addEventListener('click', () => this.applyKappa());
    }
    
    handleKappaMethodChange(method) {
        const manualGroup = document.getElementById('manual-kappa-group');
        const physicsGroup = document.getElementById('physics-kappa-group');
        const calculatedInfo = document.getElementById('calculated-kappa-info');
        
        manualGroup.style.display = method === 'manual' ? 'block' : 'none';
        physicsGroup.style.display = method === 'physics' ? 'block' : 'none';
        calculatedInfo.style.display = method === 'calculated' ? 'block' : 'none';
    }
    
    openKappaModal() {
        if (!this.currentGestureData || this.currentGestureData.kappa === null || this.currentGestureData.kappa === undefined) {
            alert('κ configuration is only available for uploaded motion capture files with real power data.');
            return;
        }
        
        // Populate modal with current values
        document.getElementById('modal-current-kappa').textContent = 
            this.currentGestureData.kappa.toExponential(3);
        
        const sourceMap = {
            'calculated': 'Calculated from real data',
            'manual': 'Manually entered',
            'physics': 'Calculated from physical parameters'
        };
        document.getElementById('modal-kappa-source').textContent = 
            sourceMap[this.currentGestureData.kappa_source] || 'Unknown';
        
        // Show calculated κ info
        document.getElementById('calculated-kappa-value').textContent = 
            this.currentGestureData.kappa.toExponential(3);
        
        if (this.currentGestureData.real_power) {
            const rmse = calculateRMSE(this.currentGestureData.real_power, this.currentGestureData.current_sim) * 1e6;
            document.getElementById('calculated-rmse-value').textContent = rmse.toFixed(2);
        }
        
        // Reset radio to calculated
        document.getElementById('kappa-use-calculated').checked = true;
        this.handleKappaMethodChange('calculated');
        
        this.kappaModal.style.display = 'flex';
    }
    
    closeKappaModal() {
        this.kappaModal.style.display = 'none';
    }
    
    calculatePhysicsKappa() {
        const efficiency = parseFloat(document.getElementById('physics-efficiency').value) / 100; // Convert % to decimal
        const area = parseFloat(document.getElementById('physics-area').value) * 1e-4; // Convert cm² to m²
        const power = parseFloat(document.getElementById('physics-power').value);
        
        if (isNaN(efficiency) || isNaN(area) || isNaN(power) || efficiency <= 0 || area <= 0 || power <= 0) {
            alert('Please enter valid positive numbers for all parameters.');
            return;
        }
        
        const kappa = calculateKappaFromPhysics(efficiency, area, power);
        document.getElementById('physics-kappa-result').textContent = kappa.toExponential(3);
        
        console.log(`Calculated κ from physics: ${kappa.toExponential(3)}`);
    }
    
    applyKappa() {
        const method = document.querySelector('input[name="kappa-method"]:checked').value;
        let newKappa;
        
        if (method === 'calculated') {
            // Keep current calculated kappa
            newKappa = this.currentGestureData.kappa;
            this.currentGestureData.kappa_source = 'calculated';
        } else if (method === 'manual') {
            const input = document.getElementById('manual-kappa-input').value;
            newKappa = parseFloat(input);
            
            if (isNaN(newKappa) || newKappa <= 0) {
                alert('Please enter a valid positive number (e.g., 2.45e-4)');
                return;
            }
            
            this.currentGestureData.kappa = newKappa;
            this.currentGestureData.kappa_source = 'manual';
        } else if (method === 'physics') {
            const resultText = document.getElementById('physics-kappa-result').textContent;
            if (resultText === '0.0') {
                alert('Please click "Calculate" first to compute κ from physical parameters.');
                return;
            }
            
            newKappa = parseFloat(resultText);
            this.currentGestureData.kappa = newKappa;
            this.currentGestureData.kappa_source = 'physics';
        }
        
        console.log(`Applying new κ = ${this.currentGestureData.kappa.toExponential(3)} (${this.currentGestureData.kappa_source})`);
        
        // Re-apply scaling and update visualization
        this.reapplyKappaScaling();
        this.closeKappaModal();
    }
    
    reapplyKappaScaling() {
        if (!this.currentGestureData || !this.currentGestureData.kappa) return;
        
        // Use stored raw view factors
        const rawViewFactors = this.currentModel === 'oriented' 
            ? this.currentGestureData.raw_view_factors_oriented
            : this.currentGestureData.raw_view_factors_parallel;
        
        // Apply new kappa
        const scaledPower = applyKappaScaling(rawViewFactors, this.currentGestureData.kappa);
        
        this.currentGestureData.current_sim = scaledPower;
        
        // Update both sim arrays
        if (this.currentModel === 'oriented') {
            this.currentGestureData.sim_oriented = scaledPower;
        } else {
            this.currentGestureData.sim_parallel = scaledPower;
        }
        
        // Update visualization
        this.scene3d.setTrajectory(
            this.currentGestureData.positions,
            this.currentGestureData.normals,
            scaledPower
        );
        
        this.powerChart.updateData(
            this.currentGestureData.real_power,
            scaledPower,
            this.currentGestureData.sampling_rate,
            false,
            false
        );
        
        this.updateMetrics();
        this.updateStateDisplay(this.currentFrame);
        
        console.log('✓ Visualization updated with new κ');
    }
    
    // =====================================================
    // Settings Modal
    // =====================================================
    
    setupSettingsModal() {
        const modal = this.elements.settingsModal;
        const btn = this.elements.settingsBtn;
        
        if (!modal || !btn) {
            console.warn('Settings modal elements not found');
            return;
        }
        
        // Open modal
        btn.addEventListener('click', () => this.openSettingsModal());
        
        // Close modal
        this.elements.settingsModalClose.addEventListener('click', () => this.closeSettingsModal());
        this.elements.settingsCancelBtn.addEventListener('click', () => this.closeSettingsModal());
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeSettingsModal();
            }
        });
        
        // Accuracy radio change - show/hide integration section
        const accuracyRadios = document.querySelectorAll('input[name="settings-accuracy"]');
        accuracyRadios.forEach(radio => {
            radio.addEventListener('change', () => this.updateSettingsIntegrationVisibility());
        });
        
        // Grid resolution inputs - update computed values
        this.elements.settingsGridRadial.addEventListener('input', () => this.updateIntegrationStats());
        this.elements.settingsGridAngular.addEventListener('input', () => this.updateIntegrationStats());
        
        // Reset defaults
        this.elements.settingsResetBtn.addEventListener('click', () => this.resetSettingsToDefaults());
        
        // Apply settings
        this.elements.settingsApplyBtn.addEventListener('click', () => this.applySettings());
        
        console.log('✓ Settings modal setup complete');
    }
    
    openSettingsModal() {
        // Populate current values
        if (this.currentAccuracy === 'exact') {
            this.elements.settingsAccuracyExact.checked = true;
        } else {
            this.elements.settingsAccuracyFast.checked = true;
        }
        
        // Light diameter - use current gesture's value or default
        const currentDiameter = this.currentGestureData?.light_source?.diameter || 100;
        const exactSettings = getExactSettings();
        this.elements.settingsLightDiameter.value = exactSettings.lightDiameterOverride || currentDiameter;
        
        // Integration settings
        this.elements.settingsGridRadial.value = exactSettings.integrationResolutionR;
        this.elements.settingsGridAngular.value = exactSettings.integrationResolutionPhi;
        
        // Color threshold for drawing tube
        this.elements.settingsColorThreshold.value = this.scene3d.colorThreshold || 4000;
        
        this.updateSettingsIntegrationVisibility();
        this.updateIntegrationStats();
        
        this.elements.settingsModal.style.display = 'flex';
    }
    
    closeSettingsModal() {
        this.elements.settingsModal.style.display = 'none';
    }
    
    updateSettingsIntegrationVisibility() {
        const isExact = this.elements.settingsAccuracyExact.checked;
        const integrationSection = this.elements.settingsIntegrationSection;
        
        if (integrationSection) {
            integrationSection.style.display = isExact ? 'block' : 'none';
        }
        
        // Show note about exact mode only for oriented model
        if (this.elements.settingsAccuracyNote) {
            this.elements.settingsAccuracyNote.style.display = isExact ? 'flex' : 'none';
        }
    }
    
    updateIntegrationStats() {
        const nR = parseInt(this.elements.settingsGridRadial.value) || 20;
        const nPhi = parseInt(this.elements.settingsGridAngular.value) || 20;
        const totalPoints = nR * nPhi;
        
        this.elements.settingsIntegrationPoints.textContent = totalPoints.toLocaleString();
        
        // Estimate time based on resolution (rough heuristic: ~0.01ms per integration point)
        const estimatedMs = totalPoints * 0.01;
        let timeStr;
        if (estimatedMs < 1) {
            timeStr = '<1ms';
        } else if (estimatedMs < 100) {
            timeStr = `~${estimatedMs.toFixed(0)}ms`;
        } else {
            timeStr = `~${(estimatedMs / 1000).toFixed(1)}s`;
        }
        this.elements.settingsEstimatedTime.textContent = timeStr + ' per sample';
    }
    
    resetSettingsToDefaults() {
        // Reset to default values
        this.elements.settingsAccuracyFast.checked = true;
        this.elements.settingsLightDiameter.value = this.currentGestureData?.light_source?.diameter || 100;
        this.elements.settingsGridRadial.value = DEFAULT_INTEGRATION_R;
        this.elements.settingsGridAngular.value = DEFAULT_INTEGRATION_PHI;
        this.elements.settingsColorThreshold.value = 4000;  // Default color threshold
        
        this.updateSettingsIntegrationVisibility();
        this.updateIntegrationStats();
        
        console.log('⚙️ Settings reset to defaults');
    }
    
    applySettings() {
        // Get values from modal
        const newAccuracy = this.elements.settingsAccuracyExact.checked ? 'exact' : 'fast';
        const newDiameter = parseFloat(this.elements.settingsLightDiameter.value);
        const newGridR = parseInt(this.elements.settingsGridRadial.value);
        const newGridPhi = parseInt(this.elements.settingsGridAngular.value);
        const newColorThreshold = parseInt(this.elements.settingsColorThreshold.value);
        
        // Validate
        if (isNaN(newDiameter) || newDiameter <= 0) {
            alert('Please enter a valid positive light source diameter.');
            return;
        }
        if (isNaN(newGridR) || newGridR < 4 || isNaN(newGridPhi) || newGridPhi < 4) {
            alert('Grid resolution must be at least 4.');
            return;
        }
        if (isNaN(newColorThreshold) || newColorThreshold < 100) {
            alert('Color threshold must be at least 100.');
            return;
        }
        
        // Update accuracy
        const accuracyChanged = this.currentAccuracy !== newAccuracy;
        this.currentAccuracy = newAccuracy;
        
        // Update exact simulator settings
        updateExactSettings({
            integrationResolutionR: newGridR,
            integrationResolutionPhi: newGridPhi,
            lightDiameterOverride: newDiameter
        });
        
        // Update scene color threshold
        this.scene3d.setColorThreshold(newColorThreshold);
        
        // Close modal
        this.closeSettingsModal();
        
        // Recompute simulation with new settings
        this.recomputeSimulation();
        
        console.log(`⚙️ Settings applied: accuracy=${newAccuracy}, diameter=${newDiameter}mm, grid=${newGridR}×${newGridPhi}, colorThreshold=${newColorThreshold}`);
    }
}

// Initialize app when DOM is ready
window.addEventListener('DOMContentLoaded', () => {
    const app = new SolarTrackDemo();
    // Expose app for debugging
    window.solarTrackApp = app;
});

