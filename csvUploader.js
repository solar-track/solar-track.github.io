/**
 * CSV Uploader - Client-side CSV file processing for motion capture data
 * Supports Leap Motion and custom format CSVs
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

        // Parse CSV
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            step: (results, parser) => {
                // Update progress during parsing (estimate based on rows)
                const progress = Math.min(30 + (parser.streamer._input.length / file.size) * 40, 70);
                this.updateProgress(progress, 'Parsing data...');
            },
            complete: (results) => {
                this.updateProgress(80, 'Processing data...');
                setTimeout(() => {
                    this.processCSV(results.data, file.name);
                }, 100);
            },
            error: (error) => {
                this.hideProgress();
                this.showStatus(`❌ Error parsing CSV: ${error.message}`, 'error');
            }
        });

        // Reset file input
        event.target.value = '';
    }

    processCSV(data, filename) {
        console.log('Processing CSV:', filename, 'Rows:', data.length);
        try {
            // Detect CSV format and extract data
            const { positions, normals, realPower, timestamps } = this.extractData(data);

            console.log('Extracted data:', {
                positions: positions.length,
                normals: normals.length,
                realPower: realPower?.length,
                timestamps: timestamps.length
            });

            // Validate data
            if (positions.length === 0) {
                throw new Error('No valid data found in CSV');
            }

            if (positions.length < 10) {
                throw new Error('CSV must contain at least 10 samples');
            }

            // Create gesture data object
            const gestureData = {
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

            console.log('Calling loadUploadedGesture...');
            // Load into app
            this.app.loadUploadedGesture(gestureData);

        } catch (error) {
            this.showStatus(`❌ ${error.message}`, 'error');
            console.error('CSV processing error:', error);
        }
    }

    extractData(data) {
        const positions = [];
        const normals = [];
        const realPower = [];
        const timestamps = [];

        // Try to detect format
        const firstRow = data[0];
        const hasLeapFormat = 'palm_pos_x' in firstRow || 'PalmPositionX' in firstRow;
        const hasRawLeapFormat = 'leap_palm_x' in firstRow; // Raw Leap Motion CSV
        const hasCustomFormat = 'x' in firstRow && 'y' in firstRow && 'z' in firstRow;

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
                if (row.v_dc !== null && row.v_dc !== undefined && 
                    row.i_dc !== null && row.i_dc !== undefined) {
                    power = row.v_dc * row.i_dc;
                } else {
                    power = null;
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
            if (power !== null && !isNaN(power)) {
                realPower.push(power);
            }
            timestamps.push(time);
        }

        return {
            positions,
            normals,
            realPower: realPower.length === positions.length ? realPower : null,
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

