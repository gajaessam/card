/* ═══════════════════════════════════════════════
   짝꿍찾기 메모리 게임 — JavaScript
   모든 게임 로직, UI 빌드, 이벤트 처리
═══════════════════════════════════════════════ */

// ────────────────────────────────────────────────
// 1. 전역 상태
// ────────────────────────────────────────────────
let gameState = {
  pairs: 6,          // 카드 쌍 수 (슬라이더)
  useLucky: true,    // 럭키 카드 사용 여부
  useChaos: true,    // 혼돈 카드 사용 여부
  cards: [],         // { id, term, imageDataUrl } 설정된 카드 정보
  board: [],         // 게임 보드의 카드 셀 목록 (섞인 후)
  openCards: [],     // 현재 열린 카드 (최대 2개)
  matchedCount: 0,   // 맞춘 쌍 수
  attempts: 0,       // 시도 횟수 (일반)
  blocked: false,    // 잠깐 클릭 막기 (틀렸을 때)
  luckyUsed: false,  // 럭키카드 이미 사용됨
  chaosUsed: false,  // 혼돈카드 이미 사용됨
  showSpecialInMemorize: false, // 암기타임에서 특수카드 공개 여부
  memorizeSeconds: 3, // 암기타임 시간(초)
  showImgLabel: true, // 사진 카드 키워드 표시 여부
};

// ────────────────────────────────────────────────
// 2. DOM 초기화
// ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initSlider();
  initDropZone();
  buildCardList(gameState.pairs);
  initBulkUpload();
  initTimeControls();
});

// ─── 슬라이더 ───
function initSlider() {
  const slider = document.getElementById('pair-slider');
  const display = document.getElementById('pair-display');
  const total = document.getElementById('total-cards');

  slider.addEventListener('input', () => {
    const v = parseInt(slider.value);
    gameState.pairs = v;
    display.textContent = `${v}쌍`;
    total.textContent = v * 2;
    buildCardList(v);
  });
}

// ─── 카드 입력 리스트 ───
function buildCardList(count) {
  const list = document.getElementById('card-list');
  // 기존 카드보다 줄어든 경우 잘라냄, 늘어난 경우 추가
  const existing = list.querySelectorAll('.card-row');

  // 늘리기
  for (let i = existing.length; i < count; i++) {
    list.appendChild(createCardRow(i + 1));
  }
  // 줄이기
  for (let i = existing.length - 1; i >= count; i--) {
    existing[i].remove();
  }

  // gameState.cards 동기화
  syncCardsFromDOM();
}

function createCardRow(num) {
  const row = document.createElement('div');
  row.className = 'card-row';
  row.dataset.num = num;

  const badge = document.createElement('div');
  badge.className = 'card-num-badge';
  badge.textContent = num;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'card-term-input';
  input.placeholder = `용어 ${num} 입력`;
  input.id = `term-${num}`;
  input.addEventListener('input', () => {
    syncCardsFromDOM();
    row.classList.toggle('filled', !!(input.value.trim() || getPreviewImg(row)));
  });

  const imgBtn = document.createElement('button');
  imgBtn.className = 'card-img-btn';
  imgBtn.textContent = '📷 이미지';
  imgBtn.type = 'button';

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.style.display = 'none';
  fileInput.id = `file-${num}`;

  imgBtn.addEventListener('click', () => fileInput.click());

  const preview = document.createElement('div');
  preview.className = 'card-mini-preview';
  preview.textContent = '🖼';
  preview.id = `preview-${num}`;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      preview.innerHTML = `<img src="${url}" alt="미리보기"/>`;
      imgBtn.textContent = '✅ 변경';
      imgBtn.classList.add('has-img');
      // 파일명으로 용어 자동 채우기 (입력값 없을 때)
      if (!input.value.trim()) {
        const name = file.name.replace(/\.[^/.]+$/, '');
        input.value = name;
      }
      row.classList.add('filled');
      syncCardsFromDOM();
    };
    reader.readAsDataURL(file);
  });

  row.appendChild(badge);
  row.appendChild(input);
  row.appendChild(imgBtn);
  row.appendChild(preview);
  row.appendChild(fileInput);
  return row;
}

