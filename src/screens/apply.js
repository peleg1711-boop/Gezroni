import { getDb } from '../lib/supabase.js';

const REGIONS = [
  'עמק חפר', 'דרום השרון', 'צפון השרון', 'שרון',
  'גוש דן', 'שפלה', 'עמק יזרעאל', 'גליל', 'נגב', 'אחר',
];

export function mountApply(root) {
  root.innerHTML = buildApplyScreen();
  document.getElementById('apply-submit')?.addEventListener('click', handleApplySubmit);
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
    <div id="apply-form-state">

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
      <div class="apply-note">לאחר אישור הבקשה תקבל הזמנה באימייל להגדרת הסיסמה ויצירת חשבון.</div>
    </div>

    <div id="apply-success-state" style="display:none;text-align:center;padding:48px 0">
      <div style="font-size:52px;margin-bottom:16px">✅</div>
      <div style="font-size:20px;font-weight:800;color:var(--text-1);margin-bottom:10px">הבקשה התקבלה!</div>
      <div style="font-size:14px;color:var(--text-2);line-height:1.7">נבדוק את הבקשה ונחזור אליך באימייל<br>תוך 1–3 ימי עסקים.<br><br>לאחר האישור תקבל הזמנה באימייל<br>להגדרת סיסמה ויצירת חשבון.</div>
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

  const db = getDb();
  if (!db) {
    if (btn) { btn.disabled = false; btn.textContent = 'שלח בקשת הצטרפות ←'; }
    setErr('שגיאת חיבור — נסה שוב');
    return;
  }

  const { error: appErr } = await db.from('farm_applications').insert({
    applicant_name:  name,
    applicant_email: email,
    applicant_phone: phone || null,
    farm_name:       farmName,
    region,
    city,
    story:           story || null,
    contact:         { phone: phone || '' },
  });

  if (appErr) {
    if (btn) { btn.disabled = false; btn.textContent = 'שלח בקשת הצטרפות ←'; }
    setErr('שגיאה בשמירת הבקשה — נסה שוב');
    return;
  }

  document.getElementById('apply-form-state').style.display = 'none';
  document.getElementById('apply-success-state').style.display = 'block';
}
