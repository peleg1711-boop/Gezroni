import { watchAuth, signInWithGoogle, getCurrentUser, submitApplication } from '../lib/firebase.js?v=20260612-firebase';

const REGIONS = [
  'עמק חפר', 'דרום השרון', 'צפון השרון', 'שרון',
  'גוש דן', 'שפלה', 'עמק יזרעאל', 'גליל', 'נגב', 'אחר',
];

export function mountApply(root) {
  root.innerHTML = buildApplyScreen();
  document.getElementById('apply-submit')?.addEventListener('click', handleApplySubmit);
  document.getElementById('apply-google-btn')?.addEventListener('click', async () => {
    try { await signInWithGoogle(); } catch (e) {
      if (e?.code !== 'auth/popup-closed-by-user') console.error('[gezroni] sign-in failed', e);
    }
  });

  const unwatch = watchAuth(user => {
    const gate = document.getElementById('apply-signin-state');
    const form = document.getElementById('apply-form-state');
    const success = document.getElementById('apply-success-state');
    if (!gate || !form) return;
    if (success && success.style.display === 'block') return;
    gate.style.display = user ? 'none' : 'block';
    form.style.display = user ? 'block' : 'none';
    if (user) {
      const emailEl = document.getElementById('apply-email');
      if (emailEl) { emailEl.value = user.email || ''; emailEl.readOnly = true; }
      const nameEl = document.getElementById('apply-name');
      if (nameEl && !nameEl.value) nameEl.value = user.displayName || '';
    }
  });
  return () => unwatch();
}

function buildApplyScreen() {
  return `
<div class="apply-screen">
  <div class="apply-hero">
    <div class="apply-hero-icon">🌾</div>
    <div class="apply-hero-title">הצטרפות לגזרוני</div>
    <div class="apply-hero-sub">הגש בקשה לפרסם את המשק שלך בלוח. כל בקשה נבדקת ידנית לפני אישור — כדי להבטיח שהלוח מכיל משקים חקלאיים אמיתיים בלבד.</div>
  </div>

  <div class="apply-form-wrap">
    <div id="apply-signin-state" style="display:none;text-align:center;padding:40px 0">
      <div style="font-size:15px;color:var(--text-2);line-height:1.7;margin-bottom:20px">כדי להגיש בקשה, התחברו עם חשבון Google.<br>הבקשה תישמר על החשבון שלכם ותוכלו לעקוב אחרי הסטטוס.</div>
      <button class="btn-shine" id="apply-google-btn" type="button">כניסה עם Google</button>
    </div>
    <div id="apply-form-state" style="display:none">

      <div class="apply-section-title">פרטים אישיים</div>
      <div class="field">
        <label for="apply-name">שמך המלא *</label>
        <input type="text" id="apply-name" placeholder="ישראל ישראלי" autocomplete="name">
      </div>
      <div class="field">
        <label for="apply-email">אימייל *</label>
        <input type="email" id="apply-email" placeholder="name@example.com" autocomplete="email">
      </div>
      <div class="field">
        <label for="apply-phone">טלפון</label>
        <input type="tel" id="apply-phone" placeholder="050-0000000" autocomplete="tel">
      </div>

      <div class="apply-section-title" style="margin-top:24px">פרטי המשק</div>
      <div class="field">
        <label for="apply-farm-name">שם המשק *</label>
        <input type="text" id="apply-farm-name" placeholder="משק הירקות של ישראל">
      </div>
      <div class="field-row">
        <div class="field">
          <label for="apply-region">אזור *</label>
          <select id="apply-region">
            ${REGIONS.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="apply-city">יישוב *</label>
          <input type="text" id="apply-city" placeholder="כפר ויתקין">
        </div>
      </div>
      <div class="field">
        <label for="apply-story">ספר לנו על המשק</label>
        <textarea id="apply-story" rows="4" placeholder="מה גדל אצלך? כמה שנים במקצוע? איך תושבים יכולים להגיע אליך?"></textarea>
      </div>

      <div class="apply-error" id="apply-error"></div>
      <button class="btn-shine apply-submit-btn" id="apply-submit" type="button">שלח בקשת הצטרפות ←</button>
      <div class="apply-note">לאחר אישור הבקשה, אזור ניהול המשק ייפתח אוטומטית בחשבון הזה.</div>
    </div>

    <div id="apply-success-state" style="display:none;text-align:center;padding:48px 0">
      <div style="font-size:52px;margin-bottom:16px">✅</div>
      <div style="font-size:20px;font-weight:800;color:var(--text-1);margin-bottom:10px">הבקשה התקבלה!</div>
      <div style="font-size:14px;color:var(--text-2);line-height:1.7">נבדוק את הבקשה ונחזור אליך באימייל<br>תוך 1–3 ימי עסקים.<br><br>לאחר האישור, אזור ניהול המשק<br>ייפתח אוטומטית בחשבון שלך.</div>
      <a href="#home" class="btn-shine" style="display:inline-block;margin-top:28px;text-decoration:none">חזרה לדף הבית</a>
    </div>
  </div>
</div>
`;
}

async function handleApplySubmit() {
  const name     = document.getElementById('apply-name')?.value.trim();
  const email    = document.getElementById('apply-email')?.value.trim();
  const phone    = document.getElementById('apply-phone')?.value.trim();
  const farmName = document.getElementById('apply-farm-name')?.value.trim();
  const region   = document.getElementById('apply-region')?.value;
  const city     = document.getElementById('apply-city')?.value.trim();
  const story    = document.getElementById('apply-story')?.value.trim();
  const errEl    = document.getElementById('apply-error');
  const btn      = document.getElementById('apply-submit');

  const setErr = msg => { if (errEl) errEl.textContent = msg; };

  if (!name || !email || !farmName || !city) { setErr('נא למלא את כל השדות המסומנים ב-*'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErr('נא להזין כתובת אימייל תקינה'); return; }
  setErr('');

  if (btn) { btn.disabled = true; btn.textContent = 'שולח...'; }

  if (!getCurrentUser()) {
    if (btn) { btn.disabled = false; btn.textContent = 'שלח בקשת הצטרפות ←'; }
    setErr('יש להתחבר עם Google לפני שליחת הבקשה');
    return;
  }

  try {
    await submitApplication({
      applicant_name:  name,
      applicant_email: email,
      applicant_phone: phone || null,
      farm_name:       farmName,
      region,
      city,
      story:           story || null,
      contact:         { phone: phone || '' },
    });
  } catch (e) {
    console.error('[gezroni] application submit failed', e);
    if (btn) { btn.disabled = false; btn.textContent = 'שלח בקשת הצטרפות ←'; }
    setErr('שגיאה בשמירת הבקשה — נסה שוב');
    return;
  }

  document.getElementById('apply-form-state').style.display = 'none';
  document.getElementById('apply-success-state').style.display = 'block';
}
