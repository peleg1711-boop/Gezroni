// Gezroni — legal & info screen (#legal).
// Privacy, terms, and contact in one place. Content is a plain-language DRAFT
// describing actual platform behavior; it should be reviewed by a lawyer
// before public launch.

// Left blank intentionally — the contact email will be set later.
const CONTACT_EMAIL = '';

export function mountLegal(root) {
  root.innerHTML = `
    <div class="legal-screen">
      <div class="legal-head">
        <a class="legal-back" href="#home">← חזרה לדף הבית</a>
        <h1>מידע, פרטיות ותנאי שימוש</h1>
        <p class="legal-draft-note">המסמך הזה מנוסח בשפה פשוטה ומתאר כיצד גזרוני עובד בפועל. זוהי טיוטה ראשונית — לפני השקה ציבורית מומלץ לעבור עליה עם עורך/ת דין.</p>
      </div>

      <section class="legal-section" id="about" aria-labelledby="about-title">
        <h2 id="about-title">מה זה גזרוני</h2>
        <p>גזרוני הוא לוח משקים ישראלי. אנחנו מציגים מי מגדל מה, באיזה מחיר ובאיזה אזור, ומאפשרים לפנות ישירות לחקלאי. גזרוני אינו חנות: אין עגלת קנייה, אין תשלום באתר ואין הזמנות. כל עסקה נסגרת ישירות בינך לבין החקלאי.</p>
      </section>

      <section class="legal-section" id="privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title">מדיניות פרטיות</h2>
        <p>הגלישה בלוח המשקים ובמחירים אינה דורשת הרשמה ואינה דורשת מסירת פרטים אישיים.</p>
        <p><strong>התחברות עם Google:</strong> אם תבחרו להתחבר, אנו מקבלים מחשבון Google שלכם את השם, כתובת האימייל ותמונת הפרופיל. אנו משתמשים בהם כדי לזהות את החשבון, לשמור משקים מועדפים ולנהל הרשאות (לקוח / חקלאי / מנהל).</p>
        <p><strong>נתוני חקלאים:</strong> חקלאי שמגיש בקשה מספק את פרטי המשק, התוצרת, המחירים ופרטי הקשר. פרטים אלה מוצגים בפומבי בלוח לאחר אישור.</p>
        <p><strong>אחסון:</strong> הנתונים נשמרים בשירותי Firebase של Google. איננו מוכרים מידע אישי לצדדים שלישיים.</p>
        <p>בכל בקשה למחיקת חשבון או נתונים אפשר לפנות אלינו דרך פרטי יצירת הקשר.</p>
      </section>

      <section class="legal-section" id="terms" aria-labelledby="terms-title">
        <h2 id="terms-title">תנאי שימוש</h2>
        <p>גזרוני מחבר בין צרכנים לחקלאים ואינו צד לעסקה ביניהם. איננו אחראים לאיכות התוצרת, לדיוק המחירים, לזמינות או לתיאומים שנעשים ישירות מול החקלאי.</p>
        <p>החקלאים אחראים לעדכן את פרטי המשק, המחירים והזמינות שלהם. ייתכנו פערים בין המידע בלוח לבין המצב בפועל אצל החקלאי.</p>
        <p>השימוש בלוח הוא לצרכים אישיים והוגנים בלבד. אין לעשות שימוש לרעה בפרטי הקשר של החקלאים (כגון דיוור המוני או הטרדה).</p>
        <p>אנו עשויים לעדכן את התנאים מעת לעת. המשך השימוש לאחר עדכון מהווה הסכמה לתנאים המעודכנים.</p>
      </section>

      <section class="legal-section" id="contact" aria-labelledby="contact-title">
        <h2 id="contact-title">יצירת קשר</h2>
        <p>לשאלות, דיווח על מודעה או בקשות בנושא פרטיות${CONTACT_EMAIL ? ':' : ' — פרטי יצירת הקשר יתעדכנו כאן בקרוב.'}</p>
        ${CONTACT_EMAIL ? `<a class="legal-contact-link" href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>` : ''}
      </section>
    </div>
  `;

  return () => {};
}
