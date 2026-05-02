/**
 * Modo magia (espectáculo): activar con pantalla en 0 y pulsar AC dos veces
 * → breve "10" y "0". En modo activo, "=" muestra un resultado forzado.
 * Desactivar: con modo activo y todo limpio, pulsar AC dos veces otra vez.
 *
 * Cambia MAGIC_TARGET para el número que quieras forzar al pulsar "=".
 */
(function () {
  const MAGIC_TARGET = "205261915";
  const ACTIVATE_MS = 680;
  const ZERO_HOLD_MS = 380;

  let magicOn = false;
  let animating = false;
  let armingAcCount = 0;
  let exitAcCount = 0;

  function api() {
    return window.CalculatorAPI;
  }

  function resetSequences() {
    armingAcCount = 0;
    exitAcCount = 0;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function playActivationSequence() {
    const a = api();
    if (!a) return;
    animating = true;
    resetSequences();
    a.setDisplayRaw("10");
    await sleep(ACTIVATE_MS);
    a.setDisplayRaw("0");
    await sleep(ZERO_HOLD_MS);
    animating = false;
    magicOn = true;
    a.updateClearButtonLabel();
    try {
      navigator.vibrate(18);
    } catch (_) {
      /* opcional */
    }
  }

  function interceptClear() {
    const a = api();
    if (!a) return false;
    if (animating) return true;

    if (!a.isAllClearState()) {
      resetSequences();
      return false;
    }

    if (magicOn) {
      exitAcCount += 1;
      if (exitAcCount >= 2) {
        magicOn = false;
        resetSequences();
        a.clearCalculator();
        return true;
      }
      return true;
    }

    armingAcCount += 1;
    if (armingAcCount === 1) {
      return true;
    }
    if (armingAcCount === 2) {
      resetSequences();
      void playActivationSequence();
      return true;
    }
    return true;
  }

  function interceptEquals() {
    const a = api();
    if (!a) return false;
    if (animating) return true;
    if (!magicOn) return false;
    return a.tryForceEquals(MAGIC_TARGET);
  }

  function boot() {
    if (!window.CalculatorAPI) return;

    window.CalculatorMagic = {
      interceptClear,
      interceptEquals,
      isMagicOn: () => magicOn,
    };

    document.querySelector(".buttons")?.addEventListener(
      "click",
      (ev) => {
        if (!ev.target.closest("#clear")) resetSequences();
      },
      true
    );

    document.querySelector(".top-nav")?.addEventListener("click", resetSequences);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
