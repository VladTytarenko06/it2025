const mapContainer = document.getElementById('gridMap');
const ROWS = 20;
const COLS = 20;
let grid = [];
let startNode = {r: 2, c: 2};
let endNode = {r: 17, c: 17};
let isPathfinding = false;

// Weights
const COST_PLAIN = 1;
const COST_FOREST = 5;
const COST_WALL = Infinity;

function generateGrid() {
    mapContainer.innerHTML = '';
    grid = [];
    isPathfinding = false;

    for (let r = 0; r < ROWS; r++) {
        let row = [];
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('map-node');
            
            // Random generation logic
            let type = 'plain';
            let weight = COST_PLAIN;
            
            const rand = Math.random();
            if (rand < 0.2) {
                type = 'wall';
                weight = COST_WALL;
                cell.classList.add('wall');
            } else if (rand < 0.4) {
                type = 'forest';
                weight = COST_FOREST;
                cell.classList.add('forest');
            }

            // Force start/end to be plain
            if ((r === startNode.r && c === startNode.c) || (r === endNode.r && c === endNode.c)) {
                type = 'plain';
                weight = COST_PLAIN;
                cell.classList.remove('wall', 'forest');
            }

            cell.dataset.r = r;
            cell.dataset.c = c;
            
            if (r === startNode.r && c === startNode.c) cell.classList.add('start');
            if (r === endNode.r && c === endNode.c) cell.classList.add('end');

            mapContainer.appendChild(cell);
            row.push({ r, c, weight, cell, parent: null, distance: Infinity, f: Infinity });
        }
        grid.push(row);
    }
}

async function startDijkstra() {
    if (isPathfinding) return;
    isPathfinding = true;
    resetGridState();
    
    let unvisited = [];
    // Init
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            if (grid[r][c].weight !== Infinity) {
                unvisited.push(grid[r][c]);
            }
        }
    }
    
    grid[startNode.r][startNode.c].distance = 0;
    
    while (unvisited.length > 0) {
        // Sort by distance (inefficient PQ but works for demo)
        unvisited.sort((a, b) => a.distance - b.distance);
        let current = unvisited.shift();
        
        if (current.distance === Infinity) break; // unreachable
        if (current.r === endNode.r && current.c === endNode.c) {
            await reconstructPath(current);
            break;
        }
        
        current.cell.classList.add('visited');
        //await sleep(10); // Very fast for demo
        
        const neighbors = getNeighbors(current.r, current.c);
        for (let n of neighbors) {
            if (!unvisited.includes(n)) continue;
            
            let alt = current.distance + n.weight;
            if (alt < n.distance) {
                n.distance = alt;
                n.parent = current;
                // Visual feedback of frontier
                n.cell.style.opacity = '0.7'; 
            }
        }
        
        if (current.distance % 2 === 0) await sleep(5);
    }
    isPathfinding = false;
}

async function startAStar() {
    if (isPathfinding) return;
    isPathfinding = true;
    resetGridState();
    
    let openSet = [grid[startNode.r][startNode.c]];
    grid[startNode.r][startNode.c].distance = 0; // g-score
    grid[startNode.r][startNode.c].f = heuristic(startNode, endNode);
    
    while (openSet.length > 0) {
        // finding lowest f-score
        openSet.sort((a,b) => a.f - b.f);
        let current = openSet.shift();
        
        if (current.r === endNode.r && current.c === endNode.c) {
            await reconstructPath(current);
            break;
        }
        
        current.cell.classList.add('visited');
        //await sleep(10);
        
        let neighbors = getNeighbors(current.r, current.c);
        for(let n of neighbors) {
            if (n.weight === Infinity) continue;
            
            let tempG = current.distance + n.weight;
            if (tempG < n.distance) {
                n.parent = current;
                n.distance = tempG;
                n.f = tempG + heuristic(n, endNode);
                
                if (!openSet.includes(n)) {
                    openSet.push(n);
                    n.cell.style.opacity = '0.7';
                }
            }
        }
        if (current.distance % 2 === 0) await sleep(5);
    }
    isPathfinding = false;
}

function getNeighbors(r, c) {
    let res = [];
    if (r > 0) res.push(grid[r-1][c]);
    if (r < ROWS-1) res.push(grid[r+1][c]);
    if (c > 0) res.push(grid[r][c-1]);
    if (c < COLS-1) res.push(grid[r][c+1]);
    return res;
}

function heuristic(a, b) {
    // Manhattan distance
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
}

function resetGridState() {
    for(let r=0; r<ROWS; r++) {
        for(let c=0; c<COLS; c++) {
            grid[r][c].distance = Infinity;
            grid[r][c].f = Infinity;
            grid[r][c].parent = null;
            grid[r][c].cell.classList.remove('visited', 'path');
            grid[r][c].cell.style.opacity = '1';
        }
    }
}

async function reconstructPath(node) {
    let curr = node;
    while (curr) {
        curr.cell.classList.remove('visited');
        curr.cell.classList.add('path');
        await sleep(20);
        curr = curr.parent;
    }
}

// Init
generateGrid();
