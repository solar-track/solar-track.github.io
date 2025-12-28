"""
View Factor Visualization v2 - Clear and Meaningful
====================================================

A focused visualization showing:
1. The physical setup (disk emitter above point receiver)
2. The "cone of visibility" from the receiver to the disk
3. How the solid angle (and thus view factor) changes with geometry

This version prioritizes CLARITY over fancy hemisphere rendering.

Usage:
    manim -pql view_factor_v2.py ViewFactorClear
    manim -pqh view_factor_v2.py ViewFactorClear
"""

from manim import *
import numpy as np


class ViewFactorClear(ThreeDScene):
    """
    Clear visualization of disk-to-point view factor.
    
    Shows:
    - Disk emitter (lamp) above
    - Point receiver (cell) below
    - Cone of visibility connecting them
    - View factor value that updates as geometry changes
    """
    
    def construct(self):
        # ============== SETUP ==============
        self.R = 1.0  # Disk radius
        self.H_tracker = ValueTracker(2.5)  # Vertical separation
        self.a_tracker = ValueTracker(0.0)  # Lateral offset
        
        # Camera - side view to see the geometry clearly
        self.set_camera_orientation(
            phi=75 * DEGREES,
            theta=-60 * DEGREES,
            zoom=0.7
        )
        
        # ============== BUILD SCENE ==============
        
        # 1. Ground plane (reference)
        ground = Square(side_length=6, fill_opacity=0.1, fill_color=BLUE, stroke_width=1)
        ground.rotate(PI/2, axis=RIGHT)
        ground.shift(DOWN * 0.01)
        
        # 2. Receiver point (solar cell)
        receiver = Dot3D(ORIGIN, color=BLUE, radius=0.12)
        receiver_label = Text("Cell", font_size=28, color=BLUE)
        receiver_label.next_to(receiver, DOWN + LEFT, buff=0.3)
        self.add_fixed_orientation_mobjects(receiver_label)
        
        # 3. Disk emitter (lamp) - updates with trackers
        def get_disk():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            disk = Circle(radius=self.R, color=YELLOW, fill_opacity=0.4, stroke_width=3)
            disk.rotate(PI/2, axis=RIGHT)
            disk.move_to([a, 0, H])
            return disk
        
        disk = always_redraw(get_disk)
        
        # Disk label
        def get_disk_label():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            label = Text("Lamp", font_size=28, color=YELLOW)
            label.move_to([a + 1.5, 0, H])
            return label
        disk_label = always_redraw(get_disk_label)
        self.add_fixed_orientation_mobjects(disk_label)
        
        # 4. Visibility cone - THE KEY VISUAL
        # This shows the solid angle subtended by the disk as seen from the cell
        def get_cone():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            if H <= 0.1:
                return VGroup()  # No cone if disk is at cell level
            
            # Create cone from receiver to disk edge
            # Cone apex at origin, opening toward disk
            n_segments = 32
            cone_points = []
            
            # Apex at receiver
            apex = ORIGIN
            
            # Create lines from apex to disk edge
            lines = VGroup()
            for i in range(n_segments):
                theta = 2 * PI * i / n_segments
                # Point on disk edge
                edge_x = a + self.R * np.cos(theta)
                edge_y = self.R * np.sin(theta)
                edge_z = H
                edge_point = np.array([edge_x, edge_y, edge_z])
                
                line = Line3D(
                    apex, edge_point,
                    color=ORANGE,
                    stroke_width=1.5,
                    stroke_opacity=0.4
                )
                lines.add(line)
            
            # Add central axis line
            center_line = Line3D(
                apex,
                [a, 0, H],
                color=RED,
                stroke_width=3,
                stroke_opacity=0.8
            )
            lines.add(center_line)
            
            return lines
        
        cone = always_redraw(get_cone)
        
        # 5. Solid angle indicator on a small hemisphere at receiver
        def get_solid_angle_cap():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            # Half-angle of cone
            d = np.sqrt(a**2 + H**2)
            if d < 0.01:
                return VGroup()
            
            # Angular radius of disk as seen from receiver
            sin_alpha = self.R / np.sqrt(self.R**2 + d**2)
            alpha = np.arcsin(np.clip(sin_alpha, 0, 1))
            
            # Small hemisphere to show the solid angle
            hemisphere_r = 0.8
            
            # Create arc showing the angular extent
            # This is the "cap" on a unit sphere
            n_rings = 8
            n_points = 24
            
            cap_surface = VGroup()
            
            # Direction to disk center
            if d > 0.01:
                dir_to_disk = np.array([a, 0, H]) / d
            else:
                dir_to_disk = np.array([0, 0, 1])
            
            # Create the spherical cap as colored arcs
            for i in range(n_rings):
                ring_angle = alpha * (i + 1) / n_rings  # Angle from center direction
                ring_r = hemisphere_r * np.sin(ring_angle)
                ring_z = hemisphere_r * np.cos(ring_angle)
                
                # Color based on cosine (contribution weight)
                cos_val = np.cos(ring_angle)
                color = interpolate_color(GREEN, RED, cos_val)
                
                # Create ring around the direction to disk
                ring_points = []
                for j in range(n_points + 1):
                    phi = 2 * PI * j / n_points
                    
                    # Point on ring in local coords (z = toward disk)
                    local_x = ring_r * np.cos(phi)
                    local_y = ring_r * np.sin(phi)
                    local_z = ring_z
                    
                    # Rotate to align with direction to disk
                    # For simplicity, if disk is roughly above, just use z-axis alignment
                    # More complex rotation needed for off-axis
                    if abs(a) < 0.01:
                        point = np.array([local_x, local_y, local_z])
                    else:
                        # Rotate around y-axis to tilt toward disk
                        tilt_angle = np.arctan2(a, H)
                        cos_t, sin_t = np.cos(tilt_angle), np.sin(tilt_angle)
                        point = np.array([
                            local_x * cos_t + local_z * sin_t,
                            local_y,
                            -local_x * sin_t + local_z * cos_t
                        ])
                    
                    ring_points.append(point)
                
                if len(ring_points) > 1:
                    ring = VMobject(color=color, stroke_width=3, stroke_opacity=0.8)
                    ring.set_points_smoothly([p for p in ring_points])
                    cap_surface.add(ring)
            
            return cap_surface
        
        solid_angle_cap = always_redraw(get_solid_angle_cap)
        
        # 6. View factor display
        def get_vf_display():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            # Exact parallel disk-to-point view factor
            d_sq = a**2 + H**2
            F = (self.R**2) / (self.R**2 + d_sq)
            
            # Adjust for off-axis (approximate)
            if d_sq > 0:
                F *= (H**2) / d_sq
            
            F = np.clip(F, 0, 1)
            
            # Color based on magnitude
            color = interpolate_color(GREEN, RED, F)
            
            display = VGroup(
                Text("View Factor", font_size=24, color=WHITE),
                VGroup(
                    Text("F = ", font_size=36, color=WHITE),
                    DecimalNumber(F, num_decimal_places=3, font_size=36, color=color)
                ).arrange(RIGHT, buff=0.1)
            ).arrange(DOWN, buff=0.2)
            
            display.to_corner(UR, buff=0.5)
            return display
        
        vf_display = always_redraw(get_vf_display)
        self.add_fixed_in_frame_mobjects(vf_display)
        
        # 7. Geometry readout
        def get_geom_display():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            display = VGroup(
                Text(f"H = {H:.1f}", font_size=24, color=TEAL),
                Text(f"a = {a:.1f}", font_size=24, color=ORANGE),
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.1)
            
            display.to_corner(UL, buff=0.5)
            return display
        
        geom_display = always_redraw(get_geom_display)
        self.add_fixed_in_frame_mobjects(geom_display)
        
        # 8. Title
        title = Text("Disk → Point View Factor", font_size=32, color=WHITE)
        title.to_edge(DOWN, buff=0.3)
        self.add_fixed_in_frame_mobjects(title)
        
        # ============== ANIMATION ==============
        
        # Initial setup
        self.play(
            Create(ground),
            Create(receiver),
            FadeIn(receiver_label),
            run_time=1
        )
        
        self.play(
            Create(disk),
            FadeIn(disk_label),
            run_time=1
        )
        
        self.play(
            Create(cone),
            Create(solid_angle_cap),
            run_time=1.5
        )
        
        self.wait(1)
        
        # Animate: Move disk higher (H increases) - cone narrows, F decreases
        self.play(
            self.H_tracker.animate.set_value(5.0),
            run_time=3,
            rate_func=smooth
        )
        self.wait(0.5)
        
        # Move disk closer - cone widens, F increases
        self.play(
            self.H_tracker.animate.set_value(1.5),
            run_time=2,
            rate_func=smooth
        )
        self.wait(0.5)
        
        # Move disk laterally - cone tilts, F decreases
        self.play(
            self.a_tracker.animate.set_value(2.0),
            run_time=2,
            rate_func=smooth
        )
        self.wait(0.5)
        
        # Return to center
        self.play(
            self.a_tracker.animate.set_value(0.0),
            self.H_tracker.animate.set_value(2.5),
            run_time=2,
            rate_func=smooth
        )
        
        self.wait(1)


