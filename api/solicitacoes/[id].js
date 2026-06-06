const { query, init } = require('../../lib/db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  await init();

  if (req.method === 'DELETE') {
    const { id } = req.query;
    await query('DELETE FROM solicitacoes WHERE id = $1', [id]);
    return res.status(204).end();
  }

  res.status(405).json({ error: 'Método não permitido.' });
};
