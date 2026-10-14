import React, { useState } from 'react';

export type PlayerData = {
  id: string;
  username: string;
  score: number;
  timeSeconds: number;
  battery: number;
  frequency: number;
  pid: {
    main: number;
    sum: number;
    rat: number;
  };
};

interface LeftPanelProps {
  players: PlayerData[];
  currentUsername?: string;
}

export default function LeftPanel({ players, currentUsername }: LeftPanelProps) {
  const [hoveredPlayerId, setHoveredPlayerId] = useState<string | null>(null);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#2b2b2b',
      color: '#e0e0e0',
      padding: '16px',
      boxSizing: 'border-box',
      fontFamily: 'sans-serif',
      borderRight: '2px solid #444',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{ borderBottom: '1px solid #444', paddingBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#00ff00', fontSize: '18px' }}>
          Players In Instance ({players.length})
        </h3>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', flex: 1 }}>
        {players.map((player) => {
          const isCurrentUser = player.username === currentUsername;

          return (
            <div
              key={player.id}
              style={{
                backgroundColor: isCurrentUser ? '#344238' : '#353535',
                border: isCurrentUser ? '1px solid #00ff00' : '1px solid #4d4d4d',
                borderRadius: '6px',
                padding: '12px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                position: 'relative'
              }}
            >
              {/* Username & Current User Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px', color: isCurrentUser ? '#00ff00' : '#ffffff' }}>
                  {player.username}
                </span>
                {isCurrentUser && (
                  <span style={{ fontSize: '10px', backgroundColor: '#00ff00', color: '#000', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                    YOU
                  </span>
                )}
              </div>

              {/* Grid Statistics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: '#aaa' }}>Score:</span> <strong>${player.score}</strong>
                </div>
                <div>
                  <span style={{ color: '#aaa' }}>Time:</span> <strong>{formatTime(player.timeSeconds)}</strong>
                </div>

                {/* Battery Level Indicator */}
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span style={{ color: '#aaa', minWidth: '45px' }}>Battery:</span>
                  <div style={{ flex: 1, height: '10px', backgroundColor: '#555', borderRadius: '3px', overflow: 'hidden', border: '1px solid #777' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, (player.battery / 1000) * 100))}%`,
                        backgroundColor: '#00ff00'
                      }}
                    />
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', minWidth: '35px', textAlign: 'right' }}>
                    {player.battery.toFixed(1)}
                  </span>
                </div>

                {/* Grid Frequency & PID Hover Tooltip */}
                <div style={{ gridColumn: 'span 2', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                  <div>
                    <span style={{ color: '#aaa' }}>Freq:</span> <strong>{player.frequency.toFixed(3)} Hz</strong>
                  </div>

                  {/* Info Icon & Tooltip */}
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <span
                      onMouseEnter={() => setHoveredPlayerId(player.id)}
                      onMouseLeave={() => setHoveredPlayerId(null)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#00ff00',
                        color: '#000',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        userSelect: 'none'
                      }}
                    >
                      i
                    </span>

                    {/* Tooltip Popup */}
                    {hoveredPlayerId === player.id && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '125%',
                          right: '0',
                          backgroundColor: '#151515',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          whiteSpace: 'nowrap',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          border: '1px solid #00ff00',
                          zIndex: 100
                        }}
                      >
                        <div style={{ fontWeight: 'bold', color: '#00ff00', marginBottom: '4px', borderBottom: '1px solid #333', paddingBottom: '2px' }}>
                          PID Gains
                        </div>
                        <div>Main: <strong>{player.pid.main}</strong></div>
                        <div>Sum: <strong>{player.pid.sum}</strong></div>
                        <div>Rat: <strong>{player.pid.rat}</strong></div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}