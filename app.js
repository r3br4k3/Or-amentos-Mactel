/* =============================================
   APP.JS — OrcaFácil – Gerenciador de Orçamentos
============================================= */

'use strict';

const CATALOGO_PADRAO = [
  {
    id: 'cat-cerca',
    nome: 'Cerca Elétrica',
    emoji: '⚡',
    produtos: [
      { id: 'p-cerca-1', nome: 'Central 24 Net', fotoUrl: null },
      { id: 'p-cerca-2', nome: 'Rolo de Arame', fotoUrl: null },
      { id: 'p-cerca-3', nome: 'Esticador de Arame', fotoUrl: null },
      { id: 'p-cerca-4', nome: 'Isolador Rígido', fotoUrl: null },
      { id: 'p-cerca-5', nome: 'Isolador Mola', fotoUrl: null },
      { id: 'p-cerca-6', nome: 'Poste de Alumínio', fotoUrl: null },
      { id: 'p-cerca-7', nome: 'Cabo de Aterramento', fotoUrl: null },
      { id: 'p-cerca-8', nome: 'Sirene', fotoUrl: null },
    ]
  },
  {
    id: 'cat-alarme',
    nome: 'Alarme',
    emoji: '🚨',
    produtos: [
      { id: 'p-alarme-1', nome: 'Central de Alarme', fotoUrl: null },
      { id: 'p-alarme-2', nome: 'Sensor de Presença', fotoUrl: null },
      { id: 'p-alarme-3', nome: 'Sensor Magnético', fotoUrl: null },
      { id: 'p-alarme-4', nome: 'Sensor de Vidro', fotoUrl: null },
      { id: 'p-alarme-5', nome: 'Teclado de Alarme', fotoUrl: null },
      { id: 'p-alarme-6', nome: 'Controle Remoto', fotoUrl: null },
      { id: 'p-alarme-7', nome: 'Sirene Interna', fotoUrl: null },
      { id: 'p-alarme-8', nome: 'Bateria Auxiliar', fotoUrl: null },
    ]
  },
  {
    id: 'cat-camera',
    nome: 'Câmeras CFTV',
    emoji: '📷',
    produtos: [
      { id: 'p-cam-1', nome: 'Câmera Bullet', fotoUrl: null },
      { id: 'p-cam-2', nome: 'Câmera Dome', fotoUrl: null },
      { id: 'p-cam-3', nome: 'Câmera PTZ', fotoUrl: null },
      { id: 'p-cam-4', nome: 'DVR 4 Canais', fotoUrl: null },
      { id: 'p-cam-5', nome: 'DVR 8 Canais', fotoUrl: null },
      { id: 'p-cam-6', nome: 'NVR 8 Canais', fotoUrl: null },
      { id: 'p-cam-7', nome: 'HD 1TB', fotoUrl: null },
      { id: 'p-cam-8', nome: 'Fonte 12V', fotoUrl: null },
      { id: 'p-cam-9', nome: 'Cabo Coaxial (m)', fotoUrl: null },
    ]
  },
  {
    id: 'cat-acesso',
    nome: 'Controle de Acesso',
    emoji: '🔐',
    produtos: [
      { id: 'p-ac-1', nome: 'Leitor Biométrico', fotoUrl: null },
      { id: 'p-ac-2', nome: 'Leitor de Cartão', fotoUrl: null },
      { id: 'p-ac-3', nome: 'Fechadura Elétrica', fotoUrl: null },
      { id: 'p-ac-4', nome: 'Porteiro Eletrônico', fotoUrl: null },
      { id: 'p-ac-5', nome: 'Videoporteiro', fotoUrl: null },
    ]
  },
  {
    id: 'cat-rede',
    nome: 'Rede e Automação',
    emoji: '📡',
    produtos: [
      { id: 'p-rede-1', nome: 'Switch 8 Portas', fotoUrl: null },
      { id: 'p-rede-2', nome: 'Roteador Wi-Fi', fotoUrl: null },
      { id: 'p-rede-3', nome: 'Cabo Cat6 (m)', fotoUrl: null },
      { id: 'p-rede-4', nome: 'Patch Panel', fotoUrl: null },
    ]
  },
];

