document.addEventListener("DOMContentLoaded", () => {
    // Safely check if icons loaded before trying to create them
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    // UPDATED: Pointing to Local Environment for development while VPS is pending
    const API_BASE = 'https://isp.huntjobs.co.ke/api/portal';
    let selectedPackageId = null;

    // --- FIX: Grab the router's local IP destination and add Google Redirect ---
    const urlParamsTop = new URLSearchParams(window.location.search);
    let routerLoginUrl = urlParamsTop.get('login_url') || "http://10.0.0.1/login";
    
    if (routerLoginUrl.includes('?')) {
        routerLoginUrl += '&dst=https://google.com';
    } else {
        routerLoginUrl += '?dst=https://google.com';
    }
    
    const loginForm = document.getElementById('mtik-login-form');
    if (loginForm) {
        loginForm.action = routerLoginUrl;
    }
    // -------------------------------------------------------------------------

    const packagesContainer = document.getElementById('packagesContainer');
    const phoneInput = document.getElementById('phoneInput');
    const voucherInput = document.getElementById('voucherInput');
    const btnPay = document.getElementById('btnPay');
    const btnConnect = document.getElementById('btnConnect');

    function showToast(msg) {
        const toast = document.getElementById('toastMsg');
        let iconHtml = '';
        if (typeof lucide !== 'undefined') {
            iconHtml = `<i data-lucide="info" width="18"></i> `;
        }
        toast.innerHTML = `${iconHtml}${msg}`;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({root: toast});
        }
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 4000);
    }

    // --- NEW: DYNAMIC BRANDING ENGINE ---
    async function loadPortalBranding() {
        try {
            const res = await fetch('https://isp.huntjobs.co.ke/api/admin/settings');
            if (!res.ok) return;
            
            const config = await res.json();

            // 1. Apply Primary Theme Color
            if (config.brand_primary) {
                // Update global CSS variables
                document.documentElement.style.setProperty('--primary', config.brand_primary);
                document.documentElement.style.setProperty('--primary-dark', config.brand_primary);
                
                // Override the left panel gradient to use the new color
                const leftPanel = document.getElementById('portalLeftPanel');
                if (leftPanel) {
                    leftPanel.style.background = `linear-gradient(135deg, #022C22 0%, ${config.brand_primary} 100%)`;
                }
            }

            // 2. Apply ISP Name
            if (config.isp_name) {
                const brandName = document.getElementById('portalBrandName');
                if (brandName) brandName.textContent = config.isp_name;
                document.title = `Connect | ${config.isp_name} Wi-Fi`;
            }

            // 3. Apply Welcome Message
            if (config.brand_welcome) {
                const welcomeMsg = document.getElementById('portalWelcome');
                if (welcomeMsg) welcomeMsg.textContent = config.brand_welcome;
            }
        } catch (err) {
            console.error("Failed to load dynamic branding:", err);
        }
    }
    // ------------------------------------

    async function loadPackages() {
        try {
            const res = await fetch(`${API_BASE}/packages`);
            if (!res.ok) throw new Error("Failed to load packages");
            
            const packages = await res.json();
            
            if (!packages || packages.length === 0) {
                packagesContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #EF4444; font-size: 0.85rem; padding: 20px;">No active plans available right now.</div>`;
                return;
            }

            packagesContainer.innerHTML = packages.map(p => `
                <div class="pkg-btn" data-id="${p.id}">
                    <div class="pkg-price">KES ${p.price}</div>
                    <div class="pkg-name">${p.name}</div>
                </div>
            `).join('');

            document.querySelectorAll('.pkg-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.pkg-btn').forEach(b => b.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedPackageId = this.getAttribute('data-id');
                });
            });

        } catch (err) {
            console.error("Error loading packages:", err);
            packagesContainer.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #EF4444; font-size: 0.85rem; padding: 20px;">Could not connect to database.</div>`;
        }
    }

    btnPay.addEventListener('click', async () => {
        const phone = phoneInput.value.trim();
        
        if (!selectedPackageId) {
            showToast("Please select a package first!");
            return;
        }
        
        if (!phone || phone.length < 10) {
            showToast("Please enter a valid phone number.");
            return;
        }

        const originalText = btnPay.innerHTML;
        btnPay.innerHTML = `Initiating Payment...`;
        btnPay.disabled = true;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            // UPDATED: Integrates the mTikData injected from HTML for stronger MAC locking
            const routerMac = urlParams.get('mac') || (window.mTikData ? window.mTikData.mac : "");
            const routerIp = urlParams.get('routerIp') || urlParams.get('ip') || (window.mTikData ? window.mTikData.ip : "");

            const res = await fetch(`${API_BASE}/pay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: phone, 
                    package_id: selectedPackageId,
                    mac: routerMac,
                    ip: routerIp
                })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                btnPay.innerHTML = `Verifying Payment...`;
                showToast("Check your phone! Enter your M-Pesa PIN to complete payment.");
                
                let attempts = 0;
                const maxAttempts = 20; 

                const pollInterval = setInterval(async () => {
                    attempts++;
                    try {
                        const checkRes = await fetch(`${API_BASE}/verify/${phone}`);
                        const checkData = await checkRes.json();

                        if (checkData.status === "success") {
                            clearInterval(pollInterval);
                            showToast("Payment received! Redirecting to success...");
                            
                            setTimeout(() => {
                                // AUTO-DETECT VOUCHER: Grab the voucher directly from the backend response
                                const autoVoucher = checkData.voucher;
                                
                                // REDIRECT TO SUCCESS SCREEN: Pass voucher and encoded login_url so success.html can handle the auto-connect view
                                const encodedLoginUrl = encodeURIComponent(routerLoginUrl);
                                window.location.href = `success.html?voucher=${autoVoucher}&login_url=${encodedLoginUrl}`;
                            }, 1500);
                        } else if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            btnPay.innerHTML = originalText;
                            btnPay.disabled = false;
                            showToast("Verification timeout. If you paid, try logging in with your phone number.");
                        }
                    } catch (err) {
                        console.error("Polling error", err);
                    }
                }, 3000); 

            } else {
                throw new Error(data.detail || "Payment failed");
            }
            
        } catch (err) {
            showToast(`Error: ${err.message}`);
            btnPay.innerHTML = originalText;
            btnPay.disabled = false;
        } 
    });

    // UPDATED: Dual Reconnect & MAC Binding via Backend API call
    btnConnect.addEventListener('click', async () => {
        const voucher = voucherInput.value.trim().toUpperCase();
        if (!voucher) {
            showToast("Please enter a voucher code or M-Pesa code.");
            return;
        }

        const originalText = btnConnect.innerHTML;
        btnConnect.innerHTML = `Verifying Code...`;
        btnConnect.disabled = true;

        const urlParams = new URLSearchParams(window.location.search);
        const routerMac = urlParams.get('mac') || (window.mTikData ? window.mTikData.mac : "");

        try {
            // Hit local backend to verify code and bind to this device's MAC
            const res = await fetch(`${API_BASE}/reconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    code: voucher, 
                    mac: routerMac 
                })
            });

            const data = await res.json();

            if (res.ok) {
                showToast("Code accepted! Redirecting...");
                
                setTimeout(() => {
                    // AUTO-DETECT VOUCHER: Use the validated code from the backend
                    const autoVoucher = data.username || voucher;
                    const encodedLoginUrl = encodeURIComponent(routerLoginUrl);
                    
                    // REDIRECT TO SUCCESS SCREEN
                    window.location.href = `success.html?voucher=${autoVoucher}&login_url=${encodedLoginUrl}`;
                }, 1500);
            } else {
                throw new Error(data.detail || "Invalid code or used on another device");
            }
        } catch (err) {
            showToast(`Error: ${err.message}`);
            btnConnect.innerHTML = originalText;
            btnConnect.disabled = false;
        }
    });

    // Execute fetches on load
    loadPortalBranding();
    loadPackages();
});
