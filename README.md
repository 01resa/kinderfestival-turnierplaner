# Kinderfestival Turnierplaner

Eine Progressive Web App (PWA) zur Planung von Turnieren für F-Jugend-Teams (U7/U8) im Rahmen von Kinderfestivals.

## 🚀 Schnellstart

### Lokale Entwicklung

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
docker compose --profile production up -d

# Herunterfahren
docker compose down

# Logs anzeigen
docker compose logs -f

# Entwicklungsserver starten
docker compose --profile development up -d
```

## ⚡ Features

### 🏆 Turnierplanung
- **Vereins- und Teamverwaltung**: Vereine anlegen, Teams mit römischer Nummerierung verwalten
- **Flexible Turnierkonfiguration**: Spielrunden, Spieldauer, Pausen, Startzeit, Spielfeldanzahl
- **Intelligenter Spielplan-Algorithmus**: Vermeidet Vereins-Duelle (Derbys) und Doppelbegegnungen
- **Drei-Bereiche-UI**: Einstellungen (oben), Spielkombinationen (mitte), grafische Spielfeld-Darstellung (unten)

### 📱 Progressive Web App
- **Offline-fähig**: Funktioniert ohne Internetverbindung mit lokal gespeicherten Daten
- **Installierbar**: Kann wie eine native App installiert werden (PWA)
- **Responsive Design**: Optimiert für Smartphones und Tablets
- **Automatisches Speichern**: Alle Daten werden automatisch im Browser gespeichert

### 🎨 Design
- **Material Design 3**: Modernes, ansprechendes Design
- **Barrierefreiheit**: WCAG 2.1 AA konform
- **Dark Mode**: Automatische Anpassung an die Systemeinstellungen

### 🔧 Erweiterte Funktionen
- **Drucken/PDF**: Spielplan als Druckvorlage oder PDF exportieren
- **JSON Export/Import**: Turnierdaten speichern und laden
- **Datenpersistenz**: IndexedDB mit localStorage Fallback
- **Undo-Funktionalität**: Rückgängigmachen von Änderungen

## 🏗️ Projektstruktur

```
kinderfestival-turnierplaner/
├── src/
│   ├── lib/
│   │   ├── components/           # Svelte Komponenten
│   │   │   ├── ActionBar.svelte
│   │   │   ├── FieldGrid.svelte
│   │   │   ├── MatchesTable.svelte
│   │   │   ├── SettingsSection.svelte
│   │   │   └── TutorialOverlay.svelte
│   │   ├── models/               # Datenmodelle & Types
│   │   │   ├── types.ts          # TypeScript Interfaces
│   │   │   └── validation.ts     # Validierungsfunktionen
│   │   ├── stores/               # Svelte Stores (State Management)
│   │   │   └── tournamentStore.ts
│   │   ├── services/             # Dienstklassen
│   │   │   └── storageService.ts # IndexedDB & localStorage
│   │   └── algorithms/           # Spielplan-Algorithmus
│   │       └── scheduling.ts     # Haupt-Algorithmus
│   ├── routes/                   # SvelteKit Routen
│   │   ├── +layout.svelte
│   │   └── +page.svelte
│   ├── app.html                  # HTML Template
│   ├── app.css                   # Material Design 3 Styles
│   └── service-worker.ts         # Service Worker für PWA
├── static/                       # Statische Dateien
│   ├── manifest.json             # PWA Manifest
│   └── favicon.ico               # Favicon
├── tests/                        # Unit-Tests
│   ├── setup.ts                  # Test-Setup
│   └── scheduling.test.ts        # Tests für den Algorithmus
├── docker/                       # Docker Konfiguration
│   ├── nginx.conf                # Nginx Server-Konfiguration
│   └── healthcheck.sh            # Health Check Skript
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI/CD Pipeline
├── .env.example                  # Environment Variables Template
├── Dockerfile                    # Docker Build-Konfiguration
├── Dockerfile.dev                # Entwicklung-Dockerfile
├── compose.yaml                  # Docker Compose Konfiguration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 📋 Datenmodell

### Verein (Club)
```typescript
{
  id: string;          // UUID
  name: string;        // Vereinsname
  createdAt: string;   // ISO Date
  updatedAt: string;   // ISO Date
}
```

### Team
```typescript
{
  id: string;          // UUID
  clubId: string;      // Referenz auf Verein
  romanNumber: string; // Römische Nummer (I, II, III, ...)
  name: string;        // Vollständiger Name (z.B. "FC Musterhausen I")
  createdAt: string;   // ISO Date
  updatedAt: string;   // ISO Date
}
```

