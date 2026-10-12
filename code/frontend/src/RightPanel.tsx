import React, { useState } from 'react';

export interface ResourceState {
  storageUnits: number;
  windUnits: number;
  hydroUnits: number;
  customerUnits: number;
}

interface RightPanelProps {
  score: number;
  resources: ResourceState;
  onBuyStorage: () => void;
  onBuyWind: () => void;
  onBuyHydro: () => void;
  onAddCustomer: () => void;
}

export default function RightPanel({
  score,
  resources,
  onBuyStorage,
  onBuyWind,
  onBuyHydro,
  onAddCustomer
}: RightPanelProps) {
  // Primary Tabs State
  const [activePrimaryTab, setActivePrimaryTab] = useState<'main' | 'genLoad' | 'security' | 'resources'>('resources');
  
  // Secondary Tabs State (Inside Resources)
  const [activeSecondaryTab, setActiveSecondaryTab] = useState<'available' | 'offer' | 'demand' | 'manage'>('manage');

  // Thirdary *it funny I swear* Tabs State (Inside Manage Assets)
  const [activeTertiaryTab, setActiveTertiaryTab] = useState<'purchase' | 'monitor'>('purchase');

  // Calculate Grid Inertia dynamically from hydro units
  const gridInertia = (resources.hydroUnits * 0.01).toFixed(2);

  const canBuyStorage = score >= 100;
  const canBuyWind = score >= 100;
  const canBuyHydro = score >= 1000;
  const canAddCustomer = score > resources.customerUnits * 1000;

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#c0c0c0',
      padding: '10px',
      boxSizing: 'border-box',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    }}>
      {/* Primary Tab Navigation */}
      <div style={{ display: 'flex', gap: '2px', zIndex: 2 }}>
        {(['main', 'genLoad', 'security', 'resources'] as const).map((tabKey) => {
          const labels: Record<string, string> = {
            main: 'Main Monitor',
            genLoad: 'Generation/Load Details',
            security: 'Security Monitor',
            resources: 'Resources'
          };
          const isActive = activePrimaryTab === tabKey;
          return (
            <button
              key={tabKey}
              onClick={() => setActivePrimaryTab(tabKey)}
              style={{
                padding: '8px 14px',
                backgroundColor: isActive ? '#add8e6' : '#e0e0e0',
                border: '1px solid #888',
                borderBottom: isActive ? '1px solid #add8e6' : '1px solid #888',
                borderTopLeftRadius: '4px',
                borderTopRightRadius: '4px',
                fontWeight: isActive ? 'bold' : 'normal',
                fontSize: '12px',
                cursor: 'pointer',
                outline: 'none',
                position: 'relative',
                top: isActive ? '1px' : '0px'
              }}
            >
              {labels[tabKey]}
            </button>
          );
        })}
      </div>

      {/* Main Content Container */}
      <div style={{
        backgroundColor: '#c0c0c0',
        border: '1px solid #888',
        padding: '15px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}>
        {activePrimaryTab === 'main' && (
          <div style={{ padding: '20px', color: '#333' }}>
            <h3>Main Monitor View</h3>
            <p>System overview metrics and performance charts will appear here.</p>
          </div>
        )}

        {activePrimaryTab === 'genLoad' && (
          <div style={{ padding: '20px', color: '#333' }}>
            <h3>Generation / Load Details</h3>
            <p>Real-time power generation and active load metrics go here.</p>
          </div>
        )}

        {activePrimaryTab === 'security' && (
          <div style={{ padding: '20px', color: '#333' }}>
            <h3>Security Monitor</h3>
            <p>Grid vulnerability tracking and threat logs.</p>
          </div>
        )}

        {activePrimaryTab === 'resources' && (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            {/* Secondary Tabs Navigation (Inside Resources) */}
            <div style={{ display: 'flex', gap: '2px' }}>
              {(['available', 'offer', 'demand', 'manage'] as const).map((secKey) => {
                const secLabels: Record<string, string> = {
                  available: 'Available Contract',
                  offer: 'Offer Contracts',
                  demand: 'Demand Response',
                  manage: 'Manage Assets'
                };
                const isSecActive = activeSecondaryTab === secKey;
                return (
                  <button
                    key={secKey}
                    onClick={() => setActiveSecondaryTab(secKey)}
                    style={{
                      padding: '7px 12px',
                      backgroundColor: isSecActive ? '#d0d0d0' : '#b8b8b8',
                      border: '1px solid #888',
                      borderBottom: isSecActive ? '1px solid #d0d0d0' : '1px solid #888',
                      borderTopLeftRadius: '3px',
                      borderTopRightRadius: '3px',
                      fontWeight: isSecActive ? 'bold' : 'normal',
                      fontSize: '11px',
                      cursor: 'pointer',
                      position: 'relative',
                      top: isSecActive ? '1px' : '0px'
                    }}
                  >
                    {secLabels[secKey]}
                  </button>
                );
              })}
            </div>

            {/* Secondary Tab Content Box */}
            <div style={{
              backgroundColor: '#d0d0d0',
              border: '1px solid #888',
              padding: '15px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box'
            }}>
              {activeSecondaryTab === 'available' && (
                <div style={{ padding: '10px' }}>
                  <h3>Available Contracts</h3>
                  <p>Browse and accept incoming energy supply/demand contracts.</p>
                </div>
              )}

              {activeSecondaryTab === 'offer' && (
                <div style={{ padding: '10px' }}>
                  <h3>Offer Contracts</h3>
                  <p>Create and bid on custom power distribution agreements.</p>
                </div>
              )}

              {activeSecondaryTab === 'demand' && (
                <div style={{ padding: '10px' }}>
                  <h3>Demand Response</h3>
                  <p>Monitor real-time load shedding and peak shaving capacity.</p>
                </div>
              )}

              {activeSecondaryTab === 'manage' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Thirdary Tabs Navigation */}
                  <div style={{ display: 'flex', gap: '2px', marginBottom: '10px' }}>
                    {(['purchase', 'monitor'] as const).map((terKey) => {
                      const terLabels = {
                        purchase: 'Purchase New Assets',
                        monitor: 'Monitor and Configure Assets'
                      };
                      const isTerActive = activeTertiaryTab === terKey;
                      return (
                        <button
                          key={terKey}
                          onClick={() => setActiveTertiaryTab(terKey)}
                          style={{
                            padding: '5px 10px',
                            backgroundColor: isTerActive ? '#e2e2e2' : '#c8c8c8',
                            border: '1px solid #777',
                            borderBottom: isTerActive ? '1px solid #e2e2e2' : '1px solid #777',
                            borderTopLeftRadius: '3px',
                            borderTopRightRadius: '3px',
                            fontWeight: isTerActive ? 'bold' : 'normal',
                            fontSize: '11px',
                            cursor: 'pointer',
                            position: 'relative',
                            top: isTerActive ? '1px' : '0px'
                          }}
                        >
                          {terLabels[terKey]}
                        </button>
                      );
                    })}
                  </div>

                  {/* Thridary Tab Content Box */}
                  <div style={{
                    backgroundColor: '#e2e2e2',
                    border: '1px solid #999',
                    padding: '15px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    boxSizing: 'border-box'
                  }}>
                    {activeTertiaryTab === 'purchase' ? (
                      <>
                        <div style={{ fontSize: '12px', color: '#333', marginBottom: '5px' }}>
                          Available Funds: <strong style={{ color: '#008000' }}>${Math.floor(score)}</strong>
                        </div>

                        {/* Asset Rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          
                          {/* Storage Row */}
                          <div style={rowStyle}>
                            <span style={{ fontSize: '13px' }}>Buy 100 units for $100</span>
                            <button onClick={onBuyStorage} disabled={!canBuyStorage} style={getButtonStyle(canBuyStorage)}>BUY</button>
                            <input type="text" readOnly value={resources.storageUnits} style={inputStyle} />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '70px' }}>Storage</span>
                          </div>

                          {/* Wind Row */}
                          <div style={rowStyle}>
                            <span style={{ fontSize: '13px' }}>Buy one unit for $100</span>
                            <button onClick={onBuyWind} disabled={!canBuyWind} style={getButtonStyle(canBuyWind)}>BUY</button>
                            <input type="text" readOnly value={resources.windUnits} style={inputStyle} />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '70px' }}>Wind</span>
                          </div>

                          {/* Hydro Row */}
                          <div style={rowStyle}>
                            <span style={{ fontSize: '13px' }}>Buy one unit for $1000</span>
                            <button onClick={onBuyHydro} disabled={!canBuyHydro} style={getButtonStyle(canBuyHydro)}>BUY</button>
                            <input type="text" readOnly value={resources.hydroUnits} style={inputStyle} />
                            <span style={{ fontSize: '13px', fontWeight: 'bold', minWidth: '70px' }}>Hydro</span>
                          </div>

                          {/* Customer Row */}
                          <div style={rowStyle}>
                            <span style={{ fontSize: '13px' }}>Add one customer unit</span>
                            <button onClick={onAddCustomer} disabled={!canAddCustomer} style={getButtonStyle(canAddCustomer)}>ADD</button>
                            <input type="text" readOnly value={resources.customerUnits} style={inputStyle} />
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: '70px', lineHeight: '1' }}>
                              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>Current</span>
                              <span style={{ fontSize: '11px', fontWeight: 'bold' }}>#Units</span>
                            </div>
                          </div>

                        </div>

                        {/* Explanatory text & Grid Inertia */}
                        <div style={{ marginTop: '10px', fontSize: '11px', color: '#333', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div>
                            Zero cost to add customers <br />
                            but you may only add if <br />
                            Score &gt; Customers X 1000
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input 
                              type="text" 
                              readOnly 
                              value={gridInertia} 
                              style={{ width: '50px', textAlign: 'center', fontWeight: 'bold', color: '#000', backgroundColor: '#fff', border: '1px solid #888', padding: '2px' }} 
                            />
                            <span style={{ fontWeight: 'bold' }}>Grid Inertia</span>
                          </div>

                          <div style={{ fontStyle: 'italic', color: '#444', lineHeight: '1.3' }}>
                            Hydro generators and Industrial Loads have large spinning machines. The more and bigger the machines the more inertia. More inertia slows down the change in frequency with power imbalances.
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ padding: '10px', fontSize: '13px' }}>
                        <h4>Asset Configuration</h4>
                        <p>Fine-tune operational rules and degradation settings for your active fleet here.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Styling Helpers
const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const inputStyle: React.CSSProperties = {
  width: '60px',
  textAlign: 'center',
  fontWeight: 'bold',
  color: '#000',
  backgroundColor: '#fff',
  border: '1px solid #888',
  padding: '3px',
  fontSize: '12px'
};

const getButtonStyle = (enabled: boolean): React.CSSProperties => ({
  padding: '4px 12px',
  backgroundColor: enabled ? '#d4d0c8' : '#e0e0e0',
  color: enabled ? '#000' : '#888',
  border: '2px outset #fff',
  borderRadius: '2px',
  fontWeight: 'bold',
  fontSize: '11px',
  cursor: enabled ? 'pointer' : 'not-allowed'
});