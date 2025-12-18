/**
 * simulator.js
 * 
 * JavaScript port of the Python radiometric simulator.
 * Implements view factor calculation and both parallel and oriented disk models.
 * 
 * References Python code from:
 * - classification/publication_visuals/five_panel_figure.py
 */

// Physical constants
export const CONSTANTS = {
    SOURCE_CENTER: [-159.81, 868.82, 168.23],  // mm - Light source position
    SOURCE_DIAMETER: 200.0,  // mm - Light source diameter
    SAMPLING_RATE: 100,  // Hz - Data collection rate
};

/**
 * Integrand for the flat disk view factor calculation.
 * Matches disk_integrand() from Python.
 * 
 * @param {number} phi - Angular coordinate (radians)
 * @param {number} rPrime - Radial coordinate on source disk
 * @param {number} a - Lateral offset between hand and light
 * @param {number} L - Height difference
 * @returns {number} Integrand value
 */
function diskIntegrand(phi, rPrime, a, L) {
    const denominator = Math.pow(
        rPrime * rPrime - 2 * a * rPrime * Math.cos(phi) + a * a + L * L,
        2
    );
    
    if (denominator === 0) {
        return 0;
    }
    
    return rPrime / denominator;
}

/**
 * Simpson's rule for 2D numerical integration.
 * Approximates the double integral used in view factor calculation.
 * 
 * @param {Function} func - Function to integrate: func(phi, r, a, L)
 * @param {number} r_min - Minimum r value
 * @param {number} r_max - Maximum r value
 * @param {number} phi_min - Minimum phi value
 * @param {number} phi_max - Maximum phi value
 * @param {number} a - Parameter passed to function
 * @param {number} L - Parameter passed to function
 * @param {number} n_r - Number of intervals for r (must be even)
 * @param {number} n_phi - Number of intervals for phi (must be even)
 * @returns {number} Approximation of the double integral
 */
function simpson2D(func, r_min, r_max, phi_min, phi_max, a, L, n_r = 50, n_phi = 50) {
    const h_r = (r_max - r_min) / n_r;
    const h_phi = (phi_max - phi_min) / n_phi;
    
    let sum = 0;
    
    // Simpson's 2D rule
    for (let i = 0; i <= n_r; i++) {
        const r = r_min + i * h_r;
        const w_r = (i === 0 || i === n_r) ? 1 : (i % 2 === 0 ? 2 : 4);
        
        for (let j = 0; j <= n_phi; j++) {
            const phi = phi_min + j * h_phi;
            const w_phi = (j === 0 || j === n_phi) ? 1 : (j % 2 === 0 ? 2 : 4);
            
            sum += w_r * w_phi * func(phi, r, a, L);
        }
    }
    
    return (h_r * h_phi / 9) * sum;
}

/**
 * Calculate the view factor for a flat disk.
 * Matches calculate_disk_view_factor() from Python.
 * 
 * @param {number} a - Lateral offset (mm)
 * @param {number} L - Height (mm)
 * @param {number} D - Source diameter (mm)
 * @returns {number} View factor
 */
export function calculateDiskViewFactor(a, L, D) {
    if (L <= 0) {
        return 0;
    }
    
    try {
        // Integrate from r'=0 to r'=D/2 and phi=0 to phi=2π
        const integralResult = simpson2D(
            diskIntegrand,
            0,          // r_min
            D / 2,      // r_max
            0,          // phi_min
            2 * Math.PI, // phi_max
            a,          // parameter a
            L,          // parameter L
            50,         // n_r (number of intervals)
            50          // n_phi
        );
        
        return (L * L / Math.PI) * integralResult;
    } catch (error) {
        console.error('Error calculating view factor:', error);
        return 0.0;
    }
}

/**
 * Calculate a (lateral offset) and H (height) from hand position.
 * Matches the calculation in simulate_solar_power() from Python.
 * 
 * @param {Array<number>} handPos - [x, y, z] position in mm
 * @param {Array<number>} sourceCenter - [x, y, z] light source position in mm
 * @returns {Object} {a, H} - lateral offset and height in mm
 */
