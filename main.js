import { initScene } from './scene.js';
import { appState } from './state.js';
import { generatePrintLayout } from './print.js';
import { marked } from 'marked';

// Elements
const paletteList = document.getElementById('palette-list');
const tagFiltersEl = document.getElementById('tag-filters');
const designerPanel = document.getElementById('designer-panel');
const btnNewPiece = document.getElementById('new-piece-btn');
const btnEditPiece = document.getElementById('edit-piece-btn');
const btnCloseDesigner = document.getElementById('close-designer');
const btnAddPiece = document.getElementById('add-piece-btn');
const btnPrint = document.getElementById('btn-print');
const btnRules = document.getElementById('btn-rules');

// Rules Modal Elements
const rulesModal = document.getElementById('rules-modal');
const btnCloseRules = document.getElementById('close-rules');
const btnCloseRulesFooter = document.getElementById('btn-close-rules-footer');
const btnToggleEditRules = document.getElementById('btn-toggle-edit-rules');
const btnSaveRules = document.getElementById('btn-save-rules');
const rulesView = document.getElementById('rules-view');
const rulesEditor = document.getElementById('rules-editor');

// Project Manager Elements
const btnProjects = document.getElementById('btn-projects');
const projectsModal = document.getElementById('projects-modal');
const btnCloseProjects = document.getElementById('close-projects');
const btnCreateProject = document.getElementById('btn-create-project');
const projectsListEl = document.getElementById('projects-list');

// AI Modal Elements
const aiModal = document.getElementById('ai-modal');
const btnAiModalOpen = document.getElementById('btn-ai-modal-open');
const btnCloseAi = document.getElementById('close-ai');
const btnGenerateAi = document.getElementById('btn-generate-ai');
const inpAiPrompt = document.getElementById('ai-prompt');
const inpAiComplexity = document.getElementById('ai-complexity');
const inpAiStyleRadios = document.getElementsByName('ai-style');
const aiStatusContainer = document.getElementById('ai-status-container');
const aiSteps = [
    document.getElementById('ai-step-1'),
    document.getElementById('ai-step-2'),
    document.getElementById('ai-step-3'),
    document.getElementById('ai-step-4')
];

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
const inpTag = document.getElementById('piece-tag');
const dataListTags = document.getElementById('existing-tags');

let currentGeneratedTextureUrl = null;
let currentTagFilter = 'All';
let editingPieceId = null;