### Spielfeld (Field)
```typescript
{
  id: string;          // UUID
  name: string;        // Feldname
  type: string;        // Typ (jugendtore, monitore, kleinfeld, etc.)
  customType?: string; // Benutzerdefinierter Typ
  createdAt: string;   // ISO Date
  updatedAt: string;   // ISO Date
}
```

### Turnier-Konfiguration (TournamentConfig)
```typescript
{
  id: string;              // UUID
  name: string;            // Turniername
  rounds: number;           // Anzahl der Spielrunden (Default: 5)
  matchDuration: number;   // Spieldauer in Minuten (Default: 10)
  breakDuration: number;   // Pausen in Minuten (Default: 3)
  startDateTime: string;   // Startdatum und -uhrzeit (ISO)
  fields: Field[];         // Liste der Spielfelder
  createdAt: string;       // ISO Date
  updatedAt: string;       // ISO Date
}
```

### Spiel (Match)
```typescript
{
  id: string;          // UUID
  round: number;        // Spielrunde
  fieldId: string;      // Referenz auf Spielfeld
  startTime: string;    // Startzeit (ISO)
  endTime: string;      // Endzeit (ISO)
  teamAId: string;      // Referenz auf Team A
  teamBId: string;      // Referenz auf Team B
  result: MatchResult;  // Spielergebnis (null oder {goalsA, goalsB})
  isDerby: boolean;     // Vereins-Duell
  isRepeat: boolean;    // Doppelbegegnung
  conflicts: ConflictInfo[]; // Liste der Konflikte
  createdAt: string;    // ISO Date
  updatedAt: string;    // ISO Date
}
```

## 🎯 Spielplan-Algorithmus

### Ziele
1. **Keine Vereins-Duelle (Derbys)**: Teams desselben Vereins spielen nicht gegeneinander
2. **Keine Doppelbegegnungen**: Jedes Team-Paarung nur einmal
3. **Gleichmäßige Verteilung**: Alle Teams haben ähnlich viele Spiele
4. **Keine Zeitüberschneidungen**: Pro Team und pro Feld keine Überschneidungen

### Implementierung
- **Hauptalgorithmus**: `generateSchedule()` - Erstellt einen optimierten Spielplan
- **Round-Robin**: `generateRoundRobinSchedule()` - Jedes Team spielt gegen jedes andere Team
- **Validierung**: `isSchedulePossible()` - Prüft, ob ein gültiger Spielplan möglich ist

## 🔧 Konfiguration

### Umgebungsvariablen

Kopiere `.env.example` zu `.env` und passe die Werte an:

```env
# Entwicklung
VITE_APP_NAME=Kinderfestival Turnierplaner
VITE_APP_VERSION=1.0.0
VITE_BASE_URL=/

# Docker
NGINX_HTTP_PORT=8080
NGINX_HTTPS_PORT=8443
NGINX_ENABLE_HTTPS=false
```

## 🚀 Deployment

### Docker Compose (empfohlen)

```bash
# Produktionsbuild erstellen
docker compose --profile production build

# Container starten
docker compose --profile production up -d

# Status überprüfen
docker compose ps

# Logs anzeigen
docker compose logs -f turnierplaner

# Herunterfahren
docker compose down

# Neues Image starten (nach Änderungen)
docker compose --profile production up -d --build
```

### Manuelles Docker Deployment

```bash
# Docker Image bauen
docker build -t kinderfestival-turnierplaner .

# Container starten
docker run -d -p 8080:8080 --name turnierplaner kinderfestival-turnierplaner

# Container stoppen
docker stop turnierplaner

# Container entfernen
docker rm turnierplaner
```

### GitHub Actions CI/CD

Das Projekt enthält eine GitHub Actions Pipeline (`.github/workflows/ci.yml`), die automatisch:
- Abhängigkeiten installiert
- TypeScript-Typprüfung durchführt
- Linting ausführt
- Unit-Tests durchführt
- Anwendung baut
- Docker-Image erstellt und pusht (wenn konfiguriert)

**Aktivierung:**
1. Repository auf GitHub erstellen
2. GitHub Secrets konfigurieren:
   - `DOCKER_HUB_USERNAME` und `DOCKER_HUB_TOKEN` (für Docker Hub)
   - `SSH_HOST`, `SSH_USERNAME`, `SSH_PRIVATE_KEY` (für SSH-Deployment)
3. Pipeline wird automatisch bei jedem Push ausgelöst

