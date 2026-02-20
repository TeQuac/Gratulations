# Gratulations

Mobile-first Geburtstagskalender mit Monats-/Wochenansicht, Swipe-Navigation und personalisierten Geburtstagswünschen.

## Benachrichtigungen

- Nutzer aktivieren Benachrichtigungen per Button und wählen nur die gewünschte Uhrzeit.
- Die App erinnert täglich zur gewählten lokalen Uhrzeit.
- Die Konfiguration wird an den Service Worker synchronisiert.
- Wenn vom Browser unterstützt, wird ein `periodicSync`-Job registriert, damit Benachrichtigungen auch ohne geöffnete App zugestellt werden.
- Zusätzlich bleibt ein `TimestampTrigger`-basiertes Scheduling als Browser-Feature aktiv.

> Hinweis: Für echte Hintergrund-Benachrichtigungen muss die App in der Regel als PWA installiert sein und der Browser muss die jeweiligen APIs (`periodicSync`, `showTrigger` oder Web Push) unterstützen.
