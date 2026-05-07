// Global değişkenler
let currentUser = null;
let currentUserData = null;
let userData = {};
let currentQuiz = null;
let currentQuizIndex = 0;
let quizScore = 0;
let currentFolderId = null;
let currentWordId = null;
let currentQuizFolder = null;

// Dark Mode
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// JSONBin.io API Configuration
const JSONBIN_API_KEY = '$2a$10$IS0Es2Ec/.haFHLCZz/8Kel4jCbrkJy9xCqe0SXTBGdqnsoZN7Qx.';
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

// Debug function
function debugLog(message, data = null) {
    console.log(`[DEBUG] ${message}`, data);
}

// Dil sistemi
let currentLanguage = localStorage.getItem('appLanguage') || 'tr';

// Çeviri verileri (tam)
const translations = {
    tr: {
        appTitle: "Bildiklerini Unutma",
        welcome: "Hoş geldin",
        dashboard: "Ana Sayfa",
        folders: "Klasörler",
        quiz: "Quiz",
        stats: "İstatistik",
        admin: "Admin",
        login: "Giriş Yap",
        register: "Kayıt Ol",
        logout: "Çıkış",
        save: "Kaydet",
        cancel: "İptal",
        delete: "Sil",
        edit: "Düzenle",
        create: "Oluştur",
        // Form labels
        name: "İsim",
        email: "E-mail",
        password: "Şifre",
        confirmPassword: "Şifre Tekrar",
        // Buttons
        startQuiz: "Quiz Başlat",
        addWord: "Kelime Ekle",
        addFolder: "Klasör Ekle",
        backToFolders: "Klasörlere Dön",
        // Stats
        totalWords: "Toplam Kelime",
        dueToday: "Bugün Tekrar",
        masteredWords: "Öğrenilen",
        streak: "Seri",
        // Quiz
        question: "Soru",
        answer: "Cevap",
        correct: "Doğru",
        incorrect: "Yanlış",
        easy: "Kolay",
        medium: "Orta",
        hard: "Zor",
        // Notifications
        testNotification: "Test Bildirimi",
        notificationPermission: "Bildirim İzni",
        // Other
        words: "kelime",
        folders: "klasör",
        empty: "Boş",
        loading: "Yükleniyor",
        error: "Hata",
        success: "Başarılı"
    },
    en: {
        appTitle: "Don't Forget What You Know",
        welcome: "Welcome",
        dashboard: "Dashboard",
        folders: "Folders",
        quiz: "Quiz",
        stats: "Statistics",
        admin: "Admin",
        login: "Login",
        register: "Register",
        logout: "Logout",
        save: "Save",
        cancel: "Cancel",
        delete: "Delete",
        edit: "Edit",
        create: "Create",
        // Form labels
        name: "Name",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        // Buttons
        startQuiz: "Start Quiz",
        addWord: "Add Word",
        addFolder: "Add Folder",
        backToFolders: "Back to Folders",
        // Stats
        totalWords: "Total Words",
        dueToday: "Due Today",
        masteredWords: "Mastered",
        streak: "Streak",
        // Quiz
        question: "Question",
        answer: "Answer",
        correct: "Correct",
        incorrect: "Incorrect",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        // Notifications
        testNotification: "Test Notification",
        notificationPermission: "Notification Permission",
        // Other
        words: "words",
        folders: "folders",
        empty: "Empty",
        loading: "Loading",
        error: "Error",
        success: "Success"
    }
};

// Çeviri fonksiyonu
function t(key) {
    return translations[currentLanguage][key] || translations['tr'][key] || key;
}
// Kelime dilleri
const wordLanguages = {
    'tr': { name: 'Türkçe', flag: '🇹🇷' },
    'en': { name: 'İngilizce', flag: '🇺🇸' },
    'fr': { name: 'Fransızca', flag: '🇫🇷' },
    'ko': { name: 'Korece', flag: '🇰🇷' },
    'ku': { name: 'Kürtçe', flag: '🟡' },
    'es': { name: 'İspanyolca', flag: '🇪🇸' },
    'ar': { name: 'Arapça', flag: '🇸🇦' }
};

// Zorluk ayarları
const difficultySettings = { easy: 5, medium: 3, hard: 1 };
const reviewIntervals = [1, 3, 7, 30, 90, 180];

// Dark Mode Functions
function initTheme() {
    if (isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('themeIcon').textContent = '☀️';
    } else {
        document.documentElement.removeAttribute('data-theme');
        document.getElementById('themeIcon').textContent = '🌙';
    }
}

function toggleTheme() {
    isDarkMode = !isDarkMode;
    localStorage.setItem('darkMode', isDarkMode);
    initTheme();
    showNotification(isDarkMode ? '🌙 Karanlık tema aktif!' : '☀️ Aydınlık tema aktif!', 'success');
}

// Language Functions
const languageFlags = {
    'tr': '🇹🇷',
    'en': '🇺🇸', 
    'fr': '🇫🇷',
    'es': '🇪🇸',
    'ar': '🇸🇦'
};

const languageOrder = ['tr', 'en', 'fr', 'es', 'ar'];

function initLanguage() {
    document.getElementById('languageIcon').textContent = languageFlags[currentLanguage];
    updateAllTexts();
}

function toggleLanguage() {
    const currentIndex = languageOrder.indexOf(currentLanguage);
    const nextIndex = (currentIndex + 1) % languageOrder.length;
    currentLanguage = languageOrder[nextIndex];
    localStorage.setItem('appLanguage', currentLanguage);
    initLanguage();
    showNotification(`${languageFlags[currentLanguage]} ${translations[currentLanguage].appTitle}`, 'success');
}

function updateAllTexts() {
    // Temel elementleri güncelle
    const elements = [
        { id: 'introTitle', key: 'appTitle' },
        { id: 'dashboardTab', key: 'dashboard' },
        { id: 'foldersTab', key: 'folders' },
        { id: 'quizTab', key: 'quiz' },
        { id: 'statsTab', key: 'stats' },
        { id: 'adminTab', key: 'admin', prefix: '👑 ' }
    ];
    
    elements.forEach(element => {
        const el = document.getElementById(element.id);
        if (el) {
            el.textContent = (element.prefix || '') + t(element.key);
        }
    });

    // Update any existing content that needs translation
    updateDynamicTexts();
}

// Helper function to update dynamic texts
function updateDynamicTexts() {
    // Update current user welcome message
    const currentUserEl = document.getElementById('currentUser');
    if (currentUserEl && currentUserData) {
        currentUserEl.textContent = `${t('welcome')}, ${currentUserData.name}!`;
    }

    // Update any visible modal titles
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle && !modalTitle.classList.contains('hidden')) {
        if (currentWordId) {
            modalTitle.textContent = t('edit') + ' ' + t('words');
        } else {
            modalTitle.textContent = t('addWord');
        }
    }

    // Update difficulty options
    const difficultySelect = document.getElementById('wordDifficultySelect');
    if (difficultySelect) {
        const options = difficultySelect.querySelectorAll('option');
        if (options.length >= 3) {
            options[0].textContent = t('easy');
            options[1].textContent = t('medium');
            options[2].textContent = t('hard');
        }
    }

    // Update word input placeholders
    const wordInput = document.getElementById('wordInput');
    const definitionInput = document.getElementById('definitionInput');
    if (wordInput) {
        wordInput.placeholder = currentLanguage === 'tr' ? 'Kelime/terim girin' : 'Enter word/term';
    }
    if (definitionInput) {
        definitionInput.placeholder = currentLanguage === 'tr' ? 'Anlamını/açıklamasını girin' : 'Enter meaning/definition';
    }
}
// PWA ve Bildirim Sistemi
let notificationPermission = false;

// Service Worker kaydet
if ('serviceWorker' in navigator) {
    const swCode = `
        self.addEventListener('install', event => {
            console.log('Service Worker installed');
        });
        
        self.addEventListener('activate', event => {
            console.log('Service Worker activated');
        });
    `;
    
    const blob = new Blob([swCode], { type: 'application/javascript' });
    const swUrl = URL.createObjectURL(blob);
    
    navigator.serviceWorker.register(swUrl).then(registration => {
        console.log('Service Worker registered');
    }).catch(error => {
        console.log('Service Worker registration failed');
    });
}

