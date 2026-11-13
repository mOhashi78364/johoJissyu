/**
 * 高校「情報I」定期テスト対策・一問一答クイズアプリ
 * 完全ローカル完結型（外部通信なし・localStorageによる復習回数管理＆バージョンリセット対応）
 */

const CONFIG = {
  APP_VERSION: '2026-term2',
  STORAGE_KEY: 'info1_quiz_wrong_items',
  QUESTIONS_PATH: './questions.json'
};

/**
 * ローカルファイル直接実行（file://）時など、fetchがブロックされた場合のフォールバック問題データ
 * 通常時は CONFIG.QUESTIONS_PATH (./questions.json) から最新データを読み込みます。
 */
const FALLBACK_QUESTIONS = [
  {
    id: 1,
    category: '13 情報のデジタル化',
    question: '日常生活で扱うデータにおいて、色や温度、時間などの「連続的な量」として表されるデータを何と呼ぶか、最も適切なものを選びなさい。',
    options: [
      { text: 'アナログデータ' },
      { text: 'デジタルデータ' },
      { text: 'バイナリデータ' },
      { text: 'パルスデータ' }
    ],
    answer: 0,
    explanation: '日常生活の中で色や温度、時間などのデータを扱う場合において、連続的な量で扱うデータを「アナログデータ」、連続的な量を一定の間隔で区切って離散的な値で表すデータを「デジタルデータ」と呼びます。'
  },
  {
    id: 2,
    category: '30 論理回路',
    question: '次のAND回路（論理積）の出力Yとして正しい真理値表を選びなさい。',
    image: './images/gate_and.svg',
    options: [
      { text: '表A', image: './images/table_a.svg' },
      { text: '表B', image: './images/table_b.svg' },
      { text: '表C', image: './images/table_c.svg' },
      { text: '表D', image: './images/table_d.svg' }
    ],
    answer: 1,
    explanation: 'AND回路（論理積）は、入力Aと入力Bの両方が1のときのみ出力Yが1となり、それ以外は0になるため「表B」が正解です。'
  }
];

// アプリケーションの状態管理
const state = {
  allQuestions: [],      // 全問題データ
  activeQuestions: [],   // 現在出題中の問題リスト
  currentIndex: 0,       // 現在の問題インデックス
  correctCount: 0,       // 現在のセッションでの正解数
  wrongCounts: {},       // 問題IDごとの累計誤答回数 { [id]: count }
  storedWrongIds: [],    // 誤答回数が多い順に並んだ問題IDリスト
  isReviewMode: false,   // 復習モードかどうか
  isQuickMode: false,    // サクッと10問モードかどうか
  selectedUnit: 'all',   // 選択中の出題範囲
  isAnswered: false      // 現在の問題に解答済みかどうか
};

// DOM要素の参照キャッシュ
const dom = {};

/**
 * 要素の表示・非表示を確実に切り替えるヘルパー
 */
function setVisible(el, visible) {
  if (!el) return;
  el.hidden = !visible;
  el.classList.toggle('hidden', !visible);
}

/**
 * 3つの画面（start / quiz / result）のうち指定した1画面のみを表示する
 */
function switchScreen(screenName) {
  setVisible(dom.startView, screenName === 'start');
  setVisible(dom.quizView, screenName === 'quiz');
  setVisible(dom.resultView, screenName === 'result');
}

/**
 * 初期化処理
 */
async function initApp() {
  cacheDomElements();
  checkAndInitStorage();
  await loadQuestions();
  bindEvents();
  renderStartScreen();
}

/**
 * DOM要素の取得
 */
