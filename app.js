const STORAGE_KEY = 'flashcard-study-v1';

let decks = [];
let currentDeckId = null;
let currentCardIndex = 0;
let showAnswer = false;

function createId() {
  return 'deck-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}

function getInitialDecks() {
  return [
    {
      id: createId(),
      name: 'Basic Theory',
      createdAt: new Date().toISOString(),
      cards: [
        {
          question: 'What is the definition of learning?',
          answer: 'Learning is the process of acquiring new knowledge, skills, and experience.',
          status: ''
        },
        {
          question: 'Why is it important to review regularly?',
          answer: 'Because regular review reinforces memory and improves long-term retention.',
          status: ''
        }
      ]
    }
  ];
}

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      decks = getInitialDecks();
      currentDeckId = decks[0].id;
      return;
    }

    const parsed = JSON.parse(saved);
    decks = parsed.decks || getInitialDecks();
    currentDeckId = parsed.currentDeckId || decks[0]?.id || null;
  } catch (error) {
    decks = getInitialDecks();
    currentDeckId = decks[0].id;
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ decks, currentDeckId }));
}

function getCurrentDeck() {
  return decks.find((deck) => deck.id === currentDeckId) || null;
}

function showSection(sectionId) {
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active-panel', panel.id === sectionId);
  });

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.target === sectionId);
  });

  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function addCardRow(values = { question: '', answer: '' }) {
  const container = document.getElementById('cardInputs');
  const row = document.createElement('div');
  row.className = 'card-row';
  row.innerHTML = `
    <label>
      Question
      <input type="text" class="question-input" value="${values.question.replace(/"/g, '&quot;')}" placeholder="Enter the question" />
    </label>
    <label>
      Answer
      <input type="text" class="answer-input" value="${values.answer.replace(/"/g, '&quot;')}" placeholder="Enter the answer" />
    </label>
    <button type="button" class="remove-card btn secondary">Delete</button>
  `;
  container.appendChild(row);
}

function resetCreateForm() {
  document.getElementById('deckForm').reset();
  document.getElementById('cardInputs').innerHTML = '';
  addCardRow();
  document.getElementById('formMessage').textContent = '';
}

function bindEvents() {
  document.getElementById('deckForm').addEventListener('submit', handleSaveDeck);
  document.getElementById('addCardBtn').addEventListener('click', () => addCardRow());
  document.getElementById('cardInputs').addEventListener('click', (event) => {
    if (event.target.classList.contains('remove-card')) {
      event.target.closest('.card-row').remove();
    }
  });

  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => showSection(button.dataset.target));
  });

  document.getElementById('libraryList').addEventListener('click', handleLibraryClick);
  document.getElementById('showAnswerBtn').addEventListener('click', () => {
    showAnswer = true;
    renderStudy();
  });
  document.getElementById('rememberBtn').addEventListener('click', () => markCurrentCard('remembered'));
  document.getElementById('reviewBtn').addEventListener('click', () => markCurrentCard('review'));
  document.getElementById('nextBtn').addEventListener('click', () => navigateCard(1));
  document.getElementById('backBtn').addEventListener('click', () => navigateCard(-1));
  document.getElementById('clearAllBtn').addEventListener('click', clearAllDecks);
}

function handleSaveDeck(event) {
  event.preventDefault();

  const name = document.getElementById('deckName').value.trim();
  const cardRows = Array.from(document.querySelectorAll('.card-row'));
  const cards = cardRows
    .map((row) => {
      const question = row.querySelector('.question-input').value.trim();
      const answer = row.querySelector('.answer-input').value.trim();
      return question || answer ? { question, answer, status: '' } : null;
    })
    .filter(Boolean);

  if (!name || cards.length === 0) {
    showFormMessage('Please enter a deck name and at least one card.', 'error');
    return;
  }

  const newDeck = {
    id: createId(),
    name,
    createdAt: new Date().toISOString(),
    cards
  };

  decks.unshift(newDeck);
  currentDeckId = newDeck.id;
  currentCardIndex = 0;
  showAnswer = false;
  saveData();
  render();
  resetCreateForm();
  showFormMessage(`Deck "${name}" created successfully.`, 'success');
  showSection('librarySection');
}

function showFormMessage(message, type) {
  const formMessage = document.getElementById('formMessage');
  formMessage.textContent = message;
  formMessage.className = `form-message ${type}`;
}

function handleLibraryClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const deckId = button.dataset.id;
  if (button.dataset.action === 'select') {
    currentDeckId = deckId;
    currentCardIndex = 0;
    showAnswer = false;
    saveData();
    renderStudy();
    showSection('studySection');
  }

  if (button.dataset.action === 'delete') {
    decks = decks.filter((deck) => deck.id !== deckId);
    if (currentDeckId === deckId) {
      currentDeckId = decks[0]?.id || null;
      currentCardIndex = 0;
      showAnswer = false;
    }
    saveData();
    render();
  }
}