// Bildirim izni iste
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showNotification('⚠️ Bu tarayıcı bildirim desteklemiyor.', 'warning');
        return false;
    }

    if (Notification.permission === 'granted') {
        notificationPermission = true;
        showNotification('✅ Bildirimler zaten aktif!', 'success');
        return true;
    }

    if (Notification.permission === 'denied') {
        showNotification('❌ Bildirim izni reddedilmiş.', 'error');
        return false;
    }

    try {
        const permission = await Notification.requestPermission();
        notificationPermission = permission === 'granted';
        
        if (notificationPermission) {
            showNotification('✅ Bildirimler aktif!', 'success');
        } else {
            showNotification('⚠️ Bildirim izni verilmedi.', 'warning');
        }
        
        return notificationPermission;
    } catch (error) {
        showNotification('❌ Bildirim izni alınamadı.', 'error');
        return false;
    }
}

// Test bildirimi gönder
function sendTestNotification() {
    if (!('Notification' in window)) {
        alert('❌ Bu tarayıcı bildirim desteklemiyor!');
        return;
    }

    if (Notification.permission !== 'granted') {
        alert('❌ Bildirim izni verilmemiş!');
        requestNotificationPermission();
        return;
    }

    try {
        const notification = new Notification('🔔 Test Bildirimi', {
            body: 'Bu gerçek bir telefon bildirimi! Çalışıyor! 🎉',
            icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzc4MmY2Ii8+PHRleHQgeD0iMzIiIHk9IjQwIiBmb250LXNpemU9IjMwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+📚</dGV4dD48L3N2Zz4=',
            tag: 'test-notification',
            requireInteraction: false
        });

        notification.onclick = function() {
            window.focus();
            this.close();
            alert('Bildirime tıkladın! Sistem çalışıyor! 🎉');
        };

        showNotification('📱 Gerçek telefon bildirimi gönderildi!', 'success');
    } catch (error) {
        console.error('Bildirim hatası:', error);
        alert('❌ Bildirim gönderilirken hata: ' + error.message);
    }
}

// Sayfa yüklendiğinde tema ve dil uygula
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initLanguage();
    debugLog('Page loaded');
    
    // Giriş formu Enter tuşu desteği
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const registerName = document.getElementById('registerName');
    const registerEmail = document.getElementById('registerEmail');
    const registerPassword = document.getElementById('registerPassword');
    const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
    const folderNameInput = document.getElementById('folderNameInput');
    
    if (loginEmail) {
        loginEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loginUser();
        });
    }
    
    if (loginPassword) {
        loginPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') loginUser();
        });
    }
    
    if (registerName) {
        registerName.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') registerUser();
        });
    }
    
    if (registerEmail) {
        registerEmail.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') registerUser();
        });
    }
    
    if (registerPassword) {
        registerPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') registerUser();
        });
    }
    
    if (registerPasswordConfirm) {
        registerPasswordConfirm.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') registerUser();
        });
    }
    
    if (folderNameInput) {
        folderNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') createFolder();
        });
    }
});

// Giriş/Kayıt sekme değiştirme
function showLoginTab() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
    document.getElementById('loginTabBtn').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow-sm';
    document.getElementById('registerTabBtn').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-800';
}

function showRegisterTab() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
    document.getElementById('loginTabBtn').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-800';
    document.getElementById('registerTabBtn').className = 'flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors bg-white text-blue-600 shadow-sm';
}

