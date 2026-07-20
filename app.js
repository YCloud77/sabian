/* app.js — UIロジック（サビアンの鏡） */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const form = $("birth-form");
  const placeInput = $("in-place");
  const placeStatus = $("place-status");
  const HISTORY_KEY = "sabian-history-v1";
  const PERSONA_KEY = "sabian-persona";
  const DEFAULT_PERSONA = "fukurou";

  let currentChart = null;
  let currentName = "";
  let currentReport = null;

  // ---- 生年月日プルダウン（年・月・日） ----
  (function initDateSelects() {
    const ySel = $("in-year"), mSel = $("in-month"), dSel = $("in-day");
    const thisYear = new Date().getFullYear();
    for (let y = thisYear; y >= 1920; y--) {
      const o = document.createElement("option");
      o.value = String(y); o.textContent = `${y}年`;
      ySel.appendChild(o);
    }
    for (let m = 1; m <= 12; m++) {
      const o = document.createElement("option");
      o.value = String(m).padStart(2, "0"); o.textContent = `${m}月`;
      mSel.appendChild(o);
    }
    function refreshDays() {
      const y = parseInt(ySel.value || "2000", 10);
      const m = parseInt(mSel.value || "1", 10);
      const maxD = new Date(y, m, 0).getDate();
      const cur = dSel.value;
      while (dSel.options.length > 1) dSel.remove(1);
      for (let d = 1; d <= maxD; d++) {
        const o = document.createElement("option");
        o.value = String(d).padStart(2, "0"); o.textContent = `${d}日`;
        dSel.appendChild(o);
      }
      if (cur && parseInt(cur, 10) <= maxD) dSel.value = cur;
    }
    ySel.addEventListener("change", refreshDays);
    mSel.addEventListener("change", refreshDays);
    refreshDays();
  })();

  function getDateStr() {
    const y = $("in-year").value, m = $("in-month").value, d = $("in-day").value;
    return y && m && d ? `${y}-${m}-${d}` : "";
  }
  function setDateStr(dateStr) {
    const [y, m, d] = (dateStr || "").split("-");
    $("in-year").value = y || "";
    $("in-month").value = m || "";
    $("in-month").dispatchEvent(new Event("change"));
    $("in-day").value = d || "";
  }

  // ---- 出生地オートコンプリート ----
  const datalist = $("place-list");
  for (const p of PLACES) {
    const opt = document.createElement("option");
    opt.value = p.name;
    datalist.appendChild(opt);
  }

  function findPlace(name) {
    const q = (name || "").trim();
    if (!q) return null;
    return (
      PLACES.find((p) => p.name === q) ||
      PLACES.find((p) => p.name.startsWith(q) || q.startsWith(p.name.replace(/市|町|区$/, ""))) ||
      null
    );
  }

  placeInput.addEventListener("input", () => {
    const hit = findPlace(placeInput.value);
    placeStatus.textContent = hit ? `→ ${hit.name}（緯度${hit.lat} / 経度${hit.lon}）` : "";
  });

  // オンライン時のみ: Nominatim による補助検索（任意・失敗しても動く）
  async function geocodeOnline(q) {
    const url = "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(q);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("geocode failed");
    const data = await res.json();
    if (!data.length) throw new Error("not found");
    return { name: q, lat: Math.round(parseFloat(data[0].lat) * 100) / 100, lon: Math.round(parseFloat(data[0].lon) * 100) / 100 };
  }

  // ---- 鑑定士ペルソナ（Claude深読み専用・アプリ内レポートには影響しない） ----
  const personaSel = $("in-persona");
  function getPersona() {
    const v = personaSel.value;
    return v === "anesan" || v === "master" || v === "fukurou" ? v : DEFAULT_PERSONA;
  }
  function setPersona(id) {
    personaSel.value = (id === "anesan" || id === "master" || id === "fukurou") ? id : DEFAULT_PERSONA;
  }
  try { setPersona(localStorage.getItem(PERSONA_KEY) || DEFAULT_PERSONA); } catch (e) {}
  personaSel.addEventListener("change", () => {
    try { localStorage.setItem(PERSONA_KEY, getPersona()); } catch (e) {}
    refreshClaudeLink(); // ペルソナを変えたら深読みリンクも更新
  });

  // ---- 深読みリンク（<a>）のhref ----
  // ★window.openは使わず本物のリンク（ポップアップブロック回避）。
  // ★プロンプトはURLに載せない: 長すぎる(約27KB)とclaude.aiが読み込めず真っ白になるため。
  //   常に「軽い空の新規チャット」を開き、プロンプトはクリップボード経由で貼り付けてもらう（確実）。
  function refreshClaudeLink() {
    $("btn-claude").href = "https://claude.ai/new";
  }

  // ---- タイムゾーン ----
  $("in-tz").addEventListener("change", () => {
    $("tz-custom-row").hidden = $("in-tz").value !== "custom";
  });
  function getTzOffset() {
    const v = $("in-tz").value;
    return v === "custom" ? parseFloat($("in-tz-custom").value || "9") : parseFloat(v);
  }

  // ---- 履歴（localStorage・最大10件） ----
  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveToHistory(entry) {
    let h = loadHistory().filter((x) => !(x.name === entry.name && x.dateStr === entry.dateStr && x.timeStr === entry.timeStr));
    h.unshift(entry);
    h = h.slice(0, 10);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    renderHistory();
  }
  function renderHistory() {
    const h = loadHistory();
    $("history-section").hidden = h.length === 0;
    const ul = $("history-list");
    ul.innerHTML = "";
    h.forEach((e, i) => {
      const li = document.createElement("li");
      const load = document.createElement("button");
      load.type = "button";
      load.className = "hist-load";
      load.textContent = `${e.name || "（無名）"}　${e.dateStr} ${e.timeStr}`;
      load.addEventListener("click", () => {
        $("in-name").value = e.name || "";
        setDateStr(e.dateStr);
        $("in-time").value = e.timeStr;
        placeInput.value = e.placeName || "";
        $("in-lat").value = e.lat;
        $("in-lon").value = e.lon;
        setPersona(e.personaId || DEFAULT_PERSONA);
        try { localStorage.setItem(PERSONA_KEY, getPersona()); } catch (err) {}
        runReading(e.name, e.dateStr, e.timeStr, e.utcOffsetHours, e.lat, e.lon, e.placeName, false);
      });
      const del = document.createElement("button");
      del.type = "button";
      del.className = "hist-del";
      del.setAttribute("aria-label", "この履歴を削除");
      del.textContent = "×";
      del.addEventListener("click", () => {
        const arr = loadHistory();
        arr.splice(i, 1);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
        renderHistory();
      });
      li.appendChild(load);
      li.appendChild(del);
      ul.appendChild(li);
    });
  }

  // ---- レポート描画 ----
  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function mdTableToHtml(md) {
    const lines = md.trim().split("\n").filter((l) => l.trim().startsWith("|"));
    if (lines.length < 3) return "<p>" + esc(md) + "</p>";
    const parse = (l) => l.split("|").slice(1, -1).map((c) => c.trim());
    const head = parse(lines[0]);
    let html = '<div class="table-wrap"><table><thead><tr>';
    html += head.map((h) => `<th>${esc(h)}</th>`).join("");
    html += "</tr></thead><tbody>";
    for (const line of lines.slice(2)) {
      html += "<tr>" + parse(line).map((c) => `<td>${esc(c)}</td>`).join("") + "</tr>";
    }
    return html + "</tbody></table></div>";
  }
  function bodyToHtml(body) {
    // 段落・表・リストの混在に対応（空行区切りのブロック単位で判定）
    return body.split("\n\n").map((block) => {
      const t = block.trim();
      if (!t) return "";
      if (t.startsWith("|")) return mdTableToHtml(t);
      if (t.startsWith("- ")) {
        const items = t.split("\n").filter((l) => l.startsWith("- ")).map((l) => `<li>${esc(l.slice(2))}</li>`);
        return `<ul>${items.join("")}</ul>`;
      }
      return `<p>${esc(t)}</p>`;
    }).join("");
  }

  function renderReport(report, name, chart) {
    $("result").hidden = false;
    $("result-title").textContent = (name || "（無名）") + " さんのリーディング";
    $("result-meta").textContent =
      `${chart.input.dateStr} ${chart.input.timeStr}（UTC${chart.input.utcOffsetHours >= 0 ? "+" : ""}${chart.input.utcOffsetHours}）` +
      `　ASC ${chart.asc.signJa}／MC ${chart.mc.signJa}`;
    const noteEl = $("result-note");
    noteEl.hidden = !report.note;
    noteEl.textContent = report.note || "";

    const div = $("report");
    div.innerHTML = "";
    for (const s of report.sections) {
      if (s.collapsible) {
        const det = document.createElement("details");
        det.className = "report-section";
        det.innerHTML = `<summary>${esc(s.title)}</summary>` + bodyToHtml(s.body);
        div.appendChild(det);
      } else {
        const sec = document.createElement("section");
        sec.className = "report-section";
        let html = `<h3>${esc(s.title)}</h3>` + bodyToHtml(s.body);
        if (s.keyPoints && s.keyPoints.length) {
          html += `<ul class="key-points">${s.keyPoints.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>`;
        }
        if (s.evidence && s.evidence.length) {
          html += `<details class="evidence-details"><summary>読みの背景</summary><ul>` +
            s.evidence.map((e) => `<li>${esc(e)}</li>`).join("") + `</ul></details>`;
        }
        sec.innerHTML = html;
        div.appendChild(sec);
      }
    }
    $("copy-fallback").hidden = true;
  }

  // ---- 実行 ----
  function runReading(name, dateStr, timeStr, utcOffsetHours, lat, lon, placeName, addHistory) {
    try {
      const chart = SabianChart.computeChart({ dateStr, timeStr, utcOffsetHours, lat, lon });
      const report = SabianInterpret.buildReport(chart, name);
      currentChart = chart;
      currentName = name;
      currentReport = report;
      renderReport(report, name, chart);
      refreshClaudeLink();
      if (addHistory) {
        saveToHistory({ name, dateStr, timeStr, utcOffsetHours, lat, lon, placeName, personaId: getPersona() });
      }
      $("result").scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      alert("計算中にエラーが起きました: " + err.message);
    }
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const name = $("in-name").value.trim();
    const dateStr = getDateStr();
    if (!dateStr) { alert("生年月日（年・月・日）を選んでください"); return; }
    const timeStr = $("in-time").value;
    const tz = getTzOffset();

    let lat = parseFloat($("in-lat").value);
    let lon = parseFloat($("in-lon").value);
    let placeName = placeInput.value.trim();

    if (isNaN(lat) || isNaN(lon)) {
      const hit = findPlace(placeName);
      if (hit) {
        lat = hit.lat; lon = hit.lon; placeName = hit.name;
      } else if (placeName && navigator.onLine) {
        placeStatus.textContent = "地名を検索中…（OpenStreetMap）";
        try {
          const g = await geocodeOnline(placeName);
          lat = g.lat; lon = g.lon;
          placeStatus.textContent = `→ ${placeName}（緯度${lat} / 経度${lon}・オンライン検索）`;
        } catch (e) {
          placeStatus.textContent = "見つかりませんでした。詳細設定から緯度・経度を入力してください。";
          return;
        }
      } else {
        placeStatus.textContent = "リストにない地名です。詳細設定から緯度・経度を入力してください。";
        return;
      }
    }
    runReading(name, dateStr, timeStr, tz, lat, lon, placeName, true);
  });

  // ---- コピー系 ----
  // ★同期コピー: クリックのユーザー操作の中で document.execCommand('copy') を即座に実行する。
  //   navigator.clipboard は非同期でフォーカスを要求するため、リンクで新規タブが開くと
  //   フォーカスが移って失敗する。execCommand なら遷移前に同期で完了する（＝確実）。
  function copyTextSync(text) {
    const ta = $("copy-fallback-text");
    ta.value = text;
    $("copy-fallback").hidden = false;
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    // 新しめのAPIも保険で試す（成否は待たない）
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try { navigator.clipboard.writeText(text).catch(() => {}); } catch (e) {}
    }
    return ok;
  }
  // Markdownボタン用（非同期でよい場面）
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) { return copyTextSync(text); }
  }

  // ★深読みは <a target="_blank"> の本物のリンク＝Claudeの空の新規チャットを新規タブで開く
  //   （ポップアップブロック対象外・軽いので確実に表示される）。
  //   プロンプトはクリック時にクリップボードへコピー → 開いたタブで Cmd+V 貼り付け → 送信。
  $("btn-claude").addEventListener("click", () => {
    if (!currentChart) return;
    const fullPrompt = SabianInterpret.toClaudePrompt(currentChart, currentName, getPersona());
    // ★同期でコピー（遷移でフォーカスが移る前に確実に完了させる）。貼り付け枠も常に表示。
    const ok = copyTextSync(fullPrompt);
    $("btn-claude").textContent = ok
      ? "コピー済み。開いたClaudeで Cmd+V → 送信してください"
      : "下の枠を全選択(Cmd+A)→コピー(Cmd+C)→Claudeに貼り付け";
    setTimeout(() => { $("btn-claude").textContent = "Claudeで深読みを開く（コピー＆貼り付け）"; }, 12000);
    // リンクのnative遷移（claude.ai/new を新規タブ）はこのハンドラの後に走る。preventDefaultしない。
  });
  refreshClaudeLink();

  $("btn-md").addEventListener("click", async () => {
    if (!currentChart) return;
    const ok = await copyText(SabianInterpret.toMarkdown(currentChart, currentName, currentReport));
    $("btn-md").textContent = ok ? "コピーしました" : "Markdownコピー";
    if (ok) setTimeout(() => { $("btn-md").textContent = "Markdownコピー"; }, 3000);
  });

  // ---- 起動 ----
  renderHistory();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
