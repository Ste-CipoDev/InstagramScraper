# Instagram Follower & Unfollower Tracker (Estensione Chrome)

Un'estensione Chrome Manifest V3 sviluppata per trovare rapidamente:
* 🔴 **Chi non ti segue a sua volta** (Unfollowers)
* 🔵 **Chi non segui tu a tua volta**
* 🟢 **I tuoi follower reciproci**
* 👥 La lista completa di seguiti e follower

---

## 🚀 Come installare l'estensione su Chrome (in 10 secondi)

1. Apri **Google Chrome** (o Edge / Brave).
2. Nella barra degli indirizzi digita: `chrome://extensions` e premi Invio.
3. In alto a destra, attiva lo switch **"Modalità sviluppatore"** (Developer mode).
4. In alto a sinistra, clicca sul pulsante **"Carica estensione non pacchettizzata"** (Load unpacked).
5. Seleziona la cartella: `C:\temp\Instagram Scraper` e premi **Seleziona cartella**.
6. L'estensione comparià nella lista e potrai fissarla sulla barra degli strumenti di Chrome cliccando sull'icona a forma di tassello del puzzle 🧩!

---

## 📖 Come utilizzare l'estensione

1. Apri una scheda su **[instagram.com](https://www.instagram.com)** ed effettua l'accesso col tuo account.
2. Clicca sull'icona dell'estensione **Instagram Unfollower Tracker** nella barra in alto a destra.
3. *(Consigliato per account grandi)*: Clicca sull'icona **Apri in scheda intera** in alto a destra per evitare che la chiusura accidentale del popup interrompa le pause di raffreddamento.
4. Regola lo slider dell'**attesa anti-ban** (consigliato: **3.0s - 4.5s**).
5. Clicca su **"Avvia Scansione"**.
6. Durante l'analisi, l'estensione applicherà automaticamente un **jitter casuale continuo** e **pause di raffreddamento a lotti** (10-15s ogni 300-400 utenti).
7. Esplora i risultati filtrati o usa la barra di ricerca per trovare utenti specifici.
8. Puoi aprire i singoli profili su Instagram per smettere di seguirli in piena sicurezza o scaricare il file **CSV / JSON**.

---

## 🔒 Sicurezza e Protezione Anti-Ban

* **Nessun invio a server esterni**: Tutti i dati vengono elaborati direttamente nel tuo browser e salvati esclusivamente nella memoria locale di Chrome (`chrome.storage.local`).
* **Protezione Anti-Ban Avanzata**:
  * **Jitter Casuale (-20% / +40%)**: I ritardi variano costantemente ad ogni chiamata per rompere qualsiasi pattern robotico deterministico.
  * **Batch Cooldown**: Pause di riposo periodiche a intervalli casuali per simulare un comportamento di navigazione umano.
  * **Resilienza 429**: In caso di temporaneo rate limit, l'estensione entra in cooldown con conto alla rovescia e salva i dati parziali raccolti prima di fermarsi.
  * **Rilevamento Checkpoint**: Intercettazione immediata di eventuali captcha o verifiche SMS per evitare sanzioni all'account.
  * **Unfollow Sicuro**: Le azioni verso Instagram aprono la scheda ufficiale del profilo per consentire l'unfollow legittimo, eliminando le chiamate API non autorizzate che causano gli *Action Block*.
