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

// Designer Inputs
const inpShapeRadios = document.getElementsByName('shape');
const inpColor = document.getElementById('piece-color');
const inpText = document.getElementById('piece-text');

// Init
function init() {
    initScene(document.getElementById('canvas-container'));
    renderPalette();

    // Event Listeners
    appState.subscribe(renderPalette);

    btnNewPiece.addEventListener('click', openDesigner);
    btnCloseDesigner.addEventListener('click', closeDesigner);
    
    btnAddPiece.addEventListener('click', () => {
        const shape = Array.from(inpShapeRadios).find(r => r.checked).value;
        const color = inpColor.value;
        const text = inpText.value.trim();

        appState.addPaletteItem({ shape, color, text });
        closeDesigner();
    });

    btnPrint.addEventListener('click', () => {
        generatePrintLayout();
        window.print();
    });
}

function renderPalette() {
    // Clear list
    paletteList.innerHTML = '';

    appState.palette.forEach(piece => {
        const btn = document.createElement('button');
        btn.className = `palette-item ${piece.id === appState.selectedPaletteId ? 'selected' : ''}`;
        btn.style.backgroundColor = piece.color;
        
        // Determine text color
        const isDark = checkIsDark(piece.color);
        btn.style.color = isDark ? 'white' : 'black';
        
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