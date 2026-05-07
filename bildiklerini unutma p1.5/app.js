// Global variables
let currentUser = null;
let userData = {};
let currentQuiz = null;
let currentQuizIndex = 0;
let quizScore = 0;
let currentFolderId = null;
let currentWordId = null;

// Difficulty settings (S values for retention formula)
const difficultySettings = {
    easy: 5,
    medium: 3,
    hard: 1
};

// Review intervals in days
const reviewIntervals = [1, 3, 7, 30, 90, 180];

// Initialize app
function initApp() {
    checkNotifications();
    renderAll();
}

// User Authentication
function login() {
    const username = document.getElementById('usernameInput').value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }

    currentUser = username;
    loadUserData();
    
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('currentUser').textContent = `Welcome, ${username}!`;
    
    initApp();
}

function logout() {
    currentUser = null;
    userData = {};
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('usernameInput').value = '';
}

// Data Management
function loadUserData() {
    const key = `spacedRepetition_${currentUser}`;
    userData = JSON.parse(localStorage.getItem(key)) || {
        folders: [],
        words: [],
        stats: {
            totalWords: 0,
            masteredWords: 0,
            reviewsCompleted: 0
        }
    };
}

function saveUserData() {
    if (!currentUser) return;
    const key = `spacedRepetition_${currentUser}`;
    localStorage.setItem(key, JSON.stringify(userData));
}

