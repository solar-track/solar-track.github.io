/**
 * SolarTrack Radiometric Simulator - Power Chart
 * 
 * Chart.js visualization for real vs simulated power comparison.
 * 
 * Reference:
 *   Ghalwash, Y., Khamis, A., Sandhu, M., Khalifa, S., & Jurdak, R. (2026).
 *   "SolarTrack: Exploring the Continuous Tracking Capabilities of Wearable
 *   Solar Harvesters". In Proc. IEEE PerCom 2026.
 * 
 * Correspondence:
 *   Abdelwahed Khamis - https://abdelwahed.github.io
 * 
 * License: MIT
 */

import { Chart, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

export class PowerChart {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.chart = null;
        this.timeCursorPlugin = null;
        this.resetZoomBtn = null;
        
        this.init();
        this.setupResetZoomButton();
    }
    
    init() {
        // Create custom plugin for time cursor
        this.timeCursorPlugin = {
            id: 'timeCursor',
            afterDraw: (chart, args, options) => {
                if (options.currentIndex !== undefined && options.currentIndex !== null) {
                    const ctx = chart.ctx;
                    const xAxis = chart.scales.x;
                    const yAxis = chart.scales.y;
                    
                    const x = xAxis.getPixelForValue(options.currentIndex);
                    
                    // Draw vertical line
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, yAxis.top);
                    ctx.lineTo(x, yAxis.bottom);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                    ctx.setLineDash([5, 5]);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        };
        
        const ctx = this.canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Real',
                        data: [],
                        borderColor: '#603913',
                        backgroundColor: 'rgba(96, 57, 19, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1
                    },
                    {
                        label: 'Simulated',
                        data: [],
                        borderColor: '#F7941D',
                        backgroundColor: 'rgba(247, 148, 29, 0.1)',
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    },
                    title: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} μW`;
                            }
                        }
                    },
                    timeCursor: {
                        currentIndex: null
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        title: {
                            display: true,
                            text: 'Time (s)',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Power (μW)',
                            font: {
                                size: 13,
                                weight: 'bold'
                            }
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            },
            plugins: [this.timeCursorPlugin]
        });
    }
    
    updateData(realPower, simulatedPower, samplingRate = 100, fadeRealData = false, isCustomMode = false) {
        // Use simulated power for time points if real power is not available
        const numPoints = simulatedPower ? simulatedPower.length : 0;
        const timePoints = Array.from({ length: numPoints }, (_, i) => i / samplingRate);
        
        // Convert to microWatts
        const simPowerMicroW = simulatedPower ? simulatedPower.map(p => p * 1e6) : [];
        const realPowerMicroW = realPower ? realPower.map(p => p * 1e6) : [];
        
        console.log('Chart update:', {
            hasRealPower: realPower !== null,
            isCustomMode,
            realPowerRange: realPowerMicroW.length > 0 ? [Math.min(...realPowerMicroW), Math.max(...realPowerMicroW)] : null,
            simPowerRange: simPowerMicroW.length > 0 ? [Math.min(...simPowerMicroW), Math.max(...simPowerMicroW)] : null,
            numPoints: numPoints
        });
        
        // Update chart data
        this.chart.data.labels = timePoints;
        this.chart.data.datasets[0].data = realPowerMicroW;
        this.chart.data.datasets[1].data = simPowerMicroW;
        
        // Hide real data if not available, in custom mode, or uploaded file
        console.log('Chart visibility decision:', {
            isCustomMode,
            hasRealPower: !!realPower,
            realPowerLength: realPower?.length,
            willHide: isCustomMode || !realPower
        });
        
        if (isCustomMode || !realPower) {
            this.chart.data.datasets[0].hidden = true;
            if (isCustomMode) {
                this.chart.data.datasets[1].label = 'Simulated (Custom)';
            } else {
                this.chart.data.datasets[1].label = 'Simulated (Uploaded)';
            }
        } else {
            this.chart.data.datasets[0].hidden = false;
            this.chart.data.datasets[1].label = 'Simulated';
            console.log('✓ Real power curve will be VISIBLE');
            
            // Fade real data if requested
            if (fadeRealData) {
                this.chart.data.datasets[0].borderColor = 'rgba(96, 57, 19, 0.3)';
                this.chart.data.datasets[0].backgroundColor = 'rgba(96, 57, 19, 0.05)';
                this.chart.data.datasets[0].borderWidth = 1;
            } else {
                this.chart.data.datasets[0].borderColor = '#603913';
                this.chart.data.datasets[0].backgroundColor = 'rgba(96, 57, 19, 0.1)';
                this.chart.data.datasets[0].borderWidth = 2;
            }
        }
        
        this.chart.update('none'); // No animation for performance
    }
    
    setCurrentIndex(index, samplingRate = 100) {
        // Convert index to time (seconds)
        const currentTime = index / samplingRate;
        this.chart.options.plugins.timeCursor.currentIndex = currentTime;
        this.chart.update('none');
    }
    
    setXAxisRange(minTime, maxTime) {
        this.chart.options.scales.x.min = minTime;
        this.chart.options.scales.x.max = maxTime;
        this.chart.update('none');
    }
    
    resetXAxisRange() {
        this.chart.options.scales.x.min = undefined;
        this.chart.options.scales.x.max = undefined;
        this.chart.update('none');
    }
    
    animateToCurrentIndex(index, samplingRate = 100, totalSamples) {
        // Convert index to time (seconds)
        const currentTime = index / samplingRate;
        const totalTime = totalSamples / samplingRate;
        const windowSize = 2.0; // Show ±2 seconds window
        
        // Calculate window bounds
        let minTime = currentTime - windowSize;
        let maxTime = currentTime + windowSize;
        
        // Ensure we don't go beyond data bounds
        if (minTime < 0) {
            minTime = 0;
            maxTime = Math.min(windowSize * 2, totalTime);
        }
        if (maxTime > totalTime) {
            maxTime = totalTime;
            minTime = Math.max(0, totalTime - windowSize * 2);
        }
        
        this.chart.options.scales.x.min = minTime;
        this.chart.options.scales.x.max = maxTime;
        this.chart.options.plugins.timeCursor.currentIndex = currentTime;
        
        this.chart.update('none');
    }
    
    clearCursor() {
        this.chart.options.plugins.timeCursor.currentIndex = null;
        this.chart.update('none');
    }
    
    setupResetZoomButton() {
        this.resetZoomBtn = document.getElementById('reset-zoom-btn');
        if (this.resetZoomBtn) {
            this.resetZoomBtn.addEventListener('click', () => this.resetZoom());
        }
    }
    
    resetZoom() {
        // Reset both axes to show full data range
        this.chart.options.scales.x.min = undefined;
        this.chart.options.scales.x.max = undefined;
        this.chart.options.scales.y.min = undefined;
        this.chart.options.scales.y.max = undefined;
        this.chart.update('none'); // No animation to avoid showing data points
        console.log('Chart zoom reset');
    }
    
    dispose() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

