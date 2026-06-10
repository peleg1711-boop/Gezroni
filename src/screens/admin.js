import { getDb } from '../lib/supabase.js';
import { showToast } from '../lib/toast.js';
import { escapeHtml } from '../lib/escape.js';

let adminFilter = 'pending';

export function mountAdmin(root) {
  root.innerHTML = buildAdminShell();
  initAdmin();
}

function buildAdminShell() {
  return `
<div class="admin-screen">
  <div class="admin-header">
    <div class="admin-header-title">פאנל ניהול · בקשות הצטרפות</div>
  </div>
  <div id="admin-content"><div class="admin-loading">טוען...</div></div>
</div>
`;
}

async function initAdmin() {
  const db = getDb();
  const content = document.getElementById('admin-content');

  if (!db) { renderLogin(content); return; }

  const { data: { session } } = await db.auth.getSession();
  if (!session?.user) { renderLogin(content); return; }

  if (session.user.app_metadata?.role !== 'admin') {
    content.innerHTML = `<div class="admin-denied">אין הרשאת גישה — עמוד זה מיועד למנהלים בלבד.</div>`;
    return;
  }

  renderDashboard(content);
}

// ─── login ────────────────────────────────────────────────────────────────────

function renderLogin(content) {
  content.innerHTML = `
<div class="apply-form-wrap" style="max-width:360px">
  <div style="font-size:36px;text-align:center;margin-bottom:8px">🔒</div>
  <div class="apply-section-title" style="text-align:center">כניסת מנהל</div>
  <div class="field"><input type="email" id="admin-email" class="auth-input" placeholder="אימייל" autocomplete="email"></div>
  <div class="field"><input type="password" id="admin-password" class="auth-input" placeholder="סיסמה" autocomplete="current-password"></div>
  <div class="auth-error" id="admin-login-error"></div>
  <button class="btn-shine" id="admin-login-btn" type="button" style="width:100%">כניסה ←</button>
</div>
`;
  document.getElementById('admin-login-btn')?.addEventListener('click', handleAdminLogin);
  document.getElementById('admin-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAdminLogin();
  });
}

async function handleAdminLogin() {
  const db       = getDb();
  const email    = document.getElementById('admin-email')?.value.trim();
  const password = document.getElementById('admin-password')?.value;
  const errEl    = document.getElementById('admin-login-error');
  const btn      = document.getElementById('admin-login-btn');

  if (!email || !password) { if (errEl) errEl.textContent = 'נא למלא אימייל וסיסמה'; return; }

  if (btn) { btn.disabled = true; btn.textContent = '...'; }
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (btn) { btn.disabled = false; btn.textContent = 'כניסה ←'; }

  if (error || !data?.user) {
    if (errEl) errEl.textContent = 'אימייל או סיסמה שגויים';
    return;
  }
  if (data.user.app_metadata?.role !== 'admin') {
    await db.auth.signOut();
    if (errEl) errEl.textContent = 'אין הרשאת מנהל לחשבון זה';
    return;
  }

  renderDashboard(document.getElementById('admin-content'));
}

// ─── dashboard ────────────────────────────────────────────────────────────────

function renderDashboard(content) {
  content.innerHTML = `
<div style="padding:16px">
  <div class="admin-tabs">
    <button class="admin-tab active" data-status="pending">ממתינות</button>
    <button class="admin-tab" data-status="approved">אושרו</button>
    <button class="admin-tab" data-status="rejected">נדחו</button>
  </div>
  <div id="admin-apps-list"><div class="admin-loading">טוען בקשות...</div></div>
</div>
`;

  content.querySelectorAll('.admin-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      adminFilter = tab.dataset.status;
      content.querySelectorAll('.admin-tab').forEach(t => t.classList.toggle('active', t === tab));
      loadApplications();
    });
  });

  loadApplications();
}

async function loadApplications() {
  const db    = getDb();
  const listEl = document.getElementById('admin-apps-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="admin-loading">טוען...</div>';

  const { data, error } = await db
    .from('farm_applications')
    .select('*')
    .eq('status', adminFilter)
    .order('created_at', { ascending: false });

  if (error) {
    listEl.innerHTML = `<div style="color:var(--red,#e03);padding:20px;text-align:center">שגיאה בטעינה</div>`;
    return;
  }

  if (!data?.length) {
    const labels = { pending: 'ממתינות', approved: 'מאושרות', rejected: 'שנדחו' };
    listEl.innerHTML = `<div class="admin-empty">אין בקשות ${labels[adminFilter] || ''}</div>`;
    return;
  }

  listEl.innerHTML = data.map(buildAppCard).join('');
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleAction(btn.dataset.action, btn.dataset.id));
  });
}

function buildAppCard(app) {
  const date = new Date(app.created_at).toLocaleDateString('he-IL');
  const isPending = app.status === 'pending';

  return `
<div class="admin-app-card" data-id="${app.id}">
  <div class="admin-app-top">
    <div class="admin-app-info">
      <div class="admin-app-farm">${escapeHtml(app.farm_name)}</div>
      <div class="admin-app-meta">${escapeHtml(app.applicant_name)} · ${escapeHtml(app.city)}, ${escapeHtml(app.region)}</div>
      <div class="admin-app-contact">${escapeHtml(app.applicant_email)}${app.applicant_phone ? ` · ${escapeHtml(app.applicant_phone)}` : ''}</div>
    </div>
    <div class="admin-app-date">${escapeHtml(date)}</div>
  </div>
  ${app.story ? `<div class="admin-app-story">${escapeHtml(app.story)}</div>` : ''}
  ${app.admin_notes ? `<div class="admin-app-admin-notes">הערת מנהל: ${escapeHtml(app.admin_notes)}</div>` : ''}
  ${isPending ? `
  <div class="admin-app-actions">
    <textarea class="admin-notes-input" id="notes-${app.id}" rows="2" placeholder="הערות (אופציונלי)..."></textarea>
    <div class="admin-btn-row">
      <button class="admin-btn-approve" data-action="approve" data-id="${app.id}">✓ אשר</button>
      <button class="admin-btn-reject"  data-action="reject"  data-id="${app.id}">✗ דחה</button>
    </div>
    <div class="admin-invite-hint">לאחר אישור: הזמן את החקלאי מ־Supabase → Authentication → Users → Invite user</div>
  </div>
  ` : `<div class="admin-app-badge ${app.status}">${app.status === 'approved' ? '✓ אושרה' : '✗ נדחתה'}</div>`}
</div>
`;
}

async function handleAction(action, appId) {
  const db    = getDb();
  const notes = document.getElementById(`notes-${appId}`)?.value.trim() || null;

  const { error } = await db.from('farm_applications').update({
    status:      action === 'approve' ? 'approved' : 'rejected',
    admin_notes: notes,
    reviewed_at: new Date().toISOString(),
  }).eq('id', appId);

  if (error) { showToast('שגיאה בעדכון הבקשה', 'error'); return; }

  if (action === 'approve') {
    showToast('הבקשה אושרה — הזמן את החקלאי באימייל דרך Supabase Dashboard', 'success');
  } else {
    showToast('הבקשה נדחתה', 'info');
  }

  loadApplications();
}