// Tanıtım ekranından giriş ekranına geçiş
function showLoginScreen() {
    document.getElementById('introScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}
// Cloud Storage Functions
async function saveUserToCloud(email, userData) {
    try {
        const binName = `user_${email.replace('@', '_').replace(/\./g, '_')}`;
        debugLog('Creating bin with name', { binName, email });
        
        const response = await fetch(JSONBIN_BASE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY,
                'X-Bin-Name': binName
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        debugLog('User saved to cloud successfully', { binId: result.metadata.id, binName });
        localStorage.setItem(`binId_${email}`, result.metadata.id);
        return result;
    } catch (error) {
        debugLog('Save to cloud error', error);
        console.error('Save to cloud error:', error);
        throw error;
    }
}

async function loadUserFromCloud(email) {
    try {
        debugLog('Loading user from cloud', { email });
        let binId = localStorage.getItem(`binId_${email}`);
        
        if (!binId) {
            binId = await findBinIdByEmail(email);
            if (binId) {
                localStorage.setItem(`binId_${email}`, binId);
            }
        }

        if (!binId) {
            debugLog('No bin ID found for user');
            return null;
        }

        const response = await fetch(`${JSONBIN_BASE_URL}/${binId}`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            if (response.status === 404) {
                debugLog('User data not found (404)');
                return null;
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        debugLog('User data loaded successfully', { hasData: !!result.record });
        return result.record;
    } catch (error) {
        debugLog('Load from cloud error', error);
        console.error('Load from cloud error:', error);
        return null;
    }
}

async function findBinIdByEmail(email) {
    try {
        const binName = `user_${email.replace('@', '_').replace(/\./g, '_')}`;
        debugLog('Searching for bin name', { binName });
        
        const response = await fetch('https://api.jsonbin.io/v3/c/bins', {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const matchingBin = result.find(bin => bin.name === binName);
        
        if (matchingBin) {
            debugLog('Matching bin found', { binId: matchingBin.id });
            return matchingBin.id;
        }

        debugLog('No matching bin found');
        return null;
    } catch (error) {
        debugLog('Find bin ID error', error);
        console.error('Find bin ID error:', error);
        return null;
    }
}

async function updateUserInCloud(email, userData) {
    try {
        const binId = localStorage.getItem(`binId_${email}`);
        if (!binId) {
            throw new Error('Bin ID not found');
        }

        const response = await fetch(`${JSONBIN_BASE_URL}/${binId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify(userData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Update cloud error:', error);
        throw error;
    }
}
// Şifre hash fonksiyonu
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Kullanıcı kayıt
async function registerUser() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (!name || !email || !password || !passwordConfirm) {
        showNotification('❌ Tüm alanları doldurun!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('❌ Şifre en az 6 karakter olmalı!', 'error');
        return;
    }

    if (password !== passwordConfirm) {
        showNotification('❌ Şifreler eşleşmiyor!', 'error');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        showNotification('❌ Geçerli bir e-mail adresi girin!', 'error');
        return;
    }

    try {
        showNotification('🔄 Hesap oluşturuluyor...', 'info');
        
        const existingUser = await loadUserFromCloud(email);
        if (existingUser) {
            showNotification('❌ Bu e-mail ile zaten hesap var!', 'error');
            return;
        }

        const hashedPassword = await hashPassword(password);
        
        const newUserData = {
            name: name,
            email: email,
            password: hashedPassword,
            createdDate: new Date().toISOString(),
            lastLoginDate: new Date().toISOString(),
            folders: [],
            words: [],
            stats: {
                totalWords: 0,
                masteredWords: 0,
                reviewsCompleted: 0,
                streak: 0,
                lastStudyDate: null,
                studyDates: [],
                totalQuizzes: 0,
                averageScore: 0,
                bestStreak: 0,
                todayQuizzes: 0,
                activities: []
            }
        };

        await saveUserToCloud(email, newUserData);
        
        currentUser = email;
        currentUserData = newUserData;
        
        showMainApp();
        showNotification(`🎉 Hesabın oluşturuldu! Hoş geldin ${name}!`, 'success');

        // İlk kez giriş yapan kullanıcı için tutorial başlat
        if (!localStorage.getItem(`tutorial_completed_${currentUser}`)) {
            setTimeout(() => startTutorial(), 1000);
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('❌ Hesap oluşturulurken hata oluştu!', 'error');
    }
}

// Kullanıcı giriş
async function loginUser() {
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showNotification('❌ E-mail ve şifre gerekli!', 'error');
        return;
    }

    try {
        showNotification('🔄 Giriş yapılıyor...', 'info');
        
        const userData = await loadUserFromCloud(email);
        if (!userData) {
            showNotification('❌ Bu e-mail ile kayıtlı hesap bulunamadı!', 'error');
            return;
        }

        const hashedPassword = await hashPassword(password);
        if (userData.password !== hashedPassword) {
            showNotification('❌ Şifre yanlış!', 'error');
            return;
        }

        currentUser = email;
        currentUserData = userData;
        
        showMainApp();
        showNotification(`🎉 Hoş geldin ${userData.name}!`, 'success');
        
    } catch (error) {
        console.error('Login error:', error);
        showNotification('❌ Giriş yapılırken hata oluştu!', 'error');
    }
}

// Ana uygulamayı göster
function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUser').textContent = `${t('welcome')}, ${currentUserData.name}!`;
    
    loadUserData();
    updateAllTexts(); // Ensure all texts are translated
    renderDashboard();
    
    // Hoş geldin bildirimi
    setTimeout(() => {
        if (notificationPermission) {
            try {
                const welcomeTitle = currentLanguage === 'tr' ? '🎉 Hoş Geldin!' : '🎉 Welcome!';
                const welcomeBody = currentLanguage === 'tr' ? 
                    `Merhaba ${currentUserData.name}! Öğrenme yolculuğuna devam edelim.` :
                    `Hello ${currentUserData.name}! Let's continue your learning journey.`;
                    
                const notification = new Notification(welcomeTitle, {
                    body: welcomeBody,
                    icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2NCIgaGVpZ2h0PSI2NCI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMzc4MmY2Ii8+PHRleHQgeD0iMzIiIHk9IjQwIiBmb250LXNpemU9IjMwIiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+📚</dGV4dD48L3N2Zz4=',
                    tag: 'welcome-notification'
                });
                
                notification.onclick = function() {
                    window.focus();
                    this.close();
                };
            } catch (error) {
                console.error('Hoş geldin bildirimi hatası:', error);
            }
        }
        
        showNotification(`🎉 ${t('welcome')} ${currentUserData.name}!`, 'success');
    }, 500);
    
    checkNotifications();
    
    // İlk kez giriş yapıyorsa tanıtım turunu başlat
    if (shouldShowTutorial()) {
        setTimeout(() => startTutorial(), 1500);
    }
}

function logout() {
    currentUser = null;
    currentUserData = null;
    userData = {};
    
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('introScreen').classList.remove('hidden');
    
    // Formu temizle
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
    document.getElementById('registerName').value = '';
    document.getElementById('registerEmail').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPasswordConfirm').value = '';
    
    showLoginTab();
    showNotification(currentLanguage === 'tr' ? '👋 Başarıyla çıkış yaptın!' : '👋 Successfully logged out!', 'success');
}
// Veri yönetimi
function loadUserData() {
    if (currentUserData) {
        userData = {
            folders: currentUserData.folders || [],
            words: currentUserData.words || [],
            stats: currentUserData.stats || {
                totalWords: 0,
                masteredWords: 0,
                reviewsCompleted: 0,
                streak: 0,
                lastStudyDate: null,
                studyDates: [],
                totalQuizzes: 0,
                averageScore: 0,
                bestStreak: 0,
                todayQuizzes: 0,
                activities: []
            }
        };
        
        migrateToHierarchicalFolders();
        calculateStreak();
    }
}

function migrateToHierarchicalFolders() {
    userData.folders.forEach(folder => {
        if (!folder.parentId) folder.parentId = null;
        if (!folder.level) folder.level = 0;
        if (!folder.isExpanded) folder.isExpanded = true;
    });
}

function calculateStreak() {
    const today = new Date().toISOString().split('T')[0];
    const lastStudyDate = userData.stats.lastStudyDate;
    
    if (!lastStudyDate) {
        userData.stats.streak = 0;
        return;
    }
    
    const daysDiff = getDaysBetween(lastStudyDate, today);
    if (daysDiff > 1) {
        userData.stats.streak = 0;
    }
}

function recordStudySession() {
    const today = new Date().toISOString().split('T')[0];
    const lastStudyDate = userData.stats.lastStudyDate;
    
    if (lastStudyDate !== today) {
        const daysDiff = lastStudyDate ? getDaysBetween(lastStudyDate, today) : 999;
        
        if (daysDiff === 1) {
            userData.stats.streak++;
        } else if (daysDiff > 1 || !lastStudyDate) {
            userData.stats.streak = 1;
        }
        
        userData.stats.lastStudyDate = today;
        
        if (!userData.stats.studyDates) userData.stats.studyDates = [];
        userData.stats.studyDates.push(today);
        userData.stats.studyDates = userData.stats.studyDates.slice(-30);
        
        saveUserData();
        
        if (userData.stats.streak > 1) {
            showNotification(`🔥 Harika! ${userData.stats.streak} günlük serin devam ediyor!`, 'success');
        } else {
            showNotification(`🎯 Günlük çalışma serine başladın!`, 'success');
        }
    }
}

async function saveUserData() {
    if (!currentUser || !currentUserData) return;
    
    try {
        const updatedUserData = {
            ...currentUserData,
            folders: userData.folders || [],
            words: userData.words || [],
            stats: userData.stats || {},
            lastUpdateDate: new Date().toISOString()
        };
        
        await updateUserInCloud(currentUser, updatedUserData);
        currentUserData = updatedUserData;
    } catch (error) {
        console.error('Save user data error:', error);
        showNotification('❌ Veriler kaydedilirken hata oluştu!', 'error');
    }
}

// Sekme yönetimi
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Update translations for dynamic content
    updateAllTexts();
    
    if (tabName === 'dashboard') renderDashboard();
    else if (tabName === 'folders') renderFolders();
    else if (tabName === 'quiz') renderQuizArea();
    else if (tabName === 'stats') renderStats();
    else if (tabName === 'admin') loadAdminData();
}

// Bildirim sistemi
function showNotification(message, type = 'info') {
    const notificationsArea = document.getElementById('notificationsArea');
    const colors = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800'
    };
    
    const existingNotification = notificationsArea.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    notificationsArea.innerHTML = `
        <div class="notification p-3 border rounded-md ${colors[type]} mb-4">
            <div class="flex justify-between items-center">
                <span class="text-sm">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700 ml-2">×</button>
            </div>
        </div>
    `;
    
    setTimeout(() => {
        const notification = notificationsArea.querySelector('.notification');
        if (notification) notification.remove();
    }, 10000);
}

function checkNotifications() {
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    if (dueWords.length > 0) {
        const folderGroups = {};
        dueWords.forEach(word => {
            const folder = userData.folders.find(f => f.id === word.folderId);
            const folderName = folder ? folder.name : 'Diğer';
            if (!folderGroups[folderName]) folderGroups[folderName] = 0;
            folderGroups[folderName]++;
        });
        
        const folderInfo = Object.entries(folderGroups).map(([name, count]) => `${name}: ${count}`).join(', ');
        showNotification(currentLanguage === 'tr' ? `🔔 ${dueWords.length} kelime tekrar edilmeyi bekliyor! (${folderInfo})` : `🔔 ${dueWords.length} words waiting for review! (${folderInfo})`, 'info');
    }
}
// Yardımcı fonksiyonlar
function getDaysBetween(date1, date2) {
    const oneDay = 24 * 60 * 60 * 1000;
    const firstDate = new Date(date1);
    const secondDate = new Date(date2);
    return Math.round((secondDate - firstDate) / oneDay);
}

function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1, str2) {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
}

function calculateRetentionScore(daysSinceLastReview, difficulty) {
    const S = difficultySettings[difficulty];
    return Math.exp(-daysSinceLastReview / S);
}

// Render fonksiyonları
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    // Streak gösterimi
    document.getElementById('streakCount').textContent = userData.stats.streak || 0;
    const streakText = document.getElementById('streakText');
    
    if (userData.stats.streak === 0) {
        streakText.textContent = currentLanguage === 'tr' ? 'Başla!' : 'Start!';
        streakText.className = 'text-xs text-gray-500';
    } else {
        streakText.textContent = currentLanguage === 'tr' ? 
            `gün${userData.stats.streak > 1 ? ' 🔥' : ''}` : 
            `day${userData.stats.streak > 1 ? 's 🔥' : ''}`;
        streakText.className = 'text-xs text-orange-500 font-semibold';
    }
    
    document.getElementById('totalWords').textContent = userData.stats.totalWords;
    document.getElementById('dueToday').textContent = dueWords.length;
    document.getElementById('masteredWords').textContent = userData.stats.masteredWords;
    
    const reviewsList = document.getElementById('reviewsList');
    if (dueWords.length === 0) {
        reviewsList.innerHTML = `<p class="text-gray-500 text-sm">${currentLanguage === 'tr' ? 'Bugün tekrar edilecek kelime yok! 🎉' : 'No words to review today! 🎉'}</p>`;
    } else {
        reviewsList.innerHTML = `
            <div class="mb-3">
                <button onclick="showTab('quiz');" class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm">
                    🚀 ${t('startQuiz')} (${dueWords.length} ${t('words')})
                </button>
            </div>
            ${dueWords.slice(0, 3).map(word => {
                const folder = userData.folders.find(f => f.id === word.folderId);
                const daysSinceLastReview = word.lastReviewDate ? 
                    getDaysBetween(word.lastReviewDate, today) : 
                    getDaysBetween(word.createdDate, today);
                const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
                const retentionPercentage = Math.round(retentionScore * 100);
                
                return `
                    <div class="p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-medium text-sm">${word.word}</span>
                                <span class="text-xs text-gray-600 ml-2">(${folder ? folder.name : (currentLanguage === 'tr' ? 'Bilinmeyen Klasör' : 'Unknown Folder')})</span>
                                <span class="text-xs text-red-600 ml-2">${currentLanguage === 'tr' ? 'Hatırlama' : 'Retention'}: %${retentionPercentage}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
            ${dueWords.length > 3 ? `<p class="text-xs text-gray-500 mt-2">...${currentLanguage === 'tr' ? `ve ${dueWords.length - 3} kelime daha` : `and ${dueWords.length - 3} more words`}</p>` : ''}
        `;
    }
}

function renderFolders() {
    currentFolderId = null;
    const foldersList = document.getElementById('foldersList');
    
    if (userData.folders.length === 0) {
        foldersList.innerHTML = `<p class="text-gray-500 text-sm">${currentLanguage === 'tr' ? 'Henüz klasör oluşturulmamış.' : 'No folders created yet.'}</p>`;
        return;
    }
    
    const rootFolders = userData.folders.filter(f => !f.parentId);
    let html = '';
    
    rootFolders.forEach(folder => {
        html += renderFolderHierarchy(folder, 0);
    });
    
    foldersList.innerHTML = html;
}

function renderFolderHierarchy(folder, depth) {
    const today = new Date().toISOString().split('T')[0];
    const directWordCount = userData.words.filter(w => w.folderId === folder.id).length;
    const totalWordCount = getFolderWordCount(folder.id, true);
    const dueCount = userData.words.filter(w => w.folderId === folder.id && w.nextReviewDate <= today).length;
    const subfolders = userData.folders.filter(f => f.parentId === folder.id);
    const hasSubfolders = subfolders.length > 0;
    const indent = depth * 20;
    
    let folderIcon = '📁';
    if (hasSubfolders) {
        folderIcon = folder.isExpanded ? '📂' : '📁';
    }
    
    const expandArrow = hasSubfolders ? (folder.isExpanded ? '▼' : '▶') : '';
    
    let html = `
        <div class="folder-item" style="margin-left: ${indent}px;">
            <div class="p-3 border border-gray-200 rounded-md hover:bg-gray-50 mb-2">
                <div class="flex justify-between items-center">
                    <div class="flex items-center flex-1 cursor-pointer" onclick="openFolder(${folder.id})">
                        ${hasSubfolders ? 
                            `<span class="mr-2 cursor-pointer text-blue-600 hover:text-blue-800 font-bold" onclick="event.stopPropagation(); toggleFolder(${folder.id})" title="Genişlet/Daralt">${expandArrow}</span>` : 
                            '<span class="mr-2 w-4"></span>'
                        }
                        <span class="mr-2 text-lg">${folderIcon}</span>
                        <div>
                            <h3 class="font-medium text-sm">${folder.name}</h3>
                            <div class="text-xs text-gray-600">
                                ${directWordCount > 0 ? `📝 ${directWordCount} kelime` : '📝 Boş'}
                                ${totalWordCount > directWordCount ? ` • 📊 ${totalWordCount} toplam` : ''}
                                ${hasSubfolders ? ` • 📁 ${subfolders.length} alt klasör` : ''}
                            </div>
                            ${dueCount > 0 ? `<p class="text-xs text-red-600">⏰ ${dueCount} tekrar edilecek</p>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-1">
                        <button onclick="event.stopPropagation(); createSubFolder(${folder.id})" class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors" title="Alt Klasör Ekle">➕</button>
                        <button onclick="event.stopPropagation(); openFolder(${folder.id})" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors">👁️</button>
                        <button onclick="event.stopPropagation(); deleteFolder(${folder.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors">🗑️</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (folder.isExpanded && hasSubfolders) {
        subfolders.forEach(subfolder => {
            html += renderFolderHierarchy(subfolder, depth + 1);
        });
    }
    
    return html;
}

function renderQuizArea() {
    renderQuizOptions();
    updateQuizStats();
}

function renderStats() {
    renderGeneralStats();
}

function renderGeneralStats() {
    const totalWords = userData.words.length;
    const masteredWords = userData.words.filter(w => w.mastered).length;
    const currentStreak = userData.stats.streak || 0;
    const accuracy = 85; // Placeholder
    
    document.getElementById('statTotalWords').textContent = totalWords;
    document.getElementById('statMasteredWords').textContent = masteredWords;
    document.getElementById('statCurrentStreak').textContent = currentStreak;
    document.getElementById('statAccuracy').textContent = accuracy + '%';
}
// Klasör yönetimi
function createFolder(parentId = null) {
    const folderName = document.getElementById('folderNameInput').value.trim();
    if (!folderName) {
        showNotification(currentLanguage === 'tr' ? '❌ Klasör adı girin' : '❌ Enter folder name', 'error');
        return;
    }
    
    const parentFolder = parentId ? userData.folders.find(f => f.id === parentId) : null;
    const level = parentFolder ? parentFolder.level + 1 : 0;
    
    const newFolder = {
        id: Date.now(),
        name: folderName,
        parentId: parentId,
        level: level,
        isExpanded: true,
        createdDate: new Date().toISOString().split('T')[0],
        wordCount: 0
    };
    
    userData.folders.push(newFolder);
    saveUserData();
    document.getElementById('folderNameInput').value = '';
    renderFolders();
    
    recordActivity('folder_created', `"${folderName}" klasörü oluşturuldu`);
    showNotification(currentLanguage === 'tr' ? `📁 Klasör "${folderName}" oluşturuldu!` : `📁 Folder "${folderName}" created!`, 'success');
}

function createSubFolder(parentId) {
    const folderName = prompt(currentLanguage === 'tr' ? 'Alt klasör adı girin:' : 'Enter subfolder name:');
    if (!folderName || !folderName.trim()) return;
    
    const parentFolder = userData.folders.find(f => f.id === parentId);
    const level = parentFolder ? parentFolder.level + 1 : 0;
    
    const newFolder = {
        id: Date.now(),
        name: folderName.trim(),
        parentId: parentId,
        level: level,
        isExpanded: true,
        createdDate: new Date().toISOString().split('T')[0],
        wordCount: 0
    };
    
    userData.folders.push(newFolder);
    
    if (parentFolder) {
        parentFolder.isExpanded = true;
    }
    
    saveUserData();
    renderFolders();
    showNotification(currentLanguage === 'tr' ? `📁 Alt klasör "${folderName}" oluşturuldu!` : `📁 Subfolder "${folderName}" created!`, 'success');
}

function toggleFolder(folderId) {
    const folder = userData.folders.find(f => f.id === folderId);
    if (folder) {
        folder.isExpanded = !folder.isExpanded;
        saveUserData();
        renderFolders();
    }
}

function getFolderPath(folderId) {
    const path = [];
    let currentFolder = userData.folders.find(f => f.id === folderId);
    
    while (currentFolder) {
        path.unshift(currentFolder.name);
        currentFolder = currentFolder.parentId ? 
            userData.folders.find(f => f.id === currentFolder.parentId) : null;
    }
    
    return path.join(' > ');
}

function getFolderWordCount(folderId, includeSubfolders = true) {
    let count = userData.words.filter(w => w.folderId === folderId).length;
    
    if (includeSubfolders) {
        const subfolders = userData.folders.filter(f => f.parentId === folderId);
        subfolders.forEach(subfolder => {
            count += getFolderWordCount(subfolder.id, true);
        });
    }
    
    return count;
}

function deleteFolder(folderId) {
    const folder = userData.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const subfolders = userData.folders.filter(f => f.parentId === folderId);
    const totalWords = getFolderWordCount(folderId, true);
    
    let confirmMessage = currentLanguage === 'tr' ? 
        `"${folder.name}" klasörünü sil?` : 
        `Delete folder "${folder.name}"?`;
    if (subfolders.length > 0) {
        confirmMessage += currentLanguage === 'tr' ? 
            `\n\n⚠️ Bu klasörde ${subfolders.length} alt klasör var.` :
            `\n\n⚠️ This folder has ${subfolders.length} subfolders.`;
    }
    if (totalWords > 0) {
        confirmMessage += currentLanguage === 'tr' ? 
            `\n📝 Toplam ${totalWords} kelime silinecek.` :
            `\n📝 Total ${totalWords} words will be deleted.`;
    }
    confirmMessage += currentLanguage === 'tr' ? 
        '\n\nTüm alt klasörler ve kelimeler kalıcı olarak silinecek!' :
        '\n\nAll subfolders and words will be permanently deleted!';
    
    if (confirm(confirmMessage)) {
        deleteFolderRecursive(folderId);
        saveUserData();
        renderFolders();
        renderDashboard();
        showNotification(currentLanguage === 'tr' ? `🗑️ "${folder.name}" ve tüm içeriği silindi.` : `🗑️ "${folder.name}" and all its content deleted.`, 'success');
    }
}

function deleteFolderRecursive(folderId) {
    const subfolders = userData.folders.filter(f => f.parentId === folderId);
    subfolders.forEach(subfolder => {
        deleteFolderRecursive(subfolder.id);
    });
    
    userData.words = userData.words.filter(w => w.folderId !== folderId);
    userData.folders = userData.folders.filter(f => f.id !== folderId);
}

function openFolder(folderId) {
    currentFolderId = folderId;
    const folder = userData.folders.find(f => f.id === folderId);
    if (!folder) return;
    
    const folderWords = userData.words.filter(w => w.folderId === folderId);
    const subfolders = userData.folders.filter(f => f.parentId === folderId);
    const folderPath = getFolderPath(folderId);
    const foldersList = document.getElementById('foldersList');
    
    foldersList.innerHTML = `
        <div class="mb-4">
            <button onclick="renderFolders()" class="text-blue-500 hover:text-blue-700 text-sm">← Klasörlere Dön</button>
            <div class="mt-2">
                <div class="text-xs text-gray-500 mb-1">📍 ${folderPath}</div>
                <h3 class="text-lg font-semibold">${folder.name}</h3>
                <div class="text-sm text-gray-600">${folderWords.length} kelime ${subfolders.length > 0 ? `• ${subfolders.length} alt klasör` : ''}</div>
            </div>
        </div>
        
        ${subfolders.length > 0 ? `
            <div class="mb-4">
                <h4 class="text-sm font-medium mb-2 flex items-center">
                    <span class="mr-2">📁</span>Alt Klasörler (${subfolders.length})
                </h4>
                <div class="space-y-2">
                    ${subfolders.map(subfolder => {
                        const subWordCount = getFolderWordCount(subfolder.id, true);
                        const subDirectWords = userData.words.filter(w => w.folderId === subfolder.id).length;
                        const today = new Date().toISOString().split('T')[0];
                        const subDueCount = userData.words.filter(w => w.folderId === subfolder.id && w.nextReviewDate <= today).length;
                        const hasSubSubfolders = userData.folders.filter(f => f.parentId === subfolder.id).length > 0;
                        
                        return `
                            <div class="p-3 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 cursor-pointer transition-colors" onclick="openFolder(${subfolder.id})">
                                <div class="flex justify-between items-center">
                                    <div class="flex items-center">
                                        <span class="mr-2 text-lg">${hasSubSubfolders ? '📂' : '📁'}</span>
                                        <div>
                                            <span class="font-medium text-sm">${subfolder.name}</span>
                                            <div class="text-xs text-gray-600">📝 ${subDirectWords} kelime${subWordCount > subDirectWords ? ` • 📊 ${subWordCount} toplam` : ''}</div>
                                            ${subDueCount > 0 ? `<div class="text-xs text-red-600">⏰ ${subDueCount} tekrar edilecek</div>` : ''}
                                        </div>
                                    </div>
                                    <div class="flex gap-1">
                                        <button onclick="event.stopPropagation(); createSubFolder(${subfolder.id})" class="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition-colors" title="Alt Klasör Ekle">➕</button>
                                        <button onclick="event.stopPropagation(); deleteFolder(${subfolder.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors">🗑️</button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        ` : ''}
        
        <div class="mb-4">
            <div class="flex gap-2 flex-wrap">
                <button onclick="openWordModal(${folderId})" class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm flex items-center">
                    <span class="mr-1">📝</span>Kelime Ekle
                </button>
                <button onclick="createSubFolder(${folderId})" class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm flex items-center">
                    <span class="mr-1">📁</span>Alt Klasör Ekle
                </button>
            </div>
        </div>
        
        <div class="space-y-2">
            <h4 class="text-sm font-medium flex items-center">
                <span class="mr-2">📝</span>Kelimeler (${folderWords.length})
            </h4>
            ${folderWords.length === 0 ? 
                `<p class="text-gray-500 text-sm">Bu klasörde henüz kelime yok.</p>` :
                folderWords.map(word => {
                    const today = new Date().toISOString().split('T')[0];
                    const isDue = word.nextReviewDate <= today;
                    const daysSinceLastReview = word.lastReviewDate ? 
                        getDaysBetween(word.lastReviewDate, today) : 
                        getDaysBetween(word.createdDate, today);
                    const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
                    const retentionPercentage = Math.round(retentionScore * 100);
                    
                    return `
                        <div class="p-3 border border-gray-200 rounded-md ${isDue ? 'bg-yellow-50' : 'bg-gray-50'}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="font-medium text-sm">${word.language ? wordLanguages[word.language]?.flag || '🌐' : '🌐'} ${word.word}</div>
                                    <div class="text-xs text-gray-600 mt-1">${word.definition}</div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        ${word.language ? wordLanguages[word.language]?.name || 'Dil seçilmemiş' : 'Dil seçilmemiş'} | 
                                        ${word.difficulty} | 
                                        Tekrar: ${word.reviewCount} | 
                                        Hatırlama: ${retentionPercentage}%
                                    </div>
                                </div>
                                <div class="flex gap-1 ml-2">
                                    <button onclick="editWord(${word.id})" class="px-2 py-1 bg-gray-500 text-white rounded text-xs">Düzenle</button>
                                    <button onclick="deleteWord(${word.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Sil</button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')
            }
        </div>
    `;
}
// Kelime yönetimi
function openWordModal(folderId, wordId = null) {
    currentFolderId = folderId;
    currentWordId = wordId;
    
    const modal = document.getElementById('wordModal');
    const title = document.getElementById('modalTitle');
    const wordInput = document.getElementById('wordInput');
    const definitionInput = document.getElementById('definitionInput');
    const languageSelect = document.getElementById('wordLanguageSelect');
    const difficultySelect = document.getElementById('wordDifficultySelect');
    
    if (wordId) {
        const word = userData.words.find(w => w.id === wordId);
        title.textContent = 'Kelimeyi Düzenle';
        wordInput.value = word.word;
        definitionInput.value = word.definition;
        languageSelect.value = word.language || 'en';
        difficultySelect.value = word.difficulty;
    } else {
        title.textContent = 'Yeni Kelime Ekle';
        wordInput.value = '';
        definitionInput.value = '';
        languageSelect.value = 'en';
        difficultySelect.value = 'medium';
    }
    
    wordInput.placeholder = 'Kelime/terim girin';
    definitionInput.placeholder = 'Anlamını/açıklamasını girin';
    
    const difficultyOptions = difficultySelect.querySelectorAll('option');
    difficultyOptions[0].textContent = 'Kolay';
    difficultyOptions[1].textContent = 'Orta';
    difficultyOptions[2].textContent = 'Zor';
    
    modal.classList.remove('hidden');
}

function closeWordModal() {
    document.getElementById('wordModal').classList.add('hidden');
    currentFolderId = null;
    currentWordId = null;
}

function saveWord() {
    const word = document.getElementById('wordInput').value.trim();
    const definition = document.getElementById('definitionInput').value.trim();
    const language = document.getElementById('wordLanguageSelect').value;
    const difficulty = document.getElementById('wordDifficultySelect').value;
    
    if (!word || !definition) {
        showNotification('❌ Kelime ve tanım gerekli', 'error');
        return;
    }
    
    if (currentWordId) {
        const wordObj = userData.words.find(w => w.id === currentWordId);
        wordObj.word = word;
        wordObj.definition = definition;
        wordObj.language = language;
        wordObj.difficulty = difficulty;
        recordActivity('word_updated', `"${word}" kelimesi güncellendi`);
    } else {
        const newWord = {
            id: Date.now(),
            folderId: currentFolderId,
            word: word,
            definition: definition,
            language: language,
            difficulty: difficulty,
            reviewCount: 0,
            lastReviewDate: null,
            nextReviewDate: new Date().toISOString().split('T')[0],
            createdDate: new Date().toISOString().split('T')[0],
            mastered: false
        };
        
        userData.words.push(newWord);
        userData.stats.totalWords++;
        
        const folder = userData.folders.find(f => f.id === currentFolderId);
        if (folder) {
            folder.wordCount = userData.words.filter(w => w.folderId === currentFolderId).length;
        }
        
        recordActivity('word_added', `"${word}" kelimesi eklendi`);
    }
    
    saveUserData();
    closeWordModal();
    openFolder(currentFolderId);
    renderDashboard();
    showNotification(`✅ ${currentWordId ? 'Kelime güncellendi' : 'Kelime eklendi'}!`, 'success');
}

function editWord(wordId) {
    const word = userData.words.find(w => w.id === wordId);
    if (word) openWordModal(word.folderId, wordId);
}

function deleteWord(wordId) {
    if (confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) {
        const word = userData.words.find(w => w.id === wordId);
        userData.words = userData.words.filter(w => w.id !== wordId);
        
        if (word) {
            userData.stats.totalWords--;
            if (word.mastered) userData.stats.masteredWords--;
            
            const folder = userData.folders.find(f => f.id === word.folderId);
            if (folder) {
                folder.wordCount = userData.words.filter(w => w.folderId === word.folderId).length;
            }
        }
        
        saveUserData();
        openFolder(currentFolderId);
        renderDashboard();
        showNotification('🗑️ Kelime silindi', 'success');
    }
}

// Quiz sistemi
function renderQuizOptions() {
    const today = new Date().toISOString().split('T')[0];
    const allDueWords = userData.words.filter(word => word.nextReviewDate <= today);
    const quizOptions = document.getElementById('quizOptions');
    
    if (allDueWords.length === 0) {
        quizOptions.innerHTML = `
            <div class="text-center py-6">
                <div class="text-4xl mb-2">🎉</div>
                <p class="text-gray-500 text-sm">Bugün tekrar edilecek kelime yok!</p>
            </div>
        `;
        document.getElementById('quizArea').innerHTML = '';
        return;
    }
    
    let html = `<h4 class="text-sm font-medium mb-3">Hangi klasörden quiz çözmek istiyorsunuz?</h4>`;
    
    html += `
        <button onclick="startQuizFromFolder(null)" class="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 font-medium shadow-lg mb-2">
            🌟 Tüm Klasörler (${allDueWords.length} kelime)
        </button>
    `;
    
    const rootFolders = userData.folders.filter(f => !f.parentId);
    rootFolders.forEach(folder => {
        html += renderQuizFolderOptions(folder, 0, today);
    });
    
    quizOptions.innerHTML = html;
}

function renderQuizFolderOptions(folder, depth, today) {
    const folderWords = userData.words.filter(w => w.folderId === folder.id);
    const dueWords = folderWords.filter(w => w.nextReviewDate <= today);
    const subfolders = userData.folders.filter(f => f.parentId === folder.id);
    const hasSubfolders = subfolders.length > 0;
    const indent = depth * 15;
    
    let html = '';
    
    if (dueWords.length > 0) {
        const folderPath = getFolderPath(folder.id);
        const folderIcon = hasSubfolders ? '📂' : '📁';
        
        html += `
            <button onclick="startQuizFromFolder(${folder.id})" class="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium mb-2 flex items-center" style="margin-left: ${indent}px; width: calc(100% - ${indent}px);">
                <span class="mr-2">${folderIcon}</span>
                <span class="flex-1 text-left">${folderPath}</span>
                <span class="bg-green-600 px-2 py-1 rounded text-xs">${dueWords.length}</span>
            </button>
        `;
    } else if (folderWords.length > 0) {
        const folderPath = getFolderPath(folder.id);
        const folderIcon = hasSubfolders ? '📂' : '📁';
        
        html += `
            <button disabled class="w-full px-4 py-2 bg-gray-300 text-gray-500 rounded-lg cursor-not-allowed font-medium mb-2 flex items-center" style="margin-left: ${indent}px; width: calc(100% - ${indent}px);">
                <span class="mr-2">${folderIcon}</span>
                <span class="flex-1 text-left">${folderPath}</span>
                <span class="bg-gray-400 px-2 py-1 rounded text-xs">0</span>
            </button>
        `;
    }
    
    subfolders.forEach(subfolder => {
        html += renderQuizFolderOptions(subfolder, depth + 1, today);
    });
    
    return html;
}

function updateQuizStats() {
    const stats = userData.stats;
    const today = new Date().toISOString().split('T')[0];
    
    document.getElementById('totalQuizzes').textContent = stats.reviewsCompleted || 0;
    document.getElementById('averageScore').textContent = '85%';
    document.getElementById('bestStreak').textContent = stats.streak || 0;
    
    const todayQuizzes = stats.studyDates && stats.studyDates.includes(today) ? 1 : 0;
    document.getElementById('todayQuizzes').textContent = todayQuizzes;
}

// Hızlı Quiz türleri
function startQuickQuiz() {
    const allWords = userData.words.filter(w => !w.mastered);
    if (allWords.length === 0) {
        showNotification('❌ Quiz için kelime bulunamadı!', 'error');
        return;
    }
    
    const shuffled = [...allWords].sort(() => Math.random() - 0.5);
    currentQuiz = shuffled.slice(0, Math.min(5, shuffled.length));
    currentQuizIndex = 0;
    quizScore = 0;
    currentQuizFolder = 'quick';
    showQuizQuestion();
}

function startDifficultyQuiz() {
    const hardWords = userData.words.filter(w => w.difficulty === 'hard' && !w.mastered);
    if (hardWords.length === 0) {
        showNotification('❌ Zor kelime bulunamadı!', 'error');
        return;
    }
    
    currentQuiz = [...hardWords].sort(() => Math.random() - 0.5);
    currentQuizIndex = 0;
    quizScore = 0;
    currentQuizFolder = 'difficulty';
    showQuizQuestion();
}

function startReviewQuiz() {
    const today = new Date().toISOString().split('T')[0];
    const reviewWords = userData.words.filter(word => {
        if (word.mastered) return false;
        const daysSinceLastReview = word.lastReviewDate ? 
            getDaysBetween(word.lastReviewDate, today) : 
            getDaysBetween(word.createdDate, today);
        const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
        return retentionScore < 0.5;
    });
    
    if (reviewWords.length === 0) {
        showNotification('❌ Tekrar edilecek kelime bulunamadı!', 'error');
        return;
    }
    
    currentQuiz = [...reviewWords].sort(() => Math.random() - 0.5);
    currentQuizIndex = 0;
    quizScore = 0;
    currentQuizFolder = 'review';
    showQuizQuestion();
}

function startMasteryQuiz() {
    const masteredWords = userData.words.filter(w => w.mastered);
    if (masteredWords.length === 0) {
        showNotification('❌ Öğrenilen kelime bulunamadı!', 'error');
        return;
    }
    
    currentQuiz = [...masteredWords].sort(() => Math.random() - 0.5).slice(0, 10);
    currentQuizIndex = 0;
    quizScore = 0;
    currentQuizFolder = 'mastery';
    showQuizQuestion();
}
function startQuizFromFolder(folderId) {
    currentQuizFolder = folderId;
    const today = new Date().toISOString().split('T')[0];
    let dueWords;
    
    if (folderId === null) {
        dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    } else {
        dueWords = userData.words.filter(word => word.folderId === folderId && word.nextReviewDate <= today);
    }
    
    if (dueWords.length === 0) {
        document.getElementById('quizArea').innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-lg font-semibold mb-4">Bugün tekrar edilecek kelime yok!</h3>
                <p class="text-gray-600 text-sm">Bu klasörde henüz kelime yok.</p>
                <button onclick="renderQuizArea()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">Çık</button>
            </div>
        `;
        return;
    }
    
    currentQuiz = [...dueWords].sort(() => Math.random() - 0.5);
    currentQuizIndex = 0;
    quizScore = 0;
    showQuizQuestion();
}

function showQuizQuestion() {
    if (currentQuizIndex >= currentQuiz.length) {
        showQuizResults();
        return;
    }
    
    const word = currentQuiz[currentQuizIndex];
    const folder = userData.folders.find(f => f.id === word.folderId);
    const folderName = folder ? folder.name : 'Bilinmeyen Klasör';
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center">
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-500">Soru ${currentQuizIndex + 1} / ${currentQuiz.length}</span>
                    <span class="text-xs text-blue-600">📁 ${folderName}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${((currentQuizIndex) / currentQuiz.length) * 100}%"></div>
                </div>
            </div>
            
            <div class="mb-6">
                <h3 class="text-2xl font-bold mb-4 text-blue-600">${word.word}</h3>
                <p class="text-gray-600 text-sm">Bu ne anlama geliyor?</p>
            </div>
            
            <div class="mb-4">
                <textarea id="quizAnswer" placeholder="Cevabınızı yazın..." rows="3" class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"></textarea>
            </div>
            
            <div class="flex gap-2">
                <button onclick="checkAnswer()" class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">Cevabı Kontrol Et</button>
                <button onclick="renderQuizArea()" class="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">Çık</button>
            </div>
        </div>
    `;
    
    document.getElementById('quizAnswer').focus();
}

function checkAnswer() {
    const userAnswer = document.getElementById('quizAnswer').value.trim();
    const word = currentQuiz[currentQuizIndex];
    const correctAnswer = word.definition;
    const folder = userData.folders.find(f => f.id === word.folderId);
    const folderName = folder ? folder.name : 'Bilinmeyen Klasör';
    
    const similarity = calculateSimilarity(userAnswer.toLowerCase(), correctAnswer.toLowerCase());
    const isCorrect = similarity > 0.6 || 
                     userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) || 
                     correctAnswer.toLowerCase().includes(userAnswer.toLowerCase());
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center">
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-500">Soru ${currentQuizIndex + 1} / ${currentQuiz.length}</span>
                    <span class="text-xs text-blue-600">📁 ${folderName}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${((currentQuizIndex + 1) / currentQuiz.length) * 100}%"></div>
                </div>
            </div>
            
            <div class="mb-6">
                <h3 class="text-xl font-bold mb-4">${word.word}</h3>
                <div class="text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'} mb-4 font-medium">
                    ${isCorrect ? '✓ Doğru!' : '✗ Yanlış'}
                </div>
                
                <div class="bg-gray-50 p-3 rounded-md mb-4">
                    <div class="text-xs text-gray-600 mb-1">Doğru Cevap:</div>
                    <div class="font-medium text-sm">${correctAnswer}</div>
                </div>
                
                ${!isCorrect ? `
                    <div class="bg-red-50 p-3 rounded-md mb-4">
                        <div class="text-xs text-gray-600 mb-1">Sizin Cevabınız:</div>
                        <div class="text-sm">${userAnswer}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="flex gap-2 justify-center">
                <button onclick="rateAnswer('easy')" class="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm">😊 Kolay</button>
                <button onclick="rateAnswer('medium')" class="px-3 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors text-sm">😐 Orta</button>
                <button onclick="rateAnswer('hard')" class="px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm">😰 Zor</button>
            </div>
            <p class="text-xs text-gray-500 mt-3">Bu soru sizin için ne kadar zordu?</p>
        </div>
    `;
    
    if (isCorrect) quizScore++;
}

function rateAnswer(difficulty) {
    const word = currentQuiz[currentQuizIndex];
    reviewWord(word.id, difficulty);
    currentQuizIndex++;
    showQuizQuestion();
}

function showQuizResults() {
    const percentage = Math.round((quizScore / currentQuiz.length) * 100);
    let folderName = 'Bilinmeyen Klasör';
    
    if (currentQuizFolder === null) {
        folderName = 'Tüm Klasörler';
    } else if (currentQuizFolder === 'quick') {
        folderName = '⚡ Hızlı Quiz';
    } else if (currentQuizFolder === 'difficulty') {
        folderName = '🔥 Zorluk Quiz';
    } else if (currentQuizFolder === 'review') {
        folderName = '🔄 Tekrar Quiz';
    } else if (currentQuizFolder === 'mastery') {
        folderName = '👑 Ustalık Quiz';
    } else {
        const folder = userData.folders.find(f => f.id === currentQuizFolder);
        folderName = folder ? `📁 ${folder.name}` : 'Bilinmeyen Klasör';
    }
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center py-8">
            <h3 class="text-xl font-bold mb-4">🎉 Quiz Tamamlandı!</h3>
            <div class="text-sm text-gray-600 mb-2">${folderName}</div>
            <div class="text-3xl font-bold text-blue-600 mb-4">${quizScore}/${currentQuiz.length}</div>
            <div class="text-lg text-gray-600 mb-6">%${percentage} Doğru</div>
            
            <div class="space-y-2">
                <button onclick="renderQuizArea()" class="w-full px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors">Yeni Quiz Seç</button>
                ${typeof currentQuizFolder === 'number' ? 
                    `<button onclick="startQuizFromFolder(${currentQuizFolder})" class="w-full px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors">Aynı Klasörden Tekrar</button>` : 
                    ''
                }
            </div>
        </div>
    `;
    
    userData.stats.reviewsCompleted += currentQuiz.length;
    
    if (!userData.stats.quizHistory) userData.stats.quizHistory = [];
    userData.stats.quizHistory.push({
        date: new Date().toISOString(),
        score: percentage / 100,
        totalQuestions: currentQuiz.length,
        correctAnswers: quizScore,
        folder: folderName
    });
    
    if (userData.stats.quizHistory.length > 100) {
        userData.stats.quizHistory = userData.stats.quizHistory.slice(-100);
    }
    
    recordStudySession();
    recordActivity('quiz_completed', `${folderName} - %${percentage} başarı (${quizScore}/${currentQuiz.length})`);
    saveUserData();
    renderDashboard();
}

function reviewWord(wordId, userDifficulty) {
    const word = userData.words.find(w => w.id === wordId);
    if (!word) return;
    
    const today = new Date().toISOString().split('T')[0];
    word.lastReviewDate = today;
    word.reviewCount++;
    
    let intervalMultiplier = 1;
    if (userDifficulty === 'easy') intervalMultiplier = 1.5;
    else if (userDifficulty === 'hard') intervalMultiplier = 0.5;
    
    const intervalIndex = Math.min(word.reviewCount - 1, reviewIntervals.length - 1);
    const baseInterval = reviewIntervals[intervalIndex];
    const adjustedInterval = Math.round(baseInterval * intervalMultiplier);
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + adjustedInterval);
    word.nextReviewDate = nextReviewDate.toISOString().split('T')[0];
    
    if (word.reviewCount >= 5 && userDifficulty === 'easy' && !word.mastered) {
        word.mastered = true;
        userData.stats.masteredWords++;
    }
    
    saveUserData();
}
// Tutorial sistemi
let currentTutorialStep = 0;
let tutorialSteps = [];

function initTutorialSteps() {
    tutorialSteps = [
        {
            title: "🎉 Hoş geldin!",
            content: "Bildiklerini unutma uygulamasına hoş geldin! Bu kısa tur ile uygulamayı nasıl kullanacağını öğreneceksin.",
            highlight: null,
            action: null
        },
        {
            title: "📁 Klasör Oluştur",
            content: "Klasörler sekmesinde kelimelerini organize edebilirsin. Konulara göre klasörler oluştur ve alt klasörler ekle.",
            highlight: '#foldersTab',
            action: () => showTab('folders')
        },
        {
            title: "📝 Kelime Ekle",
            content: "Her klasöre kelimeler ekleyebilirsin. Kelime, anlamı, dili ve zorluk seviyesini belirle.",
            highlight: '.folder-item',
            action: null
        },
        {
            title: "🎮 Quiz",
            content: "Quiz sekmesinde kelimelerini test edebilirsin. Farklı quiz türleri ve klasör bazlı quizler mevcut.",
            highlight: '#quizTab',
            action: () => showTab('quiz')
        },
        {
            title: "📊 İstatistikler",
            content: "İstatistik sekmesinde öğrenme ilerlemeni takip edebilirsin. Unutma eğrisi ve başarı oranlarını gör.",
            highlight: '#statsTab',
            action: () => showTab('stats')
        },
        {
            title: "🔔 Bildirimler",
            content: "Uygulama sana kelime tekrarı zamanı geldiğinde bildirim gönderir. Böylece hiçbir tekrarı kaçırmazsın.",
            highlight: null,
            action: null
        },
        {
            title: "🌙 Temalar",
            content: "Sağ üstteki ay/güneş simgesi ile karanlık ve aydınlık tema arasında geçiş yapabilirsin.",
            highlight: '.theme-toggle',
            action: null
        },
        {
            title: "🌍 Diller",
            content: "Dil simgesi ile uygulamanın dilini değiştirebilirsin. 5 farklı dil desteği var.",
            highlight: '.language-toggle',
            action: null
        },
        {
            title: "✅ Hazırsın!",
            content: "Artık hazırsın! Bildiklerini unutma yolculuğuna başlayabilirsin. İyi çalışmalar!",
            highlight: null,
            action: null
        }
    ];
}

function startTutorial() {
    initTutorialSteps();
    currentTutorialStep = 0;
    document.getElementById('tutorialOverlay').classList.remove('hidden');
    showTutorialStep();
}

function showTutorialStep() {
    const step = tutorialSteps[currentTutorialStep];
    const stepElement = document.getElementById('tutorialStep');
    const progressElement = document.getElementById('tutorialProgress');
    const prevButton = document.getElementById('tutorialPrev');
    const nextButton = document.getElementById('tutorialNext');
    
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });
    
    stepElement.innerHTML = `
        <div class="text-2xl mb-2">${step.title}</div>
        <p class="text-gray-600 text-sm leading-relaxed">${step.content}</p>
    `;
    
    progressElement.innerHTML = '';
    for (let i = 0; i < tutorialSteps.length; i++) {
        const dot = document.createElement('div');
        dot.className = `tutorial-progress-dot ${i === currentTutorialStep ? 'active' : ''}`;
        progressElement.appendChild(dot);
    }
    
    prevButton.disabled = currentTutorialStep === 0;
    nextButton.textContent = currentTutorialStep === tutorialSteps.length - 1 ? 'Bitir' : 'İleri →';
    
    if (step.highlight) {
        setTimeout(() => {
            const element = document.querySelector(step.highlight);
            if (element) {
                element.classList.add('tutorial-highlight');
            }
        }, 100);
    }
    
    if (step.action) {
        setTimeout(step.action, 200);
    }
}

