import React, { useState, useRef, useEffect } from 'react';

export interface MiddlePanelState {
  score: number;
  timeSeconds: number;
  battery: number;
  frequency: number;
  pid: { main: number; sum: number; rat: number };
}

interface MiddlePanelProps {
  score: number;
  timeSeconds: number;
  onStateChange?: (state: Partial<MiddlePanelState>) => void;
}

export default function MiddlePanel({ score, timeSeconds, onStateChange }: MiddlePanelProps) {
  const [energy, setEnergy] = useState(500);
  const [frequency] = useState(60.0);
  const [gridPower, setGridPower] = useState(100);
  const [autoControl, setAutoControl] = useState({ main: 200, sum: 10, rat: 0, isOn: true });

  // Send control state changes to parent component
  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        battery: energy,
        frequency,
        pid: {
          main: autoControl.main,
          sum: autoControl.sum,
          rat: autoControl.rat
        }
      });
    }
  }, [energy, frequency, autoControl]);

  const h = Math.floor(timeSeconds / 3600);
  const m = Math.floor((timeSeconds % 3600) / 60);
  const s = timeSeconds % 60;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f0f0f0', minHeight: '100vh', display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
      <div style={{ backgroundColor: '#e2e2e2', padding: '20px', borderRadius: '5px', boxShadow: '2px 2px 5px rgba(0,0,0,0.3)', width: '400px', boxSizing: 'border-box' }}>
        
        {/* Top Info Bar (Synced Score & Time) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <span style={{ marginRight: '10px' }}>Score($)</span>
            <div style={{ backgroundColor: '#d0d0d0', padding: '2px 20px', border: '1px solid #a0a0a0', minWidth: '80px', textAlign: 'center' }}>
              {Math.floor(score)}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: 'bold' }}>
            <span style={{ marginRight: '10px' }}>Time</span>
            <div style={{ backgroundColor: '#d0d0d0', padding: '2px 10px', border: '1px solid #a0a0a0', minWidth: '100px', textAlign: 'center' }}>
              {h} H {m} M {s} S
            </div>
          </div>
        </div>

        {/* Energy & Frequency Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          {/* Battery Box */}
          <div>
            <div style={{ fontWeight: 'bold', textAlign: 'center', marginBottom: '5px' }}>Stored Energy</div>
            <div style={{ display: 'flex' }}>
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '120px', paddingRight: '5px', fontSize: '12px', fontWeight: 'bold' }}>
                <span>1000</span>
                <span>500</span>
                <span>0</span>
              </div>
              <div style={{ position: 'relative', width: '80px', height: '120px', border: '2px solid #888', backgroundColor: '#a5b5c5', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', bottom: 0, width: '100%', height: `${(energy / 1000) * 100}%`, backgroundColor: '#00ff00' }} />
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: 'white', padding: '2px 5px', border: '1px solid #666', fontSize: '12px', fontWeight: 'bold' }}>
                  {energy.toFixed(3)}
                </div>
              </div>
            </div>
          </div>

          {/* Frequency Dial */}
          <div style={{ backgroundColor: '#d0d0d0', padding: '10px', border: '1px solid #a0a0a0', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '180px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '14px' }}>Grid Frequency (Hz)</div>
            <div style={{ position: 'relative', width: '150px', height: '75px', overflow: 'hidden' }}>
              <svg width="150" height="150" style={{ position: 'absolute', top: 0, left: 0 }}>
                <defs>
                  <linearGradient id="freqGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="yellow" />
                    <stop offset="50%" stopColor="#00ff00" />
                    <stop offset="100%" stopColor="red" />
                  </linearGradient>
                </defs>
                <path d="M 15 75 A 60 60 0 0 1 135 75" fill="none" stroke="url(#freqGrad)" strokeWidth="10" />
              </svg>
              <span style={{ position: 'absolute', left: '10px', top: '40px', fontSize: '12px', fontWeight: 'bold' }}>58</span>
              <span style={{ position: 'absolute', left: '68px', top: '0px', fontSize: '12px', fontWeight: 'bold' }}>60</span>
              <span style={{ position: 'absolute', right: '10px', top: '40px', fontSize: '12px', fontWeight: 'bold' }}>62</span>
              <div style={{ position: 'absolute', bottom: '0px', left: '73px', width: '4px', height: '50px', backgroundColor: 'red', transformOrigin: 'bottom center', transform: 'rotate(0deg)' }} />
            </div>
            <div style={{ marginTop: '5px', backgroundColor: '#e2e2e2', padding: '2px 10px', border: '1px solid #888', fontSize: '12px', fontWeight: 'bold' }}>
              {frequency.toFixed(4)}
            </div>
          </div>
        </div>

        {/* Grid Power Control Dial */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <DialControl value={gridPower} onChange={setGridPower} />
          <div style={{ fontWeight: 'bold', marginTop: '10px', fontSize: '16px' }}>Grid Power Control</div>
        </div>

        {/* Automatic Control Box */}
        <div style={{ backgroundColor: '#d0d0d0', padding: '10px', border: '1px solid #a0a0a0', borderRadius: '3px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '15px' }}>Automatic Control</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Main</div>
                <input 
                  type="number" 
                  value={autoControl.main} 
                  onChange={(e) => setAutoControl({...autoControl, main: Number(e.target.value)})}
                  style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #888' }} 
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Sum</div>
                <input 
                  type="number" 
                  value={autoControl.sum} 
                  onChange={(e) => setAutoControl({...autoControl, sum: Number(e.target.value)})}
                  style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #888' }} 
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>Rat</div>
                <input 
                  type="number" 
                  value={autoControl.rat} 
                  onChange={(e) => setAutoControl({...autoControl, rat: Number(e.target.value)})}
                  style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #888' }} 
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => setAutoControl(prev => ({...prev, isOn: !prev.isOn}))}>
              <div style={{ width: '20px', height: '40px', backgroundColor: '#888', borderRadius: '10px', position: 'relative', marginRight: '5px', border: '2px solid #666', boxShadow: 'inset 0 0 5px black' }}>
                <div style={{ 
                    position: 'absolute', 
                    width: '16px', height: '20px', 
                    backgroundColor: autoControl.isOn ? '#00ff00' : '#d0d0d0', 
                    borderRadius: '8px', 
                    top: autoControl.isOn ? '2px' : '14px', 
                    left: '0px', 
                    transition: 'top 0.2s',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
                  }} 
                />
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '14px' }}>ON</span>
            </div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '5px' }}>Error Feedback Gains (PID)</div>
        </div>

      </div>
    </div>
  );
}