function getPreviewImg(row) {
  const img = row.querySelector('.card-mini-preview img');
  return img ? img.src : null;
}

function syncCardsFromDOM() {
  const rows = document.querySelectorAll('.card-row');
  gameState.cards = Array.from(rows).map((row, i) => {
    const input = row.querySelector('.card-term-input');
    const img = row.querySelector('.card-mini-preview img');
    return {
      id: i + 1,
      term: input ? input.value.trim() : '',
      imageDataUrl: img ? img.src : null,
    };
  });
}

// ─── 일괄 업로드 ───
function initBulkUpload() {
  const fileInput = document.getElementById('bulk-upload');
  fileInput.addEventListener('change', () => {
    handleBulkFiles(fileInput.files);
  });
}

// ─── 암기 시간 +/- 스텝퍼 ───
function initTimeControls() {
  const display = document.getElementById('memorize-time-display');
  document.getElementById('time-minus').addEventListener('click', () => {
    let v = parseInt(display.textContent);
    if (v > 1) { v--; display.textContent = v; }
  });
  document.getElementById('time-plus').addEventListener('click', () => {
    let v = parseInt(display.textContent);
    if (v < 30) { v++; display.textContent = v; }
  });
}

function initDropZone() {
  const zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    handleBulkFiles(e.dataTransfer.files);
  });
}

function handleBulkFiles(files) {
  const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!imageFiles.length) return;

  // 슬라이더를 파일 수에 맞게 조정 (최대 15)
  const newCount = Math.min(Math.max(imageFiles.length, 2), 15);
  const slider = document.getElementById('pair-slider');
  slider.value = newCount;
  gameState.pairs = newCount;
  document.getElementById('pair-display').textContent = `${newCount}쌍`;
  document.getElementById('total-cards').textContent = newCount * 2;
  buildCardList(newCount);

  // 미리보기 영역
  const bulkPreview = document.getElementById('bulk-preview');
  bulkPreview.innerHTML = '';

  imageFiles.slice(0, newCount).forEach((file, i) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target.result;
      const rows = document.querySelectorAll('.card-row');
      if (!rows[i]) return;
      const row = rows[i];
      const input = row.querySelector('.card-term-input');
      const previewDiv = row.querySelector('.card-mini-preview');
      const imgBtn = row.querySelector('.card-img-btn');

      // 파일명 → 용어
      if (!input.value.trim()) {
        input.value = file.name.replace(/\.[^/.]+$/, '');
      }
      previewDiv.innerHTML = `<img src="${url}" alt="미리보기"/>`;
      imgBtn.textContent = '✅ 변경';
      imgBtn.classList.add('has-img');
      row.classList.add('filled');

      // 일괄 미리보기 썸네일
      const thumb = document.createElement('img');
      thumb.src = url;
      thumb.className = 'bulk-thumb';
      thumb.title = file.name;
      bulkPreview.appendChild(thumb);

      syncCardsFromDOM();
    };
    reader.readAsDataURL(file);
  });
}