function nextTutorialStep() {
    if (currentTutorialStep < tutorialSteps.length - 1) {
        currentTutorialStep++;
        showTutorialStep();
    } else {
        finishTutorial();
    }
}

function previousTutorialStep() {
    if (currentTutorialStep > 0) {
        currentTutorialStep--;
        showTutorialStep();
    }
}

function finishTutorial() {
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });
    
    document.getElementById('tutorialOverlay').classList.add('hidden');
    localStorage.setItem(`tutorial_completed_${currentUser}`, 'true');
    showNotification('🎉 Tanıtım turu tamamlandı!', 'success');
    showTab('dashboard');
}

function shouldShowTutorial() {
    if (!currentUser) return false;
    return !localStorage.getItem(`tutorial_completed_${currentUser}`);
}

// Admin Panel Functions
function loadAdminData() {
    const allUsers = getAllUsers();
    let totalSystemWords = 0;
    let totalSystemFolders = 0;
    let totalSystemQuizzes = 0;
    
    allUsers.forEach(user => {
        const userData = getUserData(user.email);
        if (userData) {
            totalSystemWords += userData.words ? userData.words.length : 0;
            totalSystemFolders += userData.folders ? userData.folders.length : 0;
            if (userData.stats && userData.stats.reviewsCompleted) {
                totalSystemQuizzes += userData.stats.reviewsCompleted;
            }
        }
    });
    
    document.getElementById('totalUsers').textContent = allUsers.length;
    document.getElementById('totalWordsSystem').textContent = totalSystemWords;
    document.getElementById('totalFoldersSystem').textContent = totalSystemFolders;
    document.getElementById('totalQuizzesSystem').textContent = totalSystemQuizzes;
    
    populateUserTable(allUsers);
}

