/**
 * scene3d.js
 * 
 * Three.js visualization for hand trajectory and light source.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class Scene3D {
    constructor(containerElement) {
        this.container = containerElement;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        
        // Scene objects
        this.handSprite = null;
        this.normalArrow = null;
        this.lightSprite = null;
        this.trajectoryLine = null;
        this.trajectoryPoints = null;
        this.cometTail = null;
        
        // Textures
        this.handTexture = null;
        this.lightTexture = null;
        
        // Animation state
        this.currentIndex = 0;
        this.positions = [];
        this.normals = [];
        
        this.init();
    }
    
    init() {
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf5f7fa);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(
            45,
            this.container.clientWidth / this.container.clientHeight,
            10,
            5000
        );
        this.camera.position.set(500, 800, 500);
        this.camera.lookAt(0, 600, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.target.set(0, 600, 0);
        this.controls.update();
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(200, 1000, 200);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);
        
        // Grid helper (floor)
        const gridHelper = new THREE.GridHelper(1000, 20, 0x888888, 0xcccccc);
        gridHelper.position.y = 0;
        this.scene.add(gridHelper);
        
        // Axes helper
        const axesHelper = new THREE.AxesHelper(200);
        axesHelper.position.set(0, 0, 0);
        this.scene.add(axesHelper);
        
        // Create hand and light immediately (will be replaced when textures load)
        this.createHandFallback();
        this.createLightSourceFallback([-159.81, 868.82, 168.23]);
        
        // Load textures and replace with SVG sprites
        this.loadTextures();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.animate();
    }
    
    async loadTextures() {
        const textureLoader = new THREE.TextureLoader();
        
        try {
            this.handTexture = await textureLoader.loadAsync('./assets/hand.svg');
            this.lightTexture = await textureLoader.loadAsync('./assets/light.svg');
            console.log('✓ SVG textures loaded');
            
            // Replace fallback objects with SVG sprites
            this.replaceWithSVGSprites();
        } catch (error) {
            console.error('Error loading textures:', error);
            console.log('Using fallback sphere representations');
        }
    }
    
    replaceWithSVGSprites() {
        // Get current positions before replacing
        const handPos = this.handSprite ? this.handSprite.position.clone() : new THREE.Vector3(0, 600, 0);
        const lightPos = this.lightSprite ? this.lightSprite.position.clone() : new THREE.Vector3(-159.81, 868.82, 168.23);
        
        // Remove old objects
        if (this.handSprite) {
            this.scene.remove(this.handSprite);
        }
        if (this.lightSprite) {
            this.scene.remove(this.lightSprite);
        }
        
        // Create SVG hand sprite
        const handSpriteMaterial = new THREE.SpriteMaterial({ 
            map: this.handTexture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });
        this.handSprite = new THREE.Sprite(handSpriteMaterial);
        this.handSprite.scale.set(120, 120, 1); // Increased from 80 to 120
        this.handSprite.position.copy(handPos);
        this.scene.add(this.handSprite);
        
        // Create SVG light sprite
        const lightSpriteMaterial = new THREE.SpriteMaterial({ 
            map: this.lightTexture,
            transparent: true,
            depthTest: true,
            depthWrite: false
        });
        this.lightSprite = new THREE.Sprite(lightSpriteMaterial);
        this.lightSprite.scale.set(100, 120, 1);
        this.lightSprite.position.copy(lightPos);
        this.scene.add(this.lightSprite);
        
        console.log('✓ SVG sprites loaded and displayed');
    }
    
    createHandFallback() {
        // Fallback: sphere until SVG loads
        const geometry = new THREE.SphereGeometry(20, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff6b6b,
            roughness: 0.5,
            metalness: 0.2
        });
        this.handSprite = new THREE.Mesh(geometry, material);
        this.handSprite.castShadow = true;
        this.scene.add(this.handSprite);
        
        // Normal arrow - brown color #603913
        const arrowDir = new THREE.Vector3(0, 1, 0);
        const arrowOrigin = new THREE.Vector3(0, 0, 0);
        this.normalArrow = new THREE.ArrowHelper(
            arrowDir, arrowOrigin, 80, 0x603913, 25, 18
        );
        this.scene.add(this.normalArrow);
    }
    
    createLightSourceFallback(position) {
        // Fallback: glowing sphere until SVG loads
        const geometry = new THREE.SphereGeometry(50, 16, 16);
        const material = new THREE.MeshStandardMaterial({
            color: 0xffd700,
            emissive: 0xffd700,
            emissiveIntensity: 0.8
        });
        this.lightSprite = new THREE.Mesh(geometry, material);
        this.lightSprite.position.set(position[0], position[1], position[2]);
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(60, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffd700,
            transparent: true,
            opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.lightSprite.add(glow);
        
        this.scene.add(this.lightSprite);
    }
    
    createHand() {
        // This method is no longer used - sprites are created in createHandFallback
        // and replaced in replaceWithSVGSprites
    }
    
    createLightSource(position) {
        // Update light position (works with both fallback and SVG sprite)
        if (this.lightSprite) {
            this.lightSprite.position.set(position[0], position[1], position[2]);
        }
    }
    
    setTrajectory(positions, normals, powerValues) {
        this.positions = positions;
        this.normals = normals;
        
        // Remove existing trajectory if any
        if (this.trajectoryLine) {
            this.scene.remove(this.trajectoryLine);
        }
        if (this.trajectoryPoints) {
            this.scene.remove(this.trajectoryPoints);
        }
        if (this.cometTail) {
            this.scene.remove(this.cometTail);
        }
        
        // Create trajectory as thick tube for better visibility
        const points = positions.map(p => new THREE.Vector3(p[0], p[1], p[2]));
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeometry = new THREE.TubeGeometry(curve, points.length * 2, 3, 8, false);
        
        // Color by power (if provided) using copper colormap
        let tubeMaterial;
        if (powerValues && powerValues.length === positions.length) {
            // Create vertex colors for the tube using copper colormap
            const colors = [];
            const minPower = Math.min(...powerValues);
            const maxPower = Math.max(...powerValues);
            const range = maxPower - minPower;
            
            const positionAttribute = tubeGeometry.attributes.position;
            for (let i = 0; i < positionAttribute.count; i++) {
                // Map vertex to nearest point in trajectory
                const vertexIndex = Math.floor(i / (positionAttribute.count / positions.length));
                const idx = Math.min(vertexIndex, positions.length - 1);
                const normalized = range > 0 ? (powerValues[idx] - minPower) / range : 0;
                
                // Copper colormap: black (0,0,0) -> brown (#603913) -> orange (#F7941D)
                const color = new THREE.Color();
                if (normalized < 0.5) {
                    // Black to brown
                    const t = normalized * 2;
                    color.setRGB(
                        0.376 * t,  // 0x60/255
                        0.224 * t,  // 0x39/255
                        0.075 * t   // 0x13/255
                    );
                } else {
                    // Brown to orange
                    const t = (normalized - 0.5) * 2;
                    color.setRGB(
                        0.376 + (0.969 - 0.376) * t,  // 0x60 -> 0xF7
                        0.224 + (0.580 - 0.224) * t,  // 0x39 -> 0x94
                        0.075 + (0.114 - 0.075) * t   // 0x13 -> 0x1D
                    );
                }
                colors.push(color.r, color.g, color.b);
            }
            
            tubeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            
            tubeMaterial = new THREE.MeshBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.9
            });
        } else {
            tubeMaterial = new THREE.MeshBasicMaterial({
                color: 0x603913,  // Default copper/brown color
                transparent: true,
                opacity: 0.9
            });
        }
        
        this.trajectoryLine = new THREE.Mesh(tubeGeometry, tubeMaterial);
        this.scene.add(this.trajectoryLine);
        
        // Create comet tail as thick tube
        const tailGeometry = new THREE.BufferGeometry();
        const tailMaterial = new THREE.LineBasicMaterial({
            color: 0xff6b6b,
            linewidth: 8,
            opacity: 0.9,
            transparent: true
        });
        this.cometTail = new THREE.Line(tailGeometry, tailMaterial);
        this.scene.add(this.cometTail);
        
        // Reset animation
        this.currentIndex = 0;
        this.updateHandPosition(0);
    }
    
    updateHandPosition(index) {
        if (index < 0 || index >= this.positions.length) return;
        
        this.currentIndex = index;
        const pos = this.positions[index];
        const normal = this.normals[index];
        
        // Update hand position
        if (this.handSprite) {
            this.handSprite.position.set(pos[0], pos[1], pos[2]);
        }
        
        // Update normal arrow
        const normalVec = new THREE.Vector3(-normal[0], -normal[1], -normal[2]).normalize();
        this.normalArrow.position.set(pos[0], pos[1], pos[2]);
        this.normalArrow.setDirection(normalVec);
        
        // Update comet tail (show last 20 points)
        const tailLength = Math.min(20, index + 1);
        const tailStart = Math.max(0, index - tailLength + 1);
        const tailPoints = [];
        for (let i = tailStart; i <= index; i++) {
            const p = this.positions[i];
            tailPoints.push(new THREE.Vector3(p[0], p[1], p[2]));
        }
        this.cometTail.geometry.setFromPoints(tailPoints);
    }
    
    updateLightPosition(position) {
        if (this.lightSprite) {
            this.lightSprite.position.set(position[0], position[1], position[2]);
        }
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    dispose() {
        window.removeEventListener('resize', this.onWindowResize);
        this.renderer.dispose();
        this.container.removeChild(this.renderer.domElement);
    }
}

