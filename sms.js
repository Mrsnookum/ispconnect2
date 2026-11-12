document.addEventListener("DOMContentLoaded", () => {
    lucide.createIcons();
    
    // --- AUTHENTICATION & UI ---
    const adminName = localStorage.getItem("adminName");
    if (!adminName) window.location.href = '/register.html?view=login';
    document.getElementById("navAvatar").textContent = adminName.substring(0, 2).toUpperCase();

    const sidebar = document.getElementById("sidebar");
    const mobileOverlay = document.getElementById("mobileOverlay");
    document.getElementById("mobileToggle").addEventListener("click", () => {
        sidebar.classList.toggle("open"); mobileOverlay.classList.toggle("active");
    });
    mobileOverlay.addEventListener("click", () => {
        sidebar.classList.remove("open"); mobileOverlay.classList.remove("active");
    });

    function showToast(message, type = "success") {
        const container = document.getElementById("toastContainer");
        const toast = document.createElement("div");
        toast.style.borderLeft = `4px solid ${type === 'error' ? '#EF4444' : '#00B37E'}`;
        toast.className = `toast`;
        const icon = type === "error" ? "alert-circle" : "check-circle";
        toast.innerHTML = `<i data-lucide="${icon}" width="18"></i> <span>${message}</span>`;
        container.appendChild(toast);
        lucide.createIcons({ root: toast });
        setTimeout(() => toast.classList.add("show"), 10);
        setTimeout(() => { toast.classList.remove("show"); setTimeout(() => toast.remove(), 300); }, 3000);
    }

    // --- API LOGIC ---
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin/sms';

    async function loadConfig() {
        try {
            const res = await fetch(`${API_BASE}/config`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.talksasa_token) document.getElementById('smsToken').value = data.talksasa_token;
            if (data.talksasa_sender_id) document.getElementById('smsSenderId').value = data.talksasa_sender_id;
        } catch (err) {
            console.error("Failed to load SMS config");
        }
    }

    async function loadLedger() {
        const tbody = document.getElementById('smsLedgerBody');
        try {
            const res = await fetch(`${API_BASE}/ledger`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No SMS dispatches recorded yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(log => {
                const date = new Date(log.created_at).toLocaleString('en-KE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const isSent = log.status.toLowerCase().includes('sent') || log.status.toLowerCase().includes('success');
                const statusHtml = `<span class="status-pill ${isSent ? 'status-sent' : 'status-failed'}">${isSent ? 'SENT' : 'FAILED'}</span>`;
                
                return `
                    <tr>
                        <td style="white-space: nowrap; font-weight: 500;">${date}</td>
                        <td style="font-family: monospace; font-weight: 600;">${log.phone}</td>
                        <td style="max-width: 300px; color: var(--text-muted); line-height: 1.4;">${log.message}</td>
                        <td>${statusHtml}</td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #EF4444; padding: 20px;">Failed to load SMS ledger.</td></tr>`;
        }
    }

    document.getElementById('formSmsConfig').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSaveSms');
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader" width="16" class="spin"></i> Saving...`;
        lucide.createIcons();

        try {
            const res = await fetch(`${API_BASE}/config`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    talksasa_token: document.getElementById('smsToken').value,
                    talksasa_sender_id: document.getElementById('smsSenderId').value
                })
            });
            if (!res.ok) throw new Error("Failed to save");
            showToast("Gateway configuration updated.");
        } catch (err) {
            showToast("Failed to update gateway.", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="save" width="16"></i> Save Gateway`;
            lucide.createIcons();
        }
    });

    loadConfig();
    loadLedger();
});