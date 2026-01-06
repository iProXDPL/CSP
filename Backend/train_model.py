import os
import json
import requests
import numpy as np
import pandas as pd
import tensorflow as tf
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense
from dotenv import load_dotenv
import joblib

# Ładowanie zmiennych środowiskowych
load_dotenv()

FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL")
FIREBASE_AUTH_TOKEN = os.getenv("FIREBASE_AUTH_TOKEN")

# Parametry modelu
SEQ_LENGTH = 24  # Długość sekwencji wejściowej (np. 24 pomiary wstecz)
PREDICT_STEPS = 1 # Model przewiduje 1 krok w przód (używamy go iteracyjnie dla 5 kroków)

def pobierz_dane():
    """
    Pobiera wszystkie dane historyczne z Firebase.
    """
    if not FIREBASE_DB_URL:
        print("Błąd: Brak FIREBASE_DB_URL w pliku .env")
        return None

    print("Pobieranie danych z Firebase...")
    url = f"{FIREBASE_DB_URL.rstrip('/')}/data.json"
    params = {"auth": FIREBASE_AUTH_TOKEN} if FIREBASE_AUTH_TOKEN else {}
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not data:
            print("Brak danych w Firebase.")
            return None
            
        # Konwersja do DataFrame
        records = []
        for key, val in data.items():
            if isinstance(val, dict):
                records.append({
                    "timestamp": val.get("timestamp", 0),
                    "temp": val.get("temp"),
                    "hum": val.get("hum")
                })
        
        df = pd.DataFrame(records)
        # Sortowanie po czasie
        df = df.sort_values("timestamp")
        # Reset indeksu
        df = df.reset_index(drop=True)
        
        print(f"Pobrano {len(df)} rekordów.")
        return df
        
    except Exception as e:
        print(f"Błąd podczas pobierania danych: {e}")
        return None

def przygotuj_dane(df):
    """
    Przygotowuje dane do treningu: normalizacja i tworzenie sekwencji.
    """
    # Wybieramy tylko interesujące nas kolumny
    data = df[['temp', 'hum']].values
    
    # Normalizacja danych do zakresu 0-1
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data)
    
    # Tworzenie sekwencji X i y
    X, y = [], []
    for i in range(len(scaled_data) - SEQ_LENGTH):
        X.append(scaled_data[i:(i + SEQ_LENGTH)])
        y.append(scaled_data[i + SEQ_LENGTH]) # Przewidujemy kolejny krok
        
    return np.array(X), np.array(y), scaler

def zbuduj_model(input_shape):
    """
    Buduje model LSTM.
    """
    model = Sequential()
    # Warstwa LSTM
    model.add(LSTM(50, return_sequences=True, input_shape=input_shape))
    model.add(LSTM(50))
    # Warstwa wyjściowa - 2 neurony (temp, hum)
    model.add(Dense(2))
    
    model.compile(optimizer='adam', loss='mse')
    return model

if __name__ == "__main__":
    # 1. Pobierz dane
    df = pobierz_dane()
    
    if df is not None and len(df) > SEQ_LENGTH:
        # 2. Przygotuj dane
        print("Przetwarzanie danych...")
        X, y, scaler = przygotuj_dane(df)
        
        print(f"Rozmiar danych treningowych: X={X.shape}, y={y.shape}")
        
        # 3. Zbuduj model
        model = zbuduj_model((X.shape[1], X.shape[2]))
        
        # 4. Trenuj model
        print("Rozpoczynanie treningu...")
        model.fit(X, y, epochs=20, batch_size=32, validation_split=0.1, verbose=1)
        
        # 5. Zapisz model i skaler
        print("Zapisywanie modelu...")
        model.save("model.h5")
        joblib.dump(scaler, "scaler.pkl")
        print("Zakończono sukcesem! Model zapisany jako 'model.h5', skaler jako 'scaler.pkl'.")
        
    else:
        print("Za mało danych do treningu.")
