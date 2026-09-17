// ============================================================
//  날씨 조건문 학습 시뮬레이터 - app.js
//  함수 없이 if / elif / else 만 사용하는 교육용 버전
// ============================================================

// ── 기본 Python 코드 (학생에게 보여줄 코드) ──────────────────
const DEFAULT_CODE = `# 🌤️ 날씨별 음식 메뉴 선택 프로그램
# 아래 weather 변수를 바꾸고 [코드 실행하기] 버튼을 눌러보세요!

weather = "맑음"   # ← "맑음", "흐림", "비" 중 하나를 입력하세요

# ───────────────────────────────────────────
# 조건문: weather 값에 따라 menu 가 결정됩니다
# ───────────────────────────────────────────

if weather == "맑음":
    menu = "샌드위치 🥪"
    reason = "맑은 날엔 밖에서 샌드위치를 먹어요!"

elif weather == "흐림":
    menu = "라면 🍜"
    reason = "흐린 날엔 따뜻한 라면이 딱 좋아요!"

elif weather == "비":
    menu = "파전 🥞"
    reason = "비 오는 날엔 파전이 최고죠!"

else:
    menu = "편의점 도시락 🍱"
    reason = "모르는 날씨엔 편의점 도시락!"

# 결과 출력
print("오늘 날씨:", weather)
print("추천 메뉴:", menu)
print("이유:", reason)
`;

// ── 전역 상태 ─────────────────────────────────────────────────
let editor = null;
let selectedWeather = "맑음";

// ── 날씨별 이모지 매핑 ─────────────────────────────────────────
const WEATHER_EMOJI = { "맑음": "☀️", "흐림": "☁️", "비": "🌧️" };

// ── 페이지 로드 ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  initEditor();
  initSlider();
});

// ── CodeMirror 에디터 초기화 ──────────────────────────────────
function initEditor() {
  const textarea = document.getElementById('codeArea');
  textarea.value = DEFAULT_CODE;

  editor = CodeMirror.fromTextArea(textarea, {
    mode: 'python',
    theme: 'dracula',
    lineNumbers: true,
    tabSize: 4,
    indentWithTabs: false,
    autoCloseBrackets: true,
    matchBrackets: true,
    lineWrapping: false,
    extraKeys: { 'Tab': cm => cm.replaceSelection('    ') }
  });

  editor.on('cursorActivity', updateStatus);
  editor.on('change', updateStatus);
  updateStatus();
}

// ── 상태바 업데이트 ───────────────────────────────────────────
function updateStatus() {
  if (!editor) return;
  const c = editor.getCursor();
  document.getElementById('cursorPos').textContent = `줄: ${c.line + 1} | 컬럼: ${c.ch + 1}`;
}

// ── 슬라이더 초기화 (더미용, weather만 사용) ─────────────────
function initSlider() { /* 슬라이더는 제거, weather 버튼만 사용 */ }

// ── 날씨 버튼 선택 ────────────────────────────────────────────
function selectWeather(w) {
  selectedWeather = w;

  // 버튼 active 표시
  document.querySelectorAll('.w-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.weather === w);
  });

  // 변수 미리보기 업데이트
  document.getElementById('varDisplay').textContent = `"${w}"`;

  // 에디터 코드 내 weather = "..." 자동 업데이트
  if (editor) {
    const code = editor.getValue();
    const updated = code.replace(
      /^(weather\s*=\s*["'])([^"']+)(["'])/m,
      `$1${w}$3`
    );
    if (updated !== code) editor.setValue(updated);
  }
}

// ── 코드 실행 ─────────────────────────────────────────────────
function runCode() {
  const code = editor ? editor.getValue() : DEFAULT_CODE;

  // 버튼 애니메이션
  const runBtn = document.getElementById('runBtn');
  runBtn.classList.add('running');
  runBtn.innerHTML = '<span class="run-icon">⏳</span> 실행 중...';

  setTimeout(() => {
    try {
      const result = interpretCode(code);
      showResult(result);
    } catch (e) {
      showError(e.message);
    }

    runBtn.classList.remove('running');
    runBtn.innerHTML = '<span class="run-icon">▶</span> 코드 실행하기';
  }, 380); // 짧은 딜레이로 "실행" 느낌 연출
}