function cacheDomElements() {
  dom.versionNotice = document.getElementById('version-reset-notice');

  // スタート画面
  dom.startView = document.getElementById('start-view');
  dom.versionBadge = document.getElementById('version-badge');
  dom.unitSelect = document.getElementById('unit-select');
  dom.startAllBtn = document.getElementById('start-all-btn');
  dom.startTotalCountBadge = document.getElementById('start-total-count-badge');
  dom.startQuick10Btn = document.getElementById('start-quick10-btn');
  dom.startQuick10Badge = document.getElementById('start-quick10-badge');
  dom.startReviewBtn = document.getElementById('start-review-btn');
  dom.startWrongCountBadge = document.getElementById('start-wrong-count-badge');
  dom.clearHistoryBtn = document.getElementById('clear-history-btn');

  // クイズ画面（問題・最小限の進捗・戻るボタン）
  dom.quizView = document.getElementById('quiz-view');
  dom.backFromQuizBtn = document.getElementById('back-from-quiz-btn');
  dom.quizProgressText = document.getElementById('quiz-progress-text');
  dom.questionNumber = document.getElementById('question-number');
  dom.questionText = document.getElementById('question-text');
  dom.questionCodeWrap = document.getElementById('question-code-wrap');
  dom.questionCode = document.getElementById('question-code');
  dom.questionImageWrap = document.getElementById('question-image-wrap');
  dom.questionImage = document.getElementById('question-image');
  dom.optionsContainer = document.getElementById('options-container');

  // 正誤フィードバック＆解説エリア
  dom.feedbackArea = document.getElementById('feedback-area');
  dom.feedbackBanner = document.getElementById('feedback-banner');
  dom.feedbackIcon = document.getElementById('feedback-icon');
  dom.feedbackTitle = document.getElementById('feedback-title');
  dom.explanationText = document.getElementById('explanation-text');
  dom.nextBtn = document.getElementById('next-btn');

  // 結果画面
  dom.resultView = document.getElementById('result-view');
  dom.resultModeLabel = document.getElementById('result-mode-label');
  dom.scoreNumber = document.getElementById('score-number');
  dom.scoreTotal = document.getElementById('score-total');
  dom.accuracyValue = document.getElementById('accuracy-value');
  dom.resultMessage = document.getElementById('result-message');
  dom.reviewWrongBtn = document.getElementById('review-wrong-btn');
  dom.reviewWrongCountBadge = document.getElementById('review-wrong-count-badge');
  dom.backToStartBtn = document.getElementById('back-to-start-btn');
}

/**
 * localStorageのバージョン照合と初期化
 * 保存されているバージョンと CONFIG.APP_VERSION が一致しない場合、古いデータを自動破棄して初期化する
 */
function checkAndInitStorage() {
  if (dom.versionBadge) {
    dom.versionBadge.textContent = `Ver: ${CONFIG.APP_VERSION}`;
  }

  try {
    const rawData = localStorage.getItem(CONFIG.STORAGE_KEY);
    const auxVersion = localStorage.getItem(`${CONFIG.STORAGE_KEY}_version`);

    if (!rawData) {
      saveWrongCountsToStorage({});
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(rawData);
    } catch (e) {
      resetStorageForNewVersion();
      return;
    }

    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      if (parsed.version !== CONFIG.APP_VERSION) {
        resetStorageForNewVersion();
        return;
      }

      const counts = {};
      if (parsed.wrongCounts && typeof parsed.wrongCounts === 'object') {
        Object.entries(parsed.wrongCounts).forEach(([id, count]) => {
          const numCount = Number(count);
          if (numCount > 0) {
            counts[id] = numCount;
          }
        });
      } else if (Array.isArray(parsed.wrongIds)) {
        parsed.wrongIds.forEach(id => {
          if (id !== null && id !== undefined) {
            counts[id] = (counts[id] || 0) + 1;
          }
        });
      }

      saveWrongCountsToStorage(counts);
      return;
    }

    if (Array.isArray(parsed)) {
      if (auxVersion !== CONFIG.APP_VERSION) {
        resetStorageForNewVersion();
        return;
      }
      const counts = {};
      parsed.forEach(id => {
        if (id !== null && id !== undefined) {
          counts[id] = (counts[id] || 0) + 1;
        }
      });
      saveWrongCountsToStorage(counts);
      return;
    }

    resetStorageForNewVersion();
  } catch (err) {
    console.warn('localStorageへのアクセスが制限されています:', err);
    state.wrongCounts = {};
    state.storedWrongIds = [];
  }
}

/**
 * バージョン不一致時に古いlocalStorageデータを破棄して初期化する
 */
function resetStorageForNewVersion() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
    localStorage.removeItem(`${CONFIG.STORAGE_KEY}_version`);
  } catch (e) {
    // ignore
  }
  saveWrongCountsToStorage({});

  if (dom.versionNotice) {
    setVisible(dom.versionNotice, true);
    setTimeout(() => {
      setVisible(dom.versionNotice, false);
    }, 5000);
  }
}

/**
 * 誤答回数マップから、間違えた回数が多い順（降順）にソートされた問題ID配列を生成する
 */
