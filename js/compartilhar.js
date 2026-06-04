(function (global) {
  'use strict';

  const LABEL_FORMATO = {
    pdf: 'PDF',
    xlsx: 'Excel',
    csv: 'CSV'
  };

  let arquivoAtual = null;
  let listaAtual = [];

  const modal = document.getElementById('modalCompartilhar');
  const tituloEl = document.getElementById('compartilharTitulo');
  const textoEl = document.getElementById('compartilharTexto');
  const btnFechar = document.getElementById('btnFecharCompartilhar');
  const avisoEl = document.getElementById('compartilharAviso');

  function montarTextoResumo(lista) {
    if (!lista.length) return 'Solicitacao de pre-ordem';
    if (lista.length === 1) {
      return 'Pre-ordem — Mat. ' + lista[0].matricula +
        ' | Frota ' + lista[0].frota +
        ' | ' + lista[0].unidade.nome;
    }
    return lista.length + ' solicitacoes de pre-ordem';
  }

  function gerarArquivo(lista, formato) {
    if (formato === 'pdf') return global.PreOrdemPDF.gerarBlob(lista);
    if (formato === 'xlsx') return global.PreOrdemPlanilha.gerarBlobXLSX(lista);
    if (formato === 'csv') return global.PreOrdemPlanilha.gerarBlobCSV(lista);
    return null;
  }

  function baixarArquivo() {
    if (!arquivoAtual) return;
    const url = URL.createObjectURL(arquivoAtual.blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = arquivoAtual.filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  function podeCompartilharArquivo() {
    if (!navigator.share || !arquivoAtual) return false;
    try {
      const file = new File(
        [arquivoAtual.blob],
        arquivoAtual.filename,
        { type: arquivoAtual.mime }
      );
      return !navigator.canShare || navigator.canShare({ files: [file] });
    } catch {
      return false;
    }
  }

  function atualizarAviso() {
    if (!avisoEl) return;
    if (podeCompartilharArquivo()) {
      avisoEl.hidden = true;
      return;
    }
    avisoEl.hidden = false;
    avisoEl.textContent =
      'No computador, use Baixar e envie o arquivo. No celular, Compartilhar abre WhatsApp, e-mail e outros apps.';
  }

  function lockBody(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function fecharModal() {
    if (modal) modal.hidden = true;
    lockBody(false);
    arquivoAtual = null;
    listaAtual = [];
  }

  function abrirModal(lista, formato) {
    if (!modal) {
      baixarFallback(lista, formato);
      return;
    }

    try {
      arquivoAtual = gerarArquivo(lista, formato);
      listaAtual = lista;
    } catch (err) {
      alert('Nao foi possivel gerar o arquivo. Tente novamente.');
      return;
    }

    if (!arquivoAtual) return;

    tituloEl.textContent = 'Exportar ' + (LABEL_FORMATO[formato] || formato);
    textoEl.textContent = montarTextoResumo(lista);
    atualizarAviso();
    modal.hidden = false;
    lockBody(true);
  }

  function baixarFallback(lista, formato) {
    if (formato === 'pdf') {
      if (lista.length === 1) global.PreOrdemPDF.exportar(lista[0]);
      else global.PreOrdemPDF.exportarTodas(lista);
    } else {
      global.PreOrdemPlanilha.exportar(lista, formato);
    }
  }

  async function compartilharNativo() {
    if (!arquivoAtual) return;

    const file = new File(
      [arquivoAtual.blob],
      arquivoAtual.filename,
      { type: arquivoAtual.mime }
    );

    if (!navigator.share) {
      baixarArquivo();
      alert('Compartilhamento nao disponivel neste navegador. O arquivo foi baixado.');
      return;
    }

    try {
      const payload = {
        title: 'Solicitacao de Pre-Ordem',
        text: montarTextoResumo(listaAtual),
        files: [file]
      };
      if (navigator.canShare && !navigator.canShare(payload)) {
        throw new Error('cannot share files');
      }
      await navigator.share(payload);
      fecharModal();
    } catch (err) {
      if (err.name === 'AbortError') return;
      baixarArquivo();
      alert('Use o arquivo baixado para enviar pelo WhatsApp, e-mail ou outro app.');
    }
  }

  function abrirWhatsApp() {
    const texto = montarTextoResumo(listaAtual) +
      '\n\nArquivo: ' + (arquivoAtual ? arquivoAtual.filename : 'pre-ordem');

    if (podeCompartilharArquivo()) {
      compartilharNativo();
      return;
    }

    baixarArquivo();
    window.open(
      'https://wa.me/?text=' + encodeURIComponent(texto + '\n\n(Anexe o arquivo baixado)'),
      '_blank',
      'noopener,noreferrer'
    );
  }

  function abrirEmail() {
    const assunto = encodeURIComponent('Solicitacao de Pre-Ordem');
    const corpo = encodeURIComponent(
      montarTextoResumo(listaAtual) +
        '\n\nAnexo: ' + (arquivoAtual ? arquivoAtual.filename : '') +
        '\n\n(O arquivo sera baixado — anexe-o na mensagem.)'
    );

    baixarArquivo();
    window.location.href = 'mailto:?subject=' + assunto + '&body=' + corpo;
  }

  function init() {
    if (!modal) return;

    btnFechar.addEventListener('click', fecharModal);
    modal.querySelector('.modal__overlay').addEventListener('click', fecharModal);

    modal.querySelectorAll('[data-acao]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const acao = btn.dataset.acao;
        if (acao === 'share') compartilharNativo();
        else if (acao === 'download') {
          baixarArquivo();
          fecharModal();
        } else if (acao === 'whatsapp') abrirWhatsApp();
        else if (acao === 'email') abrirEmail();
      });
    });
  }

  global.PreOrdemCompartilhar = {
    abrir: abrirModal,
    init: init
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
