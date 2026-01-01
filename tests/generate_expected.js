/**
 * SolarTrack Test Data Generator
 * 
 * Generates precomputed expected outputs for test validation.
 * Run with: node tests/generate_expected.js
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

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

// ============================================================================
// Core Simulation Functions (copied from simulator.js for standalone use)
// ============================================================================

const CONSTANTS = {
    SOURCE_CENTER: [-159.81, 868.82, 168.23],  // mm - Light source position
    SOURCE_DIAMETER: 100.0,  // mm
};

const LAMP_NORMAL = [0, -1, 0]; // Lamp emits downward

/**
 * Parallel Disk View Factor (Eq. A.5)
 */
function diskIntegrand(phi, rPrime, a, L) {
    const denominator = Math.pow(
        rPrime * rPrime - 2 * a * rPrime * Math.cos(phi) + a * a + L * L,
        2
    );
    if (denominator === 0) return 0;
    return rPrime / denominator;
}

function simpson2D(func, r_min, r_max, phi_min, phi_max, a, L, n_r = 50, n_phi = 50) {
    const h_r = (r_max - r_min) / n_r;
    const h_phi = (phi_max - phi_min) / n_phi;
    let sum = 0;
    
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

function calculateDiskViewFactor(a, L, D) {
    if (L <= 0) return 0;
    const R = D / 2;
    const integral = simpson2D(diskIntegrand, 0, R, 0, 2 * Math.PI, a, L, 50, 50);
    const F = L * L * integral / Math.PI;
    return Math.max(0, Math.min(1, F));
}

/**
 * Orientation Aware View Factor - Approximate (cosine correction)
 * Uses cellNormal (negated palm normal) and direction to lamp center
 */
function calculateOrientationAwareApprox(a, L, D, palmNormal, cellPos, lightPos) {
    const F_parallel = calculateDiskViewFactor(a, L, D);
    
    // Cell normal is negative of palm normal (solar cell is on back of hand)
    const cellNormal = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];
    
    // Vector from cell to lamp
    const vecToLamp = [
        lightPos[0] - cellPos[0],
        lightPos[1] - cellPos[1],
        lightPos[2] - cellPos[2]
    ];
    
    // Calculate cosine of angle
    const dotProduct = cellNormal[0] * vecToLamp[0] + 
                       cellNormal[1] * vecToLamp[1] + 
                       cellNormal[2] * vecToLamp[2];
    
    const normCell = Math.sqrt(cellNormal[0]**2 + cellNormal[1]**2 + cellNormal[2]**2);
    const normVec = Math.sqrt(vecToLamp[0]**2 + vecToLamp[1]**2 + vecToLamp[2]**2);
    
    if (normCell < 1e-6 || normVec < 1e-6) return 0;
    
    const cosTheta = dotProduct / (normCell * normVec);
    const orientationFactor = Math.max(0, cosTheta);
    
    return F_parallel * orientationFactor;
}

/**
 * Orientation Aware View Factor - Exact (Eq. A.4)
 * Matches diskIntegrandA4 and calculateDiskViewFactorA4 from simulator_exact.js
 */
function dot3(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function calculateExactViewFactor(cellPos, palmNormal, lampPos, lampNormal, D, nR = 20, nPhi = 20) {
    // Cell normal is negative of palm normal
    const cellNormal = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];
    
    const radius = D / 2;
    const dr = radius / nR;
    const dPhi = (2 * Math.PI) / nPhi;
    
    // Ensure even intervals for Simpson's rule
    if (nR % 2 !== 0) nR += 1;
    if (nPhi % 2 !== 0) nPhi += 1;
    
    let total = 0;
    
    for (let i = 0; i <= nR; i++) {
        const r = i * dr;
        if (r < 1e-6) continue; // Skip r=0 singularity
        
        const wR = (i === 0 || i === nR) ? 1 : (i % 2 === 1) ? 4 : 2;
        
        for (let j = 0; j <= nPhi; j++) {
            const phi = j * dPhi;
            const wPhi = (j === 0 || j === nPhi) ? 1 : (j % 2 === 1) ? 4 : 2;
            
            // Point on lamp disk (horizontal XZ plane at lampPos[1])
            const xPatch = lampPos[0] + r * Math.cos(phi);
            const yPatch = lampPos[1];  // Constant Y height
            const zPatch = lampPos[2] + r * Math.sin(phi);
            
            // Vector from emitter patch to receiver (hand)
            const R_vec = [
                cellPos[0] - xPatch,
                cellPos[1] - yPatch,
                cellPos[2] - zPatch
            ];
            
            const R2 = dot3(R_vec, R_vec);
            if (R2 < 1e-12) continue;
            
            // Dot products (not normalized)
            const Re = dot3(R_vec, lampNormal);    // R · n_e
            const Rc = dot3(R_vec, cellNormal);    // R · n_c
            
            // Visibility checks:
            // - Re > 0: patch can see the receiver
            // - Rc < 0: cell is facing toward the patch (R points away from patch, n_c points out from cell)
            if (Re <= 0 || Rc >= 0) continue;
            
            // A.4 kernel: ((R·n_e) * (-R·n_c)) / ||R||^4 * r'
            const integrand = (Re * (-Rc)) / (R2 * R2) * r;
            total += wR * wPhi * integrand;
        }
    }
    
    const F = (1 / Math.PI) * (dr * dPhi / 9) * total;
    return Math.max(0, Math.min(1, F));
}

