// 🛡️ GÜVENLIK MODÜLÜ
// XSS, Input Validation ve diğer güvenlik fonksiyonları

// ============================================
// 1. XSS KORUMASI (HTML Sanitization)
// ============================================

/**
 * HTML karakterlerini escape eder (XSS koruması)
 * @param {string} text - Temizlenecek metin
 * @returns {string} - Güvenli metin
 */
function escapeHtml(text) {
  if (!text) return '';
  
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * HTML'den tehlikeli tagları temizler
 * @param {string} html - Temizlenecek HTML
 * @returns {string} - Güvenli HTML
 */
function sanitizeHtml(html) {
  if (!html) return '';
  
  // İzin verilen taglar
  const allowedTags = ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'span'];
  
  // Geçici div oluştur
  const temp = document.createElement('div');
  temp.innerHTML = html;
  
  // Tüm elementleri kontrol et
  const elements = temp.querySelectorAll('*');
  elements.forEach(el => {
    // İzin verilmeyen tag ise kaldır
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      el.remove();
    }
    
    // Tüm attributeleri kaldır (onclick, onerror vb.)
    Array.from(el.attributes).forEach(attr => {
      el.removeAttribute(attr.name);
    });
  });
  
  return temp.innerHTML;
}

/**
 * Güvenli şekilde innerHTML yerine kullan
 * @param {HTMLElement} element - Hedef element
 * @param {string} content - İçerik
 */
function safeSetInnerHTML(element, content) {
  if (!element) return;
  
  // Script taglarını temizle
  const cleaned = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Tehlikeli event handler'ları temizle
  const safe = cleaned.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  element.innerHTML = safe;
}

// ============================================
// 2. INPUT VALIDATION
// ============================================

/**
 * Email validasyonu
 * @param {string} email - Kontrol edilecek email
 * @returns {boolean} - Geçerli mi?
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  
  // RFC 5322 uyumlu regex (basitleştirilmiş)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Şifre güvenlik kontrolü
 * @param {string} password - Kontrol edilecek şifre
 * @returns {object} - {valid: boolean, errors: string[]}
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Şifre gerekli'] };
  }
  
  if (password.length < 8) {
    errors.push('Şifre en az 8 karakter olmalı');
  }
  
  if (password.length > 128) {
    errors.push('Şifre en fazla 128 karakter olabilir');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('En az bir küçük harf içermeli');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('En az bir büyük harf içermeli');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('En az bir rakam içermeli');
  }
  
  // Yaygın şifreler listesi
  const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Çok yaygın bir şifre, daha güçlü bir şifre seçin');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Kullanıcı adı validasyonu
 * @param {string} name - Kontrol edilecek isim
 * @returns {object} - {valid: boolean, error: string}
 */
function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'İsim gerekli' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'İsim en az 2 karakter olmalı' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'İsim en fazla 100 karakter olabilir' };
  }
  
  // Sadece harf, boşluk ve bazı özel karakterler
  if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$/.test(trimmed)) {
    return { valid: false, error: 'İsim sadece harf içerebilir' };
  }
  
  return { valid: true, error: null };
}

/**
 * Kelime/klasör adı validasyonu
 * @param {string} text - Kontrol edilecek metin
 * @param {number} maxLength - Maksimum uzunluk
 * @returns {object} - {valid: boolean, error: string}
 */
function validateText(text, maxLength = 500) {
  if (!text || typeof text !== 'string') {
    return { valid: false, error: 'Metin gerekli' };
  }
  
  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Metin boş olamaz' };
  }
  
  if (trimmed.length > maxLength) {
    return { valid: false, error: `Metin en fazla ${maxLength} karakter olabilir` };
  }
  
  // SQL injection karakterlerini kontrol et
  const dangerousChars = /[<>'"`;\\]/;
  if (dangerousChars.test(trimmed)) {
    return { valid: false, error: 'Geçersiz karakterler içeriyor' };
  }
  
  return { valid: true, error: null };
}