// ────────────────────────────────────────────────
// 3. 게임 시작
// ────────────────────────────────────────────────
function startGame() {
  syncCardsFromDOM();

  // 유효성 검사: 최소 2쌍, 용어 입력 확인
  const validCards = gameState.cards.filter(c => c.term || c.imageDataUrl);
  if (validCards.length < 2) {
    showToast('❗ 최소 2개의 카드 정보를 입력해주세요!');
    return;
  }

  // 활성 카드 수가 슬라이더 값보다 적으면 경고
  const needed = gameState.pairs;
  const available = validCards.length;
  if (available < needed) {
    showToast(`❗ ${needed}쌍이 필요하지만 ${available}개만 입력됐어요. 슬라이더를 ${available} 이하로 낮추거나 더 입력해주세요.`);
    return;
  }

  // 게임 상태 리셋
  gameState.openCards = [];
  gameState.matchedCount = 0;
  gameState.attempts = 0;
  gameState.blocked = false;
  gameState.luckyUsed = false;
  gameState.chaosUsed = false;

  gameState.useLucky = document.getElementById('lucky-toggle').checked;
  gameState.useChaos = document.getElementById('chaos-toggle').checked;
  gameState.showSpecialInMemorize = document.getElementById('show-special-toggle').checked;
  gameState.showImgLabel = document.getElementById('show-img-label-toggle').checked;
  gameState.memorizeSeconds = parseInt(document.getElementById('memorize-time-display').textContent) || 3;

  updateDashboard();
  buildBoard();

  showScreen('screen-game');
  startMemorizePhase();
}

// ─── 보드 구성 ───
function buildBoard() {
  const board = document.getElementById('card-board');
  board.innerHTML = '';

  const selectedCards = gameState.cards.filter(c => c.term || c.imageDataUrl).slice(0, gameState.pairs);

  // 특수 카드 추가
  let specialCards = [];
  if (gameState.useLucky) {
    specialCards.push({ type: 'lucky', id: 'lucky' });
  }
  if (gameState.useChaos) {
    specialCards.push({ type: 'chaos', id: 'chaos' });
  }

  // 일반 카드 (텍스트 + 이미지 쌍)
  let cells = [];
  selectedCards.forEach((card, i) => {
    cells.push({ pairId: i, cellType: 'text', term: card.term, imageDataUrl: card.imageDataUrl });
    cells.push({ pairId: i, cellType: 'image', term: card.term, imageDataUrl: card.imageDataUrl });
  });

  // 특수 카드 삽입
  specialCards.forEach(sp => {
    cells.push({ pairId: null, cellType: sp.type });
  });

  // 셔플
  shuffle(cells);
  gameState.board = cells;

  // 최적 그리드 계산
  const total = cells.length;
  const { cols, rows } = bestGrid(total);

  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  board.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  // 카드 요소 생성
  cells.forEach((cell, idx) => {
    const cardEl = createGameCardEl(cell, idx);
    board.appendChild(cardEl);
  });

  // 남은 쌍 업데이트
  document.getElementById('remaining-count').textContent = selectedCards.length;
}

function bestGrid(n) {
  // n개 카드에 대해 가장 균형 잡힌 cols × rows를 찾음
  let best = { cols: n, rows: 1, diff: Infinity };
  const winW = window.innerWidth;
  const winH = window.innerHeight - 80; // 탑바 높이 제거 (80px로 수정)
  const ratio = winW / winH;

  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    if (cols * rows < n) continue;
    const gridRatio = cols / rows;
    const diff = Math.abs(gridRatio - ratio);
    if (diff < best.diff) {
      best = { cols, rows, diff };
    }
  }
  return best;
}

