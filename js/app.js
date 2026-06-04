(function () {
  'use strict';

  const STORAGE_KEY = 'preOrdens';
  const PREFS_KEY = 'preOrdemPrefs';

  const UNIDADES = {
    '1': 'Unidade de Maringá',
    '2': 'Unidade de Paranacity',
    '13': 'Unidade de Terra Rica'
  };

  const SISTEMAS = {
    '1': 'MOTOR',
    '2': 'TRANSMISSÃO',
    '3': 'ESTABILIDADE',
    '4': 'ESTRUTURAL',
    '5': 'ELÉTRICO',
    '6': 'RODAGEM',
    '7': 'CABINE',
    '8': 'INDUSTRIAL CANA',
    '9': 'GERAL'
  };

  let ultimaSolicitacao = null;
  let detalheAtual = null;

  const form = document.getElementById('preOrdemForm');
  const viewForm = document.getElementById('viewForm');
  const viewHistorico = document.getElementById('viewHistorico');
  const tabNova = document.getElementById('tabNova');
  const tabHistorico = document.getElementById('tabHistorico');
  const historicoLista = document.getElementById('historicoLista');
  const historicoVazio = document.getElementById('historicoVazio');
  const historicoCount = document.getElementById('historicoCount');
  const badgeHistorico = document.getElementById('badgeHistorico');
  const historicoExports = document.getElementById('historicoExports');
  const btnIrParaForm = document.getElementById('btnIrParaForm');
  const btnLimpar = document.getElementById('btnLimpar');
  const btnEnviar = document.getElementById('btnEnviar');
  const btnCorrigirTexto = document.getElementById('btnCorrigirTexto');
  const modalSucesso = document.getElementById('modalSucesso');
  const protocoloNumero = document.getElementById('protocoloNumero');
  const modalResumoLinha = document.getElementById('modalResumoLinha');
  const btnNovaSolicitacao = document.getElementById('btnNovaSolicitacao');
  const btnVerHistorico = document.getElementById('btnVerHistorico');
  const modalSucessoContent = document.querySelector('#modalSucesso .modal__content--blue');
  const modalDetalhe = document.getElementById('modalDetalhe');
  const btnFecharDetalhe = document.getElementById('btnFecharDetalhe');
  const btnExcluirDetalhe = document.getElementById('btnExcluirDetalhe');
  const detalheProtocolo = document.getElementById('detalheProtocolo');
  const detalheData = document.getElementById('detalheData');
  const detalheLinha = document.getElementById('detalheLinha');

  const fields = {
    unidade: document.getElementById('unidade'),
    matricula: document.getElementById('matricula'),
    frota: document.getElementById('frota'),
    sistema: document.getElementById('sistema'),
    descricao: document.getElementById('descricao')
  };

  const errors = {
    unidade: document.getElementById('unidadeError'),
    matricula: document.getElementById('matriculaError'),
    frota: document.getElementById('frotaError'),
    sistema: document.getElementById('sistemaError'),
    descricao: document.getElementById('descricaoError')
  };

  function getHistorico() {
    try {
      const lista = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return lista.map(function (item, i) {
        if (!item.id) item.id = item.protocolo || 'legacy-' + i;
        if (item.preOrdem === undefined) item.preOrdem = '';
        if (item.descricao) item.descricao = PreOrdemTexto.normalizarDescricao(item.descricao);
        return item;
      });
    } catch {
      return [];
    }
  }

  function setHistorico(lista) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    atualizarUI();
  }

  function carregarPreferencias() {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (prefs.unidade && fields.unidade.querySelector('option[value="' + prefs.unidade + '"]')) {
        fields.unidade.value = prefs.unidade;
      }
      if (prefs.matricula) {
        fields.matricula.value = somenteNumeros(prefs.matricula);
      }
    } catch {
      /* ignora prefs inválidas */
    }
  }

  function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '');
  }

  function aplicarSomenteNumeros(elemento) {
    const limpo = somenteNumeros(elemento.value);
    if (elemento.value !== limpo) {
      elemento.value = limpo;
    }
  }

  function salvarPreferencias() {
    if (!fields.unidade.value || !fields.matricula.value.trim()) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      unidade: fields.unidade.value,
      matricula: somenteNumeros(fields.matricula.value)
    }));
  }

  function exportarDados(lista, formato) {
    if (!lista || !lista.length) return;
    if (formato === 'pdf') {
      if (lista.length === 1) PreOrdemPDF.exportar(lista[0]);
      else PreOrdemPDF.exportarTodas(lista);
    } else {
      PreOrdemPlanilha.exportar(lista, formato);
    }
  }

  function gerarProtocolo() {
    const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return 'PO-' + data + '-' + seq;
  }

  function formatarData(iso) {
    return PreOrdemPDF.formatarData(iso);
  }

  function clearErrors() {
    Object.keys(fields).forEach(function (key) {
      fields[key].classList.remove('field__input--error');
      errors[key].textContent = '';
    });
  }

  function setError(fieldName, message) {
    fields[fieldName].classList.add('field__input--error');
    errors[fieldName].textContent = message;
  }

  function validate() {
    clearErrors();
    let valid = true;

    if (!fields.unidade.value) {
      setError('unidade', 'Selecione a unidade');
      valid = false;
    }
    const matricula = somenteNumeros(fields.matricula.value);
    fields.matricula.value = matricula;
    if (!matricula) {
      setError('matricula', 'Informe a matrícula (somente números)');
      valid = false;
    }

    const frota = somenteNumeros(fields.frota.value);
    fields.frota.value = frota;
    if (!frota) {
      setError('frota', 'Informe a frota (somente números)');
      valid = false;
    }
    if (!fields.sistema.value) {
      setError('sistema', 'Selecione o sistema');
      valid = false;
    }
    const descricao = PreOrdemTexto.normalizarDescricao(fields.descricao.value);
    fields.descricao.value = descricao;
    if (!descricao) {
      setError('descricao', 'Descreva o serviço');
      valid = false;
    } else if (descricao.length < 10) {
      setError('descricao', 'Mínimo de 10 caracteres');
      valid = false;
    }
    return valid;
  }

  function getFormData() {
    const unidadeCod = fields.unidade.value;
    const sistemaCod = fields.sistema.value;
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      protocolo: gerarProtocolo(),
      preOrdem: '',
      dataHora: new Date().toISOString(),
      unidade: { codigo: unidadeCod, nome: UNIDADES[unidadeCod] },
      matricula: somenteNumeros(fields.matricula.value),
      frota: somenteNumeros(fields.frota.value),
      sistema: { codigo: sistemaCod, nome: SISTEMAS[sistemaCod] },
      descricao: PreOrdemTexto.normalizarDescricao(fields.descricao.value)
    };
  }

  function salvarSolicitacao(dados) {
    const historico = getHistorico();
    historico.unshift(dados);
    setHistorico(historico);
    return dados;
  }

  function setLoading(loading) {
    btnEnviar.disabled = loading;
    btnEnviar.classList.toggle('btn--loading', loading);
  }

  function lockBody(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function showModalSucesso(dados) {
    protocoloNumero.textContent = dados.protocolo;
    modalResumoLinha.textContent = PreOrdemTexto.montarLinhaResumo(dados);
    modalSucesso.hidden = false;
    lockBody(true);
  }

  function hideModalSucesso() {
    modalSucesso.hidden = true;
    lockBody(false);
  }

  function showTab(tab) {
    const isForm = tab === 'form';
    viewForm.classList.toggle('view--active', isForm);
    viewForm.hidden = !isForm;
    viewHistorico.classList.toggle('view--active', !isForm);
    viewHistorico.hidden = isForm;
    tabNova.classList.toggle('tabs__btn--active', isForm);
    tabHistorico.classList.toggle('tabs__btn--active', !isForm);
    tabNova.setAttribute('aria-selected', isForm);
    tabHistorico.setAttribute('aria-selected', !isForm);
    if (!isForm) renderHistorico();
  }

  function renderHistorico() {
    const lista = getHistorico();
    historicoLista.innerHTML = '';

    const vazio = lista.length === 0;
    historicoVazio.hidden = !vazio;
    historicoLista.hidden = vazio;
    historicoExports.querySelectorAll('.btn-export').forEach(function (btn) {
      btn.disabled = vazio;
    });

    const n = lista.length;
    historicoCount.textContent = n === 1 ? '1 solicitação' : n + ' solicitações';

    lista.forEach(function (item) {
      const card = document.createElement('article');
      card.className = 'historico-card card';
      const linha = PreOrdemTexto.montarLinhaResumo(item);
      card.innerHTML =
        '<p class="resumo-linha resumo-linha--card" title="' + escapeAttr(linha) + '">' + escapeHtml(linha) + '</p>' +
        '<div class="historico-card__actions">' +
          '<button type="button" class="btn btn--ghost btn--sm" data-action="ver" data-id="' + item.id + '">Ver</button>' +
          '<button type="button" class="btn btn--outline btn--sm" data-action="export" data-formato="pdf" data-id="' + item.id + '">PDF</button>' +
          '<button type="button" class="btn btn--outline btn--sm" data-action="export" data-formato="xlsx" data-id="' + item.id + '">Excel</button>' +
          '<button type="button" class="btn btn--outline btn--sm" data-action="export" data-formato="csv" data-id="' + item.id + '">CSV</button>' +
        '</div>';
      historicoLista.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;');
  }

  function buscarPorId(id) {
    return getHistorico().find(function (item) {
      return item.id === id || item.protocolo === id;
    });
  }

  function abrirDetalhe(item) {
    detalheAtual = item;
    detalheProtocolo.textContent = item.protocolo;
    detalheData.textContent = formatarData(item.dataHora);
    detalheLinha.textContent = PreOrdemTexto.montarLinhaResumo(item);
    modalDetalhe.hidden = false;
    lockBody(true);
  }

  function fecharDetalhe() {
    modalDetalhe.hidden = true;
    detalheAtual = null;
    if (modalSucesso.hidden) lockBody(false);
  }

  function excluirSolicitacao(id) {
    if (!confirm('Deseja excluir esta solicitação?')) return;
    const lista = getHistorico().filter(function (item) {
      return item.id !== id && item.protocolo !== id;
    });
    setHistorico(lista);
    fecharDetalhe();
  }

  function atualizarUI() {
    const n = getHistorico().length;
    badgeHistorico.textContent = n;
    badgeHistorico.hidden = n === 0;
    if (!viewHistorico.hidden) renderHistorico();
  }

  function corrigirCampoDescricao() {
    const texto = fields.descricao.value;
    if (!texto.trim()) return;

    btnCorrigirTexto.disabled = true;
    btnCorrigirTexto.textContent = 'Corrigindo...';

    PreOrdemTexto.corrigirOrtografia(texto).then(function (corrigido) {
      fields.descricao.value = corrigido;
      btnCorrigirTexto.disabled = false;
      btnCorrigirTexto.textContent = 'Corrigir ortografia';
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) {
      const first = form.querySelector('.field__input--error');
      if (first) first.focus();
      return;
    }

    setLoading(true);

    PreOrdemTexto.corrigirOrtografia(fields.descricao.value).then(function (descricaoCorrigida) {
      fields.descricao.value = descricaoCorrigida;

      if (!validate()) {
        setLoading(false);
        return;
      }

      setTimeout(function () {
        salvarPreferencias();
        const dados = salvarSolicitacao(getFormData());
        ultimaSolicitacao = dados;
        setLoading(false);
        form.reset();
        clearErrors();
        carregarPreferencias();
        showModalSucesso(dados);
      }, 400);
    });
  });

  btnLimpar.addEventListener('click', function () {
    form.reset();
    clearErrors();
    carregarPreferencias();
  });

  btnCorrigirTexto.addEventListener('click', corrigirCampoDescricao);

  fields.descricao.addEventListener('input', function () {
    PreOrdemTexto.aplicarMaiusculas(fields.descricao);
    if (fields.descricao.classList.contains('field__input--error')) {
      fields.descricao.classList.remove('field__input--error');
      errors.descricao.textContent = '';
    }
  });

  tabNova.addEventListener('click', function () { showTab('form'); });
  tabHistorico.addEventListener('click', function () { showTab('historico'); });
  btnIrParaForm.addEventListener('click', function () { showTab('form'); });

  btnNovaSolicitacao.addEventListener('click', function () {
    hideModalSucesso();
    showTab('form');
    carregarPreferencias();
    fields.frota.focus();
  });

  btnVerHistorico.addEventListener('click', function () {
    hideModalSucesso();
    showTab('historico');
  });

  if (modalSucessoContent) {
    modalSucessoContent.addEventListener('click', function (e) {
      const btn = e.target.closest('.btn--export-modal');
      if (!btn || !ultimaSolicitacao) return;
      exportarDados([ultimaSolicitacao], btn.dataset.formato);
    });
  }

  document.querySelectorAll('.btn--export-detalhe').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (detalheAtual) exportarDados([detalheAtual], btn.dataset.formato);
    });
  });

  historicoExports.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-export');
    if (!btn || btn.disabled) return;
    exportarDados(getHistorico(), btn.dataset.formato);
  });

  fields.unidade.addEventListener('change', salvarPreferencias);
  fields.matricula.addEventListener('blur', salvarPreferencias);

  btnExcluirDetalhe.addEventListener('click', function () {
    if (detalheAtual) excluirSolicitacao(detalheAtual.id || detalheAtual.protocolo);
  });

  btnFecharDetalhe.addEventListener('click', fecharDetalhe);
  modalDetalhe.querySelector('.modal__overlay').addEventListener('click', fecharDetalhe);
  modalSucesso.querySelector('.modal__overlay').addEventListener('click', hideModalSucesso);

  historicoLista.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const item = buscarPorId(btn.dataset.id);
    if (!item) return;
    if (btn.dataset.action === 'ver') abrirDetalhe(item);
    if (btn.dataset.action === 'export') exportarDados([item], btn.dataset.formato);
  });

  ['matricula', 'frota'].forEach(function (nome) {
    fields[nome].addEventListener('input', function () {
      aplicarSomenteNumeros(fields[nome]);
      if (fields[nome].classList.contains('field__input--error')) {
        fields[nome].classList.remove('field__input--error');
        errors[nome].textContent = '';
      }
    });
    fields[nome].addEventListener('paste', function (e) {
      e.preventDefault();
      const texto = (e.clipboardData || window.clipboardData).getData('text');
      const inicio = fields[nome].selectionStart;
      const fim = fields[nome].selectionEnd;
      const atual = fields[nome].value;
      fields[nome].value =
        somenteNumeros(atual.slice(0, inicio) + texto + atual.slice(fim));
      fields[nome].dispatchEvent(new Event('input'));
    });
  });

  Object.keys(fields).forEach(function (key) {
    if (key === 'descricao' || key === 'matricula' || key === 'frota') return;
    fields[key].addEventListener('input', function () {
      if (fields[key].classList.contains('field__input--error')) {
        fields[key].classList.remove('field__input--error');
        errors[key].textContent = '';
      }
    });
  });

  carregarPreferencias();
  atualizarUI();
})();
