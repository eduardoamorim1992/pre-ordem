const fs = require('fs');
const path = require('path');
const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'pre_ordem.db');

fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

db.serialize(function () {
  db.run(`
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
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(ROOT_DIR));

function toApi(row) {
  return {
    id: row.id,
    protocolo: row.protocolo,
    preOrdem: row.pre_ordem || '',
    dataHora: row.data_hora,
    unidade: {
      codigo: row.unidade_codigo,
      nome: row.unidade_nome
    },
    matricula: row.matricula,
    frota: row.frota,
    sistema: {
      codigo: row.sistema_codigo,
      nome: row.sistema_nome
    },
    descricao: row.descricao,
    status: row.status,
    atualizadoEm: row.atualizado_em
  };
}

function validarSolicitacao(dados) {
  return dados &&
    dados.id &&
    dados.protocolo &&
    dados.dataHora &&
    dados.unidade &&
    dados.unidade.codigo &&
    dados.unidade.nome &&
    dados.matricula &&
    dados.frota &&
    dados.sistema &&
    dados.sistema.codigo &&
    dados.sistema.nome &&
    dados.descricao;
}

app.get('/api/solicitacoes', function (req, res) {
  const status = req.query.status;
  const params = [];
  let sql = 'SELECT * FROM solicitacoes';

  if (status) {
    sql += ' WHERE status = ?';
    params.push(status);
  }

  sql += ' ORDER BY data_hora DESC';

  db.all(sql, params, function (err, rows) {
    if (err) {
      res.status(500).json({ error: 'Erro ao listar solicitações.' });
      return;
    }
    res.json(rows.map(toApi));
  });
});

app.post('/api/solicitacoes', function (req, res) {
  const dados = req.body;

  if (!validarSolicitacao(dados)) {
    res.status(400).json({ error: 'Dados da solicitação incompletos.' });
    return;
  }

  const preOrdem = String(dados.preOrdem || '').trim();
  const status = preOrdem ? 'lancada' : 'pendente';

  db.run(
    `INSERT INTO solicitacoes (
      id,
      protocolo,
      pre_ordem,
      data_hora,
      unidade_codigo,
      unidade_nome,
      matricula,
      frota,
      sistema_codigo,
      sistema_nome,
      descricao,
      status,
      atualizado_em
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dados.id,
      dados.protocolo,
      preOrdem,
      dados.dataHora,
      dados.unidade.codigo,
      dados.unidade.nome,
      dados.matricula,
      dados.frota,
      dados.sistema.codigo,
      dados.sistema.nome,
      dados.descricao,
      status,
      new Date().toISOString()
    ],
    function (err) {
      if (err) {
        const code = err.code === 'SQLITE_CONSTRAINT' ? 409 : 500;
        res.status(code).json({ error: 'Erro ao salvar solicitação.' });
        return;
      }
      res.status(201).json(Object.assign({}, dados, {
        preOrdem: preOrdem,
        status: status,
        atualizadoEm: new Date().toISOString()
      }));
    }
  );
});

app.patch('/api/solicitacoes/:id/pre-ordem', function (req, res) {
  const preOrdem = String(req.body && req.body.preOrdem || '').trim();

  if (!preOrdem) {
    res.status(400).json({ error: 'Informe o número da pré-ordem.' });
    return;
  }

  db.run(
    `UPDATE solicitacoes
     SET pre_ordem = ?, status = 'lancada', atualizado_em = ?
     WHERE id = ?`,
    [preOrdem, new Date().toISOString(), req.params.id],
    function (err) {
      if (err) {
        res.status(500).json({ error: 'Erro ao atualizar pré-ordem.' });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: 'Solicitação não encontrada.' });
        return;
      }

      db.get('SELECT * FROM solicitacoes WHERE id = ?', [req.params.id], function (getErr, row) {
        if (getErr || !row) {
          res.status(500).json({ error: 'Erro ao carregar solicitação atualizada.' });
          return;
        }
        res.json(toApi(row));
      });
    }
  );
});

app.delete('/api/solicitacoes/:id', function (req, res) {
  db.run('DELETE FROM solicitacoes WHERE id = ?', [req.params.id], function (err) {
    if (err) {
      res.status(500).json({ error: 'Erro ao excluir solicitação.' });
      return;
    }
    res.status(204).end();
  });
});

app.listen(PORT, function () {
  console.log('Servidor iniciado em http://localhost:' + PORT);
});
