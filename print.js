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

    // 2. Render Stats (Cover Page)
    const coverPage = document.createElement('div');
    coverPage.className = 'print-page';
    coverPage.style.alignItems = 'flex-start'; 
    coverPage.style.justifyContent = 'flex-start';
    coverPage.style.padding = '2cm';
    coverPage.style.boxSizing = 'border-box';
    
    let statsHtml = `
        <div style="width: 100%; border-bottom: 2px solid #333; margin-bottom: 1cm; padding-bottom: 1cm;">
            <h1 style="font-size: 3rem; margin: 0;">${appState.activeProject ? appState.activeProject.name : 'Game Board Kit'}</h1>
            <p style="font-size: 1.5rem; color: #666;">Assembly Instructions & Manifest</p>
        </div>
        
        <div style="font-size: 1.2rem; line-height: 1.6;">
            <h3>Instructions:</h3>
            <ol>
                <li>Print all pages single-sided.</li>
                <li>Cut out each game tile along the border.</li>
                <li>Glue tiles onto a rigid backing (cardboard or foam board).</li>
                <li>Assemble the dice by cutting, folding, and gluing the tabs.</li>
            </ol>

            <h3>Piece Manifest:</h3>
            <ul>
    `;
    
    Object.keys(counts).forEach(pid => {
        const piece = appState.palette.find(p => p.id === pid);
        if(piece) {
            const swatchStyle = piece.textureUrl 
                ? `background-image: url('${piece.textureUrl}'); background-size: cover;` 
                : `background-color: ${piece.color};`;
            
            statsHtml += `<li><strong>${counts[pid]}x</strong> ${piece.shape.toUpperCase()} <span style="display:inline-block; width:1em; height:1em; ${swatchStyle} border:1px solid #000; vertical-align:middle; margin:0 5px;"></span> ("${piece.text}")</li>`;
        }
    });
    statsHtml += '</ul></div>';
    
    coverPage.innerHTML = statsHtml;
    statsContainer.appendChild(coverPage);

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
                
                if (piece.textureUrl) {
                    inner.style.backgroundImage = `url('${piece.textureUrl}')`;
                    inner.style.backgroundSize = 'cover';
                    inner.style.backgroundPosition = 'center';
                    // Text needs to be readable over image
                    inner.style.color = 'white';
                    inner.style.textShadow = '0 0 10px #000, 0 0 20px #000';
                } else {
                    inner.style.backgroundColor = piece.color;
                    inner.style.color = isDark(piece.color) ? 'white' : 'black';
                }
                
                inner.innerText = piece.text;
                
                div.appendChild(inner);
                page.appendChild(div);
                container.appendChild(page);
            }
        }
    });

    // 4. Render Dice
    // Standard D6 template with folding tabs
    // Layout: 
    //   1 (Top)
    // 4 2 3 5 (Left, Front, Right, Back)
    //   6 (Bottom)
    
    const diceHtml = `
        <div class="print-page">
            <h2 style="margin-bottom: 1cm; text-align: center;">Standard D6 Construction Net</h2>
            
            <div class="dice-net">
                <!-- Row 1: Top (1) -->
                <div class="dice-row">
                    <div class="dice-spacer"></div>
                    ${createDiceFace(1, ['top', 'left', 'right'])}
                    <div class="dice-spacer"></div>
                    <div class="dice-spacer"></div>
                </div>
                
                <!-- Row 2: Left(4), Front(2), Right(3), Back(5) -->
                <div class="dice-row">
                    ${createDiceFace(4, [])}
                    ${createDiceFace(2, [])}
                    ${createDiceFace(3, [])}
                    ${createDiceFace(5, ['right'])}
                </div>

                <!-- Row 3: Bottom (6) -->
                <div class="dice-row">
                    <div class="dice-spacer"></div>
                    ${createDiceFace(6, ['bottom', 'left', 'right'])}
                    <div class="dice-spacer"></div>
                    <div class="dice-spacer"></div>
                </div>
            </div>
            
            <div style="margin-top: 2cm; text-align: center; color: #666;">
                <p><strong>Instructions:</strong></p>
                <p>1. Cut along the solid outer lines (including tabs).</p>
                <p>2. Fold along all internal lines.</p>
                <p>3. Apply glue to the "glue" tabs and assemble the cube.</p>
            </div>
        </div>
    `;

    diceContainer.innerHTML = diceHtml;
}

function createDiceFace(number, tabs) {
    let tabsHtml = '';
    tabs.forEach(pos => {
        tabsHtml += createTab(pos);
    });
    
    return `
        <div class="dice-face">
            <span>${number}</span>
            ${tabsHtml}
        </div>
    `;
}

function createTab(position) {
    let d = '';
    let xText = 50, yText = 15;
    
    // Define SVG paths for trapezoids based on position
    // ViewBox 0 0 100 20 (approx ratio)
    if (position === 'top') {
        // Pointing Up
        d = "M15,20 L25,1 L75,1 L85,20"; 
        yText = 14;
    } else if (position === 'bottom') {
        // Pointing Down
        d = "M15,0 L25,19 L75,19 L85,0";
        yText = 12;
    } else if (position === 'left') {
        // Pointing Left (Vertical)
        // ViewBox 0 0 20 100
        d = "M20,15 L1,25 L1,75 L20,85";
        return `
        <div class="dice-tab tab-${position}">
            <svg viewBox="0 0 20 100" preserveAspectRatio="none" width="100%" height="100%">
                <path vector-effect="non-scaling-stroke" d="${d}" fill="#f0f0f0" stroke="#999" stroke-width="1" stroke-dasharray="2,0" />
                <text x="10" y="50" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#999" transform="rotate(-90, 10, 50)">glue</text>
            </svg>
        </div>`;
    } else if (position === 'right') {
        // Pointing Right (Vertical)
        d = "M0,15 L19,25 L19,75 L0,85";
        return `
        <div class="dice-tab tab-${position}">
            <svg viewBox="0 0 20 100" preserveAspectRatio="none" width="100%" height="100%">
                <path vector-effect="non-scaling-stroke" d="${d}" fill="#f0f0f0" stroke="#999" stroke-width="1" stroke-dasharray="2,0" />
                <text x="10" y="50" text-anchor="middle" dominant-baseline="middle" font-size="8" fill="#999" transform="rotate(90, 10, 50)">glue</text>
            </svg>
        </div>`;
    }

    return `
        <div class="dice-tab tab-${position}">
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" width="100%" height="100%">
                <path vector-effect="non-scaling-stroke" d="${d}" fill="#f0f0f0" stroke="#999" stroke-width="1" stroke-dasharray="2,0" />
                <text x="${xText}" y="${yText}" text-anchor="middle" font-size="8" fill="#999">glue</text>
            </svg>
        </div>
    `;
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