const displayEl = document.getElementById("display");
const expressionEl = document.getElementById("expression");
const clearBtn = document.getElementById("clear");
const displayStackEl = document.querySelector(".display-stack");

/** Formato tipo iOS España: miles con punto, decimal con coma. */
const DECIMAL_SEP = ",";
const THOUSANDS_SEP = ".";

let firstNumber = "";
let secondNumber = "";
let currentOperator = "";
let result = "";
let shouldResetDisplay = false;

function stripFormatting(s) {
  let t = String(s).trim().replace(/\u2212/g, "-");
  if (!t || t === "Error") return t;
  const neg = t.startsWith("-");
  if (neg) t = t.slice(1);

  if (t.includes(",")) {
    const idx = t.lastIndexOf(",");
    const intSection = t.slice(0, idx).replace(/\./g, "");
    const decSection = t.slice(idx + 1);
    const normalized =
      decSection !== undefined && decSection !== "" ? `${intSection}.${decSection}` : `${intSection}.`;
    return (neg ? "-" : "") + normalized;
  }

  return (neg ? "-" : "") + t.replace(/\./g, "");
}

function addition(a, b) {
  return a + b;
}

function subtract(a, b) {
  return a - b;
}

function multiply(a, b) {
  return a * b;
}

function divide(a, b) {
  if (b === 0) return "Error";
  return a / b;
}

function operate(num1, operator, num2) {
  num1 = parseFloat(String(num1));
  num2 = parseFloat(String(num2));
  if (Number.isNaN(num1) || Number.isNaN(num2)) return null;

  switch (operator) {
    case "+":
      return addition(num1, num2);
    case "-":
      return subtract(num1, num2);
    case "*":
      return multiply(num1, num2);
    case "/":
      return divide(num1, num2);
    default:
      return null;
  }
}

function operatorSymbol(op) {
  switch (op) {
    case "/":
      return "\u00f7";
    case "*":
      return "\u00d7";
    case "-":
      return "\u2212";
    case "+":
      return "+";
    default:
      return op;
  }
}

/** `raw` usa siempre punto como separador decimal interno. */
function formatWithSeparators(raw) {
  const s = String(raw);
  if (s === "" || s === "Error") return s || "0";
  const negative = s.startsWith("-");
  const body = negative ? s.slice(1) : s;
  const parts = body.split(".");
  let intPart = parts[0] || "0";
  const frac = parts[1];
  intPart = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEP);
  let out = intPart;
  if (frac !== undefined) out += DECIMAL_SEP + frac;
  return (negative ? "-" : "") + out;
}

function getDisplayRaw() {
  return stripFormatting(displayEl.textContent);
}

function isAllClearState() {
  const raw = getDisplayRaw();
  if (raw === "Error") return false;
  if (raw !== "0") return false;
  if (firstNumber !== "" || currentOperator !== "") return false;
  if (expressionEl.textContent !== "") return false;
  return true;
}

function updateClearButtonLabel() {
  if (!clearBtn) return;
  clearBtn.textContent = isAllClearState() ? "AC" : "C";
}

/** Ajusta el tamaño del número principal al ancho (estilo Calculadora iOS). */
function fitDisplayFont() {
  const el = displayEl;
  el.classList.add("display--no-transition");
  try {
    el.style.removeProperty("font-size");
    void el.offsetWidth;
    const maxPx = parseFloat(getComputedStyle(el).fontSize);
    const minPx = 15;
    const available = el.clientWidth;
    if (!Number.isFinite(maxPx) || available < 12) return;

    el.style.fontSize = `${maxPx}px`;
    if (el.scrollWidth <= available + 2) {
      el.style.removeProperty("font-size");
      return;
    }

    let lo = minPx;
    let hi = maxPx;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      el.style.fontSize = `${mid}px`;
      if (el.scrollWidth <= available + 2) lo = mid;
      else hi = mid;
    }
    el.style.fontSize = `${Math.max(minPx, lo)}px`;
  } finally {
    el.classList.remove("display--no-transition");
  }
}

