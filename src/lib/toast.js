export const showToast = (msg, type) => {
    const t = document.getElementById('toast');
    const ic = document.getElementById('toast-icon');
    if (!t || !ic) return;

    document.getElementById('toast-msg').textContent = msg;

    if (type === 'success') {
        t.style.background = '#166534';
        ic.innerHTML = '<polyline points="20 6 9 17 4 12"/>';
    } else if (type === 'warning') {
        t.style.background = '#92400e';
        ic.innerHTML = '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>';
    } else {
        t.style.background = 'var(--dark)';
        ic.innerHTML = '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>';
    }

    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
};
