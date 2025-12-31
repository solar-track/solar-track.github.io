/**
 * SolarTrack Automated Test Validator
 * 
 * Compares current simulator output against precomputed expected results.
 * Run with: node tests/validate.js
 * 
 * Exit codes:
 *   0 - All tests passed
 *   1 - Some tests failed
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

import { readFileSync, readdirSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';

// ============================================================================
// Tolerance thresholds (acceptable deviation from expected)
// ============================================================================

const TOLERANCES = {
    rmse_uW: 1.0,        // Max 1 µW deviation in RMSE
    r2: 0.001,           // Max 0.001 deviation in R²
    pearson: 0.001,      // Max 0.001 deviation in Pearson
    power_relative: 0.01 // Max 1% relative error in individual power values
};

// ============================================================================
// Core Simulation Functions (same as generate_expected.js)
// ============================================================================

const LAMP_NORMAL = [0, -1, 0];

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

function calculateOrientationAwareApprox(a, L, D, palmNormal, cellPos, lightPos) {
    const F_parallel = calculateDiskViewFactor(a, L, D);
    
    // Cell normal is negative of palm normal
    const cellNormal = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];
    
    // Vector from cell to lamp
    const vecToLamp = [
        lightPos[0] - cellPos[0],
        lightPos[1] - cellPos[1],
        lightPos[2] - cellPos[2]
    ];
    
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

function dot3(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function calculateExactViewFactor(cellPos, palmNormal, lampPos, lampNormal, D, nR = 20, nPhi = 20) {
    // Cell normal is negative of palm normal
    const cellNormal = [-palmNormal[0], -palmNormal[1], -palmNormal[2]];
    
    const radius = D / 2;
    const dr = radius / nR;
    const dPhi = (2 * Math.PI) / nPhi;
    
    if (nR % 2 !== 0) nR += 1;
    if (nPhi % 2 !== 0) nPhi += 1;
    
    let total = 0;
    
    for (let i = 0; i <= nR; i++) {
        const r = i * dr;
        if (r < 1e-6) continue;
        
        const wR = (i === 0 || i === nR) ? 1 : (i % 2 === 1) ? 4 : 2;
        
        for (let j = 0; j <= nPhi; j++) {
            const phi = j * dPhi;
            const wPhi = (j === 0 || j === nPhi) ? 1 : (j % 2 === 1) ? 4 : 2;
            
            const xPatch = lampPos[0] + r * Math.cos(phi);
            const yPatch = lampPos[1];
            const zPatch = lampPos[2] + r * Math.sin(phi);
            
            const R_vec = [
                cellPos[0] - xPatch,
                cellPos[1] - yPatch,
                cellPos[2] - zPatch
            ];
            
            const R2 = dot3(R_vec, R_vec);
            if (R2 < 1e-12) continue;
            
            const Re = dot3(R_vec, lampNormal);
            const Rc = dot3(R_vec, cellNormal);
            
            if (Re <= 0 || Rc >= 0) continue;
            
            const integrand = (Re * (-Rc)) / (R2 * R2) * r;
            total += wR * wPhi * integrand;
        }
    }
    
    const F = (1 / Math.PI) * (dr * dPhi / 9) * total;
    return Math.max(0, Math.min(1, F));
}

/**
 * Calculate kappa using least squares: P_real = κ × F(a,H)
 */
function calculateKappa(viewFactors, realPower) {
    const numerator = viewFactors.reduce((sum, f, i) => sum + f * realPower[i], 0);
    const denominator = viewFactors.reduce((sum, f) => sum + f * f, 0);
    if (denominator === 0) return 1.0;
    return numerator / denominator;
}

// ============================================================================
// Test Runner
// ============================================================================

function loadExpectedMetrics(filepath) {
    const content = readFileSync(filepath, 'utf-8');
    return JSON.parse(content);
}

function loadCSV(filepath) {
    const content = readFileSync(filepath, 'utf-8');
    return parse(content, { columns: true, skip_empty_lines: true });
}

