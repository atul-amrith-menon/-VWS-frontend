// ========================================
// VULTIX - Authentication JavaScript
// Handles login/register form validation,
// password toggle, strength meter, theme toggle
// ========================================

document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // Theme Toggle (Auth Pages)
    // =========================================
    const themeToggle = document.getElementById('authThemeToggle');

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
            setTheme(current === 'dark' ? 'light' : 'dark');
        });
    }


    // =========================================
    // Password Visibility Toggle
    // =========================================
    function setupPasswordToggle(btnId, inputId) {
        const btn = document.getElementById(btnId);
        const input = document.getElementById(inputId);
        if (!btn || !input) return;

        btn.addEventListener('click', () => {
            const isPassword = input.type === 'password';
            input.type = isPassword ? 'text' : 'password';
            btn.querySelector('i').className = isPassword ? 'bi bi-eye-slash' : 'bi bi-eye';
        });
    }

    setupPasswordToggle('togglePassword', 'loginPassword');
    setupPasswordToggle('toggleRegPassword', 'regPassword');


    // =========================================
    // Password Strength Meter (Register Page)
    // =========================================
    const pwInput = document.getElementById('regPassword');
    const pwStrength = document.getElementById('pwStrength');
    const pwBar = document.getElementById('pwStrengthBar');

    if (pwInput && pwStrength && pwBar) {
        pwInput.addEventListener('input', () => {
            const val = pwInput.value;

            if (!val) {
                pwStrength.classList.remove('visible');
                pwBar.className = 'auth-pw-strength-bar';
                return;
            }

            pwStrength.classList.add('visible');

            let score = 0;
            if (val.length >= 6) score++;
            if (val.length >= 10) score++;
            if (/[A-Z]/.test(val)) score++;
            if (/[0-9]/.test(val)) score++;
            if (/[^A-Za-z0-9]/.test(val)) score++;

            pwBar.className = 'auth-pw-strength-bar';
            if (score <= 1) pwBar.classList.add('pw-weak');
            else if (score === 2) pwBar.classList.add('pw-fair');
            else if (score === 3) pwBar.classList.add('pw-good');
            else pwBar.classList.add('pw-strong');
        });
    }


    // =========================================
    // Login Form Validation
    // =========================================
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            let valid = true;

            const username = document.getElementById('loginUsername');
            const password = document.getElementById('loginPassword');
            const usernameField = document.getElementById('usernameField');
            const passwordField = document.getElementById('passwordField');

            // Reset errors
            usernameField.classList.remove('has-error');
            passwordField.classList.remove('has-error');

            if (!username.value.trim()) {
                usernameField.classList.add('has-error');
                valid = false;
            }

            if (!password.value) {
                passwordField.classList.add('has-error');
                valid = false;
            }

            if (!valid) {
                e.preventDefault();
                return;
            }

            // Show loading state
            const btn = document.getElementById('loginBtn');
            btn.querySelector('.auth-btn-text').style.display = 'none';
            btn.querySelector('.auth-btn-arrow').style.display = 'none';
            btn.querySelector('.auth-btn-loader').style.display = 'inline-flex';
            btn.disabled = true;
        });

        // Clear error on input
        ['loginUsername', 'loginPassword'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    input.closest('.auth-field').classList.remove('has-error');
                });
            }
        });
    }


    // =========================================
    // Register Form Validation
    // =========================================
    const registerForm = document.getElementById('registerForm');

    if (registerForm) {
        registerForm.addEventListener('submit', (e) => {
            let valid = true;

            const username = document.getElementById('regUsername');
            const email = document.getElementById('regEmail');
            const password = document.getElementById('regPassword');
            const confirm = document.getElementById('regConfirmPassword');

            const fields = {
                regUsernameField: { input: username, validate: (v) => v.trim().length >= 3 },
                regEmailField: { input: email, validate: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) },
                regPasswordField: { input: password, validate: (v) => v.length >= 6 },
                regConfirmField: { input: confirm, validate: (v) => v === password.value },
            };

            Object.entries(fields).forEach(([fieldId, config]) => {
                const field = document.getElementById(fieldId);
                field.classList.remove('has-error', 'has-success');

                if (!config.validate(config.input.value)) {
                    field.classList.add('has-error');
                    valid = false;
                } else {
                    field.classList.add('has-success');
                }
            });

            if (!valid) {
                e.preventDefault();
                return;
            }

            // Show loading state
            const btn = document.getElementById('registerBtn');
            btn.querySelector('.auth-btn-text').style.display = 'none';
            btn.querySelector('.auth-btn-arrow').style.display = 'none';
            btn.querySelector('.auth-btn-loader').style.display = 'inline-flex';
            btn.disabled = true;
        });

        // Clear error on input
        ['regUsername', 'regEmail', 'regPassword', 'regConfirmPassword'].forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    input.closest('.auth-field').classList.remove('has-error');
                });
            }
        });
    }


    // =========================================
    // Auto-dismiss Alerts
    // =========================================
    const authAlert = document.getElementById('authAlert');
    if (authAlert) {
        setTimeout(() => {
            authAlert.style.opacity = '0';
            authAlert.style.transform = 'translateY(-8px)';
            authAlert.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            setTimeout(() => authAlert.remove(), 400);
        }, 6000);
    }

});
