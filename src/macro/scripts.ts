/**
 * Script generators for dynamic code execution.
 *
 * Fixed operations (click, type, hover, etc.) use the preload API.
 * These templates are needed for:
 * 1. Webview cross-context execution (wv.executeJavaScript())
 * 2. Dynamic user-provided code (evaluate/poll conditions from test suites)
 */

import { POLL_INTERVAL_MS } from './constants.js';

/** Escape backticks and dollar signs for nested executeJavaScript calls */
const escapeForNestedJs = (code: string): string =>
  code.replace(/`/g, '\\`').replace(/\$/g, '\\$');

/**
 * Generate a script that clicks inside a webview.
 */
export function webviewClickScript(
  webviewSelector: string,
  elementSelector: string,
  timeout: number,
  text?: string
): string {
  const clickLogic = text
    ? `const elements = document.querySelectorAll(${JSON.stringify(elementSelector)});
for (const el of elements) {
  if (el.textContent && el.textContent.trim() === ${JSON.stringify(text)}) {
    el.click();
    return { clicked: true, text: el.textContent.trim() };
  }
}
return { clicked: false };`
    : `const el = document.querySelector(${JSON.stringify(elementSelector)});
if (el) {
  el.click();
  return { clicked: true };
}
return { clicked: false };`;

  const escapedClickLogic = escapeForNestedJs(clickLogic);

  return `(async function() {
  const wv = document.querySelector(${JSON.stringify(webviewSelector)});
  if (!wv) throw new Error('Webview not found');
  const startTime = Date.now();
  while (Date.now() - startTime < ${timeout}) {
    const result = await wv.executeJavaScript(\`(function() { ${escapedClickLogic} })()\`);
    if (result.clicked) return result;
    await new Promise(r => setTimeout(r, ${POLL_INTERVAL_MS}));
  }
  throw new Error('Element not found in webview: ${elementSelector}${text ? ` with text "${text}"` : ''}');
})()`;
}

/**
 * Generate a script that evaluates code, optionally in a webview.
 */
export function evaluateScript(code: string, webview?: string): string {
  if (webview) {
    return `(async function() {
  const wv = document.querySelector(${JSON.stringify(webview)});
  if (!wv) throw new Error('Webview not found: ${webview}');
  return await wv.executeJavaScript(\`${escapeForNestedJs(code)}\`);
})()`;
  }

  return `(async function() {
  ${code}
})()`;
}

/**
 * Generate a script that polls a condition until true.
 */
export function pollScript(condition: string, interval: number, timeout: number): string {
  return `(function() {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function poll() {
      try {
        const result = (function() { ${condition} })();
        if (result) {
          resolve({ result });
        } else if (Date.now() - startTime > ${timeout}) {
          reject(new Error('Poll condition not met within timeout'));
        } else {
          setTimeout(poll, ${interval});
        }
      } catch (err) {
        if (Date.now() - startTime > ${timeout}) {
          reject(err);
        } else {
          setTimeout(poll, ${interval});
        }
      }
    }
    poll();
  });
})()`;
}

/**
 * Generate a script that polls a condition inside a webview.
 */
export function webviewPollScript(
  webviewSelector: string,
  condition: string,
  interval: number,
  timeout: number
): string {
  const maxAttempts = Math.floor(timeout / interval);

  return `(async function() {
  const wv = document.querySelector(${JSON.stringify(webviewSelector)});
  if (!wv) throw new Error('Webview not found: ${webviewSelector}');
  for (let i = 0; i < ${maxAttempts}; i++) {
    await new Promise(r => setTimeout(r, ${interval}));
    try {
      const result = await wv.executeJavaScript(\`${escapeForNestedJs(condition)}\`);
      if (result) {
        return { ready: true, attempts: i + 1, result };
      }
    } catch (e) {
      // Continue polling
    }
  }
  throw new Error('Condition not met after ${timeout}ms');
})()`;
}

