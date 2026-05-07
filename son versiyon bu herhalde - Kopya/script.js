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
let tutorialStep = 0;

// Dark Mode
let isDarkMode = localStorage.getItem('darkMode') === 'true';

// Dil sistemi
let currentLanguage = localStorage.getItem('appLanguage') || 'tr';

// ⚠️ API KEY KALDIRILDI - Artık backend'de
// Netlify Functions kullanıyoruz
// Environment detection: Netlify'da mı, local'de mi?
const isNetlify = window.location.hostname.includes('netlify.app') || 
                  window.location.hostname.includes('netlify.com');

// API Configuration
const API_CONFIG = {
    // Production (Netlify): Backend proxy kullan
    production: {
        endpoint: '/.netlify/functions/api',
        useProxy: true
    },
    // Development (Local): Geçici olarak direkt API (sadece test için)
    development: {
        endpoint: 'https://api.jsonbin.io/v3/b',
        // ⚠️ UYARI: Bu key sadece development için!
        // Production'da asla kullanılmayacak
        apiKey: '$2a$10$IS0Es2Ec/.haFHLCZz/8Kel4jCbrkJy9xCqe0SXTBGdqnsoZN7Qx.',
        useProxy: false
    }
};

// Otomatik environment seçimi
const ENV = isNetlify ? 'production' : 'development';
const API = API_CONFIG[ENV];

// Debug
console.log(`🔧 Environment: ${ENV}`);
console.log(`🔒 Using proxy: ${API.useProxy}`);

// Debug function
function debugLog(message, data = null) {
    if (ENV === 'development') {
        console.log(`[DEBUG] ${message}`, data);
    }
}

// ============================================
// 🛡️ GÜVENLİK FONKSİYONLARI (Inline)
// ============================================

// HTML Escape (XSS koruması)
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Email validation
function isValidEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email) && email.length <= 254;
}

// Password validation
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
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(password.toLowerCase())) {
        errors.push('Çok yaygın bir şifre, daha güçlü bir şifre seçin');
    }
    return { valid: errors.length === 0, errors };
}

// Name validation
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
    if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s'-]+$/.test(trimmed)) {
        return { valid: false, error: 'İsim sadece harf içerebilir' };
    }
    return { valid: true, error: null };
}

// Rate Limiter (Basit)
class SimpleRateLimiter {
    constructor() {
        this.requests = new Map();
        this.maxRequests = 10;
        this.windowMs = 60000; // 1 dakika
    }
    
    canMakeRequest(key) {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];
        const recentRequests = userRequests.filter(time => now - time < this.windowMs);
        
        if (recentRequests.length >= this.maxRequests) {
            return false;
        }
        
        recentRequests.push(now);
        this.requests.set(key, recentRequests);
        return true;
    }
    
    getTimeUntilReset(key) {
        const userRequests = this.requests.get(key) || [];
        if (userRequests.length === 0) return 0;
        const oldestRequest = Math.min(...userRequests);
        const resetTime = oldestRequest + this.windowMs;
        return Math.max(0, resetTime - Date.now());
    }
}

const rateLimiter = new SimpleRateLimiter();

// ============================================
// 🛡️ CSRF TOKEN PROTECTION
// ============================================

class CSRFProtection {
    constructor() {
        this.token = this.generateToken();
        this.sessionToken = sessionStorage.getItem('csrf_token');
        if (!this.sessionToken) {
            this.sessionToken = this.generateToken();
            sessionStorage.setItem('csrf_token', this.sessionToken);
        }
    }
    
    generateToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    getToken() {
        return this.sessionToken;
    }
    
    validateToken(token) {
        return token === this.sessionToken;
    }
    
    refreshToken() {
        this.sessionToken = this.generateToken();
        sessionStorage.setItem('csrf_token', this.sessionToken);
        return this.sessionToken;
    }
}

const csrfProtection = new CSRFProtection();

const translations = {
    tr: {
        appTitle: "Akılda Kal",
        introTitle: "Akılda Kal",
        introSubtitle: "Aralıklı Tekrar ile Kalıcı Öğrenme",
        feature1Title: "Akıllı Tekrar Sistemi",
        feature1Desc: "Ebbinghaus unutma eğrisine göre kelimelerinizi tam zamanında tekrar edin",
        feature2Title: "Organize Klasörler", 
        feature2Desc: "Kelimelerinizi konulara göre düzenleyin ve alt klasörler oluşturun",
        feature3Title: "Çeşitli Quiz Türleri",
        feature3Desc: "Hızlı quiz, zorluk bazlı quiz ve daha fazlası ile kendinizi test edin",
        feature4Title: "Detaylı İstatistikler",
        feature4Desc: "İlerlemenizi takip edin ve öğrenme başarınızı görün",
        feature5Title: "Akıllı Hatırlatmalar",
        feature5Desc: "Tekrar zamanı geldiğinde size bildirim gönderir",
        startButton: "Başlayalım! 🚀",
        introFooter: "Bilimsel olarak kanıtlanmış aralıklı tekrar yöntemi ile öğrenin",
        login: "Giriş Yap",
        register: "Kayıt Ol",
        loginEmail: "E-mail adresinizi girin",
        loginPassword: "Şifrenizi girin", 
        registerName: "Adınızı girin",
        registerEmail: "E-mail adresinizi girin",
        registerPassword: "Şifre oluşturun (min 6 karakter)",
        registerPasswordConfirm: "Şifreyi tekrar girin",
        welcome: "Hoş geldin",
        dashboard: "Ana Sayfa",
        folders: "Klasörler",
        quiz: "Quiz",
        stats: "İstatistik",
        todayReviews: "Bugün Tekrar Edilecekler",
        totalWords: "Toplam Kelime",
        todayDue: "Bugün Tekrar", 
        mastered: "Öğrenilen",
        streak: "Günlük Seri",
        streakDays: "gün",
        createFolder: "Yeni Klasör Oluştur",
        folderName: "Klasör adı girin",
        create: "Oluştur",
        myFolders: "Klasörlerim",
        addWord: "Yeni Kelime Ekle",
        backToFolders: "← Klasörlere Dön",
        word: "Kelime/terim girin",
        definition: "Anlamını/açıklamasını girin",
        difficulty: "Zorluk",
        easy: "Kolay",
        medium: "Orta", 
        hard: "Zor",
        save: "Kaydet",
        cancel: "İptal",
        edit: "Düzenle",
        delete: "Sil",
        open: "Aç",
        editWord: "Kelimeyi Düzenle",
        addNewWord: "Yeni Kelime Ekle",
        quizStats: "Quiz İstatistikleri",
        totalQuizzes: "Toplam Test",
        averageScore: "Ortalama",
        bestStreak: "En İyi Seri",
        todayQuizzes: "Bugün",
        quizTypes: "Quiz Türleri",
        quickQuiz: "Hızlı Quiz",
        quickQuizDesc: "5 rastgele kelime ile hızlı test",
        difficultyQuiz: "Zorluk Quiz",
        difficultyQuizDesc: "Sadece zor kelimeler",
        reviewQuiz: "Tekrar Quiz", 
        reviewQuizDesc: "Bugün tekrar edilecek kelimeler",
        masteryQuiz: "Ustalık Quiz",
        masteryQuizDesc: "Öğrendiğin kelimeleri pekiştir",
        folderBasedQuiz: "Klasör Bazlı Quiz",
        folderQuizDesc: "Belirli bir klasörden kelimeler",
        multipleChoiceQuiz: "Çoktan Seçmeli Quiz",
        multipleChoiceQuizDesc: "4 seçenekli çoktan seçmeli sorular",
        spellingQuiz: "Yazım Quiz",
        spellingQuizDesc: "Kelimelerin doğru yazımını test edin",
        selectCorrectAnswer: "Doğru cevabı seçin:",
        typeTheWord: "Kelimeyi yazın:",
        showHint: "💡 İpucu",
        hideHint: "❌ İpucu Gizle",
        selectQuiz: "Quiz Seç",
        quizComplete: "Quiz Tamamlandı!",
        correct: "Doğru",
        incorrect: "Yanlış",
        correctAnswer: "Doğru Cevap:",
        yourAnswer: "Sizin Cevabınız:",
        newQuiz: "Yeni Quiz Seç",
        completeQuiz: "Tamamla",
        sameFolder: "Aynı Klasörden Tekrar",
        howDifficult: "Bu soru sizin için ne kadar zordu?",
        easyEmoji: "😊 Kolay",
        mediumEmoji: "😐 Orta",
        hardEmoji: "😰 Zor",
        logout: "Çıkış",
        noWordsInFolder: "Bu klasörde henüz kelime yok.",
        noFoldersYet: "Henüz klasör oluşturulmamış.",
        noDueWords: "Bugün tekrar edilecek kelime yok! 🎉",
        allWordsUpToDate: "Harika! Tüm kelimeleriniz güncel.",
        reviewTime: "Tekrar Zamanı!",
        wordsWaitingReview: "kelime tekrar edilmeyi bekliyor.",
        startQuiz: "Quiz Başlat",
        exit: "Çık",
        question: "Soru",
        whatMeaning: "Bu ne anlama geliyor?",
        writeAnswer: "Cevabınızı yazın...",
        checkAnswer: "Cevabı Kontrol Et",
        words: "kelime",
        reviewCount: "Tekrar:",
        nextReview: "Sonraki:",
        addSubFolder: "Alt Klasör Ekle",
        subFolders: "Alt Klasörler",
        totalWords: "toplam",
        tutorialWelcome: "Akılda Kal uygulamasına hoş geldin! Bu kısa tur ile uygulamayı nasıl kullanacağını öğreneceksin.",
        tutorialFolders: "Klasörler sekmesinde kelimelerini organize edebilirsin. Konulara göre klasörler oluştur ve alt klasörler ekle.",
        tutorialWords: "Her klasöre kelimeler ekleyebilirsin. Kelime, anlamı ve zorluk seviyesini belirle.",
        tutorialQuiz: "Quiz sekmesinde kelimelerini test edebilirsin. Farklı quiz türleri ve klasör bazlı quizler mevcut.",
        tutorialStats: "İstatistik sekmesinde öğrenme ilerlemeni takip edebilirsin. Unutma eğrisi ve başarı oranlarını gör.",
        tutorialNotifications: "Uygulama sana kelime tekrarı zamanı geldiğinde bildirim gönderir. Böylece hiçbir tekrarı kaçırmazsın.",
        tutorialThemes: "Sağ üstteki ay/güneş simgesi ile karanlık ve aydınlık tema arasında geçiş yapabilirsin.",
        tutorialLanguages: "Dil simgesi ile uygulamanın dilini değiştirebilirsin. 5 farklı dil desteği var.",
        tutorialReady: "Artık hazırsın! Akılda Kal yolculuğuna başlayabilirsin. İyi çalışmalar!",
        tutorialCompleted: "Tanıtım turu tamamlandı! Artık uygulamayı kullanmaya başlayabilirsin.",
        notifications: "Bildirimler",
        themes: "Temalar", 
        languages: "Diller",
        ready: "Hazır",
        finish: "Bitir",
        next: "İleri",
        skip: "Atla",
        weeklyActivity: "Haftalık Aktivite",
        learningCurve: "Öğrenme Eğrisi",
        monthlyStats: "Aylık İstatistikler", 
        quizPerformance: "Quiz Performansı",
        difficultyDistribution: "Zorluk Dağılımı",
        accuracy: "Doğruluk",
        quizzes: "test",
        searchTitle: "Arama ve Filtreleme",
        toggleFilters: "Filtreler",
        searchPlaceholder: "Kelime veya klasör ara...",
        difficultyFilterLabel: "Zorluk Seviyesi",
        dateFilterLabel: "Eklenme Tarihi",
        sortFilterLabel: "Sıralama",
        allItems: "Tümü",
        today: "Bugün",
        thisWeek: "Bu Hafta",
        thisMonth: "Bu Ay",
        last3Months: "Son 3 Ay",
        sortByName: "İsme Göre",
        sortByDate: "Tarihe Göre",
        sortByDifficulty: "Zorluğa Göre",
        sortByWordCount: "Kelime Sayısına Göre",
        clearSearch: "Temizle",
        searchResultsFound: "sonuç bulundu",
        noSearchResults: "Arama kriterlerine uygun sonuç bulunamadı",
        quizFilterTitle: "Quiz Filtresi",
        allDifficulties: "Tüm Zorluklar",
        easyWords: "Kolay Kelimeler",
        mediumWords: "Orta Kelimeler",
        hardWords: "Zor Kelimeler",
        filteredWordsAvailable: "kelime mevcut",
        wordsWaitingReview: "kelime tekrar edilmeyi bekliyor",
        reviewInQuizSection: "Bu kelimeleri Quiz bölümündeki \"Tekrar Quiz\" sekmesinden çalışabilirsiniz",
        goToReviewQuiz: "Tekrar Quiz'e Git",
        noWordsToReview: "Bugün tekrar edilecek kelime yok!",
        allWordsUpToDateMsg: "Harika! Tüm kelimeleriniz güncel.",
        achievementBadges: "Başarı Rozetleri",
        learningTrend: "Öğrenme Trendi",
        greatProgress: "Harika gidiyorsun!",
        thisWeekShort: "bu hafta",
        weeklyQuizzesLabel: "Bu Hafta Quiz",
        monthlyWordsLabel: "Bu Ay Kelime",
        successRateLabel: "Başarı Oranı",
        todayActivityLabel: "Bugün Aktivite",
        todayReviewsTitle: "Bugün Tekrar Edilecekler",
        allDifficultiesFilter: "Tüm Zorluklar",
        betterThanLastWeek: "Geçen haftadan %{percent} daha iyi!",
        slowerPace: "Biraz yavaşladın, hadi devam!",
        keepGoing: "Devam et!",
        streakTitle: "🔥 Günlük Seri",
        streakDaysText: "gün",
        totalWordsTitle: "📚 Toplam Kelime",
        dueTodayTitle: "⏰ Bugün Tekrar",
        masteredTitle: "✅ Öğrenilen",
        // Badge titles
        badge_firstStep: "İlk Adım",
        badge_beginning: "Başlangıç",
        badge_collector: "Koleksiyoncu",
        badge_wordMonster: "Kelime Canavarı",
        badge_wordHunter: "Kelime Avcısı",
        badge_library: "Kütüphane",
        badge_collectorPro: "Koleksiyoncu Pro",
        badge_encyclopedia: "Ansiklopedi",
        badge_wordScholar: "Kelime Bilgini",
        badge_wordMillionaire: "Kelime Milyoneri",
        badge_firstWeek: "İlk Hafta",
        badge_fireBall: "Ateş Topu",
        badge_dailyRoutine: "Günlük Rutin",
        badge_determined: "Kararlı",
        badge_superStreak: "Süper Seri",
        badge_monthlyHero: "Aylık Kahraman",
        badge_legendStreak: "Efsane Seri",
        badge_ironWill: "Demir İrade",
        badge_yearStreak: "Yılın Serisi",
        badge_streakKing: "Seri Kralı",
        badge_quizStarter: "Quiz Başlangıcı",
        badge_quizFan: "Quiz Tutkunu",
        badge_quizMaster: "Quiz Ustası",
        badge_marathonRunner: "Maraton Koşucusu",
        badge_quizLegend: "Quiz Efsanesi",
        badge_superMarathon: "Süper Maraton",
        badge_quizGod: "Quiz Tanrısı",
        badge_quizEmperor: "Quiz İmparatoru",
        badge_quizUniverse: "Quiz Evreni",
        badge_quizLegendMax: "Quiz Efsanesi",
        badge_memoryStarter: "Hafıza Başlangıcı",
        badge_memoryChampion: "Hafıza Şampiyonu",
        badge_memoryAthlete: "Hafıza Atleti",
        badge_memoryGenius: "Hafıza Dehası",
        badge_antiRote: "Ezbere Karşı",
        badge_memoryProfessor: "Hafıza Profesörü",
        badge_perfectMemory: "Mükemmel Hafıza",
        badge_memoryOlympian: "Hafıza Olimpiyatçısı",
        badge_memoryChampionPro: "Hafıza Şampiyonu Pro",
        badge_memoryDiamond: "Hafıza Elması",
        badge_goodStart: "İyi Başlangıç",
        badge_perfectionist: "Mükemmeliyetçi",
        badge_flawless: "Kusursuz",
        badge_organizer: "Organizatör",
        badge_superOrganizer: "Süper Organizatör",
        badge_archivist: "Arşivci",
        badge_activityMonster: "Aktivite Canavarı",
        badge_superActive: "Süper Aktif",
        badge_hyperActive: "Hiper Aktif",
        badge_appLegend: "Akılda Kal Efsanesi",
        // Notification texts
        notificationPermissionTitle: "Bildirimleri Aç",
        notificationPermissionDesc: "Tekrar zamanı geldiğinde seni bilgilendirmemize izin ver",
        notificationPermissionButton: "İzin Ver",
        notificationEnabled: "Bildirimler Açık",
        notificationDisabled: "Bildirimler Kapalı",
        dailyReminderTime: "Günlük Hatırlatma Saati",
        saveButton: "Kaydet",
        settingsTitle: "Ayarlar",
        notificationSettings: "Bildirim Ayarları",
        appearanceSettings: "Görünüm",
        accountStats: "Hesap İstatistikleri",
        accountInfo: "Hesap",
        totalWords: "Toplam Kelime",
        totalQuizzes: "Toplam Quiz",
        dailyStreak: "Günlük Seri",
        folders: "Klasör",
        name: "Ad",
        email: "E-mail",
        registrationDate: "Kayıt Tarihi",
        closeButton: "Kapat",
        darkMode: "Karanlık Mod",
        language: "Dil",
        streakInDanger: "Serin Tehlikede!",
        streakWarning: "günlük serini kaybetme! Bugün bir quiz çöz.",
        newBadgeEarned: "Yeni Rozet Kazandın!",
        notificationGranted: "Bildirimler açıldı!",
        notificationActive: "Bildirimler Aktif!",
        notificationActiveDesc: "Artık tekrar zamanı geldiğinde seni bilgilendireceğiz.",
        notificationDenied: "Bildirim izni reddedildi",
        notificationError: "Bildirim izni alınamadı",
        notificationNotSupported: "Tarayıcınız bildirimleri desteklemiyor",
        reminderTimeSet: "Hatırlatma saati {time} olarak ayarlandı",
        newBadge: "Yeni Rozet!",
        badgeEarned: "rozetini kazandın!"

    },
    en: {
        appTitle: "Remember It",
        introTitle: "Remember It",
        introSubtitle: "Permanent Learning with Spaced Repetition",
        feature1Title: "Smart Repetition System",
        feature1Desc: "Review your words at the perfect time according to Ebbinghaus forgetting curve",
        feature2Title: "Organized Folders",
        feature2Desc: "Organize your words by topics and create subfolders",
        feature3Title: "Various Quiz Types",
        feature3Desc: "Test yourself with quick quiz, difficulty-based quiz and more",
        feature4Title: "Detailed Statistics",
        feature4Desc: "Track your progress and see your learning success",
        feature5Title: "Smart Reminders",
        feature5Desc: "Get notified when it's time to review",
        startButton: "Let's Start! 🚀",
        introFooter: "Learn with scientifically proven spaced repetition method",
        login: "Login",
        register: "Register",
        loginEmail: "Enter your email address",
        loginPassword: "Enter your password",
        registerName: "Enter your name",
        registerEmail: "Enter your email address", 
        registerPassword: "Create password (min 6 characters)",
        registerPasswordConfirm: "Confirm password",
        welcome: "Welcome",
        dashboard: "Dashboard",
        folders: "Folders",
        quiz: "Quiz",
        stats: "Statistics",
        todayReviews: "Today's Reviews",
        totalWords: "Total Words",
        todayDue: "Due Today",
        mastered: "Mastered",
        streak: "Daily Streak",
        streakDays: "days",
        createFolder: "Create New Folder",
        folderName: "Enter folder name",
        create: "Create",
        myFolders: "My Folders",
        addWord: "Add New Word",
        backToFolders: "← Back to Folders",
        word: "Enter word/term",
        definition: "Enter meaning/definition",
        difficulty: "Difficulty",
        easy: "Easy",
        medium: "Medium",
        hard: "Hard",
        save: "Save",
        cancel: "Cancel",
        edit: "Edit",
        delete: "Delete",
        open: "Open",
        editWord: "Edit Word",
        addNewWord: "Add New Word",
        quizStats: "Quiz Statistics",
        totalQuizzes: "Total Tests",
        averageScore: "Average",
        bestStreak: "Best Streak",
        todayQuizzes: "Today",
        quizTypes: "Quiz Types",
        quickQuiz: "Quick Quiz",
        quickQuizDesc: "5 random words quick test",
        difficultyQuiz: "Difficulty Quiz",
        difficultyQuizDesc: "Hard words only",
        reviewQuiz: "Review Quiz",
        reviewQuizDesc: "Words due for review today",
        masteryQuiz: "Mastery Quiz",
        masteryQuizDesc: "Reinforce learned words",
        folderBasedQuiz: "Folder-Based Quiz",
        folderQuizDesc: "Words from specific folder",
        multipleChoiceQuiz: "Multiple Choice Quiz",
        multipleChoiceQuizDesc: "4-option multiple choice questions",
        spellingQuiz: "Spelling Quiz",
        spellingQuizDesc: "Test correct spelling of words",
        selectCorrectAnswer: "Select the correct answer:",
        typeTheWord: "Type the word:",
        showHint: "💡 Hint",
        hideHint: "❌ Hide Hint",
        selectQuiz: "Select Quiz",
        quizComplete: "Quiz Complete!",
        correct: "Correct",
        incorrect: "Incorrect",
        correctAnswer: "Correct Answer:",
        yourAnswer: "Your Answer:",
        newQuiz: "Select New Quiz",
        completeQuiz: "Complete",
        sameFolder: "Repeat Same Folder",
        howDifficult: "How difficult was this question for you?",
        easyEmoji: "😊 Easy",
        mediumEmoji: "😐 Medium",
        hardEmoji: "😰 Hard",
        logout: "Logout",
        noWordsInFolder: "No words in this folder yet.",
        noFoldersYet: "No folders created yet.",
        noDueWords: "No words due for review today! 🎉",
        allWordsUpToDate: "Great! All your words are up to date.",
        reviewTime: "Review Time!",
        wordsWaitingReview: "words waiting for review.",
        startQuiz: "Start Quiz",
        exit: "Exit",
        question: "Question",
        whatMeaning: "What does this mean?",
        writeAnswer: "Write your answer...",
        checkAnswer: "Check Answer",
        words: "words",
        reviewCount: "Reviews:",
        nextReview: "Next:",
        addSubFolder: "Add Subfolder",
        subFolders: "Subfolders",
        totalWords: "total",
        tutorialWelcome: "Welcome to the Remember It app! This quick tour will teach you how to use the application.",
        tutorialFolders: "In the Folders tab, you can organize your words. Create folders by topics and add subfolders.",
        tutorialWords: "You can add words to each folder. Set the word, meaning, and difficulty level.",
        tutorialQuiz: "In the Quiz tab, you can test your words. Different quiz types and folder-based quizzes are available.",
        tutorialStats: "In the Statistics tab, you can track your learning progress. See forgetting curves and success rates.",
        tutorialNotifications: "The app will notify you when it's time to review words. So you won't miss any repetitions.",
        tutorialThemes: "Use the moon/sun icon in the top right to switch between dark and light themes.",
        tutorialLanguages: "Use the language icon to change the app's language. 5 different languages are supported.",
        tutorialReady: "You're ready now! You can start your Remember It journey. Good luck!",
        tutorialCompleted: "Tutorial completed! You can now start using the app.",
        notifications: "Notifications",
        themes: "Themes",
        languages: "Languages", 
        ready: "Ready",
        finish: "Finish",
        next: "Next",
        skip: "Skip",
        weeklyActivity: "Weekly Activity",
        learningCurve: "Learning Curve",
        monthlyStats: "Monthly Statistics",
        quizPerformance: "Quiz Performance", 
        difficultyDistribution: "Difficulty Distribution",
        accuracy: "Accuracy",
        quizzes: "tests",
        searchTitle: "Search and Filter",
        toggleFilters: "Filters",
        searchPlaceholder: "Search words or folders...",
        difficultyFilterLabel: "Difficulty Level",
        dateFilterLabel: "Creation Date",
        sortFilterLabel: "Sort By",
        allItems: "All",
        today: "Today",
        thisWeek: "This Week",
        thisMonth: "This Month",
        last3Months: "Last 3 Months",
        sortByName: "By Name",
        sortByDate: "By Date",
        sortByDifficulty: "By Difficulty",
        sortByWordCount: "By Word Count",
        clearSearch: "Clear",
        searchResultsFound: "results found",
        noSearchResults: "No results found matching search criteria",
        quizFilterTitle: "Quiz Filter",
        allDifficulties: "All Difficulties",
        easyWords: "Easy Words",
        mediumWords: "Medium Words",
        hardWords: "Hard Words",
        filteredWordsAvailable: "words available",
        wordsWaitingReview: "words waiting for review",
        reviewInQuizSection: "You can study these words from the \"Review Quiz\" section in the Quiz tab",
        goToReviewQuiz: "Go to Review Quiz",
        noWordsToReview: "No words to review today!",
        allWordsUpToDateMsg: "Great! All your words are up to date.",
        achievementBadges: "Achievement Badges",
        learningTrend: "Learning Trend",
        greatProgress: "Great progress!",
        thisWeekShort: "this week",
        weeklyQuizzesLabel: "Weekly Quizzes",
        monthlyWordsLabel: "Monthly Words",
        successRateLabel: "Success Rate",
        todayActivityLabel: "Today's Activity",
        todayReviewsTitle: "Today's Reviews",
        allDifficultiesFilter: "All Difficulties",
        betterThanLastWeek: "{percent}% better than last week!",
        slowerPace: "Slowed down a bit, keep going!",
        keepGoing: "Keep going!",
        streakTitle: "🔥 Daily Streak",
        streakDaysText: "days",
        totalWordsTitle: "📚 Total Words",
        dueTodayTitle: "⏰ Due Today",
        masteredTitle: "✅ Mastered",
        // Badge titles
        badge_firstStep: "First Step",
        badge_beginning: "Beginning",
        badge_collector: "Collector",
        badge_wordMonster: "Word Monster",
        badge_wordHunter: "Word Hunter",
        badge_library: "Library",
        badge_collectorPro: "Collector Pro",
        badge_encyclopedia: "Encyclopedia",
        badge_wordScholar: "Word Scholar",
        badge_wordMillionaire: "Word Millionaire",
        badge_firstWeek: "First Week",
        badge_fireBall: "Fire Ball",
        badge_dailyRoutine: "Daily Routine",
        badge_determined: "Determined",
        badge_superStreak: "Super Streak",
        badge_monthlyHero: "Monthly Hero",
        badge_legendStreak: "Legend Streak",
        badge_ironWill: "Iron Will",
        badge_yearStreak: "Year Streak",
        badge_streakKing: "Streak King",
        badge_quizStarter: "Quiz Starter",
        badge_quizFan: "Quiz Fan",
        badge_quizMaster: "Quiz Master",
        badge_marathonRunner: "Marathon Runner",
        badge_quizLegend: "Quiz Legend",
        badge_superMarathon: "Super Marathon",
        badge_quizGod: "Quiz God",
        badge_quizEmperor: "Quiz Emperor",
        badge_quizUniverse: "Quiz Universe",
        badge_quizLegendMax: "Quiz Legend",
        badge_memoryStarter: "Memory Starter",
        badge_memoryChampion: "Memory Champion",
        badge_memoryAthlete: "Memory Athlete",
        badge_memoryGenius: "Memory Genius",
        badge_antiRote: "Anti-Rote",
        badge_memoryProfessor: "Memory Professor",
        badge_perfectMemory: "Perfect Memory",
        badge_memoryOlympian: "Memory Olympian",
        badge_memoryChampionPro: "Memory Champion Pro",
        badge_memoryDiamond: "Memory Diamond",
        badge_goodStart: "Good Start",
        badge_perfectionist: "Perfectionist",
        badge_flawless: "Flawless",
        badge_organizer: "Organizer",
        badge_superOrganizer: "Super Organizer",
        badge_archivist: "Archivist",
        badge_activityMonster: "Activity Monster",
        badge_superActive: "Super Active",
        badge_hyperActive: "Hyper Active",
        badge_appLegend: "Remember It Legend",
        // Notification texts
        notificationPermissionTitle: "Enable Notifications",
        notificationPermissionDesc: "Allow us to notify you when it's time to review",
        notificationPermissionButton: "Allow",
        notificationEnabled: "Notifications Enabled",
        notificationDisabled: "Notifications Disabled",
        dailyReminderTime: "Daily Reminder Time",
        saveButton: "Save",
        settingsTitle: "Settings",
        notificationSettings: "Notification Settings",
        appearanceSettings: "Appearance",
        accountStats: "Account Statistics",
        accountInfo: "Account",
        totalWords: "Total Words",
        totalQuizzes: "Total Quizzes",
        dailyStreak: "Daily Streak",
        folders: "Folders",
        name: "Name",
        email: "Email",
        registrationDate: "Registration Date",
        closeButton: "Close",
        darkMode: "Dark Mode",
        language: "Language",
        streakInDanger: "Streak in Danger!",
        streakWarning: "day streak at risk! Complete a quiz today.",
        newBadgeEarned: "New Badge Earned!",
        notificationGranted: "Notifications enabled!",
        notificationActive: "Notifications Active!",
        notificationActiveDesc: "We'll notify you when it's time to review.",
        notificationDenied: "Notification permission denied",
        notificationError: "Could not get notification permission",
        notificationNotSupported: "Your browser doesn't support notifications",
        reminderTimeSet: "Reminder time set to {time}",
        newBadge: "New Badge!",
        badgeEarned: "badge earned!"

    }
};

