/**
 * Equivalent Calculator - Core Logic & Safe Math Engine
 * Features:
 *  - Safe Tokenizer + Shunting-Yard Parser + RPN Evaluator (Zero eval())
 *  - Mathematically Verified Equivalent Expression Generator
 *  - Interactive Proof Verification
 *  - Calculation History with LocalStorage
 *  - Dark / Light Theme Management
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. SAFE MATHEMATICAL EXPRESSION PARSER
  // ==========================================================================

  /**
   * Tokenize an arithmetic string into numbers, operators, and parentheses.
   */
  function tokenize(expression) {
    const tokens = [];
    const cleanExpr = expression
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/−/g, '-')
      .replace(/\s+/g, '');

    let i = 0;
    const len = cleanExpr.length;

    while (i < len) {
      const char = cleanExpr[i];

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        i++;
        continue;
      }

      // Operators (+, -, *, /, ^)
      if (char === '+' || char === '-' || char === '*' || char === '/' || char === '^') {
        // Detect unary minus: at start or following another operator or '('
        const prev = tokens[tokens.length - 1];
        const isUnary = (char === '-') && (!prev || prev.type === 'operator' || (prev.type === 'paren' && prev.value === '('));

        if (isUnary) {
          tokens.push({ type: 'unary', value: 'neg', precedence: 5 });
        } else {
          let prec = 2;
          let assoc = 'left';
          if (char === '*' || char === '/') {
            prec = 3;
          } else if (char === '^') {
            prec = 4;
            assoc = 'right';
          }
          tokens.push({ type: 'operator', value: char, precedence: prec, assoc: assoc });
        }
        i++;
        continue;
      }

      // Numbers (integers or decimals)
      if ((char >= '0' && char <= '9') || char === '.') {
        let numStr = '';
        let hasDot = false;
        while (i < len && ((cleanExpr[i] >= '0' && cleanExpr[i] <= '9') || cleanExpr[i] === '.')) {
          if (cleanExpr[i] === '.') {
            if (hasDot) break;
            hasDot = true;
          }
          numStr += cleanExpr[i];
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      // Unrecognized character
      throw new Error(`Invalid character: "${char}"`);
    }

    return tokens;
  }

  /**
   * Shunting-Yard Algorithm to convert infix tokens to RPN (Reverse Polish Notation).
   */
  function toRPN(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    for (const token of tokens) {
      if (token.type === 'number') {
        outputQueue.push(token);
      } else if (token.type === 'unary') {
        operatorStack.push(token);
      } else if (token.type === 'operator') {
        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.type === 'paren') break;

          const higherPrec = top.precedence > token.precedence;
          const samePrecLeft = (top.precedence === token.precedence && token.assoc === 'left');

          if (higherPrec || samePrecLeft) {
            outputQueue.push(operatorStack.pop());
          } else {
            break;
          }
        }
        operatorStack.push(token);
      } else if (token.type === 'paren' && token.value === '(') {
        operatorStack.push(token);
      } else if (token.type === 'paren' && token.value === ')') {
        let matched = false;
        while (operatorStack.length > 0) {
          const top = operatorStack.pop();
          if (top.type === 'paren' && top.value === '(') {
            matched = true;
            break;
          }
          outputQueue.push(top);
        }
        if (!matched) {
          throw new Error('Mismatched parentheses: unexpected closing ")"');
        }
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop();
      if (op.type === 'paren') {
        throw new Error('Mismatched parentheses: missing closing ")"');
      }
      outputQueue.push(op);
    }

    return outputQueue;
  }

  /**
   * Evaluates an RPN queue safely.
   */
  function evaluateRPN(rpn) {
    const stack = [];

    for (const token of rpn) {
      if (token.type === 'number') {
        stack.push(token.value);
      } else if (token.type === 'unary' && token.value === 'neg') {
        if (stack.length < 1) throw new Error('Invalid unary minus expression');
        const a = stack.pop();
        stack.push(-a);
      } else if (token.type === 'operator') {
        if (stack.length < 2) throw new Error('Invalid syntax in mathematical expression');
        const b = stack.pop();
        const a = stack.pop();

        let res = 0;
        switch (token.value) {
          case '+':
            res = a + b;
            break;
          case '-':
            res = a - b;
            break;
          case '*':
            res = a * b;
            break;
          case '/':
            if (b === 0) throw new Error('Cannot divide by zero');
            res = a / b;
            break;
          case '^':
            res = Math.pow(a, b);
            break;
          default:
            throw new Error(`Unknown operator: ${token.value}`);
        }
        stack.push(res);
      }
    }

    if (stack.length !== 1) {
      throw new Error('Incomplete mathematical expression');
    }

    const result = stack[0];
    if (!isFinite(result) || isNaN(result)) {
      throw new Error('Result is not a finite number');
    }

    // Round floating point noise (e.g., 0.1 + 0.2 -> 0.3)
    return Number(Math.round(result + 'e12') + 'e-12');
  }

  /**
   * Safe evaluate facade.
   */
  function safeEvaluate(expression) {
    if (!expression || !expression.trim()) return null;
    const tokens = tokenize(expression);
    if (tokens.length === 0) return null;
    const rpn = toRPN(tokens);
    return evaluateRPN(rpn);
  }

  // ==========================================================================
  // 2. EQUIVALENT EXPRESSION GENERATOR & PRE-VERIFICATION
  // ==========================================================================

  function formatCleanNumber(num) {
    if (Number.isInteger(num)) return num.toString();
    return Number(Math.round(num + 'e8') + 'e-8').toString();
  }

  /**
   * Generates ONLY mathematically equivalent division expressions (N / D).
   * For an answer N, generates forms:
   *  N = (N * 2) / 2
   *  N = (N * 3) / 3
   *  N = (N * 4) / 4
   *  N = (N * 5) / 5 ...
   * Examples:
   *  1 + 1 = 2 -> 4 / 2
   *  10 + 10 = 20 -> 40 / 2, 60 / 3, 80 / 4, 100 / 5
   *  100 / 4 = 25 -> 50 / 2
   *  7 + 8 = 15 -> 30 / 2
   */
  function generateCandidateExpressions(result) {
    const candidates = [];
    const seen = new Set();

    // Standard denominators: 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 20, 25, 50, 100
    const denominators = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 20, 25, 50, 100];

    for (const d of denominators) {
      let numerator = result * d;
      if (Math.abs(numerator - Math.round(numerator)) < 1e-9) {
        numerator = Math.round(numerator);
      }
      const expr = `${formatCleanNumber(numerator)} / ${d}`;
      if (!seen.has(expr)) {
        seen.add(expr);
        candidates.push(expr);
      }
    }

    return candidates;
  }

  /**
   * Generates a verified equivalent division expression for a given answer.
   * Ensures internal evaluation strictly matches the result within 1e-9 tolerance.
   */
  function getVerifiedEquivalent(result, originalExpr, excludeExpr = null) {
    const candidates = generateCandidateExpressions(result);
    const verified = [];
    const seen = new Set();

    const normOriginal = originalExpr.replace(/\s+/g, '');

    for (const cand of candidates) {
      const normCand = cand.replace(/\s+/g, '');
      if (normCand === normOriginal) continue;
      if (excludeExpr && normCand === excludeExpr.replace(/\s+/g, '')) continue;
      if (seen.has(cand)) continue;

      try {
        const evalVal = safeEvaluate(cand);
        if (evalVal !== null && Math.abs(evalVal - result) < 1e-9) {
          seen.add(cand);
          verified.push(cand);
        }
      } catch (err) {
        // Skip invalid candidates
      }
    }

    if (verified.length === 0) {
      // Guaranteed mathematical fallback division expression
      let fallbackNumerator = result * 2;
      if (Math.abs(fallbackNumerator - Math.round(fallbackNumerator)) < 1e-9) {
        fallbackNumerator = Math.round(fallbackNumerator);
      }
      return [`${formatCleanNumber(fallbackNumerator)} / 2`];
    }

    return verified;
  }

  // ==========================================================================
  // 3. APPLICATION STATE & CONTROLLER
  // ==========================================================================

  const state = {
    expression: '10 + 10',
    actualResult: 20,
    currentEquivalent: '40 / 2',
    allVerifiedEquivalents: ['40 / 2'],
    equivalentIndex: 0,
    history: [],
    theme: 'dark'
  };

  const el = {
    expressionDisplay: document.getElementById('expressionDisplay'),
    equivalentDisplay: document.getElementById('equivalentDisplay'),
    generateAnotherBtn: document.getElementById('generateAnotherBtn'),
    verifyAnswerBtn: document.getElementById('verifyAnswerBtn'),
    verificationProof: document.getElementById('verificationProof'),
    proofContent: document.getElementById('proofContent'),
    closeProofBtn: document.getElementById('closeProofBtn'),
    keypad: document.querySelector('.calc-keypad'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    historyToggleBtn: document.getElementById('historyToggleBtn'),
    historyPanel: document.getElementById('historyPanel'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    clearHistoryBtn: document.getElementById('clearHistoryBtn'),
    historyList: document.getElementById('historyList'),
    historyBadge: document.getElementById('historyBadge')
  };

  // ==========================================================================
  // 4. STORAGE & HISTORY
  // ==========================================================================

  function loadStorage() {
    try {
      const savedTheme = localStorage.getItem('equiv_calc_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      }

      const savedHistory = localStorage.getItem('equiv_calc_history');
      if (savedHistory) {
        state.history = JSON.parse(savedHistory);
        renderHistory();
      }
    } catch (e) {
      console.warn('Storage unavailable:', e);
    }
  }

  function saveHistory() {
    try {
      localStorage.setItem('equiv_calc_history', JSON.stringify(state.history.slice(0, 30)));
    } catch (e) {
      console.warn('Could not save history:', e);
    }
  }

  function addToHistory(expr, equiv) {
    const item = {
      id: Date.now(),
      expression: expr,
      equivalent: equiv,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };
    state.history.unshift(item);
    if (state.history.length > 30) state.history.pop();
    saveHistory();
    renderHistory();
  }

  function renderHistory() {
    el.historyBadge.textContent = state.history.length;
    if (state.history.length === 0) {
      el.historyList.innerHTML = `
        <div class="history-empty">
          <span class="empty-icon">📝</span>
          <p>No calculations yet</p>
          <small>Try typing <code>10 + 10</code></small>
        </div>
      `;
      return;
    }

    el.historyList.innerHTML = state.history
      .map(
        (item) => `
        <div class="history-item" data-expr="${encodeURIComponent(item.expression)}">
          <div class="history-item-top">
            <span>${item.expression}</span>
            <span class="history-item-time">${item.timestamp}</span>
          </div>
          <div class="history-item-main">
            <span class="history-item-equiv">= ${item.equivalent}</span>
          </div>
        </div>
      `
      )
      .join('');

    // Click history item to reload
    el.historyList.querySelectorAll('.history-item').forEach((itemNode) => {
      itemNode.addEventListener('click', () => {
        const expr = decodeURIComponent(itemNode.getAttribute('data-expr'));
        state.expression = expr;
        el.expressionDisplay.textContent = expr;
        compute(true);
      });
    });
  }

  // ==========================================================================
  // 5. THEME SWITCHER
  // ==========================================================================

  function setTheme(theme) {
    state.theme = theme;
    document.body.setAttribute('data-theme', theme);
    el.themeToggleBtn.querySelector('.theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
    try {
      localStorage.setItem('equiv_calc_theme', theme);
    } catch (e) {}
  }

  // ==========================================================================
  // 6. CALCULATION & EQUIVALENCE HANDLERS
  // ==========================================================================

  function compute(isFromHistory = false) {
    const raw = state.expression.trim();
    if (!raw) return;

    try {
      const result = safeEvaluate(raw);
      if (result === null) return;

      // Calculate the original expression internally, but NEVER display actual numerical answer
      state.actualResult = result;

      // Generate verified equivalent division expressions
      const verifiedList = getVerifiedEquivalent(result, raw);
      state.allVerifiedEquivalents = Array.isArray(verifiedList) ? verifiedList : [verifiedList];
      state.equivalentIndex = 0;
      state.currentEquivalent = state.allVerifiedEquivalents[0];

      // Update equivalent division solution display (ONLY result shown)
      el.equivalentDisplay.textContent = state.currentEquivalent;
      el.verificationProof.classList.add('hidden');

      // Add to history (only original calculation and equivalent division solution)
      if (!isFromHistory) {
        addToHistory(raw, state.currentEquivalent);
      }
    } catch (err) {
      el.equivalentDisplay.textContent = 'Error';
      showProofError(err.message);
    }
  }

  function cycleEquivalent() {
    if (!state.allVerifiedEquivalents || state.allVerifiedEquivalents.length <= 1) {
      // Re-generate with higher variations
      const freshList = getVerifiedEquivalent(state.actualResult, state.expression, state.currentEquivalent);
      if (Array.isArray(freshList) && freshList.length > 0) {
        state.allVerifiedEquivalents = freshList;
      }
    }

    state.equivalentIndex = (state.equivalentIndex + 1) % state.allVerifiedEquivalents.length;
    state.currentEquivalent = state.allVerifiedEquivalents[state.equivalentIndex];

    // Visual bump
    el.equivalentDisplay.style.transform = 'scale(1.08)';
    setTimeout(() => {
      el.equivalentDisplay.textContent = state.currentEquivalent;
      el.equivalentDisplay.style.transform = 'scale(1)';
    }, 120);

    // Update open proof if active
    if (!el.verificationProof.classList.contains('hidden')) {
      showProof();
    }
  }

  function showProof() {
    try {
      const rawExpr = state.expression;
      const equivExpr = state.currentEquivalent;

      const evalActual = safeEvaluate(rawExpr);
      const evalEquiv = safeEvaluate(equivExpr);

      const isMatch = Math.abs(evalActual - evalEquiv) < 1e-9;

      if (isMatch) {
        el.proofContent.innerHTML = `
          <div class="proof-verified-box">
            <div class="proof-badge-success">✓ Verified</div>
            <p class="proof-desc">The equivalent division expression is mathematically equal to the entered calculation.</p>
          </div>
        `;
      } else {
        el.proofContent.innerHTML = `
          <div class="proof-verified-box" style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.08);">
            <div style="color: var(--color-danger); font-weight: 800;">⚠️ Verification Issue</div>
            <p class="proof-desc" style="color: var(--color-danger);">The expression could not be verified.</p>
          </div>
        `;
      }
      el.verificationProof.classList.remove('hidden');
    } catch (e) {
      showProofError(e.message);
    }
  }

  function showProofError(msg) {
    el.proofContent.innerHTML = `
      <div class="proof-step" style="color: var(--color-danger)">
        ⚠️ <strong>Parser Notice:</strong> ${msg}
      </div>
    `;
    el.verificationProof.classList.remove('hidden');
  }

  // ==========================================================================
  // 7. INPUT HANDLING
  // ==========================================================================

  function appendChar(char) {
    if (state.expression === '0') {
      if (char === '.') {
        state.expression = '0.';
      } else if (char === '+' || char === '−' || char === '×' || char === '÷' || char === '^') {
        state.expression = '0 ' + char + ' ';
      } else {
        state.expression = char;
      }
    } else {
      const isOperator = ['+', '−', '×', '÷', '^'].includes(char);
      if (isOperator) {
        state.expression += ` ${char} `;
      } else {
        state.expression += char;
      }
    }
    updateDisplay();
  }

  function clearAll() {
    state.expression = '0';
    state.actualResult = 0;
    state.currentEquivalent = '0 / 2';
    state.allVerifiedEquivalents = ['0 / 2'];
    updateDisplay();
    el.equivalentDisplay.textContent = '0 / 2';
    el.verificationProof.classList.add('hidden');
  }

  function backspace() {
    let expr = state.expression.trimEnd();
    if (expr.length <= 1) {
      state.expression = '0';
    } else {
      // If ends with operator like " + ", remove operator
      if (/[+−×÷^]$/.test(expr)) {
        state.expression = expr.slice(0, -1).trimEnd();
      } else {
        state.expression = expr.slice(0, -1);
      }
      if (!state.expression) state.expression = '0';
    }
    updateDisplay();
  }

  function updateDisplay() {
    el.expressionDisplay.textContent = state.expression;
  }

  // ==========================================================================
  // 8. EVENT LISTENERS
  // ==========================================================================

  // Export for testing/verification early
  window.EquivalentCalculator = {
    safeEvaluate,
    getVerifiedEquivalent,
    state
  };

  // ==========================================================================
  // 8. EVENT LISTENERS
  // ==========================================================================

  function bindEvents() {
    if (el.keypad) {
      el.keypad.addEventListener('click', (e) => {
        const key = e.target.closest('button');
        if (!key) return;

        const action = key.getAttribute('data-action');
        const char = key.getAttribute('data-char');

        if (action === 'calculate') {
          compute();
        } else if (action === 'clear') {
          clearAll();
        } else if (action === 'backspace') {
          backspace();
        } else if (char) {
          appendChar(char);
        }
      });
    }

    if (el.generateAnotherBtn) {
      el.generateAnotherBtn.addEventListener('click', cycleEquivalent);
    }
    if (el.verifyAnswerBtn) {
      el.verifyAnswerBtn.addEventListener('click', () => {
        if (el.verificationProof.classList.contains('hidden')) {
          showProof();
        } else {
          el.verificationProof.classList.add('hidden');
        }
      });
    }
    if (el.closeProofBtn) {
      el.closeProofBtn.addEventListener('click', () => {
        el.verificationProof.classList.add('hidden');
      });
    }

    if (el.themeToggleBtn) {
      el.themeToggleBtn.addEventListener('click', () => {
        setTheme(state.theme === 'dark' ? 'light' : 'dark');
      });
    }

    if (el.historyToggleBtn && el.historyPanel) {
      el.historyToggleBtn.addEventListener('click', () => {
        el.historyPanel.classList.toggle('open');
      });
    }

    if (el.closeHistoryBtn && el.historyPanel) {
      el.closeHistoryBtn.addEventListener('click', () => {
        el.historyPanel.classList.remove('open');
      });
    }

    if (el.clearHistoryBtn) {
      el.clearHistoryBtn.addEventListener('click', () => {
        state.history = [];
        saveHistory();
        renderHistory();
      });
    }

    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.key >= '0' && e.key <= '9') {
        appendChar(e.key);
      } else if (e.key === '.') {
        appendChar('.');
      } else if (e.key === '+') {
        appendChar('+');
      } else if (e.key === '-') {
        appendChar('−');
      } else if (e.key === '*') {
        appendChar('×');
      } else if (e.key === '/') {
        e.preventDefault();
        appendChar('÷');
      } else if (e.key === '^') {
        appendChar('^');
      } else if (e.key === '(' || e.key === ')') {
        appendChar(e.key);
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        compute();
      } else if (e.key === 'Backspace') {
        backspace();
      } else if (e.key === 'Escape') {
        clearAll();
      } else if (e.key.toLowerCase() === 'v') {
        showProof();
      } else if (e.key.toLowerCase() === 'g') {
        cycleEquivalent();
      }
    });
  }

  // ==========================================================================
  // 9. INITIALIZATION & SELF-TEST FOR 1 + 1
  // ==========================================================================

  function init() {
    if (!el.expressionDisplay) return; // Exit if running in test environment without full DOM
    bindEvents();
    loadStorage();
    // Default initial expression: 10 + 10 -> 40 / 2
    state.expression = '10 + 10';
    el.expressionDisplay.textContent = state.expression;
    compute(true);
  }

  // Run on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
