import { initScene } from './scene.js';
import { appState } from './state.js';
import { generatePrintLayout } from './print.js';

// Elements
const paletteList = document.getElementById('palette-list');
const designerPanel = document.getElementById('designer-panel');
const btnNewPiece = document.getElementById('new-piece-btn');
const btnCloseDesigner = document.getElementById('close-designer');
const btnAddPiece = document.getElementById('add-piece-btn');
const btnPrint = document.getElementById('btn-print');

// Project Manager Elements
const btnProjects = document.getElementById('btn-projects');
const projectsModal = document.getElementById('projects-modal');
const btnCloseProjects = document.getElementById('close-projects');
const btnCreateProject = document.getElementById('btn-create-project');
const projectsListEl = document.getElementById('projects-list');

// Designer Inputs
const inpShapeRadios = document.getElementsByName('shape');
const inpBgTypeRadios = document.getElementsByName('bg-type');
const sectionColor = document.getElementById('section-color');
const sectionTexture = document.getElementById('section-texture');
const inpColor = document.getElementById('piece-color');
const inpTexturePrompt = document.getElementById('texture-prompt');
const btnGenerateTexture = document.getElementById('btn-generate-texture');
const texturePreviewArea = document.getElementById('texture-preview-area');
const textureLoading = document.getElementById('texture-loading');
const inpText = document.getElementById('piece-text');

let currentGeneratedTextureUrl = null;

// Init
function init() {
    initScene(document.getElementById('canvas-container'));
    renderPalette();

    // Event Listeners
    appState.subscribe(renderPalette);

    btnNewPiece.addEventListener('click', openDesigner);
    btnCloseDesigner.addEventListener('click', closeDesigner);
    
    // Toggle background type
    Array.from(inpBgTypeRadios).forEach(r => {
        r.addEventListener('change', (e) => {
            if (e.target.value === 'color') {
                sectionColor.style.display = 'block';
                sectionTexture.style.display = 'none';
            } else {
                sectionColor.style.display = 'none';
                sectionTexture.style.display = 'block';
            }
        });
    });

    // Generate Texture
    btnGenerateTexture.addEventListener('click', async () => {
        const prompt = inpTexturePrompt.value.trim();
        if (!prompt) return;

        textureLoading.style.display = 'flex';
        texturePreviewArea.innerHTML = '';
        btnGenerateTexture.disabled = true;

        try {
            const result = await websim.imageGen({
                prompt: prompt + ", texture, pattern, top down view, flat lighting, game asset",
                aspect_ratio: "1:1"
            });
            
            // Convert to Data URL for persistence
            const dataUrl = await urlToDataUrl(result.url);
            currentGeneratedTextureUrl = dataUrl;

            // Show Preview
            texturePreviewArea.innerHTML = `<img src="${currentGeneratedTextureUrl}" alt="Texture Preview">`;
        } catch (err) {
            console.error(err);
            texturePreviewArea.innerHTML = `<span style="color:red">Error generating</span>`;
        } finally {
            textureLoading.style.display = 'none';
            btnGenerateTexture.disabled = false;
        }
    });

    btnAddPiece.addEventListener('click', () => {
        const shape = Array.from(inpShapeRadios).find(r => r.checked).value;
        const bgType = Array.from(inpBgTypeRadios).find(r => r.checked).value;
        const text = inpText.value.trim();
        
        let color = inpColor.value;
        let textureUrl = null;

        if (bgType === 'texture' && currentGeneratedTextureUrl) {
            textureUrl = currentGeneratedTextureUrl;
            color = '#ffffff'; // Fallback/Base color
        }

        appState.addPaletteItem({ shape, color, text, textureUrl });
        closeDesigner();
    });

    btnPrint.addEventListener('click', () => {
        generatePrintLayout();
        window.print();
    });

    // Project Manager Listeners
    btnProjects.addEventListener('click', openProjectsModal);
    btnCloseProjects.addEventListener('click', closeProjectsModal);
    btnCreateProject.addEventListener('click', () => {
        const name = prompt("Enter board name:", "New Board Game");
        if(name) {
            appState.createProject(name);
            renderProjectsList(); // Refresh list
        }
    });
}