let catalogo = [];
let orcamentos = [];
let orcamentoAtual = null;
let categoriaAtiva = null;
let searchProdutoTimer = null;
let db = null;
let syncCatalogoTimer = null;
let syncOrcamentosTimer = null;
let dialogoResolve = null;
let dialogoKeyHandler = null;
let dialogoFocusAnterior = null;

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`Falha de API: ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

function escAttr(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fecharDialogo(resultado) {
  const modal = document.getElementById('modalDialogo');
  if (!modal || !dialogoResolve) return;

  modal.classList.add('hidden');
  document.removeEventListener('keydown', dialogoKeyHandler);

  const resolver = dialogoResolve;
  dialogoResolve = null;
  dialogoKeyHandler = null;

  if (dialogoFocusAnterior && typeof dialogoFocusAnterior.focus === 'function') {
    dialogoFocusAnterior.focus();
  }
  dialogoFocusAnterior = null;

  resolver(resultado);
}

function abrirDialogo(options = {}) {
  const modal = document.getElementById('modalDialogo');
  const titulo = document.getElementById('dialogoTitulo');
  const subtitulo = document.getElementById('dialogoSubtitulo');
  const icone = document.getElementById('dialogoIcone');
  const mensagem = document.getElementById('dialogoMensagem');
  const campos = document.getElementById('dialogoCampos');
  const btnCancelar = document.getElementById('btnDialogoCancelar');
  const btnConfirmar = document.getElementById('btnDialogoConfirmar');

  const {
    title = 'Aviso',
    subtitle = 'Ação do sistema',
    message = '',
    icon = '💬',
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    hideCancel = false,
    variant = 'primary',
    fields = []
  } = options;

  titulo.textContent = title;
  subtitulo.textContent = subtitle;
  icone.textContent = icon;
  mensagem.textContent = message;
  btnConfirmar.textContent = confirmText;
  btnConfirmar.dataset.variant = variant;
  btnCancelar.textContent = cancelText;
  btnCancelar.style.display = hideCancel ? 'none' : '';

  campos.innerHTML = fields.map((field, index) => `
    <div class="dialogo-campo">
      <label for="dialogoCampo${index}">${esc(field.label)}</label>
      <input
        id="dialogoCampo${index}"
        data-field-name="${escAttr(field.name)}"
        type="${escAttr(field.type || 'text')}"
        value="${escAttr(field.value || '')}"
        placeholder="${escAttr(field.placeholder || '')}"
        ${field.required ? 'data-required="true"' : ''}
      />
    </div>
  `).join('');

  const coletarValores = () => {
    const inputs = Array.from(campos.querySelectorAll('input'));
    const values = {};

    for (const input of inputs) {
      const obrigatorio = input.dataset.required === 'true';
      const valor = input.value.trim();
      input.classList.remove('invalido');

      if (obrigatorio && !valor) {
        input.classList.add('invalido');
        input.focus();
        return null;
      }

      values[input.dataset.fieldName] = valor;
    }

    return values;
  };

  dialogoFocusAnterior = document.activeElement;
  modal.classList.remove('hidden');

  return new Promise(resolve => {
    dialogoResolve = resolve;

    btnCancelar.onclick = () => fecharDialogo({ confirmed: false, values: null });
    btnConfirmar.onclick = () => {
      const values = coletarValores();
      if (fields.length && !values) return;
      fecharDialogo({ confirmed: true, values: values || {} });
    };

    modal.onclick = e => {
      if (e.target === modal) {
        fecharDialogo({ confirmed: false, values: null });
      }
    };

    dialogoKeyHandler = e => {
      if (e.key === 'Escape') {
        fecharDialogo({ confirmed: false, values: null });
      }

      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
        const values = coletarValores();
        if (fields.length && !values) return;
        fecharDialogo({ confirmed: true, values: values || {} });
      }
    };

    document.addEventListener('keydown', dialogoKeyHandler);

    const primeiroInput = campos.querySelector('input');
    if (primeiroInput) {
      primeiroInput.focus();
      primeiroInput.select();
    } else {
      btnConfirmar.focus();
    }
  });
}

async function mostrarAlertaTematico(message, options = {}) {
  await abrirDialogo({
    title: options.title || 'Aviso',
    subtitle: options.subtitle || 'Mensagem do sistema',
    message,
    icon: options.icon || '✨',
    confirmText: options.confirmText || 'Entendi',
    hideCancel: true,
    variant: options.variant || 'primary'
  });
}

async function mostrarAvisoTematico(message, options = {}) {
  await mostrarAlertaTematico(message, {
    title: options.title || 'Atenção',
    subtitle: options.subtitle || 'Verifique antes de continuar',
    icon: options.icon || '⚠️',
    confirmText: options.confirmText || 'Entendi',
    variant: options.variant || 'primary'
  });
}

async function confirmarAcao(message, options = {}) {
  const result = await abrirDialogo({
    title: options.title || 'Confirmar ação',
    subtitle: options.subtitle || 'Confira antes de continuar',
    message,
    icon: options.icon || '🛡️',
    confirmText: options.confirmText || 'Confirmar',
    cancelText: options.cancelText || 'Cancelar',
    variant: options.variant || 'primary'
  });

  return result.confirmed;
}

async function solicitarCamposDialogo(options = {}) {
  return abrirDialogo(options);
}

function salvarTema(tema) {
  localStorage.setItem('orcafacil_tema', tema);
}

function carregarTema() {
  const salvo = localStorage.getItem('orcafacil_tema');
  if (salvo) return salvo;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function aplicarTema(tema) {
  const dark = tema === 'dark';
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('dark', dark);
  const btnTema = document.getElementById('btnTema');
  if (btnTema) {
    btnTema.textContent = dark ? '☀️' : '🌙';
    btnTema.title = dark ? 'Trocar para modo claro' : 'Trocar para modo escuro';
  }
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) metaTheme.setAttribute('content', dark ? '#0f141d' : '#1a73e8');
}

function alternarTema() {
  const novo = document.body.classList.contains('dark') ? 'light' : 'dark';
  aplicarTema(novo);
  salvarTema(novo);
}

function salvarCatalogo() {
  const sem = catalogo.map(cat => ({
    ...cat,
    produtos: cat.produtos.map(p => ({ ...p, fotoUrl: null }))
  }));
  clearTimeout(syncCatalogoTimer);
  syncCatalogoTimer = setTimeout(() => {
    apiRequest('/api/catalogo', {
      method: 'PUT',
      body: JSON.stringify({ catalogo: sem })
    }).catch(() => mostrarToast('Falha ao sincronizar catálogo no banco.', { type: 'error', icon: '⚠️' }));
  }, 200);
}

function salvarOrcamentos() {
  const sem = orcamentos.map(o => ({
    ...o,
    midiasLocal: o.midiasLocal || o.fotosLocal || []
  }));
  clearTimeout(syncOrcamentosTimer);
  syncOrcamentosTimer = setTimeout(() => {
    apiRequest('/api/orcamentos', {
      method: 'PUT',
      body: JSON.stringify({ orcamentos: sem })
    }).catch(() => mostrarToast('Falha ao sincronizar orçamentos no banco.', { type: 'error', icon: '⚠️' }));
  }, 200);
}

async function carregarDadosPersistidos() {
  try {
    const data = await apiRequest('/api/dados');

    catalogo = Array.isArray(data && data.catalogo)
      ? data.catalogo
      : JSON.parse(JSON.stringify(CATALOGO_PADRAO));

    orcamentos = Array.isArray(data && data.orcamentos) ? data.orcamentos : [];
    orcamentos = orcamentos.map(o => ({
      ...o,
      midiasLocal: o.midiasLocal || o.fotosLocal || []
    }));
  } catch (_) {
    catalogo = JSON.parse(JSON.stringify(CATALOGO_PADRAO));
    orcamentos = [];
    await mostrarAvisoTematico('Não foi possível carregar os dados salvos no banco neste momento. O app abriu com os dados padrão para você continuar trabalhando.', {
      title: 'Falha ao carregar dados',
      subtitle: 'O app usou um estado seguro temporário',
      icon: '🗄️'
    });
  }
}

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('OrcaFacilDB', 2);
    req.onupgradeneeded = e => {
      const database = e.target.result;
      if (!database.objectStoreNames.contains('fotos')) {
        database.createObjectStore('fotos', { keyPath: 'chave' });
      }
      if (!database.objectStoreNames.contains('fotosProd')) {
        database.createObjectStore('fotosProd', { keyPath: 'chave' });
      }
      if (!database.objectStoreNames.contains('midias')) {
        database.createObjectStore('midias', { keyPath: 'chave' });
      }
    };
    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e);
  });
}

function dbSet(store, chave, dataUrl, tipo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put({ chave, dataUrl, tipo });
    tx.oncomplete = resolve;
    tx.onerror = reject;
  });
}

function dbGet(store, chave) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(chave);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

function dbDelete(store, chave) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(chave);
    tx.oncomplete = resolve;
    tx.onerror = resolve;
  });
}

function dbGetAllKeys(store) {
  return new Promise((resolve) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAllKeys();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

function mostrarTela(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

async function renderizarListaOrcamentos(filtro = '') {
  const container = document.getElementById('listaOrcamentos');
  let lista = orcamentos;
  if (filtro) {
    const f = filtro.toLowerCase();
    lista = lista.filter(o =>
      (o.nomeCliente || '').toLowerCase().includes(f) ||
      (o.enderecoCliente || '').toLowerCase().includes(f)
    );
  }

  if (!lista.length) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📂</span>
        <p>${filtro ? 'Nenhum orçamento encontrado.' : 'Nenhum orçamento ainda.<br>Toque em <strong>＋ Novo</strong> para começar.'}</p>
      </div>`;
    return;
  }

  const html = await Promise.all(lista.map(async o => {
    const legacy = await dbGetAllKeys('fotos').then(keys => keys.filter(k => k.startsWith(`${o.id}_foto_`)));
    const temMidia = (o.midiasLocal && o.midiasLocal.length > 0) || legacy.length > 0;
    const qtdItens = (o.itens || []).length;
    const temServico = (o.itens || []).some(i => i.tipo === 'temp');
    const dataFmt = o.data ? new Date(o.data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
    return `
      <div class="orca-card" data-id="${o.id}">
        <div class="orca-card-info">
          <div class="orca-card-nome">${esc(o.nomeCliente || 'Sem nome')}</div>
          <div class="orca-card-sub">
            ${o.enderecoCliente ? esc(o.enderecoCliente) + ' &nbsp;·&nbsp; ' : ''}${dataFmt}
          </div>
          <div class="orca-card-sub" style="margin-top:3px;">
            ${qtdItens} ${qtdItens === 1 ? 'item' : 'itens'}${temMidia ? ' &nbsp;·&nbsp; 🎬 Mídias' : ''}${temServico ? ' &nbsp;·&nbsp; 🔧 Serviço' : ''}
          </div>
        </div>
        <div class="orca-card-acoes">
          <button class="btn-del" data-del="${o.id}" title="Excluir">🗑</button>
        </div>
      </div>`;
  }));

  container.innerHTML = html.join('');

  container.querySelectorAll('.orca-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-del]')) return;
      abrirOrcamento(card.dataset.id);
    });
  });

  container.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      const confirmado = await confirmarAcao('Esse orçamento será removido da lista local e as mídias dele também serão apagadas.', {
        title: 'Excluir orçamento',
        subtitle: 'Esta ação não pode ser desfeita',
        icon: '🗑️',
        confirmText: 'Excluir',
        variant: 'danger'
      });
      if (!confirmado) return;
      await excluirOrcamento(btn.dataset.del);
    });
  });
}

