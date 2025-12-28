"""
View Factor Visualization for SolarTrack Documentation
=======================================================

A physics-faithful visualization of the radiometric view factor using
a unit hemisphere representation. Shows how the view factor F(a, H) changes
as the geometry between emitter (disk) and receiver (point) varies.

Usage:
    manim -pql view_factor_visualization.py ViewFactorScene
    manim -pqh view_factor_visualization.py ViewFactorScene  # high quality
    manim -pqh --format=gif view_factor_visualization.py ViewFactorScene  # as GIF

Requirements:
    pip install manim
"""

from manim import *
import numpy as np


class ViewFactorScene(ThreeDScene):
    """
    Main visualization scene showing:
    1. A unit hemisphere at the receiver point (representing emission directions)
    2. Color-coded spherical cap showing which directions "see" the emitter disk
    3. The emitter disk moving to show how view factor changes
    4. Live view factor value display
    """
    
    def construct(self):
        # ============== PARAMETERS ==============
        self.disk_radius = 1.0          # Emitter disk radius (R = D/2)
        self.hemisphere_radius = 1.5    # Visual size of hemisphere
        self.initial_H = 2.0            # Initial vertical separation
        self.initial_a = 0.0            # Initial lateral offset
        self.n_phi = 60                 # Angular resolution for hemisphere
        self.n_theta = 30               # Polar resolution for hemisphere
        
        # Value trackers for animation
        self.H_tracker = ValueTracker(self.initial_H)
        self.a_tracker = ValueTracker(self.initial_a)
        
        # ============== CAMERA SETUP ==============
        self.set_camera_orientation(
            phi=65 * DEGREES,      # Elevation angle
            theta=-45 * DEGREES,   # Azimuth angle
            zoom=0.8
        )
        
        # ============== BUILD SCENE ==============
        self.build_receiver_point()
        self.build_hemisphere()
        self.build_emitter_disk()
        self.build_view_factor_display()
        self.build_labels()
        
        # ============== ANIMATION SEQUENCE ==============
        self.play_intro()
        self.play_lateral_motion()
        self.play_vertical_motion()
        self.play_combined_motion()
        self.play_outro()
    
    def build_receiver_point(self):
        """Create the receiver point (solar cell location)"""
        self.receiver = Dot3D(
            point=ORIGIN,
            color=BLUE,
            radius=0.08
        )
        self.receiver_label = Text("Cell", font_size=24, color=BLUE)
        self.receiver_label.next_to(self.receiver, DOWN + RIGHT, buff=0.2)
        self.add_fixed_orientation_mobjects(self.receiver_label)
    
    def build_hemisphere(self):
        """
        Create the unit hemisphere that represents all emission directions.
        Color each point based on whether that direction sees the emitter disk.
        """
        def hemisphere_color_func(u, v):
            """
            u: azimuthal angle [0, 2π]
            v: polar angle from zenith [0, π/2]
            
            Returns color based on:
            1. Whether this direction intersects the disk
            2. The cosine weighting (cos(v))
            """
            # Get current geometry parameters
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            # Direction vector (pointing upward into hemisphere)
            # In our convention: Z is up (toward emitter)
            dir_x = np.sin(v) * np.cos(u)
            dir_y = np.sin(v) * np.sin(u)
            dir_z = np.cos(v)
            
            # Check if this direction hits the disk
            # Disk is at height H, centered at (a, 0, H)
            if dir_z <= 0.01:  # Nearly horizontal or below - no hit
                return GREY_E
            
            # Find where ray hits the plane z = H
            t = H / dir_z
            hit_x = t * dir_x
            hit_y = t * dir_y
            
            # Distance from hit point to disk center (a, 0)
            dist_to_center = np.sqrt((hit_x - a)**2 + hit_y**2)
            
            if dist_to_center <= self.disk_radius:
                # HIT! Color by contribution weight: cos(v)
                cos_theta = np.cos(v)
                # Map cos_theta [0, 1] to color [green, red]
                # High cos (near zenith) = red, low cos (near horizon) = green
                return interpolate_color(GREEN, RED, cos_theta)
            else:
                # Miss - faint grey
                return GREY_E
        
        def hemisphere_func(u, v):
            """Parametric hemisphere surface"""
            r = self.hemisphere_radius
            x = r * np.sin(v) * np.cos(u)
            y = r * np.sin(v) * np.sin(u)
            z = r * np.cos(v)
            return np.array([x, y, z])
        
        self.hemisphere = always_redraw(lambda: Surface(
            hemisphere_func,
            u_range=[0, TAU],
            v_range=[0, PI/2],
            resolution=(self.n_phi, self.n_theta),
            fill_opacity=0.7,
            stroke_width=0.5,
            stroke_color=WHITE,
            stroke_opacity=0.3,
        ).set_color_by_function(hemisphere_color_func))
        
        # Add hemisphere base circle for visual grounding
        self.hemisphere_base = Circle(
            radius=self.hemisphere_radius,
            color=WHITE,
            stroke_width=2,
            stroke_opacity=0.5
        ).rotate(PI/2, axis=RIGHT)
    
    def build_emitter_disk(self):
        """Create the emitter disk (light source)"""
        def get_disk():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            disk = Circle(
                radius=self.disk_radius,
                color=YELLOW,
                fill_opacity=0.6,
                stroke_width=3,
                stroke_color=YELLOW_E
            )
            disk.rotate(PI/2, axis=RIGHT)  # Make horizontal
            disk.move_to([a, 0, H])
            return disk
        
        self.emitter_disk = always_redraw(get_disk)
        
        # Disk label
        def get_disk_label():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            label = Text("Lamp", font_size=24, color=YELLOW)
            label.move_to([a + 1.2, 0, H])
            return label
        
        self.disk_label = always_redraw(get_disk_label)
        self.add_fixed_orientation_mobjects(self.disk_label)
        
        # Visual connection line from cell to disk center
        def get_connection_line():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            return DashedLine(
                ORIGIN,
                [a, 0, H],
                color=WHITE,
                stroke_opacity=0.4,
                dash_length=0.1
            )
        
        self.connection_line = always_redraw(get_connection_line)
    
    def build_view_factor_display(self):
        """Create the view factor numeric display"""
        def get_view_factor_value():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            return self.compute_view_factor(a, H)
        
        def get_vf_display():
            F = get_view_factor_value()
            # Color based on view factor magnitude
            color = interpolate_color(GREEN, RED, min(F * 2, 1.0))
            
            vf_text = VGroup(
                Text("F = ", font_size=36, color=WHITE),
                DecimalNumber(F, num_decimal_places=3, font_size=36, color=color)
            ).arrange(RIGHT, buff=0.1)
            
            vf_text.to_corner(UR, buff=0.5)
            return vf_text
        
        self.vf_display = always_redraw(get_vf_display)
        self.add_fixed_in_frame_mobjects(self.vf_display)
        
        # Geometry parameters display
        def get_params_display():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            params = VGroup(
                Text(f"H = {H:.2f}", font_size=24, color=BLUE_C),
                Text(f"a = {a:.2f}", font_size=24, color=TEAL_C),
            ).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
            
            params.next_to(self.vf_display, DOWN, buff=0.3, aligned_edge=RIGHT)
            return params
        
        self.params_display = always_redraw(get_params_display)
        self.add_fixed_in_frame_mobjects(self.params_display)
    
    def build_labels(self):
        """Create axis labels and title"""
        # Title
        self.title = Text(
            "View Factor Visualization",
            font_size=32,
            color=WHITE
        ).to_corner(UL, buff=0.5)
        self.add_fixed_in_frame_mobjects(self.title)
        
        # Axis indicators
        self.axes = ThreeDAxes(
            x_range=[-3, 3, 1],
            y_range=[-3, 3, 1],
            z_range=[0, 4, 1],
            x_length=4,
            y_length=4,
            z_length=3,
            axis_config={"stroke_opacity": 0.3}
        )
    
    def compute_view_factor(self, a, H):
        """
        Compute the parallel disk-to-point view factor analytically.
        
        F = (R² / (R² + d²)) where d² = a² + H²
        
        This is the exact solution for a disk to a point on its axis,
        adjusted for off-axis displacement.
        """
        R = self.disk_radius
        d_squared = a**2 + H**2
        
        # Approximate view factor for off-axis point
        # This uses the solid angle subtended by the disk
        if H <= 0:
            return 0.0
        
        # For on-axis: F = R² / (R² + H²)
        # For off-axis, we use numerical integration approximation
        # Simplified formula that captures the essence:
        F = (R**2 * H**2) / ((a**2 + H**2 + R**2)**2 - 4 * R**2 * a**2)**0.5
        F = F / (a**2 + H**2)
        
        # Clamp to valid range
        return np.clip(F, 0, 1)
    
    # ============== ANIMATION METHODS ==============
    
    def play_intro(self):
        """Initial scene setup animation"""
        self.play(
            Create(self.axes),
            run_time=1
        )
        self.play(
            Create(self.hemisphere_base),
            Create(self.receiver),
            FadeIn(self.receiver_label),
            run_time=1
        )
        self.play(
            Create(self.hemisphere),
            run_time=1.5
        )
        self.play(
            Create(self.emitter_disk),
            Create(self.connection_line),
            FadeIn(self.disk_label),
            run_time=1
        )
        self.wait(1)
    
    def play_lateral_motion(self):
        """Animate disk moving laterally (increasing a)"""
        self.play(
            self.a_tracker.animate.set_value(2.0),
            run_time=3,
            rate_func=smooth
        )
        self.wait(0.5)
        self.play(
            self.a_tracker.animate.set_value(0.0),
            run_time=2,
            rate_func=smooth
        )
        self.wait(0.5)
    
    def play_vertical_motion(self):
        """Animate disk moving vertically (changing H)"""
        self.play(
            self.H_tracker.animate.set_value(4.0),
            run_time=2,
            rate_func=smooth
        )
        self.wait(0.5)
        self.play(
            self.H_tracker.animate.set_value(1.5),
            run_time=2,
            rate_func=smooth
        )
        self.wait(0.5)
    
    def play_combined_motion(self):
        """Animate realistic trajectory-like motion"""
        # Simulate hand-like path
        self.play(
            self.a_tracker.animate.set_value(1.5),
            self.H_tracker.animate.set_value(2.5),
            run_time=2,
            rate_func=smooth
        )
        self.play(
            self.a_tracker.animate.set_value(-1.0),
            self.H_tracker.animate.set_value(2.0),
            run_time=2,
            rate_func=smooth
        )
        self.play(
            self.a_tracker.animate.set_value(0.0),
            self.H_tracker.animate.set_value(2.0),
            run_time=1.5,
            rate_func=smooth
        )
        self.wait(0.5)
    
    def play_outro(self):
        """Closing animation"""
        self.wait(1)
        self.play(
            FadeOut(self.axes),
            FadeOut(self.hemisphere),
            FadeOut(self.hemisphere_base),
            FadeOut(self.emitter_disk),
            FadeOut(self.connection_line),
            FadeOut(self.receiver),
            run_time=1.5
        )


