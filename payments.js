document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Icons
    lucide.createIcons();
    
    // --- 2. AUTHENTICATION & SHELL LOGIC ---
    const adminName = localStorage.getItem("adminName");
    if (!adminName) {
        window.location.href = '/register.html?view=login';
        return;
    }
    
    document.getElementById("navName").textContent = adminName;
    document.getElementById("navAvatar").textContent = adminName.substring(0, 2).toUpperCase();

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

    const sidebar = document.getElementById("sidebar");
    const mobileOverlay = document.getElementById("mobileOverlay");
    const mobileToggle = document.getElementById("mobileToggle");

    function toggleSidebar() {
        sidebar.classList.toggle("open");
        mobileOverlay.classList.toggle("active");
    }
    
    mobileToggle.addEventListener("click", toggleSidebar);
    mobileOverlay.addEventListener("click", toggleSidebar);

    window.showToast = function(message, type = "error") {
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

    // --- 3. PAYMENTS LEDGER LOGIC ---
    const API_BASE = 'https://ispconnect-backend.onrender.com/api/admin';
    let allPayments = [];
    let currentFilter = 'all';

    // Formatters
    function formatDate(dateString) {
        if (!dateString) return "N/A";
        const date = new Date(dateString);
        return date.toLocaleString('en-KE', { 
            month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit'
        });
    }

    // Fetch and Render
    async function loadPayments() {
        try {
            // We will build this endpoint next!
            const res = await fetch(`${API_BASE}/payments-ledger`);
            if (!res.ok) throw new Error("Failed to load payments");
            allPayments = await res.json();
            
            updateKPIs(allPayments);
            renderPayments();
        } catch (err) {
            console.error(err);
            showToast("Failed to fetch payments from database.", "error");
        }
    }

    function updateKPIs(data) {
        let revenue = 0;
        let completed = 0;
        let failed = 0;
        let smsSent = 0;

        data.forEach(p => {
            if (p.status.toLowerCase() === 'completed') {
                revenue += p.amount;
                completed++;
            } else {
                failed++;
            }
            if (p.sms_sent) smsSent++;
        });

        document.getElementById('kpi-revenue').textContent = `KSh ${revenue.toLocaleString()}`;
        document.getElementById('kpi-transactions').textContent = data.length;
        document.getElementById('kpi-failed').textContent = failed;
        
        const smsPercent = completed > 0 ? Math.round((smsSent / completed) * 100) : 0;
        document.getElementById('kpi-sms').textContent = `${smsPercent}%`;
    }

    function renderPayments() {
        const tbody = document.getElementById('payments-tbody');
        const searchTerm = document.getElementById('searchPayments').value.toLowerCase();
        
        const filteredData = allPayments.filter(p => {
            // 1. Apply Status Filter Tab
            const stat = p.status.toLowerCase();
            if (currentFilter === 'completed' && stat !== 'completed') return false;
            if (currentFilter === 'failed' && stat === 'completed') return false;
            
            // 2. Apply Text Search (M-Pesa, Phone, or Voucher)
            const mpesa = (p.mpesa_receipt_number || '').toLowerCase();
            const phone = (p.phone || '').toLowerCase();
            const voucher = (p.voucher_code || '').toLowerCase();
            
            return mpesa.includes(searchTerm) || phone.includes(searchTerm) || voucher.includes(searchTerm);
        });

        tbody.innerHTML = filteredData.map(p => {
            const stat = p.status.toLowerCase();
            const statusClass = stat === 'completed' ? 'status-success' : stat === 'pending' ? 'status-pending' : 'status-failed';
            
            // Highlight Missing Vouchers or Codes
            const mpesaDisplay = p.mpesa_receipt_number ? `<span class="code-pill">${p.mpesa_receipt_number}</span>` : `<span style="color:var(--text-muted); font-size:0.75rem;">Pending</span>`;
            const voucherDisplay = p.voucher_code ? `<span class="code-pill" style="color:var(--primary); border-color:var(--primary-light); background:var(--primary-light);">${p.voucher_code}</span>` : `<span style="color:var(--text-muted); font-size:0.75rem;">None</span>`;

            return `
                <tr>
                    <td>
                        <div style="font-weight: 500; color: var(--text-dark);">${formatDate(p.created_at)}</div>
                    </td>
                    <td style="font-weight: 600;">${p.phone || 'Unknown'}</td>
                    <td>${mpesaDisplay}</td>
                    <td>${voucherDisplay}</td>
                    <td style="font-weight: 600;">KSh ${p.amount.toLocaleString()}</td>
                    <td><span class="status-pill ${statusClass}"><div class="dot"></div> ${p.status.toUpperCase()}</span></td>
                    <td style="text-align: right;">
                        <button class="action-btn" onclick="copyText('${p.voucher_code || ''}')" title="Copy Voucher">
                            <i data-lucide="copy" width="16"></i>
                        </button>
                        <button class="action-btn" onclick="resendSMS('${p.id}')" title="Resend SMS">
                            <i data-lucide="message-square" width="16"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    }

    // Helper functions for Table Actions
    window.copyText = function(text) {
        if (!text) {
            showToast("No voucher code available to copy.", "error");
            return;
        }
        navigator.clipboard.writeText(text).then(() => {
            showToast(`Voucher ${text} copied to clipboard!`, "success");
        });
    };

    window.resendSMS = function(id) {
        // In the future, this will hit a backend route to trigger Brightscale
        showToast("SMS resend triggered. Feature coming soon!", "success");
    };

    // Filter Listeners
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderPayments();
        });
    });

    // Search Listener
    document.getElementById('searchPayments').addEventListener('input', renderPayments);

    // Initial Load
    loadPayments();
});