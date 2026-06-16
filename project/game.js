// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let board = [];
let cardElements = new Map();
let lockBoard = false;
let firstCardIndex = null;
let secondCardIndex = null;

let currentScore = 0;
let attempts = 0;
let currentDifficulty = "medium";

let cardThemeList = [];

// Конфигурация сложности
const gridConfig = {
    easy:   { rows: 2, cols: 3, totalPairs: 3 },   // 2x3 = 6 карт (3 пары)
    medium: { rows: 4, cols: 4, totalPairs: 8 },   // 4x4 = 16 карт (8 пар)
    hard:   { rows: 4, cols: 6, totalPairs: 12 }    // 4x6 = 24 карты (12 пар)
};

// DOM элементы
const boardContainer = document.getElementById("gameBoard");
const scoreSpan = document.getElementById("scoreValue");
const attemptsSpan = document.getElementById("attemptsValue");
const resetBtn = document.getElementById("resetGameBtn");
const difficultySelect = document.getElementById("difficultySelect");
const gameMessageDiv = document.getElementById("gameMessage");

// ========== ЗАГРУЗКА ТЕМ ИЗ JSON ==========
async function loadCardThemes() {
    try {
        const response = await fetch('cards.json');
        if (!response.ok) throw new Error("Ошибка загрузки JSON");
        const data = await response.json();
        cardThemeList = data.cardThemes;
        console.log("Темы загружены:", cardThemeList.length);
    } catch (err) {
        console.warn("Не удалось загрузить JSON, используем fallback темы");
        cardThemeList = ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🍎","🍒","⭐","🌙"];
    }
}

// ========== НОВАЯ ИГРА ==========
function initGame() {
    lockBoard = false;
    firstCardIndex = null;
    secondCardIndex = null;
    currentScore = 0;
    attempts = 0;
    updateStatsUI();
    
    const config = gridConfig[currentDifficulty];
    const totalPairs = config.totalPairs;
    
    const usedThemes = getRandomThemes(totalPairs);
    
    // Создаем массив карт (каждая пара дублируется)
    let cardsArray = [];
    for (let i = 0; i < totalPairs; i++) {
        cardsArray.push({ id: i*2, value: usedThemes[i], flipped: false, matched: false });
        cardsArray.push({ id: i*2+1, value: usedThemes[i], flipped: false, matched: false });
    }
    
    // Перемешивание
    for (let i = cardsArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cardsArray[i], cardsArray[j]] = [cardsArray[j], cardsArray[i]];
    }
    
    board = cardsArray;
    renderBoard();
    gameMessageDiv.innerHTML = "🎯 Игра началась! Найди все пары! 🎯";
}

// Выбор случайных тем
function getRandomThemes(count) {
    if (cardThemeList.length < count) {
        let fallback = [...cardThemeList];
        while(fallback.length < count) fallback.push("❓");
        return fallback.slice(0, count);
    }
    const shuffledAll = [...cardThemeList];
    for (let i = shuffledAll.length - 1; i > 0; i--) {
        const rand = Math.floor(Math.random() * (i + 1));
        [shuffledAll[i], shuffledAll[rand]] = [shuffledAll[rand], shuffledAll[i]];
    }
    return shuffledAll.slice(0, count);
}

// ========== ОТРИСОВКА СЕТКИ (НОРМАЛЬНАЯ, НЕ СТОЛБИКОМ) ==========
function renderBoard() {
    boardContainer.innerHTML = "";
    cardElements.clear();
    
    const config = gridConfig[currentDifficulty];
    // Применяем правильный класс сетки
    boardContainer.className = `game-board grid-${currentDifficulty}`;
    
    board.forEach((card, idx) => {
        const cardDiv = document.createElement("div");
        cardDiv.classList.add("card");
        
        if (card.flipped || card.matched) {
            cardDiv.classList.add("flipped");
            cardDiv.textContent = card.value;
        } else {
            cardDiv.textContent = "❓";
        }
        
        if (card.matched) {
            cardDiv.classList.add("matched");
        }
        
        cardDiv.addEventListener("click", () => onCardClick(idx));
        boardContainer.appendChild(cardDiv);
        cardElements.set(cardDiv, idx);
    });
}

