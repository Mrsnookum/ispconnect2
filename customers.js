document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // --- AUTHENTICATION & SHELL LOGIC ---
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

    // --- CUSTOM CONFIRM MODAL LOGIC ---
    const confirmModal = document.getElementById('confirmModal');
    let pendingConfirmCallback = null;

    function showCustomConfirm(title, message, btnText, btnColor, iconName, iconColor, bgLightColor, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        
        const acceptBtn = document.getElementById('acceptConfirmBtn');
        acceptBtn.textContent = btnText;
        acceptBtn.style.background = btnColor;
        
        const icon = document.getElementById('confirmIcon');
        icon.setAttribute('data-lucide', iconName);
        icon.style.color = iconColor;
        
        document.getElementById('confirmIconBg').style.background = bgLightColor;
        
        lucide.createIcons({ root: confirmModal });
        pendingConfirmCallback = callback;
        confirmModal.classList.add('active');
    }

    document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
        confirmModal.classList.remove('active');
        pendingConfirmCallback = null;
    });

    document.getElementById('acceptConfirmBtn').addEventListener('click', () => {
        confirmModal.classList.remove('active');
        if (pendingConfirmCallback) pendingConfirmCallback();
    });

    // --- CUSTOMERS LOGIC ---
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin';
    let allCustomers = [];
    let currentFilter = 'all';

    function formatDate(dateString) {
        if (!dateString) return "N/A";
        return new Date(dateString).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    async function loadCustomers() {
        try {
            const res = await fetch(`${API_BASE}/customers`);
            if (!res.ok) throw new Error("Failed to load customers");
            allCustomers = await res.json();
            updateKPIs(allCustomers);
            renderCustomers();
        } catch (err) {
            console.error(err);
            showToast("Failed to fetch customers.", "error");
        }
    }

    function updateKPIs(data) {
        let active = 0, inactive = 0, blocked = 0;
        data.forEach(c => {
            const stat = (c.status || '').toLowerCase();
            if (stat === 'active') active++;
            else if (stat === 'blocked') blocked++;
            else inactive++;
        });

        document.getElementById('kpi-total').textContent = data.length;
        document.getElementById('kpi-active').textContent = active;
        document.getElementById('kpi-inactive').textContent = inactive;
        document.getElementById('kpi-blocked').textContent = blocked;
    }

    function renderCustomers() {
        const tbody = document.getElementById('customers-tbody');
        const searchTerm = document.getElementById('searchCustomers').value.toLowerCase();
        
        const filteredData = allCustomers.filter(c => {
            const stat = (c.status || 'inactive').toLowerCase();
            if (currentFilter === 'active' && stat !== 'active') return false;
            if (currentFilter === 'blocked' && stat !== 'blocked') return false;
            
            const phone = (c.phone || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            return phone.includes(searchTerm) || name.includes(searchTerm);
        });

        tbody.innerHTML = filteredData.map(c => {
            const stat = (c.status || 'inactive').toLowerCase();
            const statusClass = stat === 'active' ? 'status-active' : stat === 'blocked' ? 'status-blocked' : 'status-inactive';
            const macDisplay = c.mac_address ? `<span class="code-pill">${c.mac_address}</span>` : `<span style="color:var(--text-muted); font-size:0.75rem;">None</span>`;
            const serialized = encodeURIComponent(JSON.stringify(c));

            return `
                <tr>
                    <td><div style="font-weight: 500; color: var(--text-dark);">${formatDate(c.created_at)}</div></td>
                    <td style="font-weight: 600;">${c.phone}</td>
                    <td>${c.name || '<span style="color:var(--text-muted); font-size:0.75rem;">Unknown</span>'}</td>
                    <td>${macDisplay}</td>
                    <td><span class="status-pill ${statusClass}"><div class="dot"></div> ${stat.toUpperCase()}</span></td>
                    <td style="text-align: right;">
                        <button class="action-btn" onclick="openCustomerModal('${serialized}')" title="Edit Profile">
                            <i data-lucide="edit-2" width="16"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteCustomer('${c.id}')" title="Delete">
                            <i data-lucide="trash-2" width="16"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        lucide.createIcons();
    }

    // Modal Control
    const customerModal = document.getElementById('customerModal');
    const form = document.getElementById('customerForm');
    
    window.openCustomerModal = function(encodedData) {
        const cust = JSON.parse(decodeURIComponent(encodedData));
        document.getElementById('custId').value = cust.id;
        document.getElementById('custPhone').value = cust.phone;
        document.getElementById('custName').value = cust.name || '';
        document.getElementById('custMac').value = cust.mac_address || '';
        document.getElementById('custStatus').value = (cust.status || 'inactive').toLowerCase();
        
        customerModal.classList.add('active');
    };

    document.getElementById('closeModalBtn').addEventListener('click', () => customerModal.classList.remove('active'));
    document.getElementById('cancelModalBtn').addEventListener('click', () => customerModal.classList.remove('active'));

    // Clear MAC Button
    document.getElementById('btnClearMac').addEventListener('click', () => {
        document.getElementById('custMac').value = '';
        showToast("MAC cleared locally. Click 'Save Profile' to apply.", "success");
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('saveCustomerBtn');
        saveBtn.textContent = "Saving...";
        saveBtn.disabled = true;

        const id = document.getElementById('custId').value;
        const payload = {
            name: document.getElementById('custName').value,
            mac_address: document.getElementById('custMac').value || null,
            status: document.getElementById('custStatus').value
        };

        try {
            const res = await fetch(`${API_BASE}/customers/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save customer");

            customerModal.classList.remove('active');
            showToast("Customer profile updated!", "success");
            loadCustomers();
        } catch (err) {
            console.error(err);
            showToast("Failed to update profile.", "error");
        } finally {
            saveBtn.textContent = "Save Profile";
            saveBtn.disabled = false;
        }
    });

    // Delete Customer
    window.deleteCustomer = function(id) {
        showCustomConfirm(
            "Delete Customer", 
            "Are you sure? This will remove them from the CRM. This action cannot be undone.", 
            "Yes, Delete", 
            "#EF4444", 
            "trash-2", 
            "#EF4444", 
            "#FEF2F2",
            async () => {
                try {
                    const res = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error("Failed to delete");
                    showToast("Customer deleted successfully.", "success");
                    loadCustomers(); 
                } catch(err) {
                    showToast("Failed to delete customer.", "error");
                }
            }
        );
    };

    // Filters and Search
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterBtns.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.getAttribute('data-filter');
            renderCustomers();
        });
    });
    document.getElementById('searchCustomers').addEventListener('input', renderCustomers);

    // Init
    loadCustomers();
});
