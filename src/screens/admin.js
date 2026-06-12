import {
  watchAuth, signInWithGoogle, signOut, getUserProfile,
  fetchApplications, reviewApplication, setUserRole, fetchFarmByOwner, createFarm,
} from '../lib/firebase.js?v=20260612-firebase';
import { showToast } from '../lib/toast.js';
import { escapeHtml } from '../lib/escape.js';

let adminFilter = 'pending';
let unwatch = null;

export function mountAdmin(root) {
  root.innerHTML = buildAdminShell();
  const content = document.getElementById('admin-content');
  unwatch = watchAuth(async user => {
    if (!user) { renderLogin(content); return; }
    let profile = null;
    try { profile = await getUserProfile(user.uid); } catch {}
    if (profile?.role !== 'admin') {
      content.innerHTML = `<div class="admin-denied">אין הרשאת גישה — עמוד זה מיועד למנהלים בלבד.</div>`;
      return;
    }
    renderDashboard(content);
  });
  return () => { if (unwatch) { unwatch(); unwatch = null; } };
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

// ─── login ────────────────────────────────────────────────────────────────────

function renderLogin(content) {
  content.innerHTML = `
<div class="apply-form-wrap" style="max-width:360px">
  <div style="font-size:36px;text-align:center;margin-bottom:8px">🔒</div>
  <div class="apply-section-title" style="text-align:center">כניסת מנהל</div>
  <div class="auth-error" id="admin-login-error"></div>
  <button class="btn-shine" id="admin-login-btn" type="button" style="width:100%">כניסה עם Google ←</button>
</div>
`;
  document.getElementById('admin-login-btn')?.addEventListener('click', async () => {
    try { await signInWithGoogle(); } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user') {
        const errEl = document.getElementById('admin-login-error');
        if (errEl) errEl.textContent = 'שגיאה בכניסה — נסה שוב';
      }
    }
  });
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
  const listEl = document.getElementById('admin-apps-list');
  if (!listEl) return;

  listEl.innerHTML = '<div class="admin-loading">טוען...</div>';

  let apps;
  try {
    apps = await fetchApplications();
  } catch (e) {
    console.error('[gezroni] applications load failed', e);
    listEl.innerHTML = `<div style="color:var(--red,#e03);padding:20px;text-align:center">שגיאה בטעינה</div>`;
    return;
  }

  const data = apps
    .filter(a => a.status === adminFilter)
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));

  if (!data.length) {
    const labels = { pending: 'ממתינות', approved: 'מאושרות', rejected: 'שנדחו' };
    listEl.innerHTML = `<div class="admin-empty">אין בקשות ${labels[adminFilter] || ''}</div>`;
    return;
  }

  listEl.innerHTML = data.map(buildAppCard).join('');
  listEl.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const app = data.find(a => a.id === btn.dataset.id);
      handleAction(btn.dataset.action, app);
    });
  });
}

function buildAppCard(app) {
  const date = new Date(app.created_at).toLocaleDateString('he-IL');
  const isPending = app.status === 'pending';

  return `
<div class="admin-app-card" data-id="${escapeHtml(app.id)}">
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
    <textarea class="admin-notes-input" id="notes-${escapeHtml(app.id)}" rows="2" placeholder="הערות (אופציונלי)..."></textarea>
    <div class="admin-btn-row">
      <button class="admin-btn-approve" data-action="approve" data-id="${escapeHtml(app.id)}">✓ אשר</button>
      <button class="admin-btn-reject"  data-action="reject"  data-id="${escapeHtml(app.id)}">✗ דחה</button>
    </div>
    ${app.applicantUid ? '' : '<div class="admin-invite-hint">בקשה ישנה ללא חשבון מקושר — האישור לא יפתח אזור חקלאי אוטומטית</div>'}
  </div>
  ` : `<div class="admin-app-badge ${escapeHtml(app.status)}">${app.status === 'approved' ? '✓ אושרה' : '✗ נדחתה'}</div>`}
</div>
`;
}

async function handleAction(action, app) {
  if (!app) return;
  const notes = document.getElementById(`notes-${app.id}`)?.value.trim() || null;

  try {
    await reviewApplication(app.id, {
      status: action === 'approve' ? 'approved' : 'rejected',
      admin_notes: notes,
      reviewed_at: new Date().toISOString(),
    });

    if (action === 'approve' && app.applicantUid) {
      // Unlock the farmer area: flip role and make sure a farm listing exists.
      await setUserRole(app.applicantUid, 'farmer');
      const existing = await fetchFarmByOwner(app.applicantUid);
      if (!existing) {
        const farmId = 'farm-' + app.applicantUid.slice(0, 8);
        await createFarm(farmId, {
          name: app.farm_name || '',
          farmer_name: app.applicant_name || '',
          region: app.region || '',
          city: app.city || '',
          story: app.story || '',
          contact: app.contact || {},
          tags: [],
          produce: [],
          images: [],
          working_hours: {},
          is_active: true,
          ownerUid: app.applicantUid,
          application_id: app.id,
          created_at: new Date().toISOString(),
          last_updated: new Date().toLocaleDateString('he-IL'),
        });
      }
    }
  } catch (e) {
    console.error('[gezroni] review failed', e);
    showToast('שגיאה בעדכון הבקשה', 'error');
    return;
  }

  if (action === 'approve') {
    showToast(app.applicantUid ? 'הבקשה אושרה — אזור החקלאי נפתח לחשבון' : 'הבקשה אושרה', 'success');
  } else {
    showToast('הבקשה נדחתה', 'info');
  }

  loadApplications();
}
