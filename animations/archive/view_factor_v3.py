"""
View Factor Visualization v3 - Building from the Light Source
==============================================================

Step-by-step construction:
1. Draw the light source (glowing ball)
2. Grow a transparent sphere around it (radiation space)
3. Color the sphere according to Lambertian emission (cos θ)

Usage:
    manim -pql view_factor_v3.py LambertianSphere
"""

from manim import *
import numpy as np


class LambertianSphere(ThreeDScene):
    """
    Step 1: Establish the radiation space around the light source.
    
    Shows:
    - Light source as a glowing ball
    - Transparent sphere growing around it
    - Sphere colored by Lambertian emission pattern (cos θ from normal)
    """
    
    def construct(self):
        # ============== CAMERA ==============
        self.set_camera_orientation(
            phi=70 * DEGREES,
            theta=-45 * DEGREES,
            zoom=0.9
        )
        
        # ============== PARAMETERS ==============
        light_radius = 0.3          # Physical size of light source
        sphere_radius = 2.0         # Visualization sphere radius
        
        # The light source emits DOWNWARD (toward a cell below)
        # So the emitter normal is -Z
        emitter_normal = np.array([0, 0, -1])
        
        # ============== STEP 1: LIGHT SOURCE ==============
        
        # The lamp - a glowing ball
        light_source = Sphere(
            radius=light_radius,
            resolution=(24, 24)
        ).set_color(YELLOW).set_opacity(1.0)
        
        # Add a glow effect using a larger transparent sphere
        light_glow = Sphere(
            radius=light_radius * 1.5,
            resolution=(16, 16)
        ).set_color(YELLOW).set_opacity(0.3)
        
        light_group = VGroup(light_source, light_glow)
        
        # Label
        light_label = Text("Light Source", font_size=28, color=YELLOW)
        light_label.next_to(light_group, UP + RIGHT, buff=0.5)
        self.add_fixed_orientation_mobjects(light_label)
        
        # ============== STEP 2: RADIATION SPHERE ==============
        
        # Create the radiation sphere - transparent, will be colored
        def create_radiation_sphere(radius, opacity=0.4):
            """Create a sphere colored by Lambertian emission pattern."""
            
            def sphere_func(u, v):
                """Parametric sphere: u = azimuth [0, 2π], v = polar [0, π]"""
                x = radius * np.sin(v) * np.cos(u)
                y = radius * np.sin(v) * np.sin(u)
                z = radius * np.cos(v)
                return np.array([x, y, z])
            
            def lambertian_color(u, v):
                """
                Color based on Lambertian emission.
                
                The emitter normal is -Z (pointing down).
                cos(θ) = dot(direction, emitter_normal)
                
                For a direction at polar angle v from +Z:
                - direction = (sin(v)cos(u), sin(v)sin(u), cos(v))
                - dot with -Z = -cos(v)
                
                So cos(θ_emission) = -cos(v) = cos(π - v)
                
                For the LOWER hemisphere (v > π/2): cos(θ) > 0 → emits
                For the UPPER hemisphere (v < π/2): cos(θ) < 0 → no emission
                """
                # Direction vector at this point on sphere
                direction = np.array([
                    np.sin(v) * np.cos(u),
                    np.sin(v) * np.sin(u),
                    np.cos(v)
                ])
                
                # Cosine of angle from emitter normal (-Z)
                cos_theta = np.dot(direction, emitter_normal)  # = -cos(v)
                
                if cos_theta <= 0:
                    # Upper hemisphere - no emission (behind the disk)
                    return GREY_E
                else:
                    # Lower hemisphere - emission proportional to cos(θ)
                    # Red = high emission (straight down), Green = low (grazing)
                    return interpolate_color(GREEN, RED, cos_theta)
            
            sphere = Surface(
                sphere_func,
                u_range=[0, TAU],
                v_range=[0, PI],
                resolution=(48, 32),
                fill_opacity=opacity,
                stroke_width=0.5,
                stroke_color=WHITE,
                stroke_opacity=0.2,
            )
            
            # Apply colors
            sphere.set_color_by_function(lambertian_color)
            
            return sphere
        
        # Create sphere at target size (will animate from small)
        radiation_sphere = create_radiation_sphere(sphere_radius, opacity=0.5)
        
        # ============== STEP 3: ANNOTATIONS ==============
        
        # Arrow showing emitter normal direction
        normal_arrow = Arrow3D(
            start=ORIGIN,
            end=np.array([0, 0, -1.5]),
            color=RED,
            thickness=0.03
        )
        
        normal_label = Text("Emitter Normal", font_size=20, color=RED)
        normal_label.move_to([0.8, 0, -1.8])
        self.add_fixed_orientation_mobjects(normal_label)
        
        # Legend
        legend = VGroup(
            VGroup(
                Square(side_length=0.3, fill_color=RED, fill_opacity=0.8, stroke_width=0),
                Text("High emission (cos θ ≈ 1)", font_size=20)
            ).arrange(RIGHT, buff=0.2),
            VGroup(
                Square(side_length=0.3, fill_color=GREEN, fill_opacity=0.8, stroke_width=0),
                Text("Low emission (cos θ ≈ 0)", font_size=20)
            ).arrange(RIGHT, buff=0.2),
            VGroup(
                Square(side_length=0.3, fill_color=GREY, fill_opacity=0.8, stroke_width=0),
                Text("No emission (behind disk)", font_size=20)
            ).arrange(RIGHT, buff=0.2),
        ).arrange(DOWN, aligned_edge=LEFT, buff=0.15)
        legend.to_corner(DL, buff=0.5)
        self.add_fixed_in_frame_mobjects(legend)
        
        # Title
        title = Text("Lambertian Emission Pattern", font_size=36, color=WHITE)
        title.to_corner(UL, buff=0.5)
        self.add_fixed_in_frame_mobjects(title)
        
        # ============== ANIMATION ==============
        
        # Step 1: Show the light source
        self.play(
            FadeIn(light_source),
            FadeIn(light_glow),
            FadeIn(light_label),
            run_time=1.5
        )
        self.wait(1)
        
        # Step 2: Show emitter normal
        self.play(
            Create(normal_arrow),
            FadeIn(normal_label),
            run_time=1
        )
        self.wait(0.5)
        
        # Step 3: Grow the radiation sphere
        # Start with a tiny sphere and scale up
        radiation_sphere.scale(0.01)  # Start very small
        self.add(radiation_sphere)
        
        self.play(
            radiation_sphere.animate.scale(100),  # Scale to full size (0.01 * 100 = 1.0)
            run_time=3,
            rate_func=smooth
        )
        self.wait(1)
        
        # Step 4: Slowly rotate to show 3D structure
        self.begin_ambient_camera_rotation(rate=0.15)
        self.wait(4)
        self.stop_ambient_camera_rotation()
        
        self.wait(1)


