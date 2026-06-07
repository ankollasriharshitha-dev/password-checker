/* =====================================================
   script.js — PassGuard v2.0
   Features:
     · Live password strength analysis
     · Crack time estimation
     · Random strong password generator
     · Copy to clipboard
     · Dark / Light mode toggle
     · Loading animation while checking
     · Full keyboard accessibility
   ===================================================== */


/* ══════════════════════════════════════════════════════
   SECTION 1 — GRAB HTML ELEMENTS
   ══════════════════════════════════════════════════════ */

const passwordInput   = document.getElementById('password-input');
const toggleBtn       = document.getElementById('toggle-btn');
const iconEyeOpen     = document.getElementById('icon-eye-open');
const iconEyeClosed   = document.getElementById('icon-eye-closed');

const progressBar     = document.getElementById('progress-bar');
const strengthText    = document.getElementById('strength-text');

const segments = [
  document.getElementById('seg-1'),
  document.getElementById('seg-2'),
  document.getElementById('seg-3'),
  document.getElementById('seg-4'),
];

const crackTimeValue  = document.getElementById('crack-time-value');
const crackTimeSub    = document.getElementById('crack-time-sub');

const loadingBar      = document.getElementById('loading-bar');
const loadingFill     = document.getElementById('loading-fill');

const generateBtn     = document.getElementById('generate-btn');
const copyBtn         = document.getElementById('copy-btn');
const copyIconDefault = document.getElementById('copy-icon-default');
const copyIconDone    = document.getElementById('copy-icon-done');
const copyBtnLabel    = document.getElementById('copy-btn-label');

const themeToggle     = document.getElementById('theme-toggle');
const iconMoon        = document.querySelector('.theme-icon--moon');
const iconSun         = document.querySelector('.theme-icon--sun');
const themeLabel      = document.querySelector('.theme-toggle__label');

const RULES_MAP = {
  length      : document.getElementById('rule-length'),
  lengthGreat : document.getElementById('rule-length-great'),
  uppercase   : document.getElementById('rule-uppercase'),
  lowercase   : document.getElementById('rule-lowercase'),
  number      : document.getElementById('rule-number'),
  special     : document.getElementById('rule-special'),
};


/* ══════════════════════════════════════════════════════
   SECTION 2 — STRENGTH LEVEL CONFIG
   ══════════════════════════════════════════════════════ */

const LEVELS = [
  { label:'— type to begin', cssClass:'',          width:'0%',   segsLit:0 },
  { label:'Very Weak',       cssClass:'is-weak',   width:'16%',  segsLit:1 },
  { label:'Weak',            cssClass:'is-weak',   width:'28%',  segsLit:1 },
  { label:'Fair',            cssClass:'is-fair',   width:'48%',  segsLit:2 },
  { label:'Good',            cssClass:'is-good',   width:'66%',  segsLit:3 },
  { label:'Strong',          cssClass:'is-strong', width:'83%',  segsLit:4 },
  { label:'Very Strong',     cssClass:'is-great',  width:'100%', segsLit:4 },
];

const ALL_CLASSES = ['is-weak','is-fair','is-good','is-strong','is-great'];


/* ══════════════════════════════════════════════════════
   SECTION 3 — RULE CHECKING
   ══════════════════════════════════════════════════════ */

function checkRules(password) {
  return {
    length      : password.length >= 8,
    lengthGreat : password.length >= 12,
    uppercase   : /[A-Z]/.test(password),
    lowercase   : /[a-z]/.test(password),
    number      : /[0-9]/.test(password),
    /* [^A-Za-z0-9] means "any character that is NOT a letter or digit" */
    special     : /[^A-Za-z0-9]/.test(password),
  };
}


/* ══════════════════════════════════════════════════════
   SECTION 4 — SCORE CALCULATION
   ══════════════════════════════════════════════════════ */

function calculateScore(rules, password) {
  if (!password) return 0;
  let score = 0;
  if (rules.length)      score++;
  if (rules.uppercase)   score++;
  if (rules.lowercase)   score++;
  if (rules.number)      score++;
  if (rules.special)     score++;
  if (rules.lengthGreat) score++;   /* bonus point for 12+ chars */
  return score;                     /* 0 to 6 */
}


/* ══════════════════════════════════════════════════════
   SECTION 5 — CRACK TIME ESTIMATION
   How it works:
     - We calculate the character "pool" size
       (how many possible characters were used)
     - Then: total combinations = pool ^ passwordLength
     - At 10 billion guesses/second, divide to get seconds
     - Convert seconds into a human-readable label
   ══════════════════════════════════════════════════════ */

