"""
View Factor Visualization v4 - Correct Lambertian Hemisphere
=============================================================

Shows:
1. Light source (glowing ball)
2. HALF sphere (hemisphere) growing around it - only the emitting side
3. Smooth RED gradient coloring based on cos(θ) - Lambertian intensity

Usage:
    manim -pql view_factor_v4.py LambertianHemisphere
"""

from manim import *
import numpy as np


class LambertianHemisphere(ThreeDScene):
    """
    Correct visualization:
    - Only the emitting hemisphere (not full sphere)
    - Smooth red gradient (no checkerboard)
    - Bright red at center (high intensity), darker at edges (low intensity)
    """
    
    def construct(self):
        # Camera setup
        self.set_camera_orientation(
            phi=60 * DEGREES,
            theta=-30 * DEGREES,
            zoom=0.85
        )
        
        # Parameters
        light_radius = 0.25
        hemisphere_radius = 2.0
        
        # ============== LIGHT SOURCE ==============
        
        # The lamp - glowing ball
        light_core = Sphere(radius=light_radius, resolution=(20, 20))
        light_core.set_color(YELLOW)
        light_core.set_opacity(1.0)
        
        # Glow effect
        light_glow = Sphere(radius=light_radius * 1.5, resolution=(12, 12))
        light_glow.set_color(YELLOW)
        light_glow.set_opacity(0.3)
        
        # ============== LAMBERTIAN HEMISPHERE ==============
        
        # The emitter points DOWNWARD (normal = -Z)
        # So we draw the LOWER hemisphere (z < 0 relative to light)
        # Parametrize: u = azimuth [0, 2π], v = angle from -Z axis [0, π/2]
        
        def hemisphere_func(u, v):
            """
            Hemisphere pointing downward.
            u: azimuth [0, 2π]
            v: angle from the downward axis (-Z) [0, π/2]
               v=0 → straight down (center of hemisphere)
               v=π/2 → horizontal (edge of hemisphere)
            """
            r = hemisphere_radius
            # Direction: start from -Z and rotate by v, then rotate around Z by u
            x = r * np.sin(v) * np.cos(u)
            y = r * np.sin(v) * np.sin(u)
            z = -r * np.cos(v)  # Negative because pointing down
            return np.array([x, y, z])
        
        # Create the hemisphere surface with smooth coloring
        hemisphere = Surface(
            hemisphere_func,
            u_range=[0, TAU],
            v_range=[0, PI/2],
            resolution=(48, 24),
            fill_opacity=0.7,
            stroke_width=0,  # No wireframe
            checkerboard_colors=None,  # No checkerboard!
        )
        
        # Color each face based on Lambertian intensity
        # cos(θ) = cos(v) where v is angle from normal (-Z)
        # v=0 → cos(0)=1 → brightest (center)
        # v=π/2 → cos(π/2)=0 → dimmest (edge)
        
        # We need to color each submobject based on its position
        for submob in hemisphere.family_members_with_points():
            if hasattr(submob, 'get_center'):
                center = submob.get_center()
                # Normalize to get direction from origin
                if np.linalg.norm(center) > 0.01:
                    direction = center / np.linalg.norm(center)
                    # cos(θ) = -z component (since normal is -Z)
                    cos_theta = -direction[2]
                    cos_theta = np.clip(cos_theta, 0, 1)
                    
                    # Red gradient: bright red (high intensity) to dark red (low intensity)
                    # Using interpolation between dark red and bright red
                    bright_red = "#FF3333"
                    dark_red = "#330000"
                    color = interpolate_color(
                        ManimColor(dark_red),
                        ManimColor(bright_red),
                        cos_theta
                    )
                    submob.set_color(color)
        
        # ============== NORMAL ARROW ==============
        
        normal_arrow = Arrow3D(
            start=ORIGIN,
            end=np.array([0, 0, -1.5]),
            color=WHITE,
            thickness=0.02
        )
        
        # ============== LABELS ==============
        
        title = Text("Lambertian Emission", font_size=36, color=WHITE)
        title.to_corner(UL, buff=0.4)
        self.add_fixed_in_frame_mobjects(title)
        
        equation = MathTex(r"I(\theta) = I_0 \cos\theta", font_size=36)
        equation.to_corner(UR, buff=0.4)
        self.add_fixed_in_frame_mobjects(equation)
        
        # Intensity legend
        legend_label = Text("Intensity", font_size=24, color=WHITE)
        legend_high = VGroup(
            Circle(radius=0.15, fill_color="#FF3333", fill_opacity=1, stroke_width=0),
            Text("High (θ=0°)", font_size=18)
        ).arrange(RIGHT, buff=0.15)
        legend_low = VGroup(
            Circle(radius=0.15, fill_color="#330000", fill_opacity=1, stroke_width=0),
            Text("Low (θ=90°)", font_size=18)
        ).arrange(RIGHT, buff=0.15)
        
        legend = VGroup(legend_label, legend_high, legend_low).arrange(DOWN, aligned_edge=LEFT, buff=0.2)
        legend.to_corner(DL, buff=0.4)
        self.add_fixed_in_frame_mobjects(legend)
        
        # ============== ANIMATION ==============
        
        # Step 1: Show light source
        self.play(
            FadeIn(light_core),
            FadeIn(light_glow),
            run_time=1
        )
        self.wait(0.5)
        
        # Step 2: Show normal direction
        self.play(Create(normal_arrow), run_time=0.8)
        self.wait(0.3)
        
        # Step 3: Grow the hemisphere
        hemisphere_copy = hemisphere.copy()
        hemisphere_copy.scale(0.01)
        self.add(hemisphere_copy)
        
        self.play(
            hemisphere_copy.animate.scale(100),
            run_time=2.5,
            rate_func=smooth
        )
        self.wait(0.5)
        
        # Step 4: Rotate to show 3D structure
        self.begin_ambient_camera_rotation(rate=0.2)
        self.wait(4)
        self.stop_ambient_camera_rotation()
        
        self.wait(1)