function createGameCardEl(cell, idx) {
  const el = document.createElement('div');
  el.className = 'game-card';
  el.dataset.idx = idx;
  el.id = `gcard-${idx}`;

  if (cell.cellType === 'lucky') {
    el.classList.add('special-lucky');
    el.innerHTML = `
      <div class="card-face card-back">
        <span class="card-back-number">${idx + 1}</span>
      </div>
      <div class="card-face card-front">
        <span class="lucky-icon">🍀</span>
        <span class="lucky-label">럭키카드<br/>자동 매칭!</span>
      </div>`;
    el.addEventListener('click', () => onLuckyClick(el));
    return el;
  }

  if (cell.cellType === 'chaos') {
    el.classList.add('special-chaos');
    el.innerHTML = `
      <div class="card-face card-back">
        <span class="card-back-number">${idx + 1}</span>
      </div>
      <div class="card-face card-front">
        <span class="chaos-icon">🌀</span>
        <span class="chaos-label">혼돈카드<br/>카드 뒤섞기!</span>
      </div>`;
    el.addEventListener('click', () => onChaosClick(el));
    return el;
  }

  // 일반 텍스트 카드
  if (cell.cellType === 'text') {
    el.innerHTML = `
      <div class="card-face card-back">
        <span class="card-back-number">${idx + 1}</span>
      </div>
      <div class="card-face card-front">
        <span class="card-term">${escapeHtml(cell.term || '?')}</span>
      </div>`;
  }

  // 일반 이미지 카드
  if (cell.cellType === 'image') {
    let imgHtml = '';
    if (cell.imageDataUrl) {
      imgHtml = `<img class="card-img" src="${cell.imageDataUrl}" alt="${escapeHtml(cell.term)}"/>`;
    } else {
      imgHtml = `<span style="font-size:2.5rem">🖼</span>`;
    }
    el.innerHTML = `
      <div class="card-face card-back">
        <span class="card-back-number">${idx + 1}</span>
      </div>
      <div class="card-face card-front">
        ${imgHtml}
        ${gameState.showImgLabel ? `<span class="card-img-label">${escapeHtml(cell.term || '')}</span>` : ''}
      </div>`;
  }

  el.addEventListener('click', () => onCardClick(el, idx));
  return el;
}

// ────────────────────────────────────────────────
// 4. 암기타임
// ────────────────────────────────────────────────
function startMemorizePhase() {
  const overlay = document.getElementById('memorize-overlay');
  const countdown = document.getElementById('memorize-countdown');
  overlay.classList.remove('hidden');

  // 보드 카드 앞면 공개
  revealAll(true);

  // 안내 문구 수정 (설정한 시간 반영)
  const sub = overlay.querySelector('.memorize-sub');
  if (sub) sub.textContent = `${gameState.memorizeSeconds}초 동안 카드를 확인하세요`;

  let count = gameState.memorizeSeconds;
  countdown.textContent = count;

  const timer = setInterval(() => {
    count--;
    if (count <= 0) {
      clearInterval(timer);
      overlay.classList.add('hidden');
      revealAll(false);
    } else {
      countdown.textContent = count;
    }
  }, 1000);
}

function revealAll(show) {
  document.querySelectorAll('.game-card').forEach(el => {
    // 특수 카드인 경우 '암기단계 특수카드 공개' 설정에 따름
    const isSpecial = el.classList.contains('special-lucky') || el.classList.contains('special-chaos');
    
    if (show) {
      if (!isSpecial || gameState.showSpecialInMemorize) {
        el.classList.add('revealed');
      }
    } else {
      el.classList.remove('revealed');
    }
  });
}

// ────────────────────────────────────────────────
// 5. 카드 클릭 로직
// ────────────────────────────────────────────────
function onCardClick(el, idx) {
  if (gameState.blocked) return;
  if (el.classList.contains('matched')) return;
  if (el.classList.contains('open')) return;

  el.classList.add('open');
  gameState.openCards.push({ el, idx });

  if (gameState.openCards.length === 2) {
    gameState.attempts++;
    document.getElementById('attempt-count').textContent = gameState.attempts;

    const [a, b] = gameState.openCards;
    const cellA = gameState.board[a.idx];
    const cellB = gameState.board[b.idx];

    if (isMatch(cellA, cellB)) {
      // 성공
      setTimeout(() => {
        a.el.classList.add('matched');
        b.el.classList.add('matched');
        a.el.classList.remove('open');
        b.el.classList.remove('open');
        gameState.openCards = [];
        gameState.matchedCount++;
        updateRemainingCount();
        checkWin();
      }, 400);
    } else {
      // 실패
      gameState.blocked = true;
      a.el.classList.add('wrong');
      b.el.classList.add('wrong');
      setTimeout(() => {
        a.el.classList.remove('open', 'wrong');
        b.el.classList.remove('open', 'wrong');
        gameState.openCards = [];
        gameState.blocked = false;
      }, 900);
    }
  }
}