function estimateCrackTime(password) {
  if (!password) return { label: '—', sub: 'Enter a password to see crack time estimation', cssClass: '' };

  /* Step 1: Work out how large the character pool is */
  let pool = 0;
  if (/[a-z]/.test(password))      pool += 26;  /* a–z          */
  if (/[A-Z]/.test(password))      pool += 26;  /* A–Z          */
  if (/[0-9]/.test(password))      pool += 10;  /* 0–9          */
  if (/[^A-Za-z0-9]/.test(password)) pool += 32; /* symbols      */
  if (pool === 0) pool = 26;                     /* fallback     */

  /* Step 2: Total possible combinations */
  /* We use logarithms to avoid Infinity with very long passwords:
     combinations = pool ^ length → log10(combinations) = length * log10(pool) */
  const log10combinations = password.length * Math.log10(pool);

  /* Step 3: Guesses per second (modern offline attack rate) */
  /* 10 billion = 10^10 guesses/second */
  const log10guessesPerSec = 10;

  /* Step 4: Seconds to crack = combinations / guesses_per_second
     In log10: log10(seconds) = log10(combinations) - log10(guessesPerSec) */
  const log10seconds = log10combinations - log10guessesPerSec;
  const seconds      = Math.pow(10, log10seconds);

  /* Step 5: Convert to human-readable label */
  const MINUTE = 60;
  const HOUR   = 3600;
  const DAY    = 86400;
  const WEEK   = 604800;
  const MONTH  = 2592000;
  const YEAR   = 31536000;
  const CENTURY= YEAR * 100;
  const MILLION_YEARS = YEAR * 1_000_000;

  let label, sub, cssClass;

  if (seconds < 1) {
    label    = 'Instant';
    sub      = 'This password would be cracked immediately. Choose something much longer.';
    cssClass = 'is-weak';
  } else if (seconds < MINUTE) {
    label    = `${Math.round(seconds)} second${Math.round(seconds) === 1 ? '' : 's'}`;
    sub      = 'Still extremely fast to crack. Add more characters and variety.';
    cssClass = 'is-weak';
  } else if (seconds < HOUR) {
    label    = `${Math.round(seconds / MINUTE)} minute${Math.round(seconds / MINUTE) === 1 ? '' : 's'}`;
    sub      = 'A weak password. Automated tools crack these in minutes.';
    cssClass = 'is-weak';
  } else if (seconds < DAY) {
    label    = `${Math.round(seconds / HOUR)} hour${Math.round(seconds / HOUR) === 1 ? '' : 's'}`;
    sub      = 'Still vulnerable overnight. Add uppercase, numbers, or symbols.';
    cssClass = 'is-fair';
  } else if (seconds < WEEK) {
    label    = `${Math.round(seconds / DAY)} day${Math.round(seconds / DAY) === 1 ? '' : 's'}`;
    sub      = 'Getting better, but still crackable within a week.';
    cssClass = 'is-fair';
  } else if (seconds < MONTH) {
    label    = `${Math.round(seconds / WEEK)} week${Math.round(seconds / WEEK) === 1 ? '' : 's'}`;
    sub      = 'Decent, but for sensitive accounts aim for years.';
    cssClass = 'is-good';
  } else if (seconds < YEAR) {
    label    = `${Math.round(seconds / MONTH)} month${Math.round(seconds / MONTH) === 1 ? '' : 's'}`;
    sub      = 'A reasonably strong password. Consider going longer.';
    cssClass = 'is-good';
  } else if (seconds < CENTURY) {
    const years = Math.round(seconds / YEAR);
    label    = `${years.toLocaleString()} year${years === 1 ? '' : 's'}`;
    sub      = 'Strong! This would take years to crack with current hardware.';
    cssClass = 'is-strong';
  } else if (seconds < MILLION_YEARS) {
    label    = 'Centuries';
    sub      = 'Excellent. This password would take centuries to crack.';
    cssClass = 'is-strong';
  } else {
    label    = 'Practically uncrackable';
    sub      = '🔐 Outstanding. This password is virtually impossible to brute-force.';
    cssClass = 'is-great';
  }

  return { label, sub, cssClass };
}


/* ══════════════════════════════════════════════════════
   SECTION 6 — DOM UPDATE HELPERS
   ══════════════════════════════════════════════════════ */

/* Update the coloured fill bar */
function updateProgressBar(level) {
  progressBar.classList.remove(...ALL_CLASSES);
  progressBar.style.width = level.width;
  if (level.cssClass) progressBar.classList.add(level.cssClass);
  progressBar.parentElement.setAttribute('aria-valuenow', parseInt(level.width) || 0);
}

/* Light up segment dots */
function updateSegments(level) {
  segments.forEach((seg, i) => {
    seg.classList.remove('lit', ...ALL_CLASSES);
    if (i < level.segsLit) {
      seg.classList.add('lit');
      if (level.cssClass) seg.classList.add(level.cssClass);
    }
  });
}