function getAllUsers() {
    const users = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('user_')) {
            try {
                const userInfo = JSON.parse(localStorage.getItem(key));
                if (userInfo && userInfo.email) {
                    users.push(userInfo);
                }
            } catch (e) {
                console.error('Error parsing user data:', e);
            }
        }
    }
    return users.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
}

function getUserData(email) {
    try {
        const userData = localStorage.getItem(`spacedRepetition_${email}`);
        return userData ? JSON.parse(userData) : null;
    } catch (e) {
        console.error('Error parsing user data for', email, e);
        return null;
    }
}

function populateUserTable(users) {
    const tbody = document.getElementById('userTableBody');
    const noUsersMessage = document.getElementById('noUsersMessage');
    
    if (users.length === 0) {
        tbody.innerHTML = '';
        noUsersMessage.classList.remove('hidden');
        return;
    }
    
    noUsersMessage.classList.add('hidden');
    let html = '';
    
    users.forEach(user => {
        const userData = getUserData(user.email);
        const wordCount = userData && userData.words ? userData.words.length : 0;
        const folderCount = userData && userData.folders ? userData.folders.length : 0;
        const streak = userData && userData.stats ? userData.stats.streak || 0 : 0;
        const createdDate = new Date(user.createdDate).toLocaleDateString('tr-TR');
        
        html += `
            <tr class="hover:bg-gray-50">
                <td class="px-3 py-2">
                    <div class="font-medium text-sm">${user.name}</div>
                    <div class="text-xs text-gray-500">ID: ${user.email.split('@')[0]}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="text-sm">${user.email}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="text-sm">${createdDate}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="text-sm font-medium">${wordCount}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="text-sm font-medium">${folderCount}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="text-sm font-medium ${streak > 0 ? 'text-orange-600' : 'text-gray-400'}">${streak}</div>
                </td>
                <td class="px-3 py-2">
                    <div class="flex gap-1">
                        <button onclick="viewUserDetails('${user.email}')" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 transition-colors" title="Detayları Görüntüle">👁️</button>
                        <button onclick="deleteUser('${user.email}')" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 transition-colors" title="Kullanıcıyı Sil">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function refreshUserList() {
    loadAdminData();
    showNotification('👑 Kullanıcı listesi yenilendi!', 'success');
}

function filterUsers() {
    const searchTerm = document.getElementById('userSearchInput').value.toLowerCase().trim();
    const allUsers = getAllUsers();
    
    if (!searchTerm) {
        populateUserTable(allUsers);
        return;
    }
    
    const filteredUsers = allUsers.filter(user => 
        user.name.toLowerCase().includes(searchTerm) || 
        user.email.toLowerCase().includes(searchTerm)
    );
    
    populateUserTable(filteredUsers);
}

function viewUserDetails(email) {
    const userInfo = JSON.parse(localStorage.getItem(`user_${email}`));
    const userData = getUserData(email);
    
    if (!userInfo) {
        alert('Kullanıcı bilgileri bulunamadı!');
        return;
    }
    
    const wordCount = userData && userData.words ? userData.words.length : 0;
    const folderCount = userData && userData.folders ? userData.folders.length : 0;
    const streak = userData && userData.stats ? userData.stats.streak || 0 : 0;
    const masteredWords = userData && userData.stats ? userData.stats.masteredWords || 0 : 0;
    const reviewsCompleted = userData && userData.stats ? userData.stats.reviewsCompleted || 0 : 0;
    const lastLoginDate = userInfo.lastLoginDate ? new Date(userInfo.lastLoginDate).toLocaleString('tr-TR') : 'Hiç giriş yapmamış';
    const createdDate = new Date(userInfo.createdDate).toLocaleString('tr-TR');
    
    const details = `👤 Kullanıcı Detayları

📧 E-mail: ${userInfo.email}
👨‍💼 İsim: ${userInfo.name}
📅 Kayıt Tarihi: ${createdDate}
🕐 Son Giriş: ${lastLoginDate}

📊 İstatistikler:
📚 Toplam Kelime: ${wordCount}
📁 Toplam Klasör: ${folderCount}
✅ Öğrenilen Kelime: ${masteredWords}
🎯 Tamamlanan Quiz: ${reviewsCompleted}
🔥 Günlük Seri: ${streak}

${userData && userData.folders && userData.folders.length > 0 ? 
    `📁 Klasörler:\n${userData.folders.map(folder => `• ${folder.name} (${userData.words.filter(w => w.folderId === folder.id).length} kelime)`).join('\n')}` : 
    ''
}`;
    
    alert(details);
}

function deleteUser(email) {
    const userInfo = JSON.parse(localStorage.getItem(`user_${email}`));
    if (!userInfo) {
        alert('Kullanıcı bulunamadı!');
        return;
    }
    
    const confirmMessage = `⚠️ DİKKAT: Kullanıcı Silme İşlemi

Kullanıcı: ${userInfo.name}
E-mail: ${email}

Bu işlem GERİ ALINAMAZ!
• Kullanıcının tüm verileri silinecek
• Tüm kelimeleri ve klasörleri kaybolacak
• Tüm istatistikleri sıfırlanacak

Bu kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz?`;
    
    if (confirm(confirmMessage)) {
        try {
            localStorage.removeItem(`user_${email}`);
            localStorage.removeItem(`spacedRepetition_${email}`);
            localStorage.removeItem(`notifications_${email}`);
            localStorage.removeItem(`tutorial_completed_${email}`);
            
            if (currentUser === email) {
                logout();
                alert('⚠️ Kendi hesabınızı sildiniz! Giriş ekranına yönlendiriliyorsunuz.');
                return;
            }
            
            refreshUserList();
            showNotification(`🗑️ Kullanıcı "${userInfo.name}" başarıyla silindi!`, 'success');
        } catch (error) {
            console.error('Kullanıcı silme hatası:', error);
            alert('❌ Kullanıcı silinirken bir hata oluştu!');
        }
    }
}

// Aktivite kaydetme
function recordActivity(type, description) {
    if (!userData.stats.activities) userData.stats.activities = [];
    
    userData.stats.activities.push({
        type: type,
        description: description,
        date: new Date().toISOString()
    });
    
    if (userData.stats.activities.length > 100) {
        userData.stats.activities = userData.stats.activities.slice(-100);
    }
    
    saveUserData();
}

// Periyodik bildirim kontrolü
setInterval(() => {
    if (currentUser) {
        checkNotifications();
    }
}, 60000);