// Init
function init() {
    initScene(document.getElementById('canvas-container'));
    renderPalette();

    // Event Listeners
    appState.subscribe(() => {
        renderPalette();
        updateDataList();
    });

    btnNewPiece.addEventListener('click', () => openDesigner(null));
    btnEditPiece.addEventListener('click', () => {
        const piece = appState.getSelectedPiece();
        if (piece) openDesigner(piece);
    });

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
                prompt: `Top-down view illustration of ${prompt} for a board game tile. Flat vector art style, simple, clear, game asset. No text.`,
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
        const tag = inpTag.value.trim() || 'General';
        
        let color = inpColor.value;
        let textureUrl = null;

        if (bgType === 'texture') {
            // Keep existing texture if editing and no new one generated
            if (currentGeneratedTextureUrl) {
                textureUrl = currentGeneratedTextureUrl;
                color = '#ffffff';
            } else if (editingPieceId) {
                // If editing, preserve old texture url if we didn't generate a new one but are still in texture mode
                const oldPiece = appState.palette.find(p => p.id === editingPieceId);
                if (oldPiece && oldPiece.textureUrl) {
                    textureUrl = oldPiece.textureUrl;
                    color = '#ffffff';
                }
            }
        }

        const pieceData = { shape, color, text, textureUrl, tag };

        if (editingPieceId) {
            appState.updatePaletteItem(editingPieceId, pieceData);
        } else {
            appState.addPaletteItem(pieceData);
        }
        
        closeDesigner();
    });

    btnPrint.addEventListener('click', () => {
        generatePrintLayout();
        window.print();
    });

    // Rules Listeners
    btnRules.addEventListener('click', openRulesModal);
    btnCloseRules.addEventListener('click', closeRulesModal);
    btnCloseRulesFooter.addEventListener('click', closeRulesModal);
    
    btnToggleEditRules.addEventListener('click', () => {
        const isEditing = rulesEditor.style.display === 'block';
        if (isEditing) {
            // Switch to View
            rulesEditor.style.display = 'none';
            rulesView.style.display = 'block';
            btnSaveRules.style.display = 'none';
            btnToggleEditRules.textContent = 'Edit';
            btnCloseRulesFooter.style.display = 'block';
            // Save logic
            appState.updateRules(rulesEditor.value);
            rulesView.innerHTML = marked.parse(rulesEditor.value);
        } else {
            // Switch to Edit
            rulesView.style.display = 'none';
            rulesEditor.style.display = 'block';
            btnSaveRules.style.display = 'block';
            btnToggleEditRules.textContent = 'Preview';
            btnCloseRulesFooter.style.display = 'none';
            rulesEditor.value = appState.activeProject.rules || '';
        }
    });

    btnSaveRules.addEventListener('click', () => {
        appState.updateRules(rulesEditor.value);
        // Switch back to view
        btnToggleEditRules.click();
    });

    // Project Manager Listeners
    btnProjects.addEventListener('click', openProjectsModal);
    btnCloseProjects.addEventListener('click', closeProjectsModal);
    btnCreateProject.addEventListener('click', () => {
        const name = prompt("Enter board name:", "New Board Game");
        if(name) {
            appState.createProject(name);
            renderProjectsList(); // Refresh list
            closeProjectsModal();
        }
    });

    // AI Generators
    btnAiModalOpen.addEventListener('click', () => {
        closeProjectsModal();
        aiModal.classList.add('open');
        // Reset UI
        inpAiPrompt.value = '';
        aiStatusContainer.style.display = 'none';
        btnGenerateAi.disabled = false;
        btnGenerateAi.textContent = 'Generate Board';
        aiSteps.forEach(s => s.className = 'ai-step');
    });

    btnCloseAi.addEventListener('click', () => {
        aiModal.classList.remove('open');
    });

    btnGenerateAi.addEventListener('click', async () => {
        const prompt = inpAiPrompt.value.trim();
        const complexity = inpAiComplexity.value;
        const useTextures = Array.from(inpAiStyleRadios).find(r => r.checked).value === 'texture';
        
        if (!prompt) {
            alert("Please enter a theme or description!");
            return;
        }

        // Start Process
        btnGenerateAi.disabled = true;
        btnGenerateAi.textContent = 'Dreaming up board...';
        aiStatusContainer.style.display = 'flex';
        
        try {
            await runAiGeneration(prompt, complexity, useTextures);
            aiModal.classList.remove('open');
        } catch (err) {
            console.error(err);
            alert("AI Generation failed. Please try again.");
            btnGenerateAi.disabled = false;
            btnGenerateAi.textContent = 'Generate Board';
        }
    });
}