/* Fade-swap the strength label */
function updateStrengthText(level) {
  strengthText.style.opacity   = '0';
  strengthText.style.transform = 'translateY(-4px)';
  setTimeout(() => {
    strengthText.textContent = level.label;
    strengthText.classList.remove(...ALL_CLASSES);
    if (level.cssClass) strengthText.classList.add(level.cssClass);
    strengthText.style.opacity   = '1';
    strengthText.style.transform = 'translateY(0)';
  }, 120);
}
strengthText.style.transition = 'opacity 0.12s ease, transform 0.12s ease, color 0.28s ease';

/* Update crack time panel */
function updateCrackTime(crack) {
  crackTimeValue.textContent = crack.label;
  crackTimeSub.textContent   = crack.sub;
  crackTimeValue.classList.remove(...ALL_CLASSES);
  if (crack.cssClass) crackTimeValue.classList.add(crack.cssClass);
}

/* Mark/unmark each requirement pill */
function updateRules(rules) {
  Object.entries(RULES_MAP).forEach(([key, el]) => {
    const isMet  = rules[key];
    const check  = el.querySelector('.rule__check');
    const wasMet = el.classList.contains('is-met');

    if (isMet) {
      if (!wasMet) {
        /* Restart the bounce animation */
        check.style.animation = 'none';
        void check.offsetWidth;  /* force browser to notice the reset */
        check.style.animation = '';
      }
      el.classList.add('is-met');
    } else {
      el.classList.remove('is-met');
    }
  });
}

/* Monospace font class when input has a value */
function updateInputStyle() {
  if (passwordInput.value.length > 0) {
    passwordInput.classList.add('has-value');
  } else {
    passwordInput.classList.remove('has-value');
  }
}

/* Enable / disable the copy button */
function updateCopyButton() {
  copyBtn.disabled = passwordInput.value.length === 0;
}


/* ══════════════════════════════════════════════════════
   SECTION 7 — LOADING ANIMATION
   Shows a scanning bar for ~600ms to give visual
   feedback that the password is being "analysed".
   ══════════════════════════════════════════════════════ */

let loadingTimer = null;

function showLoading() {
  /* Clear any previous timer */
  clearTimeout(loadingTimer);

  /* Reset and show the bar */
  loadingFill.classList.remove('is-scanning');
  void loadingFill.offsetWidth;              /* force reflow to restart animation */
  loadingBar.classList.add('is-active');
  loadingFill.classList.add('is-scanning');

  /* Hide after animation completes */
  loadingTimer = setTimeout(() => {
    loadingBar.classList.remove('is-active');
  }, 700);
}


/* ══════════════════════════════════════════════════════
   SECTION 8 — MAIN ANALYZE FUNCTION
   Called on every keystroke.
   ══════════════════════════════════════════════════════ */

function analyzePassword() {
  const password = passwordInput.value;

  /* Show loading animation */
  if (password.length > 0) showLoading();

  const rules = checkRules(password);
  const score = calculateScore(rules, password);
  const level = LEVELS[score];
  const crack = estimateCrackTime(password);

  updateProgressBar(level);
  updateSegments(level);
  updateStrengthText(level);
  updateCrackTime(crack);
  updateRules(rules);
  updateInputStyle();
  updateCopyButton();
}


/* ══════════════════════════════════════════════════════
   SECTION 9 — SHOW / HIDE PASSWORD
   ══════════════════════════════════════════════════════ */

function toggleVisibility() {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';

  iconEyeOpen.classList.toggle('hidden',   isHidden);
  iconEyeClosed.classList.toggle('hidden', !isHidden);
  toggleBtn.setAttribute('aria-label', isHidden ? 'Hide password' : 'Show password');

  passwordInput.focus();
}


/* ══════════════════════════════════════════════════════
   SECTION 10 — RANDOM PASSWORD GENERATOR
   Builds a guaranteed-strong password by:
     1. Picking one character from each required group
     2. Filling the rest with random chars from the full pool
     3. Shuffling everything so the guaranteed chars
        don't always appear at the start
   ══════════════════════════════════════════════════════ */

