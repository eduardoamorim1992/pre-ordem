(function (global) {
  'use strict';

  const SpeechRecognition =
    global.SpeechRecognition || global.webkitSpeechRecognition;

  const IDIOMA = 'pt-BR';
  const PAUSA_REINICIO_MS = 400;

  let textarea = null;
  let btnFalar = null;
  let statusEl = null;
  let recognition = null;

  let ouvindo = false;
  let reiniciando = false;
  let timerReinicio = null;

  /** Texto já confirmado (finais) nesta sessão de ditado */
  let textoConfirmado = '';
  /** Índice do último resultado final já aplicado */
  let indiceFinalProcessado = 0;
  /** Evita inserir o mesmo trecho duas vezes seguidas */
  let ultimoTrechoFinal = '';

  function suportado() {
    return !!SpeechRecognition;
  }

  function paraMaiusculas(texto) {
    if (global.PreOrdemTexto && global.PreOrdemTexto.paraDigitacao) {
      return global.PreOrdemTexto.paraDigitacao(texto);
    }
    return String(texto || '').toLocaleUpperCase('pt-BR');
  }

  function juntarTexto(base, extra) {
    const b = String(base || '').trimEnd();
    const e = String(extra || '').trim();
    if (!e) return b;
    if (!b) return e;
    return b + ' ' + e;
  }

  function atualizarStatus(texto, tipo) {
    if (!statusEl) return;
    statusEl.hidden = !texto;
    statusEl.textContent = texto;
    statusEl.className = 'field__voz-status';
    if (tipo) statusEl.classList.add('field__voz-status--' + tipo);
  }

  function atualizarBotao(ativo) {
    if (!btnFalar) return;
    btnFalar.classList.toggle('btn-voz--ativo', ativo);
    btnFalar.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    btnFalar.querySelector('.btn-voz__label').textContent = ativo ? 'Parar' : 'Falar';
  }

  function refletirNoCampo(previewInterim) {
    if (!textarea) return;

    const interim = String(previewInterim || '').trim();
    const exibicao = paraMaiusculas(juntarTexto(textoConfirmado, interim));

    if (textarea.value !== exibicao) {
      textarea.value = exibicao;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }

    textarea.scrollTop = textarea.scrollHeight;
  }

  function aplicarTrechoFinal(trecho) {
    const limpo = String(trecho || '').trim();
    if (!limpo) return;

    if (limpo === ultimoTrechoFinal) return;

    const confirmadoUpper = paraMaiusculas(textoConfirmado);
    const trechoUpper = paraMaiusculas(limpo);

    if (confirmadoUpper.endsWith(trechoUpper)) return;

    textoConfirmado = juntarTexto(textoConfirmado, limpo);
    ultimoTrechoFinal = limpo;
    refletirNoCampo('');
  }

  function resetarSessao(manterTexto) {
    indiceFinalProcessado = 0;
    ultimoTrechoFinal = '';
    if (!manterTexto) {
      textoConfirmado = textarea ? textarea.value : '';
    } else {
      textoConfirmado = textarea ? textarea.value : textoConfirmado;
    }
  }

  function vincularEventos(rec) {
    rec.onstart = function () {
      reiniciando = false;
      indiceFinalProcessado = 0;
      ultimoTrechoFinal = '';
      atualizarBotao(true);
      atualizarStatus('Ouvindo… fale em português (Brasil)', 'ouvindo');
    };

    rec.onresult = function (event) {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const resultado = event.results[i];
        const trecho = resultado[0].transcript;

        if (resultado.isFinal) {
          if (i >= indiceFinalProcessado) {
            aplicarTrechoFinal(trecho);
            indiceFinalProcessado = i + 1;
          }
        } else {
          interim += trecho;
        }
      }

      refletirNoCampo(interim);

      if (interim.trim()) {
        atualizarStatus('Ouvindo: ' + paraMaiusculas(interim.trim()), 'ouvindo');
      } else if (ouvindo) {
        atualizarStatus('Ouvindo… fale em português (Brasil)', 'ouvindo');
      }
    };

    rec.onerror = function (event) {
      if (event.error === 'no-speech' && ouvindo) {
        agendarReinicio();
        return;
      }

      if (event.error === 'aborted') return;

      const erros = {
        'not-allowed':
          'Permissão do microfone negada. Libere o microfone nas configurações.',
        'service-not-allowed':
          'Microfone bloqueado. Use HTTPS ou permita o acesso ao site.',
        'audio-capture': 'Microfone não encontrado ou indisponível.',
        network: 'Erro de rede. Verifique sua conexão.'
      };

      const msg = erros[event.error] || 'Não foi possível usar o reconhecimento de voz.';
      atualizarStatus(msg, 'erro');
      parar(true);
    };

    rec.onend = function () {
      refletirNoCampo('');

      if (ouvindo && !reiniciando) {
        agendarReinicio();
      } else if (!ouvindo) {
        atualizarBotao(false);
      }
    };
  }

  function criarReconhecimento() {
    const rec = new SpeechRecognition();
    rec.lang = IDIOMA;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    vincularEventos(rec);
    return rec;
  }

  function agendarReinicio() {
    if (!ouvindo || reiniciando) return;

    clearTimeout(timerReinicio);
    timerReinicio = setTimeout(function () {
      if (!ouvindo) return;

      reiniciando = true;
      textoConfirmado = textarea ? textarea.value : textoConfirmado;
      indiceFinalProcessado = 0;
      ultimoTrechoFinal = '';

      try {
        if (recognition) {
          try {
            recognition.abort();
          } catch {
            /* ignorar */
          }
        }
        recognition = criarReconhecimento();
        recognition.start();
      } catch {
        reiniciando = false;
        parar(true);
        atualizarStatus('Toque em Falar para continuar o ditado.', 'ouvindo');
      }
    }, PAUSA_REINICIO_MS);
  }

  function iniciar() {
    if (!suportado()) {
      atualizarStatus(
        'Seu navegador não suporta ditado por voz. Use Chrome, Edge ou Safari.',
        'erro'
      );
      return;
    }

    if (ouvindo) {
      parar(true);
      return;
    }

    clearTimeout(timerReinicio);
    ouvindo = true;
    reiniciando = false;
    resetarSessao(true);
    textoConfirmado = textarea.value;

    recognition = criarReconhecimento();

    try {
      recognition.start();
      textarea.focus();
    } catch {
      ouvindo = false;
      atualizarStatus('Aguarde um instante e toque em Falar novamente.', 'erro');
    }
  }

  function parar(silencioso) {
    ouvindo = false;
    reiniciando = false;
    clearTimeout(timerReinicio);

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        try {
          recognition.abort();
        } catch {
          /* ignorar */
        }
      }
    }

    refletirNoCampo('');
    atualizarBotao(false);

    if (!silencioso) {
      atualizarStatus('', '');
    }
  }

  function init(config) {
    textarea = config.textarea;
    btnFalar = config.botao;
    statusEl = config.status;

    if (!textarea || !btnFalar) return;

    if (!suportado()) {
      btnFalar.disabled = true;
      btnFalar.title = 'Ditado por voz não disponível neste navegador';
      return;
    }

    btnFalar.addEventListener('click', iniciar);
    btnFalar.setAttribute('aria-pressed', 'false');
  }

  global.PreOrdemVoz = {
    init: init,
    parar: parar,
    suportado: suportado
  };
})(window);
