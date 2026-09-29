# Projekte

Eine ruhige App, die auf einen Blick zeigt, was jetzt und bald wichtig ist: Termine, Aufgaben und Vorhaben in einer einzigen, nach Zeit geordneten Liste.

**Online:** https://bahri-a.github.io/projekte/

Die App läuft komplett im Browser und hat weder Server noch Konto. Deine Einträge bleiben **nur in deinem Browser** auf diesem Mac und werden nirgendwohin geschickt. Die App funktioniert auch offline.

## Lokal starten

Einmalig die Abhängigkeiten installieren:

```bash
npm install
```

Dann die App starten:

```bash
npm run dev
```

Anschließend http://localhost:5280 öffnen. Beenden kannst du sie im Terminal mit `Ctrl + C`.

Weitere Befehle:

| Zweck | Befehl |
|---|---|
| Tests | `npm test` |
| Typprüfung | `npm run typecheck` |
| Produktions-Build | `npm run build` |
| Testdateien erzeugen (`data/*.test.json`) | `npm run testdata:reset` |
| Mit Testdaten ausprobieren (eigener Speicher, getrennt von deinen Daten) | `npm run dev:test` → http://localhost:5281, dann `data/items.test.json` über „Importieren“ laden |

Hinweis: Jede Adresse hat ihren eigenen Speicher. Die Einträge unter `localhost:5280`, `localhost:5281` und der Online-Adresse sind also voneinander getrennt.

## Veröffentlichen

Jeder `git push` auf `main` veröffentlicht die App automatisch:

```bash
git push
```

GitHub führt dann die Tests aus, baut die App und stellt sie online. Das dauert etwa ein bis zwei Minuten. Den Fortschritt siehst du im Repo auf GitHub unter **Actions**. Ein grüner Haken bedeutet „online“, ein rotes Kreuz bedeutet, dass etwas fehlgeschlagen ist und die alte Version online bleibt.

Wer die App offen hat, sieht danach oben den Hinweis **„Neue Version verfügbar · Neu laden“**. Die App lädt nie von selbst neu.

## In Chrome installieren

1. https://bahri-a.github.io/projekte/ in Chrome öffnen.
2. In der Adressleiste rechts auf das Symbol **„Installieren“** klicken (ein Bildschirm mit Pfeil). Alternativ gehst du über das Menü **⋮** → **Streamen, speichern und teilen** → **Seite als App installieren…**
3. Die App öffnet sich in einem eigenen Fenster.
4. Rechtsklick auf das Symbol im Dock → **Optionen** → **Im Dock behalten**.

## Automatisch erstellte Aufgaben

Die App hat zwei Reiter: **Meine Aufgaben** (selbst erstellt) und **Automatisch**. Im Reiter „Automatisch“ sucht der Knopf **„Aktualisieren“** mit Claude im Second Brain und in den Outlook-Mails dort nach neuen Aufgaben und Terminen. Fundstücke erscheinen als Vorschläge, die du annimmst oder ablehnst (beim Ablehnen gibt es 6 Sekunden „Rückgängig“, danach kommt der Fund nie wieder). Angenommene kannst du abhaken, mit dem kleinen X löschen oder in „Meine Aufgaben“ verschieben. Es wird nichts automatisch gelöscht, alles wird nur gelesen. Die Suche ist auf wenige Tokens ausgelegt: Notizen und Outlook-Mails liest der Helfer selbst. An Claude gehen nur **neue** Stellen, die nach Aufgabe, Termin oder Frist aussehen (offene `- [ ]`, Stichwörter wie „Frist“ oder „Abgabe“, aktuelle Datumsangaben), mit etwas Umfeld, dazu neue Mails ohne Zitate und gekürzt. Offensichtliche Newsletter fallen vorher weg. Das geht in **einem** Aufruf mit Haiku, ohne Denkphase und ohne Werkzeuge. Ist nichts neu, wird Claude gar nicht gefragt. Was einmal an Claude ging, merkt sich der Helfer in `data/helfer-stand.json` und schickt es nie wieder. Beim allerersten Lauf wird der vorhandene Stand nur vermerkt. Gmail wird nicht mehr abgefragt. Das Protokoll zeigt für jeden Lauf den Verbrauch.

Nach einem Durchlauf ist „Aktualisieren“ 10 Minuten gesperrt, damit ein Doppelklick nicht gleich wieder einen Aufruf auslöst.

Das geht nur auf dem MacBook, auf dem der Helfer läuft (`scripts/helfer.mjs`). Er ist nur auf diesem Mac erreichbar, nimmt nur Anfragen der App an und kann nichts anderes, als diese Suche zu starten.

Der Helfer startet bei jeder Anmeldung automatisch (Anmeldeobjekt `~/Library/LaunchAgents/de.projekte.helfer.plist`). Das Protokoll liegt in `~/Library/Logs/projekte-helfer.log`.

Helfer abschalten und entfernen:

```bash
launchctl bootout gui/$(id -u)/de.projekte.helfer && rm ~/Library/LaunchAgents/de.projekte.helfer.plist
```

Wenn du den Projektordner verschiebst, musst du den Helfer neu einrichten lassen.

## Daten sichern

Deine Daten liegen nur im Browser. Wenn du in Chrome „Browserdaten löschen“ (Cookies und Websitedaten) ausführst oder die App deinstallierst, sind sie weg. Mach deshalb regelmäßig eine Sicherung:

- **Sichern:** Ganz unten in der App auf **„Sichern“** klicken. Chrome lädt die Datei `projekte-sicherung-JJJJ-MM-TT.json` in deinen Download-Ordner.
- **Wiederherstellen:** Unten auf **„Importieren“** klicken und die Sicherungsdatei auswählen. Einträge, die schon da sind, bleiben unverändert, und fehlende kommen dazu.

Über **„Importieren“** lädst du auch neue Import-Kandidaten (eine JSON-Liste mit `titel`, `quelle`, `quellId` usw.). Dabei gelten folgende Regeln: Bereits vorhandene Einträge werden übersprungen, und einmal gelöschte Einträge werden nie wieder importiert.
