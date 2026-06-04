(function (global) {
  'use strict';

  function obterCabecalhos() {
    if (global.PreOrdemPDF && global.PreOrdemPDF.HEADERS) {
      return global.PreOrdemPDF.HEADERS.slice();
    }
    return [
      'PRE-ORDEM',
      'DATA/HORA',
      'UNIDADE',
      'MATRICULA',
      'FROTA',
      'SISTEMA',
      'DESCRICAO DO SERVICO'
    ];
  }

  function linhasDaLista(lista) {
    return lista.map(function (dados) {
      if (global.PreOrdemTexto && global.PreOrdemTexto.dadosParaColunas) {
        return global.PreOrdemTexto.dadosParaColunas(dados);
      }
      return [
        dados.preOrdem || '',
        dados.dataHora,
        dados.unidade.codigo + ' — ' + dados.unidade.nome,
        dados.matricula,
        dados.frota,
        dados.sistema.codigo + ' — ' + dados.sistema.nome,
        dados.descricao
      ];
    });
  }

  function nomeArquivoBase(lista) {
    const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (lista.length > 1) return 'pre-ordens-' + data;
    const mat = String(lista[0].matricula || 'solicitacao').replace(/\W/g, '') || 'solicitacao';
    return 'pre-ordem-' + mat + '-' + data;
  }

  function baixarBlob(info) {
    const url = URL.createObjectURL(info.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = info.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function escaparCsv(valor) {
    const t = String(valor == null ? '' : valor);
    if (/[",;\n\r]/.test(t)) {
      return '"' + t.replace(/"/g, '""') + '"';
    }
    return t;
  }

  function gerarBlobCSV(lista) {
    if (!lista.length) return null;

    const cabecalhos = obterCabecalhos();
    const linhas = linhasDaLista(lista);
    const sep = ';';
    const corpo = [cabecalhos]
      .concat(linhas)
      .map(function (linha) {
        return linha.map(escaparCsv).join(sep);
      })
      .join('\r\n');

    const bom = '\uFEFF';
    return {
      blob: new Blob([bom + corpo], { type: 'text/csv;charset=utf-8' }),
      filename: nomeArquivoBase(lista) + '.csv',
      mime: 'text/csv'
    };
  }

  function gerarBlobXLSX(lista) {
    if (!lista.length) return null;

    if (!global.XLSX) {
      return gerarBlobCSV(lista);
    }

    const cabecalhos = obterCabecalhos();
    const linhas = linhasDaLista(lista);
    const planilha = global.XLSX.utils.aoa_to_sheet([cabecalhos].concat(linhas));

    planilha['!cols'] = [
      { wch: 14 },
      { wch: 18 },
      { wch: 28 },
      { wch: 12 },
      { wch: 10 },
      { wch: 22 },
      { wch: 50 }
    ];

    const livro = global.XLSX.utils.book_new();
    global.XLSX.utils.book_append_sheet(livro, planilha, 'Pre-Ordens');
    const buffer = global.XLSX.write(livro, { bookType: 'xlsx', type: 'array' });

    return {
      blob: new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }),
      filename: nomeArquivoBase(lista) + '.xlsx',
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  function exportarCSV(lista) {
    const info = gerarBlobCSV(lista);
    if (info) baixarBlob(info);
  }

  function exportarXLSX(lista) {
    if (!lista.length) return;
    if (!global.XLSX) {
      exportarCSV(lista);
      alert('Biblioteca Excel nao carregada. O arquivo foi exportado em CSV.');
      return;
    }
    baixarBlob(gerarBlobXLSX(lista));
  }

  function exportar(lista, formato) {
    if (!lista || !lista.length) return;
    if (formato === 'xlsx') exportarXLSX(lista);
    else if (formato === 'csv') exportarCSV(lista);
  }

  global.PreOrdemPlanilha = {
    exportar: exportar,
    exportarCSV: exportarCSV,
    exportarXLSX: exportarXLSX,
    gerarBlobCSV: gerarBlobCSV,
    gerarBlobXLSX: gerarBlobXLSX
  };
})(window);
