(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const DB = "BERAY_US_CORE";
  const STORE = "core";
  let zIndex = 100;
  let deferredPrompt = null;
  let notifications = [];
  let settings = {
    motion: true,
    brightness: 100,
    accent: "blue",
    startMenu: false,
    focus: false,
    pinned: ["browser","files","notes","settings"]
  };
  const windows = new Map();

  const apps = {
    browser: { title:"Web", icon:"◎", task:"◎" },
    files: { title:"Dosyalar", icon:"▣", task:"▣" },
    notes: { title:"Notlar", icon:"✎", task:"✎" },
    settings: { title:"Ayarlar", icon:"⚙", task:"⚙" },
    system: { title:"Sistem", icon:"◫", task:"◫" },
    store: { title:"Uygulamalar", icon:"✦", task:"✦" }
  };

  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function timeNow(){
    return new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});
  }

  function addNotification(title, text){
    if(settings.focus) return;
    notifications.unshift({title,text,time:timeNow()});
    notifications = notifications.slice(0,10);
    localStorage.setItem("beray-notify", JSON.stringify(notifications));
    renderNotifications();
    $("#notificationDot").classList.remove("hidden");
  }

  function renderNotifications(){
    const box = $("#notifications");
    if(!notifications.length){
      box.innerHTML = '<div class="empty-state">Yeni bildirim yok.</div>';
      return;
    }
    box.innerHTML = notifications.map(n => `
      <article class="notification-item">
        <strong>${escapeHtml(n.title)}</strong>
        <p>${escapeHtml(n.text)}</p>
        <time>${escapeHtml(n.time)}</time>
      </article>`).join("");
  }

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function idbGet(key){
    try{
      const db=await openDB();
      return await new Promise((resolve,reject)=>{
        const req=db.transaction(STORE,"readonly").objectStore(STORE).get(key);
        req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
      });
    }catch{return null}
  }
  async function idbPut(key,val){
    const db=await openDB();
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,"readwrite"); tx.objectStore(STORE).put(val,key);
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
  }

  function showPanel(id){
    ["startMenu","quickPanel","notifyPanel"].forEach(x=>$("#"+x).classList.add("hidden"));
    $("#"+id).classList.remove("hidden");
  }
  function hidePanels(){["startMenu","quickPanel","notifyPanel"].forEach(x=>$("#"+x).classList.add("hidden"));}

  function touchWindow(win){
    zIndex += 1;
    win.style.zIndex = zIndex;
    $$(".task-app").forEach(b=>b.classList.toggle("active", b.dataset.window === win.dataset.windowId));
  }

  function makeWindow(appId, content){
    const existing = windows.get(appId);
    if(existing){
      existing.classList.remove("minimized");
      touchWindow(existing); return existing;
    }

    const def = apps[appId];
    const win = document.createElement("section");
    const id = `${appId}-${Date.now()}`;
    win.className = "app-window";
    win.dataset.windowId = appId;
    win.style.left = `${Math.max(40, 50 + (windows.size%4)*18)}%`;
    win.style.top = `${Math.max(38, 47 + (windows.size%3)*10)}%`;
    win.innerHTML = `
      <header class="window-head drag-handle">
        <div class="window-appmark">${def.icon}</div>
        <div class="window-title">${escapeHtml(def.title)}</div>
        <div class="window-actions">
          <button data-action="min" title="Küçült">—</button>
          <button data-action="max" title="Büyüt">□</button>
          <button data-action="close" title="Kapat">×</button>
        </div>
      </header>
      <div class="window-body">${content}</div>
    `;
    $("#windowLayer").appendChild(win);
    windows.set(appId,win);
    addTaskButton(appId);
    touchWindow(win);

    win.addEventListener("pointerdown",()=>touchWindow(win));
    const head=$(".drag-handle",win);
    let dragging=false, sx=0, sy=0, ox=0, oy=0;
    head.addEventListener("pointerdown",e=>{
      if(e.target.closest(".window-actions") || win.classList.contains("maximized")) return;
      dragging=true; sx=e.clientX; sy=e.clientY;
      const r=win.getBoundingClientRect(); ox=r.left; oy=r.top;
      head.setPointerCapture(e.pointerId);
    });
    head.addEventListener("pointermove",e=>{
      if(!dragging) return;
      const nx=Math.min(window.innerWidth-120,Math.max(10,ox+(e.clientX-sx)));
      const ny=Math.min(window.innerHeight-100,Math.max(62,oy+(e.clientY-sy)));
      win.style.left=`${nx}px`; win.style.top=`${ny}px`; win.style.transform="none";
    });
    head.addEventListener("pointerup",()=>dragging=false);

    win.addEventListener("click",e=>{
      const b=e.target.closest("[data-action]");
      if(!b) return;
      const a=b.dataset.action;
      if(a==="close"){win.remove(); windows.delete(appId); removeTaskButton(appId);}
      if(a==="min"){win.classList.add("minimized");}
      if(a==="max"){
        const max=win.classList.toggle("maximized");
        b.textContent=max?"❐":"□";
      }
    });

    return win;
  }

  function addTaskButton(appId){
    if($(`.task-app[data-window="${appId}"]`)) return;
    const b=document.createElement("button");
    b.className="task-app"; b.dataset.window=appId; b.title=apps[appId].title; b.textContent=apps[appId].task;
    b.addEventListener("click",()=>{
      const win=windows.get(appId);
      if(!win) return;
      if(win.classList.contains("minimized")) win.classList.remove("minimized");
      touchWindow(win);
    });
    $("#taskApps").appendChild(b);
  }
  function removeTaskButton(appId){$(`.task-app[data-window="${appId}"]`)?.remove();}

  function openApp(appId){
    hidePanels();
    if(appId==="browser") return openBrowser();
    if(appId==="files") return openFiles();
    if(appId==="notes") return openNotes();
    if(appId==="settings") return openSettings();
    if(appId==="system") return openSystem();
    if(appId==="store") return openStore();
  }

  function openBrowser(){
    const win=makeWindow("browser",`
      <div class="browser-shell">
        <div class="browser-toolbar">
          <div class="browser-nav">
            <button id="browserBack">‹</button><button id="browserForward">›</button><button id="browserReload">↻</button>
          </div>
          <div class="address-bar"><span>⌕</span><input id="addressInput" value="https://www.google.com/search?igu=1" aria-label="Adres"><span class="pill">BERAY</span></div>
          <button id="browserGo" class="address-go">→</button>
        </div>
        <div id="browserFrame" class="browser-frame">
          <iframe id="googleFrame" title="BERAY_US Web" src="https://www.google.com/search?igu=1" referrerpolicy="no-referrer-when-downgrade"></iframe>
          <div id="browserFallback" class="browser-fallback hidden">
            <div>
              <h3>Web içeriği doğrudan gömülemedi.</h3>
              <p>BERAY_US penceren açık kalırken bu içerik, hedef sitenin iframe güvenlik politikasına takılmış olabilir.</p>
              <div class="fallback-actions">
                <button id="retryGoogle" class="primary-button">Tekrar dene</button>
                <button id="externalGoogle" class="soft-button">Yeni pencerede aç</button>
              </div>
            </div>
          </div>
        </div>
        <div class="browser-note">Google, BERAY_US içindeki pencere alanında açılmayı desteklerse burada görüntülenir. Bazı siteler iframe kullanımını güvenlik nedeniyle engeller.</div>
      </div>
    `);
    const frame=$("#googleFrame",win), fallback=$("#browserFallback",win);
    let timer=setTimeout(()=>fallback.classList.remove("hidden"),3500);
    frame.addEventListener("load",()=>{clearTimeout(timer); fallback.classList.add("hidden");});
    $("#browserGo",win).addEventListener("click",()=>navigateBrowser(win));
    $("#addressInput",win).addEventListener("keydown",e=>{if(e.key==="Enter") navigateBrowser(win);});
    $("#browserBack",win).addEventListener("click",()=>{try{frame.contentWindow.history.back()}catch{}});
    $("#browserForward",win).addEventListener("click",()=>{try{frame.contentWindow.history.forward()}catch{}});
    $("#browserReload",win).addEventListener("click",()=>{frame.src=frame.src;});
    $("#retryGoogle",win).addEventListener("click",()=>{frame.src="https://www.google.com/search?igu=1"; fallback.classList.add("hidden");});
    $("#externalGoogle",win).addEventListener("click",()=>window.open("https://www.google.com/","_blank","noopener,noreferrer"));
  }

  function navigateBrowser(win){
    const input=$("#addressInput",win);
    let value=input.value.trim();
    if(!value) return;
    if(!/^https?:\/\//i.test(value)){
      value=`https://www.google.com/search?igu=1&q=${encodeURIComponent(value)}`;
    }
    const frame=$("#googleFrame",win);
    $("#browserFallback",win).classList.add("hidden");
    frame.src=value;
  }

  function openFiles(){
    const win=makeWindow("files",`
      <div class="dropzone">
        <strong>Dosyalar</strong>
        <div style="color:var(--muted);font-size:11px;margin-top:5px">Bilgisayardan seçtiğin dosyaları bu pencereye ekle.</div>
        <input id="filePicker" type="file" multiple>
      </div>
      <div id="filesGrid" class="files-grid">
        <div class="file-card"><div class="file-icon">▤</div><strong>BERAY_US</strong><small>Yerel çalışma alanı</small></div>
        <div class="file-card"><div class="file-icon">⚙</div><strong>Ayarlar</strong><small>Sistem tercihleri</small></div>
        <div class="file-card"><div class="file-icon">✎</div><strong>Notlar</strong><small>IndexedDB</small></div>
      </div>
    `);
    $("#filePicker",win).addEventListener("change",e=>{
      const grid=$("#filesGrid",win);
      [...e.target.files].forEach(file=>{
        const card=document.createElement("div"); card.className="file-card";
        card.innerHTML=`<div class="file-icon">◫</div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)}</small>`;
        grid.appendChild(card);
      });
      addNotification("Dosya alanı",`${e.target.files.length} dosya seçildi.`);
    });
  }

  function openNotes(){
    const win=makeWindow("notes",`
      <div class="notes-layout">
        <div class="note-list" id="noteList"></div>
        <div class="note-editor">
          <input id="noteTitle" class="note-title-input" placeholder="Not başlığı">
          <textarea id="noteText" class="note-textarea" placeholder="Notunu yaz…"></textarea>
          <div class="note-actions"><button id="newNote" class="soft-button">Yeni</button><button id="saveNote" class="primary-button">Kaydet</button><button id="deleteNote" class="soft-button">Sil</button></div>
        </div>
      </div>
    `);
    setupNotes(win);
  }

  async function setupNotes(win){
    let notes=await idbGet("notes")||[{id:"default",title:"Hoş geldin",text:"BERAY_US not alanı hazır."}];
    let active=notes[0]?.id||null;
    const list=$("#noteList",win), title=$("#noteTitle",win), text=$("#noteText",win);
    const render=()=>{
      list.innerHTML=notes.length?notes.map(n=>`<button class="note-item ${n.id===active?"active":""}" data-id="${escapeHtml(n.id)}"><strong>${escapeHtml(n.title||"İsimsiz")}</strong><small style="display:block;color:var(--muted);margin-top:3px">${escapeHtml((n.text||"").slice(0,35))}</small></button>`).join(""):'<div class="empty-state">Henüz not yok.</div>';
      $$(".note-item",list).forEach(b=>b.addEventListener("click",()=>{
        active=b.dataset.id; const n=notes.find(x=>x.id===active); title.value=n?.title||""; text.value=n?.text||""; render();
      }));
    };
    render();
    if(active){title.value=notes[0]?.title||"";text.value=notes[0]?.text||""}
    $("#newNote",win).addEventListener("click",()=>{active="new";title.value="Yeni not";text.value="";render()});
    $("#saveNote",win).addEventListener("click",async()=>{
      if(active==="new" || !notes.some(n=>n.id===active)){
        active=crypto.randomUUID(); notes.unshift({id:active,title:title.value||"İsimsiz",text:text.value});
      }else{
        const n=notes.find(x=>x.id===active); n.title=title.value;n.text=text.value;
      }
      await idbPut("notes",notes); render(); addNotification("Notlar","Not kaydedildi.");
    });
    $("#deleteNote",win).addEventListener("click",async()=>{
      if(!active) return;
      notes=notes.filter(n=>n.id!==active); active=notes[0]?.id||null;
      await idbPut("notes",notes); title.value=notes[0]?.title||""; text.value=notes[0]?.text||""; render();
    });
  }

  async function openSettings(){
    const s={...settings,...(await idbGet("settings")||{})};
    const win=makeWindow("settings",`
      <div class="settings-section">
        <div class="settings-card">
          <h3 style="margin:0">Kişiselleştirme</h3>
          <div class="settings-row"><div class="settings-label"><strong>Hareketli duvar kâğıdı</strong><span>GPU yükünü düşük tutan hafif animasyon.</span></div><button id="setMotion" class="soft-button">${s.motion?"Açık":"Kapalı"}</button></div>
          <div class="settings-row"><div class="settings-label"><strong>Vurgu rengi</strong><span>BERAY_US kullanıcı arayüzü.</span></div><select id="accentSelect" class="select"><option value="blue">Mavi</option><option value="purple">Mor</option></select></div>
          <div class="settings-row"><div class="settings-label"><strong>Ekran parlaklığı</strong><span>Arayüz katmanının görsel yoğunluğu.</span></div><input id="settingsBrightness" class="range" type="range" min="60" max="100" value="${s.brightness}"></div>
        </div>
        <div class="settings-card">
          <h3 style="margin:0">Depolama ve izinler</h3>
          <div class="settings-row"><div class="settings-label"><strong>Yerel depolama</strong><span>Notlar ve ayarlar IndexedDB/local storage üzerinde tutulur.</span></div><span class="pill">Etkin</span></div>
          <div class="settings-row"><div class="settings-label"><strong>Kalıcı depolama isteği</strong><span>Tarayıcı destekliyorsa verilerin silinme riskini azaltır.</span></div><button id="persistStorage" class="soft-button">İste</button></div>
          <div class="settings-row"><div class="settings-label"><strong>Bildirim izni</strong><span>Sistem bildirimleri için tarayıcı izni.</span></div><button id="notifyPermission" class="soft-button">İzin iste</button></div>
        </div>
        <div class="settings-card">
          <h3 style="margin:0">Kısayol</h3>
          <div style="margin-top:9px;color:var(--muted);font-size:11px;line-height:1.6">Tam ekranı kapatma: tarayıcı/işletim sistemi kısayolları güvenlik nedeniyle uygulamaya her zaman aktarılmayabilir. BERAY_US içinde ⛶ düğmesi her zaman hazırdır.</div>
        </div>
      </div>
    `);
    $("#accentSelect",win).value=s.accent;
    $("#setMotion",win).addEventListener("click",async()=>{s.motion=!s.motion;$("#setMotion",win).textContent=s.motion?"Açık":"Kapalı";await saveSettings(s);});
    $("#accentSelect",win).addEventListener("change",async e=>{s.accent=e.target.value;await saveSettings(s);});
    $("#settingsBrightness",win).addEventListener("input",async e=>{s.brightness=Number(e.target.value);applyBrightness(s.brightness);await saveSettings(s);});
    $("#persistStorage",win).addEventListener("click",requestPersistent);
    $("#notifyPermission",win).addEventListener("click",requestNotifications);
    async function saveSettings(partial){settings={...settings,...partial};await idbPut("settings",settings);applySettings();}
  }

  async function requestPersistent(){
    if(navigator.storage?.persist){
      const ok=await navigator.storage.persist();
      toast(ok?"Kalıcı depolama isteği kabul edildi.":"Tarayıcı kalıcı depolama izni vermedi.");
    }else toast("Bu tarayıcı API'yi sunmuyor.");
  }
  async function requestNotifications(){
    if(!("Notification" in window)){toast("Bildirim API'si yok.");return}
    const p=await Notification.requestPermission();
    toast(p==="granted"?"Bildirim izni verildi.":`Bildirim izni: ${p}`);
  }

  function openSystem(){
    const entries=[
      ["21:46","UI","Çalışma alanı başlatıldı"],
      ["21:47","STORE","Yerel uygulama kayıtları yüklendi"],
      ["21:47","WEB","Web çalışma alanı hazır"],
      ["21:48","CORE","IndexedDB bağlantısı hazır"]
    ];
    const win=makeWindow("system",`
      <div class="metrics">
        <div class="metric"><small>Çalışma alanı</small><strong>1</strong></div>
        <div class="metric"><small>Pencereler</small><strong>${windows.size}</strong></div>
        <div class="metric"><small>Depolama</small><strong>Yerel</strong></div>
        <div class="metric"><small>Durum</small><strong style="color:var(--good)">Hazır</strong></div>
      </div>
      <div class="settings-card" style="margin-top:12px">
        <h3 style="margin:0">BERAY_US sistem günlüğü</h3>
        <div class="system-log">${entries.map(e=>`<div class="log-row"><span>${e[0]}</span><span>${e[1]}</span><div>${e[2]}</div></div>`).join("")}</div>
      </div>
      <div class="settings-card" style="margin-top:12px">
        <h3 style="margin:0">Çalışma modeli</h3>
        <p style="font-size:12px;color:var(--muted);line-height:1.6">Bu sürüm, Chrome/Edge üzerinde kurulan PWA'nın içinde bir masaüstü ve pencere yöneticisi sağlar. Gerçek cihaz sürücülerine sahip bağımsız kernel yerine tarayıcının güvenli çalışma alanını kullanır.</p>
      </div>
    `);
    setTimeout(()=>{const m=$(".metric:nth-child(2) strong",win);if(m)m.textContent=String(windows.size)},0);
  }

  function openStore(){
    makeWindow("store",`
      <div>
        <div class="hero-kicker">BERAY_US STORE</div>
        <h2 style="margin:6px 0 4px">Uygulamalar</h2>
        <div style="font-size:12px;color:var(--muted)">Sistemin uygulama katmanı için hazır yüzey.</div>
      </div>
      <div class="store-grid" style="margin-top:16px">
        ${[
          ["◎","Web","Dahili web çalışma alanı","Yüklü","browser"],
          ["▣","Dosyalar","Dosya alanı","Yüklü","files"],
          ["✎","Notlar","Yerel not uygulaması","Yüklü","notes"],
          ["⚙","Ayarlar","Kişiselleştirme ve izinler","Yüklü","settings"],
          ["◫","Sistem","Durum ve günlükler","Yüklü","system"],
          ["✦","Store","Uygulama merkezi","Yüklü","store"]
        ].map(x=>`<article class="store-card"><div class="store-icon">${x[0]}</div><div><strong>${x[1]}</strong><small>${x[2]}</small></div><button class="soft-button store-open" data-app="${x[4]}">${x[3]}</button></article>`).join("")}
      </div>
    `);
    setTimeout(()=>$$(".store-open").forEach(b=>b.addEventListener("click",()=>openApp(b.dataset.app))),0);
  }

  function formatBytes(bytes){
    if(!bytes)return"0 B"; const units=["B","KB","MB","GB"]; const i=Math.min(Math.floor(Math.log(bytes)/Math.log(1024)),3); return `${(bytes/Math.pow(1024,i)).toFixed(i?1:0)} ${units[i]}`;
  }

  function applyBrightness(v){
    document.documentElement.style.setProperty("--system-brightness",v/100);
    $("#desktop").style.filter=`brightness(${v/100})`;
  }
  function applySettings(){
    $("#system").classList.toggle("reduced-motion",!settings.motion);
    document.documentElement.style.setProperty("--accent",settings.accent==="purple"?"#aa90ff":"#8da9ff");
    document.documentElement.style.setProperty("--accent-2",settings.accent==="purple"?"#7d64e7":"#7e66ee");
    applyBrightness(settings.brightness);
  }

  async function setupInstallation(){
    window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installPrompt").classList.remove("hidden");});
    $("#installBtn").addEventListener("click",async()=>{
      if(!deferredPrompt){toast("Chrome/Edge menüsünde BERAY_US için yükleme seçeneğini kullanabilirsin.");return}
      deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$("#installPrompt").classList.add("hidden");
    });
    $("#installDismiss").addEventListener("click",()=>$("#installPrompt").classList.add("hidden"));
    window.addEventListener("appinstalled",()=>{addNotification("BERAY_US","Uygulama bilgisayara kuruldu.");$("#installPrompt").classList.add("hidden");});
  }

  async function toggleFullscreen(){
    try{
      if(!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    }catch{toast("Tarayıcı tam ekran geçişini engelledi.");}
  }

  function setupEvents(){
    ["#brandButton","#taskStart"].forEach(s=>$(s).addEventListener("click",()=>showPanel("startMenu")));
    $("#closeStart").addEventListener("click",hidePanels);
    $("#quickButton").addEventListener("click",()=>showPanel("quickPanel"));
    $("#closeQuick").addEventListener("click",hidePanels);
    $("#notifyButton").addEventListener("click",()=>{showPanel("notifyPanel");$("#notificationDot").classList.add("hidden")});
    $("#clearNotifications").addEventListener("click",()=>{notifications=[];renderNotifications();$("#notificationDot").classList.add("hidden")});
    $("#fullscreenToggle").addEventListener("click",toggleFullscreen);
    $("#taskFullscreen").addEventListener("click",toggleFullscreen);
    $("#motionToggle").addEventListener("click",async()=>{settings.motion=!settings.motion;$("#motionToggle").classList.toggle("active",settings.motion);await idbPut("settings",settings);applySettings()});
    $("#focusToggle").addEventListener("click",async()=>{settings.focus=!settings.focus;$("#focusToggle").classList.toggle("active",settings.focus);await idbPut("settings",settings);toast(settings.focus?"Odak modu açık.":"Odak modu kapalı.")});
    $("#wifiToggle").addEventListener("click",()=>toast(navigator.onLine?"Ağ bağlantısı mevcut.":"Çevrimdışı görünüyorsun."));
    $("#brightnessRange").addEventListener("input",e=>applyBrightness(Number(e.target.value)));
    $("#sleepButton").addEventListener("click",()=>{hidePanels();toast("BERAY_US uyku arayüzü hazır. Sistem durdurulmadı.")});

    $$("[data-app]").forEach(b=>b.addEventListener("click",()=>openApp(b.dataset.app)));
    $("#launcherSearch").addEventListener("input",e=>{
      const q=e.target.value.toLowerCase();
      $$(".launcher-card").forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?"flex":"none");
    });
    document.addEventListener("click",e=>{
      if(!e.target.closest(".panel")&&!e.target.closest("#brandButton")&&!e.target.closest("#taskStart")&&!e.target.closest("#quickButton")&&!e.target.closest("#notifyButton"))hidePanels();
    });
    window.addEventListener("online",()=>{ $("#networkButton").innerHTML="◉ <span>Çevrimiçi</span>"; addNotification("Ağ","Bağlantı yeniden kuruldu.");});
    window.addEventListener("offline",()=>{ $("#networkButton").innerHTML="○ <span>Çevrimdışı</span>"; addNotification("Ağ","İnternet bağlantısı yok.");});
    document.addEventListener("keydown",async e=>{
      if(e.key==="Escape" && document.fullscreenElement){try{await document.exitFullscreen()}catch{}}
    });
  }

  function setupClock(){
    const tick=()=>{const d=new Date(); const t=d.toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"}); $("#topClock").textContent=t;$("#taskClock").textContent=t;};
    tick();setInterval(tick,1000);
  }

  async function boot(){
    settings={...settings,...(await idbGet("settings")||{})};
    notifications=JSON.parse(localStorage.getItem("beray-notify")||"[]");
    renderNotifications();applySettings();setupClock();setupEvents();await setupInstallation();
    if("serviceWorker" in navigator){try{await navigator.serviceWorker.register("./sw.js")}catch{}}
    setTimeout(()=>{$("#boot").classList.add("hidden");$("#system").classList.remove("hidden");addNotification("BERAY_US","Çalışma alanın hazır.");},1000);
  }

  boot();
})();