// ── Python 조건문 인터프리터 (if/elif/else + print 지원) ──────
function interpretCode(code) {
  // 1) weather 변수 파싱
  const weatherMatch = code.match(/^weather\s*=\s*["']([^"']+)["']/m);
  if (!weatherMatch) throw new Error('weather 변수를 찾을 수 없어요.\nweather = "맑음" 형태로 적어주세요!');
  const weather = weatherMatch[1];

  // 2) 에디터의 if/elif/else 블록을 파싱해서 조건 추적
  const traces = [];
  let menu = null;
  let reason = null;

  // if/elif 패턴: weather == "값"
  const condPattern = /^[ \t]*(if|elif)\s+weather\s*==\s*["']([^"']+)["']\s*:/mg;
  const menuPattern  = /^[ \t]+menu\s*=\s*["']([^"']+)["']/m;
  const reasonPattern = /^[ \t]+reason\s*=\s*["']([^"']+)["']/m;

  // 블록 분할: if / elif / else
  // 각 블록의 시작 줄 번호와 내용을 추출
  const lines = code.split('\n');
  const blocks = [];   // { type, cond, body, lineNo }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // if weather == "..."
    const ifMatch = line.match(/^(if)\s+weather\s*==\s*["']([^"']+)["']\s*:/);
    if (ifMatch) {
      const { body, next } = extractBody(lines, i + 1);
      blocks.push({ type: 'if', cond: ifMatch[2], body: body.join('\n'), lineNo: i + 1 });
      i = next;
      continue;
    }

    // elif weather == "..."
    const elifMatch = line.match(/^(elif)\s+weather\s*==\s*["']([^"']+)["']\s*:/);
    if (elifMatch) {
      const { body, next } = extractBody(lines, i + 1);
      blocks.push({ type: 'elif', cond: elifMatch[2], body: body.join('\n'), lineNo: i + 1 });
      i = next;
      continue;
    }

    // else:
    const elseMatch = line.match(/^else\s*:/);
    if (elseMatch) {
      const { body, next } = extractBody(lines, i + 1);
      blocks.push({ type: 'else', cond: null, body: body.join('\n'), lineNo: i + 1 });
      i = next;
      continue;
    }

    i++;
  }

  // 3) 조건 평가
  let matched = false;
  for (const block of blocks) {
    const hit = !matched && (block.type === 'else' || block.cond === weather);
    traces.push({
      type:  block.type,
      cond:  block.cond,
      hit:   hit && !matched,
      lineNo: block.lineNo
    });

    if (hit && !matched) {
      matched = true;
      const mMenu   = block.body.match(/menu\s*=\s*["']([^"']+)["']/);
      const mReason = block.body.match(/reason\s*=\s*["']([^"']+)["']/);
      if (mMenu)   menu   = mMenu[1];
      if (mReason) reason = mReason[1];
    }
  }

  // 4) print() 출력 시뮬레이션
  const printLines = [];
  const printMatches = [...code.matchAll(/^print\s*\(([^)]+)\)/mg)];
  for (const pm of printMatches) {
    // 단순 치환: weather, menu, reason 변수
    let out = pm[1]
      .replace(/["']/g, '')
      .replace(/^,?\s*/, '')
      .replace(/\bweather\b/g, weather)
      .replace(/\bmenu\b/g, menu || '(없음)')
      .replace(/\breason\b/g, reason || '(없음)');
    // 쉼표 분리된 인수 처리
    const parts = pm[1].split(',').map(p => {
      return p.trim()
        .replace(/^["']|["']$/g, '')
        .replace(/\bweather\b/g, weather)
        .replace(/\bmenu\b/g, menu || '(없음)')
        .replace(/\breason\b/g, reason || '(없음)');
    });
    printLines.push(parts.join(' '));
  }

  return { weather, menu, reason, traces, printLines };
}

// ── 블록 본문 추출 헬퍼 ──────────────────────────────────────
function extractBody(lines, startIdx) {
  const body = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    // 들여쓰기가 있는 줄만 본문
    if (line.match(/^[ \t]+\S/)) {
      body.push(line);
    } else if (line.trim() === '') {
      body.push(line); // 빈 줄 허용
    } else {
      break; // 들여쓰기 없으면 블록 끝
    }
    i++;
  }
  return { body, next: i };
}

// ── 결과 표시 ─────────────────────────────────────────────────
function showResult({ weather, menu, reason, traces, printLines }) {
  const panel = document.getElementById('resultPanel');
  const body  = document.getElementById('resultBody');

  panel.className = 'panel result-panel success';

  // 날씨 이모지 & 음식 이모지 분리
  let foodEmoji = '🍽️';
  let menuName  = menu || '(메뉴 없음)';
  // 이모지가 menu 문자열 끝에 있으면 분리
  const emojiMatch = menuName.match(/^(.*?)\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{26FF}]+)$/u);
  if (emojiMatch) { menuName = emojiMatch[1].trim(); foodEmoji = emojiMatch[2]; }

  // 조건 추적 HTML
  const traceRows = traces.map((t, idx) => {
    const kw    = t.type === 'else' ? 'else' : `${t.type} weather == "${t.cond}"`;
    const icon  = t.hit ? '✅' : '❌';
    const cls   = t.hit ? 'hit' : 'miss';
    const delay = idx * 0.07;
    return `<div class="trace-row ${cls}" style="animation-delay:${delay}s">
      <span class="trace-icon">${icon}</span>
      <code>${escHtml(kw)}${t.hit ? ' → 실행됨' : ''}</code>
    </div>`;
  }).join('');

  // print 출력 HTML
  const printHtml = printLines.length
    ? `<div class="print-out">
         <div class="print-label">💻 print() 출력</div>
         ${printLines.map(l => `<div>>>> ${escHtml(l)}</div>`).join('')}
       </div>`
    : '';

  body.innerHTML = `
    <div class="result-success">
      <div class="result-top">
        <div class="result-food-emoji">${foodEmoji}</div>
        <div class="result-info">
          <div class="result-label-sm">🌤 ${WEATHER_EMOJI[weather] || ''} ${weather} 날씨 → 추천 메뉴</div>
          <div class="result-menu-name">${escHtml(menuName)}</div>
        </div>
      </div>

      ${reason ? `<div style="font-size:0.85rem;color:var(--text-muted);padding:0.1rem 0 0.4rem">${escHtml(reason)}</div>` : ''}

      <div class="trace-box">
        <div class="trace-title">📋 조건 실행 흐름</div>
        ${traceRows}
      </div>

      ${printHtml}
    </div>
  `;

  // 날씨 버튼도 동기화
  document.querySelectorAll('.w-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.weather === weather);
  });
  document.getElementById('varDisplay').textContent = `"${weather}"`;
}

