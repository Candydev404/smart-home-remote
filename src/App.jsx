import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { Lightbulb, Power, Clock, Home, AlarmClock, Trash2, Shield, User, Radio, Mic } from 'lucide-react';
import BudgetWidget from './components/BudgetWidget';

// --- 1. THE COMMAND CENTER (With Jarvis Voice Control) ---
function RemoteControl() {
  const [isOn, setIsOn] = useState(false);
  const [lastActive, setLastActive] = useState('Never');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false); // Jarvis State
  
  // Budget & Scheduler State
  const [energySpend, setEnergySpend] = useState(0); 
  const budgetLimit = 5000; 
  const [schedules, setSchedules] = useState([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleAction, setScheduleAction] = useState('off');
  const [isScheduling, setIsScheduling] = useState(false);

  // RBAC Security State
  const [userRole, setUserRole] = useState(() => {
      // Check local storage first. If nothing is there, default to 'Admin'
      return localStorage.getItem('smartHomeRole') || 'Admin';
  }); 
  
  const baseUrl = 'https://smart-home-api-production.up.railway.app/api'; 
  const apiHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-User-Role': userRole };

  const fetchSystemData = async () => {
    try {
      const lightRes = await fetch(`${baseUrl}/light/status`, { headers: apiHeaders });
      if (lightRes.ok) {
        const lightData = await lightRes.json();
        setIsOn(lightData.is_on);
        setLastActive(lightData.last_active || 'Never');
      }

      if (userRole === 'Admin') {
        const budgetRes = await fetch(`${baseUrl}/budget/current`, { headers: apiHeaders });
        if (budgetRes.ok) {
          const budgetData = await budgetRes.json();
          setEnergySpend(budgetData.current_spend);
        }
      }

      const scheduleRes = await fetch(`${baseUrl}/schedules`, { headers: apiHeaders });
      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        setSchedules(scheduleData);
      }
    } catch (err) {
      console.error("API Connection Error:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem('smartHomeRole', userRole);
  }, [userRole]);

  const toggleLight = async () => {
    setIsLoading(true);
    try {
        const response = await fetch(`${baseUrl}/light/toggle`, { method: 'POST', headers: apiHeaders });
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

  // --- THE JARVIS ENGINE (Voice Control) ---
  const activateJarvis = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice control requires Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = async (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      
      // Artificial Intelligence Logic
      if (command.includes('turn on') || command.includes('light on')) {
        if (!isOn) await toggleLight(); // Only toggle if it's currently OFF
      } 
      else if (command.includes('turn off') || command.includes('light off')) {
        if (isOn) await toggleLight(); // Only toggle if it's currently ON
      } 
      else {
        alert(`Jarvis heard: "${command}". Try saying "Turn on the light" or "Turn off the light".`);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  // --- Scheduler Functions ---
  const handleAddSchedule = async (e) => {
    e.preventDefault();
    if (!scheduleTime) return;
    setIsScheduling(true);
    try {
        const response = await fetch(`${baseUrl}/schedules`, {
            method: 'POST', headers: apiHeaders,
            body: JSON.stringify({ action: scheduleAction, scheduled_time: scheduleTime })
        });
        const data = await response.json();
        if (!response.ok) alert("Security Blocked This: " + (data.message || JSON.stringify(data)));
        else { fetchSystemData(); setScheduleTime(''); }
    } catch (error) { alert("Network Error."); } finally { setIsScheduling(false); }
  };

  const handleDeleteSchedule = async (id) => {
    try {
        const response = await fetch(`${baseUrl}/schedules/${id}`, { method: 'DELETE', headers: apiHeaders });
        if (!response.ok) {
          const data = await response.json(); alert("Security Error: " + data.message);
        } else { fetchSystemData(); }
    } catch (error) { console.error("Failed to delete", error); }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* Profile Switcher Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', marginTop: '10px', padding: '15px', backgroundColor: '#1e293b', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {userRole === 'Admin' ? <Shield color="#22c55e" size={24} /> : <User color="#94a3b8" size={24} />}
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Profile</p>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: userRole === 'Admin' ? '#22c55e' : 'white' }}>{userRole} Mode</h2>
          </div>
        </div>
        <button onClick={() => setUserRole(userRole === 'Admin' ? 'Guest' : 'Admin')} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', cursor: 'pointer', fontSize: '14px' }}>
          Switch to {userRole === 'Admin' ? 'Guest' : 'Admin'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Command Center</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>Smart Home Control</p>
        </div>
        
        {/* --- JARVIS VOICE BUTTON --- */}
        <button 
          onClick={activateJarvis}
          style={{
            backgroundColor: isListening ? '#ef4444' : '#3b82f6',
            border: 'none', borderRadius: '50%', padding: '15px', cursor: 'pointer',
            boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : '0 0 10px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.3s ease', animation: isListening ? 'pulse 1s infinite' : 'none'
          }}
        >
          <Mic color="white" size={24} />
        </button>
      </div>

      {/* Smart Card Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <div 
          onClick={!isLoading ? toggleLight : undefined}
          style={{ 
            backgroundColor: isOn ? '#38bdf8' : '#1e293b',
            borderRadius: '24px', padding: '24px', cursor: 'pointer',
            transition: 'all 0.3s ease', boxShadow: isOn ? '0 10px 25px -5px rgba(56, 189, 248, 0.4)' : 'none',
            display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '140px', position: 'relative'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Lightbulb size={32} color={isOn ? '#ffffff' : '#64748b'} strokeWidth={isOn ? 2.5 : 2} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isLoading && <div style={{ animation: 'pulse 1s infinite' }}><Radio size={20} color={isOn ? '#ffffff' : '#38bdf8'} /></div>}
              <div style={{ backgroundColor: isOn ? 'rgba(255,255,255,0.2)' : '#334155', padding: '8px', borderRadius: '50%' }}>
                <Power size={20} color={isOn ? '#ffffff' : '#94a3b8'} />
              </div>
            </div>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: isOn ? 'white' : '#f8fafc' }}>Living Room</h2>
            <p style={{ margin: 0, fontSize: '14px', color: isOn ? '#e0f2fe' : '#94a3b8', fontWeight: '500' }}>
              {isLoading ? 'Transmitting...' : (isOn ? 'STATE: ON' : 'STATE: OFF')}
            </p>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div style={{ marginTop: '30px', backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
          <Clock size={20} color="#94a3b8" style={{ marginRight: '10px' }} />
          <h3 style={{ margin: 0, fontSize: '16px', color: '#e2e8f0' }}>System Activity</h3>
        </div>
        <div style={{ borderLeft: '2px solid #334155', paddingLeft: '15px', marginLeft: '10px' }}>
          <p style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '15px' }}>State changed to {isOn ? 'ON' : 'OFF'}</p>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{lastActive}</p>
        </div>
      </div>

      {/* Admin Protected Widgets */}
      {userRole === 'Admin' && (
        <div style={{ marginTop: '20px' }}>
          <BudgetWidget currentSpend={energySpend} budgetLimit={budgetLimit} />
        </div>
      )}

      {/* Scheduler Widget */}
      <div style={{ marginTop: '20px', backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
          <AlarmClock size={20} color="#38bdf8" style={{ marginRight: '10px' }} />
          <h3 style={{ margin: 0, fontSize: '18px', color: 'white', fontWeight: 'bold' }}>Automated Routines</h3>
        </div>
        {userRole === 'Admin' ? (
          <form onSubmit={handleAddSchedule} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', flex: 1, outline: 'none' }} color-scheme="dark" />
            <select value={scheduleAction} onChange={(e) => setScheduleAction(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', outline: 'none' }}>
              <option value="on">Turn ON</option>
              <option value="off">Turn OFF</option>
            </select>
            <button type="submit" disabled={isScheduling} style={{ padding: '12px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#38bdf8', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>{isScheduling ? '...' : 'Set'}</button>
          </form>
        ) : (
          <p style={{ color: '#ef4444', fontSize: '13px', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>Restricted: Only Admins can create routines.</p>
        )}
        <div>
          {schedules.map((sched) => (
            <div key={sched.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#334155', padding: '12px 16px', borderRadius: '12px', marginBottom: '10px' }}>
              <div>
                <p style={{ margin: 0, color: 'white', fontWeight: 'bold', fontSize: '15px' }}>Turn {sched.action.toUpperCase()}</p>
                <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={12} /> {sched.scheduled_time.substring(0, 5)}</p>
              </div>
              {userRole === 'Admin' && (
                <button onClick={() => handleDeleteSchedule(sched.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}><Trash2 size={18} color="#ef4444" /></button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <Link to="/room" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}>Open Hardware Receiver →</Link>
      </div>
      
      <style>{`@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

// --- 2. THE HARDWARE RECEIVER SIMULATOR (/room) ---
function RoomView() {
  const [isOn, setIsOn] = useState(false);
  const [logs, setLogs] = useState(["📡 SYSTEM BOOT: LISTENING ON PORT 80..."]);
  const apiUrl = 'https://smart-home-api-production.up.railway.app/api';

  const playBeep = (type) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      const oscillator = audioCtx.createOscillator();
      oscillator.type = 'square'; 
      oscillator.frequency.setValueAtTime(type === 'ON' ? 1000 : 500, audioCtx.currentTime);
      oscillator.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3); 
    } catch (e) {
      console.log("Audio requires user interaction first.");
    }
  };

  const addLog = (message) => {
    setLogs(prev => {
      const newLogs = [...prev, `[${new Date().toLocaleTimeString()}] ${message}`];
      return newLogs.slice(-8); 
    });
  };

  useEffect(() => {
    let previousState = null; 

    const interval = setInterval(() => {
        fetch(`${apiUrl}/light/status`)
          .then(res => res.json())
          .then(data => {
              if (previousState !== null && data.is_on !== previousState) {
                  if (data.is_on) {
                      addLog("[+] SIGNAL INTERCEPTED: 220V RELAY ENERGIZED -> LIGHT ON");
                      playBeep('ON');
                  } else {
                      addLog("[-] SIGNAL INTERCEPTED: RELAY DISCONNECTED -> LIGHT OFF");
                      playBeep('OFF');
                  }
              }
              previousState = data.is_on;
              setIsOn(data.is_on);
          })
          .catch(err => console.error("API error", err));
    }, 1000); 

    return () => clearInterval(interval);
  }, []);

  const handleUnlockAudio = () => {
    addLog("🔊 AUDIO ENGINE UNLOCKED. AWAITING SIGNALS...");
    playBeep('OFF');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a', fontFamily: 'monospace' }}>
      <div style={{ 
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
          backgroundColor: isOn ? '#fef08a' : '#1e293b', transition: 'background-color 0.1s ease-in-out',
          borderBottom: '4px solid #334155', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: isOn ? '#ca8a04' : '#64748b' }}>
          <span style={{ animation: 'pulse 1s infinite' }}>● REC</span>
        </div>
        <Lightbulb size={120} color={isOn ? '#ca8a04' : '#0f172a'} style={{ filter: isOn ? 'drop-shadow(0 0 50px #facc15)' : 'none' }} />
      </div>

      <div style={{ height: '300px', backgroundColor: '#000000', padding: '20px', color: '#22c55e', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #22c55e', paddingBottom: '10px', marginBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', textTransform: 'uppercase' }}>Terminal | Hardware Receiver Sim</h3>
          <button onClick={handleUnlockAudio} style={{ backgroundColor: '#22c55e', color: 'black', border: 'none', padding: '5px 10px', cursor: 'pointer', fontWeight: 'bold' }}>
            INIT AUDIO
          </button>
        </div>
        <div style={{ fontSize: '14px', lineHeight: '1.6' }}>
          {logs.map((log, index) => <div key={index}>{log}</div>)}
          <div style={{ animation: 'blink 1s infinite' }}>_</div>
        </div>
      </div>
      <style>{`@keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }`}</style>
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