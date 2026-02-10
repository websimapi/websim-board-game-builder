// Manage application state with Persistence and Multi-Project support

// Default palette for new projects
const defaultPalette = [
    { id: 'p1', shape: 'square', color: '#e74c3c', text: 'START', tag: 'Markers' },
    { id: 'p2', shape: 'square', color: '#f1c40f', text: '?', tag: 'Interactables' },
    { id: 'p3', shape: 'circle', color: '#3498db', text: '1', tag: 'Path' },
    { id: 'p4', shape: 'circle', color: '#2ecc71', text: 'SAFE', tag: 'Path' }
];

class State {
    constructor() {
        this.listeners = [];
        this.projects = [];
        this.activeProjectId = null;

        // Load data from LocalStorage
        this.load();

        // If no data or invalid state, create default
        if (!this.activeProjectId || this.projects.length === 0) {
            this.createProject('My First Board', true);
        }
    }

    // --- Accessors for Active Project (Proxy) ---

    get activeProject() {
        return this.projects.find(p => p.id === this.activeProjectId) || this.projects[0];
    }

    get palette() {
        return this.activeProject.palette;
    }

    get grid() {
        return this.activeProject.grid;
    }

    get selectedPaletteId() {
        return this.activeProject.selectedPaletteId;
    }

    // --- Core Methods ---

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this));
        this.save(); // Auto-save on every change
    }

    // --- Persistence ---

    save() {
        try {
            const data = {
                activeProjectId: this.activeProjectId,
                projects: this.projects.map(p => ({
                    id: p.id,
                    name: p.name,
                    palette: p.palette,
                    selectedPaletteId: p.selectedPaletteId,
                    grid: Array.from(p.grid.entries()), // Serialize Map to Array
                    rules: p.rules,
                    lastModified: p.lastModified
                }))
            };
            localStorage.setItem('board_builder_v1', JSON.stringify(data));
        } catch (e) {
            console.error("Save failed", e);
        }
    }

    load() {
        const json = localStorage.getItem('board_builder_v1');
        if (json) {
            try {
                const data = JSON.parse(json);
                if (Array.isArray(data.projects) && data.projects.length > 0) {
                    this.projects = data.projects.map(p => ({
                        ...p,
                        grid: new Map(p.grid) // Deserialize Array to Map
                    }));
                    this.activeProjectId = data.activeProjectId;
                }
            } catch (e) {
                console.warn('Corrupt save data, resetting.');
                localStorage.removeItem('board_builder_v1');
            }
        }
    }

    // --- Project Management ---

    addProject(projectData) {
        // Ensure data integrity
        if (!projectData.id) projectData.id = 'proj_' + Date.now();
        if (!projectData.lastModified) projectData.lastModified = Date.now();
        
        this.projects.push(projectData);
        this.activeProjectId = projectData.id;
        this.notify();
    }

    createProject(name = 'New Board', isDefault = false) {
        const id = 'proj_' + Date.now() + Math.floor(Math.random() * 1000);
        const project = {
            id,
            name,
            palette: JSON.parse(JSON.stringify(defaultPalette)),
            grid: new Map(),
            selectedPaletteId: 'p1',
            rules: `# ${name}\n\n## Objective\nReach the finish line first!\n\n## How to Play\n1. Roll the dice.\n2. Move your piece.\n3. Follow the instructions on the tile.`,
            lastModified: Date.now()
        };

        if (isDefault) {
            // Simple starter layout
            project.grid.set('0,0', 'p1');
            project.grid.set('1,0', 'p3');
            project.grid.set('2,0', 'p3');
            project.grid.set('3,0', 'p2');
        }

        this.projects.push(project);
        this.activeProjectId = id;
        this.notify();
    }

    switchProject(id) {
        const p = this.projects.find(p => p.id === id);
        if (p) {
            this.activeProjectId = id;
            this.notify();
        }
    }

    duplicateProject(id) {
        const p = this.projects.find(p => p.id === id);
        if (p) {
            const newId = 'proj_' + Date.now() + Math.floor(Math.random() * 1000);
            const clone = {
                ...p,
                id: newId,
                name: p.name + ' (Copy)',
                palette: JSON.parse(JSON.stringify(p.palette)),
                grid: new Map(p.grid),
                rules: p.rules,
                lastModified: Date.now()
            };
            this.projects.push(clone);
            this.activeProjectId = newId;
            this.notify();
        }
    }

    deleteProject(id) {
        if (this.projects.length <= 1) {
            alert("Cannot delete the last project.");
            return;
        }
        
        const index = this.projects.findIndex(p => p.id === id);
        if (index > -1) {
            this.projects.splice(index, 1);
            // If we deleted the active project, switch to another
            if (this.activeProjectId === id) {
                this.activeProjectId = this.projects[0].id;
            }
            this.notify();
        }
    }

    renameProject(id, newName) {
        const p = this.projects.find(p => p.id === id);
        if (p) {
            p.name = newName;
            p.lastModified = Date.now();
            this.notify();
        }
    }

    updateRules(newRules) {
        this.activeProject.rules = newRules;
        this.activeProject.lastModified = Date.now();
        this.notify();
    }

    // --- Content Management (Proxied) ---

    addPaletteItem(item) {
        const id = 'p' + Date.now();
        // Ensure tag exists
        const newItem = { tag: 'General', ...item, id };
        this.activeProject.palette.push(newItem);
        this.selectPaletteItem(id);
        // notify called by selectPaletteItem
        return id;
    }

    updatePaletteItem(id, updates) {
        const index = this.activeProject.palette.findIndex(p => p.id === id);
        if (index > -1) {
            this.activeProject.palette[index] = { ...this.activeProject.palette[index], ...updates };
            // If the currently selected item is updated, we might need to refresh UI heavily, notify handles this.
            this.notify();
        }
    }

    selectPaletteItem(id) {
        this.activeProject.selectedPaletteId = id;
        this.notify();
    }

    toggleGridItem(x, z) {
        const key = `${x},${z}`;
        const currentGrid = this.activeProject.grid;
        
        if (currentGrid.has(key)) {
            // If clicking with same piece, remove (or toggle off)
            // If clicking with different piece, replace
            if (currentGrid.get(key) === this.activeProject.selectedPaletteId) {
                currentGrid.delete(key);
            } else {
                currentGrid.set(key, this.activeProject.selectedPaletteId);
            }
        } else {
            currentGrid.set(key, this.activeProject.selectedPaletteId);
        }
        
        this.activeProject.lastModified = Date.now();
        this.notify();
    }

    getSelectedPiece() {
        return this.palette.find(p => p.id === this.selectedPaletteId);
    }

    getGridPiece(x, z) {
        const id = this.grid.get(`${x},${z}`);
        return this.palette.find(p => p.id === id);
    }
}

export const appState = new State();