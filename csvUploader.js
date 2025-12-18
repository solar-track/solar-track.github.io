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

        // Event listeners
        this.uploadBtn.addEventListener('click', () => {
            this.fileInput.click();
        });

        this.fileInput.addEventListener('change', (e) => {
            this.handleFileSelect(e);
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Show loading status
        this.showStatus('📂 Loading CSV...', 'info');

        // Parse CSV
        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                this.processCSV(results.data, file.name);
            },
            error: (error) => {
                this.showStatus(`❌ Error parsing CSV: ${error.message}`, 'error');
            }
        });

        // Reset file input
        event.target.value = '';
    }

    processCSV(data, filename) {
        try {
            // Detect CSV format and extract data
            const { positions, normals, realPower, timestamps } = this.extractData(data);

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
                real_power: realPower, // May be null if not in CSV
                timestamps: timestamps,
                isUploaded: true
            };

            // Show success
            this.showStatus(`✅ Loaded ${positions.length} samples from ${filename}`, 'success');

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

            // Format 3: Simple format (x, y, z, nx, ny, nz, [power], [time])
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
}

/**
 * CSV Format Examples:
 * 
 * Format 1 (Leap Motion):
 * timestamp,palm_pos_x,palm_pos_y,palm_pos_z,palm_normal_x,palm_normal_y,palm_normal_z,power
 * 0.0,-45.2,654.3,120.1,0.15,0.92,-0.36,0.000234
 * 0.033,-44.8,655.1,121.3,0.14,0.93,-0.35,0.000241
 * 
 * Format 2 (Simple):
 * x,y,z,nx,ny,nz,power,time
 * -45.2,654.3,120.1,0.15,0.92,-0.36,0.000234,0.0
 * -44.8,655.1,121.3,0.14,0.93,-0.35,0.000241,0.033
 * 
 * Note: power and time columns are optional
 */

