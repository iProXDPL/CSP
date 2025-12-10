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
  // Pobierz najnowsze wartości z oryginalnych danych (niezależnie od filtra)
  const latest = data.length > 0 ? data[data.length - 1] : { temperature: '--', humidity: '--' };

  // Dane do wykresu - wszystkie dane
  const chartData = data;

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

      <div className="dashboard-grid">
        <div className="card graph-container" style={{ gridColumn: 'span 2' }}>
          <h3 className="metric-label" style={{ marginBottom: '1rem' }}>Temperature</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" tick={<CustomAxisTick />} height={80} axisLine={true} tickLine={false} />
              <YAxis stroke="#64748b" tickMargin={10} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="temperature" name="Temperatura" stroke="#d97706" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="predictedTemperature" name="Predykcja" stroke="#d97706" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              <Brush dataKey="time" height={30} stroke="#d97706" fill="#f1f5f9" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card graph-container" style={{ gridColumn: 'span 2' }}>
          <h3 className="metric-label" style={{ marginBottom: '1rem' }}>Humidity</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="time" stroke="#64748b" tick={<CustomAxisTick />} height={80} axisLine={true} tickLine={false} />
              <YAxis stroke="#64748b" tickMargin={10} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="humidity" name="Wilgotność" stroke="#0891b2" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="predictedHumidity" name="Predykcja" stroke="#0891b2" strokeDasharray="5 5" dot={false} strokeWidth={2} />
              <Brush dataKey="time" height={30} stroke="#0891b2" fill="#f1f5f9" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
