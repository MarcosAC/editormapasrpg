// Configurações globais
const canvas = document.getElementById("mapCanvas");
const ctx = canvas.getContext("2d");
const canvasOverlay = document.getElementById("canvasOverlay");
const assetModal = new bootstrap.Modal(document.getElementById('assetModal'));

// Estado do aplicativo
let state = {
    gridSize: parseInt(document.getElementById("gridSize").value),
    isDrawing: false,
    currentTool: "pencil",
    draggedAsset: null,
    placedAssets: [],
    selectedAsset: null,
    showGrid: true,
    wallColor: "#333333",
    floorColor: "#eeeeee"
};

// Inicialização
init();

function init() {
    setupEventListeners();
    drawGrid();
}

function setupEventListeners() {
    // Controles do canvas
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    
    // Drag and Drop
    document.querySelectorAll(".draggable-asset").forEach(asset => {
        asset.addEventListener("dragstart", handleDragStart);
        asset.addEventListener("dragend", handleDragEnd);
    });
    
    canvas.addEventListener("dragover", handleDragOver);
    canvas.addEventListener("dragleave", handleDragLeave);
    canvas.addEventListener("drop", handleDrop);
    
    // Ferramentas
    document.getElementById("pencilTool").addEventListener("click", () => setTool("pencil"));
    document.getElementById("eraseTool").addEventListener("click", () => setTool("erase"));
    document.getElementById("rectTool").addEventListener("click", () => setTool("rect"));
    document.getElementById("selectTool").addEventListener("click", () => setTool("select"));
    
    // Controles
    document.getElementById("gridSize").addEventListener("change", handleGridSizeChange);
    document.getElementById("gridToggle").addEventListener("change", toggleGridVisibility);
    document.getElementById("exportPNG").addEventListener("click", exportPNG);
    document.getElementById("clearCanvas").addEventListener("click", clearCanvas);
    document.getElementById("assetSearch").addEventListener("input", filterAssets);
    document.getElementById("deleteAsset").addEventListener("click", deleteSelectedAsset);
    document.getElementById("assetSize").addEventListener("input", resizeSelectedAsset);
}

