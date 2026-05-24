import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Lightbulb, Power, Clock, AlarmClock, Trash2, Shield, User, Radio, Mic, MicOff, BookOpen, ChevronLeft, GraduationCap, Settings, ShieldCheck } from 'lucide-react';
import BudgetWidget from './components/BudgetWidget';

const colorMap = {
  'red': '#ef4444',
  'blue': '#3b82f6',
  'green': '#22c55e',
  'purple': '#a855f7',
  'yellow': '#facc15',
  'white': '#ffffff'
};

// --- 1. THE COMMAND CENTER ---
function RemoteControl() {
  const [isOn, setIsOn] = useState(false);
  const [lightColor, setLightColor] = useState(colorMap['yellow']); 
  const [lastActive, setLastActive] = useState('Never');
  const [isLoading, setIsLoading] = useState(false);
  
  // Voice Engine States
  const [isListening, setIsListening] = useState(false); 
  const [isAwake, setIsAwake] = useState(false); 
  
  const recognitionRef = useRef(null);
  const aiAwakeRef = useRef(false);
  const isListeningRef = useRef(false);
  
  const [energySpend, setEnergySpend] = useState(0); 
  const budgetLimit = 5000; 
  const [schedules, setSchedules] = useState([]);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleAction, setScheduleAction] = useState('off');
  const [isScheduling, setIsScheduling] = useState(false);

  const [userRole, setUserRole] = useState(() => localStorage.getItem('smartHomeRole') || 'Admin');
  const [showScanner, setShowScanner] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState('AWAITING INPUT');
  
  const baseUrl = 'https://smart-home-api-production.up.railway.app/api'; 
  const apiHeaders = { 'Accept': 'application/json', 'Content-Type': 'application/json', 'X-User-Role': userRole };

  // --- THE NEW CLOUD COLOR SYNC ---
  const changeColor = async (hexCode) => {
    setLightColor(hexCode);
    try {
      await fetch(`${baseUrl}/light/color`, {
        method: 'POST',
        headers: apiHeaders,
        body: JSON.stringify({ color: hexCode })
      });
    } catch (e) {
      console.error("Failed to sync color to cloud");
    }
  };

  const fetchSystemData = async () => {
    try {
      // Fetch Power
      const lightRes = await fetch(`${baseUrl}/light/status`, { headers: apiHeaders });
      if (lightRes.ok) {
        const lightData = await lightRes.json();
        setIsOn(lightData.is_on);
        setLastActive(lightData.last_active || 'Never');
      }
      
      // Fetch Current Cloud Color
      const colorRes = await fetch(`${baseUrl}/light/color`, { headers: apiHeaders });
      if (colorRes.ok) {
        const colorData = await colorRes.json();
        if (colorData.color) setLightColor(colorData.color);
      }

      if (userRole === 'Admin') {
        const budgetRes = await fetch(`${baseUrl}/budget/current`, { headers: apiHeaders });
        if (budgetRes.ok) setEnergySpend((await budgetRes.json()).current_spend);
      }
      const scheduleRes = await fetch(`${baseUrl}/schedules`, { headers: apiHeaders });
      if (scheduleRes.ok) setSchedules(await scheduleRes.json());
    } catch (err) { console.error("API Error:", err); }
  };

  useEffect(() => {
    fetchSystemData();
    localStorage.setItem('smartHomeRole', userRole);
  }, [userRole]);

  const toggleLight = async () => {
    setIsLoading(true);
    try {
        const response = await fetch(`${baseUrl}/light/toggle`, { method: 'POST', headers: apiHeaders });
        const data = await response.json();
        setIsOn(data.is_on); setLastActive(data.last_active); fetchSystemData();
    } catch (error) { console.error(error); } finally { setIsLoading(false); }
  };

  const playVoiceResponse = (intent) => {
    const audioMap = { 'intro': '/intro.mp3', 'turn_on': '/turn_on.mp3', 'turn_off': '/turn_off.mp3', 'error': '/error.mp3', 'developer': '/developer.mp3', 'tech_stack': '/tech_stack.mp3', 'security': '/security.mp3', 'budget': '/budget.mp3', 'greeting': '/greeting.mp3', 'automation': '/automation.mp3', 'shut_down': '/shutdown.mp3' };
    if (audioMap[intent]) new Audio(audioMap[intent]).play().catch(() => {});
  };

  const setAwakeState = (state) => { setIsAwake(state); aiAwakeRef.current = state; };
  const setListeningState = (state) => { setIsListening(state); isListeningRef.current = state; };

  const toggleVoiceEngine = () => {
    if (isListeningRef.current) {
      setListeningState(false); setAwakeState(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Voice control requires Google Chrome.");
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US'; 
    recognition.continuous = true; 
    recognition.interimResults = false;
    
    recognition.onstart = () => {
      setListeningState(true); setAwakeState(true); 
      console.log("Mic is LIVE. AI is Awake.");
    };
    
    recognition.onresult = async (event) => {
      const command = event.results[event.resultIndex][0].transcript.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()']/g, "").trim();
      console.log(`🎤 HEARD: "${command}"`);

      if (!aiAwakeRef.current) {
        if (command.includes('wake up') || command.includes('hello') || command.includes('fuad') || command.includes('hey') || command.includes('buddy') || command.includes('how far') || command.includes('wagwan')) {
          setAwakeState(true); playVoiceResponse('greeting');
        }
        return; 
      }

      if (command.includes('sleep') || command.includes('standby') || command.includes('stop listening')) {
        setAwakeState(false); playVoiceResponse('shut_down'); return; 
      }

      if (command.includes('shut down system') || command.includes('disable microphone')) {
        setListeningState(false); setAwakeState(false); playVoiceResponse('turn_off'); recognition.stop(); return;
      }

      let colorTriggered = false;
      for (const [colorName, hexCode] of Object.entries(colorMap)) {
        if (command.includes(colorName) && (command.includes('light') || command.includes('color') || command.includes('change') || command.includes('turn'))) {
          await changeColor(hexCode); // Sync to Laravel
          if (!isOn) await toggleLight(); 
          playVoiceResponse('turn_on'); 
          colorTriggered = true;
          break;
        }
      }
      if (colorTriggered) return; 

      if (command.includes('who are you') || command.includes('your name')) playVoiceResponse('intro');
      else if (command.includes('turn on') || command.includes('light on')) { if (!isOn) { await toggleLight(); playVoiceResponse('turn_on'); } } 
      else if (command.includes('turn off') || command.includes('light off') || command.includes('dark')) { if (isOn) { await toggleLight(); playVoiceResponse('turn_off'); } } 
      else if (command.includes('developer') || command.includes('creator') || command.includes('who made you')) playVoiceResponse('developer');
      else if (command.includes('stack') || command.includes('framework') || command.includes('built with')) playVoiceResponse('tech_stack');
      else if (command.includes('security') || command.includes('role') || command.includes('safe')) playVoiceResponse('security');
      else if (command.includes('budget') || command.includes('energy') || command.includes('cost')) playVoiceResponse('budget');
      else if (command.includes('automate') || command.includes('routine') || command.includes('schedule') || command.includes('automation')) playVoiceResponse('automation'); 
      else if (command.length > 3) playVoiceResponse('error');
    };

    recognition.onend = () => {
      if (isListeningRef.current) { try { recognition.start(); } catch (e) {} } 
    };
    recognition.onerror = (e) => { if (e.error === 'not-allowed') { setListeningState(false); setAwakeState(false); } };
    recognition.start();
  };

  const handleAddSchedule = async (e) => { 
    e.preventDefault(); if (!scheduleTime) return; setIsScheduling(true);
    try {
        const response = await fetch(`${baseUrl}/schedules`, { method: 'POST', headers: apiHeaders, body: JSON.stringify({ action: scheduleAction, scheduled_time: scheduleTime }) });
        if (!response.ok) alert("Security Blocked This"); else { fetchSystemData(); setScheduleTime(''); }
    } catch (error) {} finally { setIsScheduling(false); }
  };

  const handleDeleteSchedule = async (id) => { 
    try { await fetch(`${baseUrl}/schedules/${id}`, { method: 'DELETE', headers: apiHeaders }); fetchSystemData(); } catch (error) {}
  };

  const handleRoleSwitchRequest = () => {
    if (userRole === 'Admin') setUserRole('Guest');
    else { setShowScanner(true); setScanStatus('AWAITING INPUT'); setScanProgress(0); }
  };

  useEffect(() => {
    let interval;
    if (scanStatus === 'SCANNING') {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 800;
      osc.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.1);

      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval); setScanStatus('GRANTED');
            const winOsc = ctx.createOscillator(); winOsc.type = 'sine'; winOsc.frequency.value = 1200;
            winOsc.connect(ctx.destination); winOsc.start(); winOsc.stop(ctx.currentTime + 0.5);
            setTimeout(() => { setUserRole('Admin'); setShowScanner(false); }, 1000); 
            return 100;
          }
          return prev + 5; 
        });
      }, 50);
    }
    return () => clearInterval(interval);
  }, [scanStatus]);

  const startScan = () => { if (scanStatus !== 'GRANTED') setScanStatus('SCANNING'); };
  const stopScan = () => {
    if (scanStatus === 'SCANNING') { setScanStatus('DENIED'); setScanProgress(0); setTimeout(() => setScanStatus('AWAITING INPUT'), 1500); }
  };

  const getMicColor = () => {
    if (!isListening) return '#3b82f6'; 
    if (isAwake) return '#ef4444'; 
    return '#f59e0b'; 
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '20px', fontFamily: 'system-ui, sans-serif', position: 'relative', paddingBottom: '80px' }}>
      
      {showScanner && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.95)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)' }}>
          <Shield size={64} color={scanStatus === 'GRANTED' ? '#22c55e' : scanStatus === 'DENIED' ? '#ef4444' : '#38bdf8'} style={{ marginBottom: '20px' }} />
          <h2 style={{ letterSpacing: '2px', margin: 0 }}>AUTHORIZATION REQUIRED</h2>
          <p style={{ color: scanStatus === 'DENIED' ? '#ef4444' : '#94a3b8', height: '20px', fontWeight: 'bold' }}>{scanStatus}</p>
          <div onMouseDown={startScan} onMouseUp={stopScan} onMouseLeave={stopScan} onTouchStart={startScan} onTouchEnd={stopScan} style={{ marginTop: '40px', width: '120px', height: '120px', borderRadius: '50%', border: `4px solid ${scanStatus === 'GRANTED' ? '#22c55e' : '#334155'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden', userSelect: 'none' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${scanProgress}%`, backgroundColor: '#38bdf8', opacity: 0.3, transition: 'height 0.1s linear' }} />
            <User size={48} color={scanProgress > 0 ? '#38bdf8' : '#64748b'} />
          </div>
          <p style={{ marginTop: '30px', color: '#64748b', fontSize: '14px' }}>Press and hold to verify identity</p>
          <button onClick={() => setShowScanner(false)} style={{ marginTop: '40px', background: 'none', border: '1px solid #334155', color: '#94a3b8', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', marginTop: '10px', padding: '15px', backgroundColor: '#1e293b', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {userRole === 'Admin' ? <Shield color="#22c55e" size={24} /> : <User color="#94a3b8" size={24} />}
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Profile</p>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: userRole === 'Admin' ? '#22c55e' : 'white' }}>{userRole} Mode</h2>
          </div>
        </div>
        <button onClick={handleRoleSwitchRequest} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #334155', backgroundColor: '#0f172a', color: 'white', cursor: 'pointer', fontSize: '14px' }}>
          Switch to {userRole === 'Admin' ? 'Guest' : 'Admin'}
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>Command Center</h1>
          <p style={{ margin: 0, color: '#94a3b8' }}>
             {isListening ? (isAwake ? '🟢 Fu\'ad is Awake' : '🟡 Fu\'ad is Asleep') : '🔴 Audio Offline'}
          </p>
        </div>
        <button onClick={toggleVoiceEngine} style={{ backgroundColor: getMicColor(), border: 'none', borderRadius: '50%', padding: '15px', cursor: 'pointer', boxShadow: isListening && isAwake ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none', transition: 'all 0.3s ease', animation: isListening && isAwake ? 'pulse 1s infinite' : 'none' }}>
          {isListening ? <Mic color="white" size={24} /> : <MicOff color="white" size={24} />}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        <div onClick={!isLoading ? toggleLight : undefined} style={{ backgroundColor: isOn ? '#1e293b' : '#0f172a', border: `1px solid ${isOn ? lightColor : '#334155'}`, borderRadius: '24px', padding: '24px', cursor: 'pointer', transition: 'all 0.3s ease', boxShadow: isOn ? `0 10px 30px -5px ${lightColor}66` : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '160px', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Lightbulb size={36} color={isOn ? lightColor : '#64748b'} strokeWidth={isOn ? 2.5 : 2} style={{ filter: isOn ? `drop-shadow(0 0 10px ${lightColor})` : 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isLoading && <div style={{ animation: 'pulse 1s infinite' }}><Radio size={20} color={isOn ? lightColor : '#38bdf8'} /></div>}
              <div style={{ backgroundColor: isOn ? `${lightColor}33` : '#334155', padding: '8px', borderRadius: '50%' }}><Power size={20} color={isOn ? lightColor : '#94a3b8'} /></div>
            </div>
          </div>
          <div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '20px', color: isOn ? 'white' : '#f8fafc' }}>Living Room</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ margin: 0, fontSize: '14px', color: isOn ? '#e0f2fe' : '#94a3b8', fontWeight: '500' }}>{isLoading ? 'Transmitting...' : (isOn ? 'STATE: ON' : 'STATE: OFF')}</p>
              
              <div style={{ display: 'flex', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                {Object.entries(colorMap).map(([name, hex]) => (
                  <div key={name} onClick={() => changeColor(hex)} style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: hex, border: lightColor === hex ? '2px solid white' : '1px solid transparent', cursor: 'pointer', opacity: isOn ? 1 : 0.4 }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: '30px', backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}><Clock size={20} color="#94a3b8" style={{ marginRight: '10px' }} /><h3 style={{ margin: 0, fontSize: '16px', color: '#e2e8f0' }}>System Activity</h3></div>
        <div style={{ borderLeft: '2px solid #334155', paddingLeft: '15px', marginLeft: '10px' }}>
          <p style={{ margin: '0 0 5px 0', color: '#f8fafc', fontSize: '15px' }}>State changed to {isOn ? 'ON' : 'OFF'}</p>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>{lastActive}</p>
        </div>
      </div>

      {userRole === 'Admin' && <div style={{ marginTop: '20px' }}><BudgetWidget currentSpend={energySpend} budgetLimit={budgetLimit} /></div>}

      <div style={{ marginTop: '20px', backgroundColor: '#1e293b', borderRadius: '20px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}><AlarmClock size={20} color="#38bdf8" style={{ marginRight: '10px' }} /><h3 style={{ margin: 0, fontSize: '18px', color: 'white', fontWeight: 'bold' }}>Automated Routines</h3></div>
        {userRole === 'Admin' ? (
          <form onSubmit={handleAddSchedule} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} required style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', flex: 1, outline: 'none' }} color-scheme="dark" />
            <select value={scheduleAction} onChange={(e) => setScheduleAction(e.target.value)} style={{ padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#334155', color: 'white', outline: 'none' }}><option value="on">Turn ON</option><option value="off">Turn OFF</option></select>
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
              {userRole === 'Admin' && <button onClick={() => handleDeleteSchedule(sched.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}><Trash2 size={18} color="#ef4444" /></button>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center', marginTop: '40px' }}>
        <Link to="/guide" style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#334155', padding: '12px 24px', borderRadius: '12px', color: 'white', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <BookOpen size={20} color="#38bdf8" /> Open Voice Command Guide
        </Link>
        <Link to="/room" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '14px', borderBottom: '1px solid #334155', paddingBottom: '2px' }}>
          Developer: Open Hardware Simulator
        </Link>
      </div>

      <style>{`@keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}


// --- 2. THE VOICE COMMAND GUIDE PAGE ---
function UserGuide() {
  const navigate = useNavigate();

  const CommandCard = ({ icon, title, commands, description }) => (
    <div style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '20px', marginBottom: '20px', borderLeft: '4px solid #38bdf8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
        {icon}
        <h3 style={{ margin: 0, fontSize: '18px', color: 'white' }}>{title}</h3>
      </div>
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '15px', lineHeight: '1.5' }}>{description}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {commands.map((cmd, idx) => (
          <span key={idx} style={{ backgroundColor: '#0f172a', color: '#38bdf8', padding: '8px 12px', borderRadius: '8px', fontSize: '14px', fontWeight: '500', fontFamily: 'monospace' }}>
            "{cmd}"
          </span>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '30px', gap: '15px' }}>
        <button onClick={() => navigate('/')} style={{ background: '#1e293b', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <ChevronLeft color="white" size={24} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>User Guide</h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px' }}>Fu'ad AI Command Manual</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: '15px', borderRadius: '12px', marginBottom: '30px', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <Mic color="#38bdf8" size={24} style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, color: '#e0f2fe', fontSize: '14px', lineHeight: '1.5' }}>
          <strong>How to use:</strong> Tap the blue microphone to activate the AI. Speak naturally and include keywords below.
        </p>
      </div>

      <CommandCard 
        icon={<Settings color="#38bdf8" size={24} />}
        title="Engine Controls"
        description="Commands to manage the AI's listening state and greetings."
        commands={["Hello", "Wake up, Fuad", "Go to sleep", "Shut down system"]}
      />

      <CommandCard 
        icon={<Lightbulb color="#facc15" size={24} />}
        title="Smart Home Operations"
        description="Executive commands to control relays and RGB lighting."
        commands={["Turn on the light", "Turn it off", "Change color to purple", "Make the light red"]}
      />

      <CommandCard 
        icon={<ShieldCheck color="#22c55e" size={24} />}
        title="System Analytics"
        description="Ask the AI to report on system performance, rules, and tracking."
        commands={["Explain the security", "What is the budget?", "Tell me about automation"]}
      />

      <CommandCard 
        icon={<GraduationCap color="#c084fc" size={24} />}
        title="Developer Info"
        description="Questions regarding the architecture and creation of the system."
        commands={["Who are you?", "Who made you?", "What is your tech stack?"]}
      />

    </div>
  );
}


// --- 3. THE HARDWARE RECEIVER SIMULATOR (/room) ---
function RoomView() {
  const [isOn, setIsOn] = useState(false);
  const [lightColor, setLightColor] = useState('#facc15');
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

  // --- THE NEW CLOUD POLL SYNC ---
  useEffect(() => {
    let previousState = null; 
    let previousColor = null;

    const interval = setInterval(() => {
        // Poll Power Status
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

        // Poll Color Status
        fetch(`${apiUrl}/light/color`)
          .then(res => res.json())
          .then(data => {
             if (data.color && data.color !== previousColor) {
                 if (previousColor !== null) {
                     addLog(`[~] RGB CONTROLLER: FREQUENCY SHIFT -> ${data.color}`);
                 }
                 previousColor = data.color;
                 setLightColor(data.color);
             }
          })
          .catch(() => {});

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
          backgroundColor: isOn ? `${lightColor}33` : '#1e293b', transition: 'background-color 0.3s ease-in-out',
          borderBottom: '4px solid #334155', position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '10px', color: isOn ? lightColor : '#64748b' }}>
          <span style={{ animation: 'pulse 1s infinite' }}>● REC</span>
        </div>
        <Lightbulb size={140} color={isOn ? lightColor : '#0f172a'} style={{ filter: isOn ? `drop-shadow(0 0 60px ${lightColor})` : 'none', transition: 'all 0.3s' }} />
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

// --- 4. THE APP ROUTER ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RemoteControl />} />
        <Route path="/room" element={<RoomView />} />
        <Route path="/guide" element={<UserGuide />} />
      </Routes>
    </BrowserRouter>
  );
}