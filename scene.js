import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { appState } from './state.js';

// Constants
const TILE_SIZE = 1; 
const TILE_SPACING = 0.05;

let scene, camera, renderer, controls;
let raycaster, pointer;
let gridHelper;
let tileMeshes = new Map(); // Map "x,z" -> THREE.Mesh
let ghostMesh;

// Textures cache
const textureCache = new Map();

export function initScene(container) {
    // 1. Setup Basic ThreeJS
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeeeeee);
    scene.fog = new THREE.Fog(0xeeeeee, 10, 50);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 8, 8);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // 2. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.1; // Prevent going under ground
    controls.minDistance = 2;
    controls.maxDistance = 20;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // 4. Ground / Grid
    // Invisible plane for raycasting
    const planeGeometry = new THREE.PlaneGeometry(50, 50);
    const planeMaterial = new THREE.MeshBasicMaterial({ visible: false });
    const groundPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.name = "ground";
    scene.add(groundPlane);

    // Visual Grid
    gridHelper = new THREE.GridHelper(50, 50, 0xcccccc, 0xe5e5e5);
    scene.add(gridHelper);

    // 5. Interaction
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    // Ghost tile (shows where you are hovering)
    const ghostGeo = new THREE.BoxGeometry(TILE_SIZE, 0.1, TILE_SIZE);
    const ghostMat = new THREE.MeshBasicMaterial({ color: 0x3498db, transparent: true, opacity: 0.3 });
    ghostMesh = new THREE.Mesh(ghostGeo, ghostMat);
    ghostMesh.visible = false;
    scene.add(ghostMesh);

    // Events
    window.addEventListener('resize', onWindowResize);
    const canvas = renderer.domElement;
    
    // Handle Click vs Drag distinction
    let isDragging = false;
    let downTime = 0;

    canvas.addEventListener('pointerdown', () => {
        isDragging = false;
        downTime = Date.now();
    });

    canvas.addEventListener('pointermove', (e) => {
        isDragging = true;
        updatePointer(e);
        updateGhost();
    });

    canvas.addEventListener('pointerup', (e) => {
        const upTime = Date.now();
        // If short duration and wasn't a significant drag (OrbitControls handles drag flag usually, but let's rely on time)
        if (upTime - downTime < 200) {
            onCanvasClick();
        }
    });

    // Start Loop
    animate();

    // Initial render of state
    updateBoardFromState();
    
    // Subscribe to state changes
    appState.subscribe(() => {
        updateBoardFromState();
        updateGhostMaterial();
    });
}

function updatePointer(event) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function updateGhost() {
    raycaster.setFromCamera(pointer, camera);
    const intersects = raycaster.intersectObjects(scene.children);
    
    const groundHit = intersects.find(h => h.object.name === "ground" || h.object.name === "tile");
    
    if (groundHit) {
        const x = Math.round(groundHit.point.x);
        const z = Math.round(groundHit.point.z);
        
        ghostMesh.position.set(x, 0.1, z);
        ghostMesh.visible = true;
    } else {
        ghostMesh.visible = false;
    }
}

function updateGhostMaterial() {
    const piece = appState.getSelectedPiece();
    if(piece) {
        ghostMesh.material.color.set(piece.color);
        // Could change geometry based on shape too, but box is fine for indicator
    }
}

function onCanvasClick() {
    if (!ghostMesh.visible) return;
    
    const x = ghostMesh.position.x;
    const z = ghostMesh.position.z;
    
    appState.toggleGridItem(x, z);
}

// Generate a texture for a piece with text
function getTexture(piece) {
    // Cache key must include textureUrl existence
    const hasTexture = !!piece.textureUrl;
    const key = piece.id + '_' + piece.color + '_' + piece.text + '_' + piece.shape + '_' + (hasTexture ? 'tex' : 'no');
    
    if (textureCache.has(key)) return textureCache.get(key);

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    const tex = new THREE.CanvasTexture(canvas);
    textureCache.set(key, tex);

    // Drawing function to handle async image loading
    const draw = (img = null) => {
        // Clear
        ctx.clearRect(0, 0, 256, 256);

        // Clip for Circle shape if needed
        if (piece.shape === 'circle') {
            ctx.save();
            ctx.beginPath();
            ctx.arc(128, 128, 128, 0, Math.PI*2);
            ctx.clip();
        }

        // Background
        if (img) {
            ctx.drawImage(img, 0, 0, 256, 256);
        } else {
            ctx.fillStyle = piece.color;
            ctx.fillRect(0, 0, 256, 256);
        }

        // Restore if we clipped
        if (piece.shape === 'circle') {
            ctx.restore();
        }

        // Border (internal visual aid)
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.lineWidth = 10;
        if (piece.shape === 'circle') {
            ctx.beginPath();
            ctx.arc(128, 128, 120, 0, Math.PI*2);
            ctx.stroke();
        } else {
            ctx.strokeRect(5, 5, 246, 246);
        }

        // Text
        if (piece.text) {
            // If texture present, add a background to text for readability
            if (img) {
                ctx.fillStyle = 'rgba(0,0,0,0.5)';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const fontSize = piece.text.length > 3 ? 40 : 80;
                ctx.font = `bold ${fontSize}px Arial`;
                // Approximate text background
                // ctx.fillRect(..., ...); // complex to calculate exact rect, shadow is easier
            }

            ctx.fillStyle = 'rgba(255,255,255,1.0)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Dynamic font size
            const fontSize = piece.text.length > 3 ? 40 : 80;
            ctx.font = `bold ${fontSize}px Arial`;
            
            // Heavy Shadow for text readability over texture
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 6;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0,0,0,0.8)';
            ctx.strokeText(piece.text, 128, 128); // Outline
            ctx.fillText(piece.text, 128, 128);
        }
        
        tex.needsUpdate = true;
    };

    if (piece.textureUrl) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => draw(img);
        img.src = piece.textureUrl;
        draw(); // Draw placeholder first
    } else {
        draw();
    }

    return tex;
}

function updateBoardFromState() {
    // Determine which tiles to add/remove/update
    // For simplicity: clear all and rebuild. 
    // Optimization: Diffing is better, but for small boards (game boards), full rebuild is fast enough.
    
    // Remove existing
    tileMeshes.forEach(mesh => scene.remove(mesh));
    tileMeshes.clear();

    // Add new
    appState.grid.forEach((paletteId, coordKey) => {
        const [x, z] = coordKey.split(',').map(Number);
        const piece = appState.palette.find(p => p.id === paletteId);
        
        if (piece) {
            let geometry;
            if (piece.shape === 'circle') {
                geometry = new THREE.CylinderGeometry(TILE_SIZE/2 * 0.9, TILE_SIZE/2 * 0.9, 0.2, 32);
            } else {
                geometry = new THREE.BoxGeometry(TILE_SIZE * 0.95, 0.2, TILE_SIZE * 0.95);
            }

            const material = new THREE.MeshStandardMaterial({
                map: getTexture(piece),
                roughness: 0.5,
                metalness: 0.1
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, 0.1, z);
            mesh.name = "tile";
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            scene.add(mesh);
            tileMeshes.set(coordKey, mesh);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}