async function excluirOrcamento(id) {
  orcamentos = orcamentos.filter(o => o.id !== id);
  salvarOrcamentos();
  const midiaKeys = await dbGetAllKeys('midias');
  const fotoKeys = await dbGetAllKeys('fotos');
  await Promise.all(midiaKeys.filter(k => k.startsWith(`${id}_midia_`)).map(k => dbDelete('midias', k)));
  await Promise.all(fotoKeys.filter(k => k.startsWith(`${id}_foto_`)).map(k => dbDelete('fotos', k)));
  renderizarListaOrcamentos(document.getElementById('searchOrcamentos').value);
}

function novoId() {
  return 'orc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
}

function criarOrcamento() {
  return {
    id: novoId(),
    nomeCliente: '',
    enderecoCliente: '',
    data: new Date().toISOString().slice(0, 10),
    itens: [],
    notas: '',
    midiasLocal: []
  };
}

async function abrirOrcamento(id) {
  if (id) {
    const encontrado = orcamentos.find(o => o.id === id);
    orcamentoAtual = encontrado ? JSON.parse(JSON.stringify(encontrado)) : criarOrcamento();
  } else {
    orcamentoAtual = criarOrcamento();
  }

  orcamentoAtual.midiasLocal = orcamentoAtual.midiasLocal || orcamentoAtual.fotosLocal || [];

  document.getElementById('nomeCliente').value = orcamentoAtual.nomeCliente || '';
  document.getElementById('enderecoCliente').value = orcamentoAtual.enderecoCliente || '';
  document.getElementById('dataOrcamento').value = orcamentoAtual.data || '';
  document.getElementById('notasOrcamento').value = orcamentoAtual.notas || '';
  document.getElementById('searchProdutos').value = '';

  categoriaAtiva = catalogo[0] ? catalogo[0].id : null;
  renderizarCategorias();
  await renderizarProdutos('');
  await migrarFotosLegadas();
  await renderizarMidiasLocal();
  atualizarResumo();
  mostrarTela('telaEditor');
  window.scrollTo(0, 0);
}

