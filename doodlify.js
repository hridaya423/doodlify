document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const colorPicker = document.getElementById('colorPicker');
    const brushSize = document.getElementById('brushSize');
    const clearBtn = document.getElementById('clear');
    const saveBtn = document.getElementById('save');
    const shareBtn = document.getElementById('share');
    const undoBtn = document.getElementById('undo');
    const penTool = document.getElementById('penTool');
    const eraserTool = document.getElementById('eraserTool');
    const rectangleTool = document.getElementById('rectangleTool');
    const circleTool = document.getElementById('circleTool');
    const lineTool = document.getElementById('lineTool');
    const gridToggle = document.getElementById('gridToggle');
    const toast = document.getElementById('toast');

    const style = document.createElement('style');
    style.textContent = `
        #canvas {
            position: absolute;
            top: 0;
            left: 0;
            cursor: crosshair;
            z-index: 1;
        }
        #gridCanvas {
            position: absolute;
            top: 0;
            left: 0;
            pointer-events: none;
            z-index: 0;
            opacity: 0.5;
        }
        .toolbar {
            z-index: 1000;
            position: fixed;
            left: 20px;
            top: 50%;
            transform: translateY(-50%);
        }
    `;
    document.head.appendChild(style);

    const gridCanvas = document.createElement('canvas');
    gridCanvas.id = 'gridCanvas';
    canvas.parentNode.insertBefore(gridCanvas, canvas);
    
    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;
    let undoStack = [];
    let currentTool = 'pen';
    let isDrawingShape = false;
    let shapeStartX = 0;
    let shapeStartY = 0;
    let gridEnabled = false;

    function isInToolbarArea(x, y) {
        const toolbar = document.querySelector('.toolbar');
        const toolbarRect = toolbar.getBoundingClientRect();
        
        const padding = 10;
        return x >= (toolbarRect.left - padding) && 
               x <= (toolbarRect.right + padding) && 
               y >= (toolbarRect.top - padding) && 
               y <= (toolbarRect.bottom + padding);
    }
    
    function resizeCanvas() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        canvas.width = width;
        canvas.height = height;
        gridCanvas.width = width;
        gridCanvas.height = height;
        
        if (gridEnabled) drawGrid();
        saveState();
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    function saveState() {
        undoStack.push(canvas.toDataURL());
        if (undoStack.length > 50) undoStack.shift(); 
        undoBtn.style.opacity = undoStack.length > 1 ? '1' : '0.5';
    }
    function undo() {
        if (undoStack.length > 1) {
            undoStack.pop();
            const img = new Image();
            img.src = undoStack[undoStack.length - 1];
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
            undoBtn.style.opacity = undoStack.length > 1 ? '1' : '0.5';
        }
    }
    function drawGrid() {
        const gridCtx = gridCanvas.getContext('2d');
        gridCtx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
        
        if (!gridEnabled) return;
        
        const gridSize = 20;
        const gridColor = '#ddd';
        
        gridCtx.strokeStyle = gridColor;
        gridCtx.lineWidth = 0.5;
        
        for (let x = 0; x < gridCanvas.width; x += gridSize) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, gridCanvas.height);
            gridCtx.stroke();
        }
        
        for (let y = 0; y < gridCanvas.height; y += gridSize) {
            gridCtx.beginPath();
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(gridCanvas.width, y);
            gridCtx.stroke();
        }
    }

    function drawShape(currentX, currentY, shape) {
        ctx.beginPath();
        ctx.strokeStyle = colorPicker.value;
        ctx.lineWidth = brushSize.value;
        
        const width = currentX - shapeStartX;
        const height = currentY - shapeStartY;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const lastState = undoStack[undoStack.length - 1];
        const img = new Image();
        img.src = lastState;
        ctx.drawImage(img, 0, 0);
        
        switch(shape) {
            case 'rectangle':
                ctx.strokeRect(shapeStartX, shapeStartY, width, height);
                break;
            case 'circle':
                const radius = Math.sqrt(width * width + height * height) / 2;
                ctx.arc(shapeStartX, shapeStartY, radius, 0, Math.PI * 2);
                ctx.stroke();
                break;
            case 'line':
                ctx.moveTo(shapeStartX, shapeStartY);
                ctx.lineTo(currentX, currentY);
                ctx.stroke();
                break;
        }
    }
    function startDrawing(e) {
        if (isInToolbarArea(e.clientX, e.clientY)) {
            return;
        }
        
        isDrawing = true;
        const [x, y] = getCoordinates(e);
        [lastX, lastY] = [x, y];
        [shapeStartX, shapeStartY] = [x, y];
        
        if (!['rectangle', 'circle', 'line'].includes(currentTool)) {
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
        }
    }
    function draw(e) {
        if (!isDrawing) return;
        if (isInToolbarArea(e.clientX, e.clientY)) {
            stopDrawing();
            return;
        }
        
        const [currentX, currentY] = getCoordinates(e);
        
        if (['rectangle', 'circle', 'line'].includes(currentTool)) {
            drawShape(currentX, currentY, currentTool);
            return;
        }
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(currentX, currentY);
        
        if (currentTool === 'eraser') {
            ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--background-color');
            ctx.lineWidth = brushSize.value * 2;
        } else {
            ctx.strokeStyle = colorPicker.value;
            ctx.lineWidth = brushSize.value;
        }
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        [lastX, lastY] = [currentX, currentY];
    }
    
    function stopDrawing() {
        if (isDrawing) {
            ctx.closePath();
            saveState();
        }
        isDrawing = false;
    }
    
    function getCoordinates(e) {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX || e.touches[0].clientX) - rect.left;
        const y = (e.clientY || e.touches[0].clientY) - rect.top;
        return [x, y];
    }
    
    function showToast(message, duration = 3000) {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }

    function showShareDialog() {
        const dialog = document.createElement('div');
        dialog.className = 'share-dialog';
        dialog.innerHTML = `
            <div class="share-content">
                <h3>Share Your Doodle</h3>
                <button id="copyImage" class="share-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    Copy Image
                </button>
                <button id="downloadPng" class="share-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download PNG
                </button>
                <button id="closeShare" class="share-button secondary">Close</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        dialog.querySelector('#copyImage').addEventListener('click', async () => {
            await copyCanvasToClipboard();
            dialog.remove();
        });
        dialog.querySelector('#downloadPng').addEventListener('click', () => {
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '-');
            link.download = `doodlify-${timestamp}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast('Doodle downloaded successfully!');
            dialog.remove();
        });
        dialog.querySelector('#closeShare').addEventListener('click', () => {
            dialog.remove();
        });
        
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) dialog.remove();
        });
    }
    
    async function copyCanvasToClipboard() {
        try {
            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, 'image/png');
            });
            
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            
            showToast('Image copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy:', err);
            const dataUrl = canvas.toDataURL('image/png');
            await navigator.clipboard.writeText(dataUrl);
            showToast('Link copied to clipboard (fallback mode)');
        }
    }
    function setActiveTool(tool) {
        currentTool = tool;
        [penTool, eraserTool, rectangleTool, circleTool, lineTool].forEach(btn => {
            btn.classList.remove('active', 'shape-active');
        });
        const button = {
            pen: penTool,
            eraser: eraserTool,
            rectangle: rectangleTool,
            circle: circleTool,
            line: lineTool
        }[tool];
        
        button.classList.add(['rectangle', 'circle', 'line'].includes(tool) ? 'shape-active' : 'active');
        canvas.style.cursor = tool === 'eraser' ? 'cell' : 'crosshair';
    }
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startDrawing(e);
    });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        draw(e);
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        stopDrawing();
    });
    
    penTool.addEventListener('click', () => setActiveTool('pen'));
    eraserTool.addEventListener('click', () => setActiveTool('eraser'));
    rectangleTool.addEventListener('click', () => setActiveTool('rectangle'));
    circleTool.addEventListener('click', () => setActiveTool('circle'));
    lineTool.addEventListener('click', () => setActiveTool('line'));
    
    gridToggle.addEventListener('click', () => {
        gridEnabled = !gridEnabled;
        gridToggle.classList.toggle('active');
        drawGrid();
    });
    
    clearBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the canvas?')) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            saveState();
            showToast('Canvas cleared');
        }
    });
    
    undoBtn.addEventListener('click', undo);
    shareBtn.addEventListener('click', showShareDialog);
    saveBtn.addEventListener('click', () => {
        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0,19).replace(/[:]/g, '-');
        link.download = `doodlify-${timestamp}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast('Doodle saved successfully!');
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 'z':
                    e.preventDefault();
                    undo();
                    break;
                case 's':
                    e.preventDefault();
                    saveBtn.click();
                    break;
            }
        }
    });
    saveState();
    undoBtn.style.opacity = '0.5';
    showToast('Welcome to Doodlify! Start drawing...', 2000);
});