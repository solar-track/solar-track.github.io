/**
 * Exact Radiometric Model Implementation (Eq. A.4)
 * 
 * This implements the exact orientation-aware view factor calculation
 * by integrating over the entire lamp disk surface, computing the proper
 * radiometric kernel for each differential element.
 * 
 * Reference: Equation A.4 from the paper
 * F = (1/π) ∬ ((R·n_e)(-R·n_c)) / ||R||^4  r' dφ dr'
 */

// Constants
export const LAMP_NORMAL = [0, -1, 0]; // Lamp emits downward (in Leap Motion coords, Y is up)

// Default integration resolution (can be overridden via config)
export const DEFAULT_INTEGRATION_R = 20;     // Radial subdivisions
export const DEFAULT_INTEGRATION_PHI = 20;   // Angular subdivisions

// Current configurable settings (modified by settings modal)
export const settings = {
    integrationResolutionR: DEFAULT_INTEGRATION_R,
    integrationResolutionPhi: DEFAULT_INTEGRATION_PHI,
    lightDiameterOverride: null  // If set, overrides gesture's light diameter
};

/**
 * Update simulation settings
 */
export function updateSettings(newSettings) {
    if (newSettings.integrationResolutionR !== undefined) {
        settings.integrationResolutionR = Math.max(4, Math.min(100, newSettings.integrationResolutionR));
    }
    if (newSettings.integrationResolutionPhi !== undefined) {
        settings.integrationResolutionPhi = Math.max(4, Math.min(100, newSettings.integrationResolutionPhi));
    }
    if (newSettings.lightDiameterOverride !== undefined) {
        settings.lightDiameterOverride = newSettings.lightDiameterOverride;
    }
    console.log('📐 Exact simulator settings updated:', settings);
}

/**
 * Reset settings to defaults
 */
export function resetSettings() {
    settings.integrationResolutionR = DEFAULT_INTEGRATION_R;
    settings.integrationResolutionPhi = DEFAULT_INTEGRATION_PHI;
    settings.lightDiameterOverride = null;
    console.log('📐 Exact simulator settings reset to defaults');
}

/**
 * Get current settings (for UI display)
 */
export function getSettings() {
    return { ...settings };
}

/**
 * 2D Numerical Integration using Simpson's Rule
 * Integrates f(r, phi) over r ∈ [0, R] and phi ∈ [0, 2π]
 */
function integrate2D(f, rMax, nR, nPhi) {
    // Ensure even number of intervals for Simpson's rule
    if (nR % 2 !== 0) nR += 1;
    if (nPhi % 2 !== 0) nPhi += 1;
    
    const dr = rMax / nR;
    const dPhi = (2 * Math.PI) / nPhi;
    
    let total = 0;
    
    for (let i = 0; i <= nR; i++) {
        const r = i * dr;
        
        // Simpson's weight for r
        let wR;
        if (i === 0 || i === nR) {
            wR = 1;
        } else if (i % 2 === 1) {
            wR = 4;
        } else {
            wR = 2;
        }
        
        for (let j = 0; j <= nPhi; j++) {
            const phi = j * dPhi;
            
            // Simpson's weight for phi
            let wPhi;
            if (j === 0 || j === nPhi) {
                wPhi = 1;
            } else if (j % 2 === 1) {
                wPhi = 4;
            } else {
                wPhi = 2;
            }
            
            total += wR * wPhi * f(r, phi);
        }
    }
    
    return total * (dr / 3) * (dPhi / 3);
}

/**
 * Dot product of two 3D vectors
 */
function dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/**
 * Euclidean norm of a 3D vector
 */