class LambertianHemisphereClean(ThreeDScene):
    """
    Even cleaner version using Dots instead of Surface for guaranteed smooth coloring.
    """
    
    def construct(self):
        self.set_camera_orientation(phi=55 * DEGREES, theta=-35 * DEGREES, zoom=0.9)
        
        light_radius = 0.2
        hemisphere_radius = 2.0
        
        # Light source
        light = Sphere(radius=light_radius, resolution=(16, 16))
        light.set_color(YELLOW).set_opacity(1.0)
        
        glow = Sphere(radius=light_radius * 1.4, resolution=(10, 10))
        glow.set_color(YELLOW).set_opacity(0.25)
        
        # Build hemisphere as a collection of colored dots/small spheres
        # This guarantees smooth coloring with no checkerboard
        hemisphere_dots = VGroup()
        
        n_rings = 20
        n_per_ring_base = 40
        
        for i in range(n_rings):
            v = (PI / 2) * (i + 0.5) / n_rings  # Angle from -Z axis
            cos_theta = np.cos(v)
            
            # Color based on cos(theta)
            bright_red = "#FF4444"
            dark_red = "#440000"
            color = interpolate_color(ManimColor(dark_red), ManimColor(bright_red), cos_theta)
            
            # Number of dots in this ring (fewer near center, more near edge)
            n_in_ring = max(6, int(n_per_ring_base * np.sin(v)))
            
            ring_radius = hemisphere_radius * np.sin(v)
            ring_z = -hemisphere_radius * np.cos(v)
            
            for j in range(n_in_ring):
                u = TAU * j / n_in_ring
                x = ring_radius * np.cos(u)
                y = ring_radius * np.sin(u)
                
                dot = Dot3D(
                    point=[x, y, ring_z],
                    radius=0.06,
                    color=color
                )
                hemisphere_dots.add(dot)
        
        # Normal arrow
        normal_arrow = Arrow3D(
            ORIGIN, [0, 0, -1.3],
            color=WHITE,
            thickness=0.02
        )
        
        # Title
        title = Text("Lambertian Emission", font_size=36)
        title.to_corner(UL, buff=0.4)
        self.add_fixed_in_frame_mobjects(title)
        
        # Equation
        eq = MathTex(r"I(\theta) = I_0 \cos\theta", font_size=32)
        eq.to_corner(UR, buff=0.4)
        self.add_fixed_in_frame_mobjects(eq)
        
        # Animation
        self.play(FadeIn(light), FadeIn(glow), run_time=1)
        self.wait(0.3)
        
        self.play(Create(normal_arrow), run_time=0.6)
        
        # Grow hemisphere (fade in with scale)
        hemisphere_dots.scale(0.01)
        self.add(hemisphere_dots)
        self.play(
            hemisphere_dots.animate.scale(100),
            run_time=2,
            rate_func=smooth
        )
        
        self.wait(0.5)
        
        # Rotate
        self.begin_ambient_camera_rotation(rate=0.25)
        self.wait(3)
        self.stop_ambient_camera_rotation()
        
        self.wait(0.5)


if __name__ == "__main__":
    print("Run:")
    print("  manim -pql view_factor_v4.py LambertianHemisphere")
    print("  manim -pql view_factor_v4.py LambertianHemisphereClean")

