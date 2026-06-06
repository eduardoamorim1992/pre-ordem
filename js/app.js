(function () {
  'use strict';

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
  let filtroUnidadeAtivo = '';
  let mostrarArquivadas = false;

  const form = document.getElementById('preOrdemForm');
  const viewForm = document.getElementById('viewForm');
  const viewHistorico = document.getElementById('viewHistorico');
  const viewLancamento = document.getElementById('viewLancamento');
  const tabNova = document.getElementById('tabNova');
  const tabHistorico = document.getElementById('tabHistorico');
  const tabLancamento = document.getElementById('tabLancamento');
  const historicoLista = document.getElementById('historicoLista');
  const historicoVazio = document.getElementById('historicoVazio');
  const historicoCount = document.getElementById('historicoCount');
  const lancamentoLista = document.getElementById('lancamentoLista');
  const lancamentoVazio = document.getElementById('lancamentoVazio');
  const lancamentoCount = document.getElementById('lancamentoCount');
  const badgeHistorico = document.getElementById('badgeHistorico');
  const historicoExports = document.getElementById('historicoExports');
  const btnIrParaForm = document.getElementById('btnIrParaForm');
  const btnLimpar = document.getElementById('btnLimpar');
  const btnEnviar = document.getElementById('btnEnviar');
  const btnCorrigirTexto = document.getElementById('btnCorrigirTexto');
  const modalSucesso = document.getElementById('modalSucesso');
  const modalResumoLinha = document.getElementById('modalResumoLinha');
  const btnNovaSolicitacao = document.getElementById('btnNovaSolicitacao');
  const btnVerHistorico = document.getElementById('btnVerHistorico');
  const modalSucessoContent = document.querySelector('#modalSucesso .modal__content--blue');
  const modalDetalhe = document.getElementById('modalDetalhe');
  const btnFecharDetalhe = document.getElementById('btnFecharDetalhe');
  const btnArquivarDetalhe = document.getElementById('btnArquivarDetalhe');
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

  // ===== API =====

  async function apiListar(status) {
    const url = status ? '/api/solicitacoes?status=' + status : '/api/solicitacoes';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao carregar solicitações');
    return res.json();
  }

  async function apiSalvar(dados) {
    const res = await fetch('/api/solicitacoes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Erro ao salvar solicitação');
    return res.json();
  }

  async function apiExcluir(id) {
    const res = await fetch('/api/solicitacoes/' + id, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir solicitação');
  }

  async function apiArquivar(id) {
    const res = await fetch('/api/solicitacoes/' + id + '/arquivar', { method: 'PATCH', headers: { 'Content-Type': 'application/json' } });
    if (!res.ok) throw new Error('Erro ao arquivar');
    return res.json();
  }

  async function apiLancar(id, preOrdem) {
    const res = await fetch('/api/solicitacoes/' + id + '/pre-ordem', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preOrdem: preOrdem })
    });
    if (!res.ok) throw new Error('Erro ao lançar pré-ordem');
    return res.json();
  }

  // ===== Preferências =====

  function carregarPreferencias() {
    try {
      const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}');
      if (prefs.unidade && fields.unidade.querySelector('option[value="' + prefs.unidade + '"]')) {
        fields.unidade.value = prefs.unidade;
      }
      if (prefs.matricula) {
        fields.matricula.value = somenteNumeros(prefs.matricula);
      }
    } catch { /* ignora */ }
  }

  function salvarPreferencias() {
    if (!fields.unidade.value || !fields.matricula.value.trim()) return;
    localStorage.setItem(PREFS_KEY, JSON.stringify({
      unidade: fields.unidade.value,
      matricula: somenteNumeros(fields.matricula.value)
    }));
  }

  // ===== Utilidades =====

  function somenteNumeros(valor) {
    return String(valor || '').replace(/\D/g, '');
  }

  function aplicarSomenteNumeros(elemento) {
    const limpo = somenteNumeros(elemento.value);
    if (elemento.value !== limpo) elemento.value = limpo;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function formatarData(iso) {
    return PreOrdemPDF.formatarData(iso);
  }

  function gerarProtocolo() {
    const data = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const seq = String(Math.floor(Math.random() * 9000) + 1000);
    return 'PO-' + data + '-' + seq;
  }

  // ===== Validação =====

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

  // ===== UI helpers =====

  function setLoading(loading) {
    btnEnviar.disabled = loading;
    btnEnviar.classList.toggle('btn--loading', loading);
  }

  function lockBody(lock) {
    document.body.style.overflow = lock ? 'hidden' : '';
  }

  function showToast(msg, tipo) {
    var existing = document.getElementById('appToast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'app-toast app-toast--' + (tipo || 'info');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(function () { toast.classList.add('app-toast--visible'); }, 10);
    setTimeout(function () {
      toast.classList.remove('app-toast--visible');
      setTimeout(function () { toast.remove(); }, 300);
    }, 4000);
  }

  function showModalSucesso(dados) {
    modalResumoLinha.textContent = PreOrdemTexto.montarLinhaResumo(dados);
    modalSucesso.hidden = false;
    lockBody(true);
  }

  function hideModalSucesso() {
    modalSucesso.hidden = true;
    lockBody(false);
  }

  function badgeStatus(status) {
    const labels = { pendente: 'Pendente', lancada: 'Lançada' };
    return '<span class="status-badge status-badge--' + status + '">' + (labels[status] || status) + '</span>';
  }

  // ===== Tabs =====

  function showTab(tab) {
    const views = { form: viewForm, historico: viewHistorico, lancamento: viewLancamento };
    const tabs = { form: tabNova, historico: tabHistorico, lancamento: tabLancamento };

    Object.keys(views).forEach(function (key) {
      const active = key === tab;
      views[key].classList.toggle('view--active', active);
      views[key].hidden = !active;
      tabs[key].classList.toggle('tabs__btn--active', active);
      tabs[key].setAttribute('aria-selected', active);
    });

    if (tab === 'historico') renderHistorico();
    if (tab === 'lancamento') renderLancamento();
  }

  // ===== Histórico =====

  async function renderHistorico() {
    historicoLista.innerHTML = '<div class="loading-state">Carregando...</div>';
    historicoVazio.hidden = true;

    let lista = [];
    try {
      lista = await apiListar();
    } catch {
      historicoLista.innerHTML = '<div class="error-state">Erro ao carregar. Verifique se o servidor está rodando.</div>';
      return;
    }

    lista = lista.filter(function (i) {
      return mostrarArquivadas ? i.status === 'arquivada' : i.status !== 'arquivada';
    });

    const btnToggle = document.getElementById('btnToggleArquivadas');
    if (btnToggle) {
      btnToggle.classList.toggle('btn-arquivadas--active', mostrarArquivadas);
      btnToggle.innerHTML = mostrarArquivadas
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Ocultar arquivadas'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Ver arquivadas';
    }

    historicoLista.innerHTML = '';
    const vazio = lista.length === 0;
    historicoVazio.hidden = !vazio;
    historicoLista.hidden = vazio;
    historicoExports.querySelectorAll('.btn-export').forEach(function (btn) {
      btn.disabled = vazio;
    });

    const n = lista.length;
    historicoCount.textContent = n === 1 ? '1 solicitação' : n + ' solicitações';
    badgeHistorico.textContent = n;
    badgeHistorico.hidden = n === 0;

    const tabela = document.createElement('div');
    tabela.className = 'hist-table card';
    tabela.innerHTML =
      '<div class="hist-table__head">' +
        '<span>Status</span>' +
        '<span>Data</span>' +
        '<span>Frota</span>' +
        '<span>Matrícula</span>' +
        '<span>Sistema</span>' +
        '<span>Descrição</span>' +
        '<span>Pré-Ordem</span>' +
        '<span></span>' +
      '</div>';

    lista.forEach(function (item) {
      const row = document.createElement('div');
      row.className = 'hist-table__row';
      const arquivada = item.status === 'arquivada';
      row.classList.toggle('hist-row--arquivada', arquivada);
      row.dataset.frota = item.frota;
      row.dataset.matricula = item.matricula;
      row.innerHTML =
        '<span class="hist-cell hist-cell--status">' + badgeStatus(item.status) + '</span>' +
        '<span class="hist-cell hist-cell--data">' + escapeHtml(formatarData(item.dataHora)) + '</span>' +
        '<span class="hist-cell hist-cell--num">' + escapeHtml(item.frota) + '</span>' +
        '<span class="hist-cell hist-cell--num">' + escapeHtml(item.matricula) + '</span>' +
        '<span class="hist-cell" title="' + escapeAttr(item.sistema.nome) + '">' + escapeHtml(item.sistema.nome) + '</span>' +
        '<span class="hist-cell hist-cell--desc" title="' + escapeAttr(item.descricao) + '">' + escapeHtml(item.descricao) + '</span>' +
        '<span class="hist-cell hist-cell--po">' + (item.preOrdem ? escapeHtml(item.preOrdem) : '<span class="hist-empty">—</span>') + '</span>' +
        '<span class="hist-cell hist-cell--actions">' +
          '<button type="button" class="btn btn--ghost btn--xs hist-btn-ver" data-action="ver" data-id="' + item.id + '">Ver</button>' +
        '</span>';
      tabela.appendChild(row);
    });

    historicoLista.appendChild(tabela);

    historicoLista._lista = lista;
  }

  // ===== Lançamento =====

  async function renderLancamento() {
    lancamentoLista.innerHTML = '<div class="loading-state">Carregando...</div>';
    lancamentoVazio.hidden = true;

    let lista = [];
    try {
      lista = await apiListar('pendente');
    } catch {
      lancamentoLista.innerHTML = '<div class="error-state">Erro ao carregar. Verifique se o servidor está rodando.</div>';
      return;
    }

    if (filtroUnidadeAtivo) {
      lista = lista.filter(function (item) {
        return item.unidade.codigo === filtroUnidadeAtivo;
      });
    }

    lancamentoLista.innerHTML = '';
    const vazio = lista.length === 0;
    lancamentoVazio.hidden = !vazio;
    lancamentoLista.hidden = vazio;
    lancamentoCount.textContent = vazio ? '0 pendentes' : lista.length + (lista.length === 1 ? ' pendente' : ' pendentes');

    lista.forEach(function (item) {
      const card = document.createElement('article');
      card.className = 'lancamento-card card';
      card.dataset.id = item.id;
      card.innerHTML =
        '<div class="lancamento-card__info">' +
          '<div class="lancamento-card__header">' +
            '<span class="lancamento-card__protocolo">' + escapeHtml(item.protocolo) + '</span>' +
            '<span class="card-data">' + escapeHtml(formatarData(item.dataHora)) + '</span>' +
          '</div>' +
          '<div class="lancamento-card__detalhes">' +
            '<span class="detalhe-chip">Frota <strong>' + escapeHtml(item.frota) + '</strong></span>' +
            '<span class="detalhe-chip">Matrícula <strong>' + escapeHtml(item.matricula) + '</strong></span>' +
            '<span class="detalhe-chip">' + escapeHtml(item.sistema.nome) + '</span>' +
          '</div>' +
          '<p class="lancamento-card__descricao">' + escapeHtml(item.descricao) + '</p>' +
        '</div>' +
        '<div class="lancamento-card__form">' +
          '<div class="lancamento-input-wrap">' +
            '<input type="text" class="field__input lancamento-input" inputmode="numeric" pattern="[0-9]*" placeholder="Nº da Pré-Ordem" aria-label="Número da pré-ordem">' +
            '<button type="button" class="btn btn--primary btn--sm lancamento-btn" data-id="' + item.id + '">Lançar</button>' +
          '</div>' +
          '<span class="lancamento-error" role="alert"></span>' +
        '</div>';
      lancamentoLista.appendChild(card);
    });
  }

  // ===== Detalhe =====

  function abrirDetalhe(item) {
    detalheAtual = item;
    detalheProtocolo.textContent = item.protocolo;
    detalheData.textContent = formatarData(item.dataHora);
    detalheLinha.textContent = PreOrdemTexto.montarLinhaResumo(item);
    if (btnArquivarDetalhe) {
      const isArq = item.status === 'arquivada';
      btnArquivarDetalhe.innerHTML = isArq
        ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Desarquivar'
        : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg> Arquivar';
    }
    modalDetalhe.hidden = false;
    lockBody(true);
  }

  function fecharDetalhe() {
    modalDetalhe.hidden = true;
    detalheAtual = null;
    if (modalSucesso.hidden) lockBody(false);
  }

  async function excluirSolicitacao(id) {
    if (!confirm('Deseja excluir esta solicitação?')) return;
    try {
      await apiExcluir(id);
    } catch {
      alert('Erro ao excluir. Tente novamente.');
      return;
    }
    fecharDetalhe();
    renderHistorico();
  }

  function exportarDados(lista, formato) {
    if (!lista || !lista.length) return;
    if (typeof PreOrdemCompartilhar !== 'undefined') {
      PreOrdemCompartilhar.abrir(lista, formato);
      return;
    }
    if (formato === 'pdf') {
      if (lista.length === 1) PreOrdemPDF.exportar(lista[0]);
      else PreOrdemPDF.exportarTodas(lista);
    } else {
      PreOrdemPlanilha.exportar(lista, formato);
    }
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

  // ===== Eventos de formulário =====

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (typeof PreOrdemVoz !== 'undefined') PreOrdemVoz.parar();
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

      salvarPreferencias();
      const dados = getFormData();

      apiSalvar(dados).then(function (salvo) {
        ultimaSolicitacao = salvo;
        setLoading(false);
        form.reset();
        clearErrors();
        carregarPreferencias();
        showModalSucesso(salvo);
      }).catch(function () {
        setLoading(false);
        showToast('Falha ao enviar. Verifique sua conexão e tente novamente.', 'erro');
      });
    });
  });

  btnLimpar.addEventListener('click', function () {
    if (typeof PreOrdemVoz !== 'undefined') PreOrdemVoz.parar();
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

  // ===== Eventos de tabs =====

  tabNova.addEventListener('click', function () { showTab('form'); });
  tabHistorico.addEventListener('click', function () { showTab('historico'); });
  tabLancamento.addEventListener('click', function () { showTab('lancamento'); });
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

  // ===== Eventos de modal sucesso =====

  if (modalSucessoContent) {
    modalSucessoContent.addEventListener('click', function (e) {
      const btn = e.target.closest('.btn--export-modal');
      if (!btn || !ultimaSolicitacao) return;
      exportarDados([ultimaSolicitacao], btn.dataset.formato);
    });
  }

  modalSucesso.querySelector('.modal__overlay').addEventListener('click', hideModalSucesso);

  // ===== Eventos de detalhe =====

  document.querySelectorAll('.btn--export-detalhe').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (detalheAtual) exportarDados([detalheAtual], btn.dataset.formato);
    });
  });

  btnExcluirDetalhe.addEventListener('click', function () {
    if (detalheAtual) excluirSolicitacao(detalheAtual.id);
  });

  btnFecharDetalhe.addEventListener('click', fecharDetalhe);
  modalDetalhe.querySelector('.modal__overlay').addEventListener('click', fecharDetalhe);

  // ===== Eventos de histórico (delegação) =====

  historicoExports.addEventListener('click', function (e) {
    const btn = e.target.closest('.btn-export');
    if (!btn || btn.disabled) return;
    const lista = historicoLista._lista || [];
    exportarDados(lista, btn.dataset.formato);
  });

  historicoLista.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const lista = historicoLista._lista || [];
    const item = lista.find(function (i) { return i.id === btn.dataset.id; });
    if (!item) return;
    if (btn.dataset.action === 'ver') abrirDetalhe(item);
    if (btn.dataset.action === 'export') exportarDados([item], btn.dataset.formato);
  });

  // ===== Eventos de lançamento (delegação) =====

  lancamentoLista.addEventListener('click', async function (e) {
    const btn = e.target.closest('.lancamento-btn');
    if (!btn) return;

    const card = btn.closest('.lancamento-card');
    const input = card.querySelector('.lancamento-input');
    const errorEl = card.querySelector('.lancamento-error');
    const preOrdem = somenteNumeros(input.value);

    if (!preOrdem) {
      errorEl.textContent = 'Informe o número da pré-ordem';
      input.focus();
      return;
    }

    errorEl.textContent = '';
    btn.disabled = true;
    btn.textContent = 'Lançando...';

    try {
      await apiLancar(btn.dataset.id, preOrdem);
      card.classList.add('lancamento-card--lancada');
      card.innerHTML =
        '<div class="lancamento-card__sucesso">' +
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>' +
          'Pré-Ordem <strong>' + escapeHtml(preOrdem) + '</strong> lançada com sucesso!' +
        '</div>';
      setTimeout(function () {
        card.style.transition = 'opacity 0.4s, transform 0.4s';
        card.style.opacity = '0';
        card.style.transform = 'translateX(30px)';
        setTimeout(function () {
          card.remove();
          const restantes = lancamentoLista.querySelectorAll('.lancamento-card:not(.lancamento-card--lancada)').length;
          const vazio = restantes === 0;
          lancamentoVazio.hidden = !vazio;
          lancamentoLista.hidden = vazio;
          lancamentoCount.textContent = vazio ? '0 pendentes' : restantes + (restantes === 1 ? ' pendente' : ' pendentes');
        }, 400);
      }, 1200);
    } catch {
      errorEl.textContent = 'Erro ao lançar. Tente novamente.';
      btn.disabled = false;
      btn.textContent = 'Lançar';
    }
  });

  lancamentoLista.addEventListener('input', function (e) {
    const input = e.target.closest('.lancamento-input');
    if (!input) return;
    aplicarSomenteNumeros(input);
    const card = input.closest('.lancamento-card');
    if (card) card.querySelector('.lancamento-error').textContent = '';
  });

  // ===== Eventos de campos numéricos =====

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
      fields[nome].value = somenteNumeros(atual.slice(0, inicio) + texto + atual.slice(fim));
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

  fields.unidade.addEventListener('change', salvarPreferencias);
  fields.matricula.addEventListener('blur', salvarPreferencias);

  // ===== Voz =====

  if (typeof PreOrdemVoz !== 'undefined') {
    PreOrdemVoz.init({
      textarea: fields.descricao,
      botao: document.getElementById('btnFalarDescricao'),
      status: document.getElementById('vozStatus')
    });
  }

  // ===== Arquivar =====

  if (btnArquivarDetalhe) {
    btnArquivarDetalhe.addEventListener('click', async function () {
      if (!detalheAtual) return;
      const acao = detalheAtual.status === 'arquivada' ? 'desarquivar' : 'arquivar';
      if (!confirm(acao === 'arquivar' ? 'Arquivar esta solicitação?' : 'Mover de volta para ativas?')) return;
      try {
        await apiArquivar(detalheAtual.id);
        fecharDetalhe();
        renderHistorico();
      } catch {
        alert('Erro ao arquivar. Tente novamente.');
      }
    });
  }

  // ===== Toggle arquivadas =====

  const btnToggleArquivadas = document.getElementById('btnToggleArquivadas');
  if (btnToggleArquivadas) {
    btnToggleArquivadas.addEventListener('click', function () {
      mostrarArquivadas = !mostrarArquivadas;
      renderHistorico();
    });
  }

  // ===== Filtro de unidade (lançamento) =====

  const filtroUnidade = document.getElementById('filtroUnidade');
  if (filtroUnidade) {
    filtroUnidade.addEventListener('click', function (e) {
      const btn = e.target.closest('.filtro-btn');
      if (!btn) return;
      filtroUnidadeAtivo = btn.dataset.unidade;
      filtroUnidade.querySelectorAll('.filtro-btn').forEach(function (b) {
        b.classList.toggle('filtro-btn--active', b === btn);
      });
      renderLancamento();
    });
  }

  // ===== Init =====

  carregarPreferencias();

  apiListar().then(function (lista) {
    const n = lista.length;
    badgeHistorico.textContent = n;
    badgeHistorico.hidden = n === 0;
  }).catch(function () {});
})();