function norm(v) {
    return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Normalize a 3D vector
 */
function normalize(v) {
    const n = norm(v);
    if (n < 1e-12) return [0, 0, 0];
    return [v[0] / n, v[1] / n, v[2] / n];
}

/**
 * Eq. A.4 Integrand for extended disk source
 * 
 * Computes: ((R·n_e) * (-R·n_c)) / ||R||^4 * r'
 * 
 * Where:
 * - R is vector from emitter patch to receiver (hand position)
 * - n_e is lamp normal (pointing down)
 * - n_c is cell normal
 * - r' is radial position on disk (Jacobian factor)
 */
function diskIntegrandA4(r, phi, handPos, cellNormal, sourceCenter, lampNormal) {
    // Skip r=0 to avoid singularity at disk center when hand is directly below
    if (r < 1e-6) return 0;
    
    // Lamp patch position on disk (in XZ plane at y = sourceCenter[1])
    // The disk lies horizontally, so we vary X and Z
    const x0 = sourceCenter[0];
    const y0 = sourceCenter[1];
    const z0 = sourceCenter[2];
    
    const xPatch = x0 + r * Math.cos(phi);
    const yPatch = y0;  // Disk is at constant Y (height)
    const zPatch = z0 + r * Math.sin(phi);
    
    // Vector from emitter patch to receiver (hand position)
    const R = [
        handPos[0] - xPatch,
        handPos[1] - yPatch,
        handPos[2] - zPatch
    ];
    
    const R2 = dot(R, R);
    if (R2 < 1e-12) return 0;
    
    // Dot products (not normalized - they carry distance units)
    const Re = dot(R, lampNormal);    // R · n_e
    const Rc = dot(R, cellNormal);    // R · n_c
    
    // Physical visibility checks:
    // - Emission: (R · n_e) > 0 means the patch can "see" the receiver
    // - Reception: (R · n_c) < 0 means the cell is facing toward the patch
    //   (negative because R points FROM emitter TO receiver, but n_c points outward from cell)
    if (Re <= 0 || Rc >= 0) {
        return 0;
    }
    
    // A.4 kernel: ((R·n_e) * (-R·n_c)) / ||R||^4 * r'
    // The (-Rc) ensures positive contribution when cell faces the light
    return (Re * (-Rc)) / (R2 * R2) * r;
}

/**
 * Calculate the exact orientation-aware view factor using Eq. A.4
 * 
 * F = (1/π) ∬ ((R·n_e)(-R·n_c)) / ||R||^4  r' dφ dr'
 */
export function calculateDiskViewFactorA4(handPos, cellNormal, sourceCenter, sourceDiameter) {
    // Normalize cell normal defensively
    const normalizedCellNormal = normalize(cellNormal);
    if (norm(normalizedCellNormal) < 1e-6) {
        return 0;
    }
    
    // Quick reject: if hand is above or at lamp plane, geometry is invalid
    // (lamp emits downward; hand should be below lamp)
    if (handPos[1] >= sourceCenter[1]) {
        return 0;
    }
    
    const diskRadius = sourceDiameter / 2;
    
    // Integrate over the disk
    const integrand = (r, phi) => diskIntegrandA4(
        r, phi, handPos, normalizedCellNormal, sourceCenter, LAMP_NORMAL
    );
    
    const integralResult = integrate2D(
        integrand,
        diskRadius,
        settings.integrationResolutionR,
        settings.integrationResolutionPhi
    );
    
    // Apply 1/π normalization (consistent with parallel disk formulation)
    return (1 / Math.PI) * integralResult;
}

/**
 * Calculate the parallel disk view factor (same as approximate version)
 * This is included for completeness - parallel disk doesn't need the exact treatment
 */
function diskIntegrandParallel(r, phi, a, L) {
    const denom = Math.pow(r * r - 2 * a * r * Math.cos(phi) + a * a + L * L, 2);
    if (denom < 1e-12) return 0;
    return r / denom;
}

export function calculateDiskViewFactorParallel(a, L, D) {
    if (L <= 0) return 0;
    
    const integrand = (r, phi) => diskIntegrandParallel(r, phi, a, L);
    const integralResult = integrate2D(
        integrand, 
        D / 2, 
        settings.integrationResolutionR, 
        settings.integrationResolutionPhi
    );
    
    return (L * L / Math.PI) * integralResult;
}

/**
 * Main simulation function using the exact Eq. A.4 model
 * 
 * @param {Array} positions - Array of [x, y, z] hand positions in mm
 * @param {Array} normals - Array of [nx, ny, nz] palm normals
 * @param {Array} sourceCenter - Light source center [x, y, z] in mm
 * @param {number} sourceDiameter - Light source diameter in mm
 * @param {string} model - 'oriented' or 'parallel'
 * @returns {Object} - { power, a_values, H_values, theta_values }
 */
export function simulateSolarPowerExact(positions, normals, sourceCenter, sourceDiameter, model = 'oriented') {
    const simulatedPower = [];
    const aValues = [];
    const HValues = [];
    const thetaValues = [];
    
    // Use override diameter if set, otherwise use provided diameter
    const effectiveDiameter = settings.lightDiameterOverride !== null 
        ? settings.lightDiameterOverride 
        : sourceDiameter;
    
    for (let i = 0; i < positions.length; i++) {
        const handPos = positions[i];
        
        // Calculate geometric parameters
        const H = sourceCenter[1] - handPos[1];  // Vertical distance (Y is up)
        const dx = sourceCenter[0] - handPos[0];
        const dz = sourceCenter[2] - handPos[2];
        const a = Math.sqrt(dx * dx + dz * dz);  // Lateral offset
        
        aValues.push(a);
        HValues.push(H);
        
        let viewFactor = 0;
        let theta = 0;
        
        if (model === 'oriented' && normals && i < normals.length) {
            // EXACT: Use full Eq. A.4 integration
            const cellNormal = [-normals[i][0], -normals[i][1], -normals[i][2]];
            viewFactor = calculateDiskViewFactorA4(handPos, cellNormal, sourceCenter, effectiveDiameter);
            
            // Calculate theta for display (angle between cell normal and direction to lamp center)
            const vecToLamp = [
                sourceCenter[0] - handPos[0],
                sourceCenter[1] - handPos[1],
                sourceCenter[2] - handPos[2]
            ];
            const dotProduct = dot(cellNormal, vecToLamp);
            const normCell = norm(cellNormal);
            const normVec = norm(vecToLamp);
            if (normCell > 0 && normVec > 0) {
                const cosTheta = dotProduct / (normCell * normVec);
                theta = Math.acos(Math.max(-1, Math.min(1, cosTheta))) * (180 / Math.PI);
            }
        } else {
            // Parallel disk model (same as approximate)
            viewFactor = calculateDiskViewFactorParallel(a, H, effectiveDiameter);
            theta = 0;  // No tilt in parallel model
        }
        
        thetaValues.push(theta);
        simulatedPower.push(viewFactor);
    }
    
    return {
        power: simulatedPower,
        a_values: aValues,
        H_values: HValues,
        theta_values: thetaValues
    };
}

/**
 * Get integration resolution info (for UI display)
 */
export function getIntegrationInfo() {
    return {
        resolution_r: settings.integrationResolutionR,
        resolution_phi: settings.integrationResolutionPhi,
        total_samples: settings.integrationResolutionR * settings.integrationResolutionPhi,
        light_diameter_override: settings.lightDiameterOverride
    };
}

