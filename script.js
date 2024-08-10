const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushPreview = document.getElementById('brushPreview');
const clearButton = document.getElementById('clearButton');
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const zoomInButton = document.getElementById('zoomInButton');
const zoomOutButton = document.getElementById('zoomOutButton');
const pencilTool = document.getElementById('pencilTool');
const brushTool = document.getElementById('brushTool');
const eraserTool = document.getElementById('eraserTool');
const colorSwatches = document.querySelectorAll('.color-swatch');

let isDrawing = false;
let currentTool = 'pencil';
let undoStack = [];
let redoStack = [];
let zoom = 1;
let panX = 0;
let panY = 0;

function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    const containerHeight = canvas.parentElement.clientHeight;
    canvas.width = containerWidth;
    canvas.height = containerHeight;
    redrawCanvas();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function setTool(tool) {
    currentTool = tool;
    [pencilTool, brushTool, eraserTool].forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tool}Tool`).classList.add('active');
    updateCursor();
}

pencilTool.addEventListener('click', () => setTool('pencil'));
brushTool.addEventListener('click', () => setTool('brush'));
eraserTool.addEventListener('click', () => setTool('eraser'));

function updateColor() {
    setColor(colorPicker.value);
}

function setColor(color) {
    colorPicker.value = color;
    brushPreview.style.backgroundColor = color;
    updateCursor();
}

colorPicker.addEventListener('input', updateColor);
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
        if (swatch.classList.contains('custom')) {
            addCustomColor();
        } else {
            setColor(swatch.style.backgroundColor);
        }
    });
});

function addCustomColor() {
    const newColor = colorPicker.value;
    const newSwatch = document.createElement('div');
    newSwatch.className = 'color-swatch';
    newSwatch.style.backgroundColor = newColor;
    newSwatch.addEventListener('click', () => setColor(newColor));
    document.querySelector('.color-palette').insertBefore(newSwatch, document.querySelector('.color-swatch.custom'));
}

function updateBrushPreview() {
    const size = brushSize.value;
    brushPreview.style.width = `${size}px`;
    brushPreview.style.height = `${size}px`;
    updateCursor();
}

brushSize.addEventListener('input', updateBrushPreview);

function updateCursor() {
    const size = brushSize.value;
    const color = currentTool === 'eraser' ? '#ffffff' : colorPicker.value;
    let cursorSvg;

    switch (currentTool) {
        case 'pencil':
            cursorSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">
                    <circle cx="${size}" cy="${size}" r="${size / 2}" fill="none" stroke="${color}" stroke-width="1.5"/>
                    <line x1="${size}" y1="${size}" x2="${size}" y2="${size * 2}" stroke="${color}" stroke-width="1.5"/>
                    <line x1="${size}" y1="${size}" x2="${size * 1.5}" y2="${size * 1.5}" stroke="${color}" stroke-width="1.5"/>
                </svg>
            `;
            break;
        case 'brush':
            cursorSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">
                    <circle cx="${size}" cy="${size}" r="${size / 2}" fill="none" stroke="${color}" stroke-width="1.5">
                        <animate attributeName="r" values="${size / 2};${size / 2.2};${size / 2}" dur="1s" repeatCount="indefinite"/>
                    </circle>
                    <circle cx="${size}" cy="${size}" r="${size / 4}" fill="${color}">
                        <animate attributeName="r" values="${size / 4};${size / 4.4};${size / 4}" dur="1s" repeatCount="indefinite"/>
                    </circle>
                </svg>
            `;
            break;
        case 'eraser':
            cursorSvg = `
                <svg xmlns="http://www.w3.org/2000/svg" width="${size * 2}" height="${size * 2}" viewBox="0 0 ${size * 2} ${size * 2}">
                    <rect x="${size / 2}" y="${size / 2}" width="${size}" height="${size}" fill="none" stroke="#000000" stroke-width="1.5"/>
                    <line x1="${size / 2}" y1="${size / 2}" x2="${size * 1.5}" y2="${size * 1.5}" stroke="#000000" stroke-width="1.5"/>
                    <line x1="${size * 1.5}" y1="${size / 2}" x2="${size / 2}" y2="${size * 1.5}" stroke="#000000" stroke-width="1.5"/>
                </svg>
            `;
            break;
    }

    const cursorUrl = `data:image/svg+xml;base64,${btoa(addDropShadowToSvg(cursorSvg))}`;
    canvas.style.cursor = `url(${cursorUrl}) ${size} ${size}, auto`;
}

function addDropShadowToSvg(svgString) {
    const parser = new DOMParser();
    const svg = parser.parseFromString(svgString, 'image/svg+xml').documentElement;
    
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <filter id="drop-shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feFlood flood-color="#000000" flood-opacity="0.3"/>
            <feComposite in2="offsetblur" operator="in"/>
            <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
            </feMerge>
        </filter>
    `;
    svg.insertBefore(defs, svg.firstChild);
    
    svg.querySelectorAll('circle, rect, line').forEach(shape => {
        shape.setAttribute('filter', 'url(#drop-shadow)');
    });
    
    return new XMLSerializer().serializeToString(svg);
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom - panX;
    const y = (e.clientY - rect.top) / zoom - panY;

    ctx.lineWidth = brushSize.value / zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colorPicker.value;
    }

    if (currentTool === 'brush') {
        ctx.globalAlpha = 0.1;
    } else {
        ctx.globalAlpha = 1;
    }

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function stopDrawing() {
    if (isDrawing) {
        ctx.beginPath();
        isDrawing = false;
        saveState();
    }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', handleTouch);
canvas.addEventListener('touchmove', handleTouch);
canvas.addEventListener('touchend', stopDrawing);

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

function saveState() {
    undoStack.push(canvas.toDataURL());
    redoStack = [];
}

function undo() {
    if (undoStack.length > 1) {
        redoStack.push(undoStack.pop());
        redrawCanvas();
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push(redoStack.pop());
        redrawCanvas();
    }
}

function redrawCanvas() {
    const img = new Image();
    img.src = undoStack[undoStack.length - 1];
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
}

function saveDrawing() {
    const link = document.createElement('a');
    link.download = 'drawing.png';
    link.href = canvas.toDataURL();
    link.click();
}

function loadDrawing() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                saveState();
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function zoomIn() {
    zoom *= 1.1;
    applyZoom();
}

function zoomOut() {
    zoom /= 1.1;
    applyZoom();
}

function applyZoom() {
    ctx.setTransform(zoom, 0, 0, zoom, panX, panY);
    redrawCanvas();
}

clearButton.addEventListener('click', clearCanvas);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
saveButton.addEventListener('click', saveDrawing);
loadButton.addEventListener('click', loadDrawing);
zoomInButton.addEventListener('click', zoomIn);
zoomOutButton.addEventListener('click', zoomOut);

updateBrushPreview();
updateCursor();
saveState();

// Add panning functionality
let isPanning = false;
let startPanX, startPanY;

canvas.addEventListener('mousedown', (e) => {
    if (e.button === 1) { // Middle mouse button
        isPanning = true;
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
        canvas.style.cursor = 'grabbing';
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        applyZoom();
    }
});

canvas.addEventListener('mouseup', () => {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'default';
        updateCursor();
    }
});

// Add animation to UI elements
function addPulseAnimation(element) {
    element.addEventListener('click', () => {
        element.classList.add('pulse');
        setTimeout(() => {
            element.classList.remove('pulse');
        }, 300);
    });
}

[clearButton, undoButton, redoButton, saveButton, loadButton, zoomInButton, zoomOutButton].forEach(addPulseAnimation);