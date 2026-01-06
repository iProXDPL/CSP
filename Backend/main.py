import os
# Konfiguracja zmiennych środowiskowych przed importem TensorFlow, aby wyciszyć logi
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'
import warnings
warnings.filterwarnings('ignore')

import random
import time
import json
import numpy as np
import pandas as pd
from typing import List, Dict
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import shutil

# Inicjalizacja bibliotek ML
# (Ładowanie ich tutaj może chwilę potrwać)
import tensorflow as tf
from tensorflow.keras.models import load_model
import joblib

load_dotenv()

app = FastAPI(
    title="IoT Weather Prediction API",
    description="API do monitoringu środowiska i predykcji temperatury/wilgotności przy użyciu sieci LSTM.",
    version="1.0.0"
)

# Konfiguracja CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Konfiguracja Firebase
FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL")
FIREBASE_AUTH_TOKEN = os.getenv("FIREBASE_AUTH_TOKEN") 

# Ścieżki do modelu i skalera
MODEL_PATH = "model.h5"
SCALER_PATH = "scaler.pkl"

# Globalne zmienne dla modelu
lstm_model = None
data_scaler = None

def load_ml_assets():
    """
    Ładuje model LSTM i skaler z dysku.
    """
    global lstm_model, data_scaler
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            print("Ładowanie modelu AI...")
            lstm_model = load_model(MODEL_PATH, compile=False)
            data_scaler = joblib.load(SCALER_PATH)
            print("Model i skaler załadowane.")
        else:
            print("Waring: Nie znaleziono plików modelu (model.h5/scaler.pkl). Predykcja nie będzie dostępna.")
    except Exception as e:
        print(f"Błąd ładowania modelu: {e}")

# Załaduj model przy starcie
load_ml_assets()

# API Endpoints
@app.get("/api/data/all")
def get_all_data():
    """
    Pobiera wszystkie dane temperatury i wilgotności z Firebase.
    """
    if not FIREBASE_DB_URL:
        raise HTTPException(status_code=500, detail="Brak konfiguracji Firebase")

    try:
        import requests
        url = f"{FIREBASE_DB_URL.rstrip('/')}/data.json"
        params = {"auth": FIREBASE_AUTH_TOKEN} if FIREBASE_AUTH_TOKEN else {}
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data:
             return []

        results = []
        for key, val in data.items():
            if not isinstance(val, dict):
                continue
            
            # Zwracamy obiekt z polami dla wykresu
            results.append({
                "id": key,
                "humidity": val.get("hum"),
                "temperature": val.get("temp"),
                "timestamp": val.get("timestamp"),
                # Dla danych historycznych predykcja jest null
                "predicted_humidity": None,
                "predicted_temperature": None
            })
        
        results.sort(key=lambda x: x.get("timestamp", 0))
        return results
            
    except Exception as e:
        print(f"Błąd: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/data/last")
def get_last_data():
    """
    Pobiera najnowszy odczyt.
    """
    # ... (uproszczona logika dla przejrzystości, analogiczna do get_all_data)
    # W praktyce lepiej użyć Firebase limitToLast=1
    all_data = get_all_data()
    if all_data:
        return all_data[-1]
    return {}

@app.get("/api/status")
def health_check():
    return {
        "status": "running", 
        "firebase": bool(FIREBASE_DB_URL),
        "model_loaded": lstm_model is not None
    }

@app.get("/api/predict")
def predict_future():
    """
    Generuje predykcję na 5 kroków w przód.
    Wywoływane co 2 sekundy przez frontend.
    """
    global lstm_model, data_scaler
    
    if lstm_model is None or data_scaler is None:
        return {"error": "Model not loaded"}

    # 1. Pobierz ostatnie 24 próbki z Firebase
    # (W idealnym świecie trzymalibyśmy cache w pamięci, żeby nie pytać Firebase co chwilę)
    try:
        history = get_all_data()
        if len(history) < 24:
            return {"error": "Not enough data for prediction (need 24 points)"}
            
        last_24 = history[-24:] # Ostatnie 24 punkty
        
        # Przygotowanie danych wejściowych
        input_data = []
        for item in last_24:
            input_data.append([item["temperature"], item["humidity"]])
            
        # Normalizacja
        input_sequence = data_scaler.transform(input_data)
        # Reshape do [1, 24, 2]
        current_batch = np.array([input_sequence])
        
        predictions = []
        
        # 2. Pętla Autoregresywna (5 kroków)
        last_timestamp = last_24[-1]["timestamp"]
        
        # Zakładamy interwał np. 1 minuta (60s) lub bierzemy z danych
        # Dla uproszczenia dodajemy 60s do każdego kroku
        time_step = 2 
        
        for i in range(5):
            # Predykcja
            pred = lstm_model.predict(current_batch, verbose=0) # shape [1, 2]
            
            # Odwrócenie normalizacji dla wyniku
            pred_inv = data_scaler.inverse_transform(pred)
            pred_temp = float(pred_inv[0][0])
            pred_hum = float(pred_inv[0][1])
            
            # Oblicz czas
            next_time = last_timestamp + ((i + 1) * time_step)
            
            predictions.append({
                "timestamp": next_time,
                "temperature": None, # To jest predykcja, nie real
                "humidity": None,
                "predicted_temperature": pred_temp,
                "predicted_humidity": pred_hum
            })
            
            # Aktualizacja sekwencji wejściowej dla następnego kroku
            # Usuwamy pierwszy element, dodajemy nową predykcję na koniec
            # new_step musi być znormalizowany (czyli wynik prosto z modelu 'pred')
            new_step = pred.reshape(1, 1, 2)
            current_batch = np.append(current_batch[:, 1:, :], new_step, axis=1)

        return predictions

    except Exception as e:
        print(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Obsługa Frontendu
# ... (Kod serwowania plików statycznych bez zmian)
source_path = os.path.join(os.path.dirname(__file__), "..", "Frontend", "dist")
destination_path = os.path.join(os.path.dirname(__file__), "static")

if os.path.exists(source_path):
    if os.path.exists(destination_path):
        shutil.rmtree(destination_path)
    shutil.copytree(source_path, destination_path)

if os.path.exists(destination_path):
    app.mount("/", StaticFiles(directory=destination_path, html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