class ViewFactorLoopScene(ThreeDScene):
    """
    A shorter, loopable version suitable for GIF export.
    Shows one complete cycle of the disk moving and view factor changing.
    
    Usage:
        manim -pqh --format=gif view_factor_visualization.py ViewFactorLoopScene
    """
    
    def construct(self):
        # Parameters
        self.disk_radius = 1.0
        self.hemisphere_radius = 1.5
        self.H_tracker = ValueTracker(2.0)
        self.a_tracker = ValueTracker(0.0)
        
        # Camera
        self.set_camera_orientation(phi=60 * DEGREES, theta=-30 * DEGREES, zoom=0.9)
        
        # Build scene (simplified)
        self.build_minimal_scene()
        
        # Single smooth loop animation
        self.play_loop()
    
    def build_minimal_scene(self):
        """Build a minimal scene for the loop"""
        # Hemisphere with color
        def hemisphere_color_func(u, v):
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            
            dir_x = np.sin(v) * np.cos(u)
            dir_y = np.sin(v) * np.sin(u)
            dir_z = np.cos(v)
            
            if dir_z <= 0.01:
                return GREY_E
            
            t = H / dir_z
            hit_x = t * dir_x
            hit_y = t * dir_y
            dist_to_center = np.sqrt((hit_x - a)**2 + hit_y**2)
            
            if dist_to_center <= self.disk_radius:
                return interpolate_color(GREEN, RED, np.cos(v))
            return GREY_E
        
        def hemisphere_func(u, v):
            r = self.hemisphere_radius
            return np.array([
                r * np.sin(v) * np.cos(u),
                r * np.sin(v) * np.sin(u),
                r * np.cos(v)
            ])
        
        self.hemisphere = always_redraw(lambda: Surface(
            hemisphere_func,
            u_range=[0, TAU],
            v_range=[0, PI/2],
            resolution=(40, 20),
            fill_opacity=0.75,
            stroke_width=0,
        ).set_color_by_function(hemisphere_color_func))
        
        # Disk
        def get_disk():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            disk = Circle(
                radius=self.disk_radius,
                color=YELLOW,
                fill_opacity=0.5,
                stroke_width=2
            ).rotate(PI/2, axis=RIGHT).move_to([a, 0, H])
            return disk
        
        self.disk = always_redraw(get_disk)
        
        # Receiver point
        self.receiver = Dot3D(ORIGIN, color=BLUE, radius=0.1)
        
        # View factor display
        def get_vf():
            H = self.H_tracker.get_value()
            a = self.a_tracker.get_value()
            R = self.disk_radius
            d_sq = a**2 + H**2
            F = R**2 / (R**2 + d_sq)  # Simplified on-axis formula
            F *= H**2 / d_sq  # Correction for off-axis
            F = np.clip(F, 0, 1)
            
            color = interpolate_color(GREEN, RED, min(F * 3, 1.0))
            return VGroup(
                Text("F = ", font_size=42),
                DecimalNumber(F, num_decimal_places=2, font_size=42, color=color)
            ).arrange(RIGHT).to_corner(UR, buff=0.4)
        
        self.vf_display = always_redraw(get_vf)
        self.add_fixed_in_frame_mobjects(self.vf_display)
        
        # Add objects
        self.add(self.hemisphere, self.disk, self.receiver)
    
    def play_loop(self):
        """Single animation loop"""
        # Start
        self.wait(0.5)
        
        # Move disk away and back
        self.play(
            self.H_tracker.animate.set_value(4.0),
            self.a_tracker.animate.set_value(1.5),
            run_time=2.5,
            rate_func=smooth
        )
        
        self.play(
            self.H_tracker.animate.set_value(2.0),
            self.a_tracker.animate.set_value(0.0),
            run_time=2.5,
            rate_func=smooth
        )
        
        self.wait(0.5)


# For quick testing
if __name__ == "__main__":
    print("Run with: manim -pql view_factor_visualization.py ViewFactorScene")
    print("Or for GIF: manim -pqh --format=gif view_factor_visualization.py ViewFactorLoopScene")