function getSortedWrongIds(countsMap) {
  return Object.keys(countsMap)
    .filter(id => Number(countsMap[id]) > 0)
    .sort((a, b) => {
      const diff = Number(countsMap[b]) - Number(countsMap[a]);
      if (diff !== 0) return diff;
      return Number(a) - Number(b);
    })
    .map(id => {
      const numId = Number(id);
      return Number.isNaN(numId) ? id : numId;
    });
}

/**
 * 問題ごとの誤答回数とソート済みIDリストをlocalStorageへ保存
 */
function saveWrongCountsToStorage(countsMap) {
  const normalizedCounts = {};
  Object.entries(countsMap || {}).forEach(([id, count]) => {
    const numCount = Number(count);
    if (numCount > 0) {
      normalizedCounts[id] = numCount;
    }
  });

  state.wrongCounts = normalizedCounts;
  state.storedWrongIds = getSortedWrongIds(normalizedCounts);

  try {
    const payload = {
      version: CONFIG.APP_VERSION,
      wrongIds: state.storedWrongIds,
      wrongCounts: state.wrongCounts
    };
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(`${CONFIG.STORAGE_KEY}_version`, CONFIG.APP_VERSION);
  } catch (err) {
    console.warn('localStorageへの保存に失敗しました:', err);
  }
}

/**
 * 問題データの読み込み（CONFIG.QUESTIONS_PATH から取得、失敗時はフォールバック）
 */
async function loadQuestions() {
  try {
    const response = await fetch(CONFIG.QUESTIONS_PATH, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      state.allQuestions = data;
    } else {
      throw new Error('問題データが空または不正な形式です');
    }
  } catch (err) {
    console.info('外部JSONのfetchに失敗したため、内蔵の問題データを使用します:', err.message);
    state.allQuestions = FALLBACK_QUESTIONS;
  }

  // 現在の問題セットに存在しない古いIDがlocalStorageにあれば整理する
  const validIds = new Set(state.allQuestions.map(q => String(q.id)));
  const cleanedCounts = {};
  let changed = false;

  Object.entries(state.wrongCounts).forEach(([id, count]) => {
    if (validIds.has(String(id))) {
      cleanedCounts[id] = count;
    } else {
      changed = true;
    }
  });

  if (changed) {
    saveWrongCountsToStorage(cleanedCounts);
  }
}

/**
 * カテゴリ文字列から出題範囲キーを判定する
 */
function getUnitKeyFromCategory(category) {
  const cat = String(category || '');
  if (/^(13|14|15|16|17|18|19)\b/.test(cat)) return 'digital';
  if (/^(27|28|29)\b/.test(cat)) return 'hardware';
  if (/^(30|31|32)\b/.test(cat)) return 'logic';
  if (/^(33|34|35)\b/.test(cat) || cat.includes('プログラム')) return 'program';
  return 'other';
}

/**
 * 指定された出題範囲に該当する問題リストを返す
 */
function getFilteredQuestions(unitKey) {
  if (!unitKey || unitKey === 'all') {
    return [...state.allQuestions];
  }
  return state.allQuestions.filter(q => getUnitKeyFromCategory(q.category) === unitKey);
}

/**
 * 配列をFisher-Yatesアルゴリズムでシャッフルしたコピーを返す
 */
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * イベントリスナーの登録
 */
function bindEvents() {
  // 出題範囲セレクト変更時
  dom.unitSelect.addEventListener('change', () => {
    state.selectedUnit = dom.unitSelect.value;
    updateStartButtonsForUnit();
  });

  // スタート画面のボタン
  dom.startAllBtn.addEventListener('click', () => {
    startQuiz('all');
  });

  dom.startQuick10Btn.addEventListener('click', () => {
    startQuiz('quick10');
  });

  dom.startReviewBtn.addEventListener('click', () => {
    if (state.storedWrongIds.length > 0) {
      startQuiz('review');
    }
  });

  dom.clearHistoryBtn.addEventListener('click', () => {
    saveWrongCountsToStorage({});
    renderStartScreen();
  });

  // 問題画面の中断（戻る）ボタン
  dom.backFromQuizBtn.addEventListener('click', () => {
    renderStartScreen();
  });

  // 問題画面の「次の問題へ」ボタン
  dom.nextBtn.addEventListener('click', handleNextQuestion);

  // 結果画面のボタン
  dom.reviewWrongBtn.addEventListener('click', () => {
    if (state.storedWrongIds.length > 0) {
      startQuiz('review');
    }
  });

  dom.backToStartBtn.addEventListener('click', () => {
    renderStartScreen();
  });
}

