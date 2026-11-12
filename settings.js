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

    // --- TAB SWITCHING ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // --- API LOGIC ---
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin/settings';

    async function loadSettings() {
        try {
            const res = await fetch(API_BASE);
            if (!res.ok) return;
            const data = await res.json();
            
            // Populate Branding
            if (data.brand_primary) document.getElementById('brandPrimary').value = data.brand_primary;
            if (data.brand_secondary) document.getElementById('brandSecondary').value = data.brand_secondary;
            if (data.brand_logo) document.getElementById('brandLogo').value = data.brand_logo;
            if (data.brand_bg) document.getElementById('brandBg').value = data.brand_bg;
            if (data.brand_welcome) document.getElementById('brandWelcome').value = data.brand_welcome;

            // Populate PayHero
            if (data.payhero_api_key) document.getElementById('phApiKey').value = data.payhero_api_key;
            if (data.payhero_channel_id) document.getElementById('phChannel').value = data.payhero_channel_id;

            // Populate Business
            if (data.isp_name) document.getElementById('bizName').value = data.isp_name;
            if (data.support_contact) document.getElementById('bizContact').value = data.support_contact;
            
        } catch (err) {
            console.error("Failed to load settings", err);
        }
    }

    async function saveSettings(category, payload, btnId, originalText) {
        const btn = document.getElementById(btnId);
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" width="16" class="spin"></i> Saving...`;
        lucide.createIcons();

        try {
            const res = await fetch(`${API_BASE}/${category}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("Failed to save");
            showToast("Settings updated successfully.", "success");
        } catch (err) {
            showToast("Failed to update settings.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
            lucide.createIcons();
        }
    }

    // FORM HANDLERS
    document.getElementById('formBranding').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings('branding', {
            brand_primary: document.getElementById('brandPrimary').value,
            brand_secondary: document.getElementById('brandSecondary').value,
            brand_logo: document.getElementById('brandLogo').value,
            brand_bg: document.getElementById('brandBg').value,
            brand_welcome: document.getElementById('brandWelcome').value
        }, 'btnBranding', '<i data-lucide="save" width="16"></i> Save Branding');
    });

    document.getElementById('formPayhero').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings('payhero', {
            payhero_api_key: document.getElementById('phApiKey').value,
            payhero_channel_id: document.getElementById('phChannel').value
        }, 'btnPayhero', '<i data-lucide="save" width="16"></i> Save Payment Config');
    });

    document.getElementById('formBusiness').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings('business', {
            isp_name: document.getElementById('bizName').value,
            support_contact: document.getElementById('bizContact').value
        }, 'btnBusiness', '<i data-lucide="save" width="16"></i> Save Profile');
    });

    document.getElementById('formSecurity').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings('security', {
            username: document.getElementById('adminUser').value,
            password: document.getElementById('adminPass').value
        }, 'btnSecurity', '<i data-lucide="shield-check" width="16"></i> Update Credentials');
    });

    loadSettings();
});