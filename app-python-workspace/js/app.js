/**
 * app.js
 * 高校「情報I」ロジック変換・実行ワークスペース
 * （外部API・パスワード不要、100%ブラウザ内ルールベースDNCL変換エンジン完結版）
 */

// ===================================================
// 1. 定数・ローカル保存キー・newInput() ヘッダー定義
// ===================================================
const STORAGE_KEYS = {
    SELECTED_PROBLEM: 'info1_ws_selected_problem',
    LAST_PROBLEM_BY_CHAP: 'info1_ws_last_prob_chap_',
    JP_CODE_PREFIX: 'info1_ws_jp_code_v2_',
    PY_CODE_PREFIX: 'info1_ws_py_code_v2_'
};

// ローカル(file://)で直接HTMLを開いた際にもエラーにならず動作するための内蔵フォールバックデータ
// （GitHub Pages等のhttp/https環境では problems/index.json および各JSONファイルをfetchします）
const FALLBACK_PROBLEMS_INDEX = {
    "chapters":  [
                     {
                         "chapterId":  "chap02",
                         "chapterTitle":  "Chap2 分岐",
                         "problems":  [
                                          {
                                              "id":  "c02_ex01",
                                              "title":  "例1 名前の入力とあいさつ",
                                              "file":  "chap02/ex01.json"
                                          },
                                          {
                                              "id":  "c02_q01",
                                              "title":  "問1 好きな食べ物の入力と表示",
                                              "file":  "chap02/q01.json"
                                          },
                                          {
                                              "id":  "c02_ex02",
                                              "title":  "例2 商と余りの計算（あめの分配）",
                                              "file":  "chap02/ex02.json"
                                          },
                                          {
                                              "id":  "c02_q02",
                                              "title":  "問2 秒数を分と秒に換算",
                                              "file":  "chap02/q02.json"
                                          },
                                          {
                                              "id":  "c02_ex03",
                                              "title":  "例3 条件分岐（単一のif）",
                                              "file":  "chap02/ex03.json"
                                          },
                                          {
                                              "id":  "c02_q03",
                                              "title":  "問3 気温による警告表示（if文）",
                                              "file":  "chap02/q03.json"
                                          },
                                          {
                                              "id":  "c02_ex04",
                                              "title":  "例4 条件分岐（if〜else：偶数・奇数）",
                                              "file":  "chap02/ex04.json"
                                          },
                                          {
                                              "id":  "c02_q04",
                                              "title":  "問4 3の倍数の判定（if〜else）",
                                              "file":  "chap02/q04.json"
                                          },
                                          {
                                              "id":  "c02_ex05",
                                              "title":  "例5 多重分岐（if〜elif〜else：成績判定）",
                                              "file":  "chap02/ex05.json"
                                          },
                                          {
                                              "id":  "c02_q05",
                                              "title":  "問5 年齢による入場料区分（elif文）",
                                              "file":  "chap02/q05.json"
                                          },
                                          {
                                              "id":  "c02_q06",
                                              "title":  "問6 発展：うるう年の判定",
                                              "file":  "chap02/q06.json"
                                          },
                                          {
                                              "id":  "c02_q07",
                                              "title":  "問7 発展：自由課題",
                                              "file":  "chap02/q07.json"
                                          }
                                      ]
                     },
                     {
                         "chapterId":  "chap03",
                         "chapterTitle":  "Chap3 反復",
                         "problems":  [
                                          {
                                              "id":  "c03_ex01",
                                              "title":  "例1 決まった回数の繰り返し",
                                              "file":  "chap03/ex01.json"
                                          },
                                          {
                                              "id":  "c03_q01",
                                              "title":  "問1 1から10までのカウント表示",
                                              "file":  "chap03/q01.json"
                                          },
                                          {
                                              "id":  "c03_ex02",
                                              "title":  "例2 1から10までの総和（累計計算）",
                                              "file":  "chap03/ex02.json"
                                          },
                                          {
                                              "id":  "c03_q02",
                                              "title":  "問2 偶数の合計計算（2から100まで）",
                                              "file":  "chap03/q02.json"
                                          },
                                          {
                                              "id":  "c03_ex03",
                                              "title":  "例3 条件繰り返し（入力累積加算）",
                                              "file":  "chap03/ex03.json"
                                          },
                                          {
                                              "id":  "c03_q03",
                                              "title":  "問3 条件繰り返し（入力累積減算）",
                                              "file":  "chap03/q03.json"
                                          },
                                          {
                                              "id":  "c03_ex04",
                                              "title":  "例4 複合条件（かつ）",
                                              "file":  "chap03/ex04.json"
                                          },
                                          {
                                              "id":  "c03_q04",
                                              "title":  "問4 複合条件（または）",
                                              "file":  "chap03/q04.json"
                                          },
                                          {
                                              "id":  "c03_ex05",
                                              "title":  "例5 ループと分岐（偶数・奇数の判定）",
                                              "file":  "chap03/ex05.json"
                                          },
                                          {
                                              "id":  "c03_q05",
                                              "title":  "問5 ループと多重分岐（3と5の倍数判定）",
                                              "file":  "chap03/q05.json"
                                          }
                                      ]
                     }
                 ]
};

