# Game Pick

**Was zocken wir als Nächstes?** Diese Seite gibt die Antwort: für mich und meine Freunde.

Statt endloser Diskussion im Chat bewertet jeder die Kandidaten selbst, sortiert sein persönliches Ranking und schickt es anonym ab. Am Ende steht ein gemeinsames Ergebnis.

## So funktioniert's

1. **Geheime Zahl wählen**: irgendeine Zahl, egal wie gross. Sie ist deine Stimme: wer später die gleiche Zahl eingibt, ändert seine Abstimmung statt eine zweite zu erstellen.
2. **Games anschauen**: jedes Game mit Titelbild, Trailer und kurzer Erklärung. Ein Vibe-Meter zeigt auf einen Blick, wie viel **Grind**, **Story** und **Chill** drinsteckt.
3. **Daumen hoch / runter**: schnelles Bauchgefühl pro Game.
4. **Ranking ziehen**: die eigene Liste per Drag & Drop sortieren. Platz 1 = will ich am meisten.
5. **Abschicken**: anonym, nur mit der Zahl.
6. **Game-Ideen**: unten kann jeder neue Games für die nächste Runde vorschlagen. Die Liste ist für alle sichtbar; der Admin kann Vorschläge löschen.

## Anonym

Es gibt kein Login und keinen Namen, nur die selbst gewählte Zahl. Die Resultate landen in einem privaten Google Sheet, das nur der Admin sieht, inklusive automatischer Auswertung (👍, 👎, Ø Rang).

## Aktuelle Kandidaten

SAND: Raiders of Sophie · Enshrouded · Conan Exiles · Soulmask · 7 Days to Die · Astroneer · Windrose · V Rising · Core Keeper · Minecraft Modded · ARK: Survival Ascended (neuer Run) · Palworld Hardcore

## Technik

Reines HTML, CSS und JavaScript ohne Build-Step, gehostet auf GitHub Pages. Spieldaten in `data.js`, Empfänger für Stimmen und Ideen in `apps-script.gs` (Google Apps Script). Das Admin-Passwort liegt nicht im Code, sondern in den Skript-Eigenschaften des Apps Scripts. Bilder von Steam, Trailer von YouTube. Fan-Projekt ohne kommerzielle Absicht.
