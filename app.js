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
      name: 'Lý thuyết cơ bản',
      createdAt: new Date().toISOString(),
      cards: [
        {
          question: 'Định nghĩa của học tập là gì?',
          answer: 'Học tập là quá trình tiếp thu kiến thức, kỹ năng và kinh nghiệm mới.',
          status: ''
        },
        {
          question: 'Tại sao cần ôn tập thường xuyên?',
          answer: 'Vì việc ôn tập giúp củng cố trí nhớ và tăng khả năng ghi nhớ lâu dài.',
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
      Câu hỏi
      <input type="text" class="question-input" value="${values.question.replace(/"/g, '&quot;')}" placeholder="Nhập câu hỏi" />
    </label>
    <label>
      Câu trả lời
      <input type="text" class="answer-input" value="${values.answer.replace(/"/g, '&quot;')}" placeholder="Nhập câu trả lời" />
    </label>
    <button type="button" class="remove-card btn secondary">Xóa</button>
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
    showFormMessage('Vui lòng nhập tên bộ và ít nhất một thẻ.', 'error');
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
  showFormMessage(`Đã tạo bộ "${name}" thành công.`, 'success');
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
  if (!window.confirm('Bạn có chắc muốn xóa tất cả bộ flashcard?')) return;

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
      <span>Bộ thẻ</span>
    </div>
    <div class="stat-card">
      <strong>${totalCards}</strong>
      <span>Tổng thẻ</span>
    </div>
    <div class="stat-card">
      <strong>${selectedDeck ? selectedDeck.name : 'Chưa chọn'}</strong>
      <span>Đang học</span>
    </div>
  `;
}

function renderLibrary() {
  const libraryList = document.getElementById('libraryList');
  if (!decks.length) {
    libraryList.innerHTML = '<p class="empty-state">Chưa có bộ flashcard nào. Hãy tạo bộ đầu tiên.</p>';
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
            <p>${deck.cards.length} thẻ • Đã nhớ ${remembered} • Cần ôn ${review}</p>
          </div>
          <div class="deck-actions">
            <button class="btn" data-action="select" data-id="${deck.id}">Học</button>
            <button class="btn secondary" data-action="delete" data-id="${deck.id}">Xóa</button>
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
    studyCard.innerHTML = '<p class="empty-state">Chưa có bộ thẻ nào để học. Hãy tạo hoặc chọn một bộ flashcard.</p>';
    studyStatus.innerHTML = '';
    studySummary.innerHTML = '';
    return;
  }

  const card = deck.cards[currentCardIndex];
  if (!card) {
    studyCard.innerHTML = '<p class="empty-state">Bộ thẻ này chưa có thẻ nào.</p>';
    studyStatus.innerHTML = '';
    studySummary.innerHTML = '';
    return;
  }

  const rememberedCount = deck.cards.filter((item) => item.status === 'remembered').length;
  const reviewCount = deck.cards.filter((item) => item.status === 'review').length;
  const currentNumber = currentCardIndex + 1;

  studyStatus.innerHTML = `
    <div class="study-meta">
      <span>Đang học: <strong>${deck.name}</strong></span>
      <span>Thẻ ${currentNumber}/${deck.cards.length}</span>
    </div>
  `;

  studyCard.innerHTML = `
    <div class="flashcard-content">
      <p class="label">Câu hỏi</p>
      <p class="question">${card.question}</p>
      ${showAnswer ? `<p class="label">Câu trả lời</p><p class="answer">${card.answer}</p>` : '<p class="hint">Nhấn “Xem đáp án” để xem câu trả lời.</p>'}
    </div>
    <div class="status-badges">
      <span class="badge">Đã nhớ: ${rememberedCount}</span>
      <span class="badge">Cần ôn: ${reviewCount}</span>
    </div>
  `;

  const likeIndicator = document.getElementById('likeIndicator');
  likeIndicator.innerHTML = card.status === 'remembered'
    ? '<button class="like-btn" type="button">💗 Like</button>'
    : '';

  studySummary.innerHTML = `
    <div class="summary-box">
      <p><strong>Tiến độ:</strong> ${rememberedCount + reviewCount}/${deck.cards.length} thẻ đã đánh dấu</p>
      <p><strong>Đã nhớ:</strong> ${rememberedCount}</p>
      <p><strong>Cần ôn lại:</strong> ${reviewCount}</p>
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