function salvarOrcamentoAtual() {
  orcamentoAtual.nomeCliente = document.getElementById('nomeCliente').value.trim();
  orcamentoAtual.enderecoCliente = document.getElementById('enderecoCliente').value.trim();
  orcamentoAtual.data = document.getElementById('dataOrcamento').value;
  orcamentoAtual.notas = document.getElementById('notasOrcamento').value.trim();
  orcamentoAtual.midiasLocal = orcamentoAtual.midiasLocal || [];

  const idx = orcamentos.findIndex(o => o.id === orcamentoAtual.id);
  if (idx >= 0) {
    orcamentos[idx] = { ...orcamentoAtual };
  } else {
    orcamentos.unshift({ ...orcamentoAtual });
  }
  salvarOrcamentos();
  mostrarToast('Orçamento salvo no banco com sucesso.', { type: 'success', icon: '💾' });
}

function renderizarCategorias() {
  const container = document.getElementById('categoriasTabs');
  container.innerHTML = catalogo.map(cat => `
    <button class="tab-btn ${cat.id === categoriaAtiva ? 'active' : ''}" data-cat="${cat.id}">
      ${cat.emoji} ${esc(cat.nome)}
    </button>`).join('');

  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      categoriaAtiva = btn.dataset.cat;
      document.getElementById('searchProdutos').value = '';
      renderizarCategorias();
      await renderizarProdutos('');
    });
  });
}

async function renderizarProdutos(filtro) {
  const grid = document.getElementById('produtosGrid');
  let produtos = [];

  if (filtro) {
    const f = filtro.toLowerCase();
    catalogo.forEach(cat => {
      cat.produtos.forEach(p => {
        if (p.nome.toLowerCase().includes(f)) produtos.push({ ...p, catId: cat.id });
      });
    });
  } else {
    const cat = catalogo.find(c => c.id === categoriaAtiva);
    if (cat) produtos = cat.produtos.map(p => ({ ...p, catId: cat.id }));
  }

  if (!produtos.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);">Nenhum produto encontrado.</div>';
    return;
  }

  const htmlParts = await Promise.all(produtos.map(async p => {
    const fotoRegistro = await dbGet('fotosProd', p.id);
    const fotoUrl = fotoRegistro ? fotoRegistro.dataUrl : null;
    const fotoHtml = fotoUrl
      ? `<img class="produto-foto" src="${fotoUrl}" alt="${esc(p.nome)}" />`
      : '<div class="produto-foto-placeholder">📦</div>';

    const itemAtual = orcamentoAtual.itens.find(i => i.id === p.id);
    const qty = itemAtual ? itemAtual.qtd : 0;

    return `
      <div class="produto-card" data-prod-id="${p.id}" data-cat-id="${p.catId}">
        ${fotoHtml}
        <div class="produto-info">
          <div class="produto-nome">${esc(p.nome)}</div>
        </div>
        <div class="produto-qty">
          <button class="qty-btn minus" data-action="minus" data-prod="${p.id}">−</button>
          <span class="qty-display ${qty === 0 ? 'zero' : ''}" id="qty-${p.id}">${qty}</span>
          <button class="qty-btn" data-action="plus" data-prod="${p.id}">＋</button>
        </div>
      </div>`;
  }));

  grid.innerHTML = htmlParts.join('');

  grid.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      alterarQtd(btn.dataset.prod, btn.dataset.action);
    });
  });
}

function alterarQtd(prodId, action) {
  const produto = localizarProduto(prodId);
  if (!produto) return;

  const idx = orcamentoAtual.itens.findIndex(i => i.id === prodId);
  if (action === 'plus') {
    if (idx >= 0) {
      orcamentoAtual.itens[idx].qtd++;
    } else {
      orcamentoAtual.itens.push({ tipo: 'produto', id: prodId, nome: produto.nome, catId: produto.catId, qtd: 1, precoUnit: 0 });
    }
  } else if (idx >= 0) {
    orcamentoAtual.itens[idx].qtd--;
    if (orcamentoAtual.itens[idx].qtd <= 0) orcamentoAtual.itens.splice(idx, 1);
  }

  const displayEl = document.getElementById(`qty-${prodId}`);
  if (displayEl) {
    const item = orcamentoAtual.itens.find(i => i.id === prodId);
    const qty = item ? item.qtd : 0;
    displayEl.textContent = String(qty);
    displayEl.className = `qty-display ${qty === 0 ? 'zero' : ''}`;
  }

  atualizarResumo();
}

function atualizarResumo() {
  const itensEl = document.getElementById('itensResumo');
  const totalEl = document.getElementById('resumoTotal');
  const itens = orcamentoAtual.itens || [];

  if (!itens.length) {
    itensEl.innerHTML = '<div class="resumo-vazio">Nenhum item adicionado ainda.</div>';
    totalEl.innerHTML = '';
    return;
  }

  let totalGeral = 0;
  const html = itens.map(item => {
    const subtotal = (item.precoUnit || 0) * (item.qtd || 1);
    totalGeral += subtotal;
    const precoHtml = item.precoUnit
      ? `<span class="resumo-item-preco">R$ ${subtotal.toFixed(2).replace('.', ',')}</span>`
      : '<span class="resumo-item-preco" style="color:var(--text-muted)">—</span>';
    return `
      <div class="resumo-item">
        <div class="resumo-item-nome">
          ${item.tipo === 'temp' ? '🔧 ' : ''}${esc(item.nome)}
          <div class="resumo-item-qty">Qtd: ${item.qtd}</div>
        </div>
        ${precoHtml}
      </div>`;
  }).join('');

  itensEl.innerHTML = html;
  totalEl.innerHTML = totalGeral > 0
    ? `<span>Total</span><span>R$ ${totalGeral.toFixed(2).replace('.', ',')}</span>`
    : '';
}

function abrirModalTemp() {
  document.getElementById('tempNome').value = '';
  document.getElementById('tempPreco').value = '';
  document.getElementById('tempQtd').value = '1';
  document.getElementById('modalTemp').classList.remove('hidden');
  document.getElementById('tempNome').focus();
}

function fecharModalTemp() {
  document.getElementById('modalTemp').classList.add('hidden');
}

