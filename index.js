document.addEventListener("DOMContentLoaded", () => {
    
    // --- 1. MOBILE MENU TOGGLE ---
    const mobileToggle = document.getElementById('mobileToggle');
    const navMenu = document.getElementById('navMenu');
    const navItems = document.querySelectorAll('.nav-item');

    if (mobileToggle && navMenu) {
        // Open/Close menu on hamburger click
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            // Switch icon from hamburger to X
            if (navMenu.classList.contains('active')) {
                mobileToggle.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            } else {
                mobileToggle.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
            }
        });

        // Close menu when clicking a link
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navMenu.classList.remove('active');
                mobileToggle.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>';
            });
        });
    }

    // --- 2. FAQ ACCORDION ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        const btn = item.querySelector('.faq-question');
        btn.addEventListener('click', () => {
            // Close others
            faqItems.forEach(other => {
                if (other !== item && other.classList.contains('active')) {
                    other.classList.remove('active');
                    other.querySelector('span').textContent = '+';
                }
            });
            // Toggle clicked
            if (item.classList.contains('active')) {
                item.classList.remove('active');
                btn.querySelector('span').textContent = '+';
            } else {
                item.classList.add('active');
                btn.querySelector('span').textContent = '−';
            }
        });
    });

    // --- 3. SMOOTH SCROLLING ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);
            if (target) {
                // Scroll accounting for the 72px fixed navbar
                window.scrollTo({
                    top: target.getBoundingClientRect().top + window.pageYOffset - 72,
                    behavior: "smooth"
                });
            }
        });
    });

    // --- 4. STICKY NAVBAR SHADOW ---
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.style.boxShadow = window.scrollY > 10 ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none';
        });
    }

    // --- 5. CUSTOM MODAL LOGIC ---
    const customModal = document.getElementById('customModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalMessage = document.getElementById('modalMessage');
    const closeModalBtn = document.getElementById('closeModalBtn');

    function openModal(title, message) {
        if (modalTitle && modalMessage && customModal) {
            modalTitle.textContent = title;
            modalMessage.textContent = message;
            customModal.classList.add('active');
        }
    }

    if (closeModalBtn && customModal) {
        closeModalBtn.addEventListener('click', () => {
            customModal.classList.remove('active');
        });
    }

    // Attach modal to Demo Button
    const demoBtn = document.getElementById('demoBtn');
    if (demoBtn) {
        demoBtn.addEventListener('click', () => {
            openModal('Demo Video', 'The interactive demo player will be integrated here shortly.');
        });
    }

    // --- 6. CONTACT FORM SUBMISSION ---
    const form = document.getElementById('contactForm');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('button[type="submit"]');
            const ogText = submitBtn.textContent;
            
            submitBtn.textContent = 'Sending...';
            submitBtn.style.opacity = '0.7';
            submitBtn.disabled = true;
            
            // Simulate network request
            setTimeout(() => {
                submitBtn.textContent = ogText;
                submitBtn.style.opacity = '1';
                submitBtn.disabled = false;
                form.reset();
                openModal('Message Sent', 'Thank you for reaching out. Our technical team will get back to you shortly.');
            }, 1000);
        });
    }
});