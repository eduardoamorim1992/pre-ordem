const { query, init, toApi } = require('../../../lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await init();

  if (req.method === 'PATCH') {
    const { id } = req.query;
    const preOrdem = String((req.body && req.body.preOrdem) || '').trim();

    if (!preOrdem) return res.status(400).json({ error: 'Informe o número da pré-ordem.' });

    await query(
      `UPDATE solicitacoes SET pre_ordem = $1, status = 'lancada', atualizado_em = $2 WHERE id = $3`,
      [preOrdem, new Date().toISOString(), id]
    );

    const { rows } = await query('SELECT * FROM solicitacoes WHERE id = $1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    return res.status(200).json(toApi(rows[0]));
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
