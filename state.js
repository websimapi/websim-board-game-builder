// Manage application state

// Default palettes
const defaultPalette = [
    { id: 'p1', shape: 'square', color: '#e74c3c', text: 'START' },
    { id: 'p2', shape: 'square', color: '#f1c40f', text: '?' },
    { id: 'p3', shape: 'circle', color: '#3498db', text: '1' },
    { id: 'p4', shape: 'circle', color: '#2ecc71', text: 'SAFE' }
];

class State {
    constructor() {
        this.palette = [...defaultPalette];
        // Grid is a map of "x,z" coordinates to palette IDs
        this.grid = new Map();
        
        // Initial simple board layout
        this.grid.set('0,0', 'p1');
        this.grid.set('1,0', 'p3');
        this.grid.set('2,0', 'p3');
        this.grid.set('3,0', 'p2');
        
        this.selectedPaletteId = 'p1';
        this.listeners = [];
    }

    subscribe(callback) {
        this.listeners.push(callback);
    }

    notify() {
        this.listeners.forEach(cb => cb(this));
    }

    addPaletteItem(item) {
        const id = 'p' + Date.now();
        this.palette.push({ ...item, id });
        this.selectPaletteItem(id);
        this.notify();
        return id;
    }

    selectPaletteItem(id) {
        this.selectedPaletteId = id;
        this.notify();
    }

    toggleGridItem(x, z) {
        const key = `${x},${z}`;
        if (this.grid.has(key)) {
            // If clicking same piece, remove it? Or replace?
            // Let's replace if different, remove if same for now.
            // Actually, standard painting behavior: always paint. 
            // If same, maybe delete? Let's implement Delete as a tool later or just overwrite.
            // For simplicity: If holding a piece, overwrite. If holding nothing (not implemented), delete.
            // Let's implement toggle: If exactly same ID, remove. Else overwrite.
            if (this.grid.get(key) === this.selectedPaletteId) {
                this.grid.delete(key);
            } else {
                this.grid.set(key, this.selectedPaletteId);
            }
        } else {
            this.grid.set(key, this.selectedPaletteId);
        }
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