function extractTrajectory(records) {
    return records.map((row, idx) => {
        const x = parseFloat(row.leap_palm_x || row.x);
        const y = parseFloat(row.leap_palm_y || row.y);
        const z = parseFloat(row.leap_palm_z || row.z);
        const nx = parseFloat(row.leap_palm_normal_x || 0);
        const ny = parseFloat(row.leap_palm_normal_y || -1);
        const nz = parseFloat(row.leap_palm_normal_z || 0);
        const v_dc = parseFloat(row.v_dc || 0);
        const i_dc = parseFloat(row.i_dc || 0);
        const realPower = v_dc * i_dc;
        const time = parseFloat(row.time || idx * 0.01);
        
        return { time, position: [x, y, z], normal: [nx, ny, nz], realPower };
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
    
    const mse = real.reduce((sum, r, i) => sum + Math.pow(r - sim[i], 2), 0) / n;
    const rmse = Math.sqrt(mse);
    
    const meanReal = real.reduce((a, b) => a + b, 0) / n;
    const ssRes = real.reduce((sum, r, i) => sum + Math.pow(r - sim[i], 2), 0);
    const ssTot = real.reduce((sum, r) => sum + Math.pow(r - meanReal, 2), 0);
    const r2 = 1 - ssRes / ssTot;
    
    const meanSim = sim.reduce((a, b) => a + b, 0) / n;
    const numPearson = real.reduce((sum, r, i) => sum + (r - meanReal) * (sim[i] - meanSim), 0);
    const denReal = Math.sqrt(real.reduce((sum, r) => sum + Math.pow(r - meanReal, 2), 0));
    const denSim = Math.sqrt(sim.reduce((sum, s) => sum + Math.pow(s - meanSim, 2), 0));
    const pearson = numPearson / (denReal * denSim);
    
    return { rmse_uW: rmse * 1e6, r2, pearson };
}

// ============================================================================
// Main Validation
// ============================================================================

async function main() {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║           SolarTrack Automated Test Validator                ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    
    const expectedPath = './tests/expected/expected_metrics.json';
    const dataDir = './tests/data';
    
    if (!existsSync(expectedPath)) {
        console.error('❌ Expected metrics file not found!');
        console.error('   Run: node tests/generate_expected.js first');
        process.exit(1);
    }
    
    const expected = loadExpectedMetrics(expectedPath);
    const files = readdirSync(dataDir).filter(f => f.endsWith('.csv'));
    
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = [];
    
    console.log(`Testing ${files.length} gestures...\n`);
    console.log('─'.repeat(70));
    
    for (const file of files) {
        const gestureName = file.replace('__Synchronized.csv', '').replace('.csv', '');
        
        if (!expected[gestureName]) {
            console.log(`⚠️  ${gestureName}: No expected data (skipped)`);
            continue;
        }
        
        console.log(`\n📁 ${gestureName}`);
        
        const records = loadCSV(`${dataDir}/${file}`);
        const trajectory = extractTrajectory(records);
        
        for (const [configName, expectedData] of Object.entries(expected[gestureName])) {
            totalTests++;
            const config = expectedData.config;
            const { kappa, results } = simulateTrajectory(trajectory, config);
            const actualMetrics = computeMetrics(results);
            
            // Compare metrics
            const diffs = {
                rmse_uW: Math.abs(actualMetrics.rmse_uW - expectedData.metrics.rmse_uW),
                r2: Math.abs(actualMetrics.r2 - expectedData.metrics.r2),
                pearson: Math.abs(actualMetrics.pearson - expectedData.metrics.pearson)
            };
            
            const passed = 
                diffs.rmse_uW <= TOLERANCES.rmse_uW &&
                diffs.r2 <= TOLERANCES.r2 &&
                diffs.pearson <= TOLERANCES.pearson;
            
            if (passed) {
                passedTests++;
                console.log(`   ✅ ${configName}`);
            } else {
                failedTests.push({ gesture: gestureName, config: configName, diffs, expected: expectedData.metrics, actual: actualMetrics });
                console.log(`   ❌ ${configName}`);
                console.log(`      RMSE: expected ${expectedData.metrics.rmse_uW.toFixed(2)}µW, got ${actualMetrics.rmse_uW.toFixed(2)}µW (Δ${diffs.rmse_uW.toFixed(2)})`);
                console.log(`      R²: expected ${expectedData.metrics.r2.toFixed(4)}, got ${actualMetrics.r2.toFixed(4)} (Δ${diffs.r2.toFixed(4)})`);
                console.log(`      ρ: expected ${expectedData.metrics.pearson.toFixed(4)}, got ${actualMetrics.pearson.toFixed(4)} (Δ${diffs.pearson.toFixed(4)})`);
            }
        }
    }
    
    console.log('\n' + '─'.repeat(70));
    console.log('\n📊 SUMMARY');
    console.log(`   Total tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests} ✅`);
    console.log(`   Failed: ${failedTests.length} ❌`);
    
    if (failedTests.length === 0) {
        console.log('\n🎉 All tests passed!\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Check output above for details.\n');
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});

