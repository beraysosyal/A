(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => [...document.querySelectorAll(sel)];

  const DB_NAME = "BERAY_US_DB";
  const DB_VERSION = 1;
  const STORE = "settings";
  let deferredInstallPrompt = null;
  let activeWindow = null;

  const defaultSettings = {
    wallpaper: "nebula",
    motion: true,
    opacity: 88,
    accent: "blue",
    lastSaved: null
  };

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => el.classList.add("hidden"), 2800);
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveLocal(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function readLocal(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getSettings() {
    try {
      return { ...defaultSettings, ...(await readLocal("settings") || {}) };
    } catch {
      return { ...defaultSettings };
    }
  }

  async function persistSettings(settings) {
    settings.lastSaved = new Date().toISOString();
    await saveLocal("settings", settings);
    // A later BERAY_US server can be plugged in here without changing the UI.
    // This starter intentionally does NOT upload private data anywhere unless
    // you configure a backend yourself.
  }

  async function requestPersistentStorage() {
    try {
      if (navigator.storage?.persist) {
        const granted = await navigator.storage.persist();
        toast(granted ? "BERAY_US yerel depolama korumasını etkinleştirdi." : "Tarayıcı kalıcı depolamayı vermedi.");
      }
    } catch {
      toast("Yerel depolama isteği tarayıcı tarafından desteklenmedi.");
    }
  }

  async function applySettings(settings) {
    document.documentElement.style.setProperty("--accent", settings.accent === "purple" ? "#a083ff" : "#83a7ff");
    document.documentElement.style.setProperty("--accent-2", settings.accent === "purple" ? "#6b5be7" : "#8e70ff");
    $("#wallpaper").style.opacity = Math.max(.55, Math.min(1, settings.opacity / 100));
    $("#wallpaper").classList.toggle("no-motion", !settings.motion);
  }

  function openWindow(title, icon, content, widthClass="") {
    if (activeWindow) activeWindow.remove();

    const el = document.createElement("section");
    el.className = `app-window ${widthClass}`;
    el.innerHTML = `
      <header class="window-head">
        <span>${icon}</span>
        <div class="window-title">${title}</div>
        <div class="window-actions">
          <button data-win="min" aria-label="Küçült">—</button>
          <button data-win="close" aria-label="Kapat">✕</button>
        </div>
      </header>
      <div class="window-body">${content}</div>
    `;
    $("#windowLayer").appendChild(el);
    activeWindow = el;

    el.querySelector('[data-win="close"]').addEventListener("click", () => {
      el.remove();
      activeWindow = null;
    });
    el.querySelector('[data-win="min"]').addEventListener("click", () => {
      el.remove();
      activeWindow = null;
    });
    return el;
  }

  async function openSettings() {
    const settings = await getSettings();
    const el = openWindow("Ayarlar", "⚙️", `
      <div class="hero">
        <h1>BERAY_US Ayarları</h1>
        <p>Hafif masaüstü deneyimi. Değişiklikler bilgisayardaki bu tarayıcı profiline yerel olarak kaydedilir.</p>
      </div>

      <div class="setting-row">
        <div class="setting-label"><strong>Duvar kâğıdı yoğunluğu</strong><span>Arka plan efektlerinin görünürlüğü.</span></div>
        <div class="range-wrap"><input id="opacityRange" type="range" min="55" max="100" value="${settings.opacity}"><span id="opacityValue">${settings.opacity}%</span></div>
      </div>

      <div class="setting-row">
        <div class="setting-label"><strong>Animasyon</strong><span>Hafif hareketli arka plan efektleri.</span></div>
        <button id="motionToggle" class="primary-button">${settings.motion ? "Açık" : "Kapalı"}</button>
      </div>

      <div class="setting-row">
        <div class="setting-label"><strong>Renk teması</strong><span>BERAY_US vurgu rengi.</span></div>
        <select id="accentSelect" style="padding:9px 12px;border-radius:12px;background:#111a2c;color:white;border:1px solid rgba(255,255,255,.1)">
          <option value="blue" ${settings.accent==="blue"?"selected":""}>Mavi</option>
          <option value="purple" ${settings.accent==="purple"?"selected":""}>Mor</option>
        </select>
      </div>

      <div class="setting-row">
        <div class="setting-label"><strong>Depolama</strong><span>Tarayıcı destekliyorsa BERAY_US verilerini kalıcı tutmayı iste.</span></div>
        <button id="persistButton" class="ghost-button">Koruma iste</button>
      </div>

      <div class="setting-row">
        <div class="setting-label"><strong>Veri yedeği</strong><span>Ayarlarını JSON olarak dışa aktar veya geri yükle.</span></div>
        <div style="display:flex;gap:7px;flex-wrap:wrap">
          <button id="exportButton" class="ghost-button">Dışa aktar</button>
          <label class="ghost-button" style="display:inline-flex;align-items:center;cursor:pointer">
            İçe aktar <input id="importInput" type="file" accept=".json,application/json" hidden>
          </label>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-top:18px">
        <button id="saveSettings" class="primary-button">Kaydet</button>
        <button id="closeSettings" class="ghost-button">Kapat</button>
      </div>
    `);

    const opacityRange = el.querySelector("#opacityRange");
    const opacityValue = el.querySelector("#opacityValue");
    const motionToggle = el.querySelector("#motionToggle");
    const accentSelect = el.querySelector("#accentSelect");

    opacityRange.addEventListener("input", () => opacityValue.textContent = `${opacityRange.value}%`);
    motionToggle.addEventListener("click", () => {
      settings.motion = !settings.motion;
      motionToggle.textContent = settings.motion ? "Açık" : "Kapalı";
    });

    accentSelect.addEventListener("change", () => {
      settings.accent = accentSelect.value;
      applySettings(settings);
    });

    opacityRange.addEventListener("input", () => {
      settings.opacity = Number(opacityRange.value);
      applySettings(settings);
    });

    $("#persistButton").addEventListener("click", requestPersistentStorage);

    $("#saveSettings").addEventListener("click", async () => {
      settings.opacity = Number(opacityRange.value);
      settings.accent = accentSelect.value;
      await persistSettings(settings);
      await applySettings(settings);
      toast("Ayarlar kaydedildi.");
    });

    $("#closeSettings").addEventListener("click", () => { el.remove(); activeWindow = null; });

    $("#exportButton").addEventListener("click", async () => {
      const data = await getSettings();
      const blob = new Blob([JSON.stringify({ app:"BERAY_US", version:1, settings:data }, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "BERAY_US_yedek.json"; a.click();
      URL.revokeObjectURL(url);
      toast("Ayar yedeği indirildi.");
    });

    $("#importInput").addEventListener("change", async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.settings) throw new Error("Geçersiz yedek.");
        await persistSettings({ ...defaultSettings, ...data.settings });
        await applySettings({ ...defaultSettings, ...data.settings });
        toast("Yedek geri yüklendi.");
      } catch {
        toast("Yedek dosyası okunamadı.");
      }
    });
  }

  function openFiles() {
    const el = openWindow("Dosyalar", "📁", `
      <div class="file-drop">
        <h2>Yerel Dosya Alanı</h2>
        <p>Bu ekran yalnızca seçtiğin dosyaları tarayıcı oturumunda işler. Bir dosyaya erişmek için kullanıcı olarak sen seçmelisin.</p>
        <input id="filePicker" type="file" multiple>
        <div id="fileList" style="margin-top:18px;color:#aab5ca;font-size:13px"></div>
      </div>
    `);
    el.querySelector("#filePicker").addEventListener("change", (e) => {
      const files = [...e.target.files];
      el.querySelector("#fileList").innerHTML = files.length
        ? files.map(f => `<div style="padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)">${escapeHtml(f.name)} — ${formatBytes(f.size)}</div>`).join("")
        : "Dosya seçilmedi.";
    });
  }

  function openAbout() {
    openWindow("BERAY_US", "🅱️", `
      <div class="hero">
        <h1>BERAY_US</h1>
        <p>Bilgisayar üzerinde Chrome/Edge tarafından uygulama olarak kurulabilen, hafif bir PWA masaüstü kabuğu.</p>
      </div>
      <div class="info-grid" style="margin-top:14px">
        <div class="info-card"><small>Sürüm</small><strong>0.1.0</strong></div>
        <div class="info-card"><small>Platform</small><strong>PWA</strong></div>
        <div class="info-card"><small>Depolama</small><strong>IndexedDB</strong></div>
      </div>
      <div style="margin-top:18px;padding:15px;border-radius:17px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
        <strong>Çıkış kısayolu</strong>
        <div style="margin-top:6px;color:#aab5ca">İstenen kombinasyon: Ctrl + Shift + AltGr. Tarayıcı bu kısayolu engellerse alternatif olarak tam ekran düğmesini kullan.</div>
      </div>
    `);
  }

  function openGoogle() {
    window.open("https://www.google.com/", "_blank", "noopener,noreferrer");
    toast("Google yeni sekmede açıldı; BERAY_US açık kalır.");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function formatBytes(bytes) {
    if (!bytes) return "0 B";
    const units = ["B","KB","MB","GB"];
    const i = Math.min(Math.floor(Math.log(bytes)/Math.log(1024)), units.length-1);
    return `${(bytes/Math.pow(1024,i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  }

  async function goFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        toast("Tam ekran etkin.");
      } else {
        await document.exitFullscreen();
        toast("Tam ekran kapatıldı.");
      }
    } catch {
      toast("Tarayıcı tam ekran moduna geçişi engelledi.");
    }
  }

  function setupClock() {
    const tick = () => {
      const d = new Date();
      $("#clock").textContent = d.toLocaleTimeString("tr-TR", {hour:"2-digit", minute:"2-digit"});
    };
    tick(); setInterval(tick, 1000);
  }

  function setupInstall() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      $("#installBanner").classList.remove("hidden");
    });

    $("#installButton").addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        toast("Chrome menüsünden “BERAY_US'u yükle” seçeneğini kullanabilirsin.");
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      $("#installBanner").classList.add("hidden");
    });

    $("#dismissInstall").addEventListener("click", () => {
      $("#installBanner").classList.add("hidden");
    });

    window.addEventListener("appinstalled", () => {
      toast("BERAY_US bilgisayara uygulama olarak kuruldu.");
      $("#installBanner").classList.add("hidden");
    });
  }

  function setupButtons() {
    $$("[data-app='files']").forEach(b => b.addEventListener("click", () => openFiles()));
    $$("[data-app='settings']").forEach(b => b.addEventListener("click", () => openSettings()));
    $$("[data-app='about']").forEach(b => b.addEventListener("click", () => openAbout()));

    $("#googleIcon").addEventListener("click", openGoogle);
    $("#googleTaskbar").addEventListener("click", openGoogle);
    $("#googleStart").addEventListener("click", openGoogle);

    $("#startButton").addEventListener("click", () => $("#startMenu").classList.toggle("hidden"));
    $("#closeStart").addEventListener("click", () => $("#startMenu").classList.add("hidden"));
    $("#fullscreenButton").addEventListener("click", goFullscreen);

    document.addEventListener("click", (e) => {
      if (!e.target.closest("#startMenu") && !e.target.closest("#startButton")) {
        $("#startMenu").classList.add("hidden");
      }
    });
  }

  function setupExitShortcut() {
    document.addEventListener("keydown", async (e) => {
      // İstenen kombinasyonun tarayıcının izin verdiği ölçüde yakalanması.
      const requested = e.ctrlKey && e.shiftKey && e.code === "AltRight";
      const fallback = e.ctrlKey && e.shiftKey && e.altKey && e.code === "KeyQ";
      if (requested || fallback) {
        e.preventDefault();
        if (document.fullscreenElement) {
          try { await document.exitFullscreen(); } catch {}
        }
        toast("BERAY_US tam ekranından çıkıldı.");
      }
    });
  }

  async function boot() {
    setupClock();
    setupButtons();
    setupInstall();
    setupExitShortcut();

    const settings = await getSettings();
    await applySettings(settings);

    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("./sw.js"); } catch {}
    }

    setTimeout(() => {
      $("#bootScreen").classList.add("hidden");
      $("#os").classList.remove("hidden");
    }, 1050);

    // Kullanıcı etkileşimiyle çağırmak üzere kalıcı depolama isteğini hazır bırakırız.
    window.berayUS = {
      saveLocal,
      readLocal,
      persistSettings,
      requestPersistentStorage
    };
  }

  boot();
})();
