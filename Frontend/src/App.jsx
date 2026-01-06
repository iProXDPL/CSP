import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';

function App() {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (endpoint = 'all') => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL 
        ? `${import.meta.env.VITE_API_URL}/api/data`
        : (import.meta.env.DEV ? 'http://localhost:8000/api/data' : '/api/data');
      
      const url = `${baseUrl}/${endpoint}`;
      
      const response = await fetch(url);
      const result = await response.json();
      
      // Backend zwraca teraz listę wszystkich rekordów
      if (Array.isArray(result)) {
        const allMeasurements = result.map(item => {
           let timeStr = 'N/A';
           if (item.timestamp) {
             const d = new Date(item.timestamp * 1000);
             const datePart = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
             const timePart = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
             timeStr = `${datePart}\n${timePart}`;
           }
           return { 
             ...item, 
             time: timeStr,
             predictedTemperature: null,
             predictedHumidity: null 
           };
        });
        setMeasurements(allMeasurements);
      } else {
         // Fallback gdyby backend zwrócił pojedynczy obiekt
         let newPoint = result;
         // Sprawdź czy mamy dane
         if (newPoint && newPoint.timestamp) {
            const d = new Date(newPoint.timestamp * 1000);
            const datePart = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timePart = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const timestamp = `${datePart}\n${timePart}`;

            const pointToAdd = { 
                ...newPoint, 
                time: timestamp,
                predictedTemperature: null,
                predictedHumidity: null
            };

            setMeasurements(prev => {
               // Szukamy indeksu elementu z tym samym timestampem
               const index = prev.findIndex(item => item.timestamp === newPoint.timestamp);

               if (index !== -1) {
                   // Jeśli istnieje...
                   const existingItem = prev[index];
                   // ...i jest to punkt predykcji (nie ma realnej temperatury), to NADPISUJEMY go danymi realnymi
                   if (existingItem.temperature === null) {
                       const newHistory = [...prev];
                       newHistory[index] = pointToAdd;
                       return newHistory;
                   }
                   // Jeśli to był już realny punkt, ignorujemy (duplikat)
                   return prev;
               }
               
               // Jeśli nie istnieje, dodajemy nowy
               const newHistory = [...prev, pointToAdd];
               newHistory.sort((a, b) => a.timestamp - b.timestamp);
               return newHistory; 
            });
         }
      }
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
    } finally {
      if (endpoint === 'all') setLoading(false);
    }
  };

  useEffect(() => {
    // Wstępne pobranie całej historii
    fetchData('all');

    // Funkcja do pobierania predykcji
    const fetchPredictions = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL 
          ? `${import.meta.env.VITE_API_URL}/api/predict`
          : (import.meta.env.DEV ? 'http://localhost:8000/api/predict' : '/api/predict');
        
        const response = await fetch(baseUrl);
        const predictions = await response.json();
        
        if (Array.isArray(predictions)) {
            setMeasurements(prev => {
                // Filtrujemy stan: Zostawiamy tylko potwierdzone dane historyczne (temp != null)
                // Oraz ewentualnie te predykcje, które NIE są pokryte przez nowe predykcje (rzadki przypadek)
                // Ale najprościej: bierzemy historię i doklejamy NOWE predykcje.
                
                // 1. Weź tylko historię (to co ma wartości)
                const historyOnly = prev.filter(p => p.temperature !== null);
                
                // 2. "Sklejanie" - ostatni punkt historii startem dla predykcji
                const result = [...historyOnly];
                
                if (result.length > 0) {
                     const lastReal = result[result.length - 1];
                     // Jeśli ostatni punkt historyczny nie jest w nowych predykcjach, to go nie ruszamy
                     // Ale musimy zapewnić ciągłość. 
                     // Najprościej: nowe predykcje są "święte" dla przyszłości.
                }

                // 3. Dodaj nowe predykcje, ale uważaj na duplikaty z historią (gdyby predykcja nachodziła na czas teraźniejszy)
                const historyTimestamps = new Set(historyOnly.map(h => h.timestamp));
                
                const validPredictions = predictions.filter(p => !historyTimestamps.has(p.timestamp)).map(p => {
                     let timeStr = 'N/A';
                     if (p.timestamp) {
                         const d = new Date(p.timestamp * 1000);
                         const datePart = d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
                         const timePart = d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                         timeStr = `${datePart}\n${timePart}`;
                     }
                     return {
                         ...p,
                         time: timeStr,
                         predictedTemperature: p.predicted_temperature, 
                         predictedHumidity: p.predicted_humidity,
                         temperature: null,
                         humidity: null
                     };
                });
                
                // 4. Łączymy i sortujemy
                const finalResult = [...result, ...validPredictions];
                
                // Fix na "dziurę": Pierwszy punkt predykcji powinien wizualnie łączyć się z ostatnim punktem historii
                // Ale w Recharts wystarczy 'connectNulls'. 
                // Jeśli jednak chcemy idealne połączenie w danych:
                // (Opcjonalne, przy connectNulls=true w Dashboard.jsx nie jest to krytyczne, ale warto dla Brusha)
                
                finalResult.sort((a, b) => a.timestamp - b.timestamp);
                return finalResult;
            });
        }
      } catch (e) {
        console.error("Błąd pobierania predykcji:", e);
      }
    };

    // Odpytywanie o predykcje co 2 sekundy
    const interval = setInterval(() => {
        // Możemy też odświeżać 'last' jeśli chcemy live data z czujnika
        fetchData('last'); 
        fetchPredictions();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>Projekt CSP</h1>
      </header>
      
      <main>
        {loading && measurements.length === 0 ? (
          <div className="card" style={{padding: '2rem'}}>Loading Data...</div>
        ) : (
          <Dashboard data={measurements} />
        )}
      </main>
    </div>
  );
}

export default App;
