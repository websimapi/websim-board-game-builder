import { appState } from './state.js';

export function setupPrintView() {
    // No specific setup needed on load
}

export function generatePrintLayout() {
    const container = document.getElementById('print-tiles-grid');
    const statsContainer = document.getElementById('print-stats');
    const diceContainer = document.getElementById('print-dice-area');
    
    container.innerHTML = '';
    statsContainer.innerHTML = '';
    diceContainer.innerHTML = '';

    // 1. Calculate counts
    const counts = {};
    appState.grid.forEach((paletteId) => {
        counts[paletteId] = (counts[paletteId] || 0) + 1;
    });

    // 2. Render Stats
    let statsHtml = '<h3>Parts Needed:</h3><ul>';
    Object.keys(counts).forEach(pid => {
        const piece = appState.palette.find(p => p.id === pid);
        if(piece) {
            statsHtml += `<li>${piece.shape.toUpperCase()} (${piece.color} "${piece.text}"): <strong>${counts[pid]}</strong></li>`;
        }
    });
    statsHtml += '</ul>';
    statsContainer.innerHTML = statsHtml;

    // 3. Render Tiles
    // Iterate through grid to print them in order? Or grouped?
    // Grouped is better for cutting.
    Object.keys(counts).forEach(pid => {
        const count = counts[pid];
        const piece = appState.palette.find(p => p.id === pid);
        
        if (piece) {
            for(let i=0; i<count; i++) {
                const page = document.createElement('div');
                page.className = 'print-page';

                const div = document.createElement('div');
                div.className = `print-piece ${piece.shape}`;
                
                // Content
                const inner = document.createElement('div');
                inner.className = 'print-content';
                inner.style.backgroundColor = piece.color;
                // Determine text color based on brightness
                inner.style.color = isDark(piece.color) ? 'white' : 'black';
                inner.innerText = piece.text;
                
                div.appendChild(inner);
                page.appendChild(div);
                container.appendChild(page);
            }
        }
    });

    // 4. Render Dice
    // Standard D6 template with folding tabs
    const diceHtml = `
        <div class="print-page">
            <div style="display:flex; flex-direction: column; align-items: center; gap: 0;">
                <!-- Row 1 -->
            <div style="display:flex;">
                 <div style="width: 4cm; height: 4cm;"></div>
                 <div class="dice-face" style="background: white;">1
                    <div class="tab-top" style="top:-1cm; left:0; width:100%; height:1cm; clip-path: polygon(20% 0, 80% 0, 100% 100%, 0 100%); border:1px solid #999; border-bottom:none;">glue</div>
                    <div class="tab-left" style="left:-1cm; top:0; width:1cm; height:100%; clip-path: polygon(0 20%, 0 80%, 100% 100%, 100% 0); border:1px solid #999; border-right:none;">glue</div>
                    <div class="tab-right" style="right:-1cm; top:0; width:1cm; height:100%; clip-path: polygon(100% 20%, 100% 80%, 0 100%, 0 0); border:1px solid #999; border-left:none;">glue</div>
                 </div>
                 <div style="width: 4cm; height: 4cm;"></div>
                 <div style="width: 4cm; height: 4cm;"></div>
            </div>
            <!-- Row 2 -->
            <div style="display:flex;">
                 <div class="dice-face" style="background: white;">2
                    <div class="tab-left" style="left:-1cm; top:0; width:1cm; height:100%; clip-path: polygon(0 20%, 0 80%, 100% 100%, 100% 0); border:1px solid #999; border-right:none;">glue</div>
                 </div>
                 <div class="dice-face" style="background: white;">3</div>
                 <div class="dice-face" style="background: white;">4</div>
                 <div class="dice-face" style="background: white;">5
                    <div class="tab-right" style="right:-1cm; top:0; width:1cm; height:100%; clip-path: polygon(100% 20%, 100% 80%, 0 100%, 0 0); border:1px solid #999; border-left:none;">glue</div>
                 </div>
            </div>
            <!-- Row 3 -->
            <div style="display:flex;">
                 <div style="width: 4cm; height: 4cm;"></div>
                 <div class="dice-face" style="background: white;">6
                    <div class="tab-bottom" style="bottom:-1cm; left:0; width:100%; height:1cm; clip-path: polygon(20% 100%, 80% 100%, 100% 0, 0 0); border:1px solid #999; border-top:none;">glue</div>
                    <div class="tab-left" style="left:-1cm; top:0; width:1cm; height:100%; clip-path: polygon(0 20%, 0 80%, 100% 100%, 100% 0); border:1px solid #999; border-right:none;">glue</div>
                    <div class="tab-right" style="right:-1cm; top:0; width:1cm; height:100%; clip-path: polygon(100% 20%, 100% 80%, 0 100%, 0 0); border:1px solid #999; border-left:none;">glue</div>
                 </div>
                 <div style="width: 4cm; height: 4cm;"></div>
                 <div style="width: 4cm; height: 4cm;"></div>
            </div>
            <p style="text-align:center; font-style:italic;">Standard D6 Construction Net</p>
        </div>
        </div>
    `;

    diceContainer.innerHTML = diceHtml;
}

// Helper to check color brightness
function isDark(colorHex) {
    const hex = colorHex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness < 128;
}