// Script iniettato nelle pagine di instagram.com per recuperare i token di sessione dell'utente connesso
(function() {
  // Ascolta i messaggi inviati dall'estensione (popup)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "GET_INSTAGRAM_CONTEXT") {
      try {
        const cookies = parseCookies();
        const dsUserId = cookies["ds_user_id"] || null;
        const csrfToken = cookies["csrftoken"] || "";

        // Prova a recuperare lo username dall'interfaccia o dallo stato di Instagram
        let username = "";
        
        // Tentativo 1: meta tag o script nel DOM di Instagram
        const sharedDataScript = document.querySelectorAll('script');
        for (let script of sharedDataScript) {
          if (script.textContent.includes('"username":"')) {
            const match = script.textContent.match(/"username":"([^"]+)"/);
            if (match && match[1]) {
              username = match[1];
              break;
            }
          }
        }

        // Tentativo 2: dall'immagine o link di profilo nel DOM
        if (!username) {
          const profileLink = document.querySelector('a[href^="/"][role="link"] img[alt*="profilo"]');
          if (profileLink && profileLink.closest('a')) {
            const href = profileLink.closest('a').getAttribute('href');
            username = href.replace(/\//g, '');
          }
        }

        sendResponse({
          success: true,
          userId: dsUserId,
          csrfToken: csrfToken,
          username: username,
          appId: "936619743392459" // App ID standard di Instagram Web
        });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
      return true; // mantiene aperto il canale asincrono
    }
  });

  function parseCookies() {
    const list = {};
    const rc = document.cookie;
    if (rc) {
      rc.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
      });
    }
    return list;
  }
})();
