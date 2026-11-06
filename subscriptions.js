document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // --- AUTHENTICATION LOGIC ---
    const adminName = localStorage.getItem("adminName");
    if (!adminName) {
        window.location.href = '/register.html?view=login';
        return;
    }
    document.getElementById("navName").textContent = adminName;
    document.getElementById("navAvatar").textContent = adminName.substring(0, 2).toUpperCase();

    document.getElementById("profileToggleBtn").addEventListener("click", (e) => {
        e.stopPropagation(); 
        document.getElementById("profileDropdown").classList.toggle("active");
    });
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.profile-dropdown-container')) {
            document.getElementById("profileDropdown").classList.remove("active");
        }
    });
    document.getElementById("logoutBtn").addEventListener("click", () => {
        localStorage.removeItem("adminName");
        window.location.href = '/register.html?view=login';
    });

    const sidebar = document.getElementById("sidebar");
    const mobileOverlay = document.getElementById("mobileOverlay");
    document.getElementById("mobileToggle").addEventListener("click", () => {
        sidebar.classList.toggle("open");
        mobileOverlay.classList.toggle("active");
    });
    mobileOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        mobileOverlay.classList.remove("active");
    });

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

    // --- CONFIRM MODAL ---
    const confirmModal = document.getElementById('confirmModal');
    let pendingConfirmCallback = null;

    function showCustomConfirm(title, message, btnText, btnColor, iconName, iconColor, bgLightColor, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('acceptConfirmBtn').textContent = btnText;
        document.getElementById('acceptConfirmBtn').style.background = btnColor;
        
        const icon = document.getElementById('confirmIcon');
        icon.setAttribute('data-lucide', iconName);
        icon.style.color = iconColor;
        document.getElementById('confirmIconBg').style.background = bgLightColor;
        
        lucide.createIcons({ root: confirmModal });
        pendingConfirmCallback = callback;
        confirmModal.classList.add('active');
    }

    document.getElementById('cancelConfirmBtn').addEventListener('click', () => confirmModal.classList.remove('active'));
    document.getElementById('acceptConfirmBtn').addEventListener('click', () => {
        confirmModal.classList.remove('active');
        if (pendingConfirmCallback) pendingConfirmCallback();
    });

    // --- SUBSCRIPTIONS LOGIC ---
    const API_BASE = 'https://ispconnect-backend.onrender.com/api/admin';
    let allSubs = [];
    let currentFilter = 'active';

    function formatDate(dateString) {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleString('en-KE', { 
            month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
        });
    }

    function checkStatus(sub) {
        // If manually revoked, it's revoked.
        if (sub.status === 'revoked') return 'revoked';
        
        // Auto-calculate expired based on current time
        const now = new Date();
        const expires = new Date(sub.expires_at);
        if (now >= expires) return 'expired';
        
        return 'active';
    }

    async function loadSubscriptions() {
        try {
            const res = await fetch(`${API_BASE}/subscriptions`);
            if (!res.ok) throw new Error("Failed");
            allSubs = await res.json();
            
            // Normalize status based on time immediately
            allSubs.forEach(s => s.computed_status = checkStatus(s));
            
            updateKPIs(allSubs);
            renderSubs();
        } catch (err) {
            console.error(err);
            showToast("Failed to fetch subscriptions.", "error");
        }
    }

    function updateKPIs(data) {
        let active = 0, expired = 0, expiringToday = 0;
        const today = new Date().toDateString();

        data.forEach(s => {
            if (s.computed_status === 'active') {
                active++;
                // Check if expires today
                if (new Date(s.expires_at).toDateString() === today) expiringToday++;
            } else {
                expired++;
            }
        });

        document.getElementById('kpi-active').textContent = active;
        document.getElementById('kpi-expiring').textContent = expiringToday;
        document.getElementById('kpi-expired').textContent = expired;
    }

    function renderSubs() {
        const tbody = document.getElementById('subscriptions-tbody');
        const searchTerm = document.getElementById('searchSubscriptions').value.toLowerCase();
        
        const filteredData = allSubs.filter(s => {
            if (currentFilter === 'active' && s.computed_status !== 'active') return false;
            if (currentFilter === 'expired' && s.computed_status === 'active') return false;
            
            const cust = s.customers ? (s.customers.phone + s.customers.name).toLowerCase() : '';
            const vouch = (s.voucher_code || '').toLowerCase();
            return cust.includes(searchTerm) || vouch.includes(searchTerm);
        });

        tbody.innerHTML = filteredData.map(s => {
            const statusClass = s.computed_status === 'active' ? 'status-active' : 
                                s.computed_status === 'revoked' ? 'status-revoked' : 'status-expired';
            
            const customerName = s.customers ? s.customers.name || 'Unknown' : 'Unknown';
            const customerPhone = s.customers ? s.customers.phone : 'No Phone';
            const packageName = s.packages ? s.packages.name : 'Unknown Package';
            const vouch = s.voucher_code ? `<span class="code-pill">${s.voucher_code}</span>` : 'N/A';
            
            let actions = '';
            if (s.computed_status === 'active') {
                actions = `
                    <button class="action-btn" onclick="openExtendModal('${s.id}')" title="Add Time"><i data-lucide="clock" width="16"></i></button>
                    <button class="action-btn delete" onclick="revokeSub('${s.id}')" title="Revoke"><i data-lucide="x-circle" width="16"></i></button>
                `;
            } else {
                actions = `<span style="font-size: 0.75rem; color: var(--text-muted);">Ended</span>`;
            }

            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-dark);">${customerPhone}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">${customerName}</div>
                    </td>
                    <td>${vouch}</td>
                    <td style="font-size: 0.75rem; color: var(--text-muted);">${packageName}</td>
                    <td style="font-weight: 500;">${formatDate(s.expires_at)}</td>
                    <td><span class="status-pill ${statusClass}"><div class="dot"></div> ${s.computed_status.toUpperCase()}</span></td>
                    <td style="text-align: right;">${actions}</td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    }

    // Filters
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderSubs();
        });
    });
    document.getElementById('searchSubscriptions').addEventListener('input', renderSubs);

    // --- ACTIONS ---
    window.revokeSub = function(id) {
        showCustomConfirm(
            "Revoke Access", 
            "Are you sure you want to kill this active session? They will lose internet instantly.", 
            "Yes, Revoke", 
            "#EF4444", "x-circle", "#EF4444", "#FEF2F2",
            async () => {
                try {
                    const res = await fetch(`${API_BASE}/subscriptions/${id}/revoke`, { method: 'PATCH' });
                    if (!res.ok) throw new Error("Failed");
                    showToast("Access revoked.", "success");
                    loadSubscriptions(); 
                } catch(err) {
                    showToast("Failed to revoke.", "error");
                }
            }
        );
    };

    // Extend Modal
    const extendModal = document.getElementById('extendModal');
    window.openExtendModal = function(id) {
        document.getElementById('extSubId').value = id;
        document.getElementById('extHours').value = '';
        extendModal.classList.add('active');
    };
    
    document.getElementById('closeExtendBtn').addEventListener('click', () => extendModal.classList.remove('active'));
    document.getElementById('cancelExtendBtn').addEventListener('click', () => extendModal.classList.remove('active'));

    document.getElementById('extendForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('saveExtendBtn');
        btn.textContent = "Adding..."; btn.disabled = true;

        const id = document.getElementById('extSubId').value;
        const hours = parseInt(document.getElementById('extHours').value);

        try {
            const res = await fetch(`${API_BASE}/subscriptions/${id}/extend`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ add_hours: hours })
            });

            if (!res.ok) throw new Error("Failed");
            
            extendModal.classList.remove('active');
            showToast(`${hours} hours added successfully!`, "success");
            loadSubscriptions();
        } catch (err) {
            console.error(err);
            showToast("Failed to extend time.", "error");
        } finally {
            btn.textContent = "Add Time"; btn.disabled = false;
        }
    });

    // Init
    loadSubscriptions();
});