function scheduleFitDisplay() {
  requestAnimationFrame(() => {
    requestAnimationFrame(fitDisplayFont);
  });
}

function setDisplayRaw(value) {
  if (value === "" || value === "Error") {
    displayEl.textContent = value === "Error" ? "Error" : "0";
  } else {
    displayEl.textContent = formatWithSeparators(String(value));
  }
  scheduleFitDisplay();
}

function roundResult(num) {
  if (typeof num === "number") {
    if (!Number.isFinite(num)) return "Error";
    const rounded = Math.round(num * 100000) / 100000;
    return String(rounded);
  }
  return num;
}

function updateExpression() {
  const main = getDisplayRaw();
  if (currentOperator === "") {
    expressionEl.textContent = "";
    updateClearButtonLabel();
    return;
  }

  const left = formatWithSeparators(firstNumber);
  const sym = operatorSymbol(currentOperator);
  let line = left + sym;

  if (!shouldResetDisplay && main !== "" && main !== "Error") {
    line += formatWithSeparators(main);
  } else if (secondNumber !== "") {
    line += formatWithSeparators(secondNumber);
  }

  expressionEl.textContent = line;
  updateClearButtonLabel();
}

function inputDigit(digit) {
  if (shouldResetDisplay && currentOperator === "") {
    expressionEl.textContent = "";
  }
  let raw = shouldResetDisplay ? "" : getDisplayRaw();
  shouldResetDisplay = false;

  if (raw === "0" && digit !== "0") raw = "";
  if (raw === "0" && digit === "0") {
    updateClearButtonLabel();
    return;
  }

  raw += digit;
  setDisplayRaw(raw);
  updateExpression();
}

function inputDecimal() {
  if (shouldResetDisplay && currentOperator === "") {
    expressionEl.textContent = "";
  }
  let raw = shouldResetDisplay ? "0" : getDisplayRaw();
  shouldResetDisplay = false;

  if (raw.includes(".")) {
    updateClearButtonLabel();
    return;
  }
  if (raw === "" || raw === "Error") raw = "0";
  raw += ".";
  setDisplayRaw(raw);
  updateExpression();
}

function inputOperator(operator) {
  const main = getDisplayRaw();
  if (main === "" || main === "Error") {
    updateClearButtonLabel();
    return;
  }

  if (firstNumber === "") {
    firstNumber = main;
    currentOperator = operator;
    shouldResetDisplay = true;
  } else if (currentOperator !== "") {
    secondNumber = main;
    result = operate(firstNumber, currentOperator, secondNumber);
    if (result === "Error" || result === null) {
      setDisplayRaw(result === null ? "0" : "Error");
      clearSoft();
      updateClearButtonLabel();
      return;
    }
    setDisplayRaw(roundResult(result));
    firstNumber = getDisplayRaw();
    currentOperator = operator;
    secondNumber = "";
    shouldResetDisplay = true;
  }
  updateExpression();
}

function inputEquals() {
  if (firstNumber === "" || currentOperator === "") {
    updateClearButtonLabel();
    return;
  }
  secondNumber = getDisplayRaw();
  if (secondNumber === "" || secondNumber === "Error") {
    updateClearButtonLabel();
    return;
  }

  result = operate(firstNumber, currentOperator, secondNumber);
  if (result === "Error" || result === null) {
    setDisplayRaw(result === null ? "0" : "Error");
    clearSoft();
    updateClearButtonLabel();
    return;
  }

  const expr =
    formatWithSeparators(firstNumber) +
    operatorSymbol(currentOperator) +
    formatWithSeparators(secondNumber);

  completeEquals(expr, result);
}

/** Resultado de `=` (real o forzado desde magic.js). */
function completeEquals(expressionText, resultValue) {
  const shown =
    typeof resultValue === "number" && Number.isFinite(resultValue)
      ? roundResult(resultValue)
      : String(resultValue);
  setDisplayRaw(shown);
  expressionEl.textContent = expressionText;
  firstNumber = "";
  secondNumber = "";
  currentOperator = "";
  shouldResetDisplay = true;
  updateClearButtonLabel();
}