function isMatch(a, b) {
  if (!a || !b) return false;
  if (a.pairId === null || b.pairId === null) return false;
  return a.pairId === b.pairId && a.cellType !== b.cellType &&
         (a.cellType === 'text' || a.cellType === 'image') &&
         (b.cellType === 'text' || b.cellType === 'image');
}

// ─── 럭키 카드 클릭 ───
function onLuckyClick(el) {
  if (gameState.blocked) return;
  if (el.classList.contains('matched')) return;

  // 미매칭 쌍 찾기
  const unmatchedPairIds = getUnmatchedPairIds();
  if (unmatchedPairIds.length === 0) return;

  el.classList.add('matched');
  el.style.cursor = 'default';

  const randomPairId = unmatchedPairIds[Math.floor(Math.random() * unmatchedPairIds.length)];

  const cards = document.querySelectorAll('.game-card');
  const matched = [];
  cards.forEach((card, idx) => {
    const cell = gameState.board[idx];
    if (!cell) return;
    if (cell.pairId === randomPairId && !card.classList.contains('matched')) {
      matched.push({ el: card, idx });
    }
  });

  matched.forEach(({ el: c }) => {
    c.classList.add('open');
  });

  setTimeout(() => {
    matched.forEach(({ el: c }) => {
      c.classList.add('matched', 'lucky-reveal');
      c.classList.remove('open');
    });
    gameState.matchedCount++;
    updateRemainingCount();
    checkWin();
  }, 600);
}

// ─── 혼돈 카드 클릭 ───
function onChaosClick(el) {
  if (gameState.blocked) return;
  if (el.classList.contains('matched')) return;

  el.classList.add('matched');
  el.style.cursor = 'default';

  // 현재 열린 카드 있으면 닫기
  gameState.openCards.forEach(({el: c}) => c.classList.remove('open', 'wrong'));
  gameState.openCards = [];
  gameState.blocked = false;

  // 보드 흔들기 효과
  const board = document.getElementById('card-board');
  board.classList.add('board-shaking');
  setTimeout(() => board.classList.remove('board-shaking'), 700);

  // 매칭되지 않은 카드 위치 섞기
  setTimeout(() => shuffleUnmatchedCards(), 350);
}

function getUnmatchedPairIds() {
  // DOM에서 .matched인 카드들의 pairId를 Set으로 수집
  const fullyMatchedPairIds = new Set();
  const matchedByPair = {};
  document.querySelectorAll('.game-card.matched').forEach((card) => {
    const idx = parseInt(card.dataset.idx);
    const cell = gameState.board[idx];
    if (!cell || cell.pairId === null) return;
    matchedByPair[cell.pairId] = (matchedByPair[cell.pairId] || 0) + 1;
  });
  Object.keys(matchedByPair).forEach(id => {
    if (matchedByPair[id] >= 2) fullyMatchedPairIds.add(parseInt(id));
  });
  const allPairIds = [...new Set(gameState.board.filter(c => c.pairId !== null).map(c => c.pairId))];
  return allPairIds.filter(id => !fullyMatchedPairIds.has(id));
}

