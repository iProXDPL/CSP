import os
import random
import time
from typing import List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# Allow CORS for development (e.g., if frontend runs on a different port during dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicjalizacja Firebase
# Konfiguracja jest ładowana z pliku .env
FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL")
FIREBASE_AUTH_TOKEN = os.getenv("FIREBASE_AUTH_TOKEN") 

if not FIREBASE_DB_URL or not FIREBASE_AUTH_TOKEN:
    print("Ostrzeżenie: FIREBASE_DB_URL lub FIREBASE_AUTH_TOKEN nie ustawione w .env. Aplikacja nie będzie działać poprawnie.")

# API Endpoints
@app.get("/api/data/all")
def get_all_data():
    """
    Pobiera wszystkie dane temperatury i wilgotności z Firebase.
    Ścieżka: /api/data/all
    Sortowanie: timestamp rosnąco
    """
    if not FIREBASE_DB_URL or not FIREBASE_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="Brak konfiguracji Firebase")

    try:
        import requests
        # Ścieżka użytkownika: FIREBASE_DB_URL/data
        url = f"{FIREBASE_DB_URL.rstrip('/')}/data.json"
        
        # Sortuj po timestamp, weź ostatni
        params = {
            "auth": FIREBASE_AUTH_TOKEN,
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data:
             return []

        # Firebase zwraca { "UUID": { ... } }
        results = []
        for key, val in data.items():
            if not isinstance(val, dict):
                continue
            
            results.append({
                "id": key,
                "humidity": val.get("hum"),
                "temperature": val.get("temp"),
                "timestamp": val.get("timestamp")
            })
        
        # Sortuj rosnąco po timestamp (od najstarszych do najnowszych)
        results.sort(key=lambda x: x.get("timestamp", 0))
        
        return results
            
    except Exception as e:
        print(f"Błąd pobierania danych: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/last")
def get_last_data():
    """
    Pobiera tylko najnowszy odczyt z Firebase.
    Ścieżka: /api/data/last
    """
    if not FIREBASE_DB_URL or not FIREBASE_AUTH_TOKEN:
        raise HTTPException(status_code=500, detail="Brak konfiguracji Firebase")

    try:
        import requests
        # Ścieżka użytkownika: FIREBASE_DB_URL/data
        url = f"{FIREBASE_DB_URL.rstrip('/')}/data.json"
        
        # Pobieramy wszystko i filtrujemy w Pythonie (chyba że dodamy indeksy w Firebase)
        # TODO: Zoptymalizować używając orderBy i limitToLast po stronie Firebase
        params = {
            "auth": FIREBASE_AUTH_TOKEN,
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data:
             return {}

        results = []
        for key, val in data.items():
            if not isinstance(val, dict):
                continue
            
            results.append({
                "id": key,
                "humidity": val.get("hum"),
                "temperature": val.get("temp"),
                "timestamp": val.get("timestamp")
            })
        
        if not results:
            return {}

        # Sortuj rosnąco po timestamp i weź ostatni
        results.sort(key=lambda x: x.get("timestamp", 0))
        return results[-1]
            
    except Exception as e:
        print(f"Błąd pobierania danych: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict")
async def predict_weather():
    """
    Placeholder for future AI prediction logic.
    """
    return {"message": "Prediction module not yet implemented.", "status": "coming_soon"}

@app.get("/api/status")
def health_check():
    return {"status": "running", "firebase_configured": bool(FIREBASE_DB_URL and FIREBASE_AUTH_TOKEN)}


# Serve Frontend Static Files
# Logika kopiowania builda frontendu do katalogu backendu (static)
import shutil

source_path = os.path.join(os.path.dirname(__file__), "..", "Frontend", "dist")
destination_path = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(source_path):
    try:
        if os.path.exists(destination_path):
            shutil.rmtree(destination_path)
        shutil.copytree(source_path, destination_path)
        print(f"Skopiowano frontend z {source_path} do {destination_path}")
    except Exception as e:
        print(f"Błąd podczas kopiowania frontendu: {e}")
else:
    print(f"Ostrzeżenie: Nie znaleziono builda frontendu w {source_path}. Upewnij się, że uruchomiłeś 'npm run build'.")

if os.path.exists(destination_path):
    app.mount("/", StaticFiles(directory=destination_path, html=True), name="static")
else:
    print(f"Ostrzeżenie: Katalog {destination_path} nie istnieje. Frontend nie będzie serwowany.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