/** Para modo magia: mismo flujo que `=` pero con número objetivo. */
function tryForceEquals(forcedRawNormalized) {
  if (firstNumber === "" || currentOperator === "") return false;
  const sn = getDisplayRaw();
  if (sn === "" || sn === "Error") return false;
  const forced = parseFloat(String(forcedRawNormalized).replace(",", "."));
  if (Number.isNaN(forced)) return false;

  const expr =
    formatWithSeparators(firstNumber) +
    operatorSymbol(currentOperator) +
    formatWithSeparators(sn);

  completeEquals(expr, forced);
  return true;
}

function clearSoft() {
  firstNumber = "";
  secondNumber = "";
  currentOperator = "";
  result = "";
  expressionEl.textContent = "";
}

function clearEntry() {
  const raw = getDisplayRaw();
  if (raw === "Error") {
    clearCalculator();
    return;
  }

  setDisplayRaw("0");

  if (firstNumber !== "" && currentOperator !== "") {
    secondNumber = "";
    shouldResetDisplay = true;
    updateExpression();
  } else {
    clearSoft();
    shouldResetDisplay = false;
    updateClearButtonLabel();
  }
}

function clearCalculator() {
  clearSoft();
  shouldResetDisplay = false;
  setDisplayRaw("0");
  updateClearButtonLabel();
}

function backspace() {
  if (shouldResetDisplay) return;
  let raw = getDisplayRaw();
  if (raw === "Error" || raw.length <= 1) {
    setDisplayRaw("0");
    updateExpression();
    return;
  }
  raw = raw.slice(0, -1);
  if (raw === "" || raw === "-") raw = "0";
  setDisplayRaw(raw);
  updateExpression();
}

function toggleSign() {
  let raw = getDisplayRaw();
  if (raw === "" || raw === "0" || raw === "Error") return;
  if (raw.startsWith("-")) raw = raw.slice(1);
  else raw = "-" + raw;
  setDisplayRaw(raw);

  if (currentOperator !== "" && shouldResetDisplay) {
    firstNumber = getDisplayRaw();
  } else {
    shouldResetDisplay = false;
  }
  updateExpression();
}

function percent() {
  const raw = getDisplayRaw();
  if (raw === "" || raw === "Error") return;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return;

  const next = roundResult(n / 100);
  setDisplayRaw(next);

  if (currentOperator !== "" && shouldResetDisplay) {
    firstNumber = getDisplayRaw();
  } else {
    shouldResetDisplay = false;
  }
  updateExpression();
}

document.querySelectorAll("[data-number]").forEach((button) => {
  button.addEventListener("click", () => inputDigit(button.dataset.number));
});

document.querySelectorAll("[data-operator]").forEach((button) => {
  button.addEventListener("click", () => inputOperator(button.dataset.operator));
});

document.querySelectorAll(".decimal").forEach((button) => {
  button.addEventListener("click", inputDecimal);
});

document.getElementById("equals").addEventListener("click", () => {
  if (window.CalculatorMagic?.interceptEquals?.()) return;
  inputEquals();
});
document.getElementById("clear").addEventListener("click", () => {
  if (window.CalculatorMagic?.interceptClear?.()) return;
  if (isAllClearState()) {
    clearCalculator();
  } else {
    clearEntry();
  }
});
document.getElementById("backspace").addEventListener("click", backspace);
document.getElementById("plus-minus").addEventListener("click", toggleSign);
document.getElementById("percent").addEventListener("click", percent);

updateClearButtonLabel();

window.CalculatorAPI = {
  isAllClearState,
  clearCalculator,
  clearEntry,
  setDisplayRaw,
  getDisplayRaw,
  formatWithSeparators,
  operatorSymbol,
  updateClearButtonLabel,
  tryForceEquals,
  scheduleFitDisplay,
};

if (displayStackEl && typeof ResizeObserver !== "undefined") {
  new ResizeObserver(() => scheduleFitDisplay()).observe(displayStackEl);
}

scheduleFitDisplay();
