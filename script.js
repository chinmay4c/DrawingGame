const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const clearButton = document.getElementById('clearButton');
const undoButton = document.getElementById('undoButton');
const redoButton = document.getElementById('redoButton');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');
const pencilTool = document.getElementById('pencilTool');
const brushTool = document.getElementById('brushTool');
const eraserTool = document.getElementById('eraserTool');
const colorSwatches = document.querySelectorAll('.color-swatch');

let isDrawing = false;
let currentTool = 'pencil';
let undoStack = [];
let redoStack = [];

// Set canvas size
function resizeCanvas() {
    const containerWidth = canvas.parentElement.clientWidth;
    canvas.width = Math.min(800, containerWidth - 20);
    canvas.height = canvas.width * 0.75;
    redrawCanvas();
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Tool selection
pencilTool.addEventListener('click', () => setTool('pencil'));
brushTool.addEventListener('click', () => setTool('brush'));
eraserTool.addEventListener('click', () => setTool('eraser'));

function setTool(tool) {
    currentTool = tool;
    [pencilTool, brushTool, eraserTool].forEach(btn => btn.classList.remove('active'));
    document.getElementById(`${tool}Tool`).classList.add('active');
}

// Color selection
colorPicker.addEventListener('change', () => setColor(colorPicker.value));
colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => setColor(swatch.style.backgroundColor));
});

function setColor(color) {
    colorPicker.value = color;
}

// Drawing events
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

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = brushSize.value;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'eraser') {
        ctx.strokeStyle = '#ffffff';
    } else {
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

// Undo/Redo functionality
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

// Clear canvas
function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
}

// Save and Load functionality
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

// Event listeners
clearButton.addEventListener('click', clearCanvas);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
saveButton.addEventListener('click', saveDrawing);
loadButton.addEventListener('click', loadDrawing);

// Initialize
saveState();