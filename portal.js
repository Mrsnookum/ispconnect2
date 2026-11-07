document.addEventListener("DOMContentLoaded", () => {
    // Safely check if icons loaded before trying to create them
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    const API_BASE = 'https://ispconnect-backend.onrender.com/api/portal';
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
            const routerMac = urlParams.get('mac') || "";
            // --- FIX: Correctly capture 'routerIp' from the URL so the backend knows where to inject ---
            const routerIp = urlParams.get('routerIp') || urlParams.get('ip') || "";

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
                            showToast("Payment received! Connecting you now...");
                            
                            document.getElementById('voucherInput').value = checkData.voucher;
                            document.getElementById('mtik-user').value = checkData.voucher;
                            document.getElementById('mtik-pass').value = checkData.voucher; 
                            
                            setTimeout(() => {
                                document.getElementById('mtik-login-form').submit();
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

    btnConnect.addEventListener('click', () => {
        const voucher = voucherInput.value.trim();
        if (!voucher) {
            showToast("Please enter a voucher code.");
            return;
        }
        document.getElementById('mtik-user').value = voucher;
        document.getElementById('mtik-pass').value = voucher; 
        document.getElementById('mtik-login-form').submit();
    });

    loadPackages();
});
