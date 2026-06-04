(function (global) {
  'use strict';

  const SpeechRecognition =
    global.SpeechRecognition || global.webkitSpeechRecognition;

  let recognition = null;
  let ouvindo = false;
  let textarea = null;
  let btnFalar = null;
  let statusEl = null;

  function suportado() {
    return !!SpeechRecognition;
  }

  function atualizarStatus(texto, tipo) {
    if (!statusEl) return;
    statusEl.hidden = !texto;
    statusEl.textContent = texto;
    statusEl.className = 'field__voz-status';
    if (tipo) statusEl.classList.add('field__voz-status--' + tipo);
  }

  function inserirTexto(fala) {
    if (!textarea || !fala.trim()) return;

    const atual = textarea.value;
    const precisaEspaco = atual.length > 0 && !/\s$/.test(atual);
    textarea.value = atual + (precisaEspaco ? ' ' : '') + fala.trim();

    if (global.PreOrdemTexto && global.PreOrdemTexto.aplicarMaiusculas) {
      global.PreOrdemTexto.aplicarMaiusculas(textarea);
    }

    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function criarReconhecimento() {
    const rec = new SpeechRecognition();
    rec.lang = 'pt-BR';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = function () {
      ouvindo = true;
      if (btnFalar) {
        btnFalar.classList.add('btn-voz--ativo');
        btnFalar.setAttribute('aria-pressed', 'true');
        btnFalar.querySelector('.btn-voz__label').textContent = 'Parar';
      }
      atualizarStatus('Ouvindo… fale em português (Brasil)', 'ouvindo');
    };

    rec.onresult = function (event) {
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const trecho = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          inserirTexto(trecho);
        } else {
          interim += trecho;
        }
      }

      if (ouvindo) {
        if (interim.trim()) {
          atualizarStatus('Ouvindo: ' + interim.trim(), 'ouvindo');
        } else {
          atualizarStatus('Ouvindo… fale em português (Brasil)', 'ouvindo');
        }
      }
    };

    rec.onerror = function (event) {
      const erros = {
        'not-allowed': 'Permissão do microfone negada. Libere o microfone nas configurações do navegador.',
        'service-not-allowed': 'Microfone bloqueado nesta página. Use HTTPS ou permita o acesso.',
        'no-speech': 'Nenhuma fala detectada. Tente novamente.',
        'audio-capture': 'Microfone não encontrado ou indisponível.',
        'network': 'Erro de rede. Verifique sua conexão.',
        'aborted': ''
      };

      const msg = erros[event.error] || 'Não foi possível usar o reconhecimento de voz.';
      if (msg) atualizarStatus(msg, 'erro');
      parar();
    };

    rec.onend = function () {
      if (ouvindo) {
        try {
          rec.start();
        } catch {
          parar();
        }
      }
    };

    return rec;
  }

  function iniciar() {
    if (!suportado()) {
      atualizarStatus(
        'Seu navegador não suporta ditado por voz. Use Chrome, Edge ou Safari no celular.',
        'erro'
      );
      return;
    }

    if (ouvindo) {
      parar();
      return;
    }

    if (!recognition) recognition = criarReconhecimento();

    try {
      recognition.start();
      textarea.focus();
    } catch {
      atualizarStatus('Aguarde um instante e toque em Falar novamente.', 'erro');
    }
  }

  function parar() {
    ouvindo = false;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        /* ignorar */
      }
    }
    if (btnFalar) {
      btnFalar.classList.remove('btn-voz--ativo');
      btnFalar.setAttribute('aria-pressed', 'false');
      btnFalar.querySelector('.btn-voz__label').textContent = 'Falar';
    }
    atualizarStatus('', '');
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
