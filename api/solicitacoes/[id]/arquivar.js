const { query, init, toApi } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await init();

  if (req.method === 'PATCH') {
    const { id } = req.query;
    await query(
      `UPDATE solicitacoes SET status = CASE WHEN status = 'arquivada' THEN 'pendente' ELSE 'arquivada' END, atualizado_em = $1 WHERE id = $2`,
      [new Date().toISOString(), id]
    );
    const { rows } = await query('SELECT * FROM solicitacoes WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Não encontrada.' });
    return res.status(200).json(toApi(rows[0]));
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
