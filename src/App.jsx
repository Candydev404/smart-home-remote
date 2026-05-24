import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Lightbulb, Power, Clock, Home, AlarmClock, Trash2 } from 'lucide-react';
import BudgetWidget from './components/BudgetWidget';

// --- 1. THE PREMIUM REMOTE CONTROL (V2) ---
function RemoteControl() {
  const [isOn, setIsOn] = useState(false);
  const [lastActive, setLastActive] = useState('Never');
  const [isLoading, setIsLoading] = useState(false);
  
  // Budget State
  const [energySpend, setEnergySpend] = useState(0); 
  const budgetLimit = 5000; 

  // --- NEW: Scheduler State ---
  const [schedules, setSchedules] = useState([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleAction, setScheduleAction] = useState('off');
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Base URL
  const baseUrl = 'https://smart-home-api-production.up.railway.app/api'; 

  const fetchSystemData = async () => {
    try {
      // 1. Fetch Light Status
      const lightRes = await fetch(`${baseUrl}/light/status`);
      const lightData = await lightRes.json();
      setIsOn(lightData.is_on);
      setLastActive(lightData.last_active || 'Never');

      // 2. Fetch Live Budget
      const budgetRes = await fetch(`${baseUrl}/budget/current`);
      const budgetData = await budgetRes.json();
      setEnergySpend(budgetData.current_spend);

      // 3. NEW: Fetch Active Schedules
      const scheduleRes = await fetch(`${baseUrl}/schedules`);
      const scheduleData = await scheduleRes.json();
      setSchedules(scheduleData);
      
    } catch (err) {
      console.error("API Connection Error:", err);
    }
  };

  useEffect(() => {
    fetchSystemData();
  }, []);

  const toggleLight = async () => {
    setIsLoading(true);
    try {
        const response = await fetch(`${baseUrl}/light/toggle`, {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        setIsOn(data.is_on);
        setLastActive(data.last_active);
        fetchSystemData();
    } catch (error) {
        console.error("Failed to toggle", error);
    } finally {
        setIsLoading(false);
    }
  };

  // --- NEW: Scheduler Functions ---
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleTime) return;
    
    setIsScheduling(true);
    try {
        const response = await fetch(`${baseUrl}/schedules`, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
               'Content-Type': 'application/json' 
              },
            body: JSON.stringify({ action: scheduleAction, scheduled_time: scheduleTime })
        });

        const data = await response.json();

        //If Lavarel rejects the data, pop up an alert on your phone!
        if (!response.ok)  {
          alert("Backend Error: + JSON.stringify(data");
          console.error("Error payload:", data);
        } else {
          // Success! Refresh the list and clear the input
        fetchSystemData();
        setScheduleTime('');
        }
      } catch (error) {
        alert("Network Error: Check your terminal.");
        Console.error("Failed to set schedule", error);
      } finally {
        setIsScheduling(false);
      }
  };

  const handleDeleteSchedule = async (id) => {
    try {
        await fetch(`${baseUrl}/schedules/${id}`, { method: 'DELETE' });
        fetchSystemData(); // Refresh the list
    } catch (error) {
        console.error("Failed to delete schedule", error);
    }
  };

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

      {/* --- INJECTED V2 BUDGET WIDGET --- */}
      <div style={{ marginTop: '20px' }}>
        <BudgetWidget 
          currentSpend={energySpend} 
          budgetLimit={budgetLimit} 
        />
      </div>

      {/* --- INJECTED V2 SCHEDULER WIDGET --- */}
      <div style={{ marginTop: '20px', backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
        
        {/* Scheduler Header */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <AlarmClock size={20} color="#38bdf8" style={{ marginRight: '10px' }} />
          <h3 style={{ margin: 0, fontSize: '18px', color: 'white', fontWeight: 'bold' }}>Automated Routines</h3>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAddSchedule} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <input 
            type="time" 
            value={scheduleTime} 
            onChange={(e) => setScheduleTime(e.target.value)} 
            required 
            style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', flex: 1, outline: 'none' }} 
            // Color scheme to ensure the clock icon on mobile doesn't hide
            color-scheme="dark"
          />
          <select 
            value={scheduleAction} 
            onChange={(e) => setScheduleAction(e.target.value)} 
            style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', outline: 'none' }}
          >
            <option value="on">Turn ON</option>
            <option value="off">Turn OFF</option>
          </select>
          <button 
            type="submit" 
            disabled={isScheduling} 
            style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {isScheduling ? '...' : 'Set'}
          </button>
        </form>

        {/* Active Schedules List */}
        <div>
          {schedules.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0, textAlign: 'center', padding: '10px' }}>No active routines.</p>
          ) : (
            schedules.map((sched) => (
              <div key={sched.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#334155', padding: '12px 16px', borderRadius: '12px', marginBottom: '10px' }}>
                <div>
                  <p style={{ margin: 0, color: 'white', fontWeight: 'bold', fontSize: '15px' }}>
                    Turn {sched.action.toUpperCase()}
                  </p>
                  <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} /> {sched.scheduled_time.substring(0, 5)}
                  </p>
                </div>
                <button 
                  onClick={() => handleDeleteSchedule(sched.id)} 
                  style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                >
                  <Trash2 size={18} color="#ef4444" />
                </button>
              </div>
            ))
          )}
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
  const apiUrl = 'https://smart-home-api-production.up.railway.app/api';

  useEffect(() => {
    const interval = setInterval(() => {
        fetch(`${apiUrl}/light/status`)
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