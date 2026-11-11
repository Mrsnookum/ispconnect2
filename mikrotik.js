document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide Icons
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const API_BASE = "https://isp.huntjobs.co.ke";

    // --- STANDARD TEMPLATE LOGIC ---
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.getElementById('sidebar');
    const mobileOverlay = document.getElementById('mobileOverlay');
    const profileToggleBtn = document.getElementById('profileToggleBtn');
    const profileDropdown = document.getElementById('profileDropdown');

    if (mobileToggle && sidebar && mobileOverlay) {
        mobileToggle.addEventListener('click', () => {
            sidebar.classList.add('open');
            mobileOverlay.classList.add('active');
        });
    }

    if (mobileOverlay && sidebar) {
        mobileOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            mobileOverlay.classList.remove('active');
        });
    }

    if (profileToggleBtn && profileDropdown) {
        profileToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('active');
        });
        document.addEventListener('click', () => {
            if (profileDropdown) profileDropdown.classList.remove('active');
        });
    }

    // --- CUSTOM TOAST SYSTEM ---
    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        if (!container) return; 

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
        const iconColor = type === 'success' ? 'var(--primary)' : '#EF4444';

        toast.innerHTML = `
            <i data-lucide="${iconName}" width="18" style="color: ${iconColor}"></i> 
            <span>${message}</span>
        `;
        container.appendChild(toast);

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ root: toast });
        }

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // --- FILTER TABS LOGIC ---
    const filterBtns = document.querySelectorAll('.filter-tabs .filter-btn');
    const tableEmptyText = document.getElementById('table-empty-text');

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filterType = btn.getAttribute('data-filter');
            if (tableEmptyText) {
                if(filterType === 'All') {
                    tableEmptyText.innerText = `No routers found. Click "Link a MikroTik" to get started.`;
                } else {
                    tableEmptyText.innerText = `No ${filterType.toLowerCase()} routers found.`;
                }
            }
        });
    });

    // --- WIZARD LOGIC ---
    let activeProvisioningToken = null; 

    const dashboardView = document.getElementById('routers-dashboard-view');
    const wizardView = document.getElementById('onboarding-wizard-view');
    const step1 = document.getElementById('wizard-step-1');
    const step2 = document.getElementById('wizard-step-2');
    const step3 = document.getElementById('wizard-step-3'); // Kept variable in case it exists in HTML
    const ind2 = document.getElementById('step-2-indicator');
    const ind3 = document.getElementById('step-3-indicator'); 

    let pollingInterval;

    const btnLinkMikrotik = document.getElementById('btn-link-mikrotik');
    if (btnLinkMikrotik) {
        btnLinkMikrotik.addEventListener('click', () => {
            if (dashboardView) dashboardView.style.display = 'none';
            if (wizardView) wizardView.style.display = 'block';
            resetWizard();
        });
    }

    const btnCancelOnboarding = document.getElementById('btn-cancel-onboarding');
    if (btnCancelOnboarding) {
        btnCancelOnboarding.addEventListener('click', () => {
            if (wizardView) wizardView.style.display = 'none';
            if (dashboardView) dashboardView.style.display = 'block'; 
            clearInterval(pollingInterval);
        });
    }

    const btnNextStep1 = document.getElementById('btn-next-step-1');
    if (btnNextStep1) {
        btnNextStep1.addEventListener('click', async () => {
            const identityInput = document.getElementById('mikrotik-identity');
            const identity = identityInput ? identityInput.value.trim() : '';

            if(!identity) {
                showToast("Please enter a MikroTik Identity.", "error");
                if (identityInput) identityInput.focus();
                return;
            }

            const originalBtnText = btnNextStep1.innerHTML;
            btnNextStep1.disabled = true;
            btnNextStep1.innerHTML = `<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;display:inline-block;vertical-align:middle;margin-right:8px;"></div> Generating...`;

            try {
                const response = await fetch(`${API_BASE}/api/provision/init`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        identity: identity,
                        backend_url: API_BASE
                    })
                });

                if (!response.ok) {
                    throw new Error("Failed to initialize provisioning session");
                }

                const data = await response.json();

                activeProvisioningToken = data.token; 

                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'block';
                if (ind2) ind2.classList.add('active');

                const provisioningCommandText = document.getElementById('provisioning-command-text');
                if (provisioningCommandText) {
                    provisioningCommandText.innerText = data.command;
                }

                showToast("Provisioning command generated.");
                startPollingBackend(data.token);
            } catch (err) {
                console.error(err);
                showToast("Failed to connect to backend server.", "error");
            } finally {
                btnNextStep1.disabled = false;
                btnNextStep1.innerHTML = originalBtnText;
            }
        });
    }

    const btnCopyCommand = document.getElementById('btn-copy-command');
    if (btnCopyCommand) {
        btnCopyCommand.addEventListener('click', () => {
            const provisioningCommandText = document.getElementById('provisioning-command-text');
            if (!provisioningCommandText) return;

            navigator.clipboard.writeText(provisioningCommandText.innerText).then(() => {
                btnCopyCommand.innerHTML = `<i data-lucide="check" width="20" color="var(--primary)"></i>`;
                if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnCopyCommand });
                showToast("Command copied to clipboard!");

                setTimeout(() => {
                    btnCopyCommand.innerHTML = `<i data-lucide="copy" width="20"></i>`;
                    if (typeof lucide !== 'undefined') lucide.createIcons({ root: btnCopyCommand });
                }, 2000);
            });
        });
    }

    // --- Fetch and Display Dashboard Data ---
    async function loadDashboardRouters() {
        try {
            const response = await fetch(`${API_BASE}/api/provision/routers`, {
                headers: { "ngrok-skip-browser-warning": "true" }
            });
            const result = await response.json();

            if (result.status === "success") {
                const routers = result.data;
                const tbody = document.querySelector('table tbody'); 

                // Calculate Stats
                let onlineCount = routers.filter(r => r.status === 'Online').length;
                let onboardingCount = routers.filter(r => r.provisioning_status === 'Awaiting_Services').length;

                // Update Stat Cards 
                if(document.getElementById('stat-total')) document.getElementById('stat-total').innerText = routers.length;
                if(document.getElementById('stat-online')) document.getElementById('stat-online').innerText = onlineCount;
                if(document.getElementById('stat-onboarding')) document.getElementById('stat-onboarding').innerText = onboardingCount;

                // Populate Table
                if (tbody && routers.length > 0) {
                    if(tableEmptyText && tableEmptyText.parentElement) {
                        tableEmptyText.parentElement.style.display = 'none'; // Hide empty state
                    }
                    tbody.innerHTML = routers.map(r => `
                        <tr>
                            <td>${new Date(r.created_at).toLocaleDateString()}</td>
                            <td><strong>${r.name || r.identity}</strong></td>
                            <td>${r.identity}</td>
                            <td>${r.ip_address || 'Unknown'}</td>
                            <td><span class="badge ${r.status === 'Online' ? 'bg-success' : 'bg-secondary'}" style="padding: 4px 8px; border-radius: 12px; font-size: 0.75rem;">${r.status}</span></td>
                            <td><button class="btn btn-sm" style="padding: 4px 8px; border: 1px solid var(--border); background: var(--bg-color); border-radius: 4px; cursor: pointer;">Manage</button></td>
                        </tr>
                    `).join('');
                }
            }
        } catch (err) {
            console.error("Failed to load dashboard routers:", err);
        }
    }

    // Call this immediately when the page loads
    loadDashboardRouters();

    // --- ZERO-TOUCH POLLING: Router Connects -> Setup Complete! ---
    function startPollingBackend(token) {
        clearInterval(pollingInterval);
        const pollingText = document.getElementById('polling-text');
        if (pollingText) pollingText.innerText = "Waiting for router to connect...";

        pollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE}/api/provision/status/${token}`, {
                    headers: {
                        "ngrok-skip-browser-warning": "true"
                    }
                });
                if (!response.ok) return;

                const data = await response.json();
                if (data.status === "connected") {
                    clearInterval(pollingInterval);

                    showToast("Router successfully provisioned and ready!");

                    // Immediately swap views and refresh table. No Step 3 required!
                    if (wizardView) wizardView.style.display = 'none';
                    if (dashboardView) dashboardView.style.display = 'block';

                    loadDashboardRouters();
                    resetWizard();
                }
            } catch (err) {
                console.error("Status check failed:", err);
            }
        }, 2000); 
    }

    function resetWizard() {
        clearInterval(pollingInterval);
        if (step1) step1.style.display = 'block';
        if (step2) step2.style.display = 'none';
        if (step3) step3.style.display = 'none';
        if (ind2) ind2.classList.remove('active');
        if (ind3) ind3.classList.remove('active');

        activeProvisioningToken = null; 

        const identityInput = document.getElementById('mikrotik-identity');
        if (identityInput) identityInput.value = '';
    }
});