function generatePassword() {
  const UPPER   = 'ABCDEFGHJKLMNPQRSTUVWXYZ';    /* removed confusable O,I */
  const LOWER   = 'abcdefghjkmnpqrstuvwxyz';      /* removed confusable l,o */
  const DIGITS  = '23456789';                     /* removed confusable 0,1 */
  const SYMBOLS = '!@#$%^&*-_=+?';
  const ALL     = UPPER + LOWER + DIGITS + SYMBOLS;

  const LENGTH  = 16;

  /* Guarantee at least one from each group */
  const guaranteed = [
    UPPER  [Math.floor(Math.random() * UPPER.length)],
    LOWER  [Math.floor(Math.random() * LOWER.length)],
    DIGITS [Math.floor(Math.random() * DIGITS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  ];

  /* Fill remaining slots from the full pool */
  const rest = Array.from({ length: LENGTH - guaranteed.length }, () =>
    ALL[Math.floor(Math.random() * ALL.length)]
  );

  /* Combine and shuffle using Fisher-Yates algorithm */
  const combined = [...guaranteed, ...rest];
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }

  return combined.join('');
}

function handleGenerate() {
  /* Spin the icon for tactile feedback */
  generateBtn.classList.add('is-spinning');
  setTimeout(() => generateBtn.classList.remove('is-spinning'), 650);

  const newPassword       = generatePassword();
  passwordInput.value     = newPassword;
  passwordInput.type      = 'text';         /* reveal it so user can see it    */
  iconEyeOpen.classList.add('hidden');
  iconEyeClosed.classList.remove('hidden');
  toggleBtn.setAttribute('aria-label', 'Hide password');

  analyzePassword();
  passwordInput.focus();
}


/* ══════════════════════════════════════════════════════
   SECTION 11 — COPY TO CLIPBOARD
   Uses the modern navigator.clipboard API.
   Falls back gracefully if not available.
   ══════════════════════════════════════════════════════ */

let copyResetTimer = null;

async function handleCopy() {
  const text = passwordInput.value;
  if (!text) return;

  try {
    await navigator.clipboard.writeText(text);
    showCopiedState();
  } catch {
    /* Fallback for older browsers */
    passwordInput.select();
    document.execCommand('copy');
    showCopiedState();
  }
}

function showCopiedState() {
  copyIconDefault.classList.add('hidden');
  copyIconDone.classList.remove('hidden');
  copyBtnLabel.textContent = 'Copied!';
  copyBtn.classList.add('is-copied');
  copyBtn.setAttribute('aria-label', 'Password copied to clipboard');

  /* Reset after 2 seconds */
  clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    copyIconDefault.classList.remove('hidden');
    copyIconDone.classList.add('hidden');
    copyBtnLabel.textContent = 'Copy';
    copyBtn.classList.remove('is-copied');
    copyBtn.setAttribute('aria-label', 'Copy password to clipboard');
  }, 2000);
}


/* ══════════════════════════════════════════════════════
   SECTION 12 — DARK / LIGHT MODE TOGGLE
   Stores the user's preference in localStorage so it
   persists the next time they visit the page.
   ══════════════════════════════════════════════════════ */

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  if (theme === 'light') {
    iconMoon.classList.add('hidden');
    iconSun.classList.remove('hidden');
    themeLabel.textContent = 'Dark';
    themeToggle.setAttribute('aria-label', 'Switch to dark mode');
  } else {
    iconMoon.classList.remove('hidden');
    iconSun.classList.add('hidden');
    themeLabel.textContent = 'Light';
    themeToggle.setAttribute('aria-label', 'Switch to light mode');
  }

  /* Remember the choice */
  try { localStorage.setItem('passguard-theme', theme); } catch {}
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

/* Load saved theme on startup */
function loadSavedTheme() {
  try {
    const saved = localStorage.getItem('passguard-theme');
    if (saved === 'light' || saved === 'dark') {
      applyTheme(saved);
      return;
    }
  } catch {}

  /* Fall back to OS preference */
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(prefersDark ? 'dark' : 'light');
}


/* ══════════════════════════════════════════════════════
   SECTION 13 — KEYBOARD ACCESSIBILITY
   Extra keyboard shortcuts beyond default tab/focus:
     · Enter or Space on the eye button → toggle
     · Enter on Generate button → generate
     · Enter on Copy button → copy
     · Escape in the input → clear it
   ══════════════════════════════════════════════════════ */

passwordInput.addEventListener('keydown', (e) => {
  /* Escape clears the input */
  if (e.key === 'Escape') {
    passwordInput.value = '';
    analyzePassword();
  }
});

/* Make tip cards keyboard-clickable (they have tabindex="0") */
document.querySelectorAll('.tip-card').forEach(card => {
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      card.click();
    }
  });
});


/* ══════════════════════════════════════════════════════
   SECTION 14 — EVENT LISTENERS
   ══════════════════════════════════════════════════════ */

passwordInput.addEventListener('input',  analyzePassword);
toggleBtn    .addEventListener('click',  toggleVisibility);
generateBtn  .addEventListener('click',  handleGenerate);
copyBtn      .addEventListener('click',  handleCopy);
themeToggle  .addEventListener('click',  toggleTheme);


/* ══════════════════════════════════════════════════════
   SECTION 15 — INITIALISE ON PAGE LOAD
   ══════════════════════════════════════════════════════ */

loadSavedTheme();   /* apply saved or OS theme */
analyzePassword();  /* set correct empty state  */