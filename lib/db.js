const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

async function query(sql, params) {
  return getPool().query(sql, params);
}

async function init() {
  await query(`
    CREATE TABLE IF NOT EXISTS solicitacoes (
      id TEXT PRIMARY KEY,
      protocolo TEXT NOT NULL,
      pre_ordem TEXT DEFAULT '',
      data_hora TEXT NOT NULL,
      unidade_codigo TEXT NOT NULL,
      unidade_nome TEXT NOT NULL,
      matricula TEXT NOT NULL,
      frota TEXT NOT NULL,
      sistema_codigo TEXT NOT NULL,
      sistema_nome TEXT NOT NULL,
      descricao TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      atualizado_em TEXT
    )
  `);
}

function toApi(row) {
  return {
    id: row.id,
    protocolo: row.protocolo,
    preOrdem: row.pre_ordem || '',
    dataHora: row.data_hora,
    unidade: { codigo: row.unidade_codigo, nome: row.unidade_nome },
    matricula: row.matricula,
    frota: row.frota,
    sistema: { codigo: row.sistema_codigo, nome: row.sistema_nome },
    descricao: row.descricao,
    status: row.status,
    atualizadoEm: row.atualizado_em
  };
}

module.exports = { query, init, toApi };