/**
 * Calculate kappa using least squares: P_real = κ × F(a,H)
 * κ = (F·P) / (F·F)
 */
function calculateKappa(viewFactors, realPower) {
    const numerator = viewFactors.reduce((sum, f, i) => sum + f * realPower[i], 0);
    const denominator = viewFactors.reduce((sum, f) => sum + f * f, 0);
    if (denominator === 0) return 1.0;
    return numerator / denominator;
}

// ============================================================================
// Test Case Generation
// ============================================================================

const TEST_CONFIGS = [
    {
        name: 'parallel_default',
        model: 'parallel',
        lightPos: [-159.81, 868.82, 168.23],
        diameter: 100
    },
    {
        name: 'orientation_approx_default',
        model: 'orientation_approx',
        lightPos: [-159.81, 868.82, 168.23],
        diameter: 100
    },
    {
        name: 'orientation_exact_default',
        model: 'orientation_exact',
        lightPos: [-159.81, 868.82, 168.23],
        diameter: 100
    },
    {
        name: 'parallel_centered',
        model: 'parallel',
        lightPos: [0, 800, 0],
        diameter: 100
    }
];

function loadCSV(filepath) {
    const content = readFileSync(filepath, 'utf-8');
    const records = parse(content, { columns: true, skip_empty_lines: true });
    return records;
}

function extractTrajectory(records) {
    return records.map((row, idx) => {
        // Position (Leap Motion coordinates)
        const x = parseFloat(row.leap_palm_x || row.x);
        const y = parseFloat(row.leap_palm_y || row.y);
        const z = parseFloat(row.leap_palm_z || row.z);
        
        // Normal (if available)
        const nx = parseFloat(row.leap_palm_normal_x || 0);
        const ny = parseFloat(row.leap_palm_normal_y || -1);
        const nz = parseFloat(row.leap_palm_normal_z || 0);
        
        // Real power (from v_dc * i_dc)
        const v_dc = parseFloat(row.v_dc || 0);
        const i_dc = parseFloat(row.i_dc || 0);
        const realPower = v_dc * i_dc;
        
        // Timestamp
        const time = parseFloat(row.time || idx * 0.01);
        
        return {
            time,
            position: [x, y, z],
            normal: [nx, ny, nz],
            realPower
        };
    }).filter(p => !isNaN(p.position[0]) && !isNaN(p.position[1]) && !isNaN(p.position[2]));
}

function computeGeometry(cellPos, lightPos) {
    const dx = cellPos[0] - lightPos[0];
    const dz = cellPos[2] - lightPos[2];
    const a = Math.sqrt(dx * dx + dz * dz);
    const H = lightPos[1] - cellPos[1];
    return { a, H };
}