async function confirmarTemp() {
  const nome = document.getElementById('tempNome').value.trim();
  const preco = parseFloat(document.getElementById('tempPreco').value) || 0;
  const qtd = parseInt(document.getElementById('tempQtd').value, 10) || 1;
  if (!nome) {
    await mostrarAvisoTematico('Informe um nome para o serviço ou produto personalizado antes de adicionar.', {
      title: 'Nome obrigatório',
      subtitle: 'Esse item precisa de uma identificação',
      icon: '🧾',
      confirmText: 'Vou preencher'
    });
    document.getElementById('tempNome').focus();
    return;
  }

  orcamentoAtual.itens.push({
    tipo: 'temp',
    id: 'temp_' + Date.now(),
    nome,
    qtd,
    precoUnit: preco
  });
  fecharModalTemp();
  atualizarResumo();
}

async function onMidiaSelecionada(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;

  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    const midiaId = `${orcamentoAtual.id}_midia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await dbSet('midias', midiaId, dataUrl, file.type || 'application/octet-stream');
    orcamentoAtual.midiasLocal.push(midiaId);
  }

  e.target.value = '';
  await renderizarMidiasLocal();
}

async function migrarFotosLegadas() {
  const legado = orcamentoAtual.fotosLocal || [];
  if (!legado.length) return;

  for (const fotoId of legado) {
    const fotoRegistro = await dbGet('fotos', fotoId);
    if (fotoRegistro && fotoRegistro.dataUrl) {
      const novoId = `${orcamentoAtual.id}_midia_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await dbSet('midias', novoId, fotoRegistro.dataUrl, 'image/*');
      orcamentoAtual.midiasLocal.push(novoId);
    }
  }

  orcamentoAtual.fotosLocal = [];
}

async function renderizarMidiasLocal() {
  const grid = document.getElementById('fotoGrid');
  const midias = orcamentoAtual.midiasLocal || [];
  grid.classList.toggle('galeria-fluida', true);

  if (!midias.length) {
    grid.innerHTML = '';
    return;
  }

  const htmlParts = await Promise.all(midias.map(async midiaId => {
    const registro = await dbGet('midias', midiaId);
    if (!registro || !registro.dataUrl) return '';
    const tipo = registro.tipo || '';
    const ehVideo = tipo.startsWith('video/');
    const mediaTag = ehVideo
      ? `<video src="${registro.dataUrl}" controls playsinline preload="metadata"></video>`
      : `<img src="${registro.dataUrl}" alt="mídia do local" />`;

    return `
      <div class="foto-item">
        ${mediaTag}
        <span class="foto-badge">${ehVideo ? 'VIDEO' : 'FOTO'}</span>
        <button class="foto-del" data-midia-del="${midiaId}" title="Remover mídia">✕</button>
      </div>`;
  }));

  grid.innerHTML = htmlParts.join('');
  grid.querySelectorAll('[data-midia-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.midiaDel;
      await dbDelete('midias', id);
      orcamentoAtual.midiasLocal = orcamentoAtual.midiasLocal.filter(m => m !== id);
      await renderizarMidiasLocal();
    });
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function localizarProduto(prodId) {
  for (const cat of catalogo) {
    const prod = cat.produtos.find(p => p.id === prodId);
    if (prod) return { ...prod, catId: cat.id };
  }
  return null;
}

function sincronizarNomeProdutoNosOrcamentos(prodId, novoNome) {
  orcamentos.forEach(orc => {
    orc.itens.forEach(item => {
      if (item.id === prodId) item.nome = novoNome;
    });
  });
  if (orcamentoAtual) {
    orcamentoAtual.itens.forEach(item => {
      if (item.id === prodId) item.nome = novoNome;
    });
  }
}

function removerProdutoDosOrcamentos(prodId) {
  orcamentos.forEach(orc => {
    orc.itens = (orc.itens || []).filter(item => item.id !== prodId);
  });
  if (orcamentoAtual) {
    orcamentoAtual.itens = (orcamentoAtual.itens || []).filter(item => item.id !== prodId);
  }
}

function abrirModalCatalogo() {
  preencherSelectCategoriaCat();
  document.getElementById('catNome').value = '';
  limparFotoCatalogoSelecionada();
  const preview = document.getElementById('catFotoPreview');
  preview.classList.add('hidden');
  preview.src = '';
  renderizarListaProdutosCat();
  document.getElementById('modalCatalogo').classList.remove('hidden');
}

function fecharModalCatalogo() {
  document.getElementById('modalCatalogo').classList.add('hidden');
}

function preencherSelectCategoriaCat() {
  const sel = document.getElementById('selectCategoriaCat');
  sel.innerHTML = catalogo.map(c => `<option value="${c.id}">${c.emoji} ${esc(c.nome)}</option>`).join('');
}

function obterArquivoFotoCatalogoSelecionado() {
  const fotoCamera = document.getElementById('catFotoCamera');
  const fotoGaleria = document.getElementById('catFotoGaleria');
  return (fotoCamera.files && fotoCamera.files[0]) || (fotoGaleria.files && fotoGaleria.files[0]) || null;
}

function limparFotoCatalogoSelecionada() {
  document.getElementById('catFotoCamera').value = '';
  document.getElementById('catFotoGaleria').value = '';
}

async function atualizarPreviewFotoCatalogo(file) {
  if (!file) return;
  const preview = document.getElementById('catFotoPreview');
  preview.src = await fileToDataUrl(file);
  preview.classList.remove('hidden');
}