function openProjectsModal() {
    renderProjectsList();
    projectsModal.classList.add('open');
}

function closeProjectsModal() {
    projectsModal.classList.remove('open');
}

function renderProjectsList() {
    projectsListEl.innerHTML = '';
    
    // Sort by modified date descending
    const sortedProjects = [...appState.projects].sort((a, b) => b.lastModified - a.lastModified);

    sortedProjects.forEach(p => {
        const isActive = p.id === appState.activeProjectId;
        const card = document.createElement('div');
        card.className = `project-card ${isActive ? 'active' : ''}`;
        
        const dateStr = new Date(p.lastModified).toLocaleDateString() + ' ' + new Date(p.lastModified).toLocaleTimeString();
        
        card.innerHTML = `
            <div class="project-info">
                <h3>
                    ${p.name}
                    ${isActive ? '<span style="font-size:0.7em; background:var(--primary); color:white; padding:2px 6px; border-radius:4px;">ACTIVE</span>' : ''}
                </h3>
                <p>Last edited: ${dateStr}</p>
                <p>${p.grid.size} tiles • ${p.palette.length} piece types</p>
            </div>
            <div class="project-actions">
                ${!isActive ? `<button class="icon-btn" title="Open" data-action="open">📂</button>` : ''}
                <button class="icon-btn" title="Rename" data-action="rename">✏️</button>
                <button class="icon-btn" title="Duplicate" data-action="duplicate">📄</button>
                <button class="icon-btn delete" title="Delete" data-action="delete">🗑️</button>
            </div>
        `;

        // Action Handling
        card.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                
                if (action === 'open') {
                    appState.switchProject(p.id);
                    renderProjectsList();
                    // Optional: Close modal automatically on switch?
                    // closeProjectsModal(); 
                } else if (action === 'rename') {
                    const newName = prompt("Rename board:", p.name);
                    if (newName) {
                        appState.renameProject(p.id, newName);
                        renderProjectsList();
                    }
                } else if (action === 'duplicate') {
                    appState.duplicateProject(p.id);
                    renderProjectsList();
                } else if (action === 'delete') {
                    if (confirm(`Are you sure you want to delete "${p.name}"?`)) {
                        appState.deleteProject(p.id);
                        renderProjectsList();
                    }
                }
            });
        });

        projectsListEl.appendChild(card);
    });
}

function renderPalette() {
    // Clear list
    paletteList.innerHTML = '';

    appState.palette.forEach(piece => {
        const btn = document.createElement('button');
        btn.className = `palette-item ${piece.id === appState.selectedPaletteId ? 'selected' : ''}`;
        
        if (piece.textureUrl) {
            btn.style.backgroundImage = `url('${piece.textureUrl}')`;
            btn.style.backgroundSize = 'cover';
            btn.style.color = 'white';
            btn.style.textShadow = '0 0 3px black';
        } else {
            btn.style.backgroundColor = piece.color;
            const isDark = checkIsDark(piece.color);
            btn.style.color = isDark ? 'white' : 'black';
        }
        
        btn.innerHTML = `<span>${piece.text || ''}</span>`;
        
        // Shape indicator
        if (piece.shape === 'circle') {
            btn.style.borderRadius = '50%';
        }

        btn.addEventListener('click', () => {
            appState.selectPaletteItem(piece.id);
        });

        paletteList.appendChild(btn);
    });
}

function openDesigner() {
    designerPanel.classList.add('open');
}

function closeDesigner() {
    designerPanel.classList.remove('open');
    // Reset state
    currentGeneratedTextureUrl = null;
    texturePreviewArea.innerHTML = '<div class="placeholder">No texture generated</div>';
    inpTexturePrompt.value = '';
}

async function urlToDataUrl(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

function checkIsDark(colorHex) {
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness < 128;
}

// Boot
init();