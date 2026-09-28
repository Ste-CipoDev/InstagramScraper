// Classi di errore dedicate per la gestione anti-ban
class RateLimitError extends Error {
  constructor(message, partialList = []) {
    super(message);
    this.name = "RateLimitError";
    this.partialList = partialList;
  }
}

class CheckpointError extends Error {
  constructor(message, errData = null) {
    super(message);
    this.name = "CheckpointError";
    this.errData = errData;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Elementi DOM
  const delaySlider = document.getElementById("delaySlider");
  const delayValue = document.getElementById("delayValue");
  const btnStart = document.getElementById("btnStart");
  const btnPause = document.getElementById("btnPause");
  const btnReset = document.getElementById("btnReset");
  const btnOpenIG = document.getElementById("btnOpenIG");
  const btnOpenFullTab = document.getElementById("btnOpenFullTab");

  const checkpointAlert = document.getElementById("checkpointAlert");
  const checkpointMsg = document.getElementById("checkpointMsg");
  const btnSolveCheckpoint = document.getElementById("btnSolveCheckpoint");
  
  const userBadge = document.getElementById("userBadge");
  const userStatusText = document.getElementById("userStatusText");
  const noTabWarning = document.getElementById("noTabWarning");

  const progressSection = document.getElementById("progressSection");
  const progressStatus = document.getElementById("progressStatus");
  const progressPercent = document.getElementById("progressPercent");
  const progressBarFill = document.getElementById("progressBarFill");
  const liveFollowingCount = document.getElementById("liveFollowingCount");
  const liveFollowersCount = document.getElementById("liveFollowersCount");

  const resultsSection = document.getElementById("resultsSection");
  const tabButtons = document.querySelectorAll(".tab-btn");
  const searchInput = document.getElementById("searchInput");
  const usersList = document.getElementById("usersList");

  const btnCopyUsernames = document.getElementById("btnCopyUsernames");
  const btnExportCSV = document.getElementById("btnExportCSV");
  const btnExportJSON = document.getElementById("btnExportJSON");

  // Badges dei tab
  const badgeNotFollowingBack = document.getElementById("badgeNotFollowingBack");
  const badgeNotFollowedBack = document.getElementById("badgeNotFollowedBack");
  const badgeMutual = document.getElementById("badgeMutual");
  const badgeAllFollowing = document.getElementById("badgeAllFollowing");
  const badgeAllFollowers = document.getElementById("badgeAllFollowers");

  // Stato dell'applicazione
  let context = null;
  let isScanning = false;
  let isPaused = false;
  let currentTabFilter = "not_following_back";
  
  let following = [];
  let followers = [];
  let notFollowingBack = [];
  let notFollowedBack = [];
  let mutual = [];

  // Funzioni di utilità Anti-Ban
  function calculateJitterDelay(baseSeconds) {
    // Variazione casuale continua tra -20% e +40%
    const factor = 1 + (Math.random() * 0.60 - 0.20);
    const jitteredMs = Math.round(baseSeconds * 1000 * factor);
    // Garanzia di sicurezza: mai meno di 2000ms
    return Math.max(2000, jitteredMs);
  }

  async function countdownSleep(totalSeconds, messagePrefix) {
    for (let s = totalSeconds; s > 0; s--) {
      if (!isScanning) return;
      while (isPaused) {
        await sleep(500);
      }
      progressStatus.textContent = `${messagePrefix} (${s}s)...`;
      await sleep(1000);
    }
  }

  function triggerCheckpointAlert(errData) {
    if (checkpointAlert) {
      checkpointAlert.classList.remove("hidden");
      if (errData && errData.checkpoint_url && btnSolveCheckpoint) {
        btnSolveCheckpoint.href = errData.checkpoint_url;
      }
      if (errData && (errData.feedback_message || errData.message)) {
        checkpointMsg.textContent = `Instagram ha interrotto la richiesta: ${errData.feedback_message || errData.message}. È necessaria una verifica manuale.`;
      }
    }
  }

  // 1. Inizializzazione Slider Ritardo
  delaySlider.addEventListener("input", () => {
    delayValue.textContent = `${parseFloat(delaySlider.value).toFixed(1)}s`;
  });

  // 2. Carica i dati salvati in precedenza da storage local
  await loadSavedData();

  // 3. Controlla la connessione ad Instagram
  await checkInstagramConnection();

  // Button Listeners
  if (btnOpenFullTab) {
    btnOpenFullTab.addEventListener("click", () => {
      chrome.tabs.create({ url: chrome.runtime.getURL("popup.html") });
    });
  }

  btnOpenIG.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://www.instagram.com/" });
  });

  btnStart.addEventListener("click", () => {
    if (isScanning) return;
    startScanning();
  });

  btnPause.addEventListener("click", () => {
    isPaused = !isPaused;
    btnPause.textContent = isPaused ? "▶️ Riprendi" : "⏸️ Pausa";
    progressStatus.textContent = isPaused ? "Pausa inserita dall'utente." : "Ripresa analisi...";
  });

  btnReset.addEventListener("click", async () => {
    if (confirm("Vuoi cancellare i dati dell'ultima scansione?")) {
      isScanning = false;
      isPaused = false;
      following = [];
      followers = [];
      notFollowingBack = [];
      notFollowedBack = [];
      mutual = [];
      await chrome.storage.local.clear();
      updateUI();
      progressSection.classList.add("hidden");
      resultsSection.classList.add("hidden");
      btnStart.classList.remove("hidden");
      btnPause.classList.add("hidden");
    }
  });

  // Listener per le Schede di Filtro
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentTabFilter = btn.dataset.tab;
      renderUsersList();
    });
  });

  // Listener della Barra di Ricerca
  searchInput.addEventListener("input", () => {
    renderUsersList();
  });

  // Export Handlers
  btnCopyUsernames.addEventListener("click", () => {
    const list = getActiveList();
    if (!list.length) return alert("Nessun utente da copiare.");
    const usernames = list.map(u => u.username).join("\n");
    navigator.clipboard.writeText(usernames);
    alert(`Copiati ${list.length} username negli appunti!`);
  });

  btnExportCSV.addEventListener("click", () => {
    const list = getActiveList();
    if (!list.length) return alert("Nessun utente da esportare.");
    
    const headers = ["ID", "Username", "Nome Completo", "Link Profilo"].join(";");
    const rows = list.map(u => {
      const name = (u.fullName || "").replace(/"/g, '""');
      return `"${u.id}";"${u.username}";"${name}";"https://instagram.com/${u.username}"`;
    });

    const csvContent = "\uFEFF" + [headers, ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `instagram_${currentTabFilter}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });

  btnExportJSON.addEventListener("click", () => {
    const list = getActiveList();
    if (!list.length) return alert("Nessun utente da esportare.");
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `instagram_${currentTabFilter}_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // --- Funzioni di Logica ---

  async function checkInstagramConnection() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.url || !tab.url.includes("instagram.com")) {
        // Cerca qualsiasi altra scheda aperta su instagram
        const allIgTabs = await chrome.tabs.query({ url: "*://*.instagram.com/*" });
        if (allIgTabs.length === 0) {
          showDisconnectedState("Nessuna scheda Instagram trovata.");
          return;
        }
      }

      // Invia messaggio al content.js
      const activeTabId = tab && tab.url.includes("instagram.com") ? tab.id : (await chrome.tabs.query({ url: "*://*.instagram.com/*" }))[0].id;
      
      chrome.tabs.sendMessage(activeTabId, { action: "GET_INSTAGRAM_CONTEXT" }, (response) => {
        if (chrome.runtime.lastError || !response || !response.success || !response.userId) {
          showDisconnectedState("Effettua il login su Instagram.");
          return;
        }

        context = response;
        userBadge.classList.remove("disconnected");
        userBadge.classList.add("connected");
        userStatusText.textContent = context.username ? `@${context.username}` : `ID: ${context.userId}`;
        noTabWarning.classList.add("hidden");
        btnStart.disabled = false;
      });
    } catch (err) {
      showDisconnectedState("Errore nella lettura sessione.");
    }
  }

  function showDisconnectedState(msg) {
    userBadge.classList.remove("connected");
    userBadge.classList.add("disconnected");
    userStatusText.textContent = msg;
    noTabWarning.classList.remove("hidden");
    btnStart.disabled = true;
  }

  async function startScanning() {
    if (!context || !context.userId) {
      alert("Connettiti ad Instagram prima di iniziare la scansione.");
      return;
    }

    if (checkpointAlert) checkpointAlert.classList.add("hidden");

    isScanning = true;
    isPaused = false;
    btnStart.classList.add("hidden");
    btnPause.classList.remove("hidden");
    progressSection.classList.remove("hidden");
    resultsSection.classList.remove("hidden");

    following = [];
    followers = [];
    
    progressStatus.textContent = "Fase 1: Scaricamento della lista dei Seguiti...";
    progressPercent.textContent = "0%";
    progressBarFill.style.width = "0%";

    try {
      // 1. Fetch Following
      following = await fetchUserRelationList("following");
      liveFollowingCount.textContent = following.length;

      if (!isScanning) return; // Se interrotto

      // 2. Fetch Followers
      progressStatus.textContent = "Fase 2: Scaricamento della lista dei Follower...";
      followers = await fetchUserRelationList("followers");
      liveFollowersCount.textContent = followers.length;

      // 3. Elaborazione Insiemi
      progressStatus.textContent = "Fase 3: Elaborazione dei risultati...";
      progressBarFill.style.width = "100%";
      progressPercent.textContent = "100%";

      computeRelations();

      // Salva nello storage
      await chrome.storage.local.set({
        following,
        followers,
        notFollowingBack,
        notFollowedBack,
        mutual,
        lastScanDate: new Date().toLocaleDateString("it-IT")
      });

      progressStatus.textContent = "✅ Scansione completata con successo!";
      btnPause.classList.add("hidden");
      btnStart.classList.remove("hidden");
      btnStart.textContent = "Ricomincia Scansione";
      isScanning = false;
    } catch (err) {
      if (err instanceof CheckpointError) {
        progressStatus.textContent = "🛑 Blocco sicurezza rilevato. Completa la verifica su Instagram.";
      } else if (err instanceof RateLimitError) {
        progressStatus.textContent = "⚠️ Rate limit (429) persistente. Dati parziali salvati.";
        computeRelations();
        await chrome.storage.local.set({
          following,
          followers,
          notFollowingBack,
          notFollowedBack,
          mutual,
          lastScanDate: new Date().toLocaleDateString("it-IT") + " (Parziale)"
        });
        resultsSection.classList.remove("hidden");
      } else {
        alert("Errore durante la scansione: " + err.message);
        progressStatus.textContent = "⚠️ Errore: " + err.message;
      }
      btnPause.classList.add("hidden");
      btnStart.classList.remove("hidden");
      isScanning = false;
    }
  }

  async function fetchUserRelationList(type) {
    let list = [];
    let hasNextPage = true;
    let maxId = "";
    let pageIndex = 0;
    // Intervallo casuale di pagine prima della pausa di raffreddamento (tra 6 e 8)
    let pagesUntilCooldown = Math.floor(Math.random() * 3) + 6;

    while (hasNextPage && isScanning) {
      // Gestione Pausa manuale
      while (isPaused) {
        await sleep(500);
      }

      // Batch Cooldown automatico ogni 6-8 pagine
      if (pageIndex > 0 && pageIndex % pagesUntilCooldown === 0) {
        const cooldownSeconds = Math.floor(Math.random() * 6) + 10; // 10-15s
        await countdownSleep(cooldownSeconds, "☕ Pausa di raffreddamento anti-ban");
        if (!isScanning) break;
        // Ricalcola il prossimo intervallo casuale
        pagesUntilCooldown = Math.floor(Math.random() * 3) + 6;
        pageIndex = 0;
      }

      const url = `https://www.instagram.com/api/v1/friendships/${context.userId}/${type}/?count=50${maxId ? `&max_id=${maxId}` : ""}`;
      
      let res;
      let retriesLeft = 1; // 1 retry consentito su 429

      while (retriesLeft >= 0) {
        try {
          res = await fetch(url, {
            headers: {
              "X-IG-App-ID": context.appId || "936619743392459",
              "X-CSRFToken": context.csrfToken || "",
              "X-Requested-With": "XMLHttpRequest"
            },
            credentials: "include"
          });
        } catch (networkErr) {
          throw new Error(`Errore di rete: ${networkErr.message}`);
        }

        if (res.status === 429) {
          if (retriesLeft > 0) {
            retriesLeft--;
            await countdownSleep(60, "⏳ Troppe richieste (HTTP 429)! Cooldown di sicurezza");
            if (!isScanning) break;
            continue; // Riprova la richiesta
          } else {
            throw new RateLimitError("Rate limit (HTTP 429) persistente anche dopo il cooldown.", list);
          }
        }
        break; // Uscita dal loop se lo status non è 429
      }

      if (!isScanning) break;

      // Controllo Checkpoint / Challenge / Errori
      if (!res.ok) {
        let errData = null;
        try {
          errData = await res.json();
        } catch (_) {}

        if (errData && (
          errData.message === "checkpoint_required" ||
          errData.checkpoint_url ||
          errData.message === "challenge_required" ||
          errData.message === "feedback_required" ||
          errData.lock === true
        )) {
          triggerCheckpointAlert(errData);
          throw new CheckpointError("Verifica di sicurezza Instagram richiesta (Checkpoint).", errData);
        }

        throw new Error(`Risposta server HTTP ${res.status}`);
      }

      const data = await res.json();
      
      if (data.users && Array.isArray(data.users)) {
        data.users.forEach(u => {
          list.push({
            id: u.pk || u.id,
            username: u.username,
            fullName: u.full_name || "",
            profilePicUrl: u.profile_pic_url || "",
            isVerified: u.is_verified || false
          });
        });
      }

      pageIndex++;

      if (type === "following") {
        liveFollowingCount.textContent = list.length;
      } else {
        liveFollowersCount.textContent = list.length;
      }

      if (data.next_max_id) {
        maxId = data.next_max_id;
      } else {
        hasNextPage = false;
      }

      // Attesa anti-ban con Jitter casuale continuo (-20% / +40%)
      if (hasNextPage && isScanning) {
        const baseSec = parseFloat(delaySlider.value);
        const delayMs = calculateJitterDelay(baseSec);
        await sleep(delayMs);
      }
    }

    return list;
  }

  function computeRelations() {
    const followersMap = new Map(followers.map(u => [u.id.toString(), u]));
    const followingMap = new Map(following.map(u => [u.id.toString(), u]));

    // Chi non ti segue a sua volta
    notFollowingBack = following.filter(u => !followersMap.has(u.id.toString()));
    
    // Chi non segui tu
    notFollowedBack = followers.filter(u => !followingMap.has(u.id.toString()));

    // Reciproci
    mutual = following.filter(u => followersMap.has(u.id.toString()));

    updateUI();
  }

  function updateUI() {
    badgeNotFollowingBack.textContent = notFollowingBack.length;
    badgeNotFollowedBack.textContent = notFollowedBack.length;
    badgeMutual.textContent = mutual.length;
    badgeAllFollowing.textContent = following.length;
    badgeAllFollowers.textContent = followers.length;

    renderUsersList();
  }

  function getActiveList() {
    switch (currentTabFilter) {
      case "not_following_back": return notFollowingBack;
      case "not_followed_back": return notFollowedBack;
      case "mutual": return mutual;
      case "all_following": return following;
      case "all_followers": return followers;
      default: return notFollowingBack;
    }
  }

  function renderUsersList() {
    const list = getActiveList();
    const query = searchInput.value.toLowerCase().trim();

    const filtered = list.filter(u => 
      u.username.toLowerCase().includes(query) || 
      (u.fullName && u.fullName.toLowerCase().includes(query))
    );

    usersList.innerHTML = "";

    if (!filtered.length) {
      usersList.innerHTML = `
        <div class="empty-state">
          <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M16 16s-1.5-2-4-2-4 2-4 2M9 9h.01M15 9h.01"></path>
          </svg>
          <p>Nessun utente trovato.</p>
        </div>
      `;
      return;
    }

    filtered.forEach(u => {
      const card = document.createElement("div");
      card.className = "user-card";

      const avatarHtml = u.profilePicUrl ? 
        `<img src="${u.profilePicUrl}" class="avatar-img" alt="${u.username}">` :
        `<div class="avatar-placeholder">${u.username.charAt(0).toUpperCase()}</div>`;

      let badgeHtml = "";
      if (currentTabFilter === "not_following_back") {
        badgeHtml = `<a href="https://www.instagram.com/${u.username}/" target="_blank" class="btn-profile-link" title="Apri il profilo su Instagram per smettere di seguire in sicurezza">Apri profilo ↗</a>`;
      } else if (currentTabFilter === "not_followed_back") {
        badgeHtml = `<a href="https://www.instagram.com/${u.username}/" target="_blank" class="btn-profile-link" title="Apri il profilo su Instagram per seguire in sicurezza">Apri profilo ↗</a>`;
      } else if (currentTabFilter === "mutual") {
        badgeHtml = `<span class="badge-tag mutual">Reciproco</span>`;
      }

      card.innerHTML = `
        <div class="user-info-left">
          ${avatarHtml}
          <div class="user-details">
            <div class="username-row">
              <a href="https://www.instagram.com/${u.username}/" target="_blank" class="username-text">@${u.username}</a>
              ${u.isVerified ? '🔹' : ''}
              ${badgeHtml}
            </div>
            <span class="fullname-text">${escapeHtml(u.fullName || "")}</span>
          </div>
        </div>
        <a href="https://www.instagram.com/${u.username}/" target="_blank" class="link-icon" title="Apri su Instagram">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      `;

      usersList.appendChild(card);
    });
  }

  // Gestione dell'errore di caricamento delle foto profilo (senza inline handler per CSP)
  usersList.addEventListener("error", (e) => {
    if (e.target && e.target.tagName === "IMG") {
      const username = e.target.alt || "U";
      const placeholder = document.createElement("div");
      placeholder.className = "avatar-placeholder";
      placeholder.textContent = username.charAt(0).toUpperCase();
      if (e.target.parentNode) {
        e.target.parentNode.replaceChild(placeholder, e.target);
      }
    }
  }, true);

  // Nota Anti-Ban: I bottoni di azione nelle card ora aprono in sicurezza il profilo Instagram
  // sul sito web ufficiale (target="_blank"), azzerando il rischio di Action Block da chiamate API non autorizzate.

  async function loadSavedData() {
    const data = await chrome.storage.local.get([
      "following", "followers", "notFollowingBack", "notFollowedBack", "mutual", "lastScanDate"
    ]);

    if (data.following && data.followers) {
      following = data.following || [];
      followers = data.followers || [];
      notFollowingBack = data.notFollowingBack || [];
      notFollowedBack = data.notFollowedBack || [];
      mutual = data.mutual || [];

      resultsSection.classList.remove("hidden");
      updateUI();
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
});
