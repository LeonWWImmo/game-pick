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
        v.vote === 1 || v.vote === -1 ? 0 : 1,   // neutral = nicht reagiert
      ]);
      if (out.length) sh.getRange(sh.getLastRow() + 1, 1, out.length, 7).setValues(out);
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
    sh.appendRow(["Zeit", "Person (Zahl)", "Game", "Daumen hoch", "Daumen runter", "Rang", "Neutral"]);
    sh.setFrozenRows(1);
  }
  const stimmen = ss.getSheetByName("Stimmen");
  if (!stimmen.getRange("G1").getValue()) stimmen.getRange("G1").setValue("Neutral");
  if (!ss.getSheetByName("Ideen")) {
    const sh = ss.insertSheet("Ideen");
    sh.appendRow(["Zeit", "Idee", "ID"]);
    sh.setFrozenRows(1);
  }
  const ideen = ss.getSheetByName("Ideen");
  if (!ideen.getRange("C1").getValue()) ideen.getRange("C1").setValue("ID");
  const auswertung = ss.getSheetByName("Auswertung") || ss.insertSheet("Auswertung", 0);
  if (auswertung.getRange("A1").getFormula().indexOf("Neutral") < 0) {
    auswertung.getRange("A1").setFormula(
      "=QUERY(Stimmen!A:G, \"select C, sum(D), sum(E), sum(G), avg(F), count(C) where C is not null group by C order by avg(F) asc " +
      "label C 'Game', sum(D) '👍', sum(E) '👎', sum(G) '😐 Neutral', avg(F) 'Ø Rang', count(C) 'Stimmen'\", 1)"
    );
    auswertung.setFrozenRows(1);
  }
  if (!ss.getSheetByName("Zusammenfassung")) summary_(ss.insertSheet("Zusammenfassung", 0));
}

// Übersichtsblatt: Kennzahlen + Top 3 (alles Formeln, aktualisiert sich selbst)
function summary_(sh) {
  // agg z.B. "avg(F)"; nur die Game-Spalte wird ausgegeben
  const top = (agg, dir, n) =>
    "=IFERROR(INDEX(QUERY(Stimmen!A:F, \"select C, " + agg + " where C is not null group by C order by " + agg + " " + dir +
    " limit " + n + " label C '', " + agg + " ''\", 1), 0, 1), \"–\")";
  sh.getRange("A1").setValue("🎮 GAME PICK · Zusammenfassung");
  sh.getRange("A3:B9").setValues([
    ["Teilnehmer", "=COUNTUNIQUE(Stimmen!B2:B)"],
    ["Letzte Abgabe", "=IFERROR(IF(MAX(Stimmen!A2:A)=0, \"–\", MAX(Stimmen!A2:A)), \"–\")"],
    ["Game-Ideen", "=COUNTA(Ideen!B2:B)"],
    ["", ""],
    ["🏆 Favorit (bester Ø Rang)", top("avg(F)", "asc", 1)],
    // ohne einen einzigen 👍/👎 würde sonst ein zufälliges Game erscheinen
    ["👍 Meiste Daumen hoch", "=IF(SUM(Stimmen!D2:D)=0, \"–\", " + top("sum(D)", "desc", 1).slice(1) + ")"],
    ["👎 Meiste Daumen runter", "=IF(SUM(Stimmen!E2:E)=0, \"–\", " + top("sum(E)", "desc", 1).slice(1) + ")"],
  ]);
  sh.getRange("A11").setValue("Top 3");
  sh.getRange("B11").setFormula(top("avg(F)", "asc", 3));
  sh.getRange("D1").setValue("Alle Games: siehe Tab Auswertung");

  sh.getRange("A1").setFontSize(16).setFontWeight("bold");
  sh.getRange("A3:A11").setFontWeight("bold");
  sh.getRange("B7:B13").setFontWeight("bold").setFontSize(12);
  sh.getRange("B4").setNumberFormat("dd.MM.yyyy HH:mm");
  sh.getRange("D1").setFontColor("#888888");
  sh.setColumnWidth(1, 230);
  sh.setColumnWidth(2, 260);
}