function DialControl({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  const dialRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const updateDialBasedOnPointer = (e: React.PointerEvent | PointerEvent) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = e.clientX - centerX;
    const y = e.clientY - centerY;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    angle += 90;
    if (angle > 180) angle -= 360;

    if (angle < -135) angle = -135;
    if (angle > 135) angle = 135;

    const mappedValue = Math.round((angle / 135) * 1000);
    onChange(mappedValue);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    if (dialRef.current) {
      dialRef.current.setPointerCapture(e.pointerId);
    }
    updateDialBasedOnPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    updateDialBasedOnPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    if (dialRef.current) {
      dialRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const currentAngle = (value / 1000) * 135;

  return (
    <div style={{ position: 'relative', width: '250px', height: '250px', margin: '0 auto' }}>
      <span style={{ position: 'absolute', left: '110px', top: '-10px', fontWeight: 'bold' }}>0</span>
      <span style={{ position: 'absolute', right: '30px', top: '10px', fontWeight: 'bold' }}>200</span>
      <span style={{ position: 'absolute', right: '-10px', top: '65px', fontWeight: 'bold' }}>400</span>
      <span style={{ position: 'absolute', right: '-10px', top: '135px', fontWeight: 'bold' }}>600</span>
      <span style={{ position: 'absolute', right: '15px', top: '200px', fontWeight: 'bold' }}>800</span>
      <span style={{ position: 'absolute', right: '50px', top: '240px', fontWeight: 'bold' }}>1000</span>
      
      <span style={{ position: 'absolute', left: '30px', top: '10px', fontWeight: 'bold' }}>-200</span>
      <span style={{ position: 'absolute', left: '-10px', top: '65px', fontWeight: 'bold' }}>-400</span>
      <span style={{ position: 'absolute', left: '-10px', top: '135px', fontWeight: 'bold' }}>-600</span>
      <span style={{ position: 'absolute', left: '15px', top: '200px', fontWeight: 'bold' }}>-800</span>
      <span style={{ position: 'absolute', left: '50px', top: '240px', fontWeight: 'bold' }}>-1000</span>

      <div 
        ref={dialRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          position: 'absolute', left: '25px', top: '25px', width: '200px', height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, #ffffff, #a0a0a0, #505050)',
          boxShadow: 'inset -2px -2px 10px rgba(0,0,0,0.5), 5px 5px 15px rgba(0,0,0,0.3)',
          cursor: 'grab',
          touchAction: 'none'
        }}
      >
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            transform: `rotate(${currentAngle}deg)`,
            transition: isDragging.current ? 'none' : 'transform 0.1s'
          }}
        >
          <div style={{
              position: 'absolute', top: '20px', left: '75px', width: '50px', height: '50px',
              borderRadius: '50%', backgroundColor: '#00ff00',
              boxShadow: 'inset 2px 2px 5px rgba(255,255,255,0.8), inset -2px -2px 5px rgba(0,0,0,0.4)',
              border: '1px solid #00aa00'
            }}
          />
        </div>

        <div style={{
            position: 'absolute', top: '110px', left: '60px', width: '80px',
            backgroundColor: '#d0d0d0', padding: '4px', textAlign: 'center',
            border: '2px inset #fff', fontWeight: 'bold', fontSize: '16px'
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}