// Çeviri fonksiyonu
function t(key) {
    return translations[currentLanguage][key] || translations['tr'][key] || key;
}

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
    // Tüm çeviri güncellemeleri
    const elements = {
        'introTitle': 'introTitle',
        'introSubtitle': 'introSubtitle', 
        'feature1Title': 'feature1Title',
        'feature1Desc': 'feature1Desc',
        'feature2Title': 'feature2Title',
        'feature2Desc': 'feature2Desc',
        'feature3Title': 'feature3Title',
        'feature3Desc': 'feature3Desc',
        'feature4Title': 'feature4Title',
        'feature4Desc': 'feature4Desc',
        'feature5Title': 'feature5Title',
        'feature5Desc': 'feature5Desc',
        'startButton': 'startButton',
        'introFooter': 'introFooter',
        'loginTabBtn': 'login',
        'registerTabBtn': 'register',
        'dashboardTab': 'dashboard',
        'foldersTab': 'folders',
        'quizTab': 'quiz',
        'statsTab': 'stats',
        'logoutBtn': 'logout'
    };

    Object.entries(elements).forEach(([elementId, translationKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = t(translationKey);
        }
    });

    // Yeni quiz türleri için çeviri güncellemeleri
    const quizElements = {
        'multipleChoiceQuizTitle': 'multipleChoiceQuiz',
        'multipleChoiceQuizDesc': 'multipleChoiceQuizDesc',
        'spellingQuizTitle': 'spellingQuiz',
        'spellingQuizDesc': 'spellingQuizDesc',
        'learningCurveTitle': 'learningCurve',
        'monthlyStatsTitle': 'monthlyStats',
        'quizPerformanceTitle': 'quizPerformance'
    };

    Object.entries(quizElements).forEach(([elementId, translationKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = t(translationKey);
        }
    });

    // Arama sistemi çevirileri
    const searchElements = {
        'searchTitle': 'searchTitle',
        'toggleFiltersBtn': 'toggleFilters',
        'difficultyFilterLabel': 'difficultyFilterLabel',
        'dateFilterLabel': 'dateFilterLabel',
        'sortFilterLabel': 'sortFilterLabel',
        'clearSearchBtn': 'clearSearch',
        'quizFilterTitle': 'quizFilterTitle'
    };

    Object.entries(searchElements).forEach(([elementId, translationKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = t(translationKey);
        }
    });

    // Dashboard yeni elementler
    const dashboardElements = {
        'learningTrendTitle': 'learningTrend',
        'weeklyQuizzesLabel': 'weeklyQuizzesLabel',
        'monthlyWordsLabel': 'monthlyWordsLabel',
        'successRateLabel': 'successRateLabel',
        'todayActivityLabel': 'todayActivityLabel',
        'achievementBadgesTitle': 'achievementBadges',
        'todayReviewsTitleMain': 'todayReviewsTitle',
        'streakTitleMain': 'streakTitle',
        'streakDaysText': 'streakDaysText',
        'totalWordsTitleMain': 'totalWordsTitle',
        'dueTodayTitleMain': 'dueTodayTitle',
        'masteredTitleMain': 'masteredTitle'
    };

    Object.entries(dashboardElements).forEach(([elementId, translationKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = t(translationKey);
        }
    });

    // Placeholder güncellemeleri
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = t('searchPlaceholder');
    }

    // Select option güncellemeleri
    updateSelectOptions();

    // Placeholder güncellemeleri
    const placeholders = {
        'loginEmail': 'loginEmail',
        'loginPassword': 'loginPassword',
        'registerName': 'registerName',
        'registerEmail': 'registerEmail',
        'registerPassword': 'registerPassword',
        'registerPasswordConfirm': 'registerPasswordConfirm'
    };

    Object.entries(placeholders).forEach(([elementId, translationKey]) => {
        const element = document.getElementById(elementId);
        if (element) {
            element.placeholder = t(translationKey);
        }
    });

    // Başlık güncellemeleri
    const loginTitle = document.getElementById('loginTitle');
    if (loginTitle) loginTitle.textContent = t('appTitle');
    
    const appTitle = document.getElementById('appTitle');
    if (appTitle) appTitle.textContent = t('appTitle');
}

function updateSelectOptions() {
    // Zorluk seviyesi select'i güncelle
    const difficultyFilter = document.getElementById('difficultyFilter');
    if (difficultyFilter) {
        const selectedValue = difficultyFilter.value;
        difficultyFilter.innerHTML = `
            <option value="">${t('allItems')}</option>
            <option value="easy">${t('easy')}</option>
            <option value="medium">${t('medium')}</option>
            <option value="hard">${t('hard')}</option>
        `;
        difficultyFilter.value = selectedValue;
    }

    // Dashboard zorluk filtresi
    const dashboardDifficultyFilter = document.getElementById('dashboardDifficultyFilter');
    if (dashboardDifficultyFilter) {
        const selectedValue = dashboardDifficultyFilter.value;
        dashboardDifficultyFilter.innerHTML = `
            <option value="">${t('allDifficulties')}</option>
            <option value="easy">${t('easy')}</option>
            <option value="medium">${t('medium')}</option>
            <option value="hard">${t('hard')}</option>
        `;
        dashboardDifficultyFilter.value = selectedValue;
    }

    // Quiz zorluk filtresi
    const quizDifficultyFilter = document.getElementById('quizDifficultyFilter');
    if (quizDifficultyFilter) {
        const selectedValue = quizDifficultyFilter.value;
        quizDifficultyFilter.innerHTML = `
            <option value="">${t('allDifficulties')}</option>
            <option value="easy">${t('easyWords')}</option>
            <option value="medium">${t('mediumWords')}</option>
            <option value="hard">${t('hardWords')}</option>
        `;
        quizDifficultyFilter.value = selectedValue;
    }

    // Tarih filtresi select'i güncelle
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        const selectedValue = dateFilter.value;
        dateFilter.innerHTML = `
            <option value="">${t('allItems')}</option>
            <option value="today">${t('today')}</option>
            <option value="week">${t('thisWeek')}</option>
            <option value="month">${t('thisMonth')}</option>
            <option value="3months">${t('last3Months')}</option>
        `;
        dateFilter.value = selectedValue;
    }

    // Sıralama select'i güncelle
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        const selectedValue = sortFilter.value;
        sortFilter.innerHTML = `
            <option value="name">${t('sortByName')}</option>
            <option value="date">${t('sortByDate')}</option>
            <option value="difficulty">${t('sortByDifficulty')}</option>
            <option value="wordCount">${t('sortByWordCount')}</option>
        `;
        sortFilter.value = selectedValue;
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    initTheme();
    initLanguage();
    debugLog('Page loaded, auto-login disabled for cross-device compatibility');
});

