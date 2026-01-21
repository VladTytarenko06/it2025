const sizeInput = document.getElementById("dataset-size");
const sizeValue = document.getElementById("size-value");
const dataPreview = document.getElementById("data-preview");
const barStage = document.getElementById("bar-stage");
const sortStats = document.getElementById("sort-stats");
const sortSelect = document.getElementById("sort-method");
const searchLog = document.getElementById("search-log");
const searchStats = document.getElementById("search-stats");
const targetInput = document.getElementById("target-value");
const gridContainer = document.getElementById("grid");
const pathStats = document.getElementById("path-stats");
const obstacleInput = document.getElementById("obstacle-density");

const state = {
  data: [],
  running: false,
  grid: [],
};

const GRID_SIZE = 8;

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateData(size) {
  state.data = Array.from({ length: size }, () => rand(5, 95));
  renderData();
  renderBars(state.data);
}

function renderData() {
  sizeValue.textContent = `${state.data.length} елементів`;
  dataPreview.innerHTML = "";
  state.data.forEach((n) => {
    const chip = document.createElement("div");
    chip.className = "chip";
    chip.textContent = n;
    dataPreview.appendChild(chip);
  });
}

function renderBars(values, active = []) {
  barStage.innerHTML = "";
  const maxVal = Math.max(...values, 100);
  values.forEach((val, idx) => {
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${Math.max(12, (val / maxVal) * 160)}px`;
    if (active.includes(idx)) bar.classList.add("active");
    barStage.appendChild(bar);
  });
}

function selectionSortTrace(input) {
  const arr = [...input];
  const frames = [arr.slice()];
  let ops = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < arr.length; j++) {
      ops++;
      if (arr[j] < arr[minIdx]) minIdx = j;
    }
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      frames.push(arr.slice());
    }
  }
  return { frames, ops };
}

function quickSortTrace(input) {
  const arr = [...input];
  const frames = [arr.slice()];
  let ops = 0;

  function swap(i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    frames.push(arr.slice());
  }

  function partition(l, r) {
    const pivot = arr[Math.floor((l + r) / 2)];
    let i = l;
    let j = r;
    while (i <= j) {
      while (arr[i] < pivot) {
        i++;
        ops++;
      }
      while (arr[j] > pivot) {
        j--;
        ops++;
      }
      if (i <= j) {
        swap(i, j);
        i++;
        j--;
      }
    }
    return { i, j };
  }

  function qs(l, r) {
    if (l >= r) return;
    const { i, j } = partition(l, r);
    if (l < j) qs(l, j);
    if (i < r) qs(i, r);
  }

  qs(0, arr.length - 1);
  return { frames, ops };
}

async function animateSort() {
  if (state.running) return;
  state.running = true;
  const method = sortSelect.value;
  const dataCopy = [...state.data];
  const start = performance.now();
  const trace =
    method === "selection"
      ? selectionSortTrace(dataCopy)
      : quickSortTrace(dataCopy);
  const timeMs = performance.now() - start;
  for (let i = 0; i < trace.frames.length; i++) {
    renderBars(trace.frames[i]);
    await new Promise((res) => setTimeout(res, 120));
  }
  renderSortStats(method, trace.ops, timeMs, trace.frames.length);
  state.running = false;
}

function renderSortStats(method, ops, timeMs, frames) {
  const items = [
    {
      label: "Алгоритм",
      value: method === "selection" ? "Selection sort" : "Quicksort",
    },
    { label: "Операції", value: ops.toLocaleString("uk-UA") },
    { label: "Кадри", value: frames },
    { label: "Час, мс", value: timeMs.toFixed(2) },
    {
      label: "Теорія",
      value: method === "selection" ? "O(n²)" : "O(n log n)",
    },
  ];
  drawStats(sortStats, items);
}

function drawStats(container, items) {
  container.innerHTML = "";
  items.forEach((item) => {
    const stat = document.createElement("div");
    stat.className = "stat";
    stat.innerHTML = `<div class="label">${item.label}</div><div class="value">${item.value}</div>`;
    container.appendChild(stat);
  });
}

function linearSearch(arr, target) {
  const steps = [];
  const t0 = performance.now();
  let ops = 0;
  for (let i = 0; i < arr.length; i++) {
    ops++;
    steps.push({ index: i, value: arr[i], found: arr[i] === target });
    if (arr[i] === target) {
      return {
        found: true,
        steps,
        ops,
        time: performance.now() - t0,
        index: i,
      };
    }
  }
  return { found: false, steps, ops, time: performance.now() - t0, index: -1 };
}

function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;
  const steps = [];
  const t0 = performance.now();
  let ops = 0;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    ops++;
    const val = arr[mid];
    steps.push({ index: mid, value: val, found: val === target });
    if (val === target) {
      return {
        found: true,
        steps,
        ops,
        time: performance.now() - t0,
        index: mid,
      };
    }
    if (val < target) {
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }
  return { found: false, steps, ops, time: performance.now() - t0, index: -1 };
}

function runSearch() {
  const target = Number(targetInput.value);
  const sorted = [...state.data].sort((a, b) => a - b);
  const linear = linearSearch(sorted, target);
  const binary = binarySearch(sorted, target);
  renderSearchLogs(sorted, target, linear, binary);
  drawStats(searchStats, [
    { label: "Лінійний", value: `${linear.ops} ops · ${linear.time.toFixed(2)} мс · O(n)` },
    { label: "Двійковий", value: `${binary.ops} ops · ${binary.time.toFixed(2)} мс · O(log n)` },
    { label: "Ціль", value: target },
    { label: "Масив", value: `${sorted.length} елементів (відсорт.)` },
  ]);
}

function renderSearchLogs(sorted, target, linear, binary) {
  searchLog.innerHTML = "";
  const sortedRow = document.createElement("div");
  sortedRow.className = "search-step";
  sortedRow.textContent = `Відсортований масив: ${sorted.join(" · ")}`;
  searchLog.appendChild(sortedRow);

  const linTitle = document.createElement("div");
  linTitle.className = "search-step";
  linTitle.textContent = "Лінійний пошук:";
  searchLog.appendChild(linTitle);
  linear.steps.forEach((step) => {
    const div = document.createElement("div");
    div.className = `search-step ${step.found ? "" : "miss"}`;
    div.textContent = `i=${step.index}, value=${step.value} ${step.found ? "✔" : "✖"}`;
    searchLog.appendChild(div);
  });

  const binTitle = document.createElement("div");
  binTitle.className = "search-step";
  binTitle.textContent = "Двійковий пошук:";
  searchLog.appendChild(binTitle);
  binary.steps.forEach((step) => {
    const div = document.createElement("div");
    div.className = `search-step ${step.found ? "" : "miss"}`;
    div.textContent = `mid=${step.index}, value=${step.value} ${step.found ? "✔" : "⇆"}`;
    searchLog.appendChild(div);
  });

  if (!linear.found && !binary.found) {
    const miss = document.createElement("div");
    miss.className = "search-step miss";
    miss.textContent = `Елемент ${target} не знайдено`;
    searchLog.appendChild(miss);
  }
}

function buildGrid() {
  const density = Number(obstacleInput.value) / 100;
  const cells = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const isStart = i === 0;
    const isGoal = i === GRID_SIZE * GRID_SIZE - 1;
    const wall = Math.random() < density && !isStart && !isGoal;
    cells.push({ wall, visited: false, path: false });
  }
  state.grid = cells;
  renderGrid(cells);
  return cells;
}

function renderGrid(grid = state.grid) {
  gridContainer.innerHTML = "";
  grid.forEach((cell, idx) => {
    const div = document.createElement("div");
    div.className = "cell";
    if (idx === 0) div.classList.add("start");
    if (idx === GRID_SIZE * GRID_SIZE - 1) div.classList.add("goal");
    if (cell.wall) div.classList.add("wall");
    if (cell.visited) div.classList.add("visited");
    if (cell.path) div.classList.add("path");
    gridContainer.appendChild(div);
  });
}

function neighbors(idx) {
  const row = Math.floor(idx / GRID_SIZE);
  const col = idx % GRID_SIZE;
  const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  const list = [];
  for (const [dr, dc] of deltas) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr < 0 || nc < 0 || nr >= GRID_SIZE || nc >= GRID_SIZE) continue;
    list.push(nr * GRID_SIZE + nc);
  }
  return list;
}

function traverse(mode, grid) {
  const working = grid.map((cell) => ({ ...cell, visited: false, path: false }));
  const startIdx = 0;
  const goalIdx = working.length - 1;
  const visited = new Set();
  const cameFrom = new Map();
  const frontier = [startIdx];
  const t0 = performance.now();
  let ops = 0;
  while (frontier.length) {
    const current = mode === "bfs" ? frontier.shift() : frontier.pop();
    if (visited.has(current)) continue;
    visited.add(current);
    working[current].visited = true;
    ops++;
    if (current === goalIdx) break;
    for (const nb of neighbors(current)) {
      if (working[nb].wall || visited.has(nb)) continue;
      if (!cameFrom.has(nb)) cameFrom.set(nb, current);
      frontier.push(nb);
    }
  }
  const time = performance.now() - t0;
  const path = [];
  if (visited.has(goalIdx)) {
    let cur = goalIdx;
    while (cur !== startIdx) {
      path.push(cur);
      cur = cameFrom.get(cur);
      if (cur === undefined) break;
    }
    path.push(startIdx);
    path.reverse();
    path.forEach((idx) => (working[idx].path = true));
  }
  return { grid: working, ops, time, reached: visited.has(goalIdx), visited: visited.size, path: path.length };
}

function runPathSearch() {
  const baseGrid = buildGrid();
  const bfs = traverse("bfs", baseGrid);
  const dfs = traverse("dfs", baseGrid);
  state.grid = bfs.grid;
  renderGrid();
  drawStats(pathStats, [
    { label: "BFS", value: `${bfs.ops} кроків · ${bfs.time.toFixed(2)} мс` },
    { label: "DFS", value: `${dfs.ops} кроків · ${dfs.time.toFixed(2)} мс` },
    { label: "Шлях знайдено", value: bfs.reached ? "Так" : "Ні (BFS)" },
    { label: "Перешкоди", value: `${obstacleInput.value}%` },
  ]);
}

function reset() {
  sizeInput.value = 12;
  obstacleInput.value = 20;
  targetInput.value = 20;
  generateData(12);
  buildGrid();
  searchLog.innerHTML = "";
  sortStats.innerHTML = "";
  searchStats.innerHTML = "";
  pathStats.innerHTML = "";
}

document.getElementById("btn-randomize").addEventListener("click", () => {
  generateData(Number(sizeInput.value));
});

document.getElementById("btn-sort").addEventListener("click", animateSort);
document.getElementById("btn-search").addEventListener("click", runSearch);
document.getElementById("btn-path").addEventListener("click", runPathSearch);
document.getElementById("btn-reset").addEventListener("click", reset);

sizeInput.addEventListener("input", (e) => {
  generateData(Number(e.target.value));
});

obstacleInput.addEventListener("input", () => {
  buildGrid();
});

document.getElementById("cta-run").addEventListener("click", () => {
  document.getElementById("lab").scrollIntoView({ behavior: "smooth" });
});

function init() {
  generateData(Number(sizeInput.value));
  buildGrid();
}

init();
