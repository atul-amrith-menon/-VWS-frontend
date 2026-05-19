// ========================================
// VULTIX - Main JavaScript
// ========================================

document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // Theme Toggle (Dark / Light)
    // =========================================
    const themeToggle = document.getElementById('themeToggle');

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('vultix-theme', theme);
    }

    function getCurrentTheme() {
        return document.documentElement.getAttribute('data-theme') || 'dark';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = getCurrentTheme();
            const next = current === 'dark' ? 'light' : 'dark';
            setTheme(next);

            // If charts exist, re-render them with new theme colors
            if (typeof window.vultixRenderCharts === 'function') {
                window.vultixRenderCharts(next);
            }
        });
    }


    // =========================================
    // Form Validation & Loading State
    // =========================================
    const scanForm = document.getElementById('scanForm');
    if (scanForm) {
        scanForm.addEventListener('submit', (e) => {
            const urlInput = document.getElementById('targetUrl');
            const btn = document.getElementById('scanBtn');

            if (!urlInput.value.trim()) {
                e.preventDefault();
                urlInput.classList.add('is-invalid');
                return;
            }

            // Show loading state
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Starting...';
            btn.disabled = true;
        });

        // Remove validation state on input
        const urlInput = document.getElementById('targetUrl');
        if (urlInput) {
            urlInput.addEventListener('input', () => {
                urlInput.classList.remove('is-invalid');
            });
        }
    }


    // =========================================
    // Intersection Observer Animations
    // =========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -30px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.vuln-card, .feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(15px)';
        card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(card);
    });


    // =========================================
    // Auto-dismiss Alerts
    // =========================================
    document.querySelectorAll('.alert-dismissible').forEach(alert => {
        setTimeout(() => {
            const btn = alert.querySelector('.btn-close');
            if (btn) btn.click();
        }, 5000);
    });
});