class LambertianSphereSimple(ThreeDScene):
    """
    Simpler version - just the key concept without extra annotations.
    Good for GIF export.
    """
    
    def construct(self):
        self.set_camera_orientation(phi=65 * DEGREES, theta=-30 * DEGREES, zoom=0.85)
        
        light_radius = 0.25
        sphere_radius = 2.0
        emitter_normal = np.array([0, 0, -1])  # Pointing down
        
        # Light source
        light = Sphere(radius=light_radius, resolution=(20, 20))
        light.set_color(YELLOW).set_opacity(1.0)
        
        glow = Sphere(radius=light_radius * 1.4, resolution=(12, 12))
        glow.set_color(YELLOW).set_opacity(0.25)
        
        # Radiation sphere with Lambertian coloring
        def sphere_func(u, v):
            r = sphere_radius
            return np.array([
                r * np.sin(v) * np.cos(u),
                r * np.sin(v) * np.sin(u),
                r * np.cos(v)
            ])
        
        def lambertian_color(u, v):
            direction = np.array([
                np.sin(v) * np.cos(u),
                np.sin(v) * np.sin(u),
                np.cos(v)
            ])
            cos_theta = np.dot(direction, emitter_normal)
            
            if cos_theta <= 0:
                return interpolate_color(GREY_E, GREY_D, abs(cos_theta) * 0.3)
            else:
                return interpolate_color(GREEN, RED, cos_theta)
        
        radiation_sphere = Surface(
            sphere_func,
            u_range=[0, TAU],
            v_range=[0, PI],
            resolution=(40, 28),
            fill_opacity=0.55,
            stroke_width=0,
        ).set_color_by_function(lambertian_color)
        
        # Normal direction indicator
        normal_arrow = Arrow3D(
            ORIGIN, 
            np.array([0, 0, -1.2]),
            color=WHITE,
            thickness=0.025
        )
        
        # Title
        title = Text("Lambertian Emission", font_size=32, color=WHITE)
        title.to_corner(UL, buff=0.4)
        self.add_fixed_in_frame_mobjects(title)
        
        # Equation
        equation = MathTex(r"I(\theta) = I_0 \cos\theta", font_size=36)
        equation.to_corner(UR, buff=0.4)
        self.add_fixed_in_frame_mobjects(equation)
        
        # Animation
        self.play(FadeIn(light), FadeIn(glow), run_time=1)
        self.wait(0.5)
        
        self.play(Create(normal_arrow), run_time=0.8)
        
        # Grow sphere
        radiation_sphere.scale(0.01)
        self.add(radiation_sphere)
        self.play(
            radiation_sphere.animate.scale(100),
            run_time=2.5,
            rate_func=smooth
        )
        
        self.wait(0.5)
        
        # Rotate to show 3D
        self.begin_ambient_camera_rotation(rate=0.2)
        self.wait(3)
        self.stop_ambient_camera_rotation()
        
        self.wait(0.5)


if __name__ == "__main__":
    print("Run with:")
    print("  manim -pql view_factor_v3.py LambertianSphere")
    print("  manim -pql view_factor_v3.py LambertianSphereSimple")

