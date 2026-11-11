document.addEventListener("DOMContentLoaded", () => {
    // API Configuration
    const API_BASE = 'https://isp.huntjobs.co.ke/api/admin';

    // Application State
    const regData = {
        email: '',
        company: '',
        phone: '',
        name: '',
        password: ''
    };

    // --- CUSTOM MODAL CONTROLLER ---
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const modalIcon = document.getElementById('modalIcon');

    window.openModal = function(title, message, isSuccess = false) {
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        
        if (isSuccess) {
            modalIcon.className = 'modal-icon success';
            modalIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
        } else {
            modalIcon.className = 'modal-icon';
            modalIcon.innerHTML = '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
        }
        
        customModal.classList.add('active');
    };

    window.closeModal = function() {
        customModal.classList.remove('active');
    };

    // --- HELPER: BUTTON LOADING STATE ---
    const setLoading = (btnId, spinId, textId, isLoading, originalText = '') => {
        const btn = document.getElementById(btnId);
        const spin = document.getElementById(spinId);
        const txt = document.getElementById(textId);
        
        if (isLoading) {
            btn.disabled = true;
            spin.style.display = 'block';
            if (txt) txt.textContent = 'Processing...';
        } else {
            btn.disabled = false;
            spin.style.display = 'none';
            if (txt) txt.textContent = originalText;
        }
    };

    // --- VIEW CONTROLLER (LOGIN VS REGISTER) ---
    window.switchView = function(viewId) {
        // Toggle active classes on tabs
        document.getElementById('tabLogin').classList.remove('active');
        document.getElementById('tabRegister').classList.remove('active');
        
        // Hide both views initially
        document.getElementById('viewLogin').classList.remove('active');
        document.getElementById('viewRegister').classList.remove('active');
        
        // Show selected view and activate tab
        if (viewId === 'login') {
            document.getElementById('tabLogin').classList.add('active');
            document.getElementById('viewLogin').classList.add('active');
        } else {
            document.getElementById('tabRegister').classList.add('active');
            document.getElementById('viewRegister').classList.add('active');
        }
    };

    // --- LOGIC: LOGIN ---
    window.processLogin = async function() {
        const email = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        const btn = document.getElementById('btnLogin');
        const spin = document.getElementById('spinLogin');
        const text = document.getElementById('textLogin');

        if (!email || !password) {
            openModal('Missing Fields', 'Please enter both your email and password.');
            return;
        }

        setLoading('btnLogin', 'spinLogin', 'textLogin', true);

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Login failed.');
            }

            // Store basic admin state locally (Optional, for dashboard greeting)
            localStorage.setItem('adminName', data.admin_name);

            btn.style.background = '#059669';
            text.textContent = 'Success! Redirecting...';
            spin.style.display = 'none';

            // Redirect to dashboard after a brief delay
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);

        } catch (error) {
            openModal('Login Error', error.message);
            setLoading('btnLogin', 'spinLogin', 'textLogin', false, 'Sign In');
        }
    };

    // --- STEP CONTROLLER (REGISTER FORMS) ---
    window.showStep = function(stepId, isVerify = false) {
        document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
        
        let targetId = `stepContent${stepId}`;
        if (isVerify) targetId += '-verify';
        
        document.getElementById(targetId).classList.add('active');

        // Update Stepper Visuals
        for(let i=1; i<=4; i++) {
            const indicator = document.getElementById(`stepIndicator${i}`);
            if(i <= stepId) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        }
    };

    // --- LOGIC: STEP 1 (EMAIL) ---
    window.sendEmailCode = async function() {
        const email = document.getElementById('regEmail').value.trim();
        if (!email.includes('@')) {
            openModal('Invalid Email', 'Please enter a valid business email address.');
            return;
        }
        
        regData.email = email;
        setLoading('btnEmail', 'spinEmail', 'textEmail', true);
        
        try {
            const response = await fetch(`${API_BASE}/send-email-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regData.email })
            });
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to send verification code.');

            document.getElementById('displayEmail').textContent = email;
            showStep(1, true);
        } catch (error) {
            openModal('Error', error.message);
        } finally {
            setLoading('btnEmail', 'spinEmail', 'textEmail', false, 'Send Verification Code');
        }
    };

    window.verifyEmailCode = async function() {
        const code = document.getElementById('emailVerifyCode').value.trim();
        if (code.length !== 6) {
            openModal('Invalid Code', 'Please enter the 6-digit code sent to your email.');
            return;
        }

        const btn = document.getElementById('btnVerifyEmail');
        btn.textContent = "Verifying...";
        btn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/verify-email-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: regData.email, code: code })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Invalid verification code.');

            showStep(2);
        } catch (error) {
            openModal('Verification Failed', error.message);
        } finally {
            btn.textContent = "Verify Code";
            btn.disabled = false;
        }
    };

    // --- LOGIC: STEP 2 (BUSINESS - BYPASS SMS) ---
    window.submitBusiness = function() {
        const company = document.getElementById('companyName').value.trim();
        const phone = document.getElementById('phoneNumber').value.trim();
        
        if (!company || phone.length < 10) {
            openModal('Incomplete Details', 'Please enter your Company Name and a valid 10-digit phone number.');
            return;
        }
        
        regData.company = company;
        regData.phone = phone;

        // Brightscale Notify is offline; bypass SMS verification directly to Step 3
        showStep(3);
    };

    // --- LOGIC: STEP 3 (SECURITY & REGISTRATION) ---
    window.submitSecurity = async function() {
        const name = document.getElementById('fullName').value.trim();
        const pass = document.getElementById('password').value;
        const confirm = document.getElementById('confirmPassword').value;

        if (!name) {
            openModal('Missing Name', 'Please enter your Full Name.');
            return;
        }
        if (pass.length < 8) {
            openModal('Weak Password', 'Your password must be at least 8 characters long.');
            return;
        }
        if (pass !== confirm) {
            openModal('Password Mismatch', 'The passwords you entered do not match.');
            return;
        }
        
        regData.name = name;
        regData.password = pass;

        // Proceed to register admin in the database
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: regData.name,
                    email: regData.email,
                    company_name: regData.company,
                    phone: regData.phone,
                    password: regData.password
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Failed to create admin profile.');

            // Pre-fill payment phone with verified registration phone
            document.getElementById('paymentPhone').value = regData.phone;
            showStep(4);
        } catch (error) {
            openModal('Registration Error', error.message);
        }
    };

    // --- LOGIC: STEP 4 (PAYHERO PAYMENT) ---
    window.initiatePayment = async function() {
        const payPhone = document.getElementById('paymentPhone').value.trim();
        if (payPhone.length < 10) {
            openModal('Invalid Number', 'Please enter a valid M-Pesa number for the PayHero prompt.');
            return;
        }

        setLoading('btnPay', 'spinPay', 'payText', true);
        document.getElementById('payText').textContent = 'Sending prompt to phone...';

        try {
            // We replace '/admin' from your API_BASE string with '/billing'
            const BILLING_API = API_BASE.replace('/admin', '/billing');

            // 1. Trigger the real PayHero STK Push
            const pushRes = await fetch(`${BILLING_API}/stk-push`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    phone: payPhone, 
                    email: regData.email // Used as external_reference to activate the correct admin
                })
            });

            if (!pushRes.ok) {
                const errorData = await pushRes.json();
                throw new Error(errorData.detail || "Payment gateway error.");
            }

            document.getElementById('payText').textContent = 'Waiting for M-Pesa PIN...';

            // 2. Poll the database every 3 seconds to check if the webhook flipped status
            const pollInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`${BILLING_API}/status/${payPhone}`);
                    const statusData = await statusRes.json();

                    if (statusData.status === "completed") {
                        clearInterval(pollInterval);
                        document.getElementById('payText').textContent = 'Payment Verified! Redirecting...';
                        document.getElementById('btnPay').style.background = '#059669'; // Success Green
                        
                        setTimeout(() => {
                            window.location.href = '/dashboard.html';
                        }, 1500);
                    } else if (statusData.status === "failed") {
                        // Instantly catch Safaricom network failures
                        clearInterval(pollInterval);
                        openModal('M-Pesa Error', 'Safaricom could not reach your phone. Please check your network signal and try again.');
                        setLoading('btnPay', 'spinPay', 'payText', false, 'Pay with PayHero');
                    }
                } catch (err) {
                    console.error("Polling error:", err);
                }
            }, 3000);
            
            // 3. Stop polling if they haven't paid within 60 seconds
            setTimeout(() => {
                clearInterval(pollInterval);
                if (document.getElementById('payText').textContent !== 'Payment Verified! Redirecting...') {
                    openModal('Payment Timeout', 'We did not receive payment confirmation in time. Please try again.');
                    setLoading('btnPay', 'spinPay', 'payText', false, 'Pay with PayHero');
                }
            }, 60000);

        } catch (error) {
            openModal('Payment Error', error.message);
            setLoading('btnPay', 'spinPay', 'payText', false, 'Pay with PayHero');
        }
    };
});