export function calculateGeometry(handPos, sourceCenter) {
    // L is the height difference (Y-axis in Leap Motion coordinate system)
    const L = sourceCenter[1] - handPos[1];
    
    // a is the lateral offset in the XZ plane
    const a = Math.sqrt(
        Math.pow(sourceCenter[0] - handPos[0], 2) +
        Math.pow(sourceCenter[2] - handPos[2], 2)
    );
    
    return { a, H: L };
}

/**
 * Simulate solar power using parallel or oriented disk model.
 * Matches simulate_solar_power() from Python.
 * 
 * @param {Array<Array<number>>} positions - Array of [x,y,z] positions in mm
 * @param {Array<Array<number>>} normals - Array of [nx,ny,nz] normal vectors
 * @param {string} model - 'parallel' or 'oriented'
 * @param {Array<number>} sourceCenter - Light source position [x,y,z] in mm
 * @param {number} sourceDiameter - Light source diameter in mm
 * @returns {Object} {power, a_values, H_values} - simulated power and geometry
 */
export function simulateSolarPower(
    positions,
    normals = null,
    model = 'oriented',
    sourceCenter = CONSTANTS.SOURCE_CENTER,
    sourceDiameter = CONSTANTS.SOURCE_DIAMETER
) {
    const simulatedPower = [];
    const a_values = [];
    const H_values = [];
    
    console.log('simulateSolarPower called:', {
        numPositions: positions.length,
        model,
        sourceCenter,
        sourceDiameter
    });
    
    for (let i = 0; i < positions.length; i++) {
        const handPos = positions[i];
        
        // Calculate geometry (a and L/H)
        const { a, H } = calculateGeometry(handPos, sourceCenter);
        a_values.push(a);
        H_values.push(H);
        
        // Debug first and last points
        if (i === 0 || i === positions.length - 1) {
            console.log(`Point ${i}:`, {
                position: handPos,
                a: a.toFixed(2),
                H: H.toFixed(2)
            });
        }
        
        // Calculate base view factor
        let viewFactor = calculateDiskViewFactor(a, H, sourceDiameter);
        
        if (i === 0) {
            console.log('First view factor:', viewFactor);
        }
        
        // Apply orientation factor for oriented disk model
        if (model === 'oriented' && normals && i < normals.length) {
            // Cell normal is negative of palm normal (cell is on back of hand)
            const cellNormal = [-normals[i][0], -normals[i][1], -normals[i][2]];
            
            // Vector from hand to lamp
            const vecHandToLamp = [
                sourceCenter[0] - handPos[0],
                sourceCenter[1] - handPos[1],
                sourceCenter[2] - handPos[2]
            ];
            
            // Calculate dot product and magnitudes
            const dot = cellNormal[0] * vecHandToLamp[0] +
                       cellNormal[1] * vecHandToLamp[1] +
                       cellNormal[2] * vecHandToLamp[2];
            
            const normCellNormal = Math.sqrt(
                cellNormal[0] * cellNormal[0] +
                cellNormal[1] * cellNormal[1] +
                cellNormal[2] * cellNormal[2]
            );
            
            const normVecHandToLamp = Math.sqrt(
                vecHandToLamp[0] * vecHandToLamp[0] +
                vecHandToLamp[1] * vecHandToLamp[1] +
                vecHandToLamp[2] * vecHandToLamp[2]
            );
            
            if (normCellNormal > 0 && normVecHandToLamp > 0) {
                const cosTheta = dot / (normCellNormal * normVecHandToLamp);
                const orientationFactor = Math.max(0, cosTheta);
                viewFactor *= orientationFactor;
            }
        }
        
        simulatedPower.push(viewFactor);
    }
    
    return {
        power: simulatedPower,
        a_values,
        H_values
    };
}

/**
 * Calculate scaling factor κ (kappa) using least squares.
 * Minimizes error: P_real = κ × F(a,H)
 * 
 * @param {Array<number>} viewFactors - Simulated view factors
 * @param {Array<number>} realPower - Real measured power values
 * @returns {number} Optimal κ value
 */
export function calculateKappa(viewFactors, realPower) {
    if (!viewFactors || !realPower || viewFactors.length !== realPower.length) {
        throw new Error('Invalid input for kappa calculation');
    }
    
    // Least squares solution: κ = (F·P) / (F·F)
    const numerator = viewFactors.reduce((sum, f, i) => 
        sum + f * realPower[i], 0
    );
    const denominator = viewFactors.reduce((sum, f) => 
        sum + f * f, 0
    );
    
    if (denominator === 0) {
        throw new Error('Cannot calculate kappa: zero denominator');
    }
    
    return numerator / denominator;
}

