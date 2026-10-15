/**
 * Game Pick – Empfänger für Votes & Ideen.
 * In ein Google Sheet einfügen: Erweiterungen → Apps Script → hier reinkopieren.
 * Danach: Bereitstellen → Neue Bereitstellung → Web-App
 *   Ausführen als: Ich   |   Zugriff: Jeder
 *
 * Erstellt automatisch 3 Tabs:
 *   Stimmen    – eine Zeile pro Person & Game (anonyme Zufalls-ID)
 *   Auswertung – Live-Ranking aller Stimmen
 *   Ideen      – Game-Vorschläge
 */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    setup_(ss);

    if (data.type === "vote" && Array.isArray(data.votes)) {
      const sh = ss.getSheetByName("Stimmen");
      const voter = clean_(data.voter, 20);
      // gleiche Person sendet nochmal → alte Zeilen ersetzen
      const rows = sh.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        if (rows[i][1] === voter) sh.deleteRow(i + 1);
      }
      const now = new Date();
      const out = data.votes.slice(0, 50).map(v => [
        now, voter, clean_(v.game, 60),
        v.vote === 1 ? 1 : 0, v.vote === -1 ? 1 : 0,
        Math.max(0, Math.min(99, parseInt(v.rank, 10) || 0)),
      ]);
      if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, 6).setValues(out);
    }

    if (data.type === "idea") {
      ss.getSheetByName("Ideen").appendRow([new Date(), clean_(data.idea, 60)]);
    }

    return ContentService.createTextOutput("ok");
  } finally {
    lock.releaseLock();
  }
}

// Text kürzen + Formel-Injection verhindern (=, +, -, @ am Anfang würde Sheets als Formel ausführen)
function clean_(s, max) {
  s = String(s == null ? "" : s).slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function setup_(ss) {
  if (!ss.getSheetByName("Stimmen")) {
    const sh = ss.insertSheet("Stimmen");
    sh.appendRow(["Zeit", "Person (anonym)", "Game", "Daumen hoch", "Daumen runter", "Rang"]);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName("Ideen")) {
    const sh = ss.insertSheet("Ideen");
    sh.appendRow(["Zeit", "Idee"]);
    sh.setFrozenRows(1);
  }
  if (!ss.getSheetByName("Auswertung")) {
    const sh = ss.insertSheet("Auswertung", 0);
    sh.getRange("A1").setFormula(
      "=QUERY(Stimmen!A:F, \"select C, sum(D), sum(E), avg(F), count(C) where C is not null group by C order by avg(F) asc " +
      "label C 'Game', sum(D) '👍', sum(E) '👎', avg(F) 'Ø Rang', count(C) 'Stimmen'\", 1)"
    );
    sh.setFrozenRows(1);
  }
}
