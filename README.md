# Gratulations

Mobile-first Geburtstagskalender mit Monats-/Wochenansicht, Swipe-Navigation und lokaler KI-Textgenerierung für personalisierte Geburtstagswünsche.

## Neue Funktion: automatische Erinnerung um 07:00 UTC (Zulu)

- Nach Aktivierung der Browser-Benachrichtigungen erinnert die App automatisch an alle Geburtstage des aktuellen Tages.
- Die Erinnerung läuft täglich um **07:00 UTC**.
- Zu jedem Treffer wird ein passender Glückwunschtext automatisch erzeugt.
- Zusätzlich öffnet sich ein Dialog mit allen heutigen Geburtstagswünschen inklusive **„Text kopieren“** pro Person.

## Wichtiger Hinweis

Die Umsetzung nutzt Web-Notifications im Browser. Dadurch gilt:

- Die App muss im Browser/PWA mindestens im Hintergrund aktiv sein.
- Ohne aktiven Browser-Prozess können in einer reinen statischen Web-App keine garantierten Push-Nachrichten zugestellt werden.
