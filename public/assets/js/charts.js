// charts.js — Chart.js initialization

window.initRevenueChart = function(labels, data) {
  const ctx = document.getElementById('revenueChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Pendapatan (Rp)',
        data,
        borderColor: '#124875',
        backgroundColor: 'rgba(18,72,117,0.08)',
        borderWidth: 2.5,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#124875',
        pointBorderColor: 'white',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#1A1A1A',
          bodyColor: '#6B7280',
          borderColor: '#E5E7EB',
          borderWidth: 1,
          padding: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          callbacks: {
            label: ctx => 'Rp ' + parseInt(ctx.parsed.y).toLocaleString('id-ID'),
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 11 }, color: '#9CA3AF' }
        },
        y: {
          grid: { color: '#F1F5F9', drawBorder: false },
          ticks: {
            font: { family: 'Inter', size: 11 },
            color: '#9CA3AF',
            callback: v => 'Rp ' + (v / 1000).toFixed(0) + 'k',
          }
        }
      }
    }
  });
};
