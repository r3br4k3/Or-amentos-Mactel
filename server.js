'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DB_DIR, 'orcamentos.db');

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
      { id: 'p-cerca-8', nome: 'Sirene', fotoUrl: null }
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
      { id: 'p-alarme-8', nome: 'Bateria Auxiliar', fotoUrl: null }
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
      { id: 'p-cam-9', nome: 'Cabo Coaxial (m)', fotoUrl: null }
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
      { id: 'p-ac-5', nome: 'Videoporteiro', fotoUrl: null }
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
      { id: 'p-rede-4', nome: 'Patch Panel', fotoUrl: null }
    ]
  }
];

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

async function ensureDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS app_state (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const rowCatalogo = await get('SELECT valor FROM app_state WHERE chave = ?', ['catalogo']);
  if (!rowCatalogo) {
    await run(
      `INSERT INTO app_state (chave, valor, updated_at) VALUES (?, ?, datetime('now'))`,
      ['catalogo', JSON.stringify(CATALOGO_PADRAO)]
    );
  }

  const rowOrcamentos = await get('SELECT valor FROM app_state WHERE chave = ?', ['orcamentos']);
  if (!rowOrcamentos) {
    await run(
      `INSERT INTO app_state (chave, valor, updated_at) VALUES (?, ?, datetime('now'))`,
      ['orcamentos', JSON.stringify([])]
    );
  }
}

async function readState(chave, fallback) {
  const row = await get('SELECT valor FROM app_state WHERE chave = ?', [chave]);
  if (!row) return fallback;
  try {
    return JSON.parse(row.valor);
  } catch (_) {
    return fallback;
  }
}

async function writeState(chave, payload) {
  await run(
    `
      INSERT INTO app_state (chave, valor, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = datetime('now')
    `,
    [chave, JSON.stringify(payload)]
  );
}

function isCatalogoValido(catalogo) {
  return Array.isArray(catalogo);
}

function isOrcamentosValido(orcamentos) {
  return Array.isArray(orcamentos);
}

app.use(express.json({ limit: '25mb' }));
app.use(express.static(__dirname));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: 'sqlite', at: new Date().toISOString() });
});

app.get('/api/dados', async (_req, res) => {
  try {
    const [catalogo, orcamentos] = await Promise.all([
      readState('catalogo', CATALOGO_PADRAO),
      readState('orcamentos', [])
    ]);

    res.json({ catalogo, orcamentos });
  } catch (error) {
    res.status(500).json({ error: 'Falha ao carregar dados.' });
  }
});

app.put('/api/catalogo', async (req, res) => {
  try {
    const { catalogo } = req.body || {};
    if (!isCatalogoValido(catalogo)) {
      return res.status(400).json({ error: 'Catalogo invalido.' });
    }

    await writeState('catalogo', catalogo);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao salvar catalogo.' });
  }
});

app.put('/api/orcamentos', async (req, res) => {
  try {
    const { orcamentos } = req.body || {};
    if (!isOrcamentosValido(orcamentos)) {
      return res.status(400).json({ error: 'Orcamentos invalidos.' });
    }

    await writeState('orcamentos', orcamentos);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'Falha ao salvar orcamentos.' });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

ensureDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ativo em http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('Falha ao inicializar banco:', error);
    process.exit(1);
  });
