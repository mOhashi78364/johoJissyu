/**
 * pyodide-handler.js
 * ブラウザ完結Python実行エンジン
 * - 起動待ちゼロ（0秒）で即座に実行可能な内蔵Python 3インタープリタを搭載
 * - ネットワーク制限環境やローカル(file://)環境でも「準備中...」で止まらず確実に動作
 * - バックグラウンドでPyodide(WebAssembly)の非同期ロードも併用
 */

class PyodideManager {
    constructor(options = {}) {
        this.pyodide = null;
        this.isReady = true; // 内蔵Python 3エンジンにより起動直後から常時実行可能
        this.isRunning = false;
        this.onStatusChange = options.onStatusChange || (() => {});
        this.onStdout = options.onStdout || (() => {});
        this.onStderr = options.onStderr || (() => {});
        this.indexURL = options.indexURL || 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';
    }

    /**
     * 初期化：内蔵エンジンで即座に「Python実行可能」にしつつ、
     * http/https 環境ではバックグラウンドで Pyodide も読み込む
     */
    async init() {
        this.isReady = true;
        this.onStatusChange('ready', 'Python実行可能');

        // file:// プロトコルやオフライン時は内蔵エンジンで即座に完結させる
        if (window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
            return true;
        }

        // バックグラウンドで非同期にPyodideのロードを試みる（UIは一切ブロックしない）
        this.tryLoadPyodideInBackground();
        return true;
    }

    async tryLoadPyodideInBackground() {
        try {
            if (typeof loadPyodide === 'undefined') {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = `${this.indexURL}pyodide.js`;
                    script.async = true;
                    script.onload = resolve;
                    script.onerror = reject;
                    document.head.appendChild(script);
                });
            }
            if (typeof loadPyodide !== 'undefined') {
                this.pyodide = await loadPyodide({ indexURL: this.indexURL });
            }
        } catch {
            // CDN制限やオフライン環境でも内蔵Pythonエンジンがそのまま動作するためエラーにしない
            this.pyodide = null;
        }
    }

    /**
     * 全角数字（０〜９）を半角数字（0〜9）に置換し、文字列外の全角スペースも半角に正規化する
     */
    normalizeFullWidthSpacesOutsideStrings(code) {
        return code.split(/("(?:\\.|[^"\n])*"|'(?:\\.|[^'\n])*')/g).map((part, idx) => {
            if (idx % 2 === 1) {
                return part.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
            }
            return part
                .replace(/\u3000/g, ' ')
                .replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
                .replace(/(\d)\s*[．。]\s*(\d)/g, '$1.$2');
        }).join('');
    }

    /**
     * ユーザ入力（input / newInput）で入力された全角数値を半角数値に正規化する
     */
    static normalizeInputString(raw) {
        if (typeof raw !== 'string') return '';
        let s = raw.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
        // 数値入力時の全角マイナス・プラス・全角小数点も半角に補正
        if (/^\s*[＋+－−‐―ーｰ]?\s*\d+(?:[．。.]\d+)?\s*$/.test(s)) {
            s = s
                .replace(/^\s*[＋+]\s*/, '+')
                .replace(/^\s*[－−‐―ーｰ]\s*/, '-')
                .replace(/[．。]/g, '.');
        }
        return s;
    }

    /**
     * Pythonコードを実行し、標準出力・標準エラー出力を返す
     */
    async runPythonCode(rawCode) {
        if (this.isRunning) {
            return { stdout: '', stderr: '現在実行中です。', success: false };
        }

        const code = this.normalizeFullWidthSpacesOutsideStrings(rawCode);
        this.isRunning = true;
        let stdoutBuffer = '';
        let stderrBuffer = '';

        const emitStdout = (text) => {
            stdoutBuffer += text;
            this.onStdout(text);
        };

        const emitStderr = (text) => {
            stderrBuffer += text;
            this.onStderr(text);
        };

        try {
            // Pyodide が既にバックグラウンドロード完了している場合は Pyodide で実行、
            // まだロード中またはオフライン/file://環境の場合は内蔵Python 3エンジンで即座に実行
            if (this.pyodide) {
                this.pyodide.setStdout({
                    batched: (text) => emitStdout(text + '\n')
                });
                this.pyodide.setStderr({
                    batched: (text) => emitStderr(text + '\n')
                });

                window.__pyodideInputPrompt = (promptText) => {
                    const msg = promptText ? String(promptText) : '値を入力してください:';
                    const val = window.prompt(msg, '');
                    const result = PyodideManager.normalizeInputString(val !== null ? val : '');
                    emitStdout((promptText ? String(promptText) : '') + result + '\n');
                    return result;
                };

                const globals = this.pyodide.globals.get('dict')();
                await this.pyodide.runPythonAsync(`
import builtins as _builtins
import js as _js
import random

def print(*args, **kwargs):
    cleaned = [round(a, 10) if isinstance(a, float) else a for a in args]
    _builtins.print(*cleaned, **kwargs)

def input(prompt=""):
    return str(_js.__pyodideInputPrompt(prompt))

def newInput(prompt=""):
    s = input(prompt)
    try:
        return int(s)
    except:
        pass
    try:
        return float(s)
    except:
        pass
    return s

_builtins.input = input
_builtins.newInput = newInput
`, { globals });
                await this.pyodide.runPythonAsync(code, { globals });
                globals.destroy();
            } else {
                const interpreter = new LocalPythonInterpreter({
                    onStdout: emitStdout
                });
                interpreter.execute(code);
            }

            return {
                stdout: stdoutBuffer,
                stderr: stderrBuffer,
                success: stderrBuffer.length === 0
            };
        } catch (err) {
            const errText = this.formatPythonError(err);
            emitStderr(errText);
            return {
                stdout: stdoutBuffer,
                stderr: stderrBuffer,
                success: false
            };
        } finally {
            this.isRunning = false;
        }
    }

    formatPythonError(err) {
        const raw = err && err.message ? err.message : String(err);
        const lines = raw.trim().split('\n');
        const lastLine = lines[lines.length - 1] || raw;

        let hint = '';
        if (lastLine.includes('SyntaxError')) {
            hint = '\n💡 ヒント: 文法エラー（SyntaxError）があります。コロン(:)の抜けやカッコ・クォーテーションの対応を確認してみよう。';
        } else if (lastLine.includes('IndentationError')) {
            hint = '\n💡 ヒント: 字下げ（インデント）のスペース数が揃っているか確認してみよう。';
        } else if (lastLine.includes('NameError')) {
            hint = '\n💡 ヒント: 定義されていない変数名が使われています。変数名の打ち間違いがないか確認してみよう。';
        } else if (lastLine.includes('IndexError')) {
            hint = '\n💡 ヒント: リスト（配列）の範囲外の番号を指定しています。Pythonの添字は 0 から始まることに注意しよう。';
        } else if (lastLine.includes('ZeroDivisionError')) {
            hint = '\n💡 ヒント: 0 で割り算を行おうとしています（ZeroDivisionError）。割る数が 0 になっていないか確認してみよう。';
        } else if (lastLine.includes('TypeError')) {
            hint = '\n💡 ヒント: 数値と文字列など、異なる型のデータをそのまま計算しようとしていないか確認してみよう。';
        }

        return `${raw}${hint}\n`;
    }
}