async function renderizarListaProdutosCat() {
  const catId = document.getElementById('selectCategoriaCat').value;
  const cat = catalogo.find(c => c.id === catId);
  const container = document.getElementById('listaProdutosCat');
  if (!cat) {
    container.innerHTML = '<div class="resumo-vazio">Selecione uma seção.</div>';
    return;
  }
  if (!cat.produtos.length) {
    container.innerHTML = '<div class="resumo-vazio">Nenhum produto nesta seção.</div>';
    return;
  }

  const htmlParts = await Promise.all(cat.produtos.map(async prod => {
    const foto = await dbGet('fotosProd', prod.id);
    const thumb = foto && foto.dataUrl
      ? `<img src="${foto.dataUrl}" class="produto-cat-thumb" alt="thumb" />`
      : '<div class="produto-cat-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);">📦</div>';
    return `
      <div class="produto-cat-item" data-cat-prod="${prod.id}">
        <div class="produto-cat-info">
          ${thumb}
          <div class="produto-cat-name">${esc(prod.nome)}</div>
        </div>
        <div class="produto-cat-acoes">
          <button class="btn-mini" data-edit-prod="${prod.id}">Nome</button>
          <button class="btn-mini" data-photo-prod="${prod.id}">Foto</button>
          <button class="btn-mini" data-del-prod="${prod.id}">Excluir</button>
        </div>
      </div>`;
  }));

  container.innerHTML = htmlParts.join('');

  container.querySelectorAll('[data-edit-prod]').forEach(btn => {
    btn.addEventListener('click', () => renomearProduto(btn.dataset.editProd));
  });
  container.querySelectorAll('[data-del-prod]').forEach(btn => {
    btn.addEventListener('click', () => excluirProduto(btn.dataset.delProd));
  });
  container.querySelectorAll('[data-photo-prod]').forEach(btn => {
    btn.addEventListener('click', () => trocarFotoProduto(btn.dataset.photoProd));
  });
}

async function confirmarCat() {
  const catId = document.getElementById('selectCategoriaCat').value;
  const nome = document.getElementById('catNome').value.trim();
  if (!nome) {
    await mostrarAvisoTematico('Digite o nome do produto antes de salvar no catálogo.', {
      title: 'Produto sem nome',
      subtitle: 'O catálogo precisa dessa informação',
      icon: '📦',
      confirmText: 'Vou preencher'
    });
    document.getElementById('catNome').focus();
    return;
  }

  const cat = catalogo.find(c => c.id === catId);
  if (!cat) return;
  const prodId = `p-custom-${Date.now()}`;
  cat.produtos.push({ id: prodId, nome, fotoUrl: null });

  const fotoSelecionada = obterArquivoFotoCatalogoSelecionado();
  if (fotoSelecionada) {
    const dataUrl = await fileToDataUrl(fotoSelecionada);
    await dbSet('fotosProd', prodId, dataUrl, fotoSelecionada.type || 'image/*');
  }

  salvarCatalogo();
  salvarOrcamentos();
  mostrarToast(`Produto "${nome}" adicionado ao catálogo.`, { type: 'success', icon: '✅' });
  document.getElementById('catNome').value = '';
  limparFotoCatalogoSelecionada();
  const preview = document.getElementById('catFotoPreview');
  preview.classList.add('hidden');
  preview.src = '';
  await renderizarListaProdutosCat();

  if (document.getElementById('telaEditor').classList.contains('active') && orcamentoAtual) {
    renderizarCategorias();
    await renderizarProdutos(document.getElementById('searchProdutos').value);
  }
}

async function pedirNovaCategoria() {
  const result = await solicitarCamposDialogo({
    title: 'Nova seção',
    subtitle: 'Organize seu catálogo',
    message: 'Defina o nome e o emoji da nova seção para manter o catálogo consistente.',
    icon: '🧩',
    confirmText: 'Criar seção',
    fields: [
      { name: 'nome', label: 'Nome da seção', value: '', placeholder: 'Ex: Automação residencial', required: true },
      { name: 'emoji', label: 'Emoji', value: '📦', placeholder: 'Ex: 🏠', required: true }
    ]
  });
  if (!result.confirmed) return;

  const nome = result.values.nome;
  const emoji = result.values.emoji || '📦';
  const id = 'cat-' + Date.now();
  catalogo.push({ id, nome: nome.trim(), emoji: emoji.trim(), produtos: [] });
  salvarCatalogo();
  preencherSelectCategoriaCat();
  document.getElementById('selectCategoriaCat').value = id;
  renderizarListaProdutosCat();
  renderizarCategorias();
  mostrarToast(`Seção "${nome}" criada com sucesso.`, { type: 'success', icon: '🧩' });
}

async function renomearCategoriaSelecionada() {
  const sel = document.getElementById('selectCategoriaCat');
  const cat = catalogo.find(c => c.id === sel.value);
  if (!cat) return;

  const result = await solicitarCamposDialogo({
    title: 'Editar seção',
    subtitle: 'Atualize os dados da categoria',
    message: 'Altere o nome e o emoji para manter a navegação clara no catálogo.',
    icon: '✏️',
    confirmText: 'Salvar alterações',
    fields: [
      { name: 'nome', label: 'Nome da seção', value: cat.nome, required: true },
      { name: 'emoji', label: 'Emoji', value: cat.emoji || '📦', required: true }
    ]
  });
  if (!result.confirmed) return;

  const novoNome = result.values.nome;
  const novoEmoji = result.values.emoji || cat.emoji;
  cat.nome = novoNome.trim();
  cat.emoji = novoEmoji.trim() || cat.emoji;
  salvarCatalogo();
  preencherSelectCategoriaCat();
  sel.value = cat.id;
  renderizarCategorias();
  mostrarToast('Seção atualizada.', { type: 'success', icon: '✏️' });
}

async function excluirCategoriaSelecionada() {
  const sel = document.getElementById('selectCategoriaCat');
  const cat = catalogo.find(c => c.id === sel.value);
  if (!cat) return;
  const confirmado = await confirmarAcao(`A seção "${cat.nome}" e todos os produtos dela serão removidos.`, {
    title: 'Excluir seção',
    subtitle: 'Os produtos vinculados também serão apagados',
    icon: '⚠️',
    confirmText: 'Excluir seção',
    variant: 'danger'
  });
  if (!confirmado) return;

  for (const prod of cat.produtos) {
    await dbDelete('fotosProd', prod.id);
    removerProdutoDosOrcamentos(prod.id);
  }

  catalogo = catalogo.filter(c => c.id !== cat.id);
  if (!catalogo.length) {
    catalogo.push({ id: 'cat-default', nome: 'Geral', emoji: '📦', produtos: [] });
  }

  salvarCatalogo();
  salvarOrcamentos();
  preencherSelectCategoriaCat();
  sel.value = catalogo[0].id;
  categoriaAtiva = catalogo[0].id;
  renderizarCategorias();
  await renderizarProdutos(document.getElementById('searchProdutos').value.trim());
  await renderizarListaProdutosCat();
  atualizarResumo();
  mostrarToast('Seção excluída.', { type: 'info', icon: '🗑️' });
}