## 🛠️ Entwicklung

### Git Befehle

```bash
# Änderungen committen
git add .
git commit -m "feat: [Beschreibung]"
git push origin main

# Repository aktualisieren
git pull origin main

# Branch erstellen
git checkout -b feat/[feature-name]
git push origin feat/[feature-name]

# Pull Request erstellen (nach dem Push)
# Gehe zu GitHub und erstelle einen PR von feat/[feature-name] nach main
```

### Branch-Schutz (optional)

```bash
# Main-Branch schützen (GitHub CLI)
gh api repos/[YOUR_ORG]/kinderfestival-turnierplaner/branches/main/protection \
  -f required_status_checks=null \
  -f enforce_admins=null \
  -f required_pull_request_reviews=enabled \
  -f required_conversation_resolution=enabled \
  -f required_signatures=null \
  -f restrictions=null
```

### PWA Icons generieren

```bash
# Skript ausführen (erfordert ImageMagick)
chmod +x scripts/generate-icons.sh
./scripts/generate-icons.sh

# Oder manuell Icons erstellen:
# 1. Logo erstellen (512x512 PNG)
# 2. Favicon Generator verwenden:
#    - https://favicon.io/
#    - https://realfavicongenerator.net/
#    - https://maskable.app/
```

### Tests ausführen

```bash
# Alle Tests
npm run test

# Tests mit UI (interaktiv)
npm run test:ui

# Tests mit Coverage
npm run test:coverage

# TypeScript Type-Check
npm run check

# Linting
npm run lint

# Code formatieren
npm run format
```

## 📚 Architektur-Prinzipien

1. **Trennung der Verantwortlichkeiten**: Klare Trennung von UI, Business-Logik und Datenzugriff
2. **Reinheit**: Spielplan-Algorithmus als reine Funktion (Input → Output)
3. **Erweiterbarkeit**: Abstraktes Repository-Interface für zukünftige Backend-Anbindung
4. **Testbarkeit**: Algorithmus und Business-Logik leicht testbar
5. **Barrierefreiheit**: WCAG 2.1 AA Konformität

## 🎨 Material Design 3

Das Projekt verwendet Material Design 3 (MD3):
- **Farben**: Primärfarbe (#6750a4), Sekundärfarbe, Tertiärfarbe
- **Formen**: Kleine (8px), Mittel (12px), Groß (16px) Radien
- **Schattierungen**: 5 Levels (0-4)
- **Typography**: Roboto Schriftfamilie

## 📦 Technologien

- **Framework**: [Svelte 5](https://svelte.dev/) mit Runes
- **Build-Tool**: [Vite](https://vitejs.dev/)
- **TypeScript**: Typisierte JavaScript-Superset
- **PWA**: [Workbox](https://developers.google.com/web/tools/workbox) für Service Worker
- **Styling**: Material Design 3 mit CSS Custom Properties
- **Datenpersistenz**: IndexedDB (via [idb](https://github.com/jakearchibald/idb))
- **Testing**: [Vitest](https://vitest.dev/) mit [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/)
- **Deployment**: Docker Compose mit nginx

## 🤝 Beitrag

1. **Forke** das Repository
2. **Erstelle** einen Feature-Branch: `git checkout -b feat/[name]`
3. **Committe** deine Änderungen: `git commit -m 'feat: [Beschreibung]'`
4. **Pushe** zum Branch: `git push origin feat/[name]`
5. **Erstelle** einen Pull Request

### Commit-Nachrichten

Verwende [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` - Neue Funktion
- `fix:` - Bugfix
- `docs:` - Dokumentation
- `style:` - Stiländerungen (Formatierung, Semikolons)
- `refactor:` - Code-Refactoring
- `perf:` - Performance-Verbesserungen
- `test:` - Tests hinzufügen/aktualisieren
- `chore:` - Sonstige Änderungen

## 📄 Lizenz

[MIT License](LICENSE) - Siehe [LICENSE](LICENSE) für Details.

## 🙏 Danksagung

- [Svelte](https://svelte.dev/) - Das revolutionäre JavaScript-Framework
- [Material Design](https://m3.material.io/) - Design-System von Google
- [Workbox](https://developers.google.com/web/tools/workbox) - PWA-Bibliothek
- Alle Mitwirkenden und die Open-Source-Community

---

**💜 Entwickelt mit ❤️ für den Kinderfußball**

*Für Fragen und Support: [GitHub Issues](https://github.com/[YOUR_ORG]/kinderfestival-turnierplaner/issues)*
