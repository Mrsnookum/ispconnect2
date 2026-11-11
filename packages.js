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

    // --- 3. CUSTOM CONFIRM MODAL LOGIC ---
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

    // --- 4. PACKAGES PAGE LOGIC ---
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin';
    let currentPackages = [];

    // Formatters
    function formatDuration(seconds) {
        if (!seconds) return "Unlimited";
        const minutes = seconds / 60;
        if (minutes < 60) return `${Math.round(minutes)} Minutes`;
        const hours = minutes / 60;
        if (hours < 24) return `${Math.round(hours)} Hour${hours > 1 ? 's' : ''}`;
        const days = hours / 24;
        return `${Math.round(days)} Day${days > 1 ? 's' : ''}`; // Fixed the weird decimal issue!
    }

    function formatSpeed(kbps) {
        if (!kbps || kbps === 0) return "Unlimited";
        if (kbps >= 1024) return `${(kbps / 1024).toFixed(0)}M`;
        return `${kbps}K`;
    }

    // Package Modal Control
    const packageModal = document.getElementById('packageModal');
    const form = document.getElementById('packageForm');
    
    window.openModal = function(pkg = null) {
        form.reset();
        if (pkg) {
            document.getElementById('modalTitle').textContent = 'Edit Package';
            document.getElementById('pkgId').value = pkg.id;
            document.getElementById('pkgName').value = pkg.name;
            document.getElementById('pkgType').value = pkg.type;
            document.getElementById('pkgStatus').value = pkg.is_active;
            document.getElementById('pkgPrice').value = pkg.price;
            document.getElementById('pkgDuration').value = pkg.duration_seconds / 60; 
            document.getElementById('pkgDownload').value = pkg.speed_download_kbps;
            document.getElementById('pkgUpload').value = pkg.speed_upload_kbps;
            document.getElementById('pkgDevices').value = pkg.devices;
        } else {
            document.getElementById('modalTitle').textContent = 'Create a package';
            document.getElementById('pkgId').value = '';
        }
        packageModal.classList.add('active');
    }

    window.closeModal = function() {
        packageModal.classList.remove('active');
    }

    document.getElementById('btnNewPackage').addEventListener('click', () => openModal());
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelModalBtn').addEventListener('click', closeModal);

    // Fetch and Render
    async function loadPackages() {
        try {
            const res = await fetch(`${API_BASE}/packages`);
            if (!res.ok) throw new Error("Failed to load packages");
            currentPackages = await res.json();
            renderPackages(currentPackages);
        } catch (err) {
            console.error(err);
            showToast("Failed to fetch packages from database.", "error");
        }
    }

    function renderPackages(data) {
        const tbody = document.getElementById('packages-tbody');
        let activeCount = 0;

        tbody.innerHTML = data.map(p => {
            if (p.is_active) activeCount++;
            
            const statusClass = p.is_active ? 'status-success' : 'status-failed';
            const statusText = p.is_active ? 'LIVE' : 'HIDDEN';
            const speedString = `${formatSpeed(p.speed_upload_kbps)}/${formatSpeed(p.speed_download_kbps)}`;
            const durationString = formatDuration(p.duration_seconds);
            const serialized = encodeURIComponent(JSON.stringify(p));

            return `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-dark);">${p.name}</div>
                        <div style="font-size: 0.7rem; color: var(--text-muted);">${durationString}</div>
                    </td>
                    <td><span style="background: #E2E8F0; padding: 4px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; color: var(--text-muted);">${p.type}</span></td>
                    <td style="font-weight: 500;">KSh ${p.price.toLocaleString()}</td>
                    <td style="color: var(--text-muted); font-size: 0.75rem;">${speedString}</td>
                    <td><span class="status-pill ${statusClass}"><div class="dot"></div> ${statusText}</span></td>
                    <td style="text-align: right;">
                        <button class="action-btn" onclick="editPackage('${serialized}')" title="Edit"><i data-lucide="edit-2" width="16"></i></button>
                        <button class="action-btn" onclick="togglePackageStatus('${p.id}', ${p.is_active})" title="${p.is_active ? 'Hide' : 'Publish'}">
                            <i data-lucide="${p.is_active ? 'eye-off' : 'eye'}" width="16"></i>
                        </button>
                        <button class="action-btn delete" onclick="deletePackage('${p.id}')" title="Delete"><i data-lucide="trash-2" width="16"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        document.getElementById('kpi-all').textContent = data.length;
        document.getElementById('kpi-active').textContent = activeCount;
        document.getElementById('kpi-hidden').textContent = data.length - activeCount;
        document.getElementById('kpi-subs').textContent = "0"; // Hardcoded to 0 for now!

        lucide.createIcons();
    }

    // Table Actions using the Custom Confirm Modal
    window.editPackage = function(encodedData) {
        const pkg = JSON.parse(decodeURIComponent(encodedData));
        openModal(pkg);
    };

    window.togglePackageStatus = function(id, currentStatus) {
        const newStatus = !currentStatus;
        const actionWord = currentStatus ? "Hide" : "Publish";
        const iconColor = currentStatus ? "#F59E0B" : "#00B37E";
        const bgLightColor = currentStatus ? "#FEF3C7" : "#E6F7F2";
        
        showCustomConfirm(
            `${actionWord} Package`, 
            `Are you sure you want to ${actionWord.toLowerCase()} this package?`, 
            `Yes, ${actionWord}`, 
            iconColor, 
            currentStatus ? 'eye-off' : 'eye', 
            iconColor, 
            bgLightColor,
            async () => {
                try {
                    const res = await fetch(`${API_BASE}/packages/${id}/status?is_active=${newStatus}`, { method: 'PATCH' });
                    if (!res.ok) throw new Error("Failed to update status");
                    showToast(`Package status updated.`, "success");
                    loadPackages(); 
                } catch(err) {
                    showToast("Failed to update package status.", "error");
                }
            }
        );
    };

    window.deletePackage = function(id) {
        showCustomConfirm(
            "Delete Package", 
            "Are you sure you want to delete this package? This action cannot be undone.", 
            "Yes, Delete", 
            "#EF4444", 
            "trash-2", 
            "#EF4444", 
            "#FEF2F2",
            async () => {
                try {
                    const res = await fetch(`${API_BASE}/packages/${id}`, { method: 'DELETE' });
                    if (!res.ok) throw new Error("Failed to delete");
                    showToast("Package deleted successfully.", "success");
                    loadPackages(); 
                } catch(err) {
                    showToast("Failed to delete package.", "error");
                }
            }
        );
    };

    // Form Submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const saveBtn = document.getElementById('savePackageBtn');
        if(saveBtn) {
            saveBtn.textContent = "Saving...";
            saveBtn.disabled = true;
        }

        const payload = {
            id: document.getElementById('pkgId').value || null,
            name: document.getElementById('pkgName').value,
            type: document.getElementById('pkgType').value,
            price: parseFloat(document.getElementById('pkgPrice').value),
            duration_seconds: parseInt(document.getElementById('pkgDuration').value) * 60,
            speed_download_kbps: parseInt(document.getElementById('pkgDownload').value),
            speed_upload_kbps: parseInt(document.getElementById('pkgUpload').value),
            devices: parseInt(document.getElementById('pkgDevices').value),
            is_active: document.getElementById('pkgStatus').value === 'true'
        };

        try {
            const res = await fetch(`${API_BASE}/packages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save package");

            closeModal();
            showToast("Package saved successfully!", "success");
            loadPackages();

        } catch (err) {
            console.error(err);
            showToast("Failed to save package to database.", "error");
        } finally {
            if(saveBtn) {
                saveBtn.textContent = "Save Package";
                saveBtn.disabled = false;
            }
        }
    });

    // Real-time Search
    document.getElementById('searchPackages').addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = currentPackages.filter(p => 
            p.name.toLowerCase().includes(term) || 
            p.price.toString().includes(term)
        );
        renderPackages(filtered);
    });

    // Load initial data
    loadPackages();
});
