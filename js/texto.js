(function (global) {
  'use strict';

  const LT_API = 'https://api.languagetool.org/v2/check';

  /** Apenas maiúsculas — preserva espaços enquanto digita */
  function paraDigitacao(texto) {
    return String(texto || '').toLocaleUpperCase('pt-BR');
  }

  /** Normaliza ao salvar: maiúsculas + espaços extras */
  function normalizarDescricao(texto) {
    return paraDigitacao(texto)
      .trim()
      .replace(/\s+/g, ' ');
  }

  function aplicarMaiusculas(elemento) {
    const inicio = elemento.selectionStart;
    const fim = elemento.selectionEnd;
    const valor = paraDigitacao(elemento.value);
    if (elemento.value !== valor) {
      elemento.value = valor;
      const len = valor.length;
      elemento.setSelectionRange(
        Math.min(inicio, len),
        Math.min(fim, len)
      );
    }
  }

  function valorColunaPreOrdem(dados) {
    return (dados.preOrdem || '').trim();
  }

  function montarLinhaResumo(dados) {
    const partes = [
      valorColunaPreOrdem(dados),
      PreOrdemPDF.formatarData(dados.dataHora),
      dados.unidade.codigo + ' — ' + dados.unidade.nome,
      dados.matricula,
      dados.frota,
      dados.sistema.codigo + ' — ' + dados.sistema.nome,
      normalizarDescricao(dados.descricao)
    ];
    return partes.join(' | ');
  }

  function dadosParaColunas(dados) {
    return [
      valorColunaPreOrdem(dados),
      PreOrdemPDF.formatarData(dados.dataHora),
      dados.unidade.codigo + ' — ' + dados.unidade.nome,
      dados.matricula,
      dados.frota,
      dados.sistema.codigo + ' — ' + dados.sistema.nome,
      normalizarDescricao(dados.descricao)
    ];
  }

  function aplicarCorrecoes(texto, matches) {
    let resultado = texto;
    const ordenadas = matches
      .filter(function (m) {
        return m.replacements && m.replacements.length > 0;
      })
      .sort(function (a, b) {
        return b.offset - a.offset;
      });

    ordenadas.forEach(function (match) {
      const substituto = match.replacements[0].value;
      resultado =
        resultado.slice(0, match.offset) +
        substituto +
        resultado.slice(match.offset + match.length);
    });

    return normalizarDescricao(resultado);
  }

  function corrigirOrtografia(texto) {
    const limpo = normalizarDescricao(texto);
    if (!limpo) return Promise.resolve(limpo);

    return fetch(LT_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        text: limpo,
        language: 'pt-BR',
        enabledOnly: 'false'
      })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('API indisponivel');
        return res.json();
      })
      .then(function (data) {
        if (!data.matches || !data.matches.length) return limpo;
        return aplicarCorrecoes(limpo, data.matches);
      })
      .catch(function () {
        return limpo;
      });
  }

  global.PreOrdemTexto = {
    paraDigitacao: paraDigitacao,
    normalizarDescricao: normalizarDescricao,
    aplicarMaiusculas: aplicarMaiusculas,
    valorColunaPreOrdem: valorColunaPreOrdem,
    montarLinhaResumo: montarLinhaResumo,
    dadosParaColunas: dadosParaColunas,
    corrigirOrtografia: corrigirOrtografia
  };
})(window);
