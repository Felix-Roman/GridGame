import { useEffect, useState } from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import MiddlePanel, { type MiddlePanelState } from './MiddlePanel';
import LeftPanel, { type PlayerData } from './LeftPanel';
import RightPanel, { type ResourceState } from './RightPanel';

export default function Game() {
  // gets the room ID from the browser
  const { roomId } = useParams();
  // Accesses the location object to read the hidden state passed from the Home screen or Home.tsx
  const location = useLocation();
  // Extracts the username the player typed in. If they navigated here directly without typing one, defaults to 'LocalPlayer'.
  // This is sorta just a catch all system atm and should be revamped.
  const username = location.state?.username || 'LocalPlayer';

  // Storing the socket.Io connection for real time interactions
  const [socket, setSocket] = useState<Socket | null>(null);
  // an array with all the players in the room
  const [players, setPlayers] = useState<PlayerData[]>([]);

  // Centralized game metric states
  const [localScore, setLocalScore] = useState(1200);
  const [secondsPassed, setSecondsPassed] = useState(0);
  const [resources, setResources] = useState<ResourceState>({
    storageUnits: 1000,
    windUnits: 15,
    hydroUnits: 20,
    customerUnits: 3
  });

  // if the user doesnt have a room ID boot em back to the home page
  if (!roomId) {
    return <Navigate to="/" replace />;
  }

  // Socket connection setup
  useEffect(() => {
    // connects socket to local backend server
    const newSocket = io('http://localhost:3000');
    // saves the connection to the variable socket 
    setSocket(newSocket);

    // Listens for when connections are firest established
    newSocket.on('connect', () => {
      newSocket.emit('join_room', { username, roomId });
    });

    //Listens for the server to braodcast an updated version of the player list
    newSocket.on('room_players', (updatedPlayers: PlayerData[]) => {
      setPlayers(updatedPlayers);
    });

    // this is a clean up function ment to destory itself so rooms dont get ghost players
    // if we are seeing ghost players we should check here first, havent had any more instances yet, but there is always a chance you know?
    return () => {
      newSocket.disconnect();
    };
  }, [username, roomId]);

  // Central Game Timer it Increments time and adds score based on 100 * customerUnits per second
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsPassed((s) => s + 1);
      setLocalScore((prevScore) => prevScore + (100 * resources.customerUnits));
    }, 1000);
    return () => clearInterval(timer);
  }, [resources.customerUnits]);

  // Broadcast centralized score, time, and state updates to the socket server whenever they change
  useEffect(() => {
    if (socket && socket.connected) {
      socket.emit('update_state', {
        score: localScore,
        timeSeconds: secondsPassed,
      });
    }
  }, [localScore, secondsPassed, socket]);

  // This function is passed down to MiddlePanel. Whenever a user moves a dial or flips a switch, 
  // MiddlePanel calls this function, passing up its new dial settings.
  const handleMiddlePanelChange = (controlState: Partial<MiddlePanelState>) => {
    if (socket && socket.connected) {
      // Sends the new dial settings PLUS the current score/time to the server.
      socket.emit('update_state', {
        ...controlState,
        score: localScore,
        timeSeconds: secondsPassed,
      });
    }
  };

  // Asset Purchase Handlers
  // Battery increase
  const handleBuyStorage = () => {
    if (localScore >= 100) {
      setLocalScore((prev) => prev - 100);
      setResources((prev) => ({ ...prev, storageUnits: prev.storageUnits + 100 }));
    }
  };

  // wind units
  const handleBuyWind = () => {
    if (localScore >= 100) {
      setLocalScore((prev) => prev - 100);
      setResources((prev) => ({ ...prev, windUnits: prev.windUnits + 1 }));
    }
  };

  // hydro units
  const handleBuyHydro = () => {
    if (localScore >= 1000) {
      setLocalScore((prev) => prev - 1000);
      setResources((prev) => ({ ...prev, hydroUnits: prev.hydroUnits + 1 }));
    }
  };

  // customers
  const handleAddCustomer = () => {
    if (localScore > resources.customerUnits * 1000) {
      setResources((prev) => ({ ...prev, customerUnits: prev.customerUnits + 1 }));
    }
  };

  return (
    <div 
      style={{ 
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, 
        display: 'flex', flexDirection: 'row', backgroundColor: '#c0c0c0', 
        padding: '15px', gap: '15px', boxSizing: 'border-box', overflow: 'hidden' 
      }}
    >
      {/* Left Panel th Multiplayer Roster */}
      <div style={{ flex: '0 0 300px', height: '100%', overflowY: 'auto' }}>
        <LeftPanel players={players} currentUsername={username} />
      </div>

      {/* Middle Panel The Interactive Control Dashboard (receives synced score & time) */}
      <div style={{ flex: '1 1 auto', height: '100%', minWidth: '420px', overflowY: 'auto' }}>
        <MiddlePanel 
          score={localScore} 
          timeSeconds={secondsPassed} 
          onStateChange={handleMiddlePanelChange} 
        />
      </div>

      {/* Right Panel The Monitors & Resource Manager */}
      <div style={{ flex: '1.2 1 auto', height: '100%', minWidth: '450px', overflowY: 'auto' }}>
        <RightPanel
          score={localScore}
          resources={resources}
          onBuyStorage={handleBuyStorage}
          onBuyWind={handleBuyWind}
          onBuyHydro={handleBuyHydro}
          onAddCustomer={handleAddCustomer}
        />
      </div>
    </div>
  );
}