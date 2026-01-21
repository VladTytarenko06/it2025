document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    startClock();
    initComplexityChart();
});

function initNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active classes
            buttons.forEach(b => b.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Add active class
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

function startClock() {
    setInterval(() => {
        const now = new Date();
        document.getElementById('clock').innerText = now.toLocaleTimeString('uk-UA');
    }, 1000);
}

function initComplexityChart() {
    const ctx = document.getElementById('complexityChart').getContext('2d');
    
    // Generate data points
    const labels = Array.from({length: 20}, (_, i) => i + 1);
    
    // Functions
    const o1 = labels.map(() => 1);
    const oLogN = labels.map(n => Math.log2(n));
    const oN = labels.map(n => n);
    const oNLogN = labels.map(n => n * Math.log2(n));
    const oN2 = labels.map(n => n * n);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'O(1) - Константна',
                    data: o1,
                    borderColor: '#22c55e',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'O(log n)',
                    data: oLogN,
                    borderColor: '#84cc16',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'O(n)',
                    data: oN,
                    borderColor: '#eab308',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'O(n log n)',
                    data: oNLogN,
                    borderColor: '#f97316',
                    borderWidth: 2,
                    tension: 0.4
                },
                {
                    label: 'O(n^2)',
                    data: oN2,
                    borderColor: '#ef4444',
                    borderWidth: 2,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8' },
                    max: 100 // Cap to keep graph readable
                },
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.1)' },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#e2e8f0', font: { family: 'Share Tech Mono' } }
                }
            }
        }
    });
}