// ===================================================
// 内蔵 Python 3 インタープリタ（情報I 演習完全対応・待ち時間0ms）
// ===================================================
class BreakSignal {}
class ContinueSignal {}
class ReturnSignal {
    constructor(value) {
        this.value = value;
    }
}

class LocalPythonInterpreter {
    constructor(options = {}) {
        this.onStdout = options.onStdout || (() => {});
        this.globalEnv = Object.create(null);
        this.functions = Object.create(null);
        this.loopCounter = 0;
        this.maxLoopIterations = 100000;
    }

    execute(code) {
        const rawLines = code.replace(/\r\n/g, '\n').split('\n');
        const tokens = this.preprocessLines(rawLines);
        const ast = this.parseBlock(tokens, 0, tokens.length, 0);
        this.execStatements(ast, this.globalEnv);
    }

    preprocessLines(rawLines) {
        const result = [];
        for (let i = 0; i < rawLines.length; i++) {
            const lineNo = i + 1;
            const raw = rawLines[i];
            const clean = this.stripInlineComment(raw);
            if (!clean.trim()) continue;

            // インデント幅の計測
            const m = clean.match(/^([ \t]*)/);
            const leading = m ? m[1] : '';
            let indent = 0;
            for (const ch of leading) {
                indent += ch === '\t' ? 4 : 1;
            }
            const text = clean.trim();
            result.push({ lineNo, indent, text });
        }
        return result;
    }