// ── 에러 표시 ─────────────────────────────────────────────────
function showError(msg) {
  const panel = document.getElementById('resultPanel');
  const body  = document.getElementById('resultBody');
  panel.className = 'panel result-panel error';
  body.innerHTML = `
    <div class="result-error">⚠️ 코드 오류\n\n${escHtml(msg)}</div>
  `;
}

// ── 코드 초기화 ───────────────────────────────────────────────
function resetCode() {
  if (!editor) return;
  editor.setValue(DEFAULT_CODE);
  selectedWeather = "맑음";
  document.querySelectorAll('.w-btn').forEach(b => b.classList.toggle('active', b.dataset.weather === '맑음'));
  document.getElementById('varDisplay').textContent = '"맑음"';

  // 결과 패널 초기화
  document.getElementById('resultPanel').className = 'panel result-panel';
  document.getElementById('resultBody').innerHTML = `
    <div class="result-idle">
      <div class="idle-icon">▶</div>
      <div class="idle-text">코드 실행 버튼을 눌러보세요!</div>
    </div>`;
  showToast('✅ 코드가 초기 상태로 돌아갔습니다');
}

// ── 코드 복사 ─────────────────────────────────────────────────
function copyCode() {
  if (!editor) return;
  navigator.clipboard.writeText(editor.getValue())
    .then(() => showToast('📋 코드가 복사되었습니다!'))
    .catch(() => showToast('❌ 복사에 실패했습니다'));
}

// ── 토스트 알림 ───────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ── HTML 이스케이프 ───────────────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