function updateStatsUI() {
    scoreSpan.textContent = currentScore;
    attemptsSpan.textContent = attempts;
}

function updateSingleCardUI(index) {
    for (let [element, idx] of cardElements.entries()) {
        if (idx === index) {
            const cardData = board[index];
            if (cardData.flipped || cardData.matched) {
                element.textContent = cardData.value;
                element.classList.add("flipped");
            } else {
                element.textContent = "❓";
                element.classList.remove("flipped");
            }
            if (cardData.matched) {
                element.classList.add("matched");
            } else {
                element.classList.remove("matched");
            }
            break;
        }
    }
}

// ========== ОБРАБОТКА КЛИКА ==========
function onCardClick(clickedIndex) {
    if (lockBoard) return;
    const card = board[clickedIndex];
    if (card.matched) return;
    if (card.flipped) return;
    if (firstCardIndex !== null && secondCardIndex !== null) return;
    
    card.flipped = true;
    updateSingleCardUI(clickedIndex);
    
    if (firstCardIndex === null) {
        firstCardIndex = clickedIndex;
    } else if (secondCardIndex === null && firstCardIndex !== clickedIndex) {
        secondCardIndex = clickedIndex;
        attempts++;
        updateStatsUI();
        checkMatch();
    }
}

// ========== ПРОВЕРКА ПАРЫ ==========
function checkMatch() {
    const card1 = board[firstCardIndex];
    const card2 = board[secondCardIndex];
    
    if (card1.value === card2.value) {
        // Пара найдена!
        card1.matched = true;
        card2.matched = true;
        card1.flipped = true;
        card2.flipped = true;
        
        currentScore += 10;
        updateStatsUI();
        
        updateSingleCardUI(firstCardIndex);
        updateSingleCardUI(secondCardIndex);
        
        firstCardIndex = null;
        secondCardIndex = null;
        
        checkWin();
    } else {
        // Не совпали
        lockBoard = true;
        
        addErrorFlash(firstCardIndex);
        addErrorFlash(secondCardIndex);
        
        setTimeout(() => {
            board[firstCardIndex].flipped = false;
            board[secondCardIndex].flipped = false;
            updateSingleCardUI(firstCardIndex);
            updateSingleCardUI(secondCardIndex);
            
            firstCardIndex = null;
            secondCardIndex = null;
            lockBoard = false;
        }, 800);
    }
}

function addErrorFlash(cardIndex) {
    for (let [element, idx] of cardElements.entries()) {
        if (idx === cardIndex) {
            element.classList.add("error-flash");
            setTimeout(() => element.classList.remove("error-flash"), 400);
            break;
        }
    }
}

function checkWin() {
    const allMatched = board.every(card => card.matched === true);
    if (allMatched) {
        gameMessageDiv.innerHTML = `🎉 ПОБЕДА! 🎉 Очки: ${currentScore}, Попытки: ${attempts}. Нажмите "Новая игра" чтобы сыграть ещё! 🎉`;
        lockBoard = true;
    } else {
        gameMessageDiv.innerHTML = "🔍 Ищем пары... Удачи!";
    }
}

function resetGame() {
    lockBoard = false;
    firstCardIndex = null;
    secondCardIndex = null;
    initGame();
}

function changeDifficulty() {
    currentDifficulty = difficultySelect.value;
    resetGame();
}

// ========== ЗАПУСК ==========
async function startGame() {
    await loadCardThemes();
    initGame();
    
    resetBtn.addEventListener("click", resetGame);
    difficultySelect.addEventListener("change", changeDifficulty);
}

startGame();