class ViewFactorSimple(ThreeDScene):
    """
    Even simpler version - just the cone visualization.
    Best for GIF export.
    """
    
    def construct(self):
        self.R = 1.0
        self.H_tracker = ValueTracker(2.5)
        self.a_tracker = ValueTracker(0.0)
        
        self.set_camera_orientation(phi=70 * DEGREES, theta=-45 * DEGREES, zoom=0.8)
        
        # Receiver
        receiver = Dot3D(ORIGIN, color=BLUE, radius=0.15)
        
        # Disk
        def get_disk():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            disk = Circle(radius=self.R, color=YELLOW, fill_opacity=0.5, stroke_width=4)
            disk.rotate(PI/2, axis=RIGHT)
            disk.move_to([a, 0, H])
            return disk
        disk = always_redraw(get_disk)
        
        # Cone outline only (cleaner)
        def get_cone_outline():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            if H <= 0.1:
                return VGroup()
            
            # Just 4 lines to show cone edges
            lines = VGroup()
            for theta in [0, PI/2, PI, 3*PI/2]:
                edge_x = a + self.R * np.cos(theta)
                edge_y = self.R * np.sin(theta)
                edge_z = H
                
                line = Line3D(
                    ORIGIN,
                    [edge_x, edge_y, edge_z],
                    color=ORANGE,
                    stroke_width=2,
                    stroke_opacity=0.6
                )
                lines.add(line)
            
            # Center line
            center = DashedLine(
                ORIGIN, [a, 0, H],
                color=WHITE,
                stroke_width=2,
                dash_length=0.15
            )
            lines.add(center)
            
            return lines
        
        cone = always_redraw(get_cone_outline)
        
        # Filled cone surface (semi-transparent)
        def get_cone_surface():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            if H <= 0.1:
                return VGroup()
            
            # Create cone as a surface
            def cone_func(u, v):
                # u: angle around cone [0, 2π]
                # v: height along cone [0, 1]
                edge_x = a + self.R * np.cos(u)
                edge_y = self.R * np.sin(u)
                edge_z = H
                
                # Interpolate from apex to edge
                x = v * edge_x
                y = v * edge_y
                z = v * edge_z
                
                return np.array([x, y, z])
            
            surface = Surface(
                cone_func,
                u_range=[0, TAU],
                v_range=[0, 1],
                resolution=(24, 2),
                fill_opacity=0.15,
                fill_color=ORANGE,
                stroke_width=0,
                checkerboard_colors=None
            )
            return surface
        
        cone_surface = always_redraw(get_cone_surface)
        
        # View factor display
        def get_vf():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            d_sq = a**2 + H**2
            F = (self.R**2) / (self.R**2 + d_sq)
            if d_sq > 0:
                F *= (H**2) / d_sq
            F = np.clip(F, 0, 1)
            
            color = interpolate_color(GREEN, RED, min(F * 2.5, 1))
            
            return VGroup(
                Text("F = ", font_size=48, color=WHITE),
                DecimalNumber(F, num_decimal_places=2, font_size=48, color=color)
            ).arrange(RIGHT).to_corner(UR, buff=0.4)
        
        vf_display = always_redraw(get_vf)
        self.add_fixed_in_frame_mobjects(vf_display)
        
        # Build scene
        self.add(receiver, disk, cone_surface, cone)
        
        self.wait(0.5)
        
        # Animation loop
        self.play(
            self.H_tracker.animate.set_value(4.5),
            run_time=2.5,
            rate_func=smooth
        )
        self.play(
            self.H_tracker.animate.set_value(1.5),
            run_time=2,
            rate_func=smooth
        )
        self.play(
            self.a_tracker.animate.set_value(1.5),
            run_time=1.5,
            rate_func=smooth
        )
        self.play(
            self.a_tracker.animate.set_value(0),
            self.H_tracker.animate.set_value(2.5),
            run_time=2,
            rate_func=smooth
        )
        
        self.wait(0.5)


if __name__ == "__main__":
    print("Run with:")
    print("  manim -pql view_factor_v2.py ViewFactorSimple")
    print("  manim -pql view_factor_v2.py ViewFactorClear")

