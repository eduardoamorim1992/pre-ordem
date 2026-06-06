const { query, init, toApi } = require('../lib/db');

function validar(dados) {
  return dados && dados.id && dados.protocolo && dados.dataHora &&
    dados.unidade && dados.unidade.codigo && dados.unidade.nome &&
    dados.matricula && dados.frota &&
    dados.sistema && dados.sistema.codigo && dados.sistema.nome &&
    dados.descricao;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await init();

  if (req.method === 'GET') {
    const status = req.query.status;
    const sql = status
      ? 'SELECT * FROM solicitacoes WHERE status = $1 ORDER BY data_hora DESC'
      : 'SELECT * FROM solicitacoes ORDER BY data_hora DESC';
    const params = status ? [status] : [];
    const { rows } = await query(sql, params);
    return res.status(200).json(rows.map(toApi));
  }

  if (req.method === 'POST') {
    const dados = req.body;
    if (!validar(dados)) return res.status(400).json({ error: 'Dados incompletos.' });

    const preOrdem = String(dados.preOrdem || '').trim();
    const status = preOrdem ? 'lancada' : 'pendente';
    const agora = new Date().toISOString();

    await query(
      `INSERT INTO solicitacoes
        (id,protocolo,pre_ordem,data_hora,unidade_codigo,unidade_nome,matricula,frota,sistema_codigo,sistema_nome,descricao,status,atualizado_em)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [dados.id, dados.protocolo, preOrdem, dados.dataHora,
       dados.unidade.codigo, dados.unidade.nome, dados.matricula, dados.frota,
       dados.sistema.codigo, dados.sistema.nome, dados.descricao, status, agora]
    );

    return res.status(201).json({ ...dados, preOrdem, status, atualizadoEm: agora });
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