/**
 * 選択中の出題範囲に合わせてスタート画面のボタン表示を更新
 */
function updateStartButtonsForUnit() {
  const filtered = getFilteredQuestions(state.selectedUnit);
  const count = filtered.length;

  dom.startTotalCountBadge.textContent = `全${count}問`;
  dom.startAllBtn.disabled = count === 0;

  const quickCount = Math.min(10, count);
  dom.startQuick10Badge.textContent = `${quickCount}問`;
  setVisible(dom.startQuick10Btn, count > 10);
}

/**
 * 1. スタート画面の表示
 */
function renderStartScreen() {
  switchScreen('start');

  if (dom.unitSelect) {
    dom.unitSelect.value = state.selectedUnit;
  }
  updateStartButtonsForUnit();

  const wrongCount = state.storedWrongIds.length;
  dom.startWrongCountBadge.textContent = `${wrongCount}問`;

  if (wrongCount > 0) {
    dom.startReviewBtn.disabled = false;
    dom.startReviewBtn.classList.remove('is-disabled');
    setVisible(dom.clearHistoryBtn, true);
  } else {
    dom.startReviewBtn.disabled = true;
    dom.startReviewBtn.classList.add('is-disabled');
    setVisible(dom.clearHistoryBtn, false);
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * クイズの開始
 * @param {'all'|'quick10'|'review'} mode - 出題モード
 */
function startQuiz(mode = 'all') {
  if (mode === 'review') {
    // 間違えた回数が多い順に並べる
    const wrongQuestions = state.allQuestions
      .filter(q => (state.wrongCounts[q.id] || 0) > 0)
      .sort((a, b) => {
        const countDiff = (state.wrongCounts[b.id] || 0) - (state.wrongCounts[a.id] || 0);
        if (countDiff !== 0) return countDiff;
        return a.id - b.id;
      });

    if (wrongQuestions.length === 0) {
      renderStartScreen();
      return;
    }

    state.isReviewMode = true;
    state.isQuickMode = false;
    state.activeQuestions = wrongQuestions;
  } else if (mode === 'quick10') {
    const filtered = getFilteredQuestions(state.selectedUnit);
    if (filtered.length === 0) {
      renderStartScreen();
      return;
    }
    state.isReviewMode = false;
    state.isQuickMode = true;
    state.activeQuestions = shuffleArray(filtered).slice(0, 10);
  } else {
    const filtered = getFilteredQuestions(state.selectedUnit);
    if (filtered.length === 0) {
      renderStartScreen();
      return;
    }
    state.isReviewMode = false;
    state.isQuickMode = false;
    state.activeQuestions = filtered;
  }

  state.currentIndex = 0;
  state.correctCount = 0;
  state.isAnswered = false;

  switchScreen('quiz');
  renderCurrentQuestion();
}

/**
 * バッククォート (`...`) によるインラインコードを含むテキストを安全にDOM要素へ描画する
 */
function appendInlineFormattedText(container, text) {
  if (!text) return;
  const parts = String(text).split(/(`[^`]+`)/g);
  parts.forEach(part => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeEl = document.createElement('code');
      codeEl.className = 'inline-code';
      codeEl.textContent = part.slice(1, -1);
      container.appendChild(codeEl);
    } else if (part.length > 0) {
      container.appendChild(document.createTextNode(part));
    }
  });
}

/**
 * テキスト中の ```...``` コードブロックと通常テキスト（インラインコード対応）を分離して抽出する
 */
function extractCodeBlocksFromText(rawText) {
  if (!rawText) return { cleanText: '', extractedCodes: [] };
  const extractedCodes = [];
  const cleanText = String(rawText)
    .replace(/```(?:\w*\n)?([\s\S]*?)```/g, (_, codeContent) => {
      extractedCodes.push(codeContent.replace(/^\n+|\n+$/g, ''));
      return '';
    })
    .trim();
  return { cleanText, extractedCodes };
}

/**
 * 疑似コードデータ（配列または文字列）を行配列へ正規化する
 */
function normalizeCodeLines(codeData) {
  if (!codeData) return [];
  if (Array.isArray(codeData)) {
    return codeData.map(line => String(line));
  }
  if (typeof codeData === 'string') {
    const trimmed = codeData.replace(/^\n+|\n+$/g, '');
    return trimmed ? trimmed.split(/\r?\n/) : [];
  }
  return [];
}

/**
 * <pre> 要素内に疑似コードを行番号付きでレンダリングする
 */
function renderCodeLinesIntoPre(preElement, lines, showLineNumbers = true) {
  preElement.innerHTML = '';
  lines.forEach((lineText, idx) => {
    const lineDiv = document.createElement('div');
    lineDiv.className = 'code-line';

    if (showLineNumbers) {
      const numSpan = document.createElement('span');
      numSpan.className = 'code-line-num';
      numSpan.textContent = String(idx + 1);
      lineDiv.appendChild(numSpan);
    }

    const codeSpan = document.createElement('span');
    codeSpan.className = 'code-line-text';
    codeSpan.textContent = lineText.length > 0 ? lineText : ' ';
    lineDiv.appendChild(codeSpan);

    preElement.appendChild(lineDiv);
  });
}

/**
 * スタンドアロンのコードブロックDOM要素を生成する（選択肢内や解説内で使用）
 */
function createCodeBlockElement(lines, showHeader = false, showLineNumbers = true) {
  const wrapper = document.createElement('div');
  wrapper.className = 'code-block-container';

  if (showHeader) {
    const header = document.createElement('div');
    header.className = 'code-block-header';
    header.textContent = 'プログラム（疑似コード）';
    wrapper.appendChild(header);
  }

  const pre = document.createElement('pre');
  pre.className = 'code-block-pre';
  renderCodeLinesIntoPre(pre, lines, showLineNumbers);
  wrapper.appendChild(pre);

  return wrapper;
}

/**
 * 選択肢データの正規化（文字列またはオブジェクト { text, image, code } に対応）
 */
function normalizeOption(opt) {
  if (typeof opt === 'string') {
    const { cleanText, extractedCodes } = extractCodeBlocksFromText(opt);
    return {
      text: cleanText,
      image: null,
      code: extractedCodes.length > 0 ? extractedCodes.join('\n') : null
    };
  }
  if (opt && typeof opt === 'object') {
    const rawText = opt.text !== undefined ? String(opt.text) : '';
    const { cleanText, extractedCodes } = extractCodeBlocksFromText(rawText);
    const explicitCode = opt.code || (extractedCodes.length > 0 ? extractedCodes.join('\n') : null);
    return {
      text: cleanText,
      image: opt.image || null,
      code: explicitCode
    };
  }
  return { text: '', image: null, code: null };
}

/**
 * 2. 問題画面の描画（回答する前は正誤や解説を完全に非表示にする）
 */
function renderCurrentQuestion() {
  const question = state.activeQuestions[state.currentIndex];
  const total = state.activeQuestions.length;
  const currentNum = state.currentIndex + 1;

  state.isAnswered = false;

  // 最小限の進捗表示（何問目 / 全何問）
  if (dom.quizProgressText) {
    dom.quizProgressText.textContent = `${currentNum} / ${total}`;
  }

  // 回答前の状態として、正誤フィードバック＆解説エリアを確実に隠して中身をクリアする
  setVisible(dom.feedbackArea, false);
  dom.feedbackIcon.textContent = '';
  dom.feedbackTitle.textContent = '';
  dom.explanationText.innerHTML = '';

  dom.questionNumber.textContent = `Q${currentNum}.`;

  // 問題文と ```...``` コードブロックの抽出・描画
  const { cleanText, extractedCodes } = extractCodeBlocksFromText(question.question);
  dom.questionText.innerHTML = '';
  appendInlineFormattedText(dom.questionText, cleanText);

  // 疑似コードの表示制御（question.code プロパティ、または問題文内の ```...```）
  const codeLines = normalizeCodeLines(
    question.code || (extractedCodes.length > 0 ? extractedCodes.join('\n') : null)
  );
  if (codeLines.length > 0) {
    renderCodeLinesIntoPre(dom.questionCode, codeLines, true);
    setVisible(dom.questionCodeWrap, true);
  } else {
    dom.questionCode.innerHTML = '';
    setVisible(dom.questionCodeWrap, false);
  }

  // 問題文に付属する図・画像の表示制御
  if (question.image) {
    dom.questionImage.src = question.image;
    dom.questionImage.alt = `問題${currentNum}の図`;
    setVisible(dom.questionImageWrap, true);
  } else {
    dom.questionImage.removeAttribute('src');
    setVisible(dom.questionImageWrap, false);
  }

  // 選択肢の動的レンダリング
  renderOptions(question);

  dom.nextBtn.textContent = currentNum < total ? '次の問題へ →' : '結果を見る →';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * 選択肢の動的生成（2択・3択・4択、画像有無、疑似コード有無に応じて最適なレイアウトを付与）
 */
function renderOptions(question) {
  dom.optionsContainer.innerHTML = '';

  const normalizedOptions = (question.options || []).map(normalizeOption);
  const optionCount = normalizedOptions.length;
  const hasOptionImages = normalizedOptions.some(opt => Boolean(opt.image));
  const hasOptionCodes = normalizedOptions.some(opt => normalizeCodeLines(opt.code).length > 0);

  // 2択の短いテキスト（「正しい」「誤り」等）かどうかを判定
  const isShortTwoChoice =
    !hasOptionImages &&
    !hasOptionCodes &&
    optionCount === 2 &&
    normalizedOptions.every(opt => opt.text.length <= 10);

  // レイアウトクラスの切り替え
  dom.optionsContainer.className = 'options-grid';
  dom.optionsContainer.classList.add(`count-${optionCount}`);

  if (hasOptionImages && !hasOptionCodes) {
    dom.optionsContainer.classList.add('has-images', 'cols-2');
  } else if (isShortTwoChoice) {
    dom.optionsContainer.classList.add('cols-2', 'two-choice-buttons');
  } else {
    dom.optionsContainer.classList.add('cols-1');
  }

  const labels = ['ア', 'イ', 'ウ', 'エ', 'オ', 'カ'];

  normalizedOptions.forEach((opt, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'option-btn';
    btn.dataset.index = idx;
    if (opt.image) {
      btn.classList.add('option-with-image');
    }

    // 選択肢ヘッダー（記号バッジ＋テキスト）
    const headerDiv = document.createElement('div');
    headerDiv.className = 'option-header';

    const badgeSpan = document.createElement('span');
    badgeSpan.className = 'option-badge';
    badgeSpan.textContent = labels[idx] || String(idx + 1);
    headerDiv.appendChild(badgeSpan);

    if (opt.text) {
      const textSpan = document.createElement('span');
      textSpan.className = 'option-label-text';
      appendInlineFormattedText(textSpan, opt.text);
      headerDiv.appendChild(textSpan);
    }

    btn.appendChild(headerDiv);

    // 選択肢内の疑似コードブロック（存在する場合）
    const optCodeLines = normalizeCodeLines(opt.code);
    if (optCodeLines.length > 0) {
      const codeWrap = document.createElement('div');
      codeWrap.className = 'option-code-wrap';
      const showNums = optCodeLines.length > 1;
      codeWrap.appendChild(createCodeBlockElement(optCodeLines, false, showNums));
      btn.appendChild(codeWrap);
    }

    // 選択肢内の画像（存在する場合）
    if (opt.image) {
      const imgWrap = document.createElement('div');
      imgWrap.className = 'option-image-wrap';

      const img = document.createElement('img');
      img.src = opt.image;
      img.alt = opt.text || `選択肢${idx + 1}の画像`;
      img.className = 'option-image';
      img.loading = 'eager';

      imgWrap.appendChild(img);
      btn.appendChild(imgWrap);
    }

    btn.addEventListener('click', () => handleSelectOption(idx));
    dom.optionsContainer.appendChild(btn);
  });
}

/**
 * 解説文の描画（インラインコード `...` や ```...``` コードブロックに対応）
 */
function renderExplanation(explanationRaw) {
  dom.explanationText.innerHTML = '';
  const text = explanationRaw || '解説はありません。';

  const segments = String(text).split(/(```[\s\S]*?```)/g);
  segments.forEach(segment => {
    if (segment.startsWith('```') && segment.endsWith('```')) {
      const innerCode = segment.replace(/^```(?:\w*\n)?/, '').replace(/```$/, '');
      const lines = normalizeCodeLines(innerCode);
      if (lines.length > 0) {
        dom.explanationText.appendChild(createCodeBlockElement(lines, false, lines.length > 1));
      }
    } else if (segment.trim().length > 0) {
      const p = document.createElement('p');
      p.style.margin = '0';
      appendInlineFormattedText(p, segment.trim());
      dom.explanationText.appendChild(p);
    }
  });
}

/**
 * 選択肢タップ時の正誤判定・解説表示・誤答回数の更新（回答後にのみ正誤と解説を表示）
 */
function handleSelectOption(selectedIndex) {
  if (state.isAnswered) return;
  state.isAnswered = true;

  const question = state.activeQuestions[state.currentIndex];
  const isCorrect = selectedIndex === question.answer;

  if (isCorrect) {
    state.correctCount++;
    // 復習モードで正解した場合は、克服済みとして復習リストから除外する
    if (state.isReviewMode && state.wrongCounts[question.id]) {
      const updatedCounts = { ...state.wrongCounts };
      delete updatedCounts[question.id];
      saveWrongCountsToStorage(updatedCounts);
    }
  } else {
    // 間違えた回数をカウントアップしてlocalStorageへ保存
    const currentWrongCount = state.wrongCounts[question.id] || 0;
    const updatedCounts = {
      ...state.wrongCounts,
      [question.id]: currentWrongCount + 1
    };
    saveWrongCountsToStorage(updatedCounts);
  }

  // 各選択肢ボタンの見た目更新（正解・不正解のハイライト）
  const optionButtons = dom.optionsContainer.querySelectorAll('.option-btn');
  optionButtons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === question.answer) {
      btn.classList.add('is-correct');
    } else if (idx === selectedIndex && !isCorrect) {
      btn.classList.add('is-wrong');
    } else {
      btn.classList.add('is-dimmed');
    }
  });

  // 回答後に初めて正誤フィードバックと解説を表示する
  dom.feedbackBanner.className = 'feedback-banner ' + (isCorrect ? 'correct' : 'wrong');
  dom.feedbackIcon.textContent = isCorrect ? '⭕' : '❌';
  dom.feedbackTitle.textContent = isCorrect ? '正解！' : '不正解...';
  renderExplanation(question.explanation);

  setVisible(dom.feedbackArea, true);

  // スマホ画面で解説と「次の問題へ」ボタンが見やすい位置へスムーズスクロール
  setTimeout(() => {
    dom.feedbackArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, 80);
}

/**
 * 「次の問題へ」ボタン押下時の処理
 */
function handleNextQuestion() {
  if (state.currentIndex + 1 < state.activeQuestions.length) {
    state.currentIndex++;
    renderCurrentQuestion();
  } else {
    renderResultScreen();
  }
}

/**
 * 3. 全問終了後の結果画面表示
 */
function renderResultScreen() {
  switchScreen('result');

  const total = state.activeQuestions.length;
  const correct = state.correctCount;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  if (state.isReviewMode) {
    dom.resultModeLabel.textContent = '復習モード 結果';
  } else if (state.isQuickMode) {
    dom.resultModeLabel.textContent = 'サクッと10問チャレンジ 結果';
  } else {
    dom.resultModeLabel.textContent = '定期テスト対策 結果';
  }

  dom.scoreNumber.textContent = correct;
  dom.scoreTotal.textContent = total;
  dom.accuracyValue.textContent = `${accuracy}%`;

  // 正答率に応じたメッセージ
  if (accuracy === 100) {
    dom.resultMessage.textContent = '素晴らしい！全問正解です。定期テストに向けて完璧な仕上がりです！';
  } else if (accuracy >= 75) {
    dom.resultMessage.textContent = 'あと少しで満点です！間違えた問題の解説を確認して復習しましょう。';
  } else {
    dom.resultMessage.textContent = '間違えた問題を中心に、繰り返し復習して知識を定着させましょう！';
  }

  // 復習モード開始ボタンの活性・非活性制御
  const wrongCount = state.storedWrongIds.length;
  dom.reviewWrongCountBadge.textContent = `${wrongCount}問`;

  if (wrongCount > 0) {
    dom.reviewWrongBtn.disabled = false;
    dom.reviewWrongBtn.classList.remove('is-disabled');
  } else {
    dom.reviewWrongBtn.disabled = true;
    dom.reviewWrongBtn.classList.add('is-disabled');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// DOM構築完了後にアプリを起動
document.addEventListener('DOMContentLoaded', initApp);
