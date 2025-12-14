#!/usr/bin/env python3
"""
export_gestures_to_json.py

Export gesture data from Python to JSON format for the web demo.
Exports positions, normals, real power, and pre-computed simulations.
"""

import sys
import json
import numpy as np
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent / "classification" / "publication_visuals"))
sys.path.append(str(Path(__file__).parent.parent / "classification" / "core"))

from motion_segmentation import process_motion_file
from scipy import integrate

def disk_integrand(phi, r_prime, a, L):
    """Integrand for the flat disk view factor."""
    denominator = (r_prime**2 - 2 * a * r_prime * np.cos(phi) + a**2 + L**2)**2
    if denominator == 0: 
        return 0
    return r_prime / denominator

def calculate_disk_view_factor(a, L, D):
    """Calculates the view factor for a flat disk using dblquad."""
    if L <= 0: 
        return 0
    try:
        integral_result, _ = integrate.dblquad(
            disk_integrand, 0, D/2, lambda r: 0, lambda r: 2 * np.pi, args=(a, L)
        )
        return (L**2 / np.pi) * integral_result
    except:
        return 0.0

def simulate_solar_power(positions, normals=None, model='oriented_disk'):
    """Simulate solar power using oriented disk model."""
    source_center = np.array([-159.81, 868.82, 168.23])
    source_diameter = 200.0
    
    simulated_power = []
    a_values = []
    H_values = []
    
    for i, hand_pos in enumerate(positions):
        L = source_center[1] - hand_pos[1]
        a = np.sqrt((source_center[0] - hand_pos[0])**2 + (source_center[2] - hand_pos[2])**2)
        
        a_values.append(float(a))
        H_values.append(float(L))
        
        disk_view_factor = calculate_disk_view_factor(a, L, source_diameter)
        
        if model == 'oriented_disk' and normals is not None and i < len(normals):
            cell_normal = -normals[i]
            vec_hand_to_lamp = source_center - hand_pos
            
            if np.linalg.norm(cell_normal) > 0 and np.linalg.norm(vec_hand_to_lamp) > 0:
                cos_theta = np.dot(cell_normal, vec_hand_to_lamp) / (
                    np.linalg.norm(cell_normal) * np.linalg.norm(vec_hand_to_lamp)
                )
                orientation_factor = max(0, cos_theta)
                disk_view_factor *= orientation_factor
        
        simulated_power.append(disk_view_factor)
    
    return np.array(simulated_power), a_values, H_values

def apply_per_segment_scaling(sim_power, real_power):
    """Apply per-segment scaling."""
    sim_min, sim_max = np.min(sim_power), np.max(sim_power)
    real_min, real_max = np.min(real_power), np.max(real_power)
    
    if sim_max > sim_min:
        sim_norm = (sim_power - sim_min) / (sim_max - sim_min)
        sim_scaled = real_min + sim_norm * (real_max - real_min)
    else:
        sim_scaled = np.full_like(sim_power, real_min)
    
    return sim_scaled

def export_gesture_to_json(motion_type, segment_index=0):
    """Export a single gesture to JSON format."""
    
    data_dir = Path(__file__).parent.parent / "radiometric_model" / "data"
    
    motion_files = {
        'Circle': 'Circle__Synchronized.csv',
        'One': 'One__Synchronized.csv',
        'Two': 'Two__Synchronized.csv', 
        'Three': 'Three__Synchronized.csv',
        'Triangle': 'Triangle__Synchronized.csv'
    }
    
    filename = motion_files[motion_type]
    
    print(f"Processing {motion_type} gesture...")
    
    # Process the file
    segments, df = process_motion_file(filename, motion_type, str(data_dir))
    
    if segment_index >= len(segments):
        segment_index = 0
    
    segment = segments[segment_index]
    
    # Extract data from segment
    leap_data = segment['leap_data']
    solar_data = segment['solar_data']
    
    positions = leap_data[['leap_palm_x', 'leap_palm_y', 'leap_palm_z']].values
    normals = leap_data[['leap_palm_normal_x', 'leap_palm_normal_y', 'leap_palm_normal_z']].values
    real_power = solar_data['solar_power_total'].values
    
    # Simulate with both models
    print(f"  - Simulating oriented disk model...")
    sim_oriented_raw, a_values, H_values = simulate_solar_power(positions, normals, 'oriented_disk')
    sim_oriented_scaled = apply_per_segment_scaling(sim_oriented_raw, real_power)
    
    print(f"  - Simulating parallel disk model...")
    sim_parallel_raw, _, _ = simulate_solar_power(positions, normals, 'parallel')
    sim_parallel_scaled = apply_per_segment_scaling(sim_parallel_raw, real_power)
    
    # Create JSON-serializable dictionary
    data = {
        'name': motion_type,
        'segment_index': segment_index,
        'duration': float(segment['duration']),
        'num_samples': len(positions),
        'sampling_rate': 100,  # Hz
        'positions': positions.tolist(),
        'normals': normals.tolist(),
        'real_power': real_power.tolist(),
        'sim_oriented': sim_oriented_scaled.tolist(),
        'sim_parallel': sim_parallel_scaled.tolist(),
        'a_values': a_values,
        'H_values': H_values,
        'light_source': {
            'position': [-159.81, 868.82, 168.23],
            'diameter': 200.0
        }
    }
    
    return data

def main():
    """Export gesture data for web demo."""
    
    # Gestures to export (matching five_panel_figure.py + additional ones)
    gestures_to_export = [
        ('Circle', 0),
        ('One', 6),
        ('Two', 0),
        ('Three', 0),
        ('Triangle', 0),
    ]
    
    output_dir = Path(__file__).parent / 'data'
    output_dir.mkdir(exist_ok=True)
    
    print("=" * 60)
    print("Exporting Gesture Data to JSON")
    print("=" * 60)
    print()
    
    for motion_type, segment_index in gestures_to_export:
        try:
            data = export_gesture_to_json(motion_type, segment_index)
            
            # Save to JSON file
            output_file = output_dir / f'{motion_type.lower()}.json'
            with open(output_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            print(f"  ✓ Saved to {output_file}")
            print(f"    Samples: {data['num_samples']}")
            print(f"    Duration: {data['duration']:.2f}s")
            print()
        
        except Exception as e:
            print(f"  ✗ Error processing {motion_type}: {e}")
            import traceback
            traceback.print_exc()
            print()
    
    print("=" * 60)
    print("✅ Export complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