const FALLBACK_PROBLEM_FILES = {
    "chap02/q03.json":  {
                            "id":  "c02_q03",
                            "title":  "問3 気温による警告表示（if文）",
                            "description":  "ユーザ入力() で気温(temp)を受け取り、30度以上のときに「熱中症に気をつけて！」と警告を表示する手順を完成させよう。○○に条件を入れてください。",
                            "template":  "temp = ユーザ入力(\"気温を入力\")\nもし ○○ ならば\n　表示する(\"熱中症に気をつけて！\")\n表示する(\"計測完了\")"
                        },
    "chap03/ex03.json":  {
                             "id":  "c03_ex03",
                             "title":  "例3 条件繰り返し（入力累積加算）",
                             "description":  "変数 num が 20 より小さい間、ユーザ入力() で数を足し続けていき、20 を超えたら終了する手順です。",
                             "template":  "num = 0\nnum が 20 より小さい間 繰り返す\n　x = ユーザ入力(\"1から5までの数を入力：\")\n　num = num+x\n表示する(num,\"になりました。20を超えました\")"
                         },
    "chap03/ex02.json":  {
                             "id":  "c03_ex02",
                             "title":  "例2 1から10までの総和（累計計算）",
                             "description":  "変数 total に 1 から 10 までの数を順番に足し合わせていき、合計を求める手順です。",
                             "template":  "total = 0\ni を 1 から 10 まで 1 ずつ増やしながら繰り返す:\n　total = total + i\n　表示する(i, \"を足しました。現在の合計:\", total)\n表示する(\"最終的な合計は\", total, \"です！\")"
                         },
    "chap03/ex05.json":  {
                             "id":  "c03_ex05",
                             "title":  "例5 ループと分岐（偶数・奇数の判定）",
                             "description":  "1 から 15 までの数をループで回し、各数が偶数か奇数かを判定して表示する手順です。",
                             "template":  "i を 1 から 15 まで 1 ずつ増やしながら繰り返す:\n　もし i % 2 が 0 と等しいならば\n　　表示する(i, \"は偶数です\")\n　そうでなければ\n　　表示する(i, \"は奇数です\")"
                         },
    "chap02/ex01.json":  {
                             "id":  "c02_ex01",
                             "title":  "例1 名前の入力とあいさつ",
                             "description":  "ユーザ入力() で名前を受け取り、変数 name に代入してあいさつを表示する手順です。",
                             "template":  "name = ユーザ入力(\"名前を入力\")\n表示する(\"こんにちは、\", name, \"さん！\")"
                         },
    "chap02/ex03.json":  {
                             "id":  "c02_ex03",
                             "title":  "例3 条件分岐（単一のif）",
                             "description":  "ユーザ入力() で点数を受け取り、80点以上の場合にメッセージを表示する手順です。",
                             "template":  "score = ユーザ入力()\nもし scoreが80以上ならば\n　表示する(\"素晴らしい！合格点突破です！\")\n表示する(\"判定が終了しました。\")"
                         },
    "chap02/ex02.json":  {
                             "id":  "c02_ex02",
                             "title":  "例2 商と余りの計算（あめの分配）",
                             "description":  "13個のあめを4人に均等に配るときの1人あたりの個数（商 //）と余り（余り %）を計算して表示する手順です。",
                             "template":  "candy = 13\npeople = 4\nsho = candy // people\namari = candy % people\n表示する(\"1人あたり\", sho, \"個配れます\")\n表示する(\"余りは\", amari, \"個です\")"
                         },
    "chap03/q03.json":  {
                            "id":  "c03_q03",
                            "title":  "問3 条件繰り返し（入力累積減算）",
                            "description":  "変数 num が 0 より大きい間、ユーザ入力() で数を引き続けていき、0 より小さくなったら終了する手順を完成させよう。○○に条件を入れてください。",
                            "template":  "num = 20\nnum が ○○間 繰り返す\n　x = ユーザ入力(\"1から5までの数を入力：\")\n　num = num-x\n表示する(num,\"になりました。0より小さくなりました\")"
                        },
    "chap03/q04.json":  {
                            "id":  "c03_q04",
                            "title":  "問4 複合条件（または）",
                            "description":  "購入金額(price)と会員ランク(rank)を受け取り、金額が○○以上またはランクが○○の場合に「送料無料」、それ以外は「送料500円」と表示する手順を完成させよう。○○を適切な内容に変更してください。",
                            "template":  "price = ユーザ入力(\"購入金額：\")\nrank = ユーザ入力(\"会員ランク（A, B）：\")\nもし price が ○○ 以上 ○○ rank が ○○ と等しいならば\n　表示する(\"送料無料\")\nそうでなければ\n　表示する(\"送料500円\")"
                        },
    "chap03/ex01.json":  {
                             "id":  "c03_ex01",
                             "title":  "例1 決まった回数の繰り返し",
                             "description":  "ループカウンタ変数 i を使って、1 から 5 までの決まった回数の処理を繰り返す手順です。",
                             "template":  "i を 1 から 5 まで 1 ずつ増やしながら繰り返す:\n　表示する(\"こんにちは！\")\n　表示する(\"いま\", i, \"回目のループです\")\n表示する(\"終了しました\")"
                         },
    "chap02/ex04.json":  {
                             "id":  "c02_ex04",
                             "title":  "例4 条件分岐（if〜else：偶数奇数の判定）",
                             "description":  "入力された値が偶数なら偶数ですと表示し、奇数なら奇数ですと表示する。",
                             "template":  "num = newInput(\"整数を入力\")\nもし numを2で割った余りが0 ならば\n　表示する(\"偶数ですね\")\n　表示する(\"2で割り切れますね！\")\nそうでなければ\n　表示する(\"奇数です\")\n　表示する(\"2で割り切れませんね！\")\n表示する(\"判定終了\")"
                         },
    "chap03/q02.json":  {
                            "id":  "c03_q02",
                            "title":  "問2 偶数の合計計算（2から100まで）",
                            "description":  "2 から 100 までの偶数を 2 ずつ増やしながら足し合わせ、その合計(total)を表示する手順を完成させよう。",
                            "template":  "total = 0\ni を 2 から 100 まで 2 ずつ増やしながら繰り返す:\n　total = total + i\n表示する(\"1から100までの偶数の合計は\", total, \"です！\")"
                        },
    "chap03/ex04.json":  {
                             "id":  "c03_ex04",
                             "title":  "例4 複合条件（かつ）",
                             "description":  "テストの点数(score)とレポート評価(report)を受け取り、点数が80以上かつ評価が「A」の場合に「合格」、それ以外は「不合格」と表示する手順です。",
                             "template":  "score = ユーザ入力(\"テストの点数：\")\nreport = ユーザ入力(\"レポート評価(A,B,C)：\")\nもし score が 80 以上 かつ report が \"A\" と等しいならば\n　表示する(\"合格\")\nそうでなければ\n　表示する(\"不合格\")"
                         },
    "chap03/q05.json":  {
                            "id":  "c03_q05",
                            "title":  "問5 ループと多重分岐（3と5の倍数判定）",
                            "description":  "1 から 20 までの数をループで回し、3と5の倍数、3の倍数、5の倍数をそれぞれ判定して表示する手順（FizzBuzz）を完成させよう。○○を適切な内容に変更してください。",
                            "template":  "i を 1 から ○○ まで 1 ずつ増やしながら繰り返す:\n　もし iを3で割った余りが 0 と等しい ○○ iを5で割った余り が 0 と等しいならば\n　　表示する(i, \"は3と5の倍数\")\n　そうでなく もし iを3で割った余りが 0 と等しいならば\n　　表示する(i, \"は3の倍数\")\n　そうでなく もし iを5で割った余りが 0 と等しいならば\n　　表示する(i, \"は5の倍数\")\n　そうでなければ\n　　表示する(i)"
                        },
    "chap02/ex05.json":  {
                             "id":  "c02_ex05",
                             "title":  "例5 多重分岐（if〜elif〜else：成績判定）",
                             "description":  "点数に応じてA・B・Cの3段階で判定を表示する手順です。",
                             "template":  "score = ユーザ入力()\nもし scoreが80以上 ならば\n　表示する(\"ランク：A\")\nそうでなく もし scoreが60以上 ならば\n　表示する(\"ランク：B\")\nそうでなければ\n　表示する(\"ランク：C\")"
                         },
    "chap02/q07.json":  {
                            "id":  "c02_q07",
                            "title":  "問7 発展：自由課題",
                            "description":  "特に指定はしないので自由にプログラムを作ってみてください。",
                            "template":  ""
                        },
    "chap02/q04.json":  {
                            "id":  "c02_q04",
                            "title":  "問4 3の倍数の判定（if〜else）",
                            "description":  "ユーザ入力() で整数(num)を受け取り、3で割った余りが0なら「3で割り切れますね」、そうでなければ「3で割り切れないですね」と表示されるように〇〇をうめよう。",
                            "template":  "num = ユーザ入力(\"整数を入力\")\nもし ○○ ならば\n　表示する(\"3で割り切れますね\")\n　表示する(\"余りが出ないです\")\n○○\n　表示する(\"3で割り切れないですね\")\n　表示する(\"余りが出ますね\")\n表示する(\"判定終了\")"
                        },
    "chap02/q06.json":  {
                            "id":  "c02_q06",
                            "title":  "問6 発展：うるう年の判定",
                            "description":  "ユーザ入力() で西暦を受け取り、変数yearに代入する。もしyearが4の倍数だったらうるう年ですと表示し、そうでなければうるう年ではありません、と表示するプログラムを一から考えてみてください。",
                            "template":  ""
                        },
    "chap02/q02.json":  {
                            "id":  "c02_q02",
                            "title":  "問2 秒数を分と秒に換算",
                            "description":  "ユーザ入力() で全体の秒数(total_sec)を受け取り、分(minute)と秒(sec)に換算して表示する手順を完成させよう。○○を適切な計算記号に変換してください。",
                            "template":  "total_sec = ユーザ入力(\"秒数を入力\")\nminute = total_sec ○○ 60\nsec = total_sec ○○ 60\n表示する(minute, \"分\", sec, \"秒です\")"
                        },
    "chap03/q01.json":  {
                            "id":  "c03_q01",
                            "title":  "問1 1から10までのカウント表示",
                            "description":  "ループカウンタ変数 i を 1 から 10 まで増やしながら、「○問目！」と表示する手順を完成させよう。",
                            "template":  "i を 1 から 10 まで 1 ずつ増やしながら繰り返す:\n　表示する(i, \"問目！\")"
                        },
    "chap02/q05.json":  {
                            "id":  "c02_q05",
                            "title":  "問5 年齢による入場料区分（elif文）",
                            "description":  "ユーザ入力() で年齢(age)を受け取り、大人(18歳以上)・子ども(6歳以上)・幼児に区分して料金を表示する手順を完成させよう。○○に条件を入れてください。",
                            "template":  "age = ユーザ入力(\"年齢を入力\")\nもし ○○ ならば\n　表示する(\"区分：大人\")\n　表示する(\"料金は 1800 円です。\")\nそうでなく もし ○○ ならば\n　表示する(\"区分：子ども（小・中・高）\")\n　表示する(\"料金は 1000 円です。\")\nそうでなければ\n　表示する(\"区分：幼児\")\n　表示する(\"料金は 無料 です！\")\n表示する(\"チケットを発行しました。\")"
                        },
    "chap02/q01.json":  {
                            "id":  "c02_q01",
                            "title":  "問1 好きな食べ物の入力と表示",
                            "description":  "ユーザ入力() で好きな食べ物を受け取り、変数 food に代入して「○○はおいしいですね！」と表示する手順を完成させよう。○○を適切な内容に変更してください。",
                            "template":  "food = ○○\n表示する(food, \"はおいしいですね！\")"
                        }
};

// ===================================================
// 2. アプリケーション内部状態 ＆ 二重保持ストレージ
// ===================================================
const state = {
    chapters: [],
    problemMap: new Map(),
    currentProblemId: null,
    currentProblemData: null,
    isConverting: false,
    pyodideManager: null,
    pyErrorLine: null,
    storageAvailable: true,
    hasUnsavedChangesInMemory: false,
    memoryStore: {
        jp: new Map(),
        py: new Map(),
        lastProblemByChap: new Map(),
        selectedProblem: null
    }
};

function checkLocalStorageAvailable() {
    try {
        const testKey = '__info1_ws_storage_test__';
        window.localStorage.setItem(testKey, '1');
        window.localStorage.removeItem(testKey);
        return true;
    } catch {
        return false;
    }
}