async function runAiGeneration(theme, complexity, useTextures) {
    const updateStep = (index, status) => {
        if (status === 'active') {
            aiSteps[index].classList.add('active');
            aiSteps[index].classList.remove('done');
        } else if (status === 'done') {
            aiSteps[index].classList.remove('active');
            aiSteps[index].classList.add('done');
        }
    };

    // --- STEP 1: Generate Palette ---
    updateStep(0, 'active');
    aiSteps[0].innerHTML = `<span class="step-icon">🎲</span> Generating Game Pieces...`;
    
    const palettePrompt = `
    Create a set of board game tiles for a "${theme}" themed game.
    
    Constraints:
    1. Must include exactly 1 "Start" tile.
    2. Must include exactly 1 "Finish" tile.
    3. Include 4-8 other types of tiles (e.g. basic path, special event, hazard, bonus).
    4. "shape" must be "square" or "circle".
    5. "color" should be a hex code suitable for the theme.
    6. "text" is the label on the tile (max 8 chars).
    7. "tag" categorizes the tile (e.g. Start, End, Path, Hazard, Bonus).
    
    Respond with JSON only:
    {
        "tiles": [
            { "text": "Start", "color": "#hex", "shape": "square", "tag": "Start" },
            ...
        ]
    }`;

    const paletteRes = await websim.chat.completions.create({
        messages: [{ role: "user", content: palettePrompt }],
        json: true
    });

    const paletteData = JSON.parse(paletteRes.content).tiles;
    
    // Assign IDs to palette items
    const paletteWithIds = paletteData.map((p, i) => ({
        ...p,
        id: `gen_p_${Date.now()}_${i}`
    }));

    // --- STEP 1.5: Generate Textures (Optional) ---
    if (useTextures) {
        for (let i = 0; i < paletteWithIds.length; i++) {
            const p = paletteWithIds[i];
            // Update UI
            aiSteps[0].innerHTML = `<span class="step-icon">🎨</span> Painting tile ${i + 1}/${paletteWithIds.length}: ${p.text}...`;
            
            try {
                // Generate texture
                const imgResult = await websim.imageGen({
                    prompt: `Top-down view illustration of "${p.text}" for a board game tile, theme: ${theme}. Flat vector art style, simple, clear, game asset. No text.`,
                    aspect_ratio: "1:1"
                });
                
                // Save as Data URL
                p.textureUrl = await urlToDataUrl(imgResult.url);
                p.color = '#ffffff'; // Reset color so texture shows cleanly
                
            } catch (err) {
                console.warn(`Failed to generate texture for ${p.text}`, err);
            }
        }
        aiSteps[0].innerHTML = `<span class="step-icon">🎨</span> Game Pieces Created & Painted!`;
    }

    updateStep(0, 'done');

    // --- STEP 2: Generate Layout ---
    updateStep(1, 'active');

    const sizeMap = {
        small: { tiles: 15, size: "10x10" },
        medium: { tiles: 30, size: "15x15" },
        large: { tiles: 50, size: "20x20" }
    };
    const specs = sizeMap[complexity];

    // Find critical IDs
    const startTile = paletteWithIds.find(p => p.tag === 'Start') || paletteWithIds[0];
    const finishTile = paletteWithIds.find(p => p.tag === 'Finish') || paletteWithIds[paletteWithIds.length - 1];
    
    const gridPrompt = `
    Generate a 2D grid layout for a board game using these available tiles:
    ${JSON.stringify(paletteWithIds.map(p => ({ id: p.id, tag: p.tag, text: p.text })))}

    Goal: Create a playable path from Start to Finish.
    Target Length: Approx ${specs.tiles} tiles.
    Boundaries: Keep within ${specs.size} coordinate system (x, z).

    Rules:
    1. Place exactly one "${startTile.id}" (Start).
    2. Place exactly one "${finishTile.id}" (Finish).
    3. Connect them with a winding, interesting path of other tiles.
    4. Ensure the path is continuous (tiles are adjacent horizontally or vertically).
    5. Coordinates x, z must be integers.

    Respond with JSON only:
    {
        "layout": [
            { "x": 0, "z": 0, "tileId": "${startTile.id}" },
            ...
        ]
    }`;

    const gridRes = await websim.chat.completions.create({
        messages: [{ role: "user", content: gridPrompt }],
        json: true
    });

    const layoutData = JSON.parse(gridRes.content).layout;

    updateStep(1, 'done');

    // --- STEP 3: Write Rules ---
    updateStep(2, 'active');

    const rulesPrompt = `
    Write a short, fun set of rules (in Markdown format) for a board game called "${theme}".
    The board has these special spaces:
    ${JSON.stringify(paletteWithIds.filter(p => p.tag !== 'Path').map(p => p.text + " (" + p.tag + ")"))}

    Structure:
    # ${theme}
    ## Objective
    ## Setup
    ## How to Play
    - Movement (Dice roll)
    - What happens on special spaces

    Keep it simple and playable.
    `;

    const rulesRes = await websim.chat.completions.create({
        messages: [{ role: "user", content: rulesPrompt }]
    });

    const rulesText = rulesRes.content;

    updateStep(2, 'done');

    // --- STEP 4: Finalize ---
    updateStep(3, 'active');

    // Construct Project Object
    const project = {
        id: 'proj_ai_' + Date.now(),
        name: `${theme} (${complexity})`,
        palette: paletteWithIds,
        grid: new Map(),
        selectedPaletteId: startTile.id,
        rules: rulesText,
        lastModified: Date.now()
    };

    // Convert layout array to Map
    layoutData.forEach(item => {
        if (item.tileId && item.x != null && item.z != null) {
            project.grid.set(`${item.x},${item.z}`, item.tileId);
        }
    });

    // Save to state
    appState.addProject(project);

    updateStep(3, 'done');
    
    // Short delay to see completion
    await new Promise(r => setTimeout(r, 800));
}

