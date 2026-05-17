import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Lightbulb, Power, Clock, Home } from 'lucide-react';

// --- 1. THE PREMIUM REMOTE CONTROL ---
function RemoteControl() {
  const [isOn, setIsOn] = useState(false);
  const [lastActive, setLastActive] = useState('Never');
  const [isLoading, setIsLoading] = useState(false);
  
  // REPLACE WITH YOUR ACTUAL IP
  const apiUrl = 'smart-home-api-production.up.railway.app/api/light'; 

  useEffect(() => {
    fetch(`${apiUrl}/status`)
      .then(res => res.json())
      .then(data => {
          setIsOn(data.is_on);
          setLastActive(data.last_active || 'Never');
      })
      .catch(err => console.error("API error", err));
  }, []);

  const toggleLight = async () => {
    setIsLoading(true);
    try {
        const response = await fetch(`${apiUrl}/toggle`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        setIsOn(data.is_on);
        setLastActive(data.last_active);
    } catch (error) {
        console.error("Failed to toggle", error);
    } finally {
        setIsLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>My Home</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Smart Light Control</p>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#1e293b', borderRadius: '50%' }}>
          <Home size={24} color="#38bdf8" />
        </div>
      </div>

      {/* Smart Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        
        {/* Living Room Light Card */}
        <div 
          onClick={!isLoading ? toggleLight : undefined}
          style={{ 
            backgroundColor: isOn ? '#38bdf8' : '#1e293b',
            borderRadius: '24px', padding: '24px', cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: isOn ? '0 10px 25px -5px rgba(56, 189, 248, 0.4)' : 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Lightbulb size={32} color={isOn ? '#ffffff' : '#64748b'} strokeWidth={isOn ? 2.5 : 2} />
            <div style={{ 
              backgroundColor: isOn ? 'rgba(255,255,255,0.2)' : '#334155', 
              padding: '8px', borderRadius: '50%' 
            }}>
              <Power size={20} color={isOn ? '#ffffff' : '#94a3b8'} />
            </div>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: isOn ? 'white' : '#f8fafc' }}>Living Room</h2>
            <p style={{ margin: 0, fontSize: '14px', color: isOn ? '#e0f2fe' : '#94a3b8', fontWeight: '500' }}>
              {isLoading ? 'Syncing...' : (isOn ? 'ON' : 'OFF')}
            </p>
          </div>
        </div>

      </div>

      {/* Activity Log */}
      <div style={{ marginTop: '40px', backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <Clock size={20} color="#94a3b8" style={{ marginRight: '10px' }} />
          <h3 style={{ margin: 0, fontSize: '16px', color: '#e2e8f0' }}>System Activity</h3>
        </div>
        <div style={{ borderLeft: '2px solid #334155', paddingLeft: '15px', marginLeft: '10px' }}>
          <p style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '15px' }}>State changed to {isOn ? 'ON' : 'OFF'}</p>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{lastActive}</p>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <Link to="/room" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}>Go to Room Simulator →</Link>
      </div>

    </div>
  );
}

// --- 2. THE ROOM VIEW (For your Laptop Display) ---
function RoomView() {
  const [isOn, setIsOn] = useState(false);
  const apiUrl = 'smart-home-api-production.up.railway.app/api/light'; // REPLACE WITH ACTUAL IP

  useEffect(() => {
    const interval = setInterval(() => {
        fetch(`${apiUrl}/status`)
          .then(res => res.json())
          .then(data => setIsOn(data.is_on))
          .catch(err => console.error("API error", err));
    }, 1000); 
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ 
        minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        backgroundColor: isOn ? '#fef08a' : '#0f172a',
        transition: 'background-color 0.5s ease-in-out'
    }}>
      <Lightbulb size={120} color={isOn ? '#ca8a04' : '#334155'} style={{ marginBottom: '20px', filter: isOn ? 'drop-shadow(0 0 30px #facc15)' : 'none' }} />
      <h1 style={{ fontSize: '3rem', fontWeight: 'bold', color: isOn ? '#ca8a04' : '#475569', margin: 0 }}>
        {isOn ? 'ROOM IS LIT' : 'ROOM IS DARK'}
      </h1>
    </div>
  );
}

// --- 3. THE APP ROUTER ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RemoteControl />} />
        <Route path="/room" element={<RoomView />} />
      </Routes>
    </BrowserRouter>
  );
}