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
}

brushSize.addEventListener('input', updateBrushPreview);

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

function updateCursor() {
    const size = brushSize.value;
    const color = currentTool === 'eraser' ? '#ffffff' : colorPicker.value;
    const cursorCanvas = document.createElement('canvas');
    cursorCanvas.width = size * 2;
    cursorCanvas.height = size * 2;
    const cursorCtx = cursorCanvas.getContext('2d');
    cursorCtx.beginPath();
    cursorCtx.arc(size, size, size / 2, 0, Math.PI * 2);
    cursorCtx.strokeStyle = color;
    cursorCtx.stroke();
    const cursorUrl = cursorCanvas.toDataURL();
    canvas.style.cursor = `url(${cursorUrl}) ${size} ${size}, auto`;
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