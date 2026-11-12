document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // --- AUTHENTICATION & UI ---
    const adminName = localStorage.getItem("adminName");
    if (!adminName) window.location.href = '/register.html?view=login';
    document.getElementById("navName").textContent = adminName;
    document.getElementById("navAvatar").textContent = adminName.substring(0, 2).toUpperCase();

    document.getElementById("profileToggleBtn").addEventListener("click", (e) => {
        e.stopPropagation(); document.getElementById("profileDropdown").classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.profile-dropdown-container')) document.getElementById("profileDropdown").classList.remove("active");
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("adminName"); window.location.href = '/register.html?view=login';
    });

    const sidebar = document.getElementById("sidebar");
    const mobileOverlay = document.getElementById("mobileOverlay");
    document.getElementById("mobileToggle").addEventListener("click", () => {
        sidebar.classList.toggle("open"); mobileOverlay.classList.toggle("active");
    });
    mobileOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open"); mobileOverlay.classList.remove("active");
    });

    function showToast(message, type = "error") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        const icon = type === "error" ? "alert-circle" : "check-circle";
        toast.innerHTML = `<i data-lucide="${icon}" width="18"></i> <span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons({ root: toast });
        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // --- DATE PICKER SETUP ---
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setDate(today.getDate() - 30);
    
    document.getElementById('endDate').value = today.toISOString().split('T')[0];
    document.getElementById('startDate').value = lastMonth.toISOString().split('T')[0];

    // --- REPORT ENGINE ---
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin';
    let currentChart = null;

    document.getElementById('generateBtn').addEventListener('click', async () => {
        const type = document.getElementById('reportType').value;
        const start = document.getElementById('startDate').value;
        const end = document.getElementById('endDate').value;
        const btn = document.getElementById('generateBtn');

        if (!start || !end) return showToast("Select a valid date range.");
        if (new Date(start) > new Date(end)) return showToast("Start date cannot be after end date.");

        btn.disabled = true; btn.innerHTML = `<i data-lucide="loader" width="16" class="spin"></i> Generating...`;
        lucide.createIcons();

        try {
            const res = await fetch(`${API_BASE}/reports?type=${type}&start=${start}&end=${end}`);
            if (!res.ok) throw new Error("Failed to generate");
            const data = await res.json();
            
            renderReport(type, data);
            
            document.getElementById('resultsContainer').style.display = 'flex';
            document.getElementById('exportBtn').disabled = false;
            showToast("Report generated successfully", "success");
        } catch (err) {
            console.error(err);
            showToast("Failed to fetch report data from server.");
        } finally {
            btn.disabled = false; btn.innerHTML = `<i data-lucide="zap" width="16"></i> Generate`;
            lucide.createIcons();
        }
    });

    function formatCurrency(val) { return `KSh ${Number(val).toLocaleString()}`; }
    function formatBytes(bytes) {
        const mb = bytes / (1024 * 1024);
        return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(1) + ' MB';
    }

    function renderReport(type, data) {
        const kpiDiv = document.getElementById('kpiContainer');
        const thead = document.getElementById('tableHead');
        const tbody = document.getElementById('tableBody');
        const ctx = document.getElementById('reportChart').getContext('2d');
        
        if (currentChart) currentChart.destroy();
        kpiDiv.innerHTML = ''; thead.innerHTML = ''; tbody.innerHTML = '';

        if (type === 'financial') {
            // KPIs
            kpiDiv.innerHTML = `
                <div class="card"><div class="kpi-label">Gross Revenue</div><div class="kpi-val" style="color:var(--primary)">${formatCurrency(data.summary.total_revenue)}</div></div>
                <div class="card"><div class="kpi-label">Transactions</div><div class="kpi-val">${data.summary.total_transactions}</div></div>
                <div class="card"><div class="kpi-label">Avg Transaction</div><div class="kpi-val">${formatCurrency(data.summary.avg_transaction)}</div></div>
            `;
            // Table
            thead.innerHTML = `<tr><th>Date</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Method</th></tr>`;
            tbody.innerHTML = data.table.map(r => `<tr><td>${r.date}</td><td>${r.customer}</td><td>${r.phone}</td><td style="font-weight:600">${formatCurrency(r.amount)}</td><td>${r.method}</td></tr>`).join('');
            // Chart
            document.getElementById('chartTitle').textContent = "Revenue Trend";
            currentChart = new Chart(ctx, {
                type: 'line', data: { labels: data.chart.labels, datasets: [{ label: 'Revenue (KSh)', data: data.chart.data, borderColor: '#00B37E', backgroundColor: 'rgba(0,179,126,0.1)', fill: true, tension: 0.3 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

        } else if (type === 'packages') {
            kpiDiv.innerHTML = `
                <div class="card"><div class="kpi-label">Total Packages Sold</div><div class="kpi-val">${data.summary.total_sold}</div></div>
                <div class="card"><div class="kpi-label">Top Seller (Vol)</div><div class="kpi-val" style="font-size:1.2rem; margin-top:8px">${data.summary.top_package_vol}</div></div>
            `;
            thead.innerHTML = `<tr><th>Package Name</th><th>Units Sold</th><th>Revenue Generated</th></tr>`;
            tbody.innerHTML = data.table.map(r => `<tr><td>${r.name}</td><td>${r.count}</td><td style="font-weight:600">${formatCurrency(r.revenue)}</td></tr>`).join('');
            document.getElementById('chartTitle').textContent = "Sales Volume by Package";
            currentChart = new Chart(ctx, {
                type: 'bar', data: { labels: data.chart.labels, datasets: [{ label: 'Units Sold', data: data.chart.data, backgroundColor: '#007BFF', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });

        } else if (type === 'bandwidth') {
            kpiDiv.innerHTML = `
                <div class="card"><div class="kpi-label">Total Download</div><div class="kpi-val" style="color:var(--blue)">${formatBytes(data.summary.total_down)}</div></div>
                <div class="card"><div class="kpi-label">Total Upload</div><div class="kpi-val" style="color:var(--purple)">${formatBytes(data.summary.total_up)}</div></div>
            `;
            thead.innerHTML = `<tr><th>Username / Voucher</th><th>MAC Address</th><th>Download</th><th>Upload</th></tr>`;
            tbody.innerHTML = data.table.map(r => `<tr><td><span class="code-pill" style="font-family:monospace; background:#E6F2FF; color:#007BFF; padding:4px 8px; border-radius:4px">${r.username}</span></td><td>${r.mac}</td><td>${formatBytes(r.down)}</td><td>${formatBytes(r.up)}</td></tr>`).join('');
            document.getElementById('chartTitle').textContent = "Top Data Consumers (Download)";
            currentChart = new Chart(ctx, {
                type: 'bar', data: { labels: data.chart.labels, datasets: [{ label: 'Download (Bytes)', data: data.chart.data, backgroundColor: '#8B5CF6', borderRadius: 4 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        } else if (type === 'customers') {
            kpiDiv.innerHTML = `<div class="card"><div class="kpi-label">New Customers in Period</div><div class="kpi-val">${data.summary.new_customers}</div></div>`;
            thead.innerHTML = `<tr><th>Date Joined</th><th>Name</th><th>Phone</th></tr>`;
            tbody.innerHTML = data.table.map(r => `<tr><td>${r.date}</td><td>${r.name}</td><td>${r.phone}</td></tr>`).join('');
            document.getElementById('chartTitle').textContent = "Acquisition Trend";
            currentChart = new Chart(ctx, {
                type: 'line', data: { labels: data.chart.labels, datasets: [{ label: 'New Signups', data: data.chart.data, borderColor: '#1E293B', tension: 0.3 }] },
                options: { responsive: true, maintainAspectRatio: false }
            });
        }
    }

    // --- CSV EXPORT (Popup-Free) ---
    document.getElementById('exportBtn').addEventListener('click', () => {
        const table = document.getElementById("reportTable");
        let csvContent = "";
        
        for (let row of table.rows) {
            let rowData = [];
            for (let cell of row.cells) {
                let text = cell.innerText.replace(/"/g, '""');
                rowData.push(`"${text}"`);
            }
            csvContent += rowData.join(",") + "\n";
        }
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `ISPConnect_Report_${document.getElementById('reportType').value}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});