// Funções de desenho
function drawGrid() {
    if (!state.showGrid) return;
    
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    
    for (let x = 0; x < canvas.width; x += state.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    for (let y = 0; y < canvas.height; y += state.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function paintTile(x, y, color) {
    const tileX = Math.floor(x / state.gridSize) * state.gridSize;
    const tileY = Math.floor(y / state.gridSize) * state.gridSize;
    
    ctx.fillStyle = color;
    ctx.fillRect(tileX, tileY, state.gridSize, state.gridSize);
    
    if (state.showGrid) {
        ctx.strokeStyle = "#ddd";
        ctx.strokeRect(tileX, tileY, state.gridSize, state.gridSize);
    }
}

// Funções de assets
function drawAsset(assetElement, x, y, size = null) {
    const assetType = assetElement.parentElement.dataset.asset;
    const drawSize = size || state.gridSize;
    
    // Desenha o emoji
    ctx.font = `${drawSize}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.fillText(assetElement.textContent, x, y + drawSize);
    
    // Armazena o asset
    state.placedAssets.push({
        type: assetType,
        x: x,
        y: y,
        size: drawSize,
        element: assetElement
    });
}

function renderAssets() {
    state.placedAssets.forEach(asset => {
        ctx.font = `${asset.size}px Arial`;
        ctx.fillStyle = '#000000';
        ctx.fillText(asset.element.textContent, asset.x, asset.y + asset.size);
    });
}

// Manipulação de eventos
function handleMouseDown(e) {
    state.isDrawing = true;
    handleDrawing(e);
}

function handleMouseMove(e) {
    if (state.isDrawing) {
        handleDrawing(e);
    }
}

function handleMouseUp() {
    state.isDrawing = false;
}

function handleMouseLeave() {
    state.isDrawing = false;
}

function handleDrawing(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    switch (state.currentTool) {
        case "pencil":
            paintTile(x, y, state.wallColor);
            break;
        case "erase":
            paintTile(x, y, state.floorColor);
            removeAssetsAtPosition(x, y);
            break;
        case "select":
            selectAssetAtPosition(x, y);
            break;
    }
}

// Funções de Drag and Drop
function handleDragStart(e) {
    state.draggedAsset = e.target;
    e.dataTransfer.setData("text/plain", e.target.parentElement.dataset.asset);
    e.target.classList.add("dragging");
}

function handleDragEnd() {
    if (state.draggedAsset) {
        state.draggedAsset.classList.remove("dragging");
        state.draggedAsset = null;
    }
}

function handleDragOver(e) {
    e.preventDefault();
    canvas.classList.add("drag-over");
}

function handleDragLeave() {
    canvas.classList.remove("drag-over");
}

function handleDrop(e) {
    e.preventDefault();
    canvas.classList.remove("drag-over");
    
    if (!state.draggedAsset) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const gridX = Math.floor(x / state.gridSize) * state.gridSize;
    const gridY = Math.floor(y / state.gridSize) * state.gridSize;
    
    drawAsset(state.draggedAsset, gridX, gridY);
}

// Funções de seleção e manipulação de assets
function selectAssetAtPosition(x, y) {
    const gridX = Math.floor(x / state.gridSize) * state.gridSize;
    const gridY = Math.floor(y / state.gridSize) * state.gridSize;
    
    state.selectedAsset = state.placedAssets.find(asset => 
        asset.x === gridX && asset.y === gridY
    );
    
    if (state.selectedAsset) {
        document.getElementById('assetModalTitle').textContent = 
            `Editar ${state.selectedAsset.type}`;
        document.getElementById('assetSize').value = state.selectedAsset.size;
        assetModal.show();
    }
}

function deleteSelectedAsset() {
    if (!state.selectedAsset) return;
    
    state.placedAssets = state.placedAssets.filter(asset => 
        asset !== state.selectedAsset
    );
    
    redrawCanvas();
    assetModal.hide();
}

function resizeSelectedAsset() {
    if (!state.selectedAsset) return;
    
    const newSize = parseInt(document.getElementById('assetSize').value);
    state.selectedAsset.size = newSize;
    
    redrawCanvas();
}

function removeAssetsAtPosition(x, y) {
    const gridX = Math.floor(x / state.gridSize) * state.gridSize;
    const gridY = Math.floor(y / state.gridSize) * state.gridSize;
    
    state.placedAssets = state.placedAssets.filter(asset => 
        !(asset.x === gridX && asset.y === gridY)
    );
}

// Funções de controle
function setTool(tool) {
    state.currentTool = tool;
    setActiveTool(`${tool}Tool`);
    
    switch (tool) {
        case "pencil":
            canvas.style.cursor = "crosshair";
            break;
        case "erase":
            canvas.style.cursor = "not-allowed";
            break;
        case "select":
            canvas.style.cursor = "pointer";
            break;
        default:
            canvas.style.cursor = "default";
    }
}

function setActiveTool(toolId) {
    document.querySelectorAll(".tool-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.getElementById(toolId).classList.add("active");
}

function handleGridSizeChange(e) {
    state.gridSize = parseInt(e.target.value);
    redrawCanvas();
}

function toggleGridVisibility() {
    state.showGrid = !state.showGrid;
    redrawCanvas();
}

function filterAssets() {
    const searchTerm = document.getElementById("assetSearch").value.toLowerCase();
    document.querySelectorAll(".asset-item").forEach(item => {
        const assetName = item.dataset.asset.toLowerCase();
        item.style.display = assetName.includes(searchTerm) ? "block" : "none";
    });
}

// Funções de exportação e limpeza
function exportPNG() {
    const link = document.createElement("a");
    link.download = "dungeon-map.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
}

function clearCanvas() {
    if (confirm("Tem certeza que deseja limpar todo o mapa?")) {
        state.placedAssets = [];
        redrawCanvas();
    }
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    renderAssets();
}