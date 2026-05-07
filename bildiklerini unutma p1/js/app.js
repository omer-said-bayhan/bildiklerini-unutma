// Cordova device ready event
document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady() {
    console.log('Device is ready');
    
    // Hide splash screen
    if (navigator.splashscreen) {
        navigator.splashscreen.hide();
    }
    
    // Initialize notifications
    initializeNotifications();
    
    // Initialize app
    initApp();
}

// Global değişkenler
let currentUser = null;
let userData = {};
let currentQuiz = null;
let currentQuizIndex = 0;
let quizScore = 0;
let currentFolderId = null;
let currentWordId = null;

// Zorluk ayarları
const difficultySettings = { easy: 5, medium: 3, hard: 1 };
const reviewIntervals = [1, 3, 7, 30, 90, 180];

// Bildirim sistemi başlatma
function initializeNotifications() {
    if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.notification) {
        // Request notification permission
        cordova.plugins.notification.local.requestPermission(function (granted) {
            console.log('Notification permission granted:', granted);
        });
    }
}

// Yerel bildirim gönderme
function scheduleNotification(title, text, delay = 0) {
    if (typeof cordova !== 'undefined' && cordova.plugins && cordova.plugins.notification) {
        cordova.plugins.notification.local.schedule({
            id: Date.now(),
            title: title,
            text: text,
            trigger: { in: delay, unit: 'second' },
            icon: 'res://icon',
            smallIcon: 'res://icon'
        });
    }
}

// Veri dışa aktarma (mobil için optimize)
function exportData() {
    if (!currentUser) {
        alert('Önce giriş yapmalısınız!');
        return;
    }
    
    const exportData = {
        user: currentUser,
        data: userData,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    
    // Cordova file plugin kullanarak kaydet
    if (typeof cordova !== 'undefined' && window.requestFileSystem) {
        const fileName = `kelime-verileri-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fs) {
            fs.root.getFile(fileName, { create: true, exclusive: false }, function (fileEntry) {
                fileEntry.createWriter(function (fileWriter) {
                    fileWriter.onwriteend = function() {
                        showNotification('Verileriniz başarıyla dışa aktarıldı! 📤', 'success');
                        alert(`Dosya kaydedildi: ${fileName}`);
                    };
                    
                    fileWriter.onerror = function (e) {
                        alert('Dosya kaydetme hatası: ' + e.toString());
                    };
                    
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    fileWriter.write(dataBlob);
                });
            });
        });
    } else {
        // Web fallback
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `kelime-verileri-${currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        showNotification('Verileriniz başarıyla dışa aktarıldı! 📤', 'success');
    }
}

// Veri içe aktarma
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('importFile').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (importedData.user && importedData.data) {
                    // Kullanıcı adını otomatik doldur
                    document.getElementById('usernameInput').value = importedData.user;
                    
                    // Veriyi localStorage'a kaydet
                    const key = `spacedRepetition_${importedData.user}`;
                    localStorage.setItem(key, JSON.stringify(importedData.data));
                    
                    alert(`✅ Veriler başarıyla içe aktarıldı!\n\nKullanıcı: ${importedData.user}\nKlasör sayısı: ${importedData.data.folders.length}\nKelime sayısı: ${importedData.data.words.length}\n\nŞimdi "${importedData.user}" ile giriş yapabilirsiniz.`);
                } else {
                    alert('❌ Geçersiz dosya formatı!');
                }
            } catch (error) {
                alert('❌ Dosya okunamadı! Lütfen geçerli bir JSON dosyası seçin.');
            }
        };
        reader.readAsText(file);
    });
});

// Uygulama başlatma
function initApp() {
    checkNotifications();
    renderAll();
    
    // Periyodik bildirim kontrolü (her 5 dakikada bir)
    setInterval(checkNotifications, 300000);
}

// Kullanıcı girişi
function login() {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) {
        alert('Lütfen kullanıcı adı girin');
        return;
    }
    currentUser = username;
    loadUserData();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUser').textContent = `Hoş geldin, ${username}!`;
    initApp();
}

function logout() {
    currentUser = null;
    userData = {};
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('usernameInput').value = '';
}

// Veri yönetimi
function loadUserData() {
    const key = `spacedRepetition_${currentUser}`;
    userData = JSON.parse(localStorage.getItem(key)) || {
        folders: [],
        words: [],
        stats: { totalWords: 0, masteredWords: 0, reviewsCompleted: 0 }
    };
}

function saveUserData() {
    if (!currentUser) return;
    const key = `spacedRepetition_${currentUser}`;
    localStorage.setItem(key, JSON.stringify(userData));
}