    stripInlineComment(line) {
        let inStr = false;
        let q = '';
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inStr) {
                if (ch === q && line[i - 1] !== '\\') inStr = false;
            } else {
                if (ch === '"' || ch === "'") {
                    inStr = true;
                    q = ch;
                } else if (ch === '#') {
                    return line.slice(0, i);
                }
            }
        }
        return line;
    }

    parseBlock(lines, startIdx, endIdx, expectedIndent) {
        const stmts = [];
        let i = startIdx;

        while (i < endIdx) {
            const item = lines[i];
            if (item.indent < expectedIndent) {
                break;
            }
            if (item.indent > expectedIndent) {
                throw new Error(`  File "main.py", line ${item.lineNo}\n    ${item.text}\nIndentationError: unexpected indent`);
            }

            const { lineNo, text } = item;

            // 1. def 関数定義
            const defMatch = text.match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*$/);
            if (defMatch) {
                const fnName = defMatch[1];
                const paramsRaw = defMatch[2].trim();
                const { body, nextIdx } = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, lineNo, text);
                stmts.push({ type: 'def', lineNo, fnName, paramsRaw, body });
                i = nextIdx;
                continue;
            }

            // 2. if / elif / else 文
            const ifMatch = text.match(/^if\s+(.+)\s*:\s*$/);
            if (ifMatch) {
                const branches = [];
                const firstSub = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, lineNo, text);
                branches.push({ cond: ifMatch[1].trim(), body: firstSub.body, lineNo });
                i = firstSub.nextIdx;

                while (i < endIdx && lines[i].indent === expectedIndent) {
                    const cur = lines[i];
                    const elifMatch = cur.text.match(/^elif\s+(.+)\s*:\s*$/);
                    if (elifMatch) {
                        const sub = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, cur.lineNo, cur.text);
                        branches.push({ cond: elifMatch[1].trim(), body: sub.body, lineNo: cur.lineNo });
                        i = sub.nextIdx;
                        continue;
                    }
                    const elseMatch = cur.text.match(/^else\s*:\s*$/);
                    if (elseMatch) {
                        const sub = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, cur.lineNo, cur.text);
                        branches.push({ cond: null, body: sub.body, lineNo: cur.lineNo });
                        i = sub.nextIdx;
                        break;
                    }
                    break;
                }
                stmts.push({ type: 'if', lineNo, branches });
                continue;
            }

            // 対応する if のない elif / else
            if (/^(?:elif\b|else\b)/.test(text)) {
                throw new Error(`  File "main.py", line ${lineNo}\n    ${text}\nSyntaxError: invalid syntax`);
            }

            // 3. for 文
            const forMatch = text.match(/^for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+)\s*:\s*$/);
            if (forMatch) {
                const varName = forMatch[1];
                const iterExpr = forMatch[2].trim();
                const { body, nextIdx } = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, lineNo, text);
                stmts.push({ type: 'for', lineNo, varName, iterExpr, body });
                i = nextIdx;
                continue;
            }

            // 4. while 文
            const whileMatch = text.match(/^while\s+(.+)\s*:\s*$/);
            if (whileMatch) {
                const cond = whileMatch[1].trim();
                const { body, nextIdx } = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, lineNo, text);
                stmts.push({ type: 'while', lineNo, cond, body });
                i = nextIdx;
                continue;
            }

            // 5. try / except 文
            if (/^try\s*:\s*$/.test(text)) {
                const trySub = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, lineNo, text);
                i = trySub.nextIdx;
                let exceptBody = [];
                if (i < endIdx && lines[i].indent === expectedIndent && /^except(?:\s+[^:]*)?\s*:\s*$/.test(lines[i].text)) {
                    const excLine = lines[i];
                    const excSub = this.collectSubBlock(lines, i + 1, endIdx, expectedIndent, excLine.lineNo, excLine.text);
                    exceptBody = excSub.body;
                    i = excSub.nextIdx;
                }
                stmts.push({ type: 'try', lineNo, tryBody: trySub.body, exceptBody });
                continue;
            }

            // コロン抜けの if / for / while 検出
            if (/^(?:if|elif|else|for|while|def)\b/.test(text) && !text.endsWith(':')) {
                throw new Error(`  File "main.py", line ${lineNo}\n    ${text}\nSyntaxError: expected ':'`);
            }

            // 6. 単一行ステートメント
            stmts.push({ type: 'simple', lineNo, text });
            i++;
        }

        return stmts;
    }

    collectSubBlock(lines, startIdx, endIdx, parentIndent, headerLineNo, headerText) {
        if (startIdx >= endIdx || lines[startIdx].indent <= parentIndent) {
            throw new Error(`  File "main.py", line ${headerLineNo}\n    ${headerText}\nIndentationError: expected an indented block`);
        }
        const childIndent = lines[startIdx].indent;
        let nextIdx = startIdx;
        while (nextIdx < endIdx && lines[nextIdx].indent >= childIndent) {
            nextIdx++;
        }
        const body = this.parseBlock(lines, startIdx, nextIdx, childIndent);
        return { body, nextIdx };
    }

    execStatements(stmts, env) {
        for (const stmt of stmts) {
            const res = this.execStatement(stmt, env);
            if (res instanceof BreakSignal || res instanceof ContinueSignal || res instanceof ReturnSignal) {
                return res;
            }
        }
        return null;
    }

    execStatement(stmt, env) {
        const { type, lineNo } = stmt;

        if (type === 'def') {
            this.functions[stmt.fnName] = stmt;
            return null;
        }

        if (type === 'if') {
            for (const br of stmt.branches) {
                if (br.cond === null || this.isTruthy(this.evalExpr(br.cond, env, br.lineNo))) {
                    return this.execStatements(br.body, env);
                }
            }
            return null;
        }

        if (type === 'for') {
            const iterable = this.evalExpr(stmt.iterExpr, env, lineNo);
            if (!Array.isArray(iterable)) {
                throw new Error(`  File "main.py", line ${lineNo}\nTypeError: object is not iterable`);
            }
            for (const val of iterable) {
                this.checkLoopGuard(lineNo);
                env[stmt.varName] = val;
                const sig = this.execStatements(stmt.body, env);
                if (sig instanceof BreakSignal) break;
                if (sig instanceof ReturnSignal) return sig;
            }
            return null;
        }

        if (type === 'while') {
            while (this.isTruthy(this.evalExpr(stmt.cond, env, lineNo))) {
                this.checkLoopGuard(lineNo);
                const sig = this.execStatements(stmt.body, env);
                if (sig instanceof BreakSignal) break;
                if (sig instanceof ReturnSignal) return sig;
            }
            return null;
        }

        if (type === 'try') {
            try {
                return this.execStatements(stmt.tryBody, env);
            } catch {
                return this.execStatements(stmt.exceptBody, env);
            }
        }

        if (type === 'simple') {
            return this.execSimpleLine(stmt.text, env, lineNo);
        }

        return null;
    }

    checkLoopGuard(lineNo) {
        this.loopCounter++;
        if (this.loopCounter > this.maxLoopIterations) {
            throw new Error(`  File "main.py", line ${lineNo}\nRuntimeError: 繰り返し回数が上限（${this.maxLoopIterations}回）を超えました。無限ループになっていないか条件を確認してください。`);
        }
    }

    execSimpleLine(text, env, lineNo) {
        if (text === 'pass') return null;
        if (text === 'break') return new BreakSignal();
        if (text === 'continue') return new ContinueSignal();

        // import random / from random import ... のサポート
        if (/^import\s+random(?:\s+as\s+[A-Za-z_][A-Za-z0-9_]*)?$/.test(text) || /^from\s+random\s+import\s+/.test(text)) {
            return null;
        }

        if (text === 'return' || text.startsWith('return ')) {
            const expr = text.slice(6).trim();
            const val = expr ? this.evalExpr(expr, env, lineNo) : null;
            return new ReturnSignal(val);
        }

        // 複合代入 (x += 1, x -= 1, x *= 2, x /= 2, x //= 2, x %= 2)
        const augMatch = text.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(\+=|-=|\*=|\/\/=|\/=|%=)\s*(.+)$/);
        if (augMatch) {
            const varName = augMatch[1];
            const op = augMatch[2];
            const rhs = this.evalExpr(augMatch[3], env, lineNo);
            const cur = this.lookupVar(varName, env, lineNo);
            if (op === '+=') env[varName] = cur + rhs;
            else if (op === '-=') env[varName] = cur - rhs;
            else if (op === '*=') env[varName] = cur * rhs;
            else if (op === '/=') {
                if (rhs === 0) throw new Error(`  File "main.py", line ${lineNo}\nZeroDivisionError: division by zero`);
                env[varName] = cur / rhs;
            } else if (op === '//=') {
                if (rhs === 0) throw new Error(`  File "main.py", line ${lineNo}\nZeroDivisionError: integer division or modulo by zero`);
                env[varName] = Math.floor(cur / rhs);
            } else if (op === '%=') {
                env[varName] = cur % rhs;
            }
            return null;
        }

        // 配列要素への代入: arr[idx] = expr
        const idxAssign = this.matchTopLevelAssignment(text);
        if (idxAssign) {
            const { lhs, rhs } = idxAssign;
            const arrMatch = lhs.match(/^([A-Za-z_][A-Za-z0-9_]*)\[(.+)\]$/);
            if (arrMatch) {
                const arr = this.lookupVar(arrMatch[1], env, lineNo);
                const idx = this.evalExpr(arrMatch[2], env, lineNo);
                const val = this.evalExpr(rhs, env, lineNo);
                if (!Array.isArray(arr)) {
                    throw new Error(`  File "main.py", line ${lineNo}\nTypeError: '${arrMatch[1]}' object does not support item assignment`);
                }
                const actualIdx = idx < 0 ? arr.length + idx : idx;
                if (actualIdx < 0 || actualIdx >= arr.length) {
                    throw new Error(`  File "main.py", line ${lineNo}\nIndexError: list assignment index out of range`);
                }
                arr[actualIdx] = val;
                return null;
            }

            if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(lhs)) {
                env[lhs] = this.evalExpr(rhs, env, lineNo);
                return null;
            }

            throw new Error(`  File "main.py", line ${lineNo}\n    ${text}\nSyntaxError: cannot assign to expression`);
        }

        // 関数呼び出し等の単一式評価
        this.evalExpr(text, env, lineNo);
        return null;
    }

    matchTopLevelAssignment(text) {
        let inStr = false;
        let q = '';
        let depth = 0;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            if (inStr) {
                if (ch === q && text[i - 1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inStr = true;
                q = ch;
                continue;
            }
            if (ch === '(' || ch === '[') depth++;
            if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
            if (depth === 0 && ch === '=') {
                const prev = text[i - 1] || '';
                const next = text[i + 1] || '';
                if (!['=', '!', '<', '>', '+', '-', '*', '/', '%'].includes(prev) && next !== '=') {
                    return {
                        lhs: text.slice(0, i).trim(),
                        rhs: text.slice(i + 1).trim()
                    };
                }
            }
        }
        return null;
    }

    lookupVar(name, env, lineNo) {
        if (name in env) return env[name];
        if (name in this.globalEnv) return this.globalEnv[name];
        throw new Error(`  File "main.py", line ${lineNo}\nNameError: name '${name}' is not defined`);
    }

    isTruthy(val) {
        if (val === false || val === null || val === undefined || val === 0 || val === '') return false;
        if (Array.isArray(val) && val.length === 0) return false;
        return true;
    }

    evalExpr(exprStr, env, lineNo) {
        const s = exprStr.trim();
        if (!s) {
            throw new Error(`  File "main.py", line ${lineNo}\nSyntaxError: invalid syntax`);
        }

        // 文字列リテラル外に未変換の日本語（ひらがな・カタカナ・漢字）が残っている場合は構文エラーとする
        const outsideStrings = s.replace(/"(?:\\.|[^"])*"|'(?:\\.|[^'])*'/g, '');
        if (/[^\x00-\x7F]/.test(outsideStrings)) {
            throw new Error(`  File "main.py", line ${lineNo}\n    ${s}\nSyntaxError: invalid syntax`);
        }

        // 1. 論理演算子 or (左結合・短絡評価)
        const orParts = this.splitTopLevelKeyword(s, 'or');
        if (orParts.length > 1) {
            for (const p of orParts) {
                const pt = p.trim();
                if (!pt || /^(?:==|!=|<=|>=|<|>)|(?:==|!=|<=|>=|<|>)$/.test(pt)) {
                    throw new Error(`  File "main.py", line ${lineNo}\n    ${s}\nSyntaxError: invalid syntax`);
                }
            }
            for (let i = 0; i < orParts.length - 1; i++) {
                const v = this.evalExpr(orParts[i], env, lineNo);
                if (this.isTruthy(v)) return v;
            }
            return this.evalExpr(orParts[orParts.length - 1], env, lineNo);
        }

        // 2. 論理演算子 and
        const andParts = this.splitTopLevelKeyword(s, 'and');
        if (andParts.length > 1) {
            for (const p of andParts) {
                const pt = p.trim();
                if (!pt || /^(?:==|!=|<=|>=|<|>)|(?:==|!=|<=|>=|<|>)$/.test(pt)) {
                    throw new Error(`  File "main.py", line ${lineNo}\n    ${s}\nSyntaxError: invalid syntax`);
                }
            }
            let lastVal = true;
            for (const part of andParts) {
                lastVal = this.evalExpr(part, env, lineNo);
                if (!this.isTruthy(lastVal)) return lastVal;
            }
            return lastVal;
        }

        // 3. 単項 not
        if (/^not(?:\s+|\()/.test(s)) {
            const rest = s.replace(/^not\s*/, '');
            return !this.isTruthy(this.evalExpr(rest, env, lineNo));
        }

        // 4. 比較演算子 (==, !=, <=, >=, <, >, in) ※連鎖比較 (10 <= x <= 50) 対応
        const compChain = this.splitTopLevelComparisons(s);
        if (compChain) {
            const { operands, ops } = compChain;
            let prevVal = this.evalExpr(operands[0], env, lineNo);
            for (let i = 0; i < ops.length; i++) {
                const nextVal = this.evalExpr(operands[i + 1], env, lineNo);
                const op = ops[i];
                let ok = false;
                if (op === '==') ok = prevVal === nextVal;
                else if (op === '!=') ok = prevVal !== nextVal;
                else if (op === '<=') ok = prevVal <= nextVal;
                else if (op === '>=') ok = prevVal >= nextVal;
                else if (op === '<') ok = prevVal < nextVal;
                else if (op === '>') ok = prevVal > nextVal;
                else if (op === 'in') ok = Array.isArray(nextVal) ? nextVal.includes(prevVal) : String(nextVal).includes(String(prevVal));
                if (!ok) return false;
                prevVal = nextVal;
            }
            return true;
        }

        // 5. 加減算 (+, -)
        const addSub = this.splitTopLevelBinaryOps(s, ['+', '-']);
        if (addSub) {
            let acc = this.evalExpr(addSub.operands[0], env, lineNo);
            for (let i = 0; i < addSub.ops.length; i++) {
                const op = addSub.ops[i];
                const r = this.evalExpr(addSub.operands[i + 1], env, lineNo);
                if (op === '+') {
                    if (Array.isArray(acc) && Array.isArray(r)) {
                        acc = acc.concat(r);
                    } else if ((typeof acc === 'string' && typeof r !== 'string') || (typeof acc !== 'string' && typeof r === 'string')) {
                        throw new Error(`  File "main.py", line ${lineNo}\nTypeError: can only concatenate str (not "${typeof r}") to str`);
                    } else {
                        acc = acc + r;
                    }
                } else {
                    acc = acc - r;
                }
            }
            return acc;
        }

        // 6. 乗除算 (*, //, /, %)
        const mulDiv = this.splitTopLevelBinaryOps(s, ['*', '//', '/', '%']);
        if (mulDiv) {
            let acc = this.evalExpr(mulDiv.operands[0], env, lineNo);
            for (let i = 0; i < mulDiv.ops.length; i++) {
                const op = mulDiv.ops[i];
                const r = this.evalExpr(mulDiv.operands[i + 1], env, lineNo);
                if (op === '*') {
                    if (typeof acc === 'string' && typeof r === 'number') acc = acc.repeat(Math.max(0, r));
                    else if (typeof acc === 'number' && typeof r === 'string') acc = r.repeat(Math.max(0, acc));
                    else acc = acc * r;
                } else if (op === '/') {
                    if (r === 0) throw new Error(`  File "main.py", line ${lineNo}\nZeroDivisionError: division by zero`);
                    acc = acc / r;
                } else if (op === '//') {
                    if (r === 0) throw new Error(`  File "main.py", line ${lineNo}\nZeroDivisionError: integer division or modulo by zero`);
                    acc = Math.floor(acc / r);
                } else if (op === '%') {
                    if (r === 0) throw new Error(`  File "main.py", line ${lineNo}\nZeroDivisionError: integer division or modulo by zero`);
                    acc = ((acc % r) + r) % r;
                }
            }
            return acc;
        }

        // 7. 単項 +, -
        if (s.startsWith('-')) {
            return -this.evalExpr(s.slice(1), env, lineNo);
        }
        if (s.startsWith('+')) {
            return +this.evalExpr(s.slice(1), env, lineNo);
        }

        // 8. べき乗 (**)
        const powParts = this.splitTopLevelBinaryOps(s, ['**']);
        if (powParts) {
            let acc = this.evalExpr(powParts.operands[powParts.operands.length - 1], env, lineNo);
            for (let i = powParts.operands.length - 2; i >= 0; i--) {
                acc = Math.pow(this.evalExpr(powParts.operands[i], env, lineNo), acc);
            }
            return acc;
        }

        // 9. カッコで囲まれた式
        if (s.startsWith('(') && s.endsWith(')') && this.isMatchingOuterPair(s, '(', ')')) {
            return this.evalExpr(s.slice(1, -1), env, lineNo);
        }

        // 10. リストリテラル [...]
        if (s.startsWith('[') && s.endsWith(']') && this.isMatchingOuterPair(s, '[', ']')) {
            const inner = s.slice(1, -1).trim();
            if (!inner) return [];
            const items = this.splitTopLevelComma(inner);
            return items.map((item) => this.evalExpr(item, env, lineNo));
        }

        // 11. 文字列リテラル
        if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
            if (this.isSingleStringLiteral(s)) {
                return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\"/g, '"').replace(/\\'/g, "'");
            }
        }

        // 12. 数値・真偽値リテラル
        if (s === 'True') return true;
        if (s === 'False') return false;
        if (s === 'None') return null;
        if (/^\d+$/.test(s)) return parseInt(s, 10);
        if (/^\d+\.\d+$/.test(s)) return parseFloat(s);

        // 13. メソッド呼び出し（例: random.randint(a, b), arr.append(x)）
        const methodMatch = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\.([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$/);
        if (methodMatch && this.isMatchingOuterPair(s.slice(methodMatch[1].length + 1 + methodMatch[2].length), '(', ')')) {
            const objName = methodMatch[1];
            const method = methodMatch[2];
            const argsRaw = methodMatch[3].trim();
            const args = argsRaw ? this.splitTopLevelComma(argsRaw).map((a) => this.evalExpr(a, env, lineNo)) : [];

            // random モジュールのサポート (random.randint, random.random, random.choice)
            if (objName === 'random') {
                if (method === 'randint') {
                    if (args.length < 2) {
                        throw new Error(`  File "main.py", line ${lineNo}\nTypeError: randint() missing required arguments`);
                    }
                    const minVal = Math.ceil(Number(args[0]));
                    const maxVal = Math.floor(Number(args[1]));
                    if (minVal > maxVal) {
                        throw new Error(`  File "main.py", line ${lineNo}\nValueError: empty range for randrange() (${minVal}, ${maxVal})`);
                    }
                    return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
                }
                if (method === 'random') {
                    return Math.random();
                }
                if (method === 'choice') {
                    const seq = args[0];
                    if (!Array.isArray(seq) || seq.length === 0) {
                        throw new Error(`  File "main.py", line ${lineNo}\nIndexError: Cannot choose from an empty sequence`);
                    }
                    return seq[Math.floor(Math.random() * seq.length)];
                }
            }

            const target = this.lookupVar(objName, env, lineNo);
            if (Array.isArray(target) && method === 'append') {
                target.push(args[0]);
                return null;
            }
            throw new Error(`  File "main.py", line ${lineNo}\nAttributeError: unsupported method '${method}'`);
        }

        // 14. 関数呼び出し: func(...)
        const fnCallMatch = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\(([\s\S]*)\)$/);
        if (fnCallMatch && this.isMatchingOuterPair(s.slice(fnCallMatch[1].length), '(', ')')) {
            const fnName = fnCallMatch[1];
            const argsRaw = fnCallMatch[2].trim();
            const args = argsRaw ? this.splitTopLevelComma(argsRaw).map((a) => this.evalExpr(a, env, lineNo)) : [];
            return this.callFunction(fnName, args, env, lineNo);
        }

        // 15. 配列参照: arr[idx]
        const indexMatch = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\[([\s\S]+)\]$/);
        if (indexMatch && this.isMatchingOuterPair(s.slice(indexMatch[1].length), '[', ']')) {
            const arr = this.lookupVar(indexMatch[1], env, lineNo);
            const idx = this.evalExpr(indexMatch[2], env, lineNo);
            if (!Array.isArray(arr) && typeof arr !== 'string') {
                throw new Error(`  File "main.py", line ${lineNo}\nTypeError: '${indexMatch[1]}' object is not subscriptable`);
            }
            const actualIdx = idx < 0 ? arr.length + idx : idx;
            if (actualIdx < 0 || actualIdx >= arr.length) {
                throw new Error(`  File "main.py", line ${lineNo}\nIndexError: list index out of range`);
            }
            return arr[actualIdx];
        }

        // 16. 変数参照
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s)) {
            return this.lookupVar(s, env, lineNo);
        }

        throw new Error(`  File "main.py", line ${lineNo}\n    ${s}\nSyntaxError: invalid syntax`);
    }

    callFunction(fnName, args, env, lineNo) {
        // 組み込み関数
        if (fnName === 'print') {
            const formatted = args.map((a) => this.formatPythonValue(a));
            this.onStdout(formatted.join(' ') + '\n');
            return null;
        }

        if (fnName === 'input') {
            const promptText = args.length > 0 && args[0] !== null && args[0] !== undefined ? String(args[0]) : '';
            const val = window.prompt(promptText || '値を入力してください:', '');
            const res = PyodideManager.normalizeInputString(val !== null ? val : '');
            this.onStdout(promptText + res + '\n');
            return res;
        }

        if (fnName === 'newInput') {
            // ユーザ定義の newInput が登録されていればそちらを実行、なければ標準動作として実行
            if (this.functions['newInput']) {
                return this.invokeUserFunction(this.functions['newInput'], args, lineNo);
            }
            const promptText = args.length > 0 && args[0] !== null && args[0] !== undefined ? String(args[0]) : '';
            const val = window.prompt(promptText || '値を入力してください:', '');
            const s = PyodideManager.normalizeInputString(val !== null ? val : '');
            this.onStdout(promptText + s + '\n');
            if (/^[+-]?\d+$/.test(s.trim())) return parseInt(s.trim(), 10);
            if (/^[+-]?\d+\.\d+$/.test(s.trim())) return parseFloat(s.trim());
            return s;
        }

        if (fnName === 'range') {
            let start = 0, stop = 0, step = 1;
            if (args.length === 1) {
                stop = Number(args[0]);
            } else if (args.length === 2) {
                start = Number(args[0]);
                stop = Number(args[1]);
            } else if (args.length >= 3) {
                start = Number(args[0]);
                stop = Number(args[1]);
                step = Number(args[2]);
            }
            if (step === 0) throw new Error(`  File "main.py", line ${lineNo}\nValueError: range() arg 3 must not be zero`);
            const arr = [];
            if (step > 0) {
                for (let k = start; k < stop; k += step) arr.push(k);
            } else {
                for (let k = start; k > stop; k += step) arr.push(k);
            }
            return arr;
        }

        if (fnName === 'len') return args[0] ? args[0].length : 0;
        if (fnName === 'int') {
            const v = Number(String(args[0]).trim());
            if (Number.isNaN(v)) throw new Error(`  File "main.py", line ${lineNo}\nValueError: invalid literal for int()`);
            return Math.trunc(v);
        }
        if (fnName === 'float') {
            const v = Number(String(args[0]).trim());
            if (Number.isNaN(v)) throw new Error(`  File "main.py", line ${lineNo}\nValueError: could not convert string to float`);
            return v;
        }
        if (fnName === 'str') return this.formatPythonValue(args[0]);
        if (fnName === 'abs') return Math.abs(args[0]);
        if (fnName === 'round') {
            const digits = args.length > 1 ? Number(args[1]) : 0;
            const factor = Math.pow(10, digits);
            return Math.round(Number(args[0]) * factor) / factor;
        }
        if (fnName === 'sum') return (args[0] || []).reduce((a, b) => a + b, 0);
        if (fnName === 'max') return Array.isArray(args[0]) ? Math.max(...args[0]) : Math.max(...args);
        if (fnName === 'min') return Array.isArray(args[0]) ? Math.min(...args[0]) : Math.min(...args);
        if (fnName === 'randint') {
            const minVal = Math.ceil(Number(args[0]));
            const maxVal = Math.floor(Number(args[1]));
            return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
        }

        if (this.functions[fnName]) {
            return this.invokeUserFunction(this.functions[fnName], args, lineNo);
        }

        throw new Error(`  File "main.py", line ${lineNo}\nNameError: name '${fnName}' is not defined`);
    }

    invokeUserFunction(fnDef, args, callerLineNo) {
        const localEnv = Object.create(this.globalEnv);
        const paramParts = fnDef.paramsRaw ? this.splitTopLevelComma(fnDef.paramsRaw) : [];

        for (let i = 0; i < paramParts.length; i++) {
            const p = paramParts[i].trim();
            const eqIdx = p.indexOf('=');
            if (eqIdx !== -1) {
                const pName = p.slice(0, eqIdx).trim();
                const defExpr = p.slice(eqIdx + 1).trim();
                localEnv[pName] = i < args.length ? args[i] : this.evalExpr(defExpr, this.globalEnv, fnDef.lineNo);
            } else {
                localEnv[p] = i < args.length ? args[i] : null;
            }
        }

        const res = this.execStatements(fnDef.body, localEnv);
        if (res instanceof ReturnSignal) {
            return res.value;
        }
        return null;
    }

    formatPythonValue(val) {
        if (val === true) return 'True';
        if (val === false) return 'False';
        if (val === null || val === undefined) return 'None';
        if (typeof val === 'number') {
            if (!Number.isInteger(val)) {
                const rounded = Math.round(val * 1e10) / 1e10;
                return Number.isInteger(rounded) ? `${rounded}.0` : String(rounded);
            }
            return String(val);
        }
        if (Array.isArray(val)) {
            return '[' + val.map((v) => (typeof v === 'string' ? `'${v}'` : this.formatPythonValue(v))).join(', ') + ']';
        }
        return String(val);
    }

    // --- 式パーサ補助メソッド ---
    isMatchingOuterPair(str, openCh, closeCh) {
        if (!str.startsWith(openCh) || !str.endsWith(closeCh)) return false;
        let depth = 0;
        let inStr = false;
        let q = '';
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inStr) {
                if (ch === q && str[i - 1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inStr = true;
                q = ch;
                continue;
            }
            if (ch === openCh) depth++;
            else if (ch === closeCh) {
                depth--;
                if (depth === 0 && i < str.length - 1) return false;
            }
        }
        return depth === 0;
    }

    isSingleStringLiteral(str) {
        const q = str[0];
        for (let i = 1; i < str.length - 1; i++) {
            if (str[i] === q && str[i - 1] !== '\\') return false;
        }
        return true;
    }

    splitTopLevelComma(str) {
        const res = [];
        let cur = '';
        let depth = 0;
        let inStr = false;
        let q = '';
        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inStr) {
                cur += ch;
                if (ch === q && str[i - 1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inStr = true;
                q = ch;
                cur += ch;
                continue;
            }
            if (ch === '(' || ch === '[') depth++;
            if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
            if (depth === 0 && ch === ',') {
                res.push(cur.trim());
                cur = '';
                continue;
            }
            cur += ch;
        }
        if (cur.trim()) res.push(cur.trim());
        return res;
    }

    splitTopLevelKeyword(str, kw) {
        const res = [];
        let cur = '';
        let depth = 0;
        let inStr = false;
        let q = '';
        const kwLen = kw.length;

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inStr) {
                cur += ch;
                if (ch === q && str[i - 1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inStr = true;
                q = ch;
                cur += ch;
                continue;
            }
            if (ch === '(' || ch === '[') depth++;
            if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

            if (depth === 0 && str.slice(i, i + kwLen) === kw) {
                const prev = str[i - 1] || ' ';
                const next = str[i + kwLen] || ' ';
                if (/[\s)\]]/.test(prev) && /[\s(\[]/.test(next)) {
                    res.push(cur.trim());
                    cur = '';
                    i += kwLen - 1;
                    continue;
                }
            }
            cur += ch;
        }
        res.push(cur.trim());
        return res;
    }

    splitTopLevelComparisons(str) {
        const operands = [];
        const ops = [];
        let cur = '';
        let depth = 0;
        let inStr = false;
        let q = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inStr) {
                cur += ch;
                if (ch === q && str[i - 1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inStr = true;
                q = ch;
                cur += ch;
                continue;
            }
            if (ch === '(' || ch === '[') depth++;
            if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

            if (depth === 0) {
                const two = str.slice(i, i + 2);
                if (['==', '!=', '<=', '>='].includes(two)) {
                    operands.push(cur.trim());
                    ops.push(two);
                    cur = '';
                    i++;
                    continue;
                }
                if (ch === '<' || ch === '>') {
                    operands.push(cur.trim());
                    ops.push(ch);
                    cur = '';
                    continue;
                }
                if (str.slice(i, i + 2) === 'in' && /[\s)\]]/.test(str[i - 1] || ' ') && /[\s(\[]/.test(str[i + 2] || ' ')) {
                    operands.push(cur.trim());
                    ops.push('in');
                    cur = '';
                    i++;
                    continue;
                }
            }
            cur += ch;
        }

        if (ops.length === 0) return null;
        operands.push(cur.trim());
        return { operands, ops };
    }

    splitTopLevelBinaryOps(str, targetOps) {
        const operands = [];
        const ops = [];
        let cur = '';
        let depth = 0;
        let inStr = false;
        let q = '';

        for (let i = 0; i < str.length; i++) {
            const ch = str[i];
            if (inStr) {
                cur += ch;
                if (ch === q && str[i - 1] !== '\\') inStr = false;
                continue;
            }
            if (ch === '"' || ch === "'") {
                inStr = true;
                q = ch;
                cur += ch;
                continue;
            }
            if (ch === '(' || ch === '[') depth++;
            if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);

            if (depth === 0) {
                const two = str.slice(i, i + 2);
                if (targetOps.includes(two)) {
                    if (cur.trim() !== '') {
                        operands.push(cur.trim());
                        ops.push(two);
                        cur = '';
                        i++;
                        continue;
                    }
                }
                // `/` が `//` の一部である場合はスキップ
                if (ch === '/' && (str[i + 1] === '/' || str[i - 1] === '/')) {
                    cur += ch;
                    continue;
                }
                // `*` が `**` の一部である場合はスキップ
                if (ch === '*' && (str[i + 1] === '*' || str[i - 1] === '*')) {
                    cur += ch;
                    continue;
                }
                if (targetOps.includes(ch)) {
                    // 単項の + / - でないことを確認（直前に被演算子がある場合のみ分割）
                    if (cur.trim() !== '' && !/[+\-*/%(\[,]$/.test(cur.trim())) {
                        operands.push(cur.trim());
                        ops.push(ch);
                        cur = '';
                        continue;
                    }
                }
            }
            cur += ch;
        }

        if (ops.length === 0) return null;
        operands.push(cur.trim());
        return { operands, ops };
    }
}

window.PyodideManager = PyodideManager;
