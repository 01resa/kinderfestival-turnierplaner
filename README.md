# Kinderfestival Turnierplaner

Eine Progressive Web App (PWA) zur Planung von Turnieren für F-Jugend-Teams (U7/U8) im Rahmen von Kinderfestivals.

## Features

- **Vereins- und Teamverwaltung**: Vereine anlegen, Teams mit römischer Nummerierung verwalten
- **Flexible Turnierkonfiguration**: Spielrunden, Spieldauer, Pausen, Startzeit, Spielfeldanzahl
- **Intelligenter Spielplan-Algorithmus**: Vermeidet Vereins-Duelle (Derbys) und Doppelbegegnungen
- **Drei-Bereiche-UI**: Einstellungen (oben), Spielkombinationen (mitte), grafische Spielfeld-Darstellung (unten)
- **Responsive Design**: Optimiert für Smartphones und Tablets
- **PWA-Funktionalität**: Offline-fähig, installierbar
- **Datenpersistenz**: Automatisches Speichern im Browser
- **Export-Funktionen**: Druck-/PDF-Ansicht, JSON-Export/Import

## Entwicklung & Deployment

### Voraussetzungen

- Node.js 18+ (empfohlen: 20+)
- npm oder yarn
- Docker & Docker Compose (für Deployment)
- Git

### Lokale Ausführung

```bash
# Repository klonen
git clone https://github.com/[YOUR_ORG]/kinderfestival-turnierplaner.git
cd kinderfestival-turnierplaner

# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten (Hot Reload auf localhost:5173)
npm run dev

# Produktion-Build
npm run build

# Build lokal testen
npm run preview
```

### Docker Deployment

```bash
# Mit Docker Compose starten (Port 8080)
docker compose up -d

# Herunterfahren
docker compose down

# Logs anzeigen
docker compose logs -f
```

### Git Befehle

```bash
# Änderungen committen
git add .
git commit -m "feat: [Beschreibung]"
git push origin main

# Repository aktualisieren
git pull origin main
```

## Projektstruktur

```
kinderfestival-turnierplaner/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte Komponenten
│   │   ├── models/         # Datenmodelle & Types
│   │   ├── stores/         # Svelte Stores (State Management)
│   │   ├── utils/          # Hilfsfunktionen
│   │   ├── services/       # Dienstklassen (Storage, etc.)
│   │   └── algorithms/     # Spielplan-Algorithmus
│   ├── routes/             # Seiten/Routen
│   ├── app.html            # HTML Template
│   └── main.ts             # Application Entry Point
├── static/                 # Statische Dateien (Icons, etc.)
├── public/                 # Öffentliche Dateien
├── tests/                  # Unit-Tests
├── .github/
│   └── workflows/          # GitHub Actions
├── Dockerfile
├── compose.yaml
├── package.json
├── vite.config.ts
├── tsconfig.json
├── manifest.json           # PWA Manifest
└── README.md
```

## Technologien

- **Framework**: Svelte 5 (Runes) + TypeScript
- **Build-Tool**: Vite
- **Styling**: Material Design 3 (MD3) mit Custom Properties
- **State Management**: Svelte Stores
- **Datenpersistenz**: IndexedDB (via idb)
- **PWA**: Workbox für Service Worker & Caching
- **Testing**: Vitest
- **Deployment**: Docker Compose mit nginx

## Konfiguration

### Umgebungsvariablen

Erstelle eine `.env`-Datei für lokale Entwicklung:

```env
VITE_APP_NAME=Kinderfestival Turnierplaner
VITE_APP_VERSION=1.0.0
VITE_BASE_URL=/
```

### Turnier-Defaults

- Spielrunden: 5
- Spieldauer: 10 Minuten
- Pausen: 3 Minuten
- Startzeit: Nächster Samstag, 10:30 Uhr
- Spielfelder: 3

## Datenmodell

### Verein
```typescript
{
  id: string;
  name: string;
  createdAt: Date;
}
```

### Team
```typescript
{
  id: string;
  clubId: string;
  number: number; // Römische Ziffer (I, II, III, ...)
  name: string;   // Z.B. "FC Musterhausen I"
}
```

### Turnier-Konfiguration
```typescript
{
  rounds: number;
  matchDuration: number; // Minuten
  breakDuration: number; // Minuten
  startDateTime: Date;
  fields: Field[];
}
```

### Spiel
```typescript
{
  id: string;
  round: number;
  fieldId: string;
  startTime: Date;
  endTime: Date;
  teamA: Team;
  teamB: Team;
  isDerby: boolean;      // Vereins-Duell
  isRepeat: boolean;     // Doppelbegegnung
  conflicts: string[];   // Konflikthinweise
}
```

## Architektur-Prinzipien

1. **Trennung der Verantwortlichkeiten**: Klare Trennung von UI, Business-Logik und Datenzugriff
2. **Reinheit**: Spielplan-Algorithmus als reine Funktion (Input → Output)
3. **Erweiterbarkeit**: Abstraktes Repository-Interface für zukünftige Backend-Anbindung
4. **Testbarkeit**: Algorithmus und Business-Logik leicht testbar
5. **Barrierefreiheit**: WCAG 2.1 AA Konformität

## Roadmap

- [ ] Grundlegende Vereins- und Teamverwaltung
- [ ] Turnierkonfiguration
- [ ] Spielplan-Algorithmus (Kernfunktionalität)
- [ ] UI-Implementierung (Drei-Bereiche-Layout)
- [ ] PWA-Funktionalität
- [ ] Docker Deployment
- [ ] Export-Funktionen
- [ ] Unit-Tests
- [ ] GitHub Actions CI/CD

## Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.

## Beitrag

1. Forke das Repository
2. Erstelle einen Feature-Branch (`git checkout -b feat/[name]`)
3. Committe deine Änderungen (`git commit -m 'feat: [Beschreibung]'`)
4. Pushe zum Branch (`git push origin feat/[name]`)
5. Erstelle einen Pull Request

---

**Entwickelt mit ❤️ für den Kinderfußball**
