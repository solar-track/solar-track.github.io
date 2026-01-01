/**
 * SolarTrack Radiometric Simulator - CSV Uploader
 * 
 * Client-side CSV processing for motion capture data.
 * Supports Leap Motion and custom format CSVs.
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

import Papa from 'papaparse';

export class CSVUploader {
    constructor(app) {
        this.app = app;
        this.setupUI();
    }

    setupUI() {
        // Get UI elements
        this.uploadBtn = document.getElementById('upload-csv-btn');
        this.fileInput = document.getElementById('csv-input');
        this.statusDiv = document.getElementById('upload-status');
        this.progressContainer = document.getElementById('upload-progress-container');
        this.progressBar = document.getElementById('upload-progress-bar');
        this.progressText = document.getElementById('upload-progress-text');

        console.log('CSV Uploader UI elements:', {
            uploadBtn: this.uploadBtn,
            fileInput: this.fileInput,
            statusDiv: this.statusDiv,
            progressContainer: this.progressContainer
        });

        if (!this.uploadBtn || !this.fileInput) {
            console.error('CSV upload UI elements not found!');
            return;
        }

        // Event listeners
        this.uploadBtn.addEventListener('click', () => {
            console.log('Upload button clicked');
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            console.log('File selected:', e.target.files[0]);
            this.handleFileSelect(e);
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Show progress bar
        this.showProgress(0);
        this.hideStatus();

        // Simulate progress during file read
        this.updateProgress(10, 'Reading file...');

        // Simulate progress updates
        const progressInterval = setInterval(() => {
            const currentWidth = parseFloat(this.progressBar.style.width) || 0;
            if (currentWidth < 70) {
                this.updateProgress(currentWidth + 10, 'Parsing data...');
            }
        }, 200);

        // Parse CSV
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                clearInterval(progressInterval);
                this.updateProgress(80, 'Processing data...');
                
                console.log('PapaParse results:', {
                    data: results.data,
                    errors: results.errors,
                    meta: results.meta
                });
                
                setTimeout(() => {
                    this.processCSV(results.data, file.name);
                }, 100);
            },
            error: (error) => {
                clearInterval(progressInterval);
                this.hideProgress();
                this.showStatus(`❌ Error parsing CSV: ${error.message}`, 'error');
                console.error('PapaParse error:', error);
            }
        });

        // Reset file input
        event.target.value = '';
    }

    processCSV(data, filename) {
        console.log('Processing CSV:', filename, 'Rows:', data.length);
        console.log('First row sample:', data[0]);
        console.log('Data type:', typeof data, 'Is array:', Array.isArray(data));
        
        try {
            // Detect CSV format and extract data
            const { positions, normals, realPower, timestamps } = this.extractData(data);

            console.log('Extracted data:', {
                positions: positions.length,
                normals: normals.length,
                realPower: realPower,
                realPowerLength: realPower?.length,
                realPowerSample: realPower ? realPower.slice(0, 5) : null,
                timestamps: timestamps.length
            });

            // Validate data
            if (positions.length === 0) {
                throw new Error('No valid data found in CSV');
            }

            if (positions.length < 10) {
                throw new Error('CSV must contain at least 10 samples');
            }

            // Create trajectory data object
            const trajectoryData = {
                name: `Uploaded: ${filename}`,
                positions: positions,
                normals: normals,
                real_power: realPower, // Keep for internal use but don't show in chart
                timestamps: timestamps,
                isUploaded: true
            };

            // Complete progress
            this.updateProgress(100, 'Complete!');
            
            setTimeout(() => {
                this.hideProgress();
                this.showStatus(`✅ Loaded ${positions.length} samples from ${filename}`, 'success');
            }, 500);

            console.log('Calling loadUploadedTrajectory...');
            // Load into app
            this.app.loadUploadedTrajectory(trajectoryData);

        } catch (error) {
            this.hideProgress();
            this.showStatus(`❌ ${error.message}`, 'error');
            console.error('CSV processing error:', error);
            console.error('Error stack:', error.stack);
        }
    }

    extractData(data) {
        const positions = [];
        const normals = [];
        const realPower = [];
        const timestamps = [];

        // Validate data
        if (!data || data.length === 0) {
            throw new Error('CSV file is empty or could not be parsed');
        }

        // Try to detect format
        const firstRow = data[0];
        
        if (!firstRow || typeof firstRow !== 'object') {
            throw new Error('Invalid CSV format - could not read header row');
        }
        
        const hasLeapFormat = 'palm_pos_x' in firstRow || 'PalmPositionX' in firstRow;
        const hasRawLeapFormat = 'leap_palm_x' in firstRow; // Raw Leap Motion CSV
        const hasCustomFormat = 'x' in firstRow && 'y' in firstRow && 'z' in firstRow;
        
        // Check if any format is recognized
        if (!hasLeapFormat && !hasRawLeapFormat && !hasCustomFormat) {
            const columnNames = Object.keys(firstRow).join(', ');
            throw new Error(`Unrecognized CSV format. Found columns: ${columnNames}. Expected columns like 'leap_palm_x/y/z' or 'x/y/z' or 'palm_pos_x/y/z'.`);
        }

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            let pos, normal, power, time;

            // Format 1: Leap Motion format (palm_pos_x, palm_pos_y, palm_pos_z, palm_normal_x, ...)
            if ('palm_pos_x' in row) {
                pos = [row.palm_pos_x, row.palm_pos_y, row.palm_pos_z];
                normal = [
                    row.palm_normal_x || 0,
                    row.palm_normal_y || -1, // Default: palm down
                    row.palm_normal_z || 0
                ];
                power = row.power || null;
                time = row.timestamp || row.time || i * 0.033; // 30fps default

            // Format 2: Alternative Leap format (PalmPositionX, PalmPositionY, ...)
            } else if ('PalmPositionX' in row) {
                pos = [row.PalmPositionX, row.PalmPositionY, row.PalmPositionZ];
                normal = [
                    row.PalmNormalX || 0,
                    row.PalmNormalY || -1,
                    row.PalmNormalZ || 0
                ];
                power = row.Power || row.power || null;
                time = row.Timestamp || row.timestamp || i * 0.033;

            // Format 3: Raw Leap Motion CSV (leap_palm_x, leap_palm_y, ...)
            } else if ('leap_palm_x' in row) {
                pos = [row.leap_palm_x, row.leap_palm_y, row.leap_palm_z];
                normal = [
                    row.leap_palm_normal_x || 0,
                    row.leap_palm_normal_y || -1,
                    row.leap_palm_normal_z || 0
                ];
                // Calculate power from voltage and current (P = V * I)
                const v_dc = parseFloat(row.v_dc);
                const i_dc = parseFloat(row.i_dc);
                if (!isNaN(v_dc) && !isNaN(i_dc)) {
                    power = v_dc * i_dc;
                } else {
                    power = null;
                }
                // Log first few rows for debugging
                if (i < 3) {
                    console.log(`Row ${i} power: v_dc=${row.v_dc} (${v_dc}), i_dc=${row.i_dc} (${i_dc}), power=${power}`);
                }
                time = row.time || i * 0.01; // 100 Hz default

            // Format 4: Simple format (x, y, z, nx, ny, nz, [power], [time])
            } else if ('x' in row && 'y' in row && 'z' in row) {
                pos = [row.x, row.y, row.z];
                normal = [
                    row.nx || 0,
                    row.ny || -1,
                    row.nz || 0
                ];
                power = row.power || null;
                time = row.time || row.timestamp || i * 0.033;

            } else {
                console.warn(`Row ${i}: Could not parse format`, row);
                continue;
            }

            // Validate position
            if (pos.some(v => v === null || v === undefined || isNaN(v))) {
                console.warn(`Row ${i}: Invalid position`, pos);
                continue;
            }

            // Normalize normal vector
            const normalMag = Math.sqrt(normal[0]**2 + normal[1]**2 + normal[2]**2);
            if (normalMag > 0.01) {
                normal = normal.map(v => v / normalMag);
            } else {
                // Default: palm down (cell up)
                normal = [0, -1, 0];
            }

            positions.push(pos);
            normals.push(normal);
            // Always push power value - will be null if invalid/missing
            realPower.push((power !== null && power !== undefined && !isNaN(power)) ? power : null);
            timestamps.push(time);
        }

        // Count valid power values
        const validPowerCount = realPower.filter(p => p !== null).length;
        console.log(`Power extraction: ${validPowerCount}/${realPower.length} valid values`);

        // Only return real power if ALL samples have power (for proper chart rendering)
        // Otherwise return null - we can't plot partial data
        return {
            positions,
            normals,
            realPower: validPowerCount === realPower.length ? realPower : null,
            timestamps
        };
    }

    showStatus(message, type = 'info') {
        if (!this.statusDiv) return;

        this.statusDiv.textContent = message;
        this.statusDiv.className = `status-message status-${type}`;
        this.statusDiv.style.display = 'block';

        // Auto-hide success/info messages after 5 seconds
        if (type !== 'error') {
            setTimeout(() => {
                this.statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    hideStatus() {
        if (this.statusDiv) {
            this.statusDiv.style.display = 'none';
        }
    }

    showProgress(percent) {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'block';
        }
        this.updateProgress(percent, 'Starting...');
    }

    updateProgress(percent, message = '') {
        if (this.progressBar) {
            this.progressBar.style.width = `${percent}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = message || `${Math.round(percent)}%`;
        }
    }

    hideProgress() {
        if (this.progressContainer) {
            this.progressContainer.style.display = 'none';
        }
    }
}

/**
 * CSV Format Examples:
 * 
 * Format 1 (Leap Motion processed):
 * timestamp,palm_pos_x,palm_pos_y,palm_pos_z,palm_normal_x,palm_normal_y,palm_normal_z,power
 * 0.0,-45.2,654.3,120.1,0.15,0.92,-0.36,0.000234
 * 0.033,-44.8,655.1,121.3,0.14,0.93,-0.35,0.000241
 * 
 * Format 2 (Raw Leap Motion CSV):
 * time,leap_palm_x,leap_palm_y,leap_palm_z,leap_palm_normal_x,leap_palm_normal_y,leap_palm_normal_z,v_dc,i_dc
 * 18.02,25.5,215.82,65.49,-0.3,-0.95,0.05,0.557197265625,5.223655700683594e-05
 * 18.03,25.56,215.74,65.47,-0.3,-0.95,0.05,0.52732421875,4.8574447631835935e-05
 * 
 * Format 3 (Simple):
 * x,y,z,nx,ny,nz,power,time
 * -45.2,654.3,120.1,0.15,0.92,-0.36,0.000234,0.0
 * -44.8,655.1,121.3,0.14,0.93,-0.35,0.000241,0.033
 * 
 * Note: power and time columns are optional (power calculated from v_dc * i_dc if available)
 */

