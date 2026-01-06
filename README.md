# Inteligentny System Monitoringu Środowiska (IoT + AI)

Projekt systemu IoT monitorującego temperaturę i wilgotność w czasie rzeczywistym, wzbogacony o moduł sztucznej inteligencji (LSTM), który przewiduje przyszłe wartości parametrów środowiskowych.

## Funkcjonalności
- **Monitoring Online**: Ciągły odczyt danych z czujników (ESP32) poprzez Firebase Realtime Database.
- **Sztuczna Inteligencja (AI)**:
  - Sieć neuronowa **LSTM** (Long Short-Term Memory).
  - Predykcja **5-krokowa** (autoregresywna) w czasie rzeczywistym.
  - Model trenowany na danych historycznych.
- **Dashboard WWW**:
  - Interaktywne wykresy (Recharts).
  - Wizualizacja dwóch serii danych: **Rzeczywistej** (ciągła) i **Przewidywanej** (przerywana).
  - Dynamiczne aktualizacje co 2 sekundy.

## Architektura Systemu
1. **Frontend**: React + Vite (Wizualizacja).
2. **Backend**: Python FastAPI (API, Obsługa modelu AI).
3. **Baza Danych**: Firebase Realtime Database.
4. **AI Engine**: TensorFlow/Keras + Scikit-learn (Model LSTM).

## Instalacja i Uruchomienie

### 1. Wymagania
- Python 3.9+
- Node.js & npm
- Konto Google Firebase (Baza danych)

### 2. Backend (Serwer & AI)
```bash
cd Backend

# 1. Instalacja zależności
pip install -r requirements.txt

# 2. Konfiguracja środowiska
# Utwórz plik .env na podstawie .env.example i uzupełnij:
# - FIREBASE_DB_URL
# - FIREBASE_AUTH_TOKEN

# 3. Trening Modelu (Opcjonalne - pominąć jeśli masz już model.h5)
python train_model.py

# 4. Uruchomienie Serwera
python main.py
```
Serwer wystartuje pod adresem: `http://127.0.0.1:8000`

### 3. Frontend (Interfejs)
Jeśli chcesz dokonywać zmian w kodzie frontendu (tryb deweloperski):
```bash
cd Frontend
npm install
npm run dev
```
Aplikacja dostępna pod adresem: `http://localhost:5173`

> **Uwaga**: Backend (`main.py`) serwuje również skompilowaną wersję frontendu pod głównym adresem `http://127.0.0.1:8000`. Aby zaktualizować tę wersję, użyj `npm run build` w folderze Frontend.

## Dokumentacja API (Swagger)
Pełna dokumentacja endpointów API jest dostępna automatycznie po uruchomieniu backendu:
- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

### Kluczowe Endpointy:
- `GET /api/data/all` - Pełna historia pomiarów z bazy danych.
- `GET /api/data/last` - Ostatni znany pomiar (najnowszy).
- `GET /api/predict` - Generuje predykcję AI na 5 kroków w przód (metoda autoregresywna).
- `GET /api/status` - Sprawdza stan usługi i połączenie z Firebase/Modelem.