// Tab Management
function showTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Remove active class from all tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab content
    document.getElementById(tabName + 'Content').classList.remove('hidden');
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Render content based on tab
    if (tabName === 'dashboard') {
        renderDashboard();
    } else if (tabName === 'folders') {
        renderFolders();
    } else if (tabName === 'quiz') {
        renderQuizArea();
    } else if (tabName === 'stats') {
        renderChart();
    }
}
// Folder Management
function createFolder() {
    const folderName = document.getElementById('folderNameInput').value.trim();
    if (!folderName) {
        alert('Please enter a folder name');
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
}

function deleteFolder(folderId) {
    if (confirm('Are you sure you want to delete this folder and all its words?')) {
        userData.folders = userData.folders.filter(f => f.id !== folderId);
        userData.words = userData.words.filter(w => w.folderId !== folderId);
        saveUserData();
        renderFolders();
        renderDashboard();
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
            <button onclick="renderFolders()" class="text-blue-500 hover:text-blue-700">← Back to Folders</button>
            <h3 class="text-lg font-semibold mt-2">${folder.name} (${folderWords.length} words)</h3>
        </div>
        
        <div class="mb-4">
            <button 
                onclick="openWordModal(${folderId})" 
                class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
                Add New Word
            </button>
        </div>
        
        <div class="space-y-2">
            ${folderWords.length === 0 ? 
                '<p class="text-gray-500">No words in this folder yet.</p>' :
                folderWords.map(word => {
                    const today = new Date().toISOString().split('T')[0];
                    const isDue = word.nextReviewDate <= today;
                    const daysSinceLastReview = word.lastReviewDate 
                        ? getDaysBetween(word.lastReviewDate, today)
                        : getDaysBetween(word.createdDate, today);
                    const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
                    const retentionPercentage = Math.round(retentionScore * 100);
                    
                    return `
                        <div class="p-3 border border-gray-200 rounded-md ${isDue ? 'bg-yellow-50' : 'bg-gray-50'}">
                            <div class="flex justify-between items-start">
                                <div class="flex-1">
                                    <div class="font-medium">${word.word}</div>
                                    <div class="text-sm text-gray-600 mt-1">${word.definition}</div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        Difficulty: ${word.difficulty} | 
                                        Reviews: ${word.reviewCount} | 
                                        Retention: ${retentionPercentage}% |
                                        Next: ${word.nextReviewDate}
                                    </div>
                                </div>
                                <div class="flex gap-2 ml-4">
                                    <button 
                                        onclick="editWord(${word.id})" 
                                        class="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                    >
                                        Edit
                                    </button>
                                    <button 
                                        onclick="deleteWord(${word.id})" 
                                        class="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')
            }
        </div>
    `;
}

// Word Management
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
        title.textContent = 'Edit Word';
        wordInput.value = word.word;
        definitionInput.value = word.definition;
        difficultySelect.value = word.difficulty;
    } else {
        title.textContent = 'Add New Word';
        wordInput.value = '';
        definitionInput.value = '';
        difficultySelect.value = 'medium';
    }
    
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
    const difficulty = document.getElementById('wordDifficultySelect').value;
    
    if (!word || !definition) {
        alert('Please enter both word and definition');
        return;
    }
    
    if (currentWordId) {
        // Edit existing word
        const wordObj = userData.words.find(w => w.id === currentWordId);
        wordObj.word = word;
        wordObj.definition = definition;
        wordObj.difficulty = difficulty;
    } else {
        // Add new word
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
        
        // Update folder word count
        const folder = userData.folders.find(f => f.id === currentFolderId);
        if (folder) {
            folder.wordCount = userData.words.filter(w => w.folderId === currentFolderId).length;
        }
    }
    
    saveUserData();
    closeWordModal();
    openFolder(currentFolderId);
    renderDashboard();
}

function editWord(wordId) {
    const word = userData.words.find(w => w.id === wordId);
    if (word) {
        openWordModal(word.folderId, wordId);
    }
}

function deleteWord(wordId) {
    if (confirm('Are you sure you want to delete this word?')) {
        const word = userData.words.find(w => w.id === wordId);
        userData.words = userData.words.filter(w => w.id !== wordId);
        
        if (word) {
            userData.stats.totalWords--;
            if (word.mastered) {
                userData.stats.masteredWords--;
            }
            
            // Update folder word count
            const folder = userData.folders.find(f => f.id === word.folderId);
            if (folder) {
                folder.wordCount = userData.words.filter(w => w.folderId === word.folderId).length;
            }
        }
        
        saveUserData();
        openFolder(currentFolderId);
        renderDashboard();
    }
}
// Quiz System
function startQuiz() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    if (dueWords.length === 0) {
        document.getElementById('quizArea').innerHTML = `
            <div class="text-center py-8">
                <h3 class="text-lg font-semibold mb-4">No Reviews Due!</h3>
                <p class="text-gray-600">Great job! Come back later for more reviews.</p>
            </div>
        `;
        return;
    }
    
    currentQuiz = [...dueWords].sort(() => Math.random() - 0.5); // Shuffle
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
                <span class="text-sm text-gray-500">Question ${currentQuizIndex + 1} of ${currentQuiz.length}</span>
                <div class="text-xs text-gray-400">${folder ? folder.name : 'Unknown Folder'}</div>
            </div>
            
            <div class="mb-8">
                <h3 class="text-2xl font-bold mb-4">${word.word}</h3>
                <p class="text-gray-600">What does this mean?</p>
            </div>
            
            <div class="mb-6">
                <textarea 
                    id="quizAnswer" 
                    placeholder="Enter your answer..." 
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                ></textarea>
            </div>
            
            <button 
                onclick="checkAnswer()" 
                class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
                Check Answer
            </button>
        </div>
    `;
    
    document.getElementById('quizAnswer').focus();
}

function checkAnswer() {
    const userAnswer = document.getElementById('quizAnswer').value.trim();
    const word = currentQuiz[currentQuizIndex];
    const correctAnswer = word.definition;
    
    // Simple similarity check
    const similarity = calculateSimilarity(userAnswer.toLowerCase(), correctAnswer.toLowerCase());
    const isCorrect = similarity > 0.6 || userAnswer.toLowerCase().includes(correctAnswer.toLowerCase()) || correctAnswer.toLowerCase().includes(userAnswer.toLowerCase());
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center">
            <div class="mb-4">
                <span class="text-sm text-gray-500">Question ${currentQuizIndex + 1} of ${currentQuiz.length}</span>
            </div>
            
            <div class="mb-6">
                <h3 class="text-2xl font-bold mb-4">${word.word}</h3>
                <div class="text-lg ${isCorrect ? 'text-green-600' : 'text-red-600'} mb-4">
                    ${isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                </div>
                
                <div class="bg-gray-50 p-4 rounded-md mb-4">
                    <div class="text-sm text-gray-600 mb-2">Correct Answer:</div>
                    <div class="font-medium">${correctAnswer}</div>
                </div>
                
                ${!isCorrect ? `
                    <div class="bg-red-50 p-4 rounded-md mb-4">
                        <div class="text-sm text-gray-600 mb-2">Your Answer:</div>
                        <div>${userAnswer}</div>
                    </div>
                ` : ''}
            </div>
            
            <div class="flex gap-4 justify-center">
                <button 
                    onclick="rateAnswer('easy')" 
                    class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Easy
                </button>
                <button 
                    onclick="rateAnswer('medium')" 
                    class="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
                >
                    Medium
                </button>
                <button 
                    onclick="rateAnswer('hard')" 
                    class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                    Hard
                </button>
            </div>
            
            <p class="text-sm text-gray-500 mt-4">How difficult was this question for you?</p>
        </div>
    `;
    
    if (isCorrect) {
        quizScore++;
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
    
    document.getElementById('quizArea').innerHTML = `
        <div class="text-center py-8">
            <h3 class="text-2xl font-bold mb-4">Quiz Complete!</h3>
            <div class="text-4xl font-bold text-blue-600 mb-4">${quizScore}/${currentQuiz.length}</div>
            <div class="text-lg text-gray-600 mb-6">${percentage}% Correct</div>
            
            <button 
                onclick="renderQuizArea()" 
                class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
                Start New Quiz
            </button>
        </div>
    `;
    
    userData.stats.reviewsCompleted += currentQuiz.length;
    saveUserData();
    renderDashboard();
}

function reviewWord(wordId, userDifficulty) {
    const word = userData.words.find(w => w.id === wordId);
    if (!word) return;
    
    const today = new Date().toISOString().split('T')[0];
    word.lastReviewDate = today;
    word.reviewCount++;
    
    // Adjust interval based on user feedback
    let intervalMultiplier = 1;
    if (userDifficulty === 'easy') {
        intervalMultiplier = 1.5;
    } else if (userDifficulty === 'hard') {
        intervalMultiplier = 0.5;
    }
    
    const intervalIndex = Math.min(word.reviewCount - 1, reviewIntervals.length - 1);
    const baseInterval = reviewIntervals[intervalIndex];
    const adjustedInterval = Math.round(baseInterval * intervalMultiplier);
    
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + adjustedInterval);
    word.nextReviewDate = nextReviewDate.toISOString().split('T')[0];
    
    // Mark as mastered if reviewed many times with good performance
    if (word.reviewCount >= 5 && userDifficulty === 'easy' && !word.mastered) {
        word.mastered = true;
        userData.stats.masteredWords++;
    }
    
    saveUserData();
}
// Utility Functions
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
    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }
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

// Notification System
function checkNotifications() {
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    if (dueWords.length > 0) {
        showNotification(`You have ${dueWords.length} word(s) due for review!`, 'info');
        
        // Request notification permission and show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Spaced Repetition Reminder', {
                body: `You have ${dueWords.length} word(s) due for review!`,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>'
            });
        } else if ('Notification' in window && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
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
        <div class="notification p-4 border rounded-md ${colors[type]} mb-4">
            <div class="flex justify-between items-center">
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="text-gray-500 hover:text-gray-700">×</button>
            </div>
        </div>
    `;
}

// Rendering Functions
function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    const dueWords = userData.words.filter(word => word.nextReviewDate <= today);
    
    // Update stats
    document.getElementById('totalWords').textContent = userData.stats.totalWords;
    document.getElementById('dueToday').textContent = dueWords.length;
    document.getElementById('masteredWords').textContent = userData.stats.masteredWords;
    
    // Render reviews due
    const reviewsList = document.getElementById('reviewsList');
    if (dueWords.length === 0) {
        reviewsList.innerHTML = '<p class="text-gray-500">No reviews due today! 🎉</p>';
    } else {
        reviewsList.innerHTML = `
            <div class="mb-4">
                <button 
                    onclick="showTab('quiz'); startQuiz();" 
                    class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Start Quiz (${dueWords.length} words)
                </button>
            </div>
            ${dueWords.slice(0, 5).map(word => {
                const folder = userData.folders.find(f => f.id === word.folderId);
                const daysSinceLastReview = word.lastReviewDate 
                    ? getDaysBetween(word.lastReviewDate, today)
                    : getDaysBetween(word.createdDate, today);
                const retentionScore = calculateRetentionScore(daysSinceLastReview, word.difficulty);
                const retentionPercentage = Math.round(retentionScore * 100);
                
                return `
                    <div class="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                        <div class="flex justify-between items-center">
                            <div>
                                <span class="font-medium">${word.word}</span>
                                <span class="text-sm text-gray-600 ml-2">(${folder ? folder.name : 'Unknown'})</span>
                                <span class="text-sm text-red-600 ml-2">Retention: ${retentionPercentage}%</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
            ${dueWords.length > 5 ? `<p class="text-sm text-gray-500 mt-2">...and ${dueWords.length - 5} more</p>` : ''}
        `;
    }
}

function renderFolders() {
    currentFolderId = null;
    const foldersList = document.getElementById('foldersList');
    
    if (userData.folders.length === 0) {
        foldersList.innerHTML = '<p class="text-gray-500">No folders created yet.</p>';
        return;
    }
    
    foldersList.innerHTML = userData.folders.map(folder => {
        const wordCount = userData.words.filter(w => w.folderId === folder.id).length;
        const today = new Date().toISOString().split('T')[0];
        const dueCount = userData.words.filter(w => w.folderId === folder.id && w.nextReviewDate <= today).length;
        
        return `
            <div class="p-4 border border-gray-200 rounded-md hover:bg-gray-50 cursor-pointer" onclick="openFolder(${folder.id})">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="font-medium">${folder.name}</h3>
                        <p class="text-sm text-gray-600">${wordCount} words</p>
                        ${dueCount > 0 ? `<p class="text-sm text-red-600">${dueCount} due for review</p>` : ''}
                    </div>
                    <div class="flex gap-2">
                        <button 
                            onclick="event.stopPropagation(); openFolder(${folder.id})" 
                            class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                        >
                            Open
                        </button>
                        <button 
                            onclick="event.stopPropagation(); deleteFolder(${folder.id})" 
                            class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                            Delete
                        </button>
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
                <h3 class="text-lg font-semibold mb-4">No Reviews Due!</h3>
                <p class="text-gray-600 mb-4">Great job! All your words are up to date.</p>
                <button 
                    onclick="showTab('folders')" 
                    class="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                    Add More Words
                </button>
            </div>
        `;
    } else {
        document.getElementById('quizArea').innerHTML = `
            <div class="text-center py-8">
                <h3 class="text-lg font-semibold mb-4">Ready for Review!</h3>
                <p class="text-gray-600 mb-6">You have ${dueWords.length} word(s) ready for review.</p>
                <button 
                    onclick="startQuiz()" 
                    class="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                    Start Quiz
                </button>
            </div>
        `;
    }
}

function renderChart() {
    const ctx = document.getElementById('forgettingCurveChart').getContext('2d');
    
    if (window.forgettingChart) {
        window.forgettingChart.destroy();
    }
    
    if (userData.folders.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('No data to display', ctx.canvas.width / 2, ctx.canvas.height / 2);
        return;
    }
    
    const datasets = userData.folders.map((folder, index) => {
        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];
        const color = colors[index % colors.length];
        
        const folderWords = userData.words.filter(w => w.folderId === folder.id);
        if (folderWords.length === 0) return null;
        
        // Calculate average retention for this folder
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
            label: `${folder.name} (${folderWords.length} words)`,
            data: dataPoints,
            borderColor: color,
            backgroundColor: color + '20',
            fill: false,
            tension: 0.4
        };
    }).filter(dataset => dataset !== null);
    
    window.forgettingChart = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Days Since Last Review'
                    },
                    min: 0,
                    max: 30
                },
                y: {
                    title: {
                        display: true,
                        text: 'Average Retention (%)'
                    },
                    min: 0,
                    max: 100
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Forgetting Curve by Folder'
                },
                legend: {
                    display: true
                }
            }
        }
    });
}

function renderAll() {
    renderDashboard();
    renderFolders();
    renderQuizArea();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('usernameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            login();
        }
    });

    document.getElementById('folderNameInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            createFolder();
        }
    });
});

// Check for notifications periodically
setInterval(checkNotifications, 60000); // Check every minute

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}