// Sekme yönetimi
function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    if (tabName === 'dashboard') renderDashboard();
    else if (tabName === 'folders') renderFolders();
    else if (tabName === 'quiz') renderQuizArea();
    else if (tabName === 'stats') renderChart();
}

// Klasör yönetimi
function createFolder() {
    const folderName = document.getElementById('folderNameInput').value.trim();
    if (!folderName) {
        alert('Lütfen klasör adı girin');
        return;
    }
    const newFolder = {
        id: Date.now(),
        name: folderName,
        createdDate: new Date().toISOString().split('T')[0],
        wordCount: 0
    };
    userData.folders.push(newFolder);
    saveUserData();
    document.getElementById('folderNameInput').value = '';
    renderFolders();
    
    // Haptic feedback (if available)
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
}

function deleteFolder(folderId) {
    if (confirm('Bu klasörü ve tüm kelimelerini silmek istediğinizden emin misiniz?')) {
        userData.folders = userData.folders.filter(f => f.id !== folderId);
        userData.words = userData.words.filter(w => w.folderId !== folderId);
        saveUserData();
        renderFolders();
        renderDashboard();
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
}

function openFolder(folderId) {
    currentFolderId = folderId;
    const folder = userData.folders.find(f => f.id === folderId);
    if (!folder) return;

    const folderWords = userData.words.filter(w => w.folderId === folderId);
    const foldersList = document.getElementById('foldersList');
    foldersList.innerHTML = `
        <div class="mb-4">
            <button onclick="renderFolders()" class="text-blue-500 hover:text-blue-700 text-sm flex items-center">
                <span class="mr-1">←</span> Klasörlere Dön
            </button>
            <h3 class="text-lg font-semibold mt-2">${folder.name} (${folderWords.length} kelime)</h3>
        </div>
        <div class="mb-4">
            <button onclick="openWordModal(${folderId})" class="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                + Yeni Kelime Ekle
            </button>
        </div>
        <div class="space-y-2">
            ${folderWords.length === 0 ? 
                '<div class="text-center py-8"><p class="text-gray-500 text-sm">Bu klasörde henüz kelime yok.</p><p class="text-xs text-gray-400 mt-2">Yukarıdaki butona tıklayarak kelime ekleyin</p></div>' :
                folderWords.map(word => {
                    const today = new Date().toISOString().split('T')[0];
                    const isDue = word.nextReviewDate <= today;
                    const daysSinceLastReview = word.lastReviewDate 
                        ? getDaysBetween(word.lastReviewDate, today)
                        : getDaysBetween(word.createdDate, today);
                    const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
                    const retentionPercentage = Math.round(retentionScore * 100);
                    
                    return `
                        <div class="p-3 border border-gray-200 rounded-lg ${isDue ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50'}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="font-medium text-sm">${word.word}</div>
                                    <div class="text-xs text-gray-600 mt-1">${word.definition}</div>
                                    <div class="text-xs text-gray-500 mt-1 flex items-center">
                                        <span class="mr-2">${word.difficulty}</span>
                                        <span class="mr-2">Tekrar: ${word.reviewCount}</span>
                                        <span class="text-${retentionPercentage < 50 ? 'red' : 'green'}-600">Hatırlama: ${retentionPercentage}%</span>
                                    </div>
                                </div>
                                <div class="flex gap-1 ml-2">
                                    <button onclick="editWord(${word.id})" class="px-2 py-1 bg-gray-500 text-white rounded text-xs">✏️</button>
                                    <button onclick="deleteWord(${word.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs">🗑️</button>
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
    const difficultySelect = document.getElementById('wordDifficultySelect');
    
    if (wordId) {
        const word = userData.words.find(w => w.id === wordId);
        title.textContent = 'Kelimeyi Düzenle';
        wordInput.value = word.word;
        definitionInput.value = word.definition;
        difficultySelect.value = word.difficulty;
    } else {
        title.textContent = 'Yeni Kelime Ekle';
        wordInput.value = '';
        definitionInput.value = '';
        difficultySelect.value = 'medium';
    }
    modal.classList.remove('hidden');
    
    // Focus on first input
    setTimeout(() => wordInput.focus(), 100);
}

function closeWordModal() {
    document.getElementById('wordModal').classList.add('hidden');
    currentFolderId = null;
    currentWordId = null;
}

function saveWord() {
    const word = document.getElementById('wordInput').value.trim();
    const definition = document.getElementById('definitionInput').value.trim();
    const difficulty = document.getElementById('wordDifficultySelect').value;
    
    if (!word || !definition) {
        alert('Lütfen kelime ve anlamını girin');
        return;
    }
    
    if (currentWordId) {
        const wordObj = userData.words.find(w => w.id === currentWordId);
        wordObj.word = word;
        wordObj.definition = definition;
        wordObj.difficulty = difficulty;
    } else {
        const newWord = {
            id: Date.now(),
            folderId: currentFolderId,
            word: word,
            definition: definition,
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
    }
    saveUserData();
    closeWordModal();
    openFolder(currentFolderId);
    renderDashboard();
    
    // Haptic feedback
    if (navigator.vibrate) {
        navigator.vibrate(50);
    }
    
    showNotification('Kelime başarıyla kaydedildi! ✅', 'success');
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
        
        // Haptic feedback
        if (navigator.vibrate) {
            navigator.vibrate(100);
        }
    }
}

// Quiz sistemi
function startQuiz() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    if (dueWords.length === 0) {
        document.getElementById('quizArea').innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-lg font-semibold mb-4">Tekrar Edilecek Kelime Yok!</h3>
                <p class="text-gray-600 text-sm">Harika! Daha sonra tekrar gel.</p>
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
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center">
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-500">Soru ${currentQuizIndex + 1} / ${currentQuiz.length}</span>
                    <span class="text-xs text-gray-400">${folder ? folder.name : 'Bilinmeyen Klasör'}</span>
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
                <textarea 
                    id="quizAnswer" 
                    placeholder="Cevabınızı yazın..." 
                    rows="3"
                    class="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                ></textarea>
            </div>
            <button 
                onclick="checkAnswer()" 
                class="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
                Cevabı Kontrol Et
            </button>
        </div>
    `;
    document.getElementById('quizAnswer').focus();
}

function checkAnswer() {
    const userAnswer = document.getElementById('quizAnswer').value.trim();
    const word = currentQuiz[currentQuizIndex];
    const correctAnswer = word.definition;
    const similarity = calculateSimilarity(userAnswer.toLowerCase(), correctAnswer.toLowerCase());
    const isCorrect = similarity > 0.6 || userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) || correctAnswer.toLowerCase().includes(userAnswer.toLowerCase());
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center">
            <div class="mb-4">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm text-gray-500">Soru ${currentQuizIndex + 1} / ${currentQuiz.length}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-blue-600 h-2 rounded-full transition-all duration-300" style="width: ${((currentQuizIndex + 1) / currentQuiz.length) * 100}%"></div>
                </div>
            </div>
            <div class="mb-6">
                <h3 class="text-xl font-bold mb-4">${word.word}</h3>
                <div class="text-4xl mb-4">
                    ${isCorrect ? '✅' : '❌'}
                </div>
                <div class="text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'} mb-4 font-medium">
                    ${isCorrect ? 'Doğru!' : 'Yanlış'}
                </div>
                <div class="bg-gray-50 p-4 rounded-lg mb-4">
                    <div class="text-xs text-gray-600 mb-1">Doğru Cevap:</div>
                    <div class="font-medium text-sm">${correctAnswer}</div>
                </div>
                ${!isCorrect ? `
                    <div class="bg-red-50 p-4 rounded-lg mb-4">
                        <div class="text-xs text-gray-600 mb-1">Sizin Cevabınız:</div>
                        <div class="text-sm">${userAnswer}</div>
                    </div>
                ` : ''}
            </div>
            <div class="grid grid-cols-3 gap-2 mb-4">
                <button onclick="rateAnswer('easy')" class="px-3 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium">
                    😊<br>Kolay
                </button>
                <button onclick="rateAnswer('medium')" class="px-3 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm font-medium">
                    😐<br>Orta
                </button>
                <button onclick="rateAnswer('hard')" class="px-3 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium">
                    😰<br>Zor
                </button>
            </div>
            <p class="text-xs text-gray-500">Bu soru sizin için ne kadar zordu?</p>
        </div>
    `;
    if (isCorrect) {
        quizScore++;
        // Haptic feedback for correct answer
        if (navigator.vibrate) {
            navigator.vibrate([50, 50, 50]);
        }
    } else {
        // Haptic feedback for wrong answer
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
    }
}

function rateAnswer(difficulty) {
    const word = currentQuiz[currentQuizIndex];
    reviewWord(word.id, difficulty);
    currentQuizIndex++;
    showQuizQuestion();
}

function showQuizResults() {
    const percentage = Math.round((quizScore / currentQuiz.length) * 100);
    const emoji = percentage >= 80 ? '🎉' : percentage >= 60 ? '👍' : '💪';
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center py-8">
            <div class="text-6xl mb-4">${emoji}</div>
            <h3 class="text-xl font-bold mb-4">Quiz Tamamlandı!</h3>
            <div class="text-4xl font-bold text-blue-600 mb-2">${quizScore}/${currentQuiz.length}</div>
            <div class="text-lg text-gray-600 mb-6">%${percentage} Doğru</div>
            <div class="mb-6">
                <div class="w-full bg-gray-200 rounded-full h-3">
                    <div class="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
                </div>
            </div>
            <button onclick="renderQuizArea()" class="w-full px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium">
                Yeni Quiz Başlat
            </button>
        </div>
    `;
    userData.stats.reviewsCompleted += currentQuiz.length;
    saveUserData();
    renderDashboard();
    
    // Schedule notification for next review
    scheduleNotification('Kelime Öğrenme', 'Yeni kelimeler tekrar edilmeyi bekliyor!', 86400); // 24 hours
    
    // Haptic feedback for completion
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 100]);
    }
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

// Yardımcı fonksiyonlar
function calculateRetentionScore(daysSinceLastReview, difficulty) {
    const S = difficultySettings[difficulty];
    return Math.exp(-daysSinceLastReview / S);
}

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
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
    }
    return matrix[str2.length][str1.length];
}

// Bildirim sistemi
function checkNotifications() {
    if (!currentUser) return;
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    if (dueWords.length > 0) {
        showNotification(`${dueWords.length} kelime tekrar edilmeyi bekliyor!`, 'info');
        
        // Send native notification
        scheduleNotification('Kelime Öğrenme', `${dueWords.length} kelime tekrar edilmeyi bekliyor!`, 1);
    }
}

function showNotification(message, type = 'info') {
    const notificationsArea = document.getElementById('notificationsArea');
    const colors = {
        info: 'bg-blue-50 border-blue-200 text-blue-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
        error: 'bg-red-50 border-red-200 text-red-800'
    };
    notificationsArea.innerHTML = `
        <div class="notification p-3 border rounded-lg ${colors[type]} mb-4">
            <div class="flex justify-between items-center">
                <span class="text-sm">${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700 text-lg">×</button>
            </div>
        </div>
    `;
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        const notification = notificationsArea.querySelector('.notification');
        if (notification) {
            notification.remove();
        }
    }, 5000);
}

// Render fonksiyonları
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    document.getElementById('totalWords').textContent = userData.stats.totalWords;
    document.getElementById('dueToday').textContent = dueWords.length;
    document.getElementById('masteredWords').textContent = userData.stats.masteredWords;
    
    const reviewsList = document.getElementById('reviewsList');
    if (dueWords.length === 0) {
        reviewsList.innerHTML = `
            <div class="text-center py-6">
                <div class="text-4xl mb-2">🎉</div>
                <p class="text-gray-500 text-sm">Bugün tekrar edilecek kelime yok!</p>
                <p class="text-xs text-gray-400 mt-1">Harika iş çıkarıyorsun!</p>
            </div>
        `;
    } else {
        reviewsList.innerHTML = `
            <div class="mb-4">
                <button onclick="showTab('quiz'); startQuiz();" class="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 font-medium shadow-lg">
                    🚀 Quiz Başlat (${dueWords.length} kelime)
                </button>
            </div>
            ${dueWords.slice(0, 3).map(word => {
                const folder = userData.folders.find(f => f.id === word.folderId);
                const daysSinceLastReview = word.lastReviewDate 
                    ? getDaysBetween(word.lastReviewDate, today)
                    : getDaysBetween(word.createdDate, today);
                const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
                const retentionPercentage = Math.round(retentionScore * 100);
                
                return `
                    <div class="p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-medium text-sm">${word.word}</span>
                                <span class="text-xs text-gray-600 ml-2">(${folder ? folder.name : 'Bilinmeyen'})</span>
                                <div class="text-xs text-red-600 mt-1">⚡ Hatırlama: %${retentionPercentage}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
            ${dueWords.length > 3 ? `<p class="text-xs text-gray-500 mt-2 text-center">...ve ${dueWords.length - 3} kelime daha</p>` : ''}
        `;
    }
}

function renderFolders() {
    currentFolderId = null;
    const foldersList = document.getElementById('foldersList');
    
    if (userData.folders.length === 0) {
        foldersList.innerHTML = `
            <div class="text-center py-8">
                <div class="text-4xl mb-4">📁</div>
                <p class="text-gray-500 text-sm mb-2">Henüz klasör oluşturulmamış.</p>
                <p class="text-xs text-gray-400">Yukarıdan yeni bir klasör oluşturun</p>
            </div>
        `;
        return;
    }
    
    foldersList.innerHTML = userData.folders.map(folder => {
        const wordCount = userData.words.filter(w => w.folderId === folder.id).length;
        const today = new Date().toISOString().split('T')[0];
        const dueCount = userData.words.filter(w => w.folderId === folder.id && w.nextReviewDate <= today).length;
        
        return `
            <div class="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-all duration-200 hover:shadow-md" onclick="openFolder(${folder.id})">
                <div class="flex justify-between items-center">
                    <div class="flex-1">
                        <div class="flex items-center mb-1">
                            <span class="text-lg mr-2">📂</span>
                            <h3 class="font-medium text-sm">${folder.name}</h3>
                        </div>
                        <p class="text-xs text-gray-600">${wordCount} kelime</p>
                        ${dueCount > 0 ? `<p class="text-xs text-red-600 font-medium">🔔 ${dueCount} tekrar edilecek</p>` : ''}
                    </div>
                    <div class="flex gap-1">
                        <button onclick="event.stopPropagation(); openFolder(${folder.id})" class="px-2 py-1 bg-blue-500 text-white rounded text-xs">Aç</button>
                        <button onclick="event.stopPropagation(); deleteFolder(${folder.id})" class="px-2 py-1 bg-red-500 text-white rounded text-xs">Sil</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderQuizArea() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    if (dueWords.length === 0) {
        document.getElementById('quizArea').innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">🎉</div>
                <h3 class="text-lg font-semibold mb-4">Tekrar Edilecek Kelime Yok!</h3>
                <p class="text-gray-600 mb-4 text-sm">Harika! Tüm kelimeleriniz güncel.</p>
                <button onclick="showTab('folders')" class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
                    📚 Daha Fazla Kelime Ekle
                </button>
            </div>
        `;
    } else {
        document.getElementById('quizArea').innerHTML = `
            <div class="text-center py-8">
                <div class="text-6xl mb-4">📚</div>
                <h3 class="text-lg font-semibold mb-4">Tekrar Zamanı!</h3>
                <p class="text-gray-600 mb-6 text-sm">${dueWords.length} kelime tekrar edilmeyi bekliyor.</p>
                <button onclick="startQuiz()" class="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg hover:from-green-600 hover:to-blue-600 transition-all duration-300 font-medium shadow-lg">
                    🚀 Quiz Başlat
                </button>
            </div>
        `;
    }
}

function renderChart() {
    const ctx = document.getElementById('forgettingCurveChart').getContext('2d');
    if (window.forgettingChart) window.forgettingChart.destroy();
    
    if (userData.folders.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('Gösterilecek veri yok', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const datasets = userData.folders.map((folder, index) => {
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
        const color = colors[index % colors.length];
        const folderWords = userData.words.filter(w => w.folderId === folder.id);
        if (folderWords.length === 0) return null;
        
        const dataPoints = [];
        for (let day = 0; day <= 30; day++) {
            let totalRetention = 0;
            folderWords.forEach(word => {
                const retention = calculateRetentionScore(day, word.difficulty);
                totalRetention += retention;
            });
            const avgRetention = totalRetention / folderWords.length;
            dataPoints.push({ x: day, y: avgRetention * 100 });
        }
        
        return {
            label: `${folder.name} (${folderWords.length} kelime)`,
            data: dataPoints,
            borderColor: color,
            backgroundColor: color + '20',
            fill: false,
            tension: 0.4,
            borderWidth: 2
        };
    }).filter(dataset => dataset !== null);
    
    window.forgettingChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: { display: true, text: 'Gün' },
                    min: 0, max: 30
                },
                y: {
                    title: { display: true, text: 'Hatırlama (%)' },
                    min: 0, max: 100
                }
            },
            plugins: {
                title: { display: true, text: 'Unutma Eğrisi' },
                legend: { display: true, position: 'bottom' }
            }
        }
    });
}

function renderAll() {
    renderDashboard();
    renderFolders();
    renderQuizArea();
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Username input enter key
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') login();
        });
    }
    
    // Folder name input enter key
    const folderNameInput = document.getElementById('folderNameInput');
    if (folderNameInput) {
        folderNameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') createFolder();
        });
    }
    
    // Prevent zoom on double tap
    let lastTouchEnd = 0;
    document.addEventListener('touchend', function (event) {
        const now = (new Date()).getTime();
        if (now - lastTouchEnd <= 300) {
            event.preventDefault();
        }
        lastTouchEnd = now;
    }, false);
});

// Initialize app if not using Cordova
if (typeof cordova === 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        initApp();
    });
}