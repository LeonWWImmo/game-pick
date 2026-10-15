/**
 * Game Pick – Empfänger für Votes & Ideen.
 * In ein Google Sheet einfügen: Erweiterungen → Apps Script → hier reinkopieren.
 * Danach: Bereitstellen → Neue Bereitstellung → Web-App
 *   Ausführen als: Ich   |   Zugriff: Jeder
 * Admin-Passwort: Projekteinstellungen → Skripteigenschaften → ADMIN_PW
 * (steht absichtlich nicht im Code, weil das Repo öffentlich ist)
 *
 * Erstellt automatisch 3 Tabs:
 *   Stimmen    – eine Zeile pro Person & Game (Person = selbst gewählte Zahl)
 *   Auswertung – Live-Ranking aller Stimmen
 *   Ideen      – Game-Vorschläge (werden auf der Seite angezeigt)
 */

// Ideen-Liste für die Seite
function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  setup_(ss);
  return json_({ ok: true, ideas: listIdeas_(ss) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setup_(ss);

    if (data.type === "vote" && Array.isArray(data.votes)) {
      const voter = String(data.voter == null ? "" : data.voter).replace(/\D/g, "").slice(0, 40);
      if (!voter) return json_({ ok: false, error: "voter" });
      const sh = ss.getSheetByName("Stimmen");
      // gleiche Zahl sendet nochmal → alte Zeilen ersetzen
      const rows = sh.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][1]) === voter) sh.deleteRow(i + 1);
      }
      const now = new Date();
      const out = data.votes.slice(0, 50).map(v => [
        now, "'" + voter, clean_(v.game, 60),   // ' = als Text speichern (sonst wird aus 0042 → 42)
        v.vote === 1 ? 1 : 0, v.vote === -1 ? 1 : 0,
        Math.max(0, Math.min(99, parseInt(v.rank, 10) || 0)),
      ]);
      if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, 6).setValues(out);
      return json_({ ok: true });
    }

    if (data.type === "idea") {
      const name = clean_(String(data.idea || "").trim(), 60);
      const ideas = listIdeas_(ss);
      if (name && !ideas.some(i => i.name.toLowerCase() === name.toLowerCase())) {
        ss.getSheetByName("Ideen").appendRow([new Date(), name, newId_()]);
      }
      return json_({ ok: true, ideas: listIdeas_(ss) });
    }

    if (data.type === "admin") {
      return json_({ ok: checkPw_(data.pw) });
    }

    if (data.type === "deleteIdea") {
      if (!checkPw_(data.pw)) return json_({ ok: false, error: "pw" });
      const sh = ss.getSheetByName("Ideen");
      const rows = sh.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (String(rows[i][2]) === String(data.id)) sh.deleteRow(i + 1);
      }
      return json_({ ok: true, ideas: listIdeas_(ss) });
    }

    return json_({ ok: false, error: "type" });
  } finally {
    lock.releaseLock();
  }
}

// Brute-Force-Bremse: max. 20 Fehlversuche pro Stunde
function checkPw_(pw) {
  const real = PropertiesService.getScriptProperties().getProperty("ADMIN_PW");
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get("fails") || 0);
  if (!real || fails >= 20) return false;
  const ok = String(pw) === real;
  if (!ok) cache.put("fails", String(fails + 1), 3600);
  return ok;
}

function listIdeas_(ss) {
  const sh = ss.getSheetByName("Ideen");
  if (sh.getLastRow() < 2) return [];
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, 3);
  const rows = range.getValues();
  let changed = false;
  rows.forEach(r => { if (!r[2] && r[1]) { r[2] = newId_(); changed = true; } }); // direkt im Sheet ergänzte Ideen
  if (changed) range.setValues(rows);
  return rows.filter(r => r[1]).map(r => ({ id: String(r[2]), name: String(r[1]) }));
}

function newId_() {
  return Utilities.getUuid().slice(0, 8);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Text kürzen + Formel-Injection verhindern (=, +, -, @ am Anfang würde Sheets als Formel ausführen)
function clean_(s, max) {
  s = String(s == null ? "" : s).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function setup_(ss) {
  if (!ss.getSheetByName("Stimmen")) {
    const sh = ss.insertSheet("Stimmen");
    sh.appendRow(["Zeit", "Person (Zahl)", "Game", "Daumen hoch", "Daumen runter", "Rang"]);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName("Ideen")) {
    const sh = ss.insertSheet("Ideen");
    sh.appendRow(["Zeit", "Idee", "ID"]);
    sh.setFrozenRows(1);
  }
  const ideen = ss.getSheetByName("Ideen");
  if (!ideen.getRange("C1").getValue()) ideen.getRange("C1").setValue("ID");
  if (!ss.getSheetByName("Auswertung")) {
    const sh = ss.insertSheet("Auswertung", 0);
    sh.getRange("A1").setFormula(
      "=QUERY(Stimmen!A:F, \"select C, sum(D), sum(E), avg(F), count(C) where C is not null group by C order by avg(F) asc " +
      "label C 'Game', sum(D) '👍', sum(E) '👎', avg(F) 'Ø Rang', count(C) 'Stimmen'\", 1)"
    );
    sh.setFrozenRows(1);
  }
}