/**
 * Apply kappa scaling to view factors.
 * 
 * @param {Array<number>} viewFactors - Simulated view factors
 * @param {number} kappa - Scaling factor
 * @returns {Array<number>} Scaled power values
 */
export function applyKappaScaling(viewFactors, kappa) {
    return viewFactors.map(f => kappa * f);
}

/**
 * Calculate kappa from physical parameters.
 * κ = efficiency × cell_area × light_intensity
 * 
 * @param {number} efficiency - Solar cell efficiency (0-1, e.g., 0.15 for 15%)
 * @param {number} cellArea - Cell area in m²
 * @param {number} lightPower - Light source power in Watts
 * @returns {number} Calculated κ value
 */
export function calculateKappaFromPhysics(efficiency, cellArea, lightPower) {
    // κ ≈ η × A × I₀
    // Where I₀ is the effective irradiance
    // Simplified model: κ = η × A × (P_light / effective_area)
    // For a point source, this is an approximation
    return efficiency * cellArea * lightPower * 1e-3; // Scale factor for typical setup
}

/**
 * Apply per-segment scaling to match simulated power to real power range.
 * Matches apply_per_segment_scaling() from Python.
 * 
 * @param {Array<number>} simPower - Simulated power values
 * @param {Array<number>} realPower - Real measured power values
 * @returns {Array<number>} Scaled simulated power
 */
export function applyPerSegmentScaling(simPower, realPower) {
    const simMin = Math.min(...simPower);
    const simMax = Math.max(...simPower);
    const realMin = Math.min(...realPower);
    const realMax = Math.max(...realPower);
    
    if (simMax > simMin) {
        // Normalize sim power to [0, 1]
        const simNorm = simPower.map(p => (p - simMin) / (simMax - simMin));
        // Scale to real power range
        return simNorm.map(p => realMin + p * (realMax - realMin));
    } else {
        // If no variation, return constant array at real min
        return new Array(simPower.length).fill(realMin);
    }
}

/**
 * Calculate Root Mean Square Error between two arrays.
 * 
 * @param {Array<number>} arr1 - First array
 * @param {Array<number>} arr2 - Second array
 * @returns {number} RMSE value
 */
export function calculateRMSE(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        throw new Error('Arrays must have same length');
    }
    
    const sumSquaredError = arr1.reduce((sum, val, i) => {
        return sum + Math.pow(val - arr2[i], 2);
    }, 0);
    
    return Math.sqrt(sumSquaredError / arr1.length);
}

/**
 * Calculate R² (coefficient of determination) between two arrays.
 * 
 * @param {Array<number>} actual - Actual values
 * @param {Array<number>} predicted - Predicted values
 * @returns {number} R² value
 */
export function calculateR2(actual, predicted) {
    if (actual.length !== predicted.length) {
        throw new Error('Arrays must have same length');
    }
    
    const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;
    
    const totalSS = actual.reduce((sum, val) => {
        return sum + Math.pow(val - mean, 2);
    }, 0);
    
    const residualSS = actual.reduce((sum, val, i) => {
        return sum + Math.pow(val - predicted[i], 2);
    }, 0);
    
    return 1 - (residualSS / totalSS);
}

/**
 * Calculate Pearson correlation coefficient between two arrays.
 * 
 * @param {Array<number>} arr1 - First array
 * @param {Array<number>} arr2 - Second array
 * @returns {number} Correlation coefficient
 */
export function calculateCorrelation(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        throw new Error('Arrays must have same length');
    }
    
    const n = arr1.length;
    const mean1 = arr1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = arr2.reduce((sum, val) => sum + val, 0) / n;
    
    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;
    
    for (let i = 0; i < n; i++) {
        const diff1 = arr1[i] - mean1;
        const diff2 = arr2[i] - mean2;
        numerator += diff1 * diff2;
        sum1Sq += diff1 * diff1;
        sum2Sq += diff2 * diff2;
    }
    
    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    
    if (denominator === 0) {
        return 0;
    }
    
    return numerator / denominator;
}