async function renomearProduto(prodId) {
  const prod = localizarProduto(prodId);
  if (!prod) return;

  const result = await solicitarCamposDialogo({
    title: 'Renomear produto',
    subtitle: 'Atualize o nome exibido no catálogo',
    message: 'O novo nome também será refletido nos orçamentos já existentes.',
    icon: '🏷️',
    confirmText: 'Salvar nome',
    fields: [
      { name: 'nome', label: 'Nome do produto', value: prod.nome, required: true }
    ]
  });
  if (!result.confirmed) return;

  const novoNome = result.values.nome;

  const cat = catalogo.find(c => c.id === prod.catId);
  const alvo = cat ? cat.produtos.find(p => p.id === prodId) : null;
  if (!alvo) return;
  alvo.nome = novoNome.trim();
  sincronizarNomeProdutoNosOrcamentos(prodId, alvo.nome);
  salvarCatalogo();
  salvarOrcamentos();
  renderizarListaProdutosCat();
  renderizarProdutos(document.getElementById('searchProdutos').value.trim());
  atualizarResumo();
  mostrarToast('Nome do produto atualizado.', { type: 'success', icon: '🏷️' });
}

async function excluirProduto(prodId) {
  const prod = localizarProduto(prodId);
  if (!prod) return;
  const confirmado = await confirmarAcao(`O produto "${prod.nome}" será removido do catálogo e dos orçamentos.`, {
    title: 'Excluir produto',
    subtitle: 'Essa remoção afeta itens já cadastrados',
    icon: '🧨',
    confirmText: 'Excluir produto',
    variant: 'danger'
  });
  if (!confirmado) return;

  const cat = catalogo.find(c => c.id === prod.catId);
  if (!cat) return;
  cat.produtos = cat.produtos.filter(p => p.id !== prodId);
  await dbDelete('fotosProd', prodId);
  removerProdutoDosOrcamentos(prodId);
  salvarCatalogo();
  salvarOrcamentos();
  await renderizarListaProdutosCat();
  await renderizarProdutos(document.getElementById('searchProdutos').value.trim());
  atualizarResumo();
  mostrarToast('Produto excluído.', { type: 'info', icon: '🧨' });
}

function trocarFotoProduto(prodId) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    const dataUrl = await fileToDataUrl(file);
    await dbSet('fotosProd', prodId, dataUrl, file.type || 'image/*');
    await renderizarListaProdutosCat();
    await renderizarProdutos(document.getElementById('searchProdutos').value.trim());
    mostrarToast('Foto do produto atualizada.', { type: 'success', icon: '📷' });
  };
  input.click();
}

async function enviarWhatsapp() {
  const nome = document.getElementById('nomeCliente').value.trim() || 'Cliente';
  const endereco = document.getElementById('enderecoCliente').value.trim();
  const data = document.getElementById('dataOrcamento').value;
  const notas = document.getElementById('notasOrcamento').value.trim();
  const itens = orcamentoAtual.itens;
  const qtdMidias = (orcamentoAtual.midiasLocal || []).length;

  if (!itens.length) {
    await mostrarAlertaTematico('Adicione ao menos um item ao orçamento antes de enviar para o WhatsApp.', {
      title: 'Orçamento vazio',
      subtitle: 'Nada para compartilhar ainda',
      icon: '📭',
      confirmText: 'Vou adicionar'
    });
    return;
  }

  const dataFmt = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '';
  let msg = '*📋 ORÇAMENTO*\n';
  msg += '━━━━━━━━━━━━━━━━━━━━\n';
  msg += `👤 *Cliente:* ${nome}\n`;
  if (endereco) msg += `📍 *Endereço:* ${endereco}\n`;
  if (dataFmt) msg += `📅 *Data:* ${dataFmt}\n`;
  if (qtdMidias) msg += `🎬 *Mídias no app:* ${qtdMidias}\n`;
  msg += '━━━━━━━━━━━━━━━━━━━━\n';
  msg += '\n*🛒 ITENS DO ORÇAMENTO:*\n\n';

  let total = 0;
  itens.forEach(item => {
    const subtotal = (item.precoUnit || 0) * (item.qtd || 1);
    total += subtotal;
    const icone = item.tipo === 'temp' ? '🔧' : '📦';
    msg += `${icone} *${item.nome}*\n`;
    msg += `   Qtd: ${item.qtd}`;
    if (item.precoUnit) {
      msg += `  |  Unit: R$ ${item.precoUnit.toFixed(2).replace('.', ',')}`;
      msg += `  |  Subtotal: R$ ${subtotal.toFixed(2).replace('.', ',')}`;
    }
    msg += '\n\n';
  });

  msg += '━━━━━━━━━━━━━━━━━━━━\n';
  if (total > 0) {
    msg += `💰 *TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*\n`;
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
  }
  if (notas) {
    msg += `\n📝 *Observações:*\n${notas}\n`;
    msg += '━━━━━━━━━━━━━━━━━━━━\n';
  }

  msg += '\n_Orçamento gerado pelo Orçamentos Mactel_ 📋';
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
}

function formatarEnderecoDaAPI(data) {
  const addr = data && data.address ? data.address : null;
  if (!addr) return data && data.display_name ? data.display_name : '';

  const rua = addr.road || addr.pedestrian || addr.footway || addr.cycleway || '';
  const numero = addr.house_number || '';
  const bairro = addr.suburb || addr.neighbourhood || addr.quarter || '';
  const cidade = addr.city || addr.town || addr.village || addr.municipality || '';
  const estado = addr.state || '';

  const linha1 = [rua, numero].filter(Boolean).join(', ');
  const linha2 = [bairro, cidade, estado].filter(Boolean).join(' - ');
  return [linha1, linha2].filter(Boolean).join(', ');
}