// Temel fonksiyonlar
function showLoginScreen() {
    document.getElementById('introScreen').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
}

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

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Sekme içeriğini yükle
    switch(tabName) {
        case 'folders':
            renderFolders();
            break;
        case 'quiz':
            renderQuizMenu();
            break;
        case 'stats':
            renderStats();
            break;
        case 'dashboard':
            updateDashboard();
            break;
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification fixed top-4 right-4 z-50 px-4 py-2 rounded-md text-white ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 
        type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Cloud Storage Functions - GÜVENLİ VERSİYON (Local test için fallback)
async function saveUserToCloud(email, userData) {
    try {
        const binName = `user_${email.replace('@', '_').replace(/\./g, '_')}`;
        debugLog('Creating bin with name', { binName, email });
        
        if (API.useProxy) {
            // Production - Netlify Function
            const response = await fetch(API.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'create',
                    binName: binName,
                    data: userData
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            if (result.metadata?.id) {
                localStorage.setItem(`binId_${email}`, result.metadata.id);
            }
            return result;
        } else {
            // Development - direkt JSONBin API (sadece local test için)
            const response = await fetch(API.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API.apiKey,
                    'X-Bin-Name': binName
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }

            const result = await response.json();
            localStorage.setItem(`binId_${email}`, result.metadata.id);
            return result;
        }
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
        debugLog('Bin ID from localStorage', { binId });
        
        if (!binId) {
            debugLog('No bin ID in localStorage, searching...');
            binId = await findBinIdByEmail(email);
            if (binId) {
                localStorage.setItem(`binId_${email}`, binId);
                debugLog('Bin ID found and saved to localStorage', { binId });
            }
        }
        
        if (!binId) {
            debugLog('No bin ID found for user');
            return null;
        }

        if (API.useProxy) {
            // Production - Netlify Function
            const response = await fetch(API.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'read',
                    binId: binId
                })
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.record;
        } else {
            // Development - direkt JSONBin API (sadece local test için)
            const response = await fetch(`${API.endpoint}/${binId}`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': API.apiKey
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    return null;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            return result.record;
        }
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
        
        if (API.useProxy) {
            // Production - Netlify Function
            const response = await fetch(API.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'list'
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            const matchingBin = result.find(bin => bin.name === binName);
            return matchingBin ? matchingBin.id : null;
        } else {
            // Development - direkt JSONBin API (sadece local test için)
            const response = await fetch('https://api.jsonbin.io/v3/c/bins', {
                method: 'GET',
                headers: {
                    'X-Master-Key': API.apiKey
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            const matchingBin = result.find(bin => bin.name === binName);
            return matchingBin ? matchingBin.id : null;
        }
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

        if (API.useProxy) {
            // Production - Netlify Function
            const response = await fetch(API.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'update',
                    binId: binId,
                    data: userData
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } else {
            // Development - direkt JSONBin API (sadece local test için)
            const response = await fetch(`${API.endpoint}/${binId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': API.apiKey
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        }
    } catch (error) {
        console.error('Update cloud error:', error);
        throw error;
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Authentication Functions - GÜVENLİ VERSİYON
async function loginUser() {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    debugLog('Login attempt', { email, passwordLength: password.length });

    // 🛡️ INPUT VALIDATION
    if (!email || !password) {
        showNotification('❌ E-mail ve şifre gerekli!', 'error');
        return;
    }

    // 🛡️ EMAIL VALIDATION
    if (!isValidEmail(email)) {
        showNotification('❌ Geçerli bir e-mail adresi girin!', 'error');
        emailInput.classList.add('border-red-500');
        return;
    }
    emailInput.classList.remove('border-red-500');

    // 🛡️ RATE LIMITING
    if (!rateLimiter.canMakeRequest('login')) {
        const waitTime = Math.ceil(rateLimiter.getTimeUntilReset('login') / 1000);
        showNotification(`❌ Çok fazla deneme! ${waitTime} saniye bekleyin.`, 'error');
        return;
    }

    try {
        showNotification('🔄 Giriş yapılıyor...', 'info');
        
        debugLog('Loading user from cloud...');
        const userData = await loadUserFromCloud(email);
        
        if (!userData) {
            debugLog('User not found in cloud');
            showNotification('❌ Bu e-mail ile kayıtlı hesap bulunamadı!', 'error');
            return;
        }

        debugLog('User found, checking password...');
        const hashedPassword = await hashPassword(password);
        debugLog('Password hashes', { stored: userData.password?.substring(0, 10) + '...', entered: hashedPassword.substring(0, 10) + '...' });
        
        if (userData.password !== hashedPassword) {
            debugLog('Password mismatch');
            showNotification('❌ Şifre yanlış!', 'error');
            return;
        }

        debugLog('Login successful');
        currentUser = email;
        currentUserData = userData;
        
        const binId = localStorage.getItem(`binId_${email}`);
        if (!binId) {
            const foundBinId = await findBinIdByEmail(email);
            if (foundBinId) {
                localStorage.setItem(`binId_${email}`, foundBinId);
                debugLog('Bin ID saved to localStorage for future logins', { binId: foundBinId });
            }
        }
        
        showMainApp();
        showNotification(`🎉 Hoş geldin ${escapeHtml(userData.name)}!`, 'success');
        
    } catch (error) {
        debugLog('Login error', error);
        console.error('Login error:', error);
        showNotification('❌ Giriş yapılırken hata oluştu!', 'error');
    }
}

async function registerUser() {
    console.log('🔍 Register function called');
    
    const nameInput = document.getElementById('registerName');
    const emailInput = document.getElementById('registerEmail');
    const passwordInput = document.getElementById('registerPassword');
    const passwordConfirmInput = document.getElementById('registerPasswordConfirm');
    
    console.log('🔍 Input elements:', { nameInput, emailInput, passwordInput, passwordConfirmInput });
    
    const name = nameInput.value.trim();
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;

    console.log('🔍 Input values:', { name, email, passwordLength: password.length });

    // 🛡️ INPUT VALIDATION
    if (!name || !email || !password || !passwordConfirm) {
        alert('❌ Tüm alanları doldurun!');
        return;
    }

    // 🛡️ NAME VALIDATION
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
        alert(`❌ ${nameValidation.error}`);
        nameInput.classList.add('border-red-500');
        return;
    }
    nameInput.classList.remove('border-red-500');

    // 🛡️ EMAIL VALIDATION
    if (!isValidEmail(email)) {
        alert('❌ Geçerli bir e-mail adresi girin!');
        emailInput.classList.add('border-red-500');
        return;
    }
    emailInput.classList.remove('border-red-500');

    // 🛡️ PASSWORD VALIDATION
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
        alert(`❌ ${passwordValidation.errors[0]}`);
        passwordInput.classList.add('border-red-500');
        return;
    }
    passwordInput.classList.remove('border-red-500');

    if (password !== passwordConfirm) {
        alert('❌ Şifreler eşleşmiyor!');
        passwordConfirmInput.classList.add('border-red-500');
        return;
    }
    passwordConfirmInput.classList.remove('border-red-500');

    // 🛡️ RATE LIMITING
    if (!rateLimiter.canMakeRequest('register')) {
        const waitTime = Math.ceil(rateLimiter.getTimeUntilReset('register') / 1000);
        alert(`❌ Çok fazla deneme! ${waitTime} saniye bekleyin.`);
        return;
    }

    try {
        alert('🔄 Hesap oluşturuluyor...');
        console.log('🔍 Checking if user exists...');
        
        const existingUser = await loadUserFromCloud(email);
        console.log('🔍 Existing user check:', existingUser);
        
        if (existingUser) {
            alert('❌ Bu e-mail ile zaten hesap var!');
            return;
        }

        console.log('🔍 Hashing password...');
        const hashedPassword = await hashPassword(password);

        const newUserData = {
            name: escapeHtml(name), // 🛡️ XSS koruması
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

        console.log('🔍 Saving user to cloud...');
        await saveUserToCloud(email, newUserData);

        currentUser = email;
        currentUserData = newUserData;
        
        console.log('🔍 Registration successful!');
        showMainApp();
        alert(`🎉 Hesabın oluşturuldu! Hoş geldin ${escapeHtml(name)}!`);
        
        // İlk kez giriş yapan kullanıcı için tutorial başlat
        if (localStorage.getItem('tutorialCompleted') !== 'true') {
            setTimeout(() => startTutorial(), 1000);
        }
        
    } catch (error) {
        console.error('Register error:', error);
        showNotification('❌ Hesap oluşturulurken hata oluştu!', 'error');
    }
}

function showMainApp() {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUser').textContent = currentUserData.name;
    
    loadUserData();
    updateDashboard();
    
    // Bildirim izni kontrolü ve günlük hatırlatma başlat
    if (Notification.permission === 'granted') {
        scheduleDailyReminder();
    }
    
    // Tekrar edilecek kelimeler için bildirim gönder
    setTimeout(() => {
        const today = new Date().toISOString().split('T')[0];
        const dueWords = userData.words?.filter(word => word.nextReviewDate <= today && !word.mastered) || [];
        
        if (dueWords.length > 0 && Notification.permission === 'granted') {
            sendBrowserNotification(
                '⏰ Tekrar Zamanı!',
                `${dueWords.length} kelime tekrar edilmeyi bekliyor.`,
                'warning'
            );
        }
    }, 2000);
}

function logout() {
    debugLog('Logging out user', { currentUser });
    
    currentUser = null;
    currentUserData = null;
    userData = {};
    
    localStorage.removeItem('currentUser');
    
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
    showNotification('👋 Başarıyla çıkış yaptın!', 'success');
}

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
        
        updateDashboard();
        
    } catch (error) {
        console.error('Save user data error:', error);
        showNotification('❌ Veriler kaydedilirken hata oluştu!', 'error');
    }
}
function updateDashboard() {
    if (!userData) return;
    
    // İstatistikleri güncelle
    document.getElementById('totalWords').textContent = userData.words?.length || 0;
    document.getElementById('masteredWords').textContent = userData.stats?.masteredWords || 0;
    document.getElementById('streakCount').textContent = userData.stats?.streak || 0;
    
    // Bugün tekrar edilecek kelimeler
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words?.filter(word => word.nextReviewDate <= today && !word.mastered) || [];
    document.getElementById('dueToday').textContent = dueWords.length;
    
    // Tekrar listesi
    updateDashboardReviewsList(dueWords);
    
    // Bildirimler alanını güncelle
    updateNotifications();
    
    // Yeni özellikler
    updateLearningTrend();
    updateMiniStats();
    updateAchievementBadges();
}

function updateDashboardWithFilter() {
    const difficultyFilter = document.getElementById('dashboardDifficultyFilter');
    const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';
    
    const today = new Date().toISOString().split('T')[0];
    let dueWords = userData.words?.filter(word => word.nextReviewDate <= today && !word.mastered) || [];
    
    // Zorluk seviyesi filtresini uygula
    if (selectedDifficulty) {
        dueWords = dueWords.filter(word => word.difficulty === selectedDifficulty);
    }
    
    updateDashboardReviewsList(dueWords);
}

function updateDashboardReviewsList(dueWords) {
    const reviewsList = document.getElementById('reviewsList');
    
    if (dueWords.length === 0) {
        reviewsList.innerHTML = `
            <div class="text-center py-4">
                <div class="text-4xl mb-2">🎉</div>
                <p class="text-gray-600 font-medium">${t('noWordsToReview')}</p>
                <p class="text-gray-500 text-sm mt-1">${t('allWordsUpToDateMsg')}</p>
            </div>
        `;
    } else {
        const difficultyFilter = document.getElementById('dashboardDifficultyFilter');
        const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';
        const difficultyText = selectedDifficulty ? ` (${t(selectedDifficulty)})` : '';
        
        reviewsList.innerHTML = `
            <div class="text-center py-4">
                <div class="text-4xl mb-2">📚</div>
                <p class="text-gray-800 font-medium text-lg mb-2">
                    ${dueWords.length} ${t('wordsWaitingReview')}${difficultyText}
                </p>
                <p class="text-gray-600 text-sm mb-4">
                    ${t('reviewInQuizSection')}
                </p>
                <button 
                    onclick="startReviewQuiz()" 
                    class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                    🎯 ${t('goToReviewQuiz')}
                </button>
            </div>
        `;
    }
}

function updateNotifications() {
    const notificationsArea = document.getElementById('notificationsArea');
    if (!notificationsArea) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words?.filter(word => word.nextReviewDate <= today && !word.mastered) || [];
    
    // Bildirim izni kontrolü
    const hasNotificationPermission = Notification.permission === 'granted';
    
    let notificationsHTML = '';
    
    // Tekrar edilecek kelime bildirimi
    if (dueWords.length > 0) {
        notificationsHTML += `
            <div class="bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900 border-l-4 border-orange-500 p-4 rounded-lg mb-4 shadow-md">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-3xl mr-3">⏰</span>
                        <div>
                            <h3 class="font-bold text-orange-800 dark:text-orange-200">${t('reviewTime')}</h3>
                            <p class="text-orange-700 dark:text-orange-300 text-sm">${dueWords.length} ${t('wordsWaitingReview')}</p>
                        </div>
                    </div>
                    <button onclick="startReviewQuiz()" class="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold transition-colors">
                        ${t('startQuiz')}
                    </button>
                </div>
            </div>
        `;
    }
    
    // Bildirim izni isteme
    if (!hasNotificationPermission && Notification.permission !== 'denied') {
        notificationsHTML += `
            <div class="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 border-l-4 border-blue-500 p-4 rounded-lg mb-4 shadow-md">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <span class="text-3xl mr-3">🔔</span>
                        <div>
                            <h3 class="font-bold text-blue-800 dark:text-blue-200">Bildirimleri Aç</h3>
                            <p class="text-blue-700 dark:text-blue-300 text-sm">Tekrar zamanı geldiğinde seni bilgilendirmemize izin ver</p>
                        </div>
                    </div>
                    <button onclick="requestNotificationPermission()" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold transition-colors">
                        İzin Ver
                    </button>
                </div>
            </div>
        `;
    }
    
    // Seri tehlikede bildirimi
    const lastStudyDate = userData.stats?.lastStudyDate;
    if (lastStudyDate) {
        const daysSinceLastStudy = Math.floor((new Date() - new Date(lastStudyDate)) / (1000 * 60 * 60 * 24));
        if (daysSinceLastStudy >= 1 && userData.stats.streak > 0) {
            notificationsHTML += `
                <div class="bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900 dark:to-orange-900 border-l-4 border-yellow-500 p-4 rounded-lg mb-4 shadow-md">
                    <div class="flex items-center">
                        <span class="text-3xl mr-3">⚠️</span>
                        <div>
                            <h3 class="font-bold text-yellow-800 dark:text-yellow-200">Serin Tehlikede!</h3>
                            <p class="text-yellow-700 dark:text-yellow-300 text-sm">${userData.stats.streak} günlük serini kaybetme! Bugün bir quiz çöz.</p>
                        </div>
                    </div>
                </div>
            `;
        }
    }
    
    // Başarı bildirimi
    const recentBadges = checkRecentBadges();
    if (recentBadges.length > 0) {
        notificationsHTML += `
            <div class="bg-gradient-to-r from-green-100 to-teal-100 dark:from-green-900 dark:to-teal-900 border-l-4 border-green-500 p-4 rounded-lg mb-4 shadow-md">
                <div class="flex items-center">
                    <span class="text-3xl mr-3">🏆</span>
                    <div>
                        <h3 class="font-bold text-green-800 dark:text-green-200">Yeni Rozet Kazandın!</h3>
                        <p class="text-green-700 dark:text-green-300 text-sm">${recentBadges[0].icon} ${recentBadges[0].title}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    notificationsArea.innerHTML = notificationsHTML;
}

// Bildirim izni isteme
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        showNotification(`❌ ${t('notificationNotSupported')}`, 'error');
        return;
    }
    
    try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
            showNotification(`✅ ${t('notificationGranted')}`, 'success');
            
            // Test bildirimi gönder
            sendBrowserNotification(
                `🎉 ${t('notificationActive')}`,
                t('notificationActiveDesc'),
                'success'
            );
            
            // Günlük hatırlatma ayarla
            scheduleDailyReminder();
            
            updateNotifications();
        } else if (permission === 'denied') {
            showNotification(`❌ ${t('notificationDenied')}`, 'error');
        }
    } catch (error) {
        console.error('Notification permission error:', error);
        showNotification(`❌ ${t('notificationError')}`, 'error');
    }
}

// Tarayıcı bildirimi gönder
function sendBrowserNotification(title, body, type = 'info') {
    if (!('Notification' in window)) {
        return;
    }
    
    if (Notification.permission !== 'granted') {
        return;
    }
    
    const icon = type === 'success' ? '✅' : 
                 type === 'warning' ? '⚠️' : 
                 type === 'error' ? '❌' : '📚';
    
    const notification = new Notification(title, {
        body: body,
        icon: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIj48cmVjdCB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgZmlsbD0iIzNiODJmNiIvPjx0ZXh0IHg9Ijk2IiB5PSIxMjAiIGZvbnQtc2l6ZT0iODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIj7wn6eg8J+SrDwvdGV4dD48L3N2Zz4=',
        badge: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiI+PHJlY3Qgd2lkdGg9Ijk2IiBoZWlnaHQ9Ijk2IiBmaWxsPSIjM2I4MmY2Ii8+PHRleHQgeD0iNDgiIHk9IjY1IiBmb250LXNpemU9IjQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSI+8J+noDwvdGV4dD48L3N2Zz4=',
        tag: 'akilda-kal-notification',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
    });
    
    notification.onclick = function() {
        window.focus();
        notification.close();
        
        // Tekrar bildirimi ise quiz sekmesine yönlendir
        if (title.includes('Tekrar') || title.includes('Review')) {
            showTab('quiz');
        }
    };
    
    // 10 saniye sonra otomatik kapat
    setTimeout(() => {
        notification.close();
    }, 10000);
}

// Günlük hatırlatma planla
function scheduleDailyReminder() {
    // LocalStorage'dan hatırlatma saatini al (varsayılan: 20:00)
    const reminderTime = localStorage.getItem('reminderTime') || '20:00';
    const [hours, minutes] = reminderTime.split(':').map(Number);
    
    // Bugünün hatırlatma zamanını hesapla
    const now = new Date();
    const reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
    
    // Eğer bugünün hatırlatma zamanı geçtiyse, yarına ayarla
    if (reminderDate <= now) {
        reminderDate.setDate(reminderDate.getDate() + 1);
    }
    
    const timeUntilReminder = reminderDate - now;
    
    // Hatırlatmayı planla
    setTimeout(() => {
        checkAndSendDailyReminder();
        // Bir sonraki gün için tekrar planla
        scheduleDailyReminder();
    }, timeUntilReminder);
    
    console.log(`Günlük hatırlatma planlandı: ${reminderDate.toLocaleString()}`);
}

// Günlük hatırlatma kontrolü ve gönderimi
function checkAndSendDailyReminder() {
    if (!currentUser || !userData) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words?.filter(word => word.nextReviewDate <= today && !word.mastered) || [];
    
    if (dueWords.length > 0) {
        sendBrowserNotification(
            '⏰ Tekrar Zamanı!',
            `${dueWords.length} kelime tekrar edilmeyi bekliyor. Hadi başlayalım!`,
            'warning'
        );
    } else {
        // Seri kontrolü
        const lastStudyDate = userData.stats?.lastStudyDate;
        if (lastStudyDate) {
            const daysSinceLastStudy = Math.floor((new Date() - new Date(lastStudyDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceLastStudy >= 1 && userData.stats.streak > 0) {
                sendBrowserNotification(
                    '🔥 Serin Tehlikede!',
                    `${userData.stats.streak} günlük serini kaybetme! Bugün bir quiz çöz.`,
                    'warning'
                );
            }
        }
    }
}

// Yeni rozet kontrolü
function checkRecentBadges() {
    const recentBadges = [];
    const lastBadgeCheck = localStorage.getItem('lastBadgeCheck');
    const now = Date.now();
    
    // Son 5 dakika içinde kontrol edildiyse atla
    if (lastBadgeCheck && (now - parseInt(lastBadgeCheck)) < 5 * 60 * 1000) {
        return recentBadges;
    }
    
    localStorage.setItem('lastBadgeCheck', now.toString());
    
    const stats = userData.stats || {};
    const words = userData.words || [];
    const totalQuizzes = stats.totalQuizzes || 0;
    const masteredWords = stats.masteredWords || 0;
    const streak = stats.streak || 0;
    
    // Basit rozet kontrolü (sadece tam eşleşmelerde bildirim)
    const badges = [
        { count: words.length, threshold: 1, icon: '🎯', title: t('badge_firstStep') },
        { count: words.length, threshold: 10, icon: '📝', title: t('badge_beginning') },
        { count: words.length, threshold: 50, icon: '📚', title: t('badge_collector') },
        { count: words.length, threshold: 100, icon: '📖', title: t('badge_wordMonster') },
        { count: streak, threshold: 7, icon: '🔥', title: t('badge_fireBall') },
        { count: streak, threshold: 30, icon: '💥', title: t('badge_superStreak') },
        { count: totalQuizzes, threshold: 10, icon: '🎮', title: t('badge_quizStarter') },
        { count: totalQuizzes, threshold: 50, icon: '🎯', title: t('badge_quizFan') },
        { count: totalQuizzes, threshold: 100, icon: '🏆', title: t('badge_quizMaster') },
        { count: masteredWords, threshold: 10, icon: '🧩', title: t('badge_memoryStarter') },
        { count: masteredWords, threshold: 30, icon: '🧠', title: t('badge_memoryChampion') }
    ];
    
    for (const badge of badges) {
        if (badge.count === badge.threshold) {
            recentBadges.push(badge);
            
            // Tarayıcı bildirimi gönder
            sendBrowserNotification(
                `🏆 ${t('newBadge')}`,
                `${badge.icon} ${badge.title} ${t('badgeEarned')}`,
                'success'
            );
        }
    }
    
    return recentBadges;
}

// Hatırlatma saati ayarlama
function setReminderTime(time) {
    localStorage.setItem('reminderTime', time);
    showNotification(`✅ ${t('reminderTimeSet').replace('{time}', time)}`, 'success');
    
    // Yeni hatırlatmayı planla
    scheduleDailyReminder();
}

// Öğrenme Trendi
function updateLearningTrend() {
    const activities = userData.stats?.activities || [];
    const today = new Date();
    
    // Bu hafta ve geçen hafta quiz sayıları
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    
    const thisWeekQuizzes = activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return a.type === 'quiz_completed' && activityDate >= thisWeekStart;
    }).length;
    
    const lastWeekQuizzes = activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return a.type === 'quiz_completed' && activityDate >= lastWeekStart && activityDate < thisWeekStart;
    }).length;
    
    // Trend hesapla
    let trendPercentage = 0;
    let trendIcon = '📈';
    let trendText = 'Harika gidiyorsun!';
    let trendColor = 'text-green-600';
    
    if (lastWeekQuizzes > 0) {
        trendPercentage = Math.round(((thisWeekQuizzes - lastWeekQuizzes) / lastWeekQuizzes) * 100);
    } else if (thisWeekQuizzes > 0) {
        trendPercentage = 100;
    }
    
    if (trendPercentage > 0) {
        trendIcon = '📈';
        trendText = t('betterThanLastWeek').replace('{percent}', trendPercentage);
        trendColor = 'text-green-600';
    } else if (trendPercentage < 0) {
        trendIcon = '📉';
        trendText = t('slowerPace');
        trendColor = 'text-orange-600';
    } else {
        trendIcon = '📊';
        trendText = t('keepGoing');
        trendColor = 'text-blue-600';
    }
    
    document.getElementById('trendIcon').textContent = trendIcon;
    document.getElementById('trendText').textContent = trendText;
    document.getElementById('trendPercentage').textContent = trendPercentage > 0 ? `+${trendPercentage}%` : `${trendPercentage}%`;
    document.getElementById('trendPercentage').className = `text-2xl font-bold ${trendColor}`;
    document.getElementById('trendSubtext').textContent = t('thisWeekShort');
}

// Mini İstatistikler
function updateMiniStats() {
    const activities = userData.stats?.activities || [];
    const today = new Date();
    
    // Bu hafta quiz sayısı
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    const weeklyQuizzes = activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return a.type === 'quiz_completed' && activityDate >= weekStart;
    }).length;
    
    // Bu ay eklenen kelime sayısı
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyWords = activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return a.type === 'word_added' && activityDate >= monthStart;
    }).length;
    
    // Başarı oranı
    const totalQuizzes = activities.filter(a => a.type === 'quiz_completed').length;
    const correctAnswers = activities.filter(a => a.type === 'quiz_completed' && a.isCorrect).length;
    const successRate = totalQuizzes > 0 ? Math.round((correctAnswers / totalQuizzes) * 100) : 0;
    
    // Bugün aktivite
    const todayStr = today.toISOString().split('T')[0];
    const todayActivity = activities.filter(a => {
        const activityDate = new Date(a.timestamp).toISOString().split('T')[0];
        return activityDate === todayStr;
    }).length;
    
    document.getElementById('weeklyQuizzes').textContent = weeklyQuizzes;
    document.getElementById('monthlyWords').textContent = monthlyWords;
    document.getElementById('successRate').textContent = successRate + '%';
    document.getElementById('todayActivity').textContent = todayActivity;
}

