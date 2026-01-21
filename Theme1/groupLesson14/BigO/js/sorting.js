const container = document.getElementById('sortingVisualizer');
const opsDisplay = document.getElementById('sortOps');
const timeDisplay = document.getElementById('sortTime');

let array = [];
let bars = [];
let isSorting = false;
let stopSorting = false;
const DELAY = 50; // ms

function initArray() {
    if (isSorting) {
        stopSorting = true;
        // give it a moment to stop
        setTimeout(generateArray, 100);
        return;
    }
    generateArray();
}

function generateArray() {
    stopSorting = false;
    isSorting = false;
    array = [];
    container.innerHTML = '';
    
    // Generate 50 random values
    for (let i = 0; i < 50; i++) {
        array.push(Math.floor(Math.random() * 100) + 5);
    }
    
    // Create DOM elements
    array.forEach(value => {
        const bar = document.createElement('div');
        bar.classList.add('bar');
        bar.style.height = `${value * 3}px`; // Scale for visibility
        container.appendChild(bar);
    });
    
    bars = document.querySelectorAll('.bar');
    opsDisplay.innerText = '0';
    timeDisplay.innerText = '0ms';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startBubbleSort() {
    if (isSorting) return;
    isSorting = true;
    let ops = 0;
    const startTime = Date.now();
    
    for (let i = 0; i < array.length; i++) {
        for (let j = 0; j < array.length - i - 1; j++) {
            if (stopSorting) return; // Exit signal
            
            bars[j].classList.add('active');
            bars[j + 1].classList.add('active');
            
            ops++;
            opsDisplay.innerText = ops;
            timeDisplay.innerText = `${Date.now() - startTime}ms`;
            
            await sleep(DELAY);
            
            if (array[j] > array[j + 1]) {
                // Swap logic
                let temp = array[j];
                array[j] = array[j + 1];
                array[j + 1] = temp;
                
                // Visual swap
                bars[j].style.height = `${array[j] * 3}px`;
                bars[j + 1].style.height = `${array[j + 1] * 3}px`;
            }
            
            bars[j].classList.remove('active');
            bars[j + 1].classList.remove('active');
        }
        bars[array.length - i - 1].classList.add('sorted');
    }
    bars[0].classList.add('sorted'); // Last one
    isSorting = false;
}

async function startQuickSort() {
    if (isSorting) return;
    isSorting = true;
    const startTime = Date.now();
    let ops = { count: 0 };
    
    await quickSortRecursive(0, array.length - 1, ops, startTime);
    
    if (!stopSorting) {
        bars.forEach(b => b.classList.add('sorted'));
    }
    isSorting = false;
}

async function quickSortRecursive(low, high, ops, startTime) {
    if (low < high) {
        if (stopSorting) return;
        let pi = await partition(low, high, ops, startTime);
        
        await quickSortRecursive(low, pi - 1, ops, startTime);
        await quickSortRecursive(pi + 1, high, ops, startTime);
    }
}

async function partition(low, high, ops, startTime) {
    if (stopSorting) return;
    let pivot = array[high];
    bars[high].classList.add('pivot');
    
    let i = (low - 1);
    
    for (let j = low; j <= high - 1; j++) {
        if (stopSorting) return;
        
        bars[j].classList.add('active');
        await sleep(DELAY);
        
        ops.count++;
        opsDisplay.innerText = ops.count;
        timeDisplay.innerText = `${Date.now() - startTime}ms`;
        
        if (array[j] < pivot) {
            i++;
            // swap
            [array[i], array[j]] = [array[j], array[i]];
            bars[i].style.height = `${array[i] * 3}px`;
            bars[j].style.height = `${array[j] * 3}px`;
        }
        bars[j].classList.remove('active');
    }
    
    // swap pivot
    [array[i + 1], array[high]] = [array[high], array[i + 1]];
    bars[i + 1].style.height = `${array[i+1] * 3}px`;
    bars[high].style.height = `${array[high] * 3}px`;
    
    bars[high].classList.remove('pivot');
    return (i + 1);
}

// Init on load
generateArray();
