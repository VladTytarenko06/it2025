const searchContainer = document.getElementById('searchContainer');
const searchLog = document.getElementById('searchLog');
let searchArray = [];
let searchElements = [];

function initSearch() {
    searchContainer.innerHTML = '';
    searchArray = [];
    
    // Generate sorted array for demonstration of both
    for(let i=0; i<30; i++) {
        searchArray.push(Math.floor(i * 3 + Math.random() * 2));
    }
    
    searchArray.forEach((val, index) => {
        const box = document.createElement('div');
        box.classList.add('search-box');
        box.innerText = val;
        box.id = `s-box-${index}`;
        searchContainer.appendChild(box);
    });
    
    searchElements = document.querySelectorAll('.search-box');
    log('Масив ініціалізовано. Готовий до пошуку.', 'info');
}

function log(msg, type='info') {
    const entry = document.createElement('div');
    entry.classList.add('log-entry', `log-${type}`);
    entry.innerText = `[${new Date().toLocaleTimeString()}] ${msg}`;
    searchLog.prepend(entry);
}

async function startLinearSearch() {
    resetSearchVisuals();
    const target = parseInt(document.getElementById('targetValue').value);
    
    if (isNaN(target)) {
        log('ПОМИЛКА: Не вказано ціль!', 'error');
        return;
    }
    
    log(`Запуск лінійного пошуку цілі: ${target}`, 'info');
    
    for (let i = 0; i < searchArray.length; i++) {
        searchElements[i].classList.add('checked');
        await sleep(100);
        
        if (searchArray[i] === target) {
            searchElements[i].classList.remove('checked');
            searchElements[i].classList.add('found');
            log(`ЦІЛЬ ВИЯВЛЕНО на позиції [${i}]. Операцій: ${i+1}`, 'success');
            return;
        }
    }
    log(`Ціль ${target} не знайдено. Перевірено ${searchArray.length} об'єктів.`, 'info');
}

async function startBinarySearch() {
    resetSearchVisuals();
    const target = parseInt(document.getElementById('targetValue').value);
    
    if (isNaN(target)) {
        log('ПОМИЛКА: Не вказано ціль!', 'error');
        return;
    }
    
    log(`Запуск бінарного пошуку цілі: ${target}`, 'info');
    
    let low = 0;
    let high = searchArray.length - 1;
    let ops = 0;
    
    while (low <= high) {
        ops++;
        let mid = Math.floor((low + high) / 2);
        
        // Highlight range
        for(let k=low; k<=high; k++) {
            searchElements[k].style.borderColor = '#fff';
        }
        searchElements[mid].classList.add('checked');
        await sleep(500);
        
        if (searchArray[mid] === target) {
            searchElements[mid].classList.remove('checked');
            searchElements[mid].classList.add('found');
            log(`ЦІЛЬ ВИЯВЛЕНО на позиції [${mid}]. Операцій: ${ops}`, 'success');
            return;
        }
        
        if (searchArray[mid] < target) {
            // Eliminate left half
            for(let k=low; k<=mid; k++) searchElements[k].classList.add('eliminated');
            log(`Крок ${ops}: ${searchArray[mid]} < ${target}. Відсікаємо лівий сектор.`, 'info');
            low = mid + 1;
        } else {
            // Eliminate right half
            for(let k=mid; k<=high; k++) searchElements[k].classList.add('eliminated');
            log(`Крок ${ops}: ${searchArray[mid]} > ${target}. Відсікаємо правий сектор.`, 'info');
            high = mid - 1;
        }
    }
    
    log(`Ціль ${target} не знайдено. Операцій: ${ops}`, 'info');
}

function resetSearchVisuals() {
    searchElements.forEach(el => {
        el.className = 'search-box';
        el.style.borderColor = 'var(--primary)';
    });
}

// Init
initSearch();