// Başarı Rozetleri
let badgesExpanded = false;

function toggleBadges() {
    badgesExpanded = !badgesExpanded;
    const container = document.getElementById('achievementBadges');
    const toggle = document.getElementById('badgeToggle');
    
    if (badgesExpanded) {
        container.style.maxHeight = 'none';
        toggle.style.transform = 'rotate(180deg)';
    } else {
        container.style.maxHeight = '96px';
        toggle.style.transform = 'rotate(0deg)';
    }
}

function updateAchievementBadges() {
    const badges = [];
    const stats = userData.stats || {};
    const words = userData.words || [];
    const activities = userData.stats?.activities || [];
    const folderCount = userData.folders?.length || 0;
    const totalQuizzes = stats.totalQuizzes || 0;
    const successRate = stats.averageScore || 0;
    const masteredWords = stats.masteredWords || 0;
    const streak = stats.streak || 0;
    
    // 1-10: Kelime Sayısı Rozetleri
    badges.push({ icon: words.length >= 1 ? '🎯' : '🔒', title: t('badge_firstStep'), unlocked: words.length >= 1, progress: `${Math.min(words.length, 1)}/1` });
    badges.push({ icon: words.length >= 10 ? '📝' : '🔒', title: t('badge_beginning'), unlocked: words.length >= 10, progress: `${Math.min(words.length, 10)}/10` });
    badges.push({ icon: words.length >= 50 ? '📚' : '🔒', title: t('badge_collector'), unlocked: words.length >= 50, progress: `${Math.min(words.length, 50)}/50` });
    badges.push({ icon: words.length >= 100 ? '📖' : '🔒', title: t('badge_wordMonster'), unlocked: words.length >= 100, progress: `${Math.min(words.length, 100)}/100` });
    badges.push({ icon: words.length >= 150 ? '🎯' : '🔒', title: t('badge_wordHunter'), unlocked: words.length >= 150, progress: `${Math.min(words.length, 150)}/150` });
    badges.push({ icon: words.length >= 250 ? '📚' : '🔒', title: t('badge_library'), unlocked: words.length >= 250, progress: `${Math.min(words.length, 250)}/250` });
    badges.push({ icon: words.length >= 350 ? '💼' : '🔒', title: t('badge_collectorPro'), unlocked: words.length >= 350, progress: `${Math.min(words.length, 350)}/350` });
    badges.push({ icon: words.length >= 500 ? '📕' : '🔒', title: t('badge_encyclopedia'), unlocked: words.length >= 500, progress: `${Math.min(words.length, 500)}/500` });
    badges.push({ icon: words.length >= 750 ? '📜' : '🔒', title: t('badge_wordScholar'), unlocked: words.length >= 750, progress: `${Math.min(words.length, 750)}/750` });
    badges.push({ icon: words.length >= 1000 ? '💰' : '🔒', title: t('badge_wordMillionaire'), unlocked: words.length >= 1000, progress: `${Math.min(words.length, 1000)}/1000` });
    
    // 11-20: Seri Rozetleri
    badges.push({ icon: streak >= 3 ? '🌱' : '🔒', title: t('badge_firstWeek'), unlocked: streak >= 3, progress: `${Math.min(streak, 3)}/3` });
    badges.push({ icon: streak >= 7 ? '🔥' : '🔒', title: t('badge_fireBall'), unlocked: streak >= 7, progress: `${Math.min(streak, 7)}/7` });
    badges.push({ icon: streak >= 14 ? '📅' : '🔒', title: t('badge_dailyRoutine'), unlocked: streak >= 14, progress: `${Math.min(streak, 14)}/14` });
    badges.push({ icon: streak >= 21 ? '💪' : '🔒', title: t('badge_determined'), unlocked: streak >= 21, progress: `${Math.min(streak, 21)}/21` });
    badges.push({ icon: streak >= 30 ? '💥' : '🔒', title: t('badge_superStreak'), unlocked: streak >= 30, progress: `${Math.min(streak, 30)}/30` });
    badges.push({ icon: streak >= 60 ? '🦸' : '🔒', title: t('badge_monthlyHero'), unlocked: streak >= 60, progress: `${Math.min(streak, 60)}/60` });
    badges.push({ icon: streak >= 100 ? '🌟' : '🔒', title: t('badge_legendStreak'), unlocked: streak >= 100, progress: `${Math.min(streak, 100)}/100` });
    badges.push({ icon: streak >= 180 ? '🛡️' : '🔒', title: t('badge_ironWill'), unlocked: streak >= 180, progress: `${Math.min(streak, 180)}/180` });
    badges.push({ icon: streak >= 365 ? '🎊' : '🔒', title: t('badge_yearStreak'), unlocked: streak >= 365, progress: `${Math.min(streak, 365)}/365` });
    badges.push({ icon: streak >= 500 ? '👑' : '🔒', title: t('badge_streakKing'), unlocked: streak >= 500, progress: `${Math.min(streak, 500)}/500` });
    
    // 21-30: Quiz Rozetleri
    badges.push({ icon: totalQuizzes >= 10 ? '🎮' : '🔒', title: t('badge_quizStarter'), unlocked: totalQuizzes >= 10, progress: `${Math.min(totalQuizzes, 10)}/10` });
    badges.push({ icon: totalQuizzes >= 50 ? '🎯' : '🔒', title: t('badge_quizFan'), unlocked: totalQuizzes >= 50, progress: `${Math.min(totalQuizzes, 50)}/50` });
    badges.push({ icon: totalQuizzes >= 100 ? '🏆' : '🔒', title: t('badge_quizMaster'), unlocked: totalQuizzes >= 100, progress: `${Math.min(totalQuizzes, 100)}/100` });
    badges.push({ icon: totalQuizzes >= 250 ? '🏃' : '🔒', title: t('badge_marathonRunner'), unlocked: totalQuizzes >= 250, progress: `${Math.min(totalQuizzes, 250)}/250` });
    badges.push({ icon: totalQuizzes >= 500 ? '👑' : '🔒', title: t('badge_quizLegend'), unlocked: totalQuizzes >= 500, progress: `${Math.min(totalQuizzes, 500)}/500` });
    badges.push({ icon: totalQuizzes >= 750 ? '🏅' : '🔒', title: t('badge_superMarathon'), unlocked: totalQuizzes >= 750, progress: `${Math.min(totalQuizzes, 750)}/750` });
    badges.push({ icon: totalQuizzes >= 1000 ? '⚡' : '🔒', title: t('badge_quizGod'), unlocked: totalQuizzes >= 1000, progress: `${Math.min(totalQuizzes, 1000)}/1000` });
    badges.push({ icon: totalQuizzes >= 2000 ? '💫' : '🔒', title: t('badge_quizEmperor'), unlocked: totalQuizzes >= 2000, progress: `$.min(totalQuizzes, 2000)}/2000` });
    badges.push({ icon: totalQuizzes >= 5000 ? '🌌' : '🔒', title: 'Quiz Evreni', unlocked: totalQuizzes >= 5000, progress: `${Math.min(totalQuizzes, 5000)}/5000` });
    badges.push({ icon: totalQuizzes >= 10000 ? '🎖️' : '🔒', title: 'Quiz Efsanesi', unlocked: totalQuizzes >= 10000, progress: `${Math.min(totalQuizzes, 10000)}/10000` });
    
    // 31-40: Öğrenme Rozetleri
    badges.push({ icon: masteredWords >= 10 ? '🧩' : '🔒', title: 'Hafıza Başlangıcı', unlocked: masteredWords >= 10, progress: `${Math.min(masteredWords, 10)}/10` });
    badges.push({ icon: masteredWords >= 30 ? '🧠' : '🔒', title: 'Hafıza Şampiyonu', unlocked: masteredWords >= 30, progress: `${Math.min(masteredWords, 30)}/30` });
    badges.push({ icon: masteredWords >= 50 ? '🏋️' : '🔒', title: 'Hafıza Atleti', unlocked: masteredWords >= 50, progress: `${Math.min(masteredWords, 50)}/50` });
    badges.push({ icon: masteredWords >= 100 ? '🎓' : '🔒', title: 'Hafıza Dehası', unlocked: masteredWords >= 100, progress: `${Math.min(masteredWords, 100)}/100` });
    badges.push({ icon: masteredWords >= 150 ? '🎭' : '🔒', title: 'Ezbere Karşı', unlocked: masteredWords >= 150, progress: `${Math.min(masteredWords, 150)}/150` });
    badges.push({ icon: masteredWords >= 250 ? '👨‍🏫' : '🔒', title: 'Hafıza Profesörü', unlocked: masteredWords >= 250, progress: `${Math.min(masteredWords, 250)}/250` });
    badges.push({ icon: masteredWords >= 300 ? '🌟' : '🔒', title: 'Mükemmel Hafıza', unlocked: masteredWords >= 300, progress: `${Math.min(masteredWords, 300)}/300` });
    badges.push({ icon: masteredWords >= 500 ? '🥇' : '🔒', title: 'Hafıza Olimpiyatçısı', unlocked: masteredWords >= 500, progress: `${Math.min(masteredWords, 500)}/500` });
    badges.push({ icon: masteredWords >= 750 ? '🏆' : '🔒', title: 'Hafıza Şampiyonu Pro', unlocked: masteredWords >= 750, progress: `${Math.min(masteredWords, 750)}/750` });
    badges.push({ icon: masteredWords >= 1000 ? '💎' : '🔒', title: 'Hafıza Elması', unlocked: masteredWords >= 1000, progress: `${Math.min(masteredWords, 1000)}/1000` });
    
    // 41-50: Özel Rozetler
    badges.push({ icon: successRate >= 70 && totalQuizzes >= 5 ? '👍' : '🔒', title: 'İyi Başlangıç', unlocked: successRate >= 70 && totalQuizzes >= 5, progress: `%${Math.round(successRate)}` });
    badges.push({ icon: successRate >= 90 && totalQuizzes >= 10 ? '⭐' : '🔒', title: 'Mükemmeliyetçi', unlocked: successRate >= 90 && totalQuizzes >= 10, progress: `%${Math.round(successRate)}` });
    badges.push({ icon: successRate >= 95 && totalQuizzes >= 20 ? '💎' : '🔒', title: 'Kusursuz', unlocked: successRate >= 95 && totalQuizzes >= 20, progress: `%${Math.round(successRate)}` });
    badges.push({ icon: folderCount >= 5 ? '📁' : '🔒', title: 'Organizatör', unlocked: folderCount >= 5, progress: `${Math.min(folderCount, 5)}/5` });
    badges.push({ icon: folderCount >= 10 ? '🗂️' : '🔒', title: 'Süper Organizatör', unlocked: folderCount >= 10, progress: `${Math.min(folderCount, 10)}/10` });
    badges.push({ icon: folderCount >= 20 ? '📂' : '🔒', title: 'Arşivci', unlocked: folderCount >= 20, progress: `${Math.min(folderCount, 20)}/20` });
    badges.push({ icon: activities.length >= 100 ? '🎪' : '🔒', title: 'Aktivite Canavarı', unlocked: activities.length >= 100, progress: `${Math.min(activities.length, 100)}/100` });
    badges.push({ icon: activities.length >= 500 ? '🚀' : '🔒', title: 'Süper Aktif', unlocked: activities.length >= 500, progress: `${Math.min(activities.length, 500)}/500` });
    badges.push({ icon: activities.length >= 1000 ? '💫' : '🔒', title: 'Hiper Aktif', unlocked: activities.length >= 1000, progress: `${Math.min(activities.length, 1000)}/1000` });
    badges.push({ icon: words.length >= 1000 && masteredWords >= 500 && totalQuizzes >= 1000 && streak >= 100 ? '🏆' : '🔒', title: 'Akılda Kal Efsanesi', unlocked: words.length >= 1000 && masteredWords >= 500 && totalQuizzes >= 1000 && streak >= 100, progress: 'Efsane!' });
    
    // Rozet 2: Kelime Koleksiyoncusu
    if (words.length >= 50) {
        badges.push({
            icon: '📚',
            title: 'Koleksiyoncu',
            desc: '50+ kelime ekledin',
            unlocked: true,
            color: 'bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-600'
        });
    } else {
        badges.push({
            icon: '🔒',
            title: 'Koleksiyoncu',
            desc: `${words.length}/50 kelime`,
            unlocked: false,
            color: 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
        });
    }
    
    // Rozet 3: Kelime Canavarı (100 kelime)
    if (words.length >= 100) {
        badges.push({
            icon: '�',
            title: 'Kelime Canavarı',
            desc: '100+ kelime ekledin',
            unlocked: true,
            color: 'bg-teal-100 border-teal-300 dark:bg-teal-900 dark:border-teal-600'
        });
    } else {
        badges.push({
            icon: '🔒',
            title: 'Kelime Canavarı',
            desc: `${words.length}/100 kelime`,
            unlocked: false,
            color: 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
        });
    }
    
    // Rozet 4: Ateş Topu
    if (stats.streak >= 7) {
        badges.push({
            icon: '🔥',
            title: 'Ateş Topu',
            desc: '7 gün üst üste',
            unlocked: true,
            color: 'bg-orange-100 border-orange-300 dark:bg-orange-900 dark:border-orange-600'
        });
    } else {
        badges.push({
            icon: '🔒',
            title: 'Ateş Topu',
            desc: `${stats.streak || 0}/7 gün`,
            unlocked: false,
            color: 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
        });
    }
    
    // Rozet 5: Süper Seri (30 gün)
    if (stats.streak >= 30) {
        badges.push({
            icon: '💥',
            title: 'Süper Seri',
            desc: '30 gün üst üste',
            unlocked: true,
            color: 'bg-red-100 border-red-300 dark:bg-red-900 dark:border-red-600'
        });
    } else {
        badges.push({
            icon: '🔒',
            title: 'Süper Seri',
            desc: `${stats.streak || 0}/30 gün`,
            unlocked: false,
            color: 'bg-gray-100 border-gray-300 dark:bg-gray-700 dark:border-gray-500'
        });
    }
    
    // Rozetleri göster
    const unlockedCount = badges.filter(b => b.unlocked).length;
    const badgeCountEl = document.getElementById('badgeCount');
    if (badgeCountEl) {
        badgeCountEl.textContent = `(${unlockedCount}/50)`;
    }
    
    const badgesContainer = document.getElementById('achievementBadges');
    if (badgesContainer) {
        badgesContainer.innerHTML = badges.map(badge => `
            <div class="border-2 ${badge.unlocked ? 'bg-gradient-to-br from-orange-100 to-amber-100 border-orange-100 dark:from-yellow-900 dark:to-orange-900 dark:border-yellow-600' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'} rounded-lg p-2 text-center transition-all hover:scale-105 ${badge.unlocked ? '' : 'opacity-50'}">
                <div class="text-3xl mb-1">${badge.icon}</div>
                <p class="font-bold text-xs text-gray-800 dark:text-white">${badge.title}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${badge.progress}</p>
            </div>
        `).join('');
    }
}

// Global arama değişkenleri
let currentSearchTerm = '';
let currentFilters = {
    difficulty: '',
    date: '',
    sort: 'name'
};

