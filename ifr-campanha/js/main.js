/* =========================================================================
   CAMPANHA HORAS DE VOO IFR — main.js
   Toda a lógica da página pública: carregar números, montar a grade,
   controlar seleção, calcular progresso e montar o link do WhatsApp.

   >>> Edite a seção CONFIG abaixo para personalizar a campanha. <<<
   ========================================================================= */

const CONFIG = {
  whatsappNumber: '5586999903417', // apenas dígitos, com DDI+DDD
  totalNumbers: 1000,
  campaignName: 'Campanha Horas de Voo IFR',
  heroImage: 'images/piloto.jpg',
  dataUrl: 'data/numbers.json',
  whatsappMessageTemplate: (numbers) =>
    `Olá! Gostaria de participar da Campanha Horas de Voo IFR.\n\n` +
    `Escolhi os seguintes números:\n${numbers.map((n) => `• ${n}`).join('\n')}\n\n` +
    `Meu nome é: \n\nObrigado!`,
};

// ------------------------------------------------------------------
// Estado da aplicação
// ------------------------------------------------------------------
const state = {
  numbers: [],       // dados vindos de data/numbers.json
  selected: new Set(), // números escolhidos pelo visitante (client-side)
  searchTerm: '',
};

// ------------------------------------------------------------------
// Referências de DOM
// ------------------------------------------------------------------
const el = {
  heroBg: document.getElementById('heroBg'),
  grid: document.getElementById('numbersGrid'),
  emptySearch: document.getElementById('emptySearch'),
  searchInput: document.getElementById('searchInput'),
  selectedCount: document.getElementById('selectedCount'),
  dockCount: document.getElementById('dockCount'),
  ticketsStrip: document.getElementById('ticketsStrip'),
  actionDock: document.getElementById('actionDock'),
  whatsappBtn: document.getElementById('whatsappBtn'),
  progressPercent: document.getElementById('progressPercent'),
  reservedCount: document.getElementById('reservedCount'),
  totalCount: document.getElementById('totalCount'),
  routeFill: document.getElementById('routeFill'),
  routePlane: document.getElementById('routePlane'),
};

// ------------------------------------------------------------------
// Inicialização
// ------------------------------------------------------------------
init();

async function init() {
  if (el.heroBg) el.heroBg.style.setProperty('--hero-image', `url('${CONFIG.heroImage}')`);
  if (el.heroBg) el.heroBg.style.backgroundImage = `url('${CONFIG.heroImage}')`;
  if (el.totalCount) el.totalCount.textContent = CONFIG.totalNumbers;

  try {
    state.numbers = await loadNumbers();
  } catch (err) {
    console.error('Falha ao carregar data/numbers.json:', err);
    renderLoadError();
    return;
  }

  renderGrid();
  updateProgress();
  updateSelectionUI();
  bindEvents();
}

