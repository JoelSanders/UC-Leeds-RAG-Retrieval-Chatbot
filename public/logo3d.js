/**
 * 3D Logo Animation using Three.js
 * Loads and displays the GLB model with subtle lighting and rotation
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    init3DLogo();
});

function init3DLogo() {
    const container = document.getElementById('logo3d');
    
    if (!container || typeof THREE === 'undefined') {
        console.error('Container or Three.js not found');
        return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    
    // Camera setup - using perspective camera for 3D depth
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.z = 3;
    
    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
        alpha: true, // Transparent background
        antialias: true // Smooth edges
    });
    renderer.setSize(50, 50); // Match logo size
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); // Transparent
    container.appendChild(renderer.domElement);
    
    // Lighting setup - subtle and professional
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    // Directional light from top-front for highlights
    const directionalLight1 = new THREE.DirectionalLight(0x00bdee, 0.8);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);
    
    // Subtle fill light from the side
    const directionalLight2 = new THREE.DirectionalLight(0x00e5ff, 0.4);
    directionalLight2.position.set(-1, 0.5, 0.5);
    scene.add(directionalLight2);
    
    // Point light for a subtle glow effect
    const pointLight = new THREE.PointLight(0x00bdee, 0.5, 10);
    pointLight.position.set(0, 0, 2);
    scene.add(pointLight);
    
    // Load the GLB model
    const loader = new THREE.GLTFLoader();
    let model = null;
    
    loader.load(
        'ASM - PBR Metallic Roughness.glb',
        function (gltf) {
            model = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);
            
            // Move model down to ensure top isn't cut off
            model.position.y -= 1.0; // Adjust this value to move up/down
            
            // Scale the model to fit nicely in the container
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / maxDim; // Adjust this value to make it bigger/smaller
            model.scale.set(scale, scale, scale);
            
            // Optional: Apply material adjustments for better appearance
            model.traverse(function (child) {
                if (child.isMesh) {
                    child.material.metalness = 0.7;
                    child.material.roughness = 0.3;
                    child.material.needsUpdate = true;
                }
            });
            
            scene.add(model);
            console.log('✅ 3D Logo loaded successfully');
        },
        function (xhr) {
            // Progress callback
            const percentComplete = (xhr.loaded / xhr.total) * 100;
            console.log('Loading 3D logo: ' + percentComplete.toFixed(2) + '%');
        },
        function (error) {
            console.error('❌ Error loading 3D logo:', error);
        }
    );
    
    // Animation loop
    let rotationSpeed = 0.003; // Slow rotation
    const baseYPosition = -1.0; // Base vertical position (matching the offset above)
    
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate the model slowly on Y-axis
        if (model) {
            model.rotation.y += rotationSpeed;
            
            // Optional: Add a subtle bounce effect (like the original float animation)
            model.position.y = baseYPosition + Math.sin(Date.now() * 0.001) * 0.05;
        }
        
        renderer.render(scene, camera);
    }
    
    animate();
    
    // Handle window resize (if needed)
    window.addEventListener('resize', function() {
        // Logo size is fixed, but we can adjust pixel ratio if needed
        renderer.setPixelRatio(window.devicePixelRatio);
    });
    
    // Handle theme changes - adjust lighting based on theme
    function updateLightingForTheme() {
        const isLightMode = document.body.classList.contains('light-mode');
        
        if (isLightMode) {
            ambientLight.intensity = 0.8;
            directionalLight1.intensity = 1.0;
            directionalLight2.intensity = 0.5;
            pointLight.intensity = 0.3;
        } else {
            ambientLight.intensity = 0.6;
            directionalLight1.intensity = 0.8;
            directionalLight2.intensity = 0.4;
            pointLight.intensity = 0.5;
        }
    }
    
    // Initial theme setup
    updateLightingForTheme();
    
    // Watch for theme changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.attributeName === 'class') {
                updateLightingForTheme();
            }
        });
    });
    
    observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class']
    });
}

