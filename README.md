# Projekt CSP

## Struktura
- **Backend**: Aplikacja Python FastAPI, która łączy się z Firebase i serwuje aplikację webową.
- **Frontend**: Aplikacja React (Vite) do wizualizacji temperatury i wilgotności.

## Konfiguracja (Setup)

1. **Wymagania wstępne**:
   - Python 3.8+
   - Node.js & npm

2. **Konfiguracja Frontendu**:
   ```bash
   cd Frontend
   # Opcjonalnie: Skonfiguruj URL backendu
   cp .env.example .env
   # Edytuj VITE_API_URL w .env jeśli backend jest na innym porcie/adresie
   
   npm install
   npm run build
   ```

3. **Konfiguracja Backendu**:
   ```bash
   cd Backend
   pip install -r requirements.txt
   ```

4. **Konfiguracja Firebase**:
   - W folderze `Backend` znajdziesz plik `.env.example`.
   - Zmień jego nazwę na `.env` (lub skopiuj): `cp .env.example .env`
   - Otwórz `.env` i uzupełnij:
     - `FIREBASE_DB_URL`: Adres URL Twojej bazy danych.
     - `FIREBASE_AUTH_TOKEN`: Twój Database Secret (Token).

## Uruchamianie aplikacji

Aby uruchomić serwer (który hostuje frontend):

```bash
cd Backend
python main.py
```

Otwórz przeglądarkę pod adresem `http://localhost:8000`.

## Funkcje
- Wizualizacja danych w czasie rzeczywistym (Temperatura i Wilgotność).
- Nowoczesny ciemny interfejs (Dark UI).
- API Backendowe (`/api/data`) do pobierania danych.
- Przygotowane miejsce na przyszłe moduły przewidywania AI.