function shuffleUnmatchedCards() {
  const board = document.getElementById('card-board');
  const allCardEls = Array.from(board.querySelectorAll('.game-card'));

  // 매칭되지 않고 특수카드도 아닌 카드들의 인덱스 수집
  const unmatchedIndices = [];
  allCardEls.forEach((el, i) => {
    if (!el.classList.contains('matched') &&
        !el.classList.contains('special-lucky') &&
        !el.classList.contains('special-chaos')) {
      unmatchedIndices.push(i);
    }
  });

  // 셔플할 셀 데이터
  const unmatchedCells = unmatchedIndices.map(i => gameState.board[i]);
  shuffle(unmatchedCells);

  // 보드 데이터 갱신 & 카드 재생성
  unmatchedIndices.forEach((boardIdx, i) => {
    gameState.board[boardIdx] = unmatchedCells[i];
  });

  // 해당 카드 요소들 재렌더링
  unmatchedIndices.forEach((boardIdx) => {
    const oldEl = allCardEls[boardIdx];
    const newCell = gameState.board[boardIdx];
    const newEl = createGameCardEl(newCell, boardIdx);
    newEl.classList.add('open'); // 순간 보여주고 닫기
    board.replaceChild(newEl, oldEl);
  });

  setTimeout(() => {
    document.querySelectorAll('.game-card.open:not(.matched)').forEach(el => {
      el.classList.remove('open');
    });
  }, 300);
}

// ────────────────────────────────────────────────
// 6. 승리 확인 & 결과
// ────────────────────────────────────────────────
function checkWin() {
  const totalPairs = gameState.cards.filter(c => c.term || c.imageDataUrl).slice(0, gameState.pairs).length;
  if (gameState.matchedCount >= totalPairs) {
    setTimeout(() => showResult(), 600);
  }
}

function updateRemainingCount() {
  const totalPairs = gameState.cards.filter(c => c.term || c.imageDataUrl).slice(0, gameState.pairs).length;
  const rem = totalPairs - gameState.matchedCount;
  document.getElementById('remaining-count').textContent = Math.max(0, rem);
}

function updateDashboard() {
  document.getElementById('attempt-count').textContent = gameState.attempts;
  document.getElementById('remaining-count').textContent = gameState.pairs;
}

function showResult() {
  const totalPairs = gameState.cards.filter(c => c.term || c.imageDataUrl).slice(0, gameState.pairs).length;
  const minAttempts = totalPairs; // 최소 시도 횟수
  const accuracy = gameState.attempts > 0
    ? Math.round((minAttempts / gameState.attempts) * 100)
    : 100;

  document.getElementById('result-attempts').textContent = gameState.attempts;
  document.getElementById('result-pairs').textContent = totalPairs;
  document.getElementById('result-accuracy').textContent = Math.min(100, accuracy);

  // 별점 / 평가 메시지
  let rating = '';
  if (accuracy >= 90) rating = '⭐⭐⭐ 완벽해요! 천재인가요?';
  else if (accuracy >= 70) rating = '⭐⭐ 잘했어요! 조금만 더 연습하면 완벽!';
  else if (accuracy >= 50) rating = '⭐ 좋은 시도예요! 다시 도전해봐요!';
  else rating = '💪 도전 정신이 멋져요! 다시 해봐요!';

  document.getElementById('result-rating').textContent = rating;

  // 이모지 선택
  const emoji = accuracy >= 90 ? '🏆' : accuracy >= 70 ? '🎉' : '🌟';
  document.getElementById('result-emoji').textContent = emoji;

  showScreen('screen-result');
}

// ────────────────────────────────────────────────
// 7. 화면 전환
// ────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goBack() {
  showScreen('screen-setup');
}

function restartGame() {
  startGame();
}

// ────────────────────────────────────────────────
// 8. 유틸
// ────────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(msg) {
  // 기존 토스트 제거
  document.querySelectorAll('.toast-msg').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  
  Object.assign(toast.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#1A1A1A',
    color: '#FFD93D',
    fontFamily: 'Jua, sans-serif',
    fontSize: '1.2rem',
    padding: '16px 32px',
    borderRadius: '16px',
    border: '4px solid #FFD93D',
    boxShadow: '6px 6px 0 #FFD93D',
    zIndex: '9999',
    textAlign: 'center',
    pointerEvents: 'none',
    animation: 'toastPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
  });
  
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}