// ============================================
// 3. RATE LIMITING (Client-side)
// ============================================

class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }
  
  /**
   * İstek yapılabilir mi kontrol et
   * @param {string} key - Unique key (örn: 'login', 'register')
   * @returns {boolean} - İzin var mı?
   */
  canMakeRequest(key) {
    const now = Date.now();
    const userRequests = this.requests.get(key) || [];
    
    // Eski istekleri temizle
    const recentRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }
    
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }
  
  /**
   * Kalan süreyi al
   * @param {string} key - Unique key
   * @returns {number} - Kalan milisaniye
   */
  getTimeUntilReset(key) {
    const userRequests = this.requests.get(key) || [];
    if (userRequests.length === 0) return 0;
    
    const oldestRequest = Math.min(...userRequests);
    const resetTime = oldestRequest + this.windowMs;
    return Math.max(0, resetTime - Date.now());
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(10, 60000); // 10 istek/dakika

// ============================================
// 4. CSRF TOKEN (Basit implementasyon)
// ============================================

/**
 * CSRF token oluştur
 * @returns {string} - Random token
 */
function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * CSRF token'ı session'a kaydet
 */
function setCSRFToken() {
  const token = generateCSRFToken();
  sessionStorage.setItem('csrf_token', token);
  return token;
}

/**
 * CSRF token'ı doğrula
 * @param {string} token - Kontrol edilecek token
 * @returns {boolean} - Geçerli mi?
 */
function validateCSRFToken(token) {
  const storedToken = sessionStorage.getItem('csrf_token');
  return token === storedToken;
}

// ============================================
// 5. SECURE STORAGE (LocalStorage şifreleme)
// ============================================

/**
 * Basit XOR şifreleme (gerçek projede AES kullan)
 * @param {string} text - Şifrelenecek metin
 * @param {string} key - Şifreleme anahtarı
 * @returns {string} - Şifrelenmiş metin
 */
function simpleEncrypt(text, key) {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(result); // Base64 encode
}

/**
 * Basit XOR şifre çözme
 * @param {string} encrypted - Şifrelenmiş metin
 * @param {string} key - Şifreleme anahtarı
 * @returns {string} - Orijinal metin
 */
function simpleDecrypt(encrypted, key) {
  const text = atob(encrypted); // Base64 decode
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

/**
 * Güvenli LocalStorage set
 * @param {string} key - Anahtar
 * @param {any} value - Değer
 */
function secureSetItem(key, value) {
  const encryptionKey = 'your-secret-key-here'; // Production'da env'den al
  const encrypted = simpleEncrypt(JSON.stringify(value), encryptionKey);
  localStorage.setItem(key, encrypted);
}

/**
 * Güvenli LocalStorage get
 * @param {string} key - Anahtar
 * @returns {any} - Değer
 */
function secureGetItem(key) {
  const encryptionKey = 'your-secret-key-here';
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  
  try {
    const decrypted = simpleDecrypt(encrypted, encryptionKey);
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// ============================================
// 6. CONTENT SECURITY POLICY
// ============================================

/**
 * CSP meta tag ekle
 */
function setContentSecurityPolicy() {
  const meta = document.createElement('meta');
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.jsonbin.io",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  
  document.head.appendChild(meta);
}

// ============================================
// EXPORT
// ============================================

// Global scope'a ekle
window.Security = {
  // XSS
  escapeHtml,
  sanitizeHtml,
  safeSetInnerHTML,
  
  // Validation
  isValidEmail,
  validatePassword,
  validateName,
  validateText,
  
  // Rate Limiting
  rateLimiter,
  
  // CSRF
  generateCSRFToken,
  setCSRFToken,
  validateCSRFToken,
  
  // Secure Storage
  secureSetItem,
  secureGetItem,
  
  // CSP
  setContentSecurityPolicy
};

// Sayfa yüklendiğinde CSP'yi ayarla
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setContentSecurityPolicy);
} else {
  setContentSecurityPolicy();
}

console.log('🛡️ Security module loaded');