function clearAllDecks() {
  if (!decks.length) return;
  if (!window.confirm('Are you sure you want to delete all flashcard decks?')) return;

  decks = [];
  currentDeckId = null;
  currentCardIndex = 0;
  showAnswer = false;
  saveData();
  render();
}

function navigateCard(direction) {
  const deck = getCurrentDeck();
  if (!deck || !deck.cards.length) return;

  const nextIndex = currentCardIndex + direction;
  if (nextIndex < 0 || nextIndex >= deck.cards.length) return;

  currentCardIndex = nextIndex;
  showAnswer = false;
  renderStudy();
}

function markCurrentCard(status) {
  const deck = getCurrentDeck();
  if (!deck || !deck.cards.length) return;

  deck.cards[currentCardIndex].status = status;
  saveData();

  if (currentCardIndex < deck.cards.length - 1) {
    currentCardIndex += 1;
    showAnswer = false;
  }

  renderStudy();
}

function renderHero() {
  const heroStats = document.getElementById('heroStats');
  const totalDecks = decks.length;
  const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
  const selectedDeck = getCurrentDeck();

  heroStats.innerHTML = `
    <div class="stat-card">
      <strong>${totalDecks}</strong>
      <span>Decks</span>
    </div>
    <div class="stat-card">
      <strong>${totalCards}</strong>
      <span>Total Cards</span>
    </div>
    <div class="stat-card">
      <strong>${selectedDeck ? selectedDeck.name : 'None selected'}</strong>
      <span>Currently Studying</span>
    </div>
  `;
}

function renderLibrary() {
  const libraryList = document.getElementById('libraryList');
  if (!decks.length) {
    libraryList.innerHTML = '<p class="empty-state">No flashcard decks yet. Create your first one.</p>';
    return;
  }

  libraryList.innerHTML = decks
    .map((deck) => {
      const remembered = deck.cards.filter((card) => card.status === 'remembered').length;
      const review = deck.cards.filter((card) => card.status === 'review').length;
      const isActive = currentDeckId === deck.id;
      return `
        <div class="deck-item ${isActive ? 'active-deck' : ''}">
          <div>
            <strong>${deck.name}</strong>
            <p>${deck.cards.length} cards • Remembered ${remembered} • Need review ${review}</p>
          </div>
          <div class="deck-actions">
            <button class="btn" data-action="select" data-id="${deck.id}">Study</button>
            <button class="btn secondary" data-action="delete" data-id="${deck.id}">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');
}

function renderStudy() {
  const studyCard = document.getElementById('studyCard');
  const studyStatus = document.getElementById('studyStatus');
  const studySummary = document.getElementById('studySummary');
  const deck = getCurrentDeck();

  if (!deck || !deck.cards.length) {
    studyCard.innerHTML = '<p class="empty-state">No deck to study yet. Create or select a flashcard deck.</p>';
    studyStatus.innerHTML = '';
    studySummary.innerHTML = '';
    return;
  }

  const card = deck.cards[currentCardIndex];
  if (!card) {
    studyCard.innerHTML = '<p class="empty-state">This deck has no cards yet.</p>';
    studyStatus.innerHTML = '';
    studySummary.innerHTML = '';
    return;
  }

  const rememberedCount = deck.cards.filter((item) => item.status === 'remembered').length;
  const reviewCount = deck.cards.filter((item) => item.status === 'review').length;
  const currentNumber = currentCardIndex + 1;

  studyStatus.innerHTML = `
    <div class="study-meta">
      <span>Studying: <strong>${deck.name}</strong></span>
      <span>Card ${currentNumber}/${deck.cards.length}</span>
    </div>
  `;

  studyCard.innerHTML = `
    <div class="flashcard-content">
      <p class="label">Question</p>
      <p class="question">${card.question}</p>
      ${showAnswer ? `<p class="label">Answer</p><p class="answer">${card.answer}</p>` : '<p class="hint">Click "Show Answer" to reveal the answer.</p>'}
    </div>
    <div class="status-badges">
      <span class="badge">Remembered: ${rememberedCount}</span>
      <span class="badge">Need Review: ${reviewCount}</span>
    </div>
  `;

  const likeIndicator = document.getElementById('likeIndicator');
  likeIndicator.innerHTML = card.status === 'remembered'
    ? '<button class="like-btn" type="button">💗 Like</button>'
    : '';

  studySummary.innerHTML = `
    <div class="summary-box">
      <p><strong>Progress:</strong> ${rememberedCount + reviewCount}/${deck.cards.length} cards marked</p>
      <p><strong>Remembered:</strong> ${rememberedCount}</p>
      <p><strong>Need Review:</strong> ${reviewCount}</p>
    </div>
  `;
}

function render() {
  renderHero();
  renderLibrary();
  renderStudy();
  resetCreateForm();
}

function init() {
  loadData();
  bindEvents();
  addCardRow();
  render();
  showSection('createSection');
}

document.addEventListener('DOMContentLoaded', init);
