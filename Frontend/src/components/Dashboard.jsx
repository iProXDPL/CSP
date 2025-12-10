import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Brush } from 'recharts';


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const labelParts = label ? label.split('\n') : [];
    return (
      <div className="card" style={{ padding: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#ffffff' }}>
        {labelParts.map((part, index) => (
          <p key={index} className="metric-label" style={{ margin: 0, lineHeight: 1.2, color: '#64748b' }}>
            {part}
          </p>
        ))}
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color, margin: '4px 0 0 0', fontSize: '0.9rem', fontWeight: 500 }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CustomAxisTick = ({ x, y, stroke, payload }) => {
  if (!payload || !payload.value) return null;
  const parts = payload.value.split('\n');
  const dateStr = parts[0] || '';
  const timeStr = parts.length > 1 ? parts[1] : '';
  
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={9} dy={25} textAnchor="middle" fill="#64748b" fontSize={12}>
        <tspan x="0" dy="0">{timeStr}</tspan>
        <tspan x="0" dy="14">{dateStr}</tspan>
      </text>
    </g>
  );
};

export const Dashboard = ({ data }) => {
  // Stan przechowujący dane aktualnie wyświetlane na wykresie.
  // Jeśli użytkownik przegląda historię, nie aktualizujemy tego stanu, 
  // dzięki czemu wykres nie skacze/resetuje się przy nowych danych.
  const [displayedData, setDisplayedData] = useState(data);

  // Pobierz najnowsze wartości z oryginalnych danych (niezależnie od filtra) - nagłówek zawsze pokazuje LIVE
  const latest = data.length > 0 ? data[data.length - 1] : { temperature: '--', humidity: '--' };

  // Niezależne stany Brusha dla każdego wykresu
  const [tempBrush, setTempBrush] = useState({});
  const [humidBrush, setHumidBrush] = useState({});

  /* Refy pomocnicze */
  const ignoreReset = React.useRef(false); 

  // Funkcja sprawdzająca czy jesteśmy "na żywo" (na końcu wykresu)
  const isViewLive = (brushState, currentDataLength) => {
    if (!brushState.endIndex) return true;
    if (brushState.endIndex >= currentDataLength - 2) return true;
    return false;
  };

  // Helper do przesuwania oknem (Slide)
  const shiftBrush = (prev, diff) => {
    if (prev.startIndex !== undefined && prev.endIndex !== undefined) {
      return {
        ...prev,
        startIndex: prev.startIndex + diff,
        endIndex: prev.endIndex + diff
      };
    }
    return prev;
  };

  // Efekt synchronizacji danych (Live Mode auto-update)
  React.useEffect(() => {
    const tempLive = isViewLive(tempBrush, displayedData.length);
    const humidLive = isViewLive(humidBrush, displayedData.length);

    // Jeśli wszystko jest LIVE i są nowe dane -> aktualizuj i PRZESUŃ okno
    if (tempLive && humidLive && data.length > displayedData.length) {
       const diff = data.length - displayedData.length;
       
       // 1. Zabezpiecz przed resetem
       ignoreReset.current = true;
       setTimeout(() => { ignoreReset.current = false; }, 200);

       // 2. Przesuń okna (Slide), żeby pokazać nowe dane
       setTempBrush(prev => shiftBrush(prev, diff));
       setHumidBrush(prev => shiftBrush(prev, diff));
       
       // 3. Zaktualizuj dane
       setDisplayedData(data);
    }
    // Jeśli nie live -> ignoruj nowe dane
  }, [data, displayedData.length]); // Zależność tylko od danych


  // Handler dla Brush - Temperatura
  const handleTempBrushChange = (domain) => {
    // Ochrona przed fałszywym resetem przy update
    if (ignoreReset.current) {
        // Jeśli dostajemy pełny zakres (0 do N), a mieliśmy zooma -> ignoruj
        if (domain.startIndex === 0 && domain.endIndex === displayedData.length - 1) {
            if (tempBrush.startIndex !== undefined && tempBrush.startIndex > 0) return;
        }
    }

    if (domain) {
      setTempBrush(prev => {
        if (prev.startIndex === domain.startIndex && prev.endIndex === domain.endIndex) return prev;
        return domain;
      });

      // Mechanizm "Catch Up": Jeśli użytkownik ręcznie doszedł do końca
      if (domain.endIndex && domain.endIndex >= displayedData.length - 1) {
         if (data.length > displayedData.length) {
             const diff = data.length - displayedData.length;
             
             ignoreReset.current = true;
             setTimeout(() => { ignoreReset.current = false; }, 200);

             setTempBrush(prev => shiftBrush(prev, diff));
             setDisplayedData(data);
         }
      }
    }
  };

  // Handler dla Brush - Wilgotność
  const handleHumidBrushChange = (domain) => {
    if (ignoreReset.current) {
        if (domain.startIndex === 0 && domain.endIndex === displayedData.length - 1) {
            if (humidBrush.startIndex !== undefined && humidBrush.startIndex > 0) return;
        }
    }

    if (domain) {
      setHumidBrush(prev => {
        if (prev.startIndex === domain.startIndex && prev.endIndex === domain.endIndex) return prev;
        return domain;
      });

      if (domain.endIndex && domain.endIndex >= displayedData.length - 1) {
         if (data.length > displayedData.length) {
             const diff = data.length - displayedData.length;
             ignoreReset.current = true;
             setTimeout(() => { ignoreReset.current = false; }, 200);

             setHumidBrush(prev => shiftBrush(prev, diff));
             setDisplayedData(data);
         }
      }
    }
  };

  return (
    <div>
      <div className="dashboard-grid">
        <div className="card">
          <div className="metric-label">Temperature</div>
          <div className="metric-value temp-val">{latest.temperature}°C</div>
        </div>
        <div className="card">
          <div className="metric-label">Humidity</div>
          <div className="metric-value humid-val">{latest.humidity}%</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card graph-container">
          <h3 className="metric-label" style={{ marginBottom: '1rem' }}>Temperature</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={displayedData} margin={{ top: 10, right: 10, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" tick={<CustomAxisTick />} height={80} axisLine={true} tickLine={false} />
              <YAxis stroke="#64748b" tickMargin={10} />
              <Tooltip content={<CustomTooltip />} />
              <Line isAnimationActive={false} type="monotone" dataKey="temperature" name="Temperatura" stroke="#d97706" dot={false} strokeWidth={2} />
              <Line isAnimationActive={false} type="monotone" dataKey="predictedTemperature" name="Predykcja" stroke="#d97706" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke="#d97706" 
                fill="#f1f5f9"
                startIndex={tempBrush.startIndex}
                endIndex={tempBrush.endIndex}
                onChange={handleTempBrushChange}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card graph-container">
          <h3 className="metric-label" style={{ marginBottom: '1rem' }}>Humidity</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={displayedData} margin={{ top: 10, right: 10, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" tick={<CustomAxisTick />} height={80} axisLine={true} tickLine={false} />
              <YAxis stroke="#64748b" tickMargin={10} />
              <Tooltip content={<CustomTooltip />} />
              <Line isAnimationActive={false} type="monotone" dataKey="humidity" name="Wilgotność" stroke="#0891b2" dot={false} strokeWidth={2} />
              <Line isAnimationActive={false} type="monotone" dataKey="predictedHumidity" name="Predykcja" stroke="#0891b2" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke="#0891b2" 
                fill="#f1f5f9"
                startIndex={humidBrush.startIndex}
                endIndex={humidBrush.endIndex}
                onChange={handleHumidBrushChange}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
