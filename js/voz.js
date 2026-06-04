(function (global) {
  'use strict';

  const SpeechRecognition =
    global.SpeechRecognition || global.webkitSpeechRecognition;

  const IDIOMA = 'pt-BR';
  const GRACA_PARAR_MS = 700;

  let textarea = null;
  let btnFalar = null;
  let statusEl = null;
  let recognition = null;

  let ouvindo = false;
  let dedoAtivo = false;
  let timerParar = null;
  let timerReinicio = null;
  let ignorarClick = false;

  const ehIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const ehMobile =
    ehIOS ||
    /Android/i.test(navigator.userAgent) ||
    global.matchMedia('(max-width: 768px)').matches ||
    global.matchMedia('(pointer: coarse)').matches;

  function suportado() {
    return !!SpeechRecognition;
  }

  function paraMaiusculas(texto) {
    if (global.PreOrdemTexto && global.PreOrdemTexto.paraDigitacao) {
      return global.PreOrdemTexto.paraDigitacao(texto);
    }
    return String(texto || '').toLocaleUpperCase('pt-BR');
  }

  function normalizarParaComparar(texto) {
    return paraMaiusculas(texto).replace(/\s+/g, ' ').trim();
  }

  function atualizarStatus(texto, tipo) {
    if (!statusEl) return;
    statusEl.hidden = !texto;
    statusEl.textContent = texto;
    statusEl.className = 'field__voz-status';
    if (tipo) statusEl.classList.add('field__voz-status--' + tipo);
  }

  function labelBotao(texto) {
    if (!btnFalar) return;
    btnFalar.querySelector('.btn-voz__label').textContent = texto;
  }

  function atualizarBotao(ativo) {
    if (!btnFalar) return;
    btnFalar.classList.toggle('btn-voz--ativo', ativo);
    btnFalar.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    if (ativo) {
      labelBotao(ehMobile ? 'Solte p/ parar' : 'Parar');
    } else {
      labelBotao(ehMobile ? 'Segure p/ falar' : 'Falar');
    }
  }

  function anexarTrecho(trecho) {
    if (!textarea) return;

    const limpo = normalizarParaComparar(trecho);
    if (!limpo) return;

    const atual = normalizarParaComparar(textarea.value);

    if (!atual) {
      textarea.value = limpo;
    } else if (atual === limpo || atual.endsWith(' ' + limpo) || atual.endsWith(limpo)) {
      return;
    } else {
      const palavrasNovas = limpo.split(' ');
      const palavrasAtual = atual.split(' ');
      const n = palavrasNovas.length;
      const ultimas = palavrasAtual.slice(-n).join(' ');
      if (ultimas === limpo) return;

      if (limpo.indexOf(atual) === 0) {
        textarea.value = limpo;
      } else {
        textarea.value = atual + ' ' + limpo;
      }
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.scrollTop = textarea.scrollHeight;
  }

  function criarReconhecimento() {
    const rec = new SpeechRecognition();
    rec.lang = IDIOMA;
    rec.continuous = false;
    rec.interimResults = !ehIOS;
    rec.maxAlternatives = 1;
    return rec;
  }

  function vincularEventos(rec) {
    rec.onstart = function () {
      ouvindo = true;
      atualizarBotao(true);
      atualizarStatus(
        ehMobile
          ? 'Fale agora… solte o botão quando terminar'
          : 'Ouvindo em português (Brasil)…',
        'ouvindo'
      );
    };

    rec.onresult = function (event) {
      let preview = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        const texto = item[0].transcript;

        if (item.isFinal) {
          anexarTrecho(texto);
        } else {
          preview += texto;
        }
      }

      if (preview.trim()) {
        atualizarStatus('Ouvindo: ' + normalizarParaComparar(preview), 'ouvindo');
      }
    };

    rec.onerror = function (event) {
      if (event.error === 'aborted') return;

      if (event.error === 'no-speech') {
        if (dedoAtivo || ouvindo) {
          reiniciarEscuta();
        }
        return;
      }

      const erros = {
        'not-allowed': 'Permita o microfone nas configurações do celular/navegador.',
        'service-not-allowed': 'Microfone bloqueado. Abra o site pelo Chrome ou Safari.',
        'audio-capture': 'Microfone indisponível.',
        network: 'Sem conexão. O ditado precisa de internet no celular.'
      };

      atualizarStatus(erros[event.error] || 'Erro no reconhecimento de voz.', 'erro');
      encerrarEscuta(true);
    };

    rec.onend = function () {
      ouvindo = false;

      if (ehMobile && dedoAtivo) {
        reiniciarEscuta();
        return;
      }

      if (!ehMobile && dedoAtivo) {
        reiniciarEscuta();
        return;
      }

      atualizarBotao(false);

      if (!dedoAtivo) {
        atualizarStatus('Pronto. Segure o microfone para continuar.', 'ouvindo');
        clearTimeout(timerParar);
        timerParar = setTimeout(function () {
          if (!dedoAtivo && !ouvindo) atualizarStatus('', '');
        }, 2500);
      }
    };
  }

  function reiniciarEscuta() {
    if (!dedoAtivo && !ehMobile) return;

    clearTimeout(timerReinicio);
    timerReinicio = setTimeout(function () {
      if (!dedoAtivo && ehMobile) return;
      if (!dedoAtivo && !ouvindo && ehMobile) return;

      try {
        if (recognition) {
          try {
            recognition.abort();
          } catch {
            /* ignorar */
          }
        }
        recognition = criarReconhecimento();
        vincularEventos(recognition);
        recognition.start();
      } catch {
        /* aguarda próximo ciclo */
      }
    }, ehMobile ? 120 : 80);
  }

  function iniciarEscuta() {
    if (!suportado()) {
      atualizarStatus('Use Chrome ou Safari no celular para ditado por voz.', 'erro');
      return;
    }

    clearTimeout(timerParar);
    clearTimeout(timerReinicio);

    try {
      if (recognition && ouvindo) {
        try {
          recognition.abort();
        } catch {
          /* ignorar */
        }
      }

      recognition = criarReconhecimento();
      vincularEventos(recognition);
      recognition.start();
    } catch {
      atualizarStatus('Aguarde um instante e tente de novo.', 'erro');
    }
  }

  function encerrarEscuta(manterStatus) {
    dedoAtivo = false;
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

    ouvindo = false;
    atualizarBotao(false);

    if (!manterStatus) {
      clearTimeout(timerParar);
      timerParar = setTimeout(function () {
        if (!dedoAtivo && !ouvindo) atualizarStatus('', '');
      }, 1500);
    }
  }

  function aoPressionar(e) {
    if (e.cancelable) e.preventDefault();
    ignorarClick = true;
    clearTimeout(timerParar);

    if (dedoAtivo) return;
    dedoAtivo = true;

    if (textarea) textarea.focus({ preventScroll: true });
    iniciarEscuta();
  }

  function aoSoltar(e) {
    if (e && e.cancelable) e.preventDefault();
    dedoAtivo = false;
    ignorarClick = true;
    setTimeout(function () {
      ignorarClick = false;
    }, 450);

    clearTimeout(timerParar);
    timerParar = setTimeout(function () {
      encerrarEscuta(false);
    }, GRACA_PARAR_MS);
  }

  function aoCliqueDesktop(e) {
    if (ignorarClick) {
      e.preventDefault();
      return;
    }

    if (ehMobile) return;

    if (ouvindo || dedoAtivo) {
      encerrarEscuta(false);
    } else {
      dedoAtivo = true;
      iniciarEscuta();
    }
  }

  function init(config) {
    textarea = config.textarea;
    btnFalar = config.botao;
    statusEl = config.status;

    if (!textarea || !btnFalar) return;

    if (!suportado()) {
      btnFalar.disabled = true;
      btnFalar.title = 'Ditado por voz indisponível neste navegador';
      return;
    }

    btnFalar.classList.toggle('btn-voz--mobile', ehMobile);
    labelBotao(ehMobile ? 'Segure p/ falar' : 'Falar');

    if (ehMobile) {
      btnFalar.addEventListener('touchstart', aoPressionar, { passive: false });
      btnFalar.addEventListener('touchend', aoSoltar, { passive: false });
      btnFalar.addEventListener('touchcancel', aoSoltar, { passive: false });
      btnFalar.addEventListener('contextmenu', function (e) {
        e.preventDefault();
      });
    } else {
      btnFalar.addEventListener('mousedown', aoPressionar);
      btnFalar.addEventListener('mouseup', aoSoltar);
      btnFalar.addEventListener('mouseleave', function () {
        if (dedoAtivo) aoSoltar();
      });
    }

    btnFalar.addEventListener('click', aoCliqueDesktop);
    btnFalar.setAttribute('aria-pressed', 'false');

    if (ehMobile && statusEl) {
      atualizarStatus('Segure o botão do microfone e fale.', 'ouvindo');
      setTimeout(function () {
        if (!ouvindo && !dedoAtivo) atualizarStatus('', '');
      }, 4000);
    }
  }

  function parar() {
    encerrarEscuta(true);
    atualizarStatus('', '');
  }

  global.PreOrdemVoz = {
    init: init,
    parar: parar,
    suportado: suportado,
    ehMobile: ehMobile
  };
})(window);
