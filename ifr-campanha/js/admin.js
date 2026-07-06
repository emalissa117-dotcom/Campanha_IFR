/* =========================================================================
   CAMPANHA HORAS DE VOO IFR — admin.js
   Lógica da área administrativa.

   IMPORTANTE — leia antes de publicar:
   1) A senha abaixo é uma proteção simples de front-end, apenas para evitar
      que curiosos mexam por engano. Ela NÃO é segura contra alguém com
      conhecimento técnico. Troque-a e, se possível, restrinja o acesso a
      admin.html por outros meios (ex: link não divulgado, .htaccess, etc.).
   2) Como o site roda em hospedagem estática (sem servidor/banco de dados),
      as edições feitas aqui ficam salvas no armazenamento local deste
      navegador. Para que TODOS os visitantes vejam as mudanças, use o botão
      "Baixar numbers.json atualizado" e substitua o arquivo
      data/numbers.json na sua hospedagem (GitHub Pages, Netlify, etc.).
   ========================================================================= */

const ADMIN_PASSWORD = '123456'; // <-- troque antes de publicar
const STORAGE_KEY = 'ifr_numbers_data_v1';
const AUTH_KEY = 'ifr_admin_authenticated';
const DATA_URL = 'data/numbers.json';
const PAGE_SIZE = 50;

const state = {
  numbers: [],
  filtered: [],
  page: 1,
  search: '',
  statusFilter: 'todos',
  editingNumber: null,
};

const el = {
  loginScreen: document.getElementById('loginScreen'),
  dashboard: document.getElementById('dashboard'),
  loginForm: document.getElementById('loginForm'),
  passwordInput: document.getElementById('passwordInput'),
  loginError: document.getElementById('loginError'),
  logoutBtn: document.getElementById('logoutBtn'),

  statTotal: document.getElementById('statTotal'),
  statAvailable: document.getElementById('statAvailable'),
  statReserved: document.getElementById('statReserved'),
  statPaid: document.getElementById('statPaid'),
  statPercent: document.getElementById('statPercent'),

  exportBtn: document.getElementById('exportBtn'),
  importInput: document.getElementById('importInput'),
  resetBtn: document.getElementById('resetBtn'),

  adminSearch: document.getElementById('adminSearch'),
  statusFilter: document.getElementById('statusFilter'),
  tableBody: document.getElementById('adminTableBody'),
  adminEmpty: document.getElementById('adminEmpty'),
  pagination: document.getElementById('pagination'),

  modal: document.getElementById('editModal'),
  modalNumber: document.getElementById('modalNumber'),
  modalClose: document.getElementById('modalClose'),
  editForm: document.getElementById('editForm'),
  editNumber: document.getElementById('editNumber'),
  editName: document.getElementById('editName'),
  editPhone: document.getElementById('editPhone'),
  editInstagram: document.getElementById('editInstagram'),
  editStatus: document.getElementById('editStatus'),
  cancelReservationBtn: document.getElementById('cancelReservationBtn'),
};

// ------------------------------------------------------------------
// Autenticação (proteção simples de front-end)
// ------------------------------------------------------------------
if (sessionStorage.getItem(AUTH_KEY) === 'true') {
  showDashboard();
}

el.loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  if (el.passwordInput.value === ADMIN_PASSWORD) {
    sessionStorage.setItem(AUTH_KEY, 'true');
    el.loginError.textContent = '';
    showDashboard();
  } else {
    el.loginError.textContent = 'Senha incorreta. Tente novamente.';
    el.passwordInput.value = '';
    el.passwordInput.focus();
  }
});

el.logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(AUTH_KEY);
  location.reload();
});

async function showDashboard() {
  el.loginScreen.hidden = true;
  el.dashboard.hidden = false;
  await loadData();
  applyFilters();
  bindDashboardEvents();
}

// ------------------------------------------------------------------
// Carregamento de dados: localStorage primeiro, senão data/numbers.json
// ------------------------------------------------------------------
async function loadData() {
  const cached = localStorage.getItem(STORAGE_KEY);
  if (cached) {
    try {
      state.numbers = JSON.parse(cached);
      return;
    } catch (err) {
      console.warn('Cache local corrompido, recarregando do arquivo original.', err);
    }
  }
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  state.numbers = await res.json();
  persist();
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.numbers));
}

// ------------------------------------------------------------------
// Estatísticas
// ------------------------------------------------------------------
function renderStats() {
  const total = state.numbers.length;
  const available = state.numbers.filter((n) => n.status === 'disponivel').length;
  const reserved = state.numbers.filter((n) => n.status === 'reservado').length;
  const paid = state.numbers.filter((n) => n.status === 'pago').length;
  const percent = total ? Math.round(((reserved + paid) / total) * 100) : 0;

  el.statTotal.textContent = total;
  el.statAvailable.textContent = available;
  el.statReserved.textContent = reserved;
  el.statPaid.textContent = paid;
  el.statPercent.textContent = `${percent}%`;
}

// ------------------------------------------------------------------
// Filtros + paginação + tabela
// ------------------------------------------------------------------
function applyFilters() {
  const term = state.search.trim().toLowerCase();

  state.filtered = state.numbers.filter((item) => {
    const matchesStatus = state.statusFilter === 'todos' || item.status === state.statusFilter;
    if (!matchesStatus) return false;
    if (!term) return true;
    return (
      item.number.includes(term) ||
      (item.name || '').toLowerCase().includes(term) ||
      (item.phone || '').toLowerCase().includes(term) ||
      (item.instagram || '').toLowerCase().includes(term)
    );
  });

  state.page = 1;
  renderStats();
  renderTable();
}

