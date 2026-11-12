document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // --- 1. AUTHENTICATION CHECK ---
    const adminName = localStorage.getItem("adminName");
    if (!adminName) {
        window.location.href = '/register.html?view=login';
        return;
    }
    
    document.getElementById("navName").textContent = adminName;
    document.getElementById("navAvatar").textContent = adminName.substring(0, 2).toUpperCase();

    // --- 2. DROPDOWN & LOGOUT LOGIC ---
    const profileToggleBtn = document.getElementById("profileToggleBtn");
    const profileDropdown = document.getElementById("profileDropdown");

    profileToggleBtn.addEventListener("click", (e) => {
        e.stopPropagation(); 
        profileDropdown.classList.toggle("active");
    });

    document.addEventListener("click", (e) => {
        if (!profileToggleBtn.contains(e.target) && !profileDropdown.contains(e.target)) {
            profileDropdown.classList.remove("active");
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("adminName");
        window.location.href = '/register.html?view=login';
    });

    // --- 3. MOBILE SIDEBAR TOGGLE ---
    const sidebar = document.getElementById("sidebar");
    const mobileOverlay = document.getElementById("mobileOverlay");
    const mobileToggle = document.getElementById("mobileToggle");

    function toggleSidebar() {
        sidebar.classList.toggle("open");
        mobileOverlay.classList.toggle("active");
    }
    
    mobileToggle.addEventListener("click", toggleSidebar);
    mobileOverlay.addEventListener("click", toggleSidebar);

    // --- 4. TOAST NOTIFICATION SYSTEM ---
    function showToast(message, type = "error") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        
        const icon = type === "error" ? "alert-circle" : "check-circle";
        toast.innerHTML = `<i data-lucide="${icon}" width="18"></i> <span>${message}</span>`;
        
        container.appendChild(toast);
        lucide.createIcons({ root: toast });
        
        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- 5. CHART SETUP ---
    let mainChart;
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.12)');
    gradient.addColorStop(1, 'rgba(0, 123, 255, 0)');

    function initOrUpdateChart(labels, dataPoints) {
        if (mainChart) {
            mainChart.data.labels = labels;
            mainChart.data.datasets[0].data = dataPoints;
            mainChart.update();
            return;
        }

        mainChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue',
                    data: dataPoints,
                    borderColor: '#007BFF',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderColor: '#007BFF',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#FFFFFF', titleColor: '#94A3B8', bodyColor: '#1E293B',
                        borderColor: '#E2E8F0', borderWidth: 1, padding: 10, displayColors: false,
                        callbacks: { label: (c) => 'KSh ' + c.parsed.y.toLocaleString() }
                    }
                },
                scales: {
                    x: { grid: { display: false, drawBorder: false }, ticks: { color: '#94A3B8', padding: 10 } },
                    y: { border: { display: false }, grid: { color: '#F1F5F9' }, ticks: { color: '#94A3B8', padding: 15, callback: (v) => v === 0 ? 'KSh 0' : 'KSh ' + (v/1000) + 'k' }, min: 0 }
                }
            }
        });
    }

    // --- 6. DATA ENGINE & FETCH ---
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin';
    const sparklineInstances = {}; // Track sparkline charts so we can destroy them on update

    function updateKPI(id, dataArray, formatAsCurrency = false) {
        if (!dataArray || dataArray.length < 2) return;
        const current = dataArray[dataArray.length - 1];
        const previous = dataArray[dataArray.length - 2];
        const diff = current - previous;
        const percent = previous === 0 ? 100 : Math.abs((diff / previous) * 100).toFixed(1);
        
        document.getElementById(`val-${id}`).textContent = formatAsCurrency ? `KSh ${current.toLocaleString()}` : current.toLocaleString();
        
        const badge = document.getElementById(`badge-${id}`);
        const icon = document.getElementById(`icon-${id}`);
        document.getElementById(`pct-${id}`).textContent = `${percent}%`;

        if (diff >= 0) {
            badge.className = "trend-badge trend-up";
            icon.setAttribute("data-lucide", "arrow-up-right");
        } else {
            badge.className = "trend-badge trend-down";
            icon.setAttribute("data-lucide", "arrow-down-right");
        }
    }

    function drawSparkline(canvasId, dataArray, color) {
        // Fix: Destroy existing chart on this canvas before drawing a new one
        if (sparklineInstances[canvasId]) {
            sparklineInstances[canvasId].destroy();
        }
        
        sparklineInstances[canvasId] = new Chart(document.getElementById(canvasId).getContext('2d'), {
            type: 'line',
            data: { labels: dataArray.map((_, i) => i), datasets: [{ data: dataArray, borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.4 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, animation: false }
        });
    }

    function renderTables(payments, packages) {
        const tbodyPay = document.getElementById('table-payments');
        tbodyPay.innerHTML = payments.map(p => {
            const stat = p.status.toLowerCase();
            const statusClass = (stat === 'success' || stat === 'completed') ? 'status-success' 
                              : stat === 'pending' ? 'status-pending' 
                              : 'status-failed';
            
            const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
            return `
                <tr>
                    <td><div class="customer-cell"><div class="avatar-sm">${initial}</div> ${p.name || 'Unknown'}</div></td>
                    <td>KSh ${p.amount.toLocaleString()}</td>
                    <td><span class="status-pill ${statusClass}"><div class="dot"></div> ${p.status}</span></td>
                </tr>
            `;
        }).join('');

        const tbodyPack = document.getElementById('table-packages');
        tbodyPack.innerHTML = packages.map(p => `
            <tr>
                <td><div class="customer-cell"><i data-lucide="clock" width="14" color="#94A3B8"></i> ${p.name}</div></td>
                <td>${p.count}</td>
                <td>
                    <div class="progress-wrapper">
                        <div class="progress-track"><div class="progress-fill" style="width: ${p.percent}%;"></div></div>
                        <div class="progress-text">KSh ${p.revenue.toLocaleString()} (${p.percent}%)</div>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function loadDashboardData(period) {
        try {
            const res = await fetch(`${API_BASE}/dashboard-stats?period=${period}`);
            if (!res.ok) throw new Error("Failed to fetch dashboard data.");
            
            const data = await res.json();

            updateKPI("revenue", data.revenue.trend, true);
            drawSparkline("spark-revenue", data.revenue.trend, "#00B37E");

            updateKPI("customers", data.customers.trend);
            drawSparkline("spark-customers", data.customers.trend, "#007BFF");

            updateKPI("online", data.online.trend);
            drawSparkline("spark-online", data.online.trend, "#8B5CF6");

            updateKPI("sessions", data.sessions.trend);
            drawSparkline("spark-sessions", data.sessions.trend, "#007BFF");

            initOrUpdateChart(data.chart.labels, data.chart.data);
            renderTables(data.recent_payments, data.packages);

            if (data.router) {
                // I removed the hardcoded "Uptime: " and "Users: " prefixes here because 
                // the updated dashboard.py now sends exactly formatted strings (e.g., "76 Users", "1 / 1 Online")
                document.getElementById('router-uptime').textContent = data.router.main_uptime;
                document.getElementById('hotspot-users').textContent = data.router.hotspot_active;
                document.getElementById('radius-uptime').textContent = data.router.radius_uptime;
            }

            lucide.createIcons();

        } catch (err) {
            console.error(err);
            showToast("Cannot connect to backend. Showing zero-state data.");
        }
    }

    const toggles = document.querySelectorAll('.toggles button');
    toggles.forEach(btn => {
        btn.addEventListener('click', (e) => {
            toggles.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const period = e.target.getAttribute('data-period');
            loadDashboardData(period);
        });
    });

    loadDashboardData('7D');
});