async function buscarEnderecoPorCoordenadas(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json'
    }
  });
  if (!res.ok) throw new Error('Falha ao consultar o endereço.');
  const data = await res.json();
  return formatarEnderecoDaAPI(data);
}

async function usarLocalizacaoAtual() {
  const btn = document.getElementById('btnLocalizacaoAtual');
  const inputEndereco = document.getElementById('enderecoCliente');
  if (!btn || !inputEndereco) return;

  if (!('geolocation' in navigator)) {
    await mostrarAvisoTematico('Seu dispositivo ou navegador não oferece suporte à geolocalização para preencher o endereço automaticamente.', {
      title: 'Geolocalização indisponível',
      subtitle: 'Preencha o endereço manualmente',
      icon: '📍'
    });
    return;
  }

  const textoOriginal = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Localizando...';

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      });
    });

    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;

    let endereco = '';
    try {
      endereco = await buscarEnderecoPorCoordenadas(lat, lon);
    } catch (_) {
      endereco = '';
    }

    if (!endereco) {
      endereco = `Localização atual: ${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }

    inputEndereco.value = endereco;
    if (orcamentoAtual) orcamentoAtual.enderecoCliente = endereco;
    mostrarToast('Localização preenchida com sucesso.', { type: 'success', icon: '📍' });
  } catch (error) {
    let msg = 'Não foi possível obter a localização.';
    if (error && error.code === 1) msg = 'Permissão de localização negada.';
    if (error && error.code === 2) msg = 'Localização indisponível no momento.';
    if (error && error.code === 3) msg = 'Tempo de localização esgotado.';
    await mostrarAvisoTematico(msg, {
      title: 'Falha ao localizar',
      subtitle: 'O preenchimento automático não foi concluído',
      icon: '🛰️'
    });
  } finally {
    btn.disabled = false;
    btn.textContent = textoOriginal;
  }
}

let toastTimer = null;
function mostrarToast(msg, options = {}) {
  const type = options.type || 'success';
  const icon = options.icon || (type === 'error' ? '⚠️' : type === 'info' ? 'ℹ️' : '✨');
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast-app';
    toast.innerHTML = '<span class="toast-app-icone"></span><span class="toast-app-texto"></span>';
    document.body.appendChild(toast);
  }

  toast.dataset.type = type;
  toast.querySelector('.toast-app-icone').textContent = icon;
  toast.querySelector('.toast-app-texto').textContent = msg;
  toast.classList.add('visivel');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('visivel'); }, 2200);
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function init() {
  await abrirDB();
  await carregarDadosPersistidos();
  aplicarTema(carregarTema());
  await renderizarListaOrcamentos();

  document.getElementById('btnTema').addEventListener('click', alternarTema);
  document.getElementById('btnNovoOrcamento').addEventListener('click', () => abrirOrcamento(null));
  document.getElementById('btnVoltar').addEventListener('click', async () => {
    mostrarTela('telaLista');
    await renderizarListaOrcamentos(document.getElementById('searchOrcamentos').value);
  });
  document.getElementById('btnSalvar').addEventListener('click', salvarOrcamentoAtual);
  document.getElementById('btnWhatsapp').addEventListener('click', enviarWhatsapp);
  document.getElementById('btnLocalizacaoAtual').addEventListener('click', usarLocalizacaoAtual);

  document.getElementById('searchOrcamentos').addEventListener('input', async e => {
    await renderizarListaOrcamentos(e.target.value);
  });

  document.getElementById('searchProdutos').addEventListener('input', e => {
    clearTimeout(searchProdutoTimer);
    searchProdutoTimer = setTimeout(() => {
      renderizarProdutos(e.target.value.trim());
    }, 180);
  });

  document.getElementById('inputFotoCamera').addEventListener('change', onMidiaSelecionada);
  document.getElementById('inputVideoCamera').addEventListener('change', onMidiaSelecionada);
  document.getElementById('inputMidiaGaleria').addEventListener('change', onMidiaSelecionada);

  document.getElementById('btnAddTemp').addEventListener('click', abrirModalTemp);
  document.getElementById('btnCancelTemp').addEventListener('click', fecharModalTemp);
  document.getElementById('btnConfirmTemp').addEventListener('click', confirmarTemp);
  document.getElementById('modalTemp').addEventListener('click', e => {
    if (e.target === document.getElementById('modalTemp')) fecharModalTemp();
  });

  document.getElementById('btnCatalogo').addEventListener('click', abrirModalCatalogo);
  document.getElementById('btnCancelCat').addEventListener('click', fecharModalCatalogo);
  document.getElementById('btnConfirmCat').addEventListener('click', confirmarCat);
  document.getElementById('btnNovaCategoria').addEventListener('click', pedirNovaCategoria);
  document.getElementById('btnRenomearCategoria').addEventListener('click', renomearCategoriaSelecionada);
  document.getElementById('btnExcluirCategoria').addEventListener('click', excluirCategoriaSelecionada);
  document.getElementById('selectCategoriaCat').addEventListener('change', renderizarListaProdutosCat);
  document.getElementById('modalCatalogo').addEventListener('click', e => {
    if (e.target === document.getElementById('modalCatalogo')) fecharModalCatalogo();
  });

  const onFotoCatalogoSelecionada = async e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    await atualizarPreviewFotoCatalogo(file);
  };

  document.getElementById('catFotoCamera').addEventListener('change', onFotoCatalogoSelecionada);
  document.getElementById('catFotoGaleria').addEventListener('change', onFotoCatalogoSelecionada);

  document.getElementById('tempNome').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('tempPreco').focus();
  });
  document.getElementById('tempPreco').addEventListener('keydown', e => {
    if (e.key === 'Enter') confirmarTemp();
  });
}

document.addEventListener('DOMContentLoaded', init);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