function openRulesModal() {
    // Populate current rules
    const rules = appState.activeProject.rules || '# New Game\n\nNo rules yet.';
    rulesEditor.value = rules;
    rulesView.innerHTML = marked.parse(rules);
    
    // Default to view mode
    rulesEditor.style.display = 'none';
    rulesView.style.display = 'block';
    btnSaveRules.style.display = 'none';
    btnCloseRulesFooter.style.display = 'block';
    btnToggleEditRules.textContent = 'Edit';

    rulesModal.classList.add('open');
}

function closeRulesModal() {
    rulesModal.classList.remove('open');
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
    renderTags();

    // Clear list
    paletteList.innerHTML = '';

    const pieces = appState.palette.filter(p => currentTagFilter === 'All' || p.tag === currentTagFilter);

    pieces.forEach(piece => {
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

    // Update state of edit button
    const selected = appState.getSelectedPiece();
    if (selected) {
        btnEditPiece.removeAttribute('disabled');
        btnEditPiece.style.opacity = '1';
    } else {
        btnEditPiece.setAttribute('disabled', 'true');
        btnEditPiece.style.opacity = '0.5';
    }
}

function renderTags() {
    tagFiltersEl.innerHTML = '';
    
    // Collect unique tags from the palette
    const tagSet = new Set();
    appState.palette.forEach(p => tagSet.add(p.tag || 'General'));
    
    // Remove 'All' if it exists as a literal tag to prevent duplication
    tagSet.delete('All');
    
    // Sort the custom tags and ensure 'All' is always the first item
    const displayTags = ['All', ...Array.from(tagSet).sort()];
    
    displayTags.forEach(tag => {
        const chip = document.createElement('button');
        chip.className = `tag-chip ${currentTagFilter === tag ? 'active' : ''}`;
        chip.textContent = tag;
        chip.addEventListener('click', () => {
            currentTagFilter = tag;
            renderPalette();
        });
        tagFiltersEl.appendChild(chip);
    });
}

function updateDataList() {
    dataListTags.innerHTML = '';
    const tags = new Set();
    appState.palette.forEach(p => tags.add(p.tag || 'General'));
    tags.forEach(tag => {
        const opt = document.createElement('option');
        opt.value = tag;
        dataListTags.appendChild(opt);
    });
}

function openDesigner(pieceToEdit = null) {
    if (pieceToEdit) {
        editingPieceId = pieceToEdit.id;
        document.querySelector('#designer-panel h2').textContent = 'Edit Piece';
        btnAddPiece.textContent = 'Save Changes';
        
        // Fill fields
        inpText.value = pieceToEdit.text || '';
        inpTag.value = pieceToEdit.tag || 'General';
        inpColor.value = pieceToEdit.color || '#3498db';
        
        // Shape
        Array.from(inpShapeRadios).forEach(r => {
            r.checked = (r.value === pieceToEdit.shape);
        });

        // Texture vs Color
        const hasTexture = !!pieceToEdit.textureUrl;
        Array.from(inpBgTypeRadios).forEach(r => {
            r.checked = (r.value === (hasTexture ? 'texture' : 'color'));
        });
        
        // Trigger UI toggle
        if (hasTexture) {
            sectionColor.style.display = 'none';
            sectionTexture.style.display = 'block';
            texturePreviewArea.innerHTML = `<img src="${pieceToEdit.textureUrl}" alt="Preview">`;
            currentGeneratedTextureUrl = null; // We aren't generating a new one yet, but we will use the old one if null
        } else {
            sectionColor.style.display = 'block';
            sectionTexture.style.display = 'none';
            texturePreviewArea.innerHTML = '<div class="placeholder">No texture generated</div>';
            currentGeneratedTextureUrl = null;
        }

    } else {
        editingPieceId = null;
        document.querySelector('#designer-panel h2').textContent = 'New Piece';
        btnAddPiece.textContent = 'Add to Palette';
        
        // Reset fields
        inpText.value = '';
        inpTag.value = '';
        inpColor.value = '#3498db';
        inpShapeRadios[0].checked = true; // Square
        inpBgTypeRadios[0].checked = true; // Color
        
        sectionColor.style.display = 'block';
        sectionTexture.style.display = 'none';
        texturePreviewArea.innerHTML = '<div class="placeholder">No texture generated</div>';
        currentGeneratedTextureUrl = null;
    }

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