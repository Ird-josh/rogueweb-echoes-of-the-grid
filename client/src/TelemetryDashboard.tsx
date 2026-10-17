import React, { useState } from 'react';

const MOCK_DATA = [
  { id: 'P001', level: 5, kills: 12, time: '12m', inventory: 'Sword, Potion' },
  { id: 'P002', level: 2, kills: 3, time: '5m', inventory: 'Dagger' },
  { id: 'P003', level: 10, kills: 45, time: '30m', inventory: 'Magic Staff, Cape' },
  { id: 'P004', level: 1, kills: 0, time: '1m', inventory: 'None' },
  { id: 'P005', level: 8, kills: 22, time: '20m', inventory: 'Shield, Hammer' },
];

interface TelemetryDashboardProps {
  onClose: () => void;
}

const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({ onClose }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;
  const totalPages = Math.ceil(MOCK_DATA.length / itemsPerPage);

  const displayedData = MOCK_DATA.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{
      position: 'absolute', top: '10%', left: '10%', width: '80%', height: '80%',
      backgroundColor: '#222', color: 'white', padding: '2rem', zIndex: 2000,
      borderRadius: '8px', border: '1px solid #444', fontFamily: 'sans-serif'
    }}>
      <h2>Game Telemetry Dashboard</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #555' }}>
            <th>Player ID</th><th>Level Reached</th><th>Enemies Killed</th><th>Time Played</th><th>Inventory</th>
          </tr>
        </thead>
        <tbody>
          {displayedData.map(row => (
            <tr key={row.id} style={{ borderBottom: '1px solid #333', textAlign: 'center' }}>
              <td>{row.id}</td><td>{row.level}</td><td>{row.kills}</td><td>{row.time}</td><td>{row.inventory}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <button onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Previous</button>
        <span>Page {currentPage} of {totalPages}</span>
        <button onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages}>Next</button>
      </div>
      <button onClick={onClose} style={{ marginTop: '2rem' }}>Close Dashboard</button>
    </div>
  );
};

export default TelemetryDashboard;
