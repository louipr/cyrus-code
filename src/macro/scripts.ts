/**
 * Script generators for dynamic code execution.
 *
 * Only needed for evaluate action (user-provided code).
 */

/** Escape backticks and dollar signs for nested executeJavaScript calls */
const escapeForNestedJs = (code: string): string =>
  code.replace(/`/g, '\\`').replace(/\$/g, '\\$');

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
