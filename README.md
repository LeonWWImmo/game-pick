# Game Pick

**Was zocken wir als Nächstes?** Diese Seite gibt die Antwort: für mich und meine Freunde.

Statt endloser Diskussion im Chat bewertet jeder die Kandidaten selbst, sortiert sein persönliches Ranking und schickt es anonym ab. Am Ende steht ein gemeinsames Ergebnis.

## So funktioniert's

1. **Games anschauen**: jedes Game mit Titelbild, Trailer und kurzer Erklärung. Ein Vibe-Meter zeigt auf einen Blick, wie viel **Grind**, **Story** und **Chill** drinsteckt.
2. **Daumen hoch / runter**: schnelles Bauchgefühl pro Game.
3. **Ranking ziehen**: die eigene Liste per Drag & Drop sortieren. Platz 1 = will ich am meisten.
4. **Abschicken**: anonym. Wer seine Meinung ändert, schickt einfach nochmal; es zählt nur die neuste Abgabe.
5. **Game-Ideen**: unten können neue Games für die nächste Runde vorgeschlagen werden.

## Anonym

Es gibt kein Login und keinen Namen. Jeder Browser erzeugt nur eine zufällige ID, damit ein erneutes Abschicken die alte Abgabe ersetzt. Die Resultate landen in einem privaten Google Sheet, das nur der Admin sieht, inklusive automatischer Auswertung (👍, 👎, Ø Rang).

## Aktuelle Kandidaten

SAND: Raiders of Sophie · Enshrouded · Conan Exiles · Soulmask · 7 Days to Die · Astroneer · Windrose · V Rising · Core Keeper · Minecraft Modded · ARK: Survival Ascended (neuer Run) · Palworld Hardcore

## Technik

Reines HTML, CSS und JavaScript ohne Build-Step, gehostet auf GitHub Pages. Spieldaten in `data.js`, Empfänger für die Stimmen in `apps-script.gs` (Google Apps Script). Bilder von Steam, Trailer von YouTube. Fan-Projekt ohne kommerzielle Absicht.