function simulateTrajectory(trajectory, config) {
    // First pass: compute view factors and geometry
    const intermediate = trajectory.map(point => {
        const { a, H } = computeGeometry(point.position, config.lightPos);
        
        let viewFactor;
        if (config.model === 'parallel') {
            viewFactor = calculateDiskViewFactor(a, H, config.diameter);
        } else if (config.model === 'orientation_approx') {
            viewFactor = calculateOrientationAwareApprox(a, H, config.diameter, point.normal, point.position, config.lightPos);
        } else if (config.model === 'orientation_exact') {
            viewFactor = calculateExactViewFactor(
                point.position, point.normal,
                config.lightPos, LAMP_NORMAL,
                config.diameter
            );
        }
        
        return {
            time: point.time,
            a_mm: a,
            H_mm: H,
            view_factor: viewFactor,
            real_power_W: point.realPower
        };
    });
    
    // Second pass: compute kappa from real data and apply
    const viewFactors = intermediate.map(r => r.view_factor);
    const realPower = intermediate.map(r => r.real_power_W);
    const kappa = calculateKappa(viewFactors, realPower);
    
    // Apply kappa to get simulated power
    return {
        kappa,
        results: intermediate.map(r => ({
            ...r,
            simulated_power_W: kappa * r.view_factor
        }))
    };
}

function computeMetrics(results) {
    const n = results.length;
    if (n === 0) return { rmse: NaN, r2: NaN, pearson: NaN };
    
    const real = results.map(r => r.real_power_W);
    const sim = results.map(r => r.simulated_power_W);
    
    // RMSE
    const mse = real.reduce((sum, r, i) => sum + Math.pow(r - sim[i], 2), 0) / n;
    const rmse = Math.sqrt(mse);
    
    // R²
    const meanReal = real.reduce((a, b) => a + b, 0) / n;
    const ssRes = real.reduce((sum, r, i) => sum + Math.pow(r - sim[i], 2), 0);
    const ssTot = real.reduce((sum, r) => sum + Math.pow(r - meanReal, 2), 0);
    const r2 = 1 - ssRes / ssTot;
    
    // Pearson correlation
    const meanSim = sim.reduce((a, b) => a + b, 0) / n;
    const numPearson = real.reduce((sum, r, i) => sum + (r - meanReal) * (sim[i] - meanSim), 0);
    const denReal = Math.sqrt(real.reduce((sum, r) => sum + Math.pow(r - meanReal, 2), 0));
    const denSim = Math.sqrt(sim.reduce((sum, s) => sum + Math.pow(s - meanSim, 2), 0));
    const pearson = numPearson / (denReal * denSim);
    
    return { rmse, r2, pearson };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    console.log('SolarTrack Test Data Generator');
    console.log('==============================\n');
    
    const dataDir = './tests/data';
    const outputDir = './tests/expected';
    
    // Create output directory
    const { mkdirSync } = await import('fs');
    try { mkdirSync(outputDir, { recursive: true }); } catch(e) {}
    
    // Get input files
    const files = readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    console.log(`Found ${files.length} input files: ${files.join(', ')}\n`);
    
    const allResults = {};
    
    for (const file of files) {
        const trajectoryName = file.replace('__Synchronized.csv', '').replace('.csv', '');
        console.log(`Processing: ${trajectoryName}`);
        
        const records = loadCSV(`${dataDir}/${file}`);
        const trajectory = extractTrajectory(records);
        console.log(`  Samples: ${trajectory.length}`);
        
        allResults[trajectoryName] = {};
        
        for (const config of TEST_CONFIGS) {
            const { kappa, results } = simulateTrajectory(trajectory, config);
            const metrics = computeMetrics(results);
            
            console.log(`  ${config.name}: κ=${kappa.toExponential(3)}, RMSE=${(metrics.rmse * 1e6).toFixed(2)}µW, R²=${metrics.r2.toFixed(4)}, ρ=${metrics.pearson.toFixed(4)}`);
            
            // Save individual result file
            const outputFile = `${outputDir}/${trajectoryName}_${config.name}.csv`;
            const csvContent = stringify(results, { header: true });
            writeFileSync(outputFile, csvContent);
            
            // Store summary
            allResults[trajectoryName][config.name] = {
                samples: trajectory.length,
                kappa: kappa,
                metrics: {
                    rmse_uW: metrics.rmse * 1e6,
                    r2: metrics.r2,
                    pearson: metrics.pearson
                },
                config: config
            };
        }
        console.log('');
    }
    
    // Write summary JSON
    writeFileSync(`${outputDir}/expected_metrics.json`, JSON.stringify(allResults, null, 2));
    console.log(`\nSummary written to: ${outputDir}/expected_metrics.json`);
}

main().catch(console.error);