function safeStorageGet(key) {
    if (!state.storageAvailable) return null;
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeStorageSet(key, val) {
    if (!state.storageAvailable) return false;
    try {
        window.localStorage.setItem(key, val);
        return true;
    } catch {
        state.storageAvailable = false;
        updateStorageStatusUI();
        return false;
    }
}

function getSavedJpCode(problemId) {
    if (state.memoryStore.jp.has(problemId)) {
        return state.memoryStore.jp.get(problemId);
    }
    const val = safeStorageGet(STORAGE_KEYS.JP_CODE_PREFIX + problemId);
    if (val !== null) {
        state.memoryStore.jp.set(problemId, val);
    }
    return val;
}

function setSavedJpCode(problemId, code) {
    if (!problemId) return;
    state.memoryStore.jp.set(problemId, code);
    state.hasUnsavedChangesInMemory = true;
    safeStorageSet(STORAGE_KEYS.JP_CODE_PREFIX + problemId, code);
}

function getSavedPyCode(problemId) {
    if (state.memoryStore.py.has(problemId)) {
        return state.memoryStore.py.get(problemId);
    }
    const val = safeStorageGet(STORAGE_KEYS.PY_CODE_PREFIX + problemId);
    if (val !== null) {
        state.memoryStore.py.set(problemId, val);
    }
    return val;
}

function setSavedPyCode(problemId, code) {
    if (!problemId) return;
    state.memoryStore.py.set(problemId, code);
    state.hasUnsavedChangesInMemory = true;
    safeStorageSet(STORAGE_KEYS.PY_CODE_PREFIX + problemId, code);
}

function getLastProblemForChapter(chapterId) {
    if (state.memoryStore.lastProblemByChap.has(chapterId)) {
        return state.memoryStore.lastProblemByChap.get(chapterId);
    }
    const val = safeStorageGet(STORAGE_KEYS.LAST_PROBLEM_BY_CHAP + chapterId);
    if (val) {
        state.memoryStore.lastProblemByChap.set(chapterId, val);
    }
    return val;
}

function setLastProblemForChapter(chapterId, problemId) {
    if (!chapterId || !problemId) return;
    state.memoryStore.lastProblemByChap.set(chapterId, problemId);
    safeStorageSet(STORAGE_KEYS.LAST_PROBLEM_BY_CHAP + chapterId, problemId);
}

function updateStorageStatusUI() {
    if (!state.storageAvailable) {
        if (dom.storageWarningBanner) {
            dom.storageWarningBanner.classList.remove('hidden');
        }
        if (dom.autosaveStatus) {
            dom.autosaveStatus.textContent = '⚠️ 自動保存オフ（要ダウンロード）';
            dom.autosaveStatus.classList.add('is-warning');
        }
    } else {
        if (dom.storageWarningBanner) {
            dom.storageWarningBanner.classList.add('hidden');
        }
        if (dom.autosaveStatus) {
            dom.autosaveStatus.textContent = '✓ 自動保存オン';
            dom.autosaveStatus.classList.remove('is-warning');
        }
    }
}

// ===================================================
// 3. DOM要素参照
// ===================================================
const dom = {};

function cacheDomElements() {
    dom.pyodideStatus = document.getElementById('pyodide-status');
    dom.pyodideStatusText = document.getElementById('pyodide-status-text');
    dom.storageWarningBanner = document.getElementById('storage-warning-banner');

    dom.chapterSelect = document.getElementById('chapter-select');
    dom.problemSelect = document.getElementById('problem-select');
    dom.problemDesc = document.getElementById('problem-desc');
    dom.autosaveStatus = document.getElementById('autosave-status');
    dom.btnResetProblem = document.getElementById('btn-reset-problem');

    dom.jpLineNumbers = document.getElementById('jp-line-numbers');
    dom.jpEditor = document.getElementById('jp-editor');
    dom.jpHighlightLayer = document.getElementById('jp-highlight-layer');
    dom.btnSaveJp = document.getElementById('btn-save-jp');
    dom.btnCopyJp = document.getElementById('btn-copy-jp');
    dom.btnConvert = document.getElementById('btn-convert');
    dom.convertSpinner = document.getElementById('convert-spinner');
    dom.convertBtnText = document.getElementById('convert-btn-text');

    dom.pyLineNumbers = document.getElementById('py-line-numbers');
    dom.pyEditor = document.getElementById('py-editor');
    dom.pyHighlightLayer = document.getElementById('py-highlight-layer');
    dom.btnSavePy = document.getElementById('btn-save-py');
    dom.btnCopyPy = document.getElementById('btn-copy-py');
    dom.btnRun = document.getElementById('btn-run');
    dom.consoleOutput = document.getElementById('console-output');
}

// ===================================================
// 4. 初期化処理
// ===================================================
document.addEventListener('DOMContentLoaded', async () => {
    cacheDomElements();

    // localStorage利用可能検査 ＆ 警告UI反映
    state.storageAvailable = checkLocalStorageAvailable();
    updateStorageStatusUI();

    // 自動保存が無効な環境でタブを閉じようとした際の離脱防止ガード
    window.addEventListener('beforeunload', (e) => {
        if (!state.storageAvailable && state.hasUnsavedChangesInMemory) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    initEditors();

    // Python実行環境の初期化（内蔵エンジンにより待ち時間ゼロで即座に実行可能）
    state.pyodideManager = new PyodideManager({
        onStatusChange: updatePyodideStatusUI,
        onStdout: (text) => appendConsole(text, 'stdout'),
        onStderr: (text) => appendConsole(text, 'stderr')
    });
    state.pyodideManager.init();

    // 問題一覧メタデータの読み込み
    await loadProblemsIndex();
});

// ===================================================
// 5. 問題一覧 (problems/index.json) と個別問題の動的読み込み
// ===================================================
async function loadProblemsIndex() {
    let data = null;
    try {
        const res = await fetch('./problems/index.json');
        if (res.ok) {
            data = await res.json();
        }
    } catch {
        // file:// 直開き時などは内蔵フォールバックデータを使用
    }
    if (!data) {
        data = FALLBACK_PROBLEMS_INDEX;
    }

    state.chapters = data.chapters || [];
    renderDropdowns();

    const savedProblemId = safeStorageGet(STORAGE_KEYS.SELECTED_PROBLEM) || state.memoryStore.selectedProblem;
    const firstProblemId = state.problemMap.keys().next().value;
    const targetId = (savedProblemId && state.problemMap.has(savedProblemId))
        ? savedProblemId
        : firstProblemId;

    if (targetId) {
        const targetMeta = state.problemMap.get(targetId);
        if (targetMeta) {
            dom.chapterSelect.value = targetMeta.chapterId;
            populateProblemDropdown(targetMeta.chapterId, targetId);
        }
        await selectProblem(targetId);
    }
}

function renderDropdowns() {
    dom.chapterSelect.innerHTML = '';
    state.problemMap.clear();

    // 1. 各章（Chap）を章セレクトボックスに追加し、全問題のメタデータを登録
    state.chapters.forEach((chapter) => {
        const option = document.createElement('option');
        option.value = chapter.chapterId;
        option.textContent = chapter.chapterTitle;
        dom.chapterSelect.appendChild(option);

        (chapter.problems || []).forEach((prob) => {
            state.problemMap.set(prob.id, {
                ...prob,
                chapterId: chapter.chapterId,
                chapterTitle: chapter.chapterTitle
            });
        });
    });

    // 2. 章（Chap）変更時のイベントリスナー（その章で直前に作業していた問題を優先復元）
    dom.chapterSelect.addEventListener('change', (e) => {
        const selectedChapId = e.target.value;
        const lastProbId = getLastProblemForChapter(selectedChapId);
        const chapter = state.chapters.find((c) => c.chapterId === selectedChapId);
        const hasLastProb = lastProbId && chapter && (chapter.problems || []).some((p) => p.id === lastProbId);
        const firstProb = getFirstProblemOfChapter(selectedChapId);
        const targetProbId = hasLastProb ? lastProbId : (firstProb ? firstProb.id : null);

        populateProblemDropdown(selectedChapId, targetProbId);
        if (targetProbId) {
            selectProblem(targetProbId);
        }
    });

    // 3. 問題変更時のイベントリスナー
    dom.problemSelect.addEventListener('change', (e) => {
        const newId = e.target.value;
        if (newId) {
            selectProblem(newId);
        }
    });
}

function getFirstProblemOfChapter(chapterId) {
    const chapter = state.chapters.find((c) => c.chapterId === chapterId);
    if (chapter && chapter.problems && chapter.problems.length > 0) {
        return chapter.problems[0];
    }
    return null;
}

function populateProblemDropdown(chapterId, activeProblemId) {
    dom.problemSelect.innerHTML = '';
    const chapter = state.chapters.find((c) => c.chapterId === chapterId);
    if (!chapter || !chapter.problems) return;

    chapter.problems.forEach((prob) => {
        const option = document.createElement('option');
        option.value = prob.id;
        option.textContent = prob.title;
        if (prob.id === activeProblemId) {
            option.selected = true;
        }
        dom.problemSelect.appendChild(option);
    });

    if (activeProblemId) {
        dom.problemSelect.value = activeProblemId;
    }
}

async function selectProblem(problemId) {
    const meta = state.problemMap.get(problemId);
    if (!meta) return;

    // 別の問題へ切り替える際、直前まで作業していた問題のコードを裏側で無音・即座に保存
    if (state.currentProblemId && state.currentProblemId !== problemId) {
        setSavedJpCode(state.currentProblemId, dom.jpEditor.value);
        setSavedPyCode(state.currentProblemId, dom.pyEditor.value);
    }

    state.currentProblemId = problemId;
    state.memoryStore.selectedProblem = problemId;
    safeStorageSet(STORAGE_KEYS.SELECTED_PROBLEM, problemId);
    setLastProblemForChapter(meta.chapterId, problemId);

    // 章セレクトと問題セレクトの選択状態を同期
    if (dom.chapterSelect.value !== meta.chapterId) {
        dom.chapterSelect.value = meta.chapterId;
        populateProblemDropdown(meta.chapterId, problemId);
    } else if (dom.problemSelect.value !== problemId) {
        dom.problemSelect.value = problemId;
    }

    let problemData = null;
    try {
        const res = await fetch(`./problems/${meta.file}`);
        if (res.ok) {
            problemData = await res.json();
        }
    } catch {
        // file:// 直開き時はフォールバック辞書から取得
    }
    if (!problemData && FALLBACK_PROBLEM_FILES[meta.file]) {
        problemData = FALLBACK_PROBLEM_FILES[meta.file];
    }

    if (!problemData) {
        dom.problemDesc.textContent = `問題ファイル (${meta.file}) が見つかりませんでした。`;
        return;
    }

    state.currentProblemData = problemData;

    dom.problemDesc.textContent = problemData.description || '';

    // 日本語コードの復元
    const savedJp = getSavedJpCode(problemId);
    const initialJp = savedJp !== null ? savedJp : (problemData.template || '');
    setJpEditorValue(initialJp, false);

    // Pythonコードの復元（保存済みのPythonコードがあればそれを最優先で復元し、自動変換で上書きしない）
    const savedPy = getSavedPyCode(problemId);
    if (savedPy !== null) {
        setPyEditorValue(savedPy, false);
    } else if (initialJp.trim()) {
        try {
            const pythonCode = transpileDnclToPython(initialJp);
            setPyEditorValue(pythonCode, false);
        } catch (err) {
            console.error('Auto transpile error:', err);
            setPyEditorValue('# 左側の「Pythonに変換 ➔」ボタンを押すと、ここにPythonコードが自動生成されます。\n', false);
        }
    } else {
        setPyEditorValue('# 左側の「Pythonに変換 ➔」ボタンを押すと、ここにPythonコードが自動生成されます。\n', false);
    }
}

// ===================================================
// 6. エディタ制御（行番号同期・自動保存・構文ハイライト）
// ===================================================
function initEditors() {
    dom.jpEditor.addEventListener('input', () => {
        updateLineNumbers(dom.jpEditor, dom.jpLineNumbers);
        updateJpHighlight();
        saveCurrentJpCode();
    });

    dom.jpEditor.addEventListener('scroll', () => {
        dom.jpLineNumbers.scrollTop = dom.jpEditor.scrollTop;
        if (dom.jpHighlightLayer) {
            dom.jpHighlightLayer.scrollTop = dom.jpEditor.scrollTop;
            dom.jpHighlightLayer.scrollLeft = dom.jpEditor.scrollLeft;
        }
    });

    dom.jpEditor.addEventListener('keydown', (e) => handleEditorTabKey(e, dom.jpEditor, () => {
        updateLineNumbers(dom.jpEditor, dom.jpLineNumbers);
        updateJpHighlight();
        saveCurrentJpCode();
    }, '　'));

    dom.jpEditor.addEventListener('compositionend', () => {
        updateJpHighlight();
    });

    dom.btnResetProblem.addEventListener('click', () => {
        if (!state.currentProblemData) return;
        const confirmReset = window.confirm('現在の日本語コードを初期テンプレートの状態に戻しますか？');
        if (!confirmReset) return;

        const template = state.currentProblemData.template || '';
        setJpEditorValue(template, true);

        // リセット時もPythonコードへ自動変換
        if (template.trim()) {
            try {
                const pythonCode = transpileDnclToPython(template);
                setPyEditorValue(pythonCode, true);
            } catch (err) {
                console.error('Reset auto transpile error:', err);
                setPyEditorValue('# 左側の「Pythonに変換 ➔」ボタンを押すと、ここにPythonコードが自動生成されます。\n', true);
            }
        } else {
            setPyEditorValue('# 左側の「Pythonに変換 ➔」ボタンを押すと、ここにPythonコードが自動生成されます。\n', true);
        }
        showAutosaveFeedback('初期状態にリセットしました');
    });

    dom.pyEditor.addEventListener('input', () => {
        clearPythonErrorHighlight();
        updateLineNumbers(dom.pyEditor, dom.pyLineNumbers);
        updatePythonHighlight();
        saveCurrentPyCode();
    });

    dom.pyEditor.addEventListener('scroll', () => {
        dom.pyLineNumbers.scrollTop = dom.pyEditor.scrollTop;
        dom.pyHighlightLayer.scrollTop = dom.pyEditor.scrollTop;
        dom.pyHighlightLayer.scrollLeft = dom.pyEditor.scrollLeft;
    });

    dom.pyEditor.addEventListener('keydown', (e) => handleEditorTabKey(e, dom.pyEditor, () => {
        clearPythonErrorHighlight();
        updateLineNumbers(dom.pyEditor, dom.pyLineNumbers);
        updatePythonHighlight();
        saveCurrentPyCode();
    }));

    dom.btnConvert.addEventListener('click', handleConvertClick);
    dom.btnRun.addEventListener('click', handleRunPythonClick);
    if (dom.btnClearConsole) {
        dom.btnClearConsole.addEventListener('click', () => {
            clearConsole();
        });
    }

    // コードのテキストファイルダウンロード（.txt ダウンロード）機能
    if (dom.btnSaveJp) {
        dom.btnSaveJp.addEventListener('click', () => {
            const filename = buildSaveFilename('日本語コード');
            downloadTextFile(dom.jpEditor.value, filename, dom.btnSaveJp, '📥 ダウンロード');
        });
    }
    if (dom.btnSavePy) {
        dom.btnSavePy.addEventListener('click', () => {
            const filename = buildSaveFilename('Pythonコード');
            downloadTextFile(dom.pyEditor.value, filename, dom.btnSavePy, '📥 ダウンロード');
        });
    }

    // コードのクリップボードコピー機能
    if (dom.btnCopyJp) {
        dom.btnCopyJp.addEventListener('click', () => {
            copyToClipboard(dom.jpEditor.value, dom.btnCopyJp, '📋 コピー');
        });
    }
    if (dom.btnCopyPy) {
        dom.btnCopyPy.addEventListener('click', () => {
            copyToClipboard(dom.pyEditor.value, dom.btnCopyPy, '📋 コピー');
        });
    }
}

function buildSaveFilename(suffix) {
    const meta = state.currentProblemId ? state.problemMap.get(state.currentProblemId) : null;
    if (!meta) {
        return `プログラム_${suffix}.txt`;
    }
    const chapPart = (meta.chapterTitle || meta.chapterId || '').replace(/\s+/g, '');
    const probPart = (meta.title || meta.id || '').replace(/\s+/g, '_');
    const rawName = `${chapPart}_${probPart}_${suffix}.txt`;
    return rawName.replace(/[\\/:*?"<>|]/g, '_');
}

function downloadTextFile(text, filename, button, defaultLabel = '📥 ダウンロード') {
    try {
        // Windowsのメモ帳等で文字化けしないよう UTF-8 BOM を付与
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        if (button) {
            button.textContent = '✓ ダウンロード完了！';
            button.classList.add('copied');
            setTimeout(() => {
                button.textContent = defaultLabel;
                button.classList.remove('copied');
            }, 1800);
        }
    } catch (err) {
        console.error('File save error:', err);
        if (button) {
            button.textContent = '✕ 失敗';
            setTimeout(() => {
                button.textContent = defaultLabel;
                button.classList.remove('copied');
            }, 1800);
        }
    }
}

async function copyToClipboard(text, button, defaultLabel = '📋 コピー') {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // フォールバック（file:// プロトコルや非セキュア環境用）
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            textarea.style.top = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy');
            textarea.remove();
        }
        button.textContent = '✓ コピー完了！';
        button.classList.add('copied');
        setTimeout(() => {
            button.textContent = defaultLabel;
            button.classList.remove('copied');
        }, 1800);
    } catch {
        button.textContent = '✕ コピー失敗';
        setTimeout(() => {
            button.textContent = defaultLabel;
            button.classList.remove('copied');
        }, 1800);
    }
}

function handleEditorTabKey(e, textarea, onAfterInsert, indent = '    ') {
    if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const val = textarea.value;
        textarea.value = val.substring(0, start) + indent + val.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        if (onAfterInsert) onAfterInsert();
    }
}

function setJpEditorValue(text, shouldSave = true) {
    dom.jpEditor.value = text;
    updateLineNumbers(dom.jpEditor, dom.jpLineNumbers);
    updateJpHighlight();
    if (shouldSave) {
        saveCurrentJpCode();
    }
}

function setPyEditorValue(text, shouldSave = true) {
    clearPythonErrorHighlight();
    dom.pyEditor.value = text;
    updateLineNumbers(dom.pyEditor, dom.pyLineNumbers);
    updatePythonHighlight();
    if (shouldSave) {
        saveCurrentPyCode();
    }
}

function saveCurrentJpCode() {
    if (!state.currentProblemId) return;
    setSavedJpCode(state.currentProblemId, dom.jpEditor.value);
    showAutosaveFeedback('自動保存済み');
}

function saveCurrentPyCode() {
    if (!state.currentProblemId) return;
    setSavedPyCode(state.currentProblemId, dom.pyEditor.value);
    showAutosaveFeedback('自動保存済み');
}

let autosaveTimer = null;
function showAutosaveFeedback(msg) {
    if (!state.storageAvailable) {
        updateStorageStatusUI();
        return;
    }
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    dom.autosaveStatus.textContent = `✓ ${msg} (${hh}:${mm}:${ss})`;
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
        if (state.storageAvailable) {
            dom.autosaveStatus.textContent = '✓ 自動保存オン';
        }
    }, 3000);
}