function renderTable() {
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);

  el.adminEmpty.classList.toggle('show', state.filtered.length === 0);
  el.tableBody.innerHTML = '';

  pageItems.forEach((item) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="num-mono">${item.number}</td>
      <td>${item.name ? escapeHtml(item.name) : '<span class="muted">—</span>'}</td>
      <td>${item.phone ? escapeHtml(item.phone) : '<span class="muted">—</span>'}</td>
      <td>${item.instagram ? escapeHtml(item.instagram) : '<span class="muted">—</span>'}</td>
      <td><span class="status-badge ${item.status}">${statusLabel(item.status)}</span></td>
      <td><button class="row-edit-btn" data-edit="${item.number}"><i class="fa-solid fa-pen"></i> Editar</button></td>
    `;
    el.tableBody.appendChild(tr);
  });

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  el.pagination.innerHTML = '';

  if (totalPages <= 1) return;

  const makeBtn = (label, page, opts = {}) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.disabled = !!opts.disabled;
    if (page === state.page) btn.classList.add('active');
    btn.addEventListener('click', () => {
      state.page = page;
      renderTable();
      el.tableBody.closest('.table-wrap').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return btn;
  };

  el.pagination.appendChild(makeBtn('‹', Math.max(1, state.page - 1), { disabled: state.page === 1 }));

  const windowSize = 5;
  let startPage = Math.max(1, state.page - Math.floor(windowSize / 2));
  let endPage = Math.min(totalPages, startPage + windowSize - 1);
  startPage = Math.max(1, endPage - windowSize + 1);

  for (let p = startPage; p <= endPage; p += 1) {
    el.pagination.appendChild(makeBtn(String(p), p));
  }

  el.pagination.appendChild(makeBtn('›', Math.min(totalPages, state.page + 1), { disabled: state.page === totalPages }));
}

function statusLabel(status) {
  return { disponivel: 'Disponível', reservado: 'Reservado', pago: 'Pago' }[status] || status;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ------------------------------------------------------------------
// Edição via modal
// ------------------------------------------------------------------
function openModal(number) {
  const item = state.numbers.find((n) => n.number === number);
  if (!item) return;

  state.editingNumber = number;
  el.modalNumber.textContent = number;
  el.editNumber.value = number;
  el.editName.value = item.name || '';
  el.editPhone.value = item.phone || '';
  el.editInstagram.value = item.instagram || '';
  el.editStatus.value = item.status;

  el.modal.hidden = false;
  el.editName.focus();
}

function closeModal() {
  el.modal.hidden = true;
  state.editingNumber = null;
}

el.editForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const item = state.numbers.find((n) => n.number === state.editingNumber);
  if (!item) return;

  item.name = el.editName.value.trim();
  item.phone = el.editPhone.value.trim();
  item.instagram = el.editInstagram.value.trim();
  item.status = el.editStatus.value;

  persist();
  applyFilters();
  closeModal();
});

el.cancelReservationBtn.addEventListener('click', () => {
  const item = state.numbers.find((n) => n.number === state.editingNumber);
  if (!item) return;
  if (!confirm(`Cancelar a reserva do número ${item.number}? Os dados do participante serão apagados.`)) return;

  item.name = '';
  item.phone = '';
  item.instagram = '';
  item.status = 'disponivel';

  persist();
  applyFilters();
  closeModal();
});

// ------------------------------------------------------------------
// Exportar / Importar / Zerar
// ------------------------------------------------------------------
function exportJSON() {
  const blob = new Blob([JSON.stringify(state.numbers, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'numbers.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJSON(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed) || !parsed.every((it) => it.number && it.status)) {
        throw new Error('Formato inválido');
      }
      state.numbers = parsed;
      persist();
      applyFilters();
      alert('Arquivo importado com sucesso.');
    } catch (err) {
      alert('Não foi possível importar este arquivo. Verifique se é um numbers.json válido.');
      console.error(err);
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!confirm('Isso vai zerar TODAS as reservas (voltando todos os números para "disponível") e apagar os dados dos participantes salvos neste navegador. Deseja continuar?')) return;
  state.numbers.forEach((item) => {
    item.name = '';
    item.phone = '';
    item.instagram = '';
    item.status = 'disponivel';
  });
  persist();
  applyFilters();
}

// ------------------------------------------------------------------
// Eventos do painel
// ------------------------------------------------------------------
function bindDashboardEvents() {
  el.adminSearch.addEventListener('input', (e) => {
    state.search = e.target.value;
    applyFilters();
  });

  el.statusFilter.addEventListener('change', (e) => {
    state.statusFilter = e.target.value;
    applyFilters();
  });

  el.tableBody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-edit]');
    if (!btn) return;
    openModal(btn.dataset.edit);
  });

  el.modalClose.addEventListener('click', closeModal);
  el.modal.addEventListener('click', (e) => {
    if (e.target === el.modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !el.modal.hidden) closeModal();
  });

  el.exportBtn.addEventListener('click', exportJSON);
  el.importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) importJSON(file);
    e.target.value = '';
  });
  el.resetBtn.addEventListener('click', resetAll);
}