// Folder Management Functions
function renderFolders() {
    const foldersList = document.getElementById('foldersList');
    if (!foldersList) return;
    
    let folders = userData.folders || [];
    let words = userData.words || [];
    
    // Arama ve filtreleme uygula
    const filteredData = applySearchAndFilters(folders, words);
    
    if (filteredData.folders.length === 0 && filteredData.words.length === 0 && !currentSearchTerm) {
        foldersList.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">📁</div>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">${t('noFoldersYet')}</h3>
                <p class="text-gray-500 mb-4">Kelimelerinizi organize etmek için klasörler oluşturun</p>
                <button onclick="showCreateFolderModal()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    ➕ ${t('createFolder')}
                </button>
            </div>
        `;
        return;
    }
    
    if (filteredData.folders.length === 0 && filteredData.words.length === 0 && currentSearchTerm) {
        foldersList.innerHTML = `
            <div class="text-center py-12">
                <div class="text-6xl mb-4">🔍</div>
                <h3 class="text-lg font-semibold text-gray-700 mb-2">${t('noSearchResults')}</h3>
                <p class="text-gray-500 mb-4">Farklı arama terimleri veya filtreler deneyin</p>
                <button onclick="clearSearch()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                    ${t('clearSearch')}
                </button>
            </div>
        `;
        return;
    }
    
    let html = '';
    
    // Klasörleri göster
    if (filteredData.folders.length > 0) {
        html += renderFolderHierarchy(filteredData.folders, 0);
    }
    
    // Eğer arama yapılıyorsa, bulunan kelimeleri de göster
    if (currentSearchTerm && filteredData.words.length > 0) {
        html += `
            <div class="bg-white rounded-lg shadow-md p-4 mt-4">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">🔍 Bulunan Kelimeler</h3>
                <div class="grid gap-3">
                    ${filteredData.words.map(word => {
                        const folder = findFolderById(userData.folders, word.folderId);
                        return `
                            <div class="p-3 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                                <div class="flex items-center justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center mb-2">
                                            <h4 class="font-bold text-md text-gray-800 mr-3">${highlightSearchTerm(word.word)}</h4>
                                            <span class="px-2 py-1 text-xs rounded-full ${
                                                word.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                word.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                'bg-red-100 text-red-800'
                                            }">${t(word.difficulty)}</span>
                                        </div>
                                        <p class="text-gray-700 text-sm mb-1">${highlightSearchTerm(word.definition)}</p>
                                        <p class="text-xs text-gray-500">📁 ${folder ? folder.name : 'Bilinmeyen Klasör'}</p>
                                    </div>
                                    <div class="flex gap-2 ml-4">
                                        <button onclick="editWord('${word.id}')" class="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600" title="${t('edit')}">
                                            ✏️
                                        </button>
                                        <button onclick="deleteWord('${word.id}')" class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600" title="${t('delete')}">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }
    
    foldersList.innerHTML = html;
    
    // Arama sonuçları bilgisini güncelle
    updateSearchResults(filteredData);
}

function renderFolderHierarchy(folders, level = 0) {
    return folders.map(folder => {
        const wordCount = countWordsInFolder(folder.id);
        const subFolders = folder.subFolders || [];
        const hasSubFolders = subFolders.length > 0;
        const isExpanded = folder.expanded !== false;
        
        return `
            <div class="folder-item" style="margin-left: ${level * 20}px;">
                <div class="bg-white p-4 border border-gray-200 rounded-lg mb-3 shadow-sm hover:shadow-md transition-shadow">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            ${hasSubFolders ? 
                                `<button onclick="toggleFolder('${folder.id}')" class="text-lg text-gray-600 hover:text-gray-800">
                                    ${isExpanded ? '▼' : '▶'}
                                </button>` : 
                                '<span class="w-6"></span>'
                            }
                            <span class="text-2xl">${hasSubFolders ? (isExpanded ? '📂' : '📁') : '📁'}</span>
                            <div>
                                <h3 class="font-semibold text-gray-800">${folder.name}</h3>
                                <p class="text-xs text-gray-500">${wordCount} ${t('words')} ${hasSubFolders ? `• ${subFolders.length} ${t('subFolders')}` : ''}</p>
                            </div>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="addSubFolder('${folder.id}')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600" title="${t('addSubFolder')}">
                                ➕
                            </button>
                            <button onclick="openFolder('${folder.id}')" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600" title="${t('open')}">
                                👁️
                            </button>
                            <button onclick="deleteFolder('${folder.id}')" class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600" title="${t('delete')}">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
                ${hasSubFolders && isExpanded ? renderFolderHierarchy(subFolders, level + 1) : ''}
            </div>
        `;
    }).join('');
}

function countWordsInFolder(folderId) {
    if (!userData.words) return 0;
    return userData.words.filter(word => word.folderId === folderId).length;
}

function showCreateFolderModal(parentId = null) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 class="text-xl font-bold mb-4 text-gray-800">${parentId ? t('addSubFolder') : t('createFolder')}</h3>
            <input type="text" id="folderNameInput" placeholder="${t('folderName')}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4">
            <div class="flex gap-3">
                <button onclick="createFolder('${parentId || ''}')" class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${t('create')}
                </button>
                <button onclick="closeModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                    ${t('cancel')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('folderNameInput').focus();
}

function createFolder(parentId = '') {
    const nameInput = document.getElementById('folderNameInput');
    const name = nameInput.value.trim();
    
    if (!name) {
        showNotification('❌ Klasör adı gerekli!', 'error');
        return;
    }
    
    const newFolder = {
        id: Date.now().toString(),
        name: name,
        parentId: parentId || null,
        subFolders: [],
        expanded: true,
        createdDate: new Date().toISOString()
    };
    
    if (!userData.folders) userData.folders = [];
    
    if (parentId) {
        addSubFolderToParent(userData.folders, parentId, newFolder);
    } else {
        userData.folders.push(newFolder);
    }
    
    // Aktivite kaydet
    addActivity('folder_created', `Klasör oluşturuldu: ${name}`);
    
    saveUserData();
    closeModal();
    renderFolders();
    showNotification('✅ Klasör oluşturuldu!', 'success');
}

function addSubFolderToParent(folders, parentId, newFolder) {
    for (let folder of folders) {
        if (folder.id === parentId) {
            if (!folder.subFolders) folder.subFolders = [];
            folder.subFolders.push(newFolder);
            return true;
        }
        if (folder.subFolders && addSubFolderToParent(folder.subFolders, parentId, newFolder)) {
            return true;
        }
    }
    return false;
}

function addSubFolder(parentId) {
    showCreateFolderModal(parentId);
}

function toggleFolder(folderId) {
    toggleFolderInHierarchy(userData.folders, folderId);
    saveUserData();
    renderFolders();
}

function toggleFolderInHierarchy(folders, folderId) {
    for (let folder of folders) {
        if (folder.id === folderId) {
            folder.expanded = !folder.expanded;
            return true;
        }
        if (folder.subFolders && toggleFolderInHierarchy(folder.subFolders, folderId)) {
            return true;
        }
    }
    return false;
}

function openFolder(folderId) {
    currentFolderId = folderId;
    renderFolderWords(folderId);
}

function renderFolderWords(folderId) {
    const folder = findFolderById(userData.folders, folderId);
    if (!folder) return;
    
    const folderWords = userData.words?.filter(word => word.folderId === folderId) || [];
    
    const foldersList = document.getElementById('foldersList');
    foldersList.innerHTML = `
        <div class="mb-6 flex items-center justify-between">
            <button onclick="renderFolders()" class="flex items-center px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                ← ${t('backToFolders')}
            </button>
            <button onclick="showAddWordModal('${folderId}')" class="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                ➕ ${t('addWord')}
            </button>
        </div>
        
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex items-center mb-6">
                <span class="text-3xl mr-3">📁</span>
                <div>
                    <h2 class="text-2xl font-bold text-gray-800">${folder.name}</h2>
                    <p class="text-gray-600">${folderWords.length} ${t('words')}</p>
                </div>
            </div>
            
            ${folderWords.length === 0 ? `
                <div class="text-center py-12">
                    <div class="text-6xl mb-4">📝</div>
                    <h3 class="text-lg font-semibold text-gray-700 mb-2">${t('noWordsInFolder')}</h3>
                    <p class="text-gray-500 mb-4">Bu klasöre kelimeler ekleyerek öğrenmeye başlayın</p>
                    <button onclick="showAddWordModal('${folderId}')" class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600">
                        ➕ ${t('addWord')}
                    </button>
                </div>
            ` : `
                <div class="grid gap-4">
                    ${folderWords.map(word => `
                        <div class="p-4 border border-gray-200 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                            <div class="flex items-center justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center mb-2">
                                        <h3 class="font-bold text-lg text-gray-800 mr-3">${word.word}</h3>
                                        <span class="px-2 py-1 text-xs rounded-full ${
                                            word.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                            word.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }">${t(word.difficulty)}</span>
                                    </div>
                                    <p class="text-gray-700 mb-2">${word.definition}</p>
                                    <div class="text-xs text-gray-500">
                                        ${t('reviewCount')}: ${word.reviewCount || 0} | 
                                        ${t('nextReview')}: ${new Date(word.nextReviewDate).toLocaleDateString()}
                                    </div>
                                </div>
                                <div class="flex gap-2 ml-4">
                                    <button onclick="editWord('${word.id}')" class="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" title="${t('edit')}">
                                        ✏️
                                    </button>
                                    <button onclick="deleteWord('${word.id}')" class="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600" title="${t('delete')}">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function findFolderById(folders, folderId) {
    for (let folder of folders) {
        if (folder.id === folderId) return folder;
        if (folder.subFolders) {
            const found = findFolderById(folder.subFolders, folderId);
            if (found) return found;
        }
    }
    return null;
}

function showAddWordModal(folderId) {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" id="wordModal">
            <h3 class="text-xl font-bold mb-4 text-gray-800">${t('addNewWord')}</h3>
            <div class="space-y-4">
                <input type="text" id="wordInput" placeholder="${t('word')}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <textarea id="definitionInput" placeholder="${t('definition')}" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                <select id="difficultyInput" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="easy">${t('easy')}</option>
                    <option value="medium" selected>${t('medium')}</option>
                    <option value="hard">${t('hard')}</option>
                </select>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="saveWord('${folderId}')" class="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold">
                    ${t('save')}
                </button>
                <button onclick="closeModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                    ${t('cancel')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('wordInput').focus();
}

function saveWord(folderId, wordId = null) {
    const word = document.getElementById('wordInput').value.trim();
    const definition = document.getElementById('definitionInput').value.trim();
    const difficulty = document.getElementById('difficultyInput').value;
    
    if (!word || !definition) {
        showNotification('❌ Kelime ve anlam gerekli!', 'error');
        return;
    }
    
    if (!userData.words) userData.words = [];
    
    if (wordId) {
        // Kelimeyi güncelle
        const wordIndex = userData.words.findIndex(w => w.id === wordId);
        if (wordIndex !== -1) {
            userData.words[wordIndex] = {
                ...userData.words[wordIndex],
                word,
                definition,
                difficulty,
                updatedDate: new Date().toISOString()
            };
            addActivity('word_updated', `Kelime güncellendi: ${word}`);
        }
    } else {
        // Yeni kelime ekle
        const newWord = {
            id: Date.now().toString(),
            word,
            definition,
            difficulty,
            folderId,
            reviewCount: 0,
            correctCount: 0,
            incorrectCount: 0,
            nextReviewDate: new Date().toISOString().split('T')[0],
            createdDate: new Date().toISOString(),
            lastReviewDate: null
        };
        userData.words.push(newWord);
        
        // İstatistikleri güncelle
        if (!userData.stats) userData.stats = {};
        userData.stats.totalWords = userData.words.length;
        
        addActivity('word_added', `Yeni kelime eklendi: ${word}`);
    }
    
    saveUserData();
    closeModal();
    renderFolderWords(folderId);
    showNotification('✅ Kelime kaydedildi!', 'success');
}

function editWord(wordId) {
    const word = userData.words?.find(w => w.id === wordId);
    if (!word) return;
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" id="wordModal">
            <h3 class="text-xl font-bold mb-4 text-gray-800">${t('editWord')}</h3>
            <div class="space-y-4">
                <input type="text" id="wordInput" value="${word.word}" placeholder="${t('word')}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <textarea id="definitionInput" placeholder="${t('definition')}" rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">${word.definition}</textarea>
                <select id="difficultyInput" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="easy" ${word.difficulty === 'easy' ? 'selected' : ''}>${t('easy')}</option>
                    <option value="medium" ${word.difficulty === 'medium' ? 'selected' : ''}>${t('medium')}</option>
                    <option value="hard" ${word.difficulty === 'hard' ? 'selected' : ''}>${t('hard')}</option>
                </select>
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="saveWord('${word.folderId}', '${wordId}')" class="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${t('save')}
                </button>
                <button onclick="closeModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                    ${t('cancel')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    document.getElementById('wordInput').focus();
}

function deleteWord(wordId) {
    if (!confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) return;
    
    if (!userData.words) return;
    
    const word = userData.words.find(w => w.id === wordId);
    userData.words = userData.words.filter(w => w.id !== wordId);
    
    // İstatistikleri güncelle
    if (userData.stats) {
        userData.stats.totalWords = userData.words.length;
    }
    
    if (word) {
        addActivity('word_deleted', `Kelime silindi: ${word.word}`);
    }
    
    saveUserData();
    renderFolderWords(currentFolderId);
    showNotification('✅ Kelime silindi!', 'success');
}

function deleteFolder(folderId) {
    if (!confirm('Bu klasörü ve içindeki tüm kelimeleri silmek istediğinizden emin misiniz?')) return;
    
    const folder = findFolderById(userData.folders, folderId);
    
    // Klasördeki kelimeleri sil
    if (userData.words) {
        userData.words = userData.words.filter(word => word.folderId !== folderId);
    }
    
    // Klasörü sil
    userData.folders = removeFolderFromHierarchy(userData.folders, folderId);
    
    // İstatistikleri güncelle
    if (userData.stats) {
        userData.stats.totalWords = userData.words?.length || 0;
    }
    
    if (folder) {
        addActivity('folder_deleted', `Klasör silindi: ${folder.name}`);
    }
    
    saveUserData();
    renderFolders();
    showNotification('✅ Klasör silindi!', 'success');
}

function removeFolderFromHierarchy(folders, folderId) {
    return folders.filter(folder => {
        if (folder.id === folderId) return false;
        if (folder.subFolders) {
            folder.subFolders = removeFolderFromHierarchy(folder.subFolders, folderId);
        }
        return true;
    });
}

function closeModal() {
    const modals = document.querySelectorAll('.fixed.inset-0');
    modals.forEach(modal => modal.remove());
}

// Ayarlar modalı
function showSettingsModal() {
    const reminderTime = localStorage.getItem('reminderTime') || '20:00';
    const notificationEnabled = Notification.permission === 'granted';
    
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 class="text-xl font-bold mb-4 text-gray-800 dark:text-white">⚙️ ${t('settingsTitle')}</h3>
            
            <div class="space-y-4">
                <!-- Bildirim Ayarları -->
                <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 class="font-semibold text-gray-700 dark:text-gray-300 mb-3">🔔 ${t('notificationSettings')}</h4>
                    
                    <div class="flex items-center justify-between mb-3">
                        <span class="text-gray-600 dark:text-gray-400 text-sm">${t('notifications')}</span>
                        <span class="text-sm ${notificationEnabled ? 'text-green-600' : 'text-red-600'}">
                            ${notificationEnabled ? `✅ ${t('notificationEnabled')}` : `❌ ${t('notificationDisabled')}`}
                        </span>
                    </div>
                    
                    ${!notificationEnabled ? `
                        <button onclick="requestNotificationPermission(); closeModal();" class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
                            ${t('notificationPermissionButton')}
                        </button>
                    ` : `
                        <div>
                            <label class="block text-sm text-gray-600 dark:text-gray-400 mb-2">${t('dailyReminderTime')}</label>
                            <input type="time" id="reminderTimeInput" value="${reminderTime}" 
                                   class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <button onclick="saveReminderTime()" class="w-full mt-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">
                                ${t('saveButton')}
                            </button>
                        </div>
                    `}
                </div>
                
                <!-- Tema Ayarları -->
                <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 class="font-semibold text-gray-700 dark:text-gray-300 mb-3">🎨 ${t('appearanceSettings')}</h4>
                    
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-gray-600 dark:text-gray-400 text-sm">${t('darkMode')}</span>
                        <button onclick="toggleTheme(); updateSettingsModal();" class="px-4 py-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} text-gray-800 dark:text-white rounded-lg hover:opacity-80 text-sm">
                            ${isDarkMode ? '🌙 ' + t('notificationEnabled') : '☀️ ' + t('notificationDisabled')}
                        </button>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <span class="text-gray-600 dark:text-gray-400 text-sm">${t('language')}</span>
                        <button onclick="toggleLanguage(); updateSettingsModal();" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:opacity-80 text-sm">
                            ${languageFlags[currentLanguage]} ${currentLanguage.toUpperCase()}
                        </button>
                    </div>
                </div>
                
                <!-- İstatistikler -->
                <div class="border-b border-gray-200 dark:border-gray-700 pb-4">
                    <h4 class="font-semibold text-gray-700 dark:text-gray-300 mb-3">📊 ${t('accountStats')}</h4>
                    
                    <div class="grid grid-cols-2 gap-3 text-sm">
                        <div class="bg-blue-50 dark:bg-blue-900 p-2 rounded">
                            <p class="text-blue-600 dark:text-blue-300 font-bold">${userData.words?.length || 0}</p>
                            <p class="text-blue-800 dark:text-blue-200 text-xs">${t('totalWords')}</p>
                        </div>
                        <div class="bg-green-50 dark:bg-green-900 p-2 rounded">
                            <p class="text-green-600 dark:text-green-300 font-bold">${userData.stats?.totalQuizzes || 0}</p>
                            <p class="text-green-800 dark:text-green-200 text-xs">${t('totalQuizzes')}</p>
                        </div>
                        <div class="bg-orange-50 dark:bg-orange-900 p-2 rounded">
                            <p class="text-orange-600 dark:text-orange-300 font-bold">${userData.stats?.streak || 0}</p>
                            <p class="text-orange-800 dark:text-orange-200 text-xs">${t('dailyStreak')}</p>
                        </div>
                        <div class="bg-purple-50 dark:bg-purple-900 p-2 rounded">
                            <p class="text-purple-600 dark:text-purple-300 font-bold">${userData.folders?.length || 0}</p>
                            <p class="text-purple-800 dark:text-purple-200 text-xs">${t('folders')}</p>
                        </div>
                    </div>
                </div>
                
                <!-- Hesap Bilgileri -->
                <div>
                    <h4 class="font-semibold text-gray-700 dark:text-gray-300 mb-3">👤 ${t('accountInfo')}</h4>
                    <div class="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        <p><strong>${t('name')}:</strong> ${currentUserData.name}</p>
                        <p><strong>${t('email')}:</strong> ${currentUserData.email}</p>
                        <p><strong>${t('registrationDate')}:</strong> ${new Date(currentUserData.createdDate).toLocaleDateString()}</p>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-3 mt-6">
                <button onclick="closeModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                    ${t('closeButton')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function updateSettingsModal() {
    closeModal();
    setTimeout(() => showSettingsModal(), 100);
}

function saveReminderTime() {
    const timeInput = document.getElementById('reminderTimeInput');
    if (timeInput) {
        setReminderTime(timeInput.value);
        closeModal();
    }
}

// Activity tracking
function addActivity(type, description, extraData = {}) {
    if (!userData.stats) userData.stats = {};
    if (!userData.stats.activities) userData.stats.activities = [];
    
    userData.stats.activities.unshift({
        id: Date.now().toString(),
        type: type,
        description: description,
        timestamp: new Date().toISOString(),
        ...extraData // wordId, isCorrect gibi ekstra veriler
    });
    
    // Son 100 aktiviteyi tut (daha fazla veri için)
    if (userData.stats.activities.length > 100) {
        userData.stats.activities = userData.stats.activities.slice(0, 100);
    }
}

// Arama ve Filtreleme Fonksiyonları
function toggleSearchFilters() {
    const filters = document.getElementById('searchFilters');
    const toggleBtn = document.getElementById('toggleFiltersBtn');
    
    if (filters.classList.contains('hidden')) {
        filters.classList.remove('hidden');
        toggleBtn.textContent = t('toggleFilters') + ' ▲';
    } else {
        filters.classList.add('hidden');
        toggleBtn.textContent = t('toggleFilters') + ' ▼';
    }
}

function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const dateFilter = document.getElementById('dateFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    currentSearchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    currentFilters = {
        difficulty: difficultyFilter ? difficultyFilter.value : '',
        date: dateFilter ? dateFilter.value : '',
        sort: sortFilter ? sortFilter.value : 'name'
    };
    
    renderFolders();
}

function applySearchAndFilters(folders, words) {
    let filteredFolders = [...folders];
    let filteredWords = [...words];
    
    // Metin araması
    if (currentSearchTerm) {
        filteredFolders = filteredFolders.filter(folder => 
            folder.name.toLowerCase().includes(currentSearchTerm)
        );
        
        filteredWords = filteredWords.filter(word => 
            word.word.toLowerCase().includes(currentSearchTerm) ||
            word.definition.toLowerCase().includes(currentSearchTerm)
        );
    }
    
    // Zorluk seviyesi filtresi
    if (currentFilters.difficulty) {
        filteredWords = filteredWords.filter(word => 
            word.difficulty === currentFilters.difficulty
        );
    }
    
    // Tarih filtresi
    if (currentFilters.date) {
        const now = new Date();
        let startDate;
        
        switch (currentFilters.date) {
            case 'today':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case '3months':
                startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
                break;
            default:
                startDate = null;
        }
        
        if (startDate) {
            filteredFolders = filteredFolders.filter(folder => {
                const folderDate = new Date(folder.createdDate);
                return folderDate >= startDate;
            });
            
            filteredWords = filteredWords.filter(word => {
                const wordDate = new Date(word.createdDate);
                return wordDate >= startDate;
            });
        }
    }
    
    // Sıralama
    switch (currentFilters.sort) {
        case 'name':
            filteredFolders.sort((a, b) => a.name.localeCompare(b.name));
            filteredWords.sort((a, b) => a.word.localeCompare(b.word));
            break;
        case 'date':
            filteredFolders.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
            filteredWords.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
            break;
        case 'difficulty':
            const difficultyOrder = { 'easy': 1, 'medium': 2, 'hard': 3 };
            filteredWords.sort((a, b) => difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty]);
            break;
        case 'wordCount':
            filteredFolders.sort((a, b) => countWordsInFolder(b.id) - countWordsInFolder(a.id));
            break;
    }
    
    return {
        folders: filteredFolders,
        words: filteredWords
    };
}

function highlightSearchTerm(text) {
    if (!currentSearchTerm || !text) return text;
    
    const regex = new RegExp(`(${currentSearchTerm})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 px-1 rounded">$1</mark>');
}

function updateSearchResults(filteredData) {
    const searchResults = document.getElementById('searchResults');
    if (!searchResults) return;
    
    const totalResults = filteredData.folders.length + filteredData.words.length;
    
    if (currentSearchTerm || currentFilters.difficulty || currentFilters.date) {
        searchResults.textContent = `${totalResults} ${t('searchResultsFound')}`;
    } else {
        searchResults.textContent = '';
    }
}

function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const difficultyFilter = document.getElementById('difficultyFilter');
    const dateFilter = document.getElementById('dateFilter');
    const sortFilter = document.getElementById('sortFilter');
    
    if (searchInput) searchInput.value = '';
    if (difficultyFilter) difficultyFilter.value = '';
    if (dateFilter) dateFilter.value = '';
    if (sortFilter) sortFilter.value = 'name';
    
    currentSearchTerm = '';
    currentFilters = {
        difficulty: '',
        date: '',
        sort: 'name'
    };
    
    renderFolders();
}

// Quiz Functions
function renderQuizMenu() {
    // Quiz istatistiklerini güncelle
    updateQuizStats();
    
    // Quiz oyun alanını gizle, menüyü göster
    const quizGame = document.getElementById('quizGame');
    const quizMenu = document.getElementById('quizMenu');
    
    if (quizGame) quizGame.classList.add('hidden');
    if (quizMenu) quizMenu.classList.remove('hidden');
}

function updateQuizStats() {
    // Stats objesini initialize et
    if (!userData.stats) {
        userData.stats = {
            totalQuizzes: 0,
            averageScore: 0,
            bestStreak: 0,
            todayQuizzes: 0
        };
    }
    
    const stats = userData.stats;
    
    // Elementlerin varlığını kontrol et ve güncelle
    const totalQuizzesElement = document.getElementById('totalQuizzesCount');
    const averageScoreElement = document.getElementById('averageScoreCount');
    const bestStreakElement = document.getElementById('bestStreakCount');
    const todayQuizzesElement = document.getElementById('todayQuizzesCount');
    
    if (totalQuizzesElement) totalQuizzesElement.textContent = stats.totalQuizzes || 0;
    if (averageScoreElement) averageScoreElement.textContent = (stats.averageScore || 0) + '%';
    if (bestStreakElement) bestStreakElement.textContent = stats.bestStreak || 0;
    if (todayQuizzesElement) todayQuizzesElement.textContent = stats.todayQuizzes || 0;
    
    // Filtrelenmiş kelime sayısını güncelle
    updateQuizStatsWithFilter();
}

function updateQuizStatsWithFilter() {
    const difficultyFilter = document.getElementById('quizDifficultyFilter');
    const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';
    
    let availableWords = userData.words?.filter(w => !w.mastered) || [];
    
    // Zorluk seviyesi filtresini uygula
    if (selectedDifficulty) {
        availableWords = availableWords.filter(word => word.difficulty === selectedDifficulty);
    }
    
    const filteredWordCount = document.getElementById('filteredWordCount');
    if (filteredWordCount) {
        if (selectedDifficulty) {
            const difficultyText = selectedDifficulty === 'easy' ? t('easy') : 
                                 selectedDifficulty === 'medium' ? t('medium') : t('hard');
            filteredWordCount.textContent = `${availableWords.length} ${difficultyText.toLowerCase()} ${t('filteredWordsAvailable')}`;
        } else {
            filteredWordCount.textContent = `${availableWords.length} ${t('filteredWordsAvailable')}`;
        }
    }
}

function startQuickQuiz() {
    const difficultyFilter = document.getElementById('quizDifficultyFilter');
    const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';
    
    let allWords = userData.words?.filter(w => !w.mastered) || [];
    
    // Zorluk seviyesi filtresini uygula
    if (selectedDifficulty) {
        allWords = allWords.filter(word => word.difficulty === selectedDifficulty);
    }
    
    if (allWords.length === 0) {
        const difficultyText = selectedDifficulty ? ` (${t(selectedDifficulty)})` : '';
        showNotification(`❌ Quiz için kelime bulunamadı${difficultyText}!`, 'error');
        return;
    }
    
    // 5 rastgele kelime seç
    const shuffled = allWords.sort(() => 0.5 - Math.random());
    currentQuiz = shuffled.slice(0, Math.min(5, shuffled.length));
    currentQuizIndex = 0;
    quizScore = 0;
    
    showQuizQuestion();
}

function goToQuiz() {
    showTab('quiz');
}

function startDifficultyQuiz() {
    const hardWords = userData.words?.filter(w => w.difficulty === 'hard' && !w.mastered) || [];
    if (hardWords.length === 0) {
        showNotification('❌ Zor kelime bulunamadı!', 'error');
        return;
    }
    
    currentQuiz = hardWords.sort(() => 0.5 - Math.random());
    currentQuizIndex = 0;
    quizScore = 0;
    
    showQuizQuestion();
}

function startReviewQuiz() {
    // userData kontrolü
    if (!userData || !userData.words || userData.words.length === 0) {
        showNotification('❌ Henüz kelime eklenmemiş!', 'error');
        return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    const reviewWords = userData.words.filter(word => {
        return word.nextReviewDate <= today && !word.mastered;
    });
    
    if (reviewWords.length === 0) {
        showNotification('🎉 Bugün tekrar edilecek kelime yok!', 'success');
        return;
    }
    
    currentQuiz = reviewWords.sort(() => 0.5 - Math.random());
    currentQuizIndex = 0;
    quizScore = 0;
    
    // Quiz sekmesine geç
    showTab('quiz');
    showQuizQuestion();
}

function startMasteryQuiz() {
    const masteredWords = userData.words?.filter(w => w.mastered) || [];
    if (masteredWords.length === 0) {
        showNotification('❌ Öğrenilmiş kelime bulunamadı!', 'error');
        return;
    }
    
    currentQuiz = masteredWords.sort(() => 0.5 - Math.random()).slice(0, 10);
    currentQuizIndex = 0;
    quizScore = 0;
    
    showQuizQuestion();
}

function startFolderQuiz() {
    // Klasör seçim modalı göster
    showFolderSelectionModal();
}

function startMultipleChoiceQuiz() {
    const difficultyFilter = document.getElementById('quizDifficultyFilter');
    const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';
    
    let allWords = userData.words?.filter(w => !w.mastered) || [];
    
    // Zorluk seviyesi filtresini uygula
    if (selectedDifficulty) {
        allWords = allWords.filter(word => word.difficulty === selectedDifficulty);
    }
    
    if (allWords.length < 4) {
        const difficultyText = selectedDifficulty ? ` (${t(selectedDifficulty)})` : '';
        showNotification(`❌ Çoktan seçmeli quiz için en az 4 kelime gerekli${difficultyText}!`, 'error');
        return;
    }
    
    // 10 rastgele kelime seç
    const shuffled = allWords.sort(() => 0.5 - Math.random());
    currentQuiz = shuffled.slice(0, Math.min(10, shuffled.length));
    currentQuizIndex = 0;
    quizScore = 0;
    
    showMultipleChoiceQuestion();
}

function startSpellingQuiz() {
    const difficultyFilter = document.getElementById('quizDifficultyFilter');
    const selectedDifficulty = difficultyFilter ? difficultyFilter.value : '';
    
    let allWords = userData.words?.filter(w => !w.mastered) || [];
    
    // Zorluk seviyesi filtresini uygula
    if (selectedDifficulty) {
        allWords = allWords.filter(word => word.difficulty === selectedDifficulty);
    }
    
    if (allWords.length === 0) {
        const difficultyText = selectedDifficulty ? ` (${t(selectedDifficulty)})` : '';
        showNotification(`❌ Yazım quiz için kelime bulunamadı${difficultyText}!`, 'error');
        return;
    }
    
    // 10 rastgele kelime seç
    const shuffled = allWords.sort(() => 0.5 - Math.random());
    currentQuiz = shuffled.slice(0, Math.min(10, shuffled.length));
    currentQuizIndex = 0;
    quizScore = 0;
    
    showSpellingQuestion();
}

function showMultipleChoiceQuestion() {
    if (currentQuizIndex >= currentQuiz.length) {
        showQuizResults();
        return;
    }
    
    const word = currentQuiz[currentQuizIndex];
    const quizGame = document.getElementById('quizGame');
    const quizMenu = document.getElementById('quizMenu');
    
    quizMenu.classList.add('hidden');
    quizGame.classList.remove('hidden');
    
    // Yanlış seçenekler oluştur
    const allWords = userData.words?.filter(w => w.id !== word.id) || [];
    const wrongOptions = allWords.sort(() => 0.5 - Math.random()).slice(0, 3);
    const options = [word, ...wrongOptions].sort(() => 0.5 - Math.random());
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <div class="text-sm text-gray-600">
                    ${t('question')} ${currentQuizIndex + 1} / ${currentQuiz.length}
                </div>
                <div class="text-sm text-gray-600">
                    Skor: ${quizScore} / ${currentQuizIndex}
                </div>
            </div>
            
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-4">${word.word}</h2>
                <p class="text-lg text-gray-600 mb-6">${t('selectCorrectAnswer')}</p>
                
                <div class="space-y-3">
                    ${options.map((option, index) => `
                        <button onclick="checkMultipleChoiceAnswer('${option.id}', '${word.id}')" 
                                class="w-full p-4 text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-colors">
                            <span class="font-semibold text-blue-600">${String.fromCharCode(65 + index)})</span>
                            <span class="ml-3 text-gray-800">${option.definition}</span>
                        </button>
                    `).join('')}
                </div>
            </div>
            
            <div class="flex justify-center">
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
}

function checkMultipleChoiceAnswer(selectedId, correctId) {
    const isCorrect = selectedId === correctId;
    const word = currentQuiz[currentQuizIndex];
    
    if (isCorrect) {
        quizScore++;
        word.correctCount = (word.correctCount || 0) + 1;
        showNotification('✅ Doğru!', 'success');
    } else {
        word.incorrectCount = (word.incorrectCount || 0) + 1;
        showNotification('❌ Yanlış!', 'error');
    }
    
    // Kelime istatistiklerini güncelle
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewDate = new Date().toISOString();
    
    // Aktivite kaydet (wordId ve isCorrect bilgisi ile)
    addActivity('quiz_completed', `${word.word}: ${isCorrect ? 'Doğru' : 'Yanlış'}`, {
        wordId: word.id,
        isCorrect: isCorrect,
        folderId: word.folderId
    });
    
    updateNextReviewDate(word, isCorrect);
    
    // Sonucu göster
    showMultipleChoiceResult(isCorrect, word);
}

function showMultipleChoiceResult(isCorrect, word) {
    const quizGame = document.getElementById('quizGame');
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="text-center mb-8">
                <div class="text-6xl mb-4">${isCorrect ? '✅' : '❌'}</div>
                <h2 class="text-2xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}">
                    ${isCorrect ? t('correct') : t('incorrect')}
                </h2>
                
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 class="font-bold text-lg text-gray-800 mb-2">${word.word}</h3>
                    <p class="text-gray-700"><strong>${t('correctAnswer')}:</strong> ${word.definition}</p>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-600 mb-4">${t('howDifficult')}</p>
                    <div class="flex justify-center gap-4">
                        <button onclick="setDifficultyAndNext('easy')" class="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200">
                            ${t('easyEmoji')}
                        </button>
                        <button onclick="setDifficultyAndNext('medium')" class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200">
                            ${t('mediumEmoji')}
                        </button>
                        <button onclick="setDifficultyAndNext('hard')" class="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200">
                            ${t('hardEmoji')}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button onclick="nextMultipleChoiceQuestion()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${currentQuizIndex + 1 < currentQuiz.length ? 'Sonraki Soru' : 'Sonuçları Gör'}
                </button>
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
}

function setDifficultyAndNext(difficulty) {
    const word = currentQuiz[currentQuizIndex];
    word.difficulty = difficulty;
    updateNextReviewDate(word, true);
    nextMultipleChoiceQuestion();
}

function nextMultipleChoiceQuestion() {
    currentQuizIndex++;
    showMultipleChoiceQuestion();
}

function showSpellingQuestion() {
    if (currentQuizIndex >= currentQuiz.length) {
        showQuizResults();
        return;
    }
    
    const word = currentQuiz[currentQuizIndex];
    const quizGame = document.getElementById('quizGame');
    const quizMenu = document.getElementById('quizMenu');
    
    quizMenu.classList.add('hidden');
    quizGame.classList.remove('hidden');
    
    // Kelimenin harflerini karıştır (ipucu için)
    const scrambledWord = word.word.split('').sort(() => 0.5 - Math.random()).join('');
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <div class="text-sm text-gray-600">
                    ${t('question')} ${currentQuizIndex + 1} / ${currentQuiz.length}
                </div>
                <div class="text-sm text-gray-600">
                    Skor: ${quizScore} / ${currentQuizIndex}
                </div>
            </div>
            
            <div class="text-center mb-8">
                <div class="bg-blue-50 p-4 rounded-lg mb-6">
                    <p class="text-lg text-gray-700 mb-2"><strong>Anlam:</strong></p>
                    <p class="text-xl font-semibold text-blue-800">${word.definition}</p>
                </div>
                
                <p class="text-lg text-gray-600 mb-6">${t('typeTheWord')}</p>
                
                <input type="text" id="spellingAnswer" placeholder="Kelimeyi buraya yazın..." 
                       class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4 text-center text-xl font-mono">
                
                <div class="mb-4">
                    <button onclick="toggleSpellingHint()" id="hintButton" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                        ${t('showHint')}
                    </button>
                </div>
                
                <div id="spellingHint" class="hidden bg-yellow-50 p-3 rounded-lg mb-4">
                    <p class="text-sm text-yellow-800">💡 Harfler: <span class="font-mono font-bold">${scrambledWord}</span></p>
                    <p class="text-xs text-yellow-600 mt-1">Kelime ${word.word.length} harfli</p>
                </div>
                
                <button onclick="checkSpellingAnswer()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${t('checkAnswer')}
                </button>
            </div>
            
            <div class="flex justify-center">
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('spellingAnswer').focus();
    
    // Enter tuşu ile cevap kontrolü
    document.getElementById('spellingAnswer').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkSpellingAnswer();
        }
    });
}

function toggleSpellingHint() {
    const hint = document.getElementById('spellingHint');
    const button = document.getElementById('hintButton');
    
    if (hint.classList.contains('hidden')) {
        hint.classList.remove('hidden');
        button.textContent = t('hideHint');
        button.className = 'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600';
    } else {
        hint.classList.add('hidden');
        button.textContent = t('showHint');
        button.className = 'px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600';
    }
}

function checkSpellingAnswer() {
    const userAnswer = document.getElementById('spellingAnswer').value.trim();
    const correctAnswer = currentQuiz[currentQuizIndex].word;
    const word = currentQuiz[currentQuizIndex];
    
    // Boş cevap kontrolü
    if (!userAnswer) {
        showNotification('❌ Lütfen kelimeyi yazın!', 'error');
        return;
    }
    
    // Cevap benzerliğini kontrol et
    const result = checkAnswerSimilarity(userAnswer, correctAnswer);
    
    if (result.isCorrect) {
        quizScore++;
        word.correctCount = (word.correctCount || 0) + 1;
        
        if (result.hasTypo) {
            showNotification('✅ Doğru! (Küçük yazım hatası var)', 'success');
        } else {
            showNotification('✅ Doğru yazım!', 'success');
        }
    } else {
        word.incorrectCount = (word.incorrectCount || 0) + 1;
        
        if (result.isClose) {
            showNotification('❌ Yanlış! (Ama yaklaştın)', 'error');
        } else {
            showNotification('❌ Yanlış yazım!', 'error');
        }
    }
    
    // Kelime istatistiklerini güncelle
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewDate = new Date().toISOString();
    
    // Aktivite kaydet (wordId ve isCorrect bilgisi ile)
    addActivity('quiz_completed', `${word.word}: ${result.isCorrect ? 'Doğru' : 'Yanlış'}`, {
        wordId: word.id,
        isCorrect: result.isCorrect,
        folderId: word.folderId
    });
    
    updateNextReviewDate(word, result.isCorrect);
    
    // Sonucu göster
    showSpellingResult(result.isCorrect, word, userAnswer, result.hasTypo);
}

function showSpellingResult(isCorrect, word, userAnswer, hasTypo = false) {
    const quizGame = document.getElementById('quizGame');
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="text-center mb-8">
                <div class="text-6xl mb-4">${isCorrect ? '✅' : '❌'}</div>
                <h2 class="text-2xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}">
                    ${isCorrect ? 'Doğru Yazım!' : 'Yanlış Yazım!'}
                </h2>
                
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <p class="text-gray-700 mb-2"><strong>Anlam:</strong> ${word.definition}</p>
                    <p class="text-lg font-bold text-green-600 mb-2"><strong>Doğru Yazım:</strong> ${word.word}</p>
                    <p class="text-gray-600"><strong>Sizin Yazımınız:</strong> ${userAnswer}</p>
                    ${hasTypo ? `<p class="text-orange-600 text-sm mt-2">⚠️ Küçük yazım hatası tespit edildi ama cevabın doğru sayıldı!</p>` : ''}
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-600 mb-4">${t('howDifficult')}</p>
                    <div class="flex justify-center gap-4">
                        <button onclick="setDifficultyAndNextSpelling('easy')" class="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200">
                            ${t('easyEmoji')}
                        </button>
                        <button onclick="setDifficultyAndNextSpelling('medium')" class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200">
                            ${t('mediumEmoji')}
                        </button>
                        <button onclick="setDifficultyAndNextSpelling('hard')" class="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200">
                            ${t('hardEmoji')}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button onclick="nextSpellingQuestion()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${currentQuizIndex + 1 < currentQuiz.length ? 'Sonraki Soru' : 'Sonuçları Gör'}
                </button>
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
}

function setDifficultyAndNextSpelling(difficulty) {
    const word = currentQuiz[currentQuizIndex];
    word.difficulty = difficulty;
    updateNextReviewDate(word, true);
    nextSpellingQuestion();
}

function nextSpellingQuestion() {
    currentQuizIndex++;
    showSpellingQuestion();
}

function showAudioVisualQuestion() {
    if (currentQuizIndex >= currentQuiz.length) {
        showQuizResults();
        return;
    }
    
    const word = currentQuiz[currentQuizIndex];
    const quizGame = document.getElementById('quizGame');
    const quizMenu = document.getElementById('quizMenu');
    
    quizMenu.classList.add('hidden');
    quizGame.classList.remove('hidden');
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <div class="text-sm text-gray-600">
                    ${t('question')} ${currentQuizIndex + 1} / ${currentQuiz.length}
                </div>
                <div class="text-sm text-gray-600">
                    Skor: ${quizScore} / ${currentQuizIndex}
                </div>
            </div>
            
            <div class="text-center mb-8">
                <div class="bg-gradient-to-r from-teal-50 to-blue-50 p-6 rounded-lg mb-6">
                    <div class="text-4xl mb-4">🎵</div>
                    <h2 class="text-2xl font-bold text-gray-800 mb-4">${word.word}</h2>
                    <button onclick="playWordAudio('${word.word}')" class="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-semibold mb-4">
                        ${t('playAudio')}
                    </button>
                </div>
                
                <p class="text-lg text-gray-600 mb-6">${t('listenAndWrite')}</p>
                
                <textarea id="audioVisualAnswer" placeholder="Dinlediğiniz kelimeyi ve anlamını yazın..." 
                          rows="3" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4"></textarea>
                
                <div class="mb-4">
                    <button onclick="toggleAudioHint()" id="audioHintButton" class="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600">
                        ${t('showHint')}
                    </button>
                </div>
                
                <div id="audioHint" class="hidden bg-yellow-50 p-3 rounded-lg mb-4">
                    <p class="text-sm text-yellow-800">💡 İlk harf: <span class="font-bold">${word.word.charAt(0).toUpperCase()}</span></p>
                    <p class="text-xs text-yellow-600 mt-1">Kelime ${word.word.length} harfli</p>
                </div>
                
                <button onclick="checkAudioVisualAnswer()" class="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-semibold">
                    ${t('checkAnswer')}
                </button>
            </div>
            
            <div class="flex justify-center">
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('audioVisualAnswer').focus();
    
    // Enter tuşu ile cevap kontrolü
    document.getElementById('audioVisualAnswer').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            checkAudioVisualAnswer();
        }
    });
}

function playWordAudio(word) {
    // Web Speech API kullanarak kelimeyi seslendir
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = currentLanguage === 'tr' ? 'tr-TR' : 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        speechSynthesis.speak(utterance);
        
        showNotification('🔊 Kelime seslendirildi', 'info');
    } else {
        showNotification('❌ Tarayıcınız ses özelliğini desteklemiyor', 'error');
    }
}

function toggleAudioHint() {
    const hint = document.getElementById('audioHint');
    const button = document.getElementById('audioHintButton');
    
    if (hint.classList.contains('hidden')) {
        hint.classList.remove('hidden');
        button.textContent = t('hideHint');
        button.className = 'px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600';
    } else {
        hint.classList.add('hidden');
        button.textContent = t('showHint');
        button.className = 'px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600';
    }
}

function checkAudioVisualAnswer() {
    const userAnswer = document.getElementById('audioVisualAnswer').value.trim();
    const word = currentQuiz[currentQuizIndex];
    
    // Boş cevap kontrolü
    if (!userAnswer) {
        showNotification('❌ Lütfen bir cevap yazın!', 'error');
        return;
    }
    
    // Hem kelime hem de anlam için kontrol yap
    const wordResult = checkAnswerSimilarity(userAnswer, word.word);
    const definitionResult = checkAnswerSimilarity(userAnswer, word.definition);
    
    // Kelime veya anlam doğruysa kabul et
    const isCorrect = wordResult.isCorrect || definitionResult.isCorrect;
    const hasTypo = wordResult.hasTypo || definitionResult.hasTypo;
    
    if (isCorrect) {
        quizScore++;
        word.correctCount = (word.correctCount || 0) + 1;
        
        if (hasTypo) {
            showNotification('✅ Doğru! (Küçük yazım hatası var)', 'success');
        } else {
            showNotification('✅ Doğru!', 'success');
        }
    } else {
        word.incorrectCount = (word.incorrectCount || 0) + 1;
        
        const isClose = wordResult.isClose || definitionResult.isClose;
        if (isClose) {
            showNotification('❌ Yanlış! (Ama yaklaştın)', 'error');
        } else {
            showNotification('❌ Yanlış!', 'error');
        }
    }
    
    // Kelime istatistiklerini güncelle
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewDate = new Date().toISOString();
    
    // Aktivite kaydet (wordId ve isCorrect bilgisi ile)
    addActivity('quiz_completed', `${word.word}: ${isCorrect ? 'Doğru' : 'Yanlış'}`, {
        wordId: word.id,
        isCorrect: isCorrect,
        folderId: word.folderId
    });
    
    updateNextReviewDate(word, isCorrect);
    
    // Sonucu göster
    showAudioVisualResult(isCorrect, word, userAnswer, hasTypo);
}

function showAudioVisualResult(isCorrect, word, userAnswer, hasTypo = false) {
    const quizGame = document.getElementById('quizGame');
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="text-center mb-8">
                <div class="text-6xl mb-4">${isCorrect ? '✅' : '❌'}</div>
                <h2 class="text-2xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}">
                    ${isCorrect ? t('correct') : t('incorrect')}
                </h2>
                
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 class="font-bold text-lg text-gray-800 mb-2">${word.word}</h3>
                    <p class="text-gray-700 mb-2"><strong>${t('correctAnswer')}:</strong> ${word.definition}</p>
                    <p class="text-gray-600"><strong>${t('yourAnswer')}:</strong> ${userAnswer}</p>
                    ${hasTypo ? `<p class="text-orange-600 text-sm mt-2">⚠️ Küçük yazım hatası tespit edildi ama cevabın doğru sayıldı!</p>` : ''}
                    <button onclick="playWordAudio('${word.word}')" class="mt-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">
                        🔊 Tekrar Dinle
                    </button>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-600 mb-4">${t('howDifficult')}</p>
                    <div class="flex justify-center gap-4">
                        <button onclick="setDifficultyAndNextAudio('easy')" class="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200">
                            ${t('easyEmoji')}
                        </button>
                        <button onclick="setDifficultyAndNextAudio('medium')" class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200">
                            ${t('mediumEmoji')}
                        </button>
                        <button onclick="setDifficultyAndNextAudio('hard')" class="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200">
                            ${t('hardEmoji')}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button onclick="nextAudioVisualQuestion()" class="px-6 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 font-semibold">
                    ${currentQuizIndex + 1 < currentQuiz.length ? 'Sonraki Soru' : 'Sonuçları Gör'}
                </button>
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
}

function setDifficultyAndNextAudio(difficulty) {
    const word = currentQuiz[currentQuizIndex];
    word.difficulty = difficulty;
    updateNextReviewDate(word, true);
    nextAudioVisualQuestion();
}

function nextAudioVisualQuestion() {
    currentQuizIndex++;
    showAudioVisualQuestion();
}

function showFolderSelectionModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 class="text-xl font-bold mb-4 text-gray-800">Klasör Seçin</h3>
            <div class="space-y-2 max-h-60 overflow-y-auto">
                ${renderFolderOptions(userData.folders || [])}
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="closeModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                    ${t('cancel')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
            <h3 class="text-xl font-bold mb-4 text-gray-800">Klasör Seçin</h3>
            <div class="space-y-2 max-h-60 overflow-y-auto">
                ${renderFolderOptions(userData.folders || [])}
            </div>
            <div class="flex gap-3 mt-6">
                <button onclick="closeModal()" class="flex-1 px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold">
                    ${t('cancel')}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);


function renderFolderOptions(folders, level = 0) {
    return folders.map(folder => {
        const wordCount = countWordsInFolder(folder.id);
        const indent = '&nbsp;'.repeat(level * 4);
        
        let html = `
            <button onclick="startQuizFromFolder('${folder.id}')" class="w-full text-left p-3 hover:bg-gray-100 rounded-lg border border-gray-200">
                ${indent}📁 ${folder.name} (${wordCount} kelime)
            </button>
        `;
        
        if (folder.subFolders && folder.subFolders.length > 0) {
            html += renderFolderOptions(folder.subFolders, level + 1);
        }
        
        return html;
    }).join('');
}

function startQuizFromFolder(folderId) {
    const folderWords = userData.words?.filter(w => w.folderId === folderId && !w.mastered) || [];
    
    if (folderWords.length === 0) {
        showNotification('❌ Bu klasörde quiz için kelime bulunamadı!', 'error');
        return;
    }
    
    currentQuiz = folderWords.sort(() => 0.5 - Math.random());
    currentQuizIndex = 0;
    quizScore = 0;
    currentQuizFolder = folderId;
    
    closeModal();
    showQuizQuestion();
}

function showQuizQuestion() {
    if (currentQuizIndex >= currentQuiz.length) {
        showQuizResults();
        return;
    }
    
    const word = currentQuiz[currentQuizIndex];
    const quizGame = document.getElementById('quizGame');
    const quizMenu = document.getElementById('quizMenu');
    
    quizMenu.classList.add('hidden');
    quizGame.classList.remove('hidden');
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="flex justify-between items-center mb-6">
                <div class="text-sm text-gray-600">
                    ${t('question')} ${currentQuizIndex + 1} / ${currentQuiz.length}
                </div>
                <div class="text-sm text-gray-600">
                    Skor: ${quizScore} / ${currentQuizIndex}
                </div>
            </div>
            
            <div class="text-center mb-8">
                <h2 class="text-3xl font-bold text-gray-800 mb-4">${word.word}</h2>
                <p class="text-lg text-gray-600 mb-6">${t('whatMeaning')}</p>
                
                <textarea 
                    id="quizAnswer" 
                    placeholder="${t('writeAnswer')}" 
                    rows="3" 
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                ></textarea>
                
                <button onclick="checkAnswer()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${t('checkAnswer')}
                </button>
            </div>
            
            <div class="flex justify-center">
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('quizAnswer').focus();
    
    // Enter tuşu ile cevap kontrolü
    document.getElementById('quizAnswer').addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            checkAnswer();
        }
    });
}

// Levenshtein mesafesi hesaplama (yazım hatası toleransı için)
function levenshteinDistance(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    for (let i = 0; i <= len1; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= len2; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (str1.charAt(i - 1) === str2.charAt(j - 1)) {
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

    return matrix[len1][len2];
}

// Cevap benzerliğini kontrol et
function checkAnswerSimilarity(userAnswer, correctAnswer) {
    // Boşlukları ve noktalama işaretlerini temizle
    const cleanUser = userAnswer.toLowerCase().trim().replace(/[.;!?]/g, '');
    const cleanCorrect = correctAnswer.toLowerCase().trim().replace(/[.;!?]/g, '');
    
    // Tam eşleşme
    if (cleanUser === cleanCorrect) {
        return { isCorrect: true, hasTypo: false, similarity: 100 };
    }
    
    // Virgül, noktalı virgül veya "ve"/"and" ile ayrılmış cevapları kontrol et
    const separators = /[,;]|\s+ve\s+|\s+and\s+/gi;
    
    if (separators.test(cleanCorrect) || separators.test(cleanUser)) {
        // Ayraçları virgüle çevir ve parçala
        const correctParts = cleanCorrect.replace(separators, ',').split(',').map(s => s.trim()).filter(s => s).sort();
        const userParts = cleanUser.replace(separators, ',').split(',').map(s => s.trim()).filter(s => s).sort();
        
        if (correctParts.length === userParts.length) {
            let allMatch = true;
            let hasMinorTypo = false;
            
            for (let i = 0; i < correctParts.length; i++) {
                const distance = levenshteinDistance(userParts[i], correctParts[i]);
                const maxLen = Math.max(userParts[i].length, correctParts[i].length);
                const similarity = ((maxLen - distance) / maxLen) * 100;
                
                if (similarity < 70) {
                    allMatch = false;
                    break;
                }
                if (similarity < 100 && similarity >= 70) {
                    hasMinorTypo = true;
                }
            }
            
            if (allMatch) {
                return { isCorrect: true, hasTypo: hasMinorTypo, similarity: hasMinorTypo ? 85 : 100 };
            }
        }
    }
    
    // Levenshtein mesafesi ile benzerlik kontrolü
    const distance = levenshteinDistance(cleanUser, cleanCorrect);
    const maxLen = Math.max(cleanUser.length, cleanCorrect.length);
    const similarity = ((maxLen - distance) / maxLen) * 100;
    
    // %70 ve üzeri benzerlik = küçük yazım hatası, doğru kabul et
    if (similarity >= 70) {
        return { isCorrect: true, hasTypo: true, similarity: similarity };
    }
    
    // %50-70 arası = yakın ama yanlış
    if (similarity >= 50) {
        return { isCorrect: false, hasTypo: false, similarity: similarity, isClose: true };
    }
    
    // Tamamen yanlış
    return { isCorrect: false, hasTypo: false, similarity: similarity };
}

function checkAnswer() {
    const userAnswer = document.getElementById('quizAnswer').value.trim();
    const correctAnswer = currentQuiz[currentQuizIndex].definition;
    const word = currentQuiz[currentQuizIndex];
    
    // Boş cevap kontrolü
    if (!userAnswer) {
        showNotification('❌ Lütfen bir cevap yazın!', 'error');
        return;
    }
    
    // Cevap benzerliğini kontrol et
    const result = checkAnswerSimilarity(userAnswer, correctAnswer);
    
    if (result.isCorrect) {
        quizScore++;
        word.correctCount = (word.correctCount || 0) + 1;
        
        if (result.hasTypo) {
            showNotification('✅ Doğru! (Küçük yazım hatası var)', 'success');
        } else {
            showNotification('✅ Doğru!', 'success');
        }
    } else {
        word.incorrectCount = (word.incorrectCount || 0) + 1;
        
        if (result.isClose) {
            showNotification('❌ Yanlış! (Ama yaklaştın)', 'error');
        } else {
            showNotification('❌ Yanlış!', 'error');
        }
    }
    
    // Kelime istatistiklerini güncelle
    word.reviewCount = (word.reviewCount || 0) + 1;
    word.lastReviewDate = new Date().toISOString();
    
    // Aktivite kaydet (wordId ve isCorrect bilgisi ile)
    addActivity('quiz_completed', `${word.word}: ${result.isCorrect ? 'Doğru' : 'Yanlış'}`, {
        wordId: word.id,
        isCorrect: result.isCorrect,
        folderId: word.folderId
    });
    
    // Sonraki tekrar tarihini hesapla
    updateNextReviewDate(word, result.isCorrect);
    
    // Cevap göster
    showAnswerResult(result.isCorrect, correctAnswer, userAnswer, result.hasTypo);
}

function showAnswerResult(isCorrect, correctAnswer, userAnswer, hasTypo = false) {
    const quizGame = document.getElementById('quizGame');
    const word = currentQuiz[currentQuizIndex];
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6">
            <div class="text-center mb-8">
                <div class="text-6xl mb-4">${isCorrect ? '✅' : '❌'}</div>
                <h2 class="text-2xl font-bold mb-4 ${isCorrect ? 'text-green-600' : 'text-red-600'}">
                    ${isCorrect ? t('correct') : t('incorrect')}
                </h2>
                
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <h3 class="font-bold text-lg text-gray-800 mb-2">${word.word}</h3>
                    <p class="text-gray-700 mb-2"><strong>${t('correctAnswer')}:</strong> ${correctAnswer}</p>
                    <p class="text-gray-600"><strong>${t('yourAnswer')}:</strong> ${userAnswer}</p>
                    ${hasTypo ? `<p class="text-orange-600 text-sm mt-2">⚠️ Küçük yazım hatası tespit edildi ama cevabın doğru sayıldı!</p>` : ''}
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-600 mb-4">${t('howDifficult')}</p>
                    <div class="flex justify-center gap-4">
                        <button onclick="setDifficulty('easy')" class="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200">
                            ${t('easyEmoji')}
                        </button>
                        <button onclick="setDifficulty('medium')" class="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200">
                            ${t('mediumEmoji')}
                        </button>
                        <button onclick="setDifficulty('hard')" class="px-4 py-2 bg-red-100 text-red-800 rounded-lg hover:bg-red-200">
                            ${t('hardEmoji')}
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button onclick="nextQuestion()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${currentQuizIndex + 1 < currentQuiz.length ? 'Sonraki Soru' : 'Sonuçları Gör'}
                </button>
                <button onclick="exitQuiz()" class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600">
                    ${t('exit')}
                </button>
            </div>
        </div>
    `;
}

function setDifficulty(difficulty) {
    const word = currentQuiz[currentQuizIndex];
    word.difficulty = difficulty;
    
    // Zorluk seviyesine göre sonraki tekrar tarihini ayarla
    updateNextReviewDate(word, true);
    
    nextQuestion();
}

function updateNextReviewDate(word, isCorrect) {
    const today = new Date();
    let daysToAdd = 1;
    
    if (isCorrect) {
        const reviewCount = word.reviewCount || 0;
        const intervals = [1, 3, 7, 14, 30, 60, 120];
        daysToAdd = intervals[Math.min(reviewCount, intervals.length - 1)];
        
        // Zorluk seviyesine göre ayarlama
        if (word.difficulty === 'easy') daysToAdd *= 1.5;
        else if (word.difficulty === 'hard') daysToAdd *= 0.7;
    } else {
        daysToAdd = 1; // Yanlış cevap için 1 gün sonra tekrar
    }
    
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + Math.round(daysToAdd));
    word.nextReviewDate = nextDate.toISOString().split('T')[0];
}

function nextQuestion() {
    currentQuizIndex++;
    showQuizQuestion();
}

function showQuizResults() {
    const percentage = Math.round((quizScore / currentQuiz.length) * 100);
    const quizGame = document.getElementById('quizGame');
    
    // İstatistikleri güncelle
    if (!userData.stats) userData.stats = {};
    userData.stats.totalQuizzes = (userData.stats.totalQuizzes || 0) + 1;
    userData.stats.todayQuizzes = (userData.stats.todayQuizzes || 0) + 1;
    
    // Ortalama skoru güncelle
    const totalScore = (userData.stats.averageScore || 0) * (userData.stats.totalQuizzes - 1) + percentage;
    userData.stats.averageScore = Math.round(totalScore / userData.stats.totalQuizzes);
    
    // Günlük seriyi güncelle
    updateDailyStreak();
    
    // Aktivite kaydet
    addActivity('quiz_completed', `Quiz tamamlandı: ${quizScore}/${currentQuiz.length} (${percentage}%)`);
    
    quizGame.innerHTML = `
        <div class="bg-white rounded-lg shadow-md p-6 text-center">
            <div class="text-6xl mb-4">${percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '💪'}</div>
            <h2 class="text-3xl font-bold text-gray-800 mb-4">${t('quizComplete')}</h2>
            
            <div class="bg-gray-50 p-6 rounded-lg mb-6">
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div>
                        <p class="text-2xl font-bold text-blue-600">${quizScore}</p>
                        <p class="text-gray-600">Doğru</p>
                    </div>
                    <div>
                        <p class="text-2xl font-bold text-red-600">${currentQuiz.length - quizScore}</p>
                        <p class="text-gray-600">Yanlış</p>
                    </div>
                </div>
                <div class="mt-4">
                    <p class="text-3xl font-bold text-green-600">${percentage}%</p>
                    <p class="text-gray-600">Başarı Oranı</p>
                </div>
            </div>
            
            <div class="flex justify-center gap-4">
                <button onclick="exitQuiz()" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                    ${t('completeQuiz')}
                </button>
                ${currentQuizFolder ? `
                    <button onclick="startQuizFromFolder('${currentQuizFolder}')" class="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold">
                        ${t('sameFolder')}
                    </button>
                ` : ''}
            </div>
        </div>
    `;
    
    // Verileri kaydet
    saveUserData();
}

function exitQuiz() {
    const quizGame = document.getElementById('quizGame');
    const quizMenu = document.getElementById('quizMenu');
    
    quizGame.classList.add('hidden');
    quizMenu.classList.remove('hidden');
    
    currentQuiz = null;
    currentQuizIndex = 0;
    quizScore = 0;
    currentQuizFolder = null;
    
    // Quiz menüsünü yenile
    renderQuizMenu();
}

function startWordReview(wordId) {
    const word = userData.words?.find(w => w.id === wordId);
    if (!word) return;
    
    currentQuiz = [word];
    currentQuizIndex = 0;
    quizScore = 0;
    
    showQuizQuestion();
}

// Stats Functions
function renderStats() {
    updateGeneralStats();
    updateWeeklyActivity();
    populateStatsFilters(); // Yeni: Filtreleri doldur
    updateEbbinghausChart(); // Yeni: Ebbinghaus eğrisi
    updateLearningCurveChart();
    updateMonthlyStatsChart();
    updateQuizPerformanceChart();
    updateDifficultyDistribution();
}

// Yeni: İstatistik filtrelerini doldur
function populateStatsFilters() {
    const folderSelect = document.getElementById('learningCurveFolder');
    const wordSelect = document.getElementById('learningCurveWord');
    
    if (!folderSelect || !wordSelect) return;
    
    // Klasör seçeneklerini doldur
    folderSelect.innerHTML = '<option value="">Tüm Klasörler</option>';
    if (userData.folders) {
        const addFolderOptions = (folders, prefix = '') => {
            folders.forEach(folder => {
                const option = document.createElement('option');
                option.value = folder.id;
                option.textContent = prefix + folder.name;
                folderSelect.appendChild(option);
                
                if (folder.subFolders && folder.subFolders.length > 0) {
                    addFolderOptions(folder.subFolders, prefix + '  ');
                }
            });
        };
        addFolderOptions(userData.folders);
    }
    
    // Kelime seçeneklerini doldur
    wordSelect.innerHTML = '<option value="">Tüm Kelimeler</option>';
    if (userData.words) {
        userData.words.forEach(word => {
            const option = document.createElement('option');
            option.value = word.id;
            option.textContent = word.word + ' - ' + word.definition.substring(0, 30) + '...';
            wordSelect.appendChild(option);
        });
    }
    
    // Klasör değiştiğinde kelimeleri filtrele
    folderSelect.addEventListener('change', function() {
        const selectedFolder = this.value;
        wordSelect.innerHTML = '<option value="">Tüm Kelimeler</option>';
        
        if (selectedFolder) {
            const folderWords = userData.words.filter(w => w.folderId === selectedFolder);
            folderWords.forEach(word => {
                const option = document.createElement('option');
                option.value = word.id;
                option.textContent = word.word + ' - ' + word.definition.substring(0, 30) + '...';
                wordSelect.appendChild(option);
            });
        } else {
            userData.words.forEach(word => {
                const option = document.createElement('option');
                option.value = word.id;
                option.textContent = word.word + ' - ' + word.definition.substring(0, 30) + '...';
                wordSelect.appendChild(option);
            });
        }
    });
}

function updateGeneralStats() {
    if (!userData.stats) return;
    
    const stats = userData.stats;
    const totalWords = userData.words?.length || 0;
    const masteredWords = userData.words?.filter(w => w.mastered).length || 0;
    const accuracy = stats.totalQuizzes > 0 ? stats.averageScore : 0;
    
    document.getElementById('statsTotal').textContent = totalWords;
    document.getElementById('statsMastered').textContent = masteredWords;
    document.getElementById('statsStreak').textContent = stats.streak || 0;
    document.getElementById('statsAccuracy').textContent = accuracy + '%';
}

function updateWeeklyActivity() {
    const heatmap = document.getElementById('weeklyHeatmap');
    if (!heatmap) return;
    
    const today = new Date();
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const activities = userData.stats?.activities || [];
    
    // Son 7 günü al
    const weekDays = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dayName = days[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Pazartesi = 0
        const dateStr = date.toISOString().split('T')[0];
        
        // O gün tamamlanan quiz sayısını hesapla
        const quizCount = activities.filter(activity => {
            const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
            return activityDate === dateStr && activity.type === 'quiz_completed';
        }).length;
        
        weekDays.push({
            name: dayName,
            date: dateStr,
            count: quizCount,
            isToday: dateStr === today.toISOString().split('T')[0]
        });
    }
    
    heatmap.innerHTML = weekDays.map(day => `
        <div class="text-center">
            <div class="w-10 h-10 rounded-lg mb-2 flex items-center justify-center text-white font-bold ${
                day.count > 0 ? 'bg-green-500' : 'bg-gray-300'
            } ${day.isToday ? 'ring-2 ring-blue-500' : ''}" title="${day.name}: ${day.count} quiz">
                ${day.count > 0 ? day.count : ''}
            </div>
            <div class="text-xs text-gray-600">${day.name}</div>
        </div>
    `).join('');
}

function updateDifficultyDistribution() {
    const difficultyBars = document.getElementById('difficultyBars');
    if (!difficultyBars || !userData.words) return;
    
    const difficulties = { easy: 0, medium: 0, hard: 0 };
    userData.words.forEach(word => {
        difficulties[word.difficulty] = (difficulties[word.difficulty] || 0) + 1;
    });
    
    const total = userData.words.length;
    
    difficultyBars.innerHTML = Object.entries(difficulties).map(([difficulty, count]) => {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        const color = difficulty === 'easy' ? 'green' : difficulty === 'medium' ? 'yellow' : 'red';
        
        return `
            <div class="flex items-center justify-between">
                <span class="font-medium text-gray-700 capitalize">${t(difficulty)}</span>
                <div class="flex items-center space-x-2 flex-1 ml-4">
                    <div class="flex-1 bg-gray-200 rounded-full h-4">
                        <div class="bg-${color}-500 h-4 rounded-full" style="width: ${percentage}%"></div>
                    </div>
                    <span class="text-sm text-gray-600 w-12">${count}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Chart.js grafik fonksiyonları
let learningCurveChart = null;
let monthlyStatsChart = null;
let quizPerformanceChart = null;
let ebbinghausChart = null;

// Yeni: Ebbinghaus Unutma Eğrisi
function updateEbbinghausChart() {
    const ctx = document.getElementById('ebbinghausChart');
    if (!ctx) return;
    
    // Önceki grafiği temizle
    if (ebbinghausChart) {
        ebbinghausChart.destroy();
    }
    
    // Ebbinghaus unutma eğrisi verileri (teorik)
    const days = [0, 1, 2, 7, 14, 30, 60, 90];
    const forgettingCurve = [100, 58, 44, 36, 33, 28, 25, 21]; // Unutma yüzdesi
    const spacedRepetition = [100, 100, 100, 95, 92, 90, 88, 85]; // Aralıklı tekrar ile hatırlama
    
    ebbinghausChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days.map(d => d === 0 ? 'Başlangıç' : d + ' gün'),
            datasets: [
                {
                    label: 'Unutma Eğrisi (Tekrarsız)',
                    data: forgettingCurve,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#ef4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Aralıklı Tekrar Sistemi',
                    data: spacedRepetition,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    tension: 0.4,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '% hatırlama';
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#6b7280'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 11
                        },
                        color: '#6b7280'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateLearningCurveChart() {
    const ctx = document.getElementById('learningCurveChart');
    if (!ctx) return;
    
    // Önceki grafiği temizle
    if (learningCurveChart) {
        learningCurveChart.destroy();
    }
    
    // Filtre değerlerini al
    const selectedFolder = document.getElementById('learningCurveFolder')?.value || '';
    const selectedWord = document.getElementById('learningCurveWord')?.value || '';
    const selectedPeriod = parseInt(document.getElementById('learningCurvePeriod')?.value || '14');
    
    // Filtrelenmiş kelimeleri al
    let filteredWords = userData.words || [];
    if (selectedFolder) {
        filteredWords = filteredWords.filter(w => w.folderId === selectedFolder);
    }
    if (selectedWord) {
        filteredWords = filteredWords.filter(w => w.id === selectedWord);
    }
    
    // Aktiviteleri filtrele
    const activities = userData.stats?.activities || [];
    const filteredActivities = activities.filter(activity => {
        if (activity.type !== 'quiz_completed') return false;
        if (selectedWord && activity.wordId !== selectedWord) return false;
        if (selectedFolder && !filteredWords.find(w => w.id === activity.wordId)) return false;
        return true;
    });
    
    // Seçilen periyot için verileri hazırla
    const periodDays = [];
    const today = new Date();
    
    for (let i = selectedPeriod - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayQuizzes = filteredActivities.filter(activity => {
            const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
            return activityDate === dateStr;
        }).length;
        
        const dayCorrect = filteredActivities.filter(activity => {
            const activityDate = new Date(activity.timestamp).toISOString().split('T')[0];
            return activityDate === dateStr && activity.isCorrect;
        }).length;
        
        // Yüzdelik hatırlama oranı hesapla
        const dayPercentage = dayQuizzes > 0 ? Math.round((dayCorrect / dayQuizzes) * 100) : 0;
        
        periodDays.push({
            date: dateStr,
            quizzes: dayQuizzes,
            correct: dayCorrect,
            percentage: dayPercentage,
            label: date.getDate() + '/' + (date.getMonth() + 1)
        });
    }
    
    // İstatistikleri hesapla
    const totalReviews = filteredActivities.length;
    const totalCorrect = filteredActivities.filter(a => a.isCorrect).length;
    const correctRate = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
    
    // Ortalama tekrar süresi (gün)
    let avgTime = 0;
    if (filteredWords.length > 0) {
        const totalDays = filteredWords.reduce((sum, word) => {
            if (word.createdDate) {
                const created = new Date(word.createdDate);
                const now = new Date();
                const days = Math.floor((now - created) / (1000 * 60 * 60 * 24));
                return sum + days;
            }
            return sum;
        }, 0);
        avgTime = Math.round(totalDays / filteredWords.length);
    }
    
    // İlerleme yüzdesi (öğrenilen / toplam)
    const masteredCount = filteredWords.filter(w => w.mastered).length;
    const progress = filteredWords.length > 0 ? Math.round((masteredCount / filteredWords.length) * 100) : 0;
    
    // İstatistikleri güncelle
    document.getElementById('lcTotalReviews').textContent = totalReviews;
    document.getElementById('lcCorrectRate').textContent = correctRate + '%';
    document.getElementById('lcAvgTime').textContent = avgTime;
    document.getElementById('lcProgress').textContent = progress + '%';
    
    learningCurveChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: periodDays.map(day => day.label),
            datasets: [
                {
                    label: 'Toplam Quiz',
                    data: periodDays.map(day => day.quizzes),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Doğru Cevaplar',
                    data: periodDays.map(day => day.correct),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#22c55e',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Hatırlama Oranı (%)',
                    data: periodDays.map(day => day.percentage),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    pointBackgroundColor: '#f59e0b',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    tension: 0.4,
                    fill: false,
                    yAxisID: 'y1',
                    borderDash: [5, 5] // Kesikli çizgi
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 13,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.dataset.yAxisID === 'y1') {
                                label += context.parsed.y + '%';
                            } else {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 11
                        },
                        color: '#6b7280',
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 11
                        },
                        color: '#6b7280'
                    },
                    title: {
                        display: true,
                        text: 'Quiz Sayısı',
                        color: '#6b7280',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        },
                        font: {
                            size: 11
                        },
                        color: '#f59e0b'
                    },
                    title: {
                        display: true,
                        text: 'Hatırlama Oranı',
                        color: '#f59e0b',
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateMonthlyStatsChart() {
    const ctx = document.getElementById('monthlyStatsChart');
    if (!ctx) return;
    
    // Önceki grafiği temizle
    if (monthlyStatsChart) {
        monthlyStatsChart.destroy();
    }
    
    // Son 6 ayın verilerini al
    const activities = userData.stats?.activities || [];
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthStr = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
        
        const monthQuizzes = activities.filter(activity => {
            const activityDate = new Date(activity.timestamp);
            const activityMonth = activityDate.getFullYear() + '-' + String(activityDate.getMonth() + 1).padStart(2, '0');
            return activityMonth === monthStr && activity.type === 'quiz_completed';
        }).length;
        
        const monthWords = activities.filter(activity => {
            const activityDate = new Date(activity.timestamp);
            const activityMonth = activityDate.getFullYear() + '-' + String(activityDate.getMonth() + 1).padStart(2, '0');
            return activityMonth === monthStr && activity.type === 'word_added';
        }).length;
        
        last6Months.push({
            month: monthStr,
            quizzes: monthQuizzes,
            words: monthWords,
            label: (date.getMonth() + 1) + '/' + date.getFullYear()
        });
    }
    
    monthlyStatsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: last6Months.map(month => month.label),
            datasets: [{
                label: t('quizzes'),
                data: last6Months.map(month => month.quizzes),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: '#3b82f6',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            }, {
                label: t('words'),
                data: last6Months.map(month => month.words),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: '#10b981',
                borderWidth: 1,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 14,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#6b7280'
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    },
                    ticks: {
                        stepSize: 1,
                        font: {
                            size: 12
                        },
                        color: '#6b7280'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

function updateQuizPerformanceChart() {
    const ctx = document.getElementById('quizPerformanceChart');
    if (!ctx) return;
    
    // Önceki grafiği temizle
    if (quizPerformanceChart) {
        quizPerformanceChart.destroy();
    }
    
    // Quiz türlerine göre performans verilerini al
    const activities = userData.stats?.activities || [];
    const quizActivities = activities.filter(activity => activity.type === 'quiz_completed');
    
    if (quizActivities.length === 0) {
        // Veri yoksa boş grafik göster
        quizPerformanceChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Veri Yok'],
                datasets: [{
                    data: [1],
                    backgroundColor: ['#e5e7eb'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        enabled: false
                    }
                }
            }
        });
        return;
    }
    
    // Son 20 quiz sonucunu al
    const recentQuizzes = quizActivities.slice(-20);
    const quizScores = recentQuizzes.map((activity, index) => {
        // Quiz açıklamasından skor çıkar
        const match = activity.description.match(/(\d+)%/);
        return match ? parseInt(match[1]) : Math.floor(Math.random() * 40) + 60;
    });
    
    const lowScores = quizScores.filter(score => score < 60).length;
    const mediumScores = quizScores.filter(score => score >= 60 && score < 80).length;
    const highScores = quizScores.filter(score => score >= 80).length;
    
    quizPerformanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Düşük (0-60%)', 'Orta (60-80%)', 'Yüksek (80-100%)'],
            datasets: [{
                data: [lowScores, mediumScores, highScores],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)', 
                    'rgba(16, 185, 129, 0.8)'
                ],
                borderColor: [
                    '#ef4444',
                    '#f59e0b',
                    '#10b981'
                ],
                borderWidth: 2,
                hoverBackgroundColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(16, 185, 129, 1)'
                ],
                hoverBorderWidth: 3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: {
                            size: 12,
                            weight: 'bold'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#ffffff',
                    bodyColor: '#ffffff',
                    borderColor: '#3b82f6',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.parsed / total) * 100).toFixed(1);
                            return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                        }
                    }
                }
            },
            cutout: '60%',
            animation: {
                animateRotate: true,
                duration: 1000
            }
        }
    });
}

// Tutorial Functions
function startTutorial() {
    tutorialStep = 0;
    document.getElementById('tutorialOverlay').classList.remove('hidden');
    showTutorialStep();
}

function showTutorialStep() {
    const steps = [
        {
            icon: '🎯',
            title: 'Hoş Geldin!',
            text: t('tutorialWelcome')
        },
        {
            icon: '📁',
            title: t('folders'),
            text: t('tutorialFolders')
        },
        {
            icon: '📝',
            title: t('words'),
            text: t('tutorialWords')
        },
        {
            icon: '🎯',
            title: t('quiz'),
            text: t('tutorialQuiz')
        },
        {
            icon: '📊',
            title: t('stats'),
            text: t('tutorialStats')
        },
        {
            icon: '🔔',
            title: t('notifications'),
            text: t('tutorialNotifications')
        },
        {
            icon: '🌙',
            title: t('themes'),
            text: t('tutorialThemes')
        },
        {
            icon: '🌍',
            title: t('languages'),
            text: t('tutorialLanguages')
        },
        {
            icon: '🚀',
            title: t('ready'),
            text: t('tutorialReady')
        }
    ];
    
    const step = steps[tutorialStep];
    
    document.getElementById('tutorialIcon').textContent = step.icon;
    document.getElementById('tutorialTitle').textContent = step.title;
    document.getElementById('tutorialText').textContent = step.text;
    
    // Progress dots güncelle
    const dots = document.querySelectorAll('.tutorial-progress-dot');
    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === tutorialStep);
    });
    
    // Buton metinlerini güncelle
    const nextButton = document.getElementById('nextButton');
    if (tutorialStep === steps.length - 1) {
        nextButton.textContent = t('finish');
    } else {
        nextButton.textContent = t('next');
    }
}

function nextTutorial() {
    const totalSteps = 9;
    
    if (tutorialStep < totalSteps - 1) {
        tutorialStep++;
        showTutorialStep();
    } else {
        completeTutorial();
    }
}


function skipTutorial() {
    completeTutorial();
}

function completeTutorial() {
    document.getElementById('tutorialOverlay').classList.add('hidden');
    localStorage.setItem('tutorialCompleted', 'true');
    showNotification('✅ ' + t('tutorialCompleted'), 'success');
}
function goToDailyReview() {
    // Quiz sekmesine git
    showTab('quiz');
    
    // Tekrar quiz butonuna odaklan (görsel efekt için)
    setTimeout(() => {
        const reviewQuizButton = document.querySelector('button[onclick="startReviewQuiz()"]');
        if (reviewQuizButton) {
            reviewQuizButton.style.animation = 'pulse 1s ease-in-out 3 alternate';
            reviewQuizButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, 300);
}
function updateDailyStreak() {
    if (!userData.stats) userData.stats = {};
    
    const today = new Date().toISOString().split('T')[0];
    const lastStudyDate = userData.stats.lastStudyDate;
    
    // Bugün ilk kez çalışıyorsa
    if (lastStudyDate !== today) {
        // Dün çalışmış mı kontrol et
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        if (lastStudyDate === yesterdayStr) {
            // Seri devam ediyor
            userData.stats.streak = (userData.stats.streak || 0) + 1;
        } else if (lastStudyDate === null || lastStudyDate === undefined) {
            // İlk kez çalışıyor
            userData.stats.streak = 1;
        } else {
            // Seri kırıldı, yeniden başla
            userData.stats.streak = 1;
        }
        
        // En iyi seriyi güncelle
        if (userData.stats.streak > (userData.stats.bestStreak || 0)) {
            userData.stats.bestStreak = userData.stats.streak;
        }
        
        // Bugünü kaydet
        userData.stats.lastStudyDate = today;
        
        // Çalışma tarihlerini kaydet
        if (!userData.stats.studyDates) userData.stats.studyDates = [];
        if (!userData.stats.studyDates.includes(today)) {
            userData.stats.studyDates.push(today);
        }
    }
}