function updateLineNumbers(textarea, gutterElement, errorLine = null) {
    const lines = textarea.value.split('\n').length;
    const count = Math.max(1, lines);
    let html = '';
    for (let i = 1; i <= count; i++) {
        const isErr = (errorLine !== null && i === errorLine);
        const errClass = isErr ? ' class="line-num-error"' : '';
        html += `<span${errClass}>${i}</span>`;
    }
    gutterElement.innerHTML = html;
}

function updateJpHighlight() {
    if (!dom.jpHighlightLayer) return;
    const code = dom.jpEditor.value;
    dom.jpHighlightLayer.innerHTML = highlightJpSyntax(code) + '\n';
}

function highlightJpSyntax(code) {
    // プレースホルダー（○○、〇〇、●●、＿＿、___、全角/半角伏せ字記号）を最優先判定
    const tokenRegex = /([○〇●]+|＿＿+|_{2,}|【[^】\n]+】)|(#[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
        if (match.index > lastIndex) {
            result += escapeHtml(code.slice(lastIndex, match.index));
        }

        const [full, placeholder, comment, strLit] = match;
        const safe = escapeHtml(full);

        if (placeholder) {
            result += `<span class="jp-tok-placeholder">${safe}</span>`;
        } else if (comment) {
            result += `<span class="jp-tok-comment">${safe}</span>`;
        } else if (strLit) {
            // 文字列内部に含まれるプレースホルダー（例："○○はおいしいですね！"）もハイライト
            const innerRegex = /([○〇●]+|＿＿+|_{2,}|【[^】\n]+】)/g;
            let strHtml = '';
            let sLast = 0;
            let sMatch;
            while ((sMatch = innerRegex.exec(full)) !== null) {
                if (sMatch.index > sLast) {
                    strHtml += `<span class="jp-tok-str">${escapeHtml(full.slice(sLast, sMatch.index))}</span>`;
                }
                strHtml += `<span class="jp-tok-placeholder">${escapeHtml(sMatch[0])}</span>`;
                sLast = innerRegex.lastIndex;
            }
            if (sLast < full.length) {
                strHtml += `<span class="jp-tok-str">${escapeHtml(full.slice(sLast))}</span>`;
            }
            result += strHtml;
        } else {
            result += safe;
        }

        lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
        result += escapeHtml(code.slice(lastIndex));
    }

    return result;
}

function clearPythonErrorHighlight() {
    if (state.pyErrorLine !== null) {
        state.pyErrorLine = null;
        updateLineNumbers(dom.pyEditor, dom.pyLineNumbers, null);
        updatePythonHighlight(null);
    }
}

function scrollToErrorLine(lineNum) {
    if (!lineNum || lineNum <= 0 || !dom.pyEditor) return;
    const lineHeightApprox = 23.5; // line-height: 1.6 (約23.5px)
    const targetScrollTop = Math.max(0, (lineNum - 2) * lineHeightApprox);
    dom.pyEditor.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
}

function updatePythonHighlight(errorLine = state.pyErrorLine) {
    const code = dom.pyEditor.value;
    const highlightedCode = highlightPythonSyntax(code);

    if (errorLine === null || errorLine <= 0) {
        dom.pyHighlightLayer.innerHTML = highlightedCode + '\n';
        return;
    }

    const lines = highlightedCode.split('\n');
    const result = lines.map((lineHtml, idx) => {
        const lineNum = idx + 1;
        if (lineNum === errorLine) {
            const displayContent = lineHtml.length > 0 ? lineHtml : ' ';
            return `<mark class="py-line-error">${displayContent}</mark>`;
        }
        return lineHtml;
    }).join('\n');

    dom.pyHighlightLayer.innerHTML = result + '\n';
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function highlightPythonSyntax(code) {
    const tokenRegex = /(#[^\n]*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|\b(def|class|if|elif|else|for|while|in|return|import|from|as|try|except|finally|with|break|continue|pass|and|or|not|True|False|None)\b|\b(print|range|len|int|float|str|list|dict|set|input|newInput|random|randint|sum|max|min|abs|round|enumerate|zip)\b|\b(\d+(?:\.\d+)?)\b|(==|!=|<=|>=|\+=|-=|\*=|\/=|\/\/|\*\*|[+\-*/%=<>])/g;

    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = tokenRegex.exec(code)) !== null) {
        if (match.index > lastIndex) {
            result += escapeHtml(code.slice(lastIndex, match.index));
        }

        const [full, comment, strLit, kw, builtin, num, op] = match;
        const safe = escapeHtml(full);

        if (comment) {
            result += `<span class="tok-comment">${safe}</span>`;
        } else if (strLit) {
            result += `<span class="tok-str">${safe}</span>`;
        } else if (kw) {
            result += `<span class="tok-kw">${safe}</span>`;
        } else if (builtin) {
            result += `<span class="tok-builtin">${safe}</span>`;
        } else if (num) {
            result += `<span class="tok-num">${safe}</span>`;
        } else if (op) {
            result += `<span class="tok-op">${safe}</span>`;
        } else {
            result += safe;
        }

        lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < code.length) {
        result += escapeHtml(code.slice(lastIndex));
    }

    return result;
}

// ===================================================
// 7. 日本語 ➔ Python 変換ボタン処理（ルールベース即時変換）
// ===================================================
async function handleConvertClick() {
    if (state.isConverting) return;

    const jpText = dom.jpEditor.value.trim();
    if (!jpText) {
        return;
    }

    state.isConverting = true;
    dom.btnConvert.disabled = true;
    dom.convertSpinner.classList.remove('hidden');
    dom.convertBtnText.textContent = 'Pythonへ変換中...';

    try {
        const pythonCode = transpileDnclToPython(jpText);
        setPyEditorValue(pythonCode, true);
    } catch (err) {
        console.error('DNCL convert error:', err);
    } finally {
        state.isConverting = false;
        dom.btnConvert.disabled = false;
        dom.convertSpinner.classList.add('hidden');
        dom.convertBtnText.textContent = 'Pythonに変換 ➔';
    }
}

