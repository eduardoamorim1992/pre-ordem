(function (global) {
  'use strict';

  const MARGIN = 12;
  const ROW_H = 10;
  const FONT_HEADER = 7;
  const FONT_CELL = 6.5;

  const HEADERS = [
    'PRE-ORDEM',
    'DATA/HORA',
    'UNIDADE',
    'MATRICULA',
    'FROTA',
    'SISTEMA',
    'DESCRICAO DO SERVICO'
  ];

  /* Larguras das colunas (paisagem A4 = 297mm) */
  /* Coluna PRE-ORDEM mais larga para preenchimento manual */
  const COL_WIDTHS = [30, 28, 40, 24, 20, 36, 89];

  function formatarData(iso) {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function obterColunas(dados) {
    if (global.PreOrdemTexto && global.PreOrdemTexto.dadosParaColunas) {
      return global.PreOrdemTexto.dadosParaColunas(dados);
    }
    return [
      (dados.preOrdem || '').trim(),
      formatarData(dados.dataHora),
      dados.unidade.codigo + ' - ' + dados.unidade.nome,
      dados.matricula,
      dados.frota,
      dados.sistema.codigo + ' - ' + dados.sistema.nome,
      String(dados.descricao || '').toUpperCase()
    ];
  }

  function truncar(doc, texto, larguraMm) {
    let t = String(texto || '');
    const larguraPt = larguraMm * 2.83;
    while (doc.getTextWidth(t) > larguraPt - 4 && t.length > 0) {
      t = t.slice(0, -1);
    }
    if (t.length < String(texto || '').length) t = t.slice(0, -1) + '…';
    return t;
  }

  function textoCelula(doc, texto, x, y, largura) {
    doc.text(truncar(doc, texto, largura), x + 1.5, y + 6.5);
  }

  function desenharCabecalho(doc, y) {
    const totalW = COL_WIDTHS.reduce(function (a, b) { return a + b; }, 0);
    let x = MARGIN;

    doc.setFillColor(37, 99, 235);
    doc.rect(MARGIN, y, totalW, ROW_H, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(FONT_HEADER);
    doc.setFont(undefined, 'bold');
    doc.setDrawColor(255, 255, 255);

    HEADERS.forEach(function (titulo, i) {
      doc.rect(x, y, COL_WIDTHS[i], ROW_H, 'S');
      doc.text(titulo, x + 1.5, y + 6.5);
      x += COL_WIDTHS[i];
    });

    return y + ROW_H;
  }

  function desenharTabela(doc, lista, startY) {
    let y = startY;
    const totalW = COL_WIDTHS.reduce(function (a, b) { return a + b; }, 0);

    y = desenharCabecalho(doc, y);

    lista.forEach(function (dados, idx) {
      if (y > 185) {
        doc.addPage();
        y = desenharCabecalho(doc, MARGIN + 8);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(241, 245, 249);
        doc.rect(MARGIN, y, totalW, ROW_H, 'F');
      }

      const celulas = obterColunas(dados);
      let x = MARGIN;

      doc.setTextColor(30, 41, 59);
      doc.setFontSize(FONT_CELL);
      doc.setFont(undefined, 'normal');
      doc.setDrawColor(203, 213, 225);

      celulas.forEach(function (valor, i) {
        doc.rect(x, y, COL_WIDTHS[i], ROW_H, 'S');
        textoCelula(doc, valor, x, y, COL_WIDTHS[i]);
        x += COL_WIDTHS[i];
      });

      y += ROW_H;
    });

    return y;
  }

  function nomeArquivo(dados, lista) {
    const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    if (lista && lista.length > 1) return 'pre-ordens-' + data + '.pdf';
    const mat = (dados.matricula || 'solicitacao').replace(/\W/g, '');
    return 'pre-ordem-' + mat + '-' + data + '.pdf';
  }

  function criarDocumentoPDF(lista) {
    if (!global.jspdf || !global.jspdf.jsPDF) {
      throw new Error('Biblioteca PDF nao carregada');
    }

    const { jsPDF } = global.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    doc.setFontSize(11);
    doc.setTextColor(37, 99, 235);
    doc.setFont(undefined, 'bold');
    doc.text('SOLICITACOES DE PRE-ORDEM', MARGIN, 14);
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(100, 116, 139);

    if (lista.length > 1) {
      doc.text(
        lista.length + ' registro(s) · Exportado em ' + formatarData(new Date().toISOString()),
        MARGIN,
        20
      );
    } else {
      doc.text('Exportado em ' + formatarData(new Date().toISOString()), MARGIN, 20);
    }

    desenharTabela(doc, lista, 26);
    return doc;
  }

  function gerarBlob(lista) {
    if (!lista.length) return null;
    const doc = criarDocumentoPDF(lista);
    const dados = lista.length === 1 ? lista[0] : null;
    return {
      blob: doc.output('blob'),
      filename: nomeArquivo(dados, lista.length > 1 ? lista : null),
      mime: 'application/pdf'
    };
  }

  function baixarBlob(info) {
    const url = URL.createObjectURL(info.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = info.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportarPreOrdemPDF(dados) {
    try {
      baixarBlob(gerarBlob([dados]));
    } catch {
      alert('Biblioteca PDF nao carregada. Verifique sua conexao.');
    }
  }

  function exportarTodasPDF(lista) {
    if (!lista.length) return;
    try {
      baixarBlob(gerarBlob(lista));
    } catch {
      alert('Biblioteca PDF nao carregada. Verifique sua conexao.');
    }
  }

  global.PreOrdemPDF = {
    exportar: exportarPreOrdemPDF,
    exportarTodas: exportarTodasPDF,
    gerarBlob: gerarBlob,
    formatarData: formatarData,
    HEADERS: HEADERS
  };
})(window);
