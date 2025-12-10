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
           return { ...item, time: timeStr };
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

            setMeasurements(prev => {
               // Sprawdź czy ostatni element ma ten sam timestamp, aby uniknąć duplikatów
               if (prev.length > 0) {
                   const lastItem = prev[prev.length - 1];
                   if (lastItem.timestamp === newPoint.timestamp) {
                       return prev;
                   }
               }
               
               const newHistory = [...prev, { ...newPoint, time: timestamp }];
               return newHistory; 
            });
         }
      }
    } catch (error) {
      console.error("Błąd pobierania danych:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Wstępne pobranie całej historii
    fetchData('all');
    // Odpytywanie o najnowszy co 2 sekundy (użytkownik tak ustawił)
    const interval = setInterval(() => fetchData('last'), 2000);
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