async function loadNumbers() {
  const res = await fetch(CONFIG.dataUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderLoadError() {
  el.grid.innerHTML = `
    <p style="grid-column:1/-1; text-align:center; color:var(--ink-500); padding:30px 10px;">
      Não foi possível carregar os números agora.<br>
      <small>Se você abriu este arquivo direto do computador (file://), rode um servidor local
      (ex: <code>npx serve</code> ou a extensão "Live Server") — navegadores bloqueiam a leitura
      de arquivos JSON locais por segurança. No ar (GitHub Pages/Netlify) isso funciona normalmente.</small>
    </p>`;
}

// ------------------------------------------------------------------
// Renderização da grade
// ------------------------------------------------------------------
function renderGrid() {
  const fragment = document.createDocumentFragment();

  state.numbers.forEach((item) => {
    const btn = document.createElement('button');
    btn.className = 'num-btn';
    btn.type = 'button';
    btn.textContent = item.number;
    btn.dataset.number = item.number;
    btn.dataset.status = item.status;

    const isLocked = item.status === 'reservado' || item.status === 'pago';
    if (isLocked) {
      btn.disabled = true;
      btn.setAttribute('aria-label', `Número ${item.number}, indisponível`);
    } else {
      btn.setAttribute('aria-label', `Número ${item.number}, disponível`);
    }

    fragment.appendChild(btn);
  });

  el.grid.innerHTML = '';
  el.grid.appendChild(fragment);
}

// Delegação de evento: um único listener para os 1000 botões
el.grid.addEventListener('click', (e) => {
  const btn = e.target.closest('.num-btn');
  if (!btn || btn.disabled) return;
  toggleSelection(btn.dataset.number, btn);
});

function toggleSelection(number, btnEl) {
  if (state.selected.has(number)) {
    state.selected.delete(number);
    if (btnEl) btnEl.dataset.selected = 'false';
  } else {
    state.selected.add(number);
    if (btnEl) btnEl.dataset.selected = 'true';
  }
  updateSelectionUI();
}

// ------------------------------------------------------------------
// Seleção: chips estilo cartão de embarque + barra flutuante
// ------------------------------------------------------------------
function updateSelectionUI() {
  const sorted = Array.from(state.selected).sort();
  const count = sorted.length;

  el.selectedCount.textContent = count;
  el.dockCount.textContent = count;

  el.ticketsStrip.innerHTML = '';
  sorted.forEach((number) => {
    const li = document.createElement('li');
    li.className = 'ticket-chip';
    li.innerHTML = `
      <span><i class="fa-solid fa-plane" style="font-size:0.7em;"></i> ${number}</span>
      <button type="button" aria-label="Remover número ${number}" data-remove="${number}">
        <i class="fa-solid fa-xmark"></i>
      </button>`;
    el.ticketsStrip.appendChild(li);
  });

  el.actionDock.classList.toggle('is-visible', count > 0);

  if (count > 0) {
    const message = CONFIG.whatsappMessageTemplate(sorted);
    el.whatsappBtn.href = `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(message)}`;
  } else {
    el.whatsappBtn.href = '#numeros';
  }
}

el.ticketsStrip.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('[data-remove]');
  if (!removeBtn) return;
  const number = removeBtn.dataset.remove;
  state.selected.delete(number);
  const gridBtn = el.grid.querySelector(`.num-btn[data-number="${number}"]`);
  if (gridBtn) gridBtn.dataset.selected = 'false';
  updateSelectionUI();
});

// ------------------------------------------------------------------
// Busca por número
// ------------------------------------------------------------------
el.searchInput.addEventListener('input', (e) => {
  const term = e.target.value.trim();
  state.searchTerm = term;
  filterGrid(term);
});

function filterGrid(term) {
  const buttons = el.grid.querySelectorAll('.num-btn');
  let visibleCount = 0;

  buttons.forEach((btn) => {
    const match = term === '' || btn.dataset.number.includes(term.padStart(term.length, '0')) || btn.dataset.number.includes(term);
    btn.classList.toggle('is-hidden', !match);
    if (match) visibleCount += 1;
  });

  el.emptySearch.classList.toggle('show', visibleCount === 0);
}

// ------------------------------------------------------------------
// Progresso da campanha (rota de voo)
// ------------------------------------------------------------------
function updateProgress() {
  const total = state.numbers.length || CONFIG.totalNumbers;
  const reserved = state.numbers.filter((n) => n.status === 'reservado' || n.status === 'pago').length;
  const percent = total ? Math.round((reserved / total) * 100) : 0;

  el.progressPercent.innerHTML = `${percent}<small>%</small>`;
  el.reservedCount.textContent = reserved;
  el.totalCount.textContent = total;

  requestAnimationFrame(() => {
    el.routeFill.style.width = `${percent}%`;
    el.routePlane.style.left = `${percent}%`;
  });
}

// ------------------------------------------------------------------
// Diversos
// ------------------------------------------------------------------
function bindEvents() {
  // Rolagem suave já é tratada via CSS (scroll-behavior) + âncoras <a href="#numeros">
}