// ===================================================
// 8. 高機能・ルールベース DNCL ➔ Python 3 変換エンジン
// ===================================================
function transpileDnclToPython(jpText) {
    const rawLines = jpText.replace(/\r\n/g, '\n').split('\n');

    // インデントゆれ（半角スペース・全角スペース・タブの混在）を吸収してPythonの4スペース階層へ正規化するためのスタック
    const indentStack = [0];
    let expectIndentedBlock = false;
    const pyLines = [];

    for (let rawLine of rawLines) {
        const leadingMatch = rawLine.match(/^([ \t\u3000]*)/);
        const leadingStr = leadingMatch ? leadingMatch[1] : '';
        const visualIndent = calcVisualIndentWidth(leadingStr);

        let line = rawLine.slice(leadingStr.length).trim();

        // 空行
        if (!line) {
            pyLines.push('');
            continue;
        }

        // コメント行
        if (line.startsWith('#') || line.startsWith('//') || line.startsWith('※')) {
            const commentBody = line.replace(/^(\/\/|※|#)\s*/, '');
            const currentLevel = indentStack.length - 1;
            pyLines.push(`${'    '.repeat(currentLevel)}# ${commentBody}`);
            continue;
        }

        // クォーテーション（全角“ ” ＂ 「 」 『 』 ‘ ’ ＇）の正規化と文字列外の全角英数字・記号の半角化
        line = normalizeQuotesInLine(line);
        line = normalizeOutsideStrings(line);

        // ユーザ入力() / ユーザー入力() ➔ newInput() への変換
        line = replaceUserInputCalls(line);

        // 乱数発生(最小値, 最大値) ➔ random.randint(最小値, 最大値) への変換
        line = replaceRandomCalls(line);

        const elifExtracted = extractElifCondition(line);
        const isElse = isElseLine(line);

        // インデント階層の決定（半角・全角スペース・タブのゆれを吸収）
        const indentLevel = resolveIndentLevel(visualIndent, indentStack, expectIndentedBlock, Boolean(elifExtracted || isElse));
        const pyIndent = '    '.repeat(indentLevel);

        // --- A. elif（そうでなくもし○○ならば 等）---
        if (elifExtracted !== null) {
            const cond = convertConditionExpr(elifExtracted);
            pyLines.push(`${pyIndent}elif ${cond}:`);
            expectIndentedBlock = true;
            continue;
        }

        // --- B. else（そうでなければ 等）---
        if (isElse) {
            pyLines.push(`${pyIndent}else:`);
            expectIndentedBlock = true;
            continue;
        }

        // --- C. if（もし○○ならば 等）---
        const ifExtracted = extractIfCondition(line);
        if (ifExtracted !== null) {
            const cond = convertConditionExpr(ifExtracted);
            pyLines.push(`${pyIndent}if ${cond}:`);
            expectIndentedBlock = true;
            continue;
        }

        // --- D. 表示する(...) / 表示(...) / ...を表示する ---
        const displayCallArgs = extractDisplayFunctionArgs(line);
        if (displayCallArgs !== null) {
            const parsedArgs = parseDisplayArguments(displayCallArgs);
            pyLines.push(`${pyIndent}print(${parsedArgs.join(', ')})`);
            expectIndentedBlock = false;
            continue;
        }

        // --- E. 反復（for 増分 / 減分 / 回数指定）---
        const forConverted = convertForLoopLine(line);
        if (forConverted !== null) {
            pyLines.push(`${pyIndent}${forConverted}`);
            expectIndentedBlock = true;
            continue;
        }

        // --- F. 反復（while：○○の間繰り返す）---
        const whileConverted = convertWhileLoopLine(line);
        if (whileConverted !== null) {
            pyLines.push(`${pyIndent}${whileConverted}`);
            expectIndentedBlock = true;
            continue;
        }

        // --- G. 代入文・増減表現・通常文 ---
        const naturalStmt = convertNaturalAssignmentOrIncrement(line);
        if (naturalStmt !== null) {
            pyLines.push(`${pyIndent}${naturalStmt}`);
            expectIndentedBlock = false;
            continue;
        }

        line = line.replace(/\s*←\s*/g, ' = ');
        pyLines.push(`${pyIndent}${line}`);
        expectIndentedBlock = /:\s*$/.test(line);
    }

    return pyLines.join('\n') + '\n';
}

function calcVisualIndentWidth(leadingStr) {
    let width = 0;
    for (let i = 0; i < leadingStr.length; i++) {
        const ch = leadingStr[i];
        if (ch === ' ') {
            width += 1;
        } else if (ch === '\u3000') {
            width += 2;
        } else if (ch === '\t') {
            width += 4;
        }
    }
    return width;
}

function resolveIndentLevel(visualIndent, indentStack, expectIndentedBlock, isElifOrElse) {
    if (visualIndent === 0) {
        indentStack.length = 1;
        indentStack[0] = 0;
        return 0;
    }

    const topIndent = indentStack[indentStack.length - 1];

    if (visualIndent > topIndent) {
        indentStack.push(visualIndent);
    } else if (visualIndent < topIndent) {
        while (indentStack.length > 1 && visualIndent < indentStack[indentStack.length - 1]) {
            indentStack.pop();
        }
        if (visualIndent > indentStack[indentStack.length - 1]) {
            indentStack.push(visualIndent);
        }
    } else if (expectIndentedBlock && !isElifOrElse && visualIndent > 0) {
        indentStack.push(visualIndent + 1);
    }

    return indentStack.length - 1;
}

/**
 * クォーテーションのゆれ（全角“ ” ＂ ″ ‘ ’ ＇ および 「 」 『 』）を正規化する
 * ※ 既に "..." や '...' の中にある日本語の「」『』は文章の一部としてそのまま保持する
 */
function normalizeQuotesInLine(line) {
    // 1. まず純粋な引用符記号（全角ダブル・シングルクォート）を半角に統一
    let s = line
        .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036\uFF02]/g, '"')
        .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035\uFF07]/g, "'");

    // 2. 既存の文字列リテラル ("..." または '...') の外側にある「」や『』のみをクォートに変換
    // （文字列リテラル内部の「」『』は文章の一部なのでそのまま維持する）
    const parts = s.split(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g);
    s = parts.map((part, idx) => {
        if (idx % 2 === 1) {
            // 文字列リテラルの内部（例: "その数は「偶数」です" の中身）
            return part;
        }

        let out = part;
        // 片方だけ " で片方だけ 」 や 』 のミス（例: "合格」 や 「合格"）
        out = out.replace(/"([^"\r\n]*)[」』]/g, '"$1"');
        out = out.replace(/[「『]([^"\r\n]*)"/g, '"$1"');

        // かぎ括弧「...」や二重かぎ括弧『...』を "..." に変換
        // ネストした「」がある場合（例: 「その数は「偶数」です」）も最外層をクォート化
        out = out.replace(/「((?:[^「」\r\n]|「[^「」\r\n]*」)*)」/g, '"$1"');
        out = out.replace(/『((?:[^『』\r\n]|『[^『』\r\n]*』)*)』/g, '"$1"');

        // かぎ括弧を開いたまま閉じ忘れた場合（例: 表示する(「合格)）
        out = out.replace(/[「『]([^()"\r\n]+)(?=[)）,\s]|[\r\n]|$)/g, '"$1"');

        return out;
    }).join('');

    // 3. 閉じダブルクォーテーション忘れの自動補完（例: 表示する("合格) ➔ 表示する("合格")）
    const doubleQuoteCount = (s.match(/(?<!\\)"/g) || []).length;
    if (doubleQuoteCount % 2 === 1) {
        if (/[)）]\s*$/.test(s)) {
            s = s.replace(/([)）]\s*)$/, '"$1');
        } else {
            s = s + '"';
        }
    }
    return s;
}

/**
 * 文字列リテラル("")の外にある全角スペース・全角英数字・全角記号・日本語IME入力ミスをすべて半角に正規化する
 */
function normalizeOutsideStrings(line) {
    const parts = line.split(/("(?:\\.|[^"])*"|'(?:\\.|[^'])*')/g);
    let normalized = parts.map((part, idx) => {
        if (idx % 2 === 1) {
            // "" や '' の中も全角数字（０〜９）は半角数字（0〜9）に置換する
            return part.replace(/[０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
        }
        return part
            // 1. "" の外の全角スペースをすべて半角スペースに変換
            .replace(/\u3000+/g, ' ')
            // 2. 全角英数字（Ａ-Ｚ, ａ-ｚ, ０-９）と全角アンダースコアを半角に変換
            .replace(/[Ａ-Ｚａ-ｚ０-９]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
            .replace(/＿/g, '_')
            // 3. 日本語IMEがONのまま小数を打ったときの「1。1」「3．14」「3・14」を「1.1」「3.14」に補正
            .replace(/(\d)\s*[。．・]\s*(\d)/g, '$1.$2')
            // 4. 全角括弧・記号の正規化
            .replace(/（/g, '(')
            .replace(/）/g, ')')
            .replace(/［/g, '[')
            .replace(/］/g, ']')
            .replace(/｛/g, '{')
            .replace(/｝/g, '}')
            .replace(/＝＝/g, '==')
            .replace(/！＝|≠/g, '!=')
            .replace(/＞＝|＝＞|≧/g, '>=')
            .replace(/＜＝|＝＜|≦/g, '<=')
            .replace(/＝/g, '=')
            .replace(/＋/g, '+')
            // 5. カタカナ長音「ー」や全角ハイフン「−」「‐」「―」がマイナス記号として使われた場合を半角「-」に補正
            .replace(/([0-9A-Za-z_)\]\s])[ー−‐―ｰ](?=\s*[0-9A-Za-z_(])/g, '$1-')
            .replace(/(^|[=(,+\-*/<>:\s])[ー−‐―ｰ](?=\s*[0-9A-Za-z_(])/g, '$1-')
            .replace(/－/g, '-')
            .replace(/＊|×/g, '*')
            .replace(/／|÷/g, '/')
            .replace(/％/g, '%')
            .replace(/＾|\^/g, '**')
            .replace(/＜/g, '<')
            .replace(/＞/g, '>')
            .replace(/，|、/g, ', ')
            .replace(/：/g, ':')
            .replace(/；/g, ';')
            // 6. 日本語の算術表現（累乗・あまり・商・割り算）の変換
            // ・「A の B 乗」➔「A ** B」
            .replace(/([A-Za-z0-9_)\]]+)\s*の\s*([A-Za-z0-9_(\[]+)\s*乗/g, '$1 ** $2')
            // ・「A を B で割ったあまり（余り・剰余・余りの値・余りの数）」➔「A % B」
            .replace(/([A-Za-z0-9_)\]]+|\([^()]+\))\s*(?:を|の)\s*([A-Za-z0-9_(\[]+|\([^()]+\))\s*で\s*(?:割った|わった|割る|わる|除した|除算した)\s*(?:ときの|時の|際の|場合の|結果の|とき|時|その)?\s*(?:あまり|余り|剰余)(?:の値|の数)?/g, '$1 % $2')
            // ・「B で A を割ったあまり（余り・剰余）」（語順逆転）➔「A % B」
            .replace(/([A-Za-z0-9_(\[]+|\([^()]+\))\s*で\s*([A-Za-z0-9_)\]]+|\([^()]+\))\s*を\s*(?:割った|わった|割る|わる|除した|除算した)\s*(?:ときの|時の|際の|場合の|結果の|とき|時|その)?\s*(?:あまり|余り|剰余)(?:の値|の数)?/g, '$2 % $1')
            // ・「A / B のあまり（余り）」➔「A % B」
            .replace(/([A-Za-z0-9_)\]]+|\([^()]+\))\s*\/\s*([A-Za-z0-9_(\[]+|\([^()]+\))\s*の\s*(?:あまり|余り|剰余)(?:の値|の数)?/g, '$1 % $2')
            // ・「A を B で割った商（整数商・整数部分）」➔「A // B」
            .replace(/([A-Za-z0-9_)\]]+|\([^()]+\))\s*(?:を|の)\s*([A-Za-z0-9_(\[]+|\([^()]+\))\s*で\s*(?:割った|わった|割る|わる|除した|除算した)\s*(?:ときの|時の|際の|場合の|結果の|とき|時|その)?\s*(?:整数商|商|整数部分)(?:の値|の数)?/g, '$1 // $2')
            // ・「A を B で割った値（結果・数）」➔「A / B」
            .replace(/([A-Za-z0-9_)\]]+|\([^()]+\))\s*(?:を|の)\s*([A-Za-z0-9_(\[]+|\([^()]+\))\s*で\s*(?:割った|わった|割る|わる|除した|除算した)\s*(?:ときの|時の|際の|場合の)?\s*(?:値|結果|数)/g, '$1 / $2')
            // 連続する半角スペースを整理
            .replace(/ {2,}/g, ' ');
    }).join('');

    // 行末の閉じカッコ `)` 忘れの自動補完（例: `表示する("合格"` ➔ `表示する("合格")`）
    const openParens = (normalized.match(/\(/g) || []).length;
    const closeParens = (normalized.match(/\)/g) || []).length;
    if (openParens === closeParens + 1 && !normalized.endsWith(':')) {
        normalized += ')';
    }

    return normalized;
}

function replaceUserInputCalls(line) {
    let converted = line.replace(/(?:ユーザー?入力|ゆーざー?入力|ユーザにゅうりょく|入力を受け取る|数値入力|文字入力|入力)\s*\(([^)]*)\)/g, (full, args) => {
        const trimmedArgs = args.trim();
        return trimmedArgs ? `newInput(${trimmedArgs})` : 'newInput()';
    });
    converted = converted.replace(/(?:ユーザー?入力|ゆーざー?入力|入力を受け取る)(?!\s*\()/g, 'newInput()');
    return converted;
}

/**
 * 乱数発生(最小値, 最大値) を random.randint(最小値, 最大値) に置き換える
 * カンマ区切り・スペース区切り・「から」区切り・全角カンマなどの表記ゆれにも対応
 */
function replaceRandomCalls(line) {
    return line.replace(/(?:乱数発生|乱数生成|らんすう発生|乱数|サイコロ)\s*\(([^)]*)\)/g, (full, rawArgs) => {
        const cleaned = rawArgs.trim();
        if (!cleaned) {
            return 'random.randint(1, 6)';
        }
        // カンマ、「から」、「〜」、または空白での区切りを吸収
        let parts = cleaned.split(/\s*(?:,|から|〜|~)\s*/);
        if (parts.length === 1) {
            parts = cleaned.split(/\s+/);
        }
        if (parts.length >= 2) {
            return `random.randint(${parts[0].trim()}, ${parts[1].trim()})`;
        }
        return `random.randint(1, ${parts[0].trim()})`;
    });
}

function extractDisplayFunctionArgs(line) {
    // 1. カッコ付きの関数形式: 表示する(...) / 表示(...) / 出力する(...) / ひょうじする(...) / print(...)
    const fnMatch = line.match(/^(?:表示する|表示|ひょうじする|出力する|出力|プリント|print)\s*\(([\s\S]*)\)[。．]?$/i);
    if (fnMatch) {
        return fnMatch[1].trim();
    }
    // 2. カッコを書き忘れた形式: 表示する "合格" / 表示する x
    const noParenMatch = line.match(/^(?:表示する|ひょうじする|出力する)\s+(.+?)[。．]?$/);
    if (noParenMatch) {
        return noParenMatch[1].trim();
    }
    // 3. 後置形式: ... を表示する
    const suffixMatch = line.match(/^(.+?)\s*を(?:表示する|表示|出力する|出力)[。．]?$/);
    if (suffixMatch) {
        let inner = suffixMatch[1].trim();
        if (inner.startsWith('(') && inner.endsWith(')')) {
            inner = inner.slice(1, -1).trim();
        }
        return inner;
    }
    return null;
}

/**
 * 生徒がやりがちな自然な日本語での代入・加算・減算表現をPythonの代入文へ変換する
 */
function convertNaturalAssignmentOrIncrement(line) {
    const cleaned = line.replace(/[。．]\s*$/, '').trim();
    const varPat = '([A-Za-z_][A-Za-z0-9_]*(?:\\[[^\\]]+\\])?)';

    // 1. 「値 を 変数 に代入する / 入れる / セットする」
    let m = cleaned.match(new RegExp(`^(.+?)\\s*を\\s*${varPat}\\s*に(?:代入する|代入|入れる|格納する|セットする)$`));
    if (m) return `${m[2]} = ${m[1].trim()}`;

    // 2. 「変数 に 値 を代入する / 入れる / セットする」
    m = cleaned.match(new RegExp(`^${varPat}\\s*に\\s*(.+?)\\s*を(?:代入する|代入|入れる|格納する|セットする)$`));
    if (m) return `${m[1]} = ${m[2].trim()}`;

    // 3. 「変数 を 値 とする / にする」または「変数 = 値 とする」
    m = cleaned.match(new RegExp(`^${varPat}\\s*(?:を|=)\\s*(.+?)\\s*(?:とする|にする)$`));
    if (m) return `${m[1]} = ${m[2].trim()}`;

    // 4. 「変数 に 値 を足す / 加える / 加算する」
    m = cleaned.match(new RegExp(`^${varPat}\\s*に\\s*(.+?)\\s*を(?:足す|加える|加算する|プラスする)$`));
    if (m) return `${m[1]} = ${m[1]} + ${m[2].trim()}`;

    // 5. 「変数 から 値 を引く / 減らす / 減算する」
    m = cleaned.match(new RegExp(`^${varPat}\\s*から\\s*(.+?)\\s*を(?:引く|減らす|減算する|マイナスする)$`));
    if (m) return `${m[1]} = ${m[1]} - ${m[2].trim()}`;

    // 6. 「変数 を 値 増やす / ずつ増やす」
    m = cleaned.match(new RegExp(`^${varPat}\\s*を\\s*(.+?)\\s*(?:ずつ)?(?:増やす|増加させる)$`));
    if (m) return `${m[1]} = ${m[1]} + ${m[2].trim()}`;

    // 7. 「変数 を 値 減らす / ずつ減らす」
    m = cleaned.match(new RegExp(`^${varPat}\\s*を\\s*(.+?)\\s*(?:ずつ)?(?:減らす|減少させる)$`));
    if (m) return `${m[1]} = ${m[1]} - ${m[2].trim()}`;

    return null;
}

function parseDisplayArguments(innerStr) {
    const src = normalizeOutsideStrings(normalizeQuotesInLine(innerStr)).trim();
    if (!src) return [];

    const tokens = [];
    let i = 0;
    const len = src.length;

    while (i < len) {
        const ch = src[i];

        if (/\s/.test(ch)) {
            i++;
            continue;
        }

        if (ch === ',') {
            tokens.push({ type: 'sep' });
            i++;
            continue;
        }

        if (ch === '"' || ch === "'") {
            const quote = ch;
            let lit = ch;
            i++;
            while (i < len) {
                const c = src[i];
                lit += c;
                i++;
                if (c === quote && src[i - 2] !== '\\') {
                    break;
                }
            }
            tokens.push({ type: 'value', text: lit });
            continue;
        }

        const twoCharOp = src.slice(i, i + 2);
        if (['**', '//', '==', '!=', '<=', '>='].includes(twoCharOp)) {
            tokens.push({ type: 'op', text: twoCharOp });
            i += 2;
            continue;
        }
        if (['+', '-', '*', '/', '%', '<', '>'].includes(ch)) {
            tokens.push({ type: 'op', text: ch });
            i++;
            continue;
        }

        if (ch === 'と') {
            const prevCh = i > 0 ? src[i - 1] : ' ';
            const nextCh = i + 1 < len ? src[i + 1] : ' ';
            if (/[\s"'\])]/.test(prevCh) || /[\s"'(\[]/.test(nextCh)) {
                tokens.push({ type: 'sep' });
                i++;
                continue;
            }
        }

        let chunk = '';
        let depth = 0;
        while (i < len) {
            const c = src[i];
            if (depth === 0) {
                if (/\s/.test(c) || c === ',' || c === '"' || c === "'") break;
                const two = src.slice(i, i + 2);
                if (['**', '//', '==', '!=', '<=', '>='].includes(two)) break;
                if (['+', '-', '*', '/', '%', '<', '>'].includes(c)) break;
                if (c === 'と' && chunk.length > 0 && /[\s"'(\[]/.test(src[i + 1] || ' ')) break;
            }
            if (c === '(' || c === '[') depth++;
            if (c === ')' || c === ']') depth = Math.max(0, depth - 1);
            chunk += c;
            i++;
        }

        if (chunk) {
            tokens.push({ type: 'value', text: chunk });
        } else {
            i++;
        }
    }

    const args = [];
    let currentArg = '';
    let prevType = null;

    for (const tok of tokens) {
        if (tok.type === 'sep') {
            if (currentArg.trim()) {
                args.push(currentArg.trim());
            }
            currentArg = '';
            prevType = 'sep';
        } else if (tok.type === 'op') {
            if (currentArg === '' && (tok.text === '-' || tok.text === '+')) {
                currentArg = tok.text;
            } else {
                currentArg += ` ${tok.text} `;
            }
            prevType = 'op';
        } else if (tok.type === 'value') {
            if (prevType === 'value') {
                if (currentArg.trim()) {
                    args.push(currentArg.trim());
                }
                currentArg = tok.text;
            } else {
                currentArg += tok.text;
            }
            prevType = 'value';
        }
    }

    if (currentArg.trim()) {
        args.push(currentArg.trim());
    }

    return args;
}

function normalizeComparisonConjugations(text) {
    return text
        .replace(/等しくなければ/g, '等しくない ならば')
        .replace(/同じでなければ/g, '同じではない ならば')
        .replace(/異なれば/g, '異なる ならば')
        .replace(/違えば/g, '違う ならば')
        .replace(/等しければ/g, '等しい ならば')
        .replace(/同じであれば/g, '同じ ならば')
        .replace(/大きければ/g, '大きい ならば')
        .replace(/小さければ/g, '小さい ならば')
        .replace(/多ければ/g, '多い ならば')
        .replace(/少なければ/g, '少ない ならば')
        .replace(/高ければ/g, '高い ならば')
        .replace(/低ければ/g, '低い ならば');
}

function extractElifCondition(line) {
    const cleaned = normalizeComparisonConjugations(line.replace(/[\s,、:：]+$/, '').trim());
    // 「そうでなくもし」「そうではなくもし」「もしそうでなく（語順逆転）」「そうじゃなくもし」「elif ○○ならば」等すべて対応
    const elifPrefixRegex = /^(?:そうでなく(?:\s*,\s*|\s*)もしも?|そうではなく(?:\s*,\s*|\s*)もしも?|そうでなければ(?:\s*,\s*|\s*)もしも?|そうでないなら(?:ば)?(?:\s*,\s*|\s*)もしも?|そうで無いなら(?:ば)?(?:\s*,\s*|\s*)もしも?|そうじゃなく(?:\s*,\s*|\s*)もしも?|そうじゃなければ(?:\s*,\s*|\s*)もしも?|もしも?(?:\s*,\s*|\s*)そうでなく|もしも?(?:\s*,\s*|\s*)そうでないなら(?:ば)?|あるいは(?:\s*,\s*|\s*)もしも?|または(?:\s*,\s*|\s*)もしも?|それ以外で(?:\s*,\s*|\s*)もしも?|でなければ(?:\s*,\s*|\s*)もしも?|ちがうなら(?:\s*,\s*|\s*)もしも?|elif\b)(?:\s*,\s*|\s*)(.+)$/;
    const match = cleaned.match(elifPrefixRegex);
    if (!match) return null;

    let body = match[1].trim();
    body = body.replace(/[\s,、]*(?:ならば|なら|のとき|の場合|であれば|だったら)[\s,、]*$/, '').trim();
    return body || null;
}

function isElseLine(line) {
    const cleaned = line.replace(/[\s,、:：]+$/, '').trim();
    return /^(?:そうでなければ|そうではなく|そうでないならば|そうでないなら|そうで無いならば|そうで無いなら|そうでないとき|そうでない場合|そうじゃなければ|そうじゃないなら|それ以外は|それ以外ならば|それ以外なら|それ以外のとき|それ以外の場合|それ以外|さもなければ|でなければ|ちがえば|違えば|ちがうなら|ちがうとき|else)$/.test(cleaned);
}

function extractIfCondition(line) {
    const cleaned = normalizeComparisonConjugations(line.replace(/[\s,、:：]+$/, '').trim());

    // 反復処理（条件くりかえし・順次くりかえし）の行は if 文として誤判定しない
    if (
        /(?:繰り返す|くりかえす|繰返す|反復する|ループする|ループ|の間|のあいだ|が成り立つ間|が成り立つあいだ|である間|であるあいだ)$/.test(cleaned) ||
        /^(?:条件くりかえし|条件繰り返し|条件繰返し|条件反復|while\b)/i.test(cleaned)
    ) {
        return null;
    }

    // 1. 先頭に「もし / もしも / if」があるパターン（末尾の「ならば」を書き忘れた場合も対応）
    const ifPrefixMatch = cleaned.match(/^(?:もしも|もし|if\b)(?:\s*,\s*|\s*)(.+)$/);
    if (ifPrefixMatch) {
        let body = ifPrefixMatch[1].trim();
        body = body.replace(/[\s,、]*(?:ならば|なら|のとき|の場合|であれば|だったら)[\s,、]*$/, '').trim();
        return body || null;
    }

    // 2. 先頭の「もし」が省略され「○○ならば」と書かれたパターン
    const suffixOnlyMatch = cleaned.match(/^(.+?)[\s,、]*(?:ならば|なら|のとき|の場合|であれば|だったら)$/);
    if (suffixOnlyMatch && !/^(?:表示する|表示|ひょうじする|出力する|出力)/.test(cleaned)) {
        return suffixOnlyMatch[1].trim();
    }

    return null;
}

function convertConditionExpr(rawCond) {
    let cond = rawCond.trim();

    // 表記ゆれの吸収（「かつ」「または」が前の語に密着している場合のスペース挿入、記号 && / || の変換）
    // ※「かつ」「または」自体の抜けや主語の省略などの論理的な誤りは自動補完せずそのまま残す
    cond = cond
        .replace(/(以上|以下|大きい|小さい|未満|等しい|等しくない|同じ|異なる|違う|偶数|奇数|倍数|割り切れる|割り切れない)(かつ|および|しかも|または|もしくは)/g, '$1 $2 ')
        .replace(/\s*(?:&&|＆＆)\s*/g, ' and ')
        .replace(/\s*(?:\|\||｜｜)\s*/g, ' or ');

    const logicalParts = cond.split(/\s+(かつ|および|しかも|または|もしくは|and|or)\s+/i);

    const convertedParts = logicalParts.map((part, idx) => {
        if (idx % 2 === 1) {
            const connector = part.toLowerCase();
            if (['かつ', 'および', 'しかも', 'and'].includes(connector)) return 'and';
            if (['または', 'もしくは', 'or'].includes(connector)) return 'or';
            return part;
        }
        const targetPart = part.trim();
        // 「かつ」「または」を書かずに複数の比較式を並べた場合、and等は補完せず個別の比較式としてのみ変換し誤りをそのまま出力する
        const subClauses = splitUnconnectedComparisons(targetPart);
        return subClauses.map(clause => convertSingleComparison(clause)).join(' ');
    });

    return convertedParts.join(' ');
}

/**
 * 「かつ」「または」が抜けたまま複数の日本語比較表現が並べられた場合に、
 * 論理演算子を補完せずそのまま並べて出力できるよう比較語の境界で分割する
 */
function splitUnconnectedComparisons(text) {
    const compEndPattern = /((?:の倍数ではない|の倍数でない|の倍数|で割り切れる|で割り切れない|同じではない|同じでない|同じじゃない|等しくない|一致しない|より(?:も)?(?:大きい|大|上|多い|高い|小さい|小|下|少ない|低い)|を超え(?:る|ている)|以上|以下|未満|大なり|小なり|等しい|同じ|一致する|異なる|違う|ではない|でない|じゃない|偶数|奇数)(?:である|だ|のとき|の場合|とき|場合)?)\s+(?=.+)/g;
    const marked = text.replace(compEndPattern, '$1\u0000');
    return marked.split('\u0000').map(s => s.trim()).filter(Boolean);
}

function convertSingleComparison(expr) {
    let s = expr.trim();
    if (!s) return s;

    s = s
        .replace(/=>/g, '>=')
        .replace(/=</g, '<=')
        .replace(/<>/g, '!=')
        .replace(/≠/g, '!=')
        .replace(/≧/g, '>=')
        .replace(/≦/g, '<=');

    // 助詞（が / は / の値が）が含まれる場合は必ず助詞の位置で左辺・右辺を区切る
    // （左辺の「num % 2」や「a + b」などの内部スペースで誤って分割されるのを防ぐため）
    const hasParticle = /(?:の値が|が|は)/.test(s);
    const sep = hasParticle ? '\\s*(?:の値が|が|は)\\s*' : '\\s+';
    const lhsPat = hasParticle ? '^(.+?)' : '^(.+)';
    const rhsSep = '(?:\\s*(?:と|に|よりも|より)?\\s*)';

    // 0-A. 偶数・奇数の日本語表現（例: xが偶数, xは奇数である）
    let m = s.match(new RegExp(`${lhsPat}${sep}偶数(?:である|だ|のとき|の場合)?$`));
    if (m) return `${m[1].trim()} % 2 == 0`;

    m = s.match(new RegExp(`${lhsPat}${sep}奇数(?:である|だ|のとき|の場合)?$`));
    if (m) return `${m[1].trim()} % 2 != 0`;

    // 0-B. 倍数・割り切れる・割り切れないの日本語表現（例: xが3の倍数, xが3で割り切れる, xが3で割り切れない）
    m = s.match(new RegExp(`${lhsPat}${sep}(.+?)\\s*(?:の倍数(?:である|だ)?|で割り切れる)$`));
    if (m) return `${m[1].trim()} % ${m[2].trim()} == 0`;

    m = s.match(new RegExp(`${lhsPat}${sep}(.+?)\\s*(?:の倍数ではない|の倍数でない|で割り切れない)$`));
    if (m) return `${m[1].trim()} % ${m[2].trim()} != 0`;

    // 0-C. 「A と B が等しくない / 異なる / 違う」および「A と B が等しい / 同じ」
    m = s.match(/^(.+?)\s*と\s*(.+?)\s*(?:が|は)\s*(?:等しくない|同じではない|同じでない|同じじゃない|一致しない|異なる|違う)(?:とき|場合)?$/);
    if (m) {
        return `${m[1].trim()} != ${m[2].trim()}`;
    }
    m = s.match(/^(.+?)\s*と\s*(.+?)\s*(?:が|は)\s*(?:等しい|同じ|一致する)(?:とき|場合)?$/);
    if (m) {
        return `${m[1].trim()} == ${m[2].trim()}`;
    }

    // 1. 等しくない（!=）
    m = s.match(new RegExp(`${lhsPat}${sep}(.+?)${rhsSep}(?:等しくない|同じではない|同じでない|同じじゃない|一致しない|異なる|違う|ではない|でない|じゃない)(?:とき|場合)?$`));
    if (m) {
        return `${m[1].trim()} != ${m[2].trim()}`;
    }

    // 2. 以上（>=）
    m = s.match(new RegExp(`${lhsPat}(?:\\s*>=\\s*|${sep})(.+?)\\s*以上(?:である|だ|のとき|の場合)?$`));
    if (m) {
        return `${m[1].trim()} >= ${m[2].trim()}`;
    }

    // 3. 以下（<=）
    m = s.match(new RegExp(`${lhsPat}(?:\\s*<=\\s*|${sep})(.+?)\\s*以下(?:である|だ|のとき|の場合)?$`));
    if (m) {
        return `${m[1].trim()} <= ${m[2].trim()}`;
    }

    // 4. より大きい（>）
    m = s.match(new RegExp(`${lhsPat}(?:\\s*>\\s*|${sep})(.+?)\\s*(?:より(?:も)?(?:大きい|大|上|多い|高い)|を超え(?:る|ている)|大なり)(?:とき|場合|である|だ)?$`));
    if (m) {
        return `${m[1].trim()} > ${m[2].trim()}`;
    }

    // 5. より小さい・未満（<）
    m = s.match(new RegExp(`${lhsPat}(?:\\s*<\\s*|${sep})(.+?)\\s*(?:より(?:も)?(?:小さい|小|下|少ない|低い)|未満|小なり)(?:とき|場合|である|だ)?$`));
    if (m) {
        return `${m[1].trim()} < ${m[2].trim()}`;
    }

    // 6. 等しい（==）
    m = s.match(new RegExp(`${lhsPat}${sep}(.+?)${rhsSep}(?:等しい|同じ|一致する|である|だ)(?:とき|場合)?$`));
    if (m) {
        return `${m[1].trim()} == ${m[2].trim()}`;
    }

    // 7. 「もし x が 30 ならば」のように比較語が省略され「A が B」のみ書かれた場合
    if (!/[=<>!]/.test(s)) {
        m = s.match(/^(.+?)\s*(?:の値が|が|は)\s*(.+)$/);
        if (m) {
            return `${m[1].trim()} == ${m[2].trim()}`;
        }
    }

    // 8. 単独の `=` を `==` に変換
    s = s.replace(/(?<![<>!=])=(?!=)/g, '==');

    return s;
}

function convertForLoopLine(line) {
    const cleaned = line.replace(/[,、:：]+\s*$/, '').trim();
    const repeatWord = '(?:繰り返す|くりかえす|繰返す|ループする|ループ)';

    // 1. 減分ループ: i を(が/は/=) A から B まで [C ずつ] 減らしながら繰り返す
    const forDecMatch = cleaned.match(new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)\\s*(?:を|が|は|=)\\s*(.+?)\\s*から\\s*(.+?)\\s*まで\\s*(?:(.+?)\\s*ずつ\\s*)?(?:減らしながら|減らして|減算しながら|減らす|へらしながら|へらして)(?:\\s*${repeatWord})?$`));
    if (forDecMatch) {
        const varName = forDecMatch[1].trim();
        const startExpr = forDecMatch[2].trim();
        const endExpr = forDecMatch[3].trim();
        const stepExpr = (forDecMatch[4] || '1').trim();
        const endMinusOne = simplifyMinusOne(endExpr);
        return `for ${varName} in range(${startExpr}, ${endMinusOne}, -${stepExpr}):`;
    }

    // 2. 増分ループ: i を(が/は/=) A から B まで [C ずつ増やしながら] 繰り返す
    const forIncMatch = cleaned.match(new RegExp(`^([A-Za-z_][A-Za-z0-9_]*)\\s*(?:を|が|は|=)\\s*(.+?)\\s*から\\s*(.+?)\\s*まで\\s*(?:(.+?)\\s*ずつ\\s*)?(?:(?:増やしながら|増やして|加算しながら|ふやしながら|ふやして)\\s*${repeatWord}|${repeatWord}|増やしながら|増やして|ふやしながら|ふやして|増やす|ふやす)$`));
    if (forIncMatch) {
        const varName = forIncMatch[1].trim();
        const startExpr = forIncMatch[2].trim();
        const endExpr = forIncMatch[3].trim();
        const stepExpr = (forIncMatch[4] || '1').trim();
        const endPlusOne = simplifyPlusOne(endExpr);

        return `for ${varName} in range(${startExpr}, ${endPlusOne}, ${stepExpr}):`;
    }

    // 3. 語順逆転パターン: A から B まで i を [C ずつ増やしながら] 繰り返す
    const revForMatch = cleaned.match(new RegExp(`^(.+?)\\s*から\\s*(.+?)\\s*まで\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*(?:を|が|は)\\s*(?:(.+?)\\s*ずつ\\s*)?(?:増やしながら|増やして|ふやしながら|ふやして)?\\s*${repeatWord}$`));
    if (revForMatch) {
        const startExpr = revForMatch[1].trim();
        const endExpr = revForMatch[2].trim();
        const varName = revForMatch[3].trim();
        const stepExpr = (revForMatch[4] || '1').trim();
        const endPlusOne = simplifyPlusOne(endExpr);
        return `for ${varName} in range(${startExpr}, ${endPlusOne}, ${stepExpr}):`;
    }

    // 4. 回数指定ループ: N 回繰り返す (1からNまで1ずつ)
    const repeatCountMatch = cleaned.match(new RegExp(`^(.+?)\\s*回\\s*${repeatWord}$`));
    if (repeatCountMatch) {
        const countExpr = repeatCountMatch[1].trim();
        const countPlusOne = simplifyPlusOne(countExpr);
        return `for i in range(1, ${countPlusOne}, 1):`;
    }

    return null;
}

function convertWhileLoopLine(line) {
    let cleaned = normalizeComparisonConjugations(line.replace(/[,、:：]+\s*$/, '').trim());
    const repeatWord = '(?:繰り返す|くりかえす|繰返す|反復する|ループする|ループ)';

    // 先頭に「もし / もしも」が付けられた場合も除去して条件くりかえしとして扱う
    cleaned = cleaned.replace(/^(?:もしも|もし)\s+/, '');

    // 1. 先頭に「条件くりかえし / 条件繰り返し / 条件反復 / while」があるパターン
    // 例: 「条件くりかえし(chokinが10000より小さい)」「条件くりかえし chokinが10000より小さい」「while chokin < 10000」
    const prefixMatch = cleaned.match(/^(?:条件くりかえし|条件繰り返し|条件繰返し|条件反復|while\b)\s*(?:\((.+)\)|(.+))$/i);
    if (prefixMatch) {
        let rawCond = (prefixMatch[1] || prefixMatch[2] || '').trim();
        rawCond = rawCond
            .replace(new RegExp(`\\s*(?:の間|のあいだ|が成り立つ間|が成り立つあいだ|である間|であるあいだ|間|あいだ|限り|かぎり|うちは|うち)?(?:\\s*,\\s*|\\s*)${repeatWord}$`), '')
            .replace(/\s*(?:の間|のあいだ|が成り立つ間|が成り立つあいだ|である間|であるあいだ|間|あいだ|ならば|なら|のとき|の場合)$/, '')
            .trim();
        if (rawCond) {
            return `while ${convertConditionExpr(rawCond)}:`;
        }
    }

    // 2. 末尾に「〜の間繰り返す / 〜間繰り返す / 〜あいだくりかえす / 〜限り繰り返す / 〜の間 / 〜繰り返す」があるパターン
    const whileSuffixMatch = cleaned.match(
        new RegExp(`^(.+?)\\s*(?:(?:の間|のあいだ|が成り立つ間|が成り立つあいだ|である間|であるあいだ|間|あいだ|限り|かぎり|うちは|うち)(?:\\s*,\\s*|\\s*)${repeatWord}?|(?:ならば|なら|のとき|の場合)?(?:\\s*,\\s*|\\s*)${repeatWord})$`)
    );
    if (whileSuffixMatch) {
        let rawCond = whileSuffixMatch[1].trim();
        rawCond = rawCond.replace(/\s*(?:ならば|なら|のとき|の場合|であれば|である|だ)$/, '').trim();
        if (rawCond) {
            const cond = convertConditionExpr(rawCond);
            return `while ${cond}:`;
        }
    }

    return null;
}

function simplifyPlusOne(expr) {
    if (/^\d+$/.test(expr)) {
        return String(parseInt(expr, 10) + 1);
    }
    return `${expr} + 1`;
}

function simplifyMinusOne(expr) {
    if (/^\d+$/.test(expr)) {
        return String(parseInt(expr, 10) - 1);
    }
    return `${expr} - 1`;
}

// ===================================================
// 9. Python実行 ＆ コンソール表示・正誤判定補助
// ===================================================
function updatePyodideStatusUI(status, message) {
    dom.pyodideStatusText.textContent = message;
    dom.pyodideStatus.className = 'pyodide-status';

    if (status === 'ready') {
        dom.pyodideStatus.classList.add('pyodide-ready');
        dom.btnRun.disabled = false;
    } else if (status === 'error') {
        dom.pyodideStatus.classList.add('pyodide-error');
        dom.btnRun.disabled = true;
    } else {
        dom.pyodideStatus.classList.add('pyodide-loading');
        dom.btnRun.disabled = true;
    }
}

async function handleRunPythonClick() {
    if (!state.pyodideManager || !state.pyodideManager.isReady) return;

    const code = dom.pyEditor.value;
    clearConsole();
    clearPythonErrorHighlight();

    if (!code.trim()) {
        appendConsole('実行するPythonコードが空です。\n', 'system');
        return;
    }

    dom.btnRun.disabled = true;
    const originalBtnHtml = dom.btnRun.innerHTML;
    dom.btnRun.innerHTML = '<span>⏳ 実行中...</span>';

    try {
        const result = await state.pyodideManager.runPythonCode(code);

        if (!result.success && result.errorLine) {
            state.pyErrorLine = result.errorLine;
            updateLineNumbers(dom.pyEditor, dom.pyLineNumbers, state.pyErrorLine);
            updatePythonHighlight(state.pyErrorLine);
            scrollToErrorLine(state.pyErrorLine);
        } else {
            clearPythonErrorHighlight();
        }

        if (result.stdout === '' && result.stderr === '') {
            appendConsole('（出力はありませんでした。print() を使うとここに結果が表示されます）\n', 'system');
        }
    } finally {
        dom.btnRun.disabled = false;
        dom.btnRun.innerHTML = originalBtnHtml;
    }
}

function clearConsole() {
    dom.consoleOutput.innerHTML = '';
}

function appendConsole(text, type = 'stdout') {
    const placeholder = dom.consoleOutput.querySelector('.console-placeholder');
    if (placeholder) {
        placeholder.remove();
    }

    const span = document.createElement('span');
    if (type === 'stderr') {
        span.className = 'console-stderr';
    } else if (type === 'system') {
        span.className = 'console-system';
    }
    span.textContent = text;
    dom.consoleOutput.appendChild(span);
    dom.consoleOutput.scrollTop = dom.consoleOutput.scrollHeight;
}
