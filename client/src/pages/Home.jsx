import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import {fetchTerritories} from '../services/api';

const TERRITORY_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB'];

// This now points to your local public folder!
const UP_TOPOJSON_URL = "/uttar_pradesh.json";


function useTerritories(numReps, strategy) {
  const [data, setData] = useState({ hcps: [], metrics: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. fetchTerritories returns { hcps, metrics } directly, NOT the raw Axios response
      const result = await fetchTerritories(numReps, strategy);

      // 2. Map the unwrapped properties straight to your state
      setData({
        hcps: result.hcps,
        metrics: result.metrics,
      });
    } catch (err) {
      // 3. Capture the actual error thrown by your API service
      setError(err.message || "Could not connect to the FastAPI server.");
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [numReps, strategy]);
  return { ...data, loading, error };
}


// ==========================================
// 2. SUB-COMPONENTS: UI Separation
// ==========================================
const Header = () => (
  <div style={styles.headerContainer}>
    <h1 style={styles.title}>ZS Territory Optimization Engine</h1>
    <p style={styles.subtitle}>Simulating Sales Force Alignments & Workload Distribution across Uttar Pradesh</p>
  </div>
);

const Controls = ({ numReps, setNumReps, strategy, setStrategy }) => (
  <div style={styles.controlsCard}>
    <div style={styles.controlItem}>
      <label style={styles.label}>
        Available Reps: <span style={styles.highlight}>{numReps}</span>
      </label>
      <input 
        type="range" min="3" max="8" value={numReps} 
        onChange={(e) => setNumReps(e.target.value)}
        style={{ width: '100%', cursor: 'pointer', accentColor: '#4ECDC4' }}
      />
    </div>
    <div style={styles.controlItem}>
      <label style={styles.label}>Clustering Strategy</label>
      <select value={strategy} onChange={(e) => setStrategy(e.target.value)} style={styles.select}>
        <option value="distance">Geographic Proximity (K-Means)</option>
        <option value="balanced">Value Balancing (Greedy Heuristic)</option>
      </select>
    </div>
  </div>
);

const MetricsDisplay = ({ metrics, isBalanced }) => (
  <div style={styles.metricsContainer}>
    <MetricCard title="Workload Variance" value={metrics.workload_std_dev} desc="Lower variance = Fairer territories" color={isBalanced ? '#10B981' : 'white'} />
    <MetricCard title="Total HCPs Mapped" value={metrics.total_hcps} desc="Doctors processed in database" color="white" />
    <MetricCard title="Active Reps" value={metrics.num_territories} desc="Total Territories Generated" color="white" />
  </div>
);

const MetricCard = ({ title, value, desc, color }) => (
  <div style={styles.metricCard}>
    <h3 style={styles.metricTitle}>{title}</h3>
    <p style={{ ...styles.metricValue, color }}>{value}</p>
    <span style={styles.metricDesc}>{desc}</span>
  </div>
);

const MapLegend = () => (
  <div style={styles.legend}>
    <h4 style={styles.legendTitle}>Map Legend</h4>
    
    <div style={styles.legendRow}>
      <div style={{ ...styles.legendDot, width: '16px', height: '16px' }}></div>
      <span style={styles.legendText}>High Rx Volume ({'>'}150)</span>
    </div>
    <div style={{ ...styles.legendRow, marginBottom: '15px' }}>
      <div style={{ ...styles.legendDot, width: '5px', height: '5px', margin: '0 5.5px' }}></div>
      <span style={styles.legendText}>Standard Rx Volume</span>
    </div>

    <div style={styles.legendFooter}>
      <span style={styles.legendText}>Colors = Assigned Rep Territories</span>
    </div>
  </div>
);

const Tooltip = ({ doctor }) => {
  if (!doctor) return null;
  return (
    <div style={{ ...styles.tooltip, border: `2px solid ${doctor.color}` }}>
      <p style={{ ...styles.tooltipId, color: doctor.color }}>{doctor.hcp_id}</p>
      <div style={styles.tooltipGrid}>
        <p><span>Hub:</span> {doctor.district}</p>
        <p><span>Specialty:</span> {doctor.specialty}</p>
        <p><span>Rx Volume:</span> <strong>{doctor.historical_rx_volume}</strong></p>
        <p style={styles.tooltipFooter}><span>Assigned Rep:</span> Territory {doctor.territory_id + 1}</p>
      </div>
    </div>
  );
};

// ==========================================
// 3. MAIN COMPONENT
// ==========================================
export default function Home() {
  const [numReps, setNumReps] = useState(5);
  const [strategy, setStrategy] = useState("balanced");
  const [hoveredDoctor, setHoveredDoctor] = useState(null);

  const { hcps, metrics, loading, error } = useTerritories(numReps, strategy);

  return (
    <div style={styles.page}>
      <Header />
      <Controls numReps={numReps} setNumReps={setNumReps} strategy={strategy} setStrategy={setStrategy} />

      {error && <div style={styles.errorBanner}>⚠️ Error: {error}</div>}
      {metrics && !error && <MetricsDisplay metrics={metrics} isBalanced={strategy === 'balanced'} />}

      <div style={styles.mapContainer}>
        {loading && (
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <p style={styles.loadingText}>Running Geographic ML Algorithm...</p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        
        {!loading && error && <div style={styles.errorText}>Map offline. Please fix the server connection.</div>}
        
        {!loading && !error && (
          <>
            <MapLegend /> 
            <ComposableMap 
              projection="geoMercator" 
              projectionConfig={{ scale: 3500, center: [80.9462, 26.8467] }}
              style={{ width: "100%", height: "100%" }}
            >
              <ZoomableGroup zoom={1}>
                <Geographies geography={UP_TOPOJSON_URL}>
                  {({ geographies }) => geographies.map((geo) => (
                    <Geography
                      key={geo.rsmKey} geography={geo} fill="#334155" stroke="#0f172a" strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#475569", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  ))}
                </Geographies>

                {hcps.map((doc, i) => {
                  const color = TERRITORY_COLORS[doc.territory_id % TERRITORY_COLORS.length];
                  return (
                    <Marker key={i} coordinates={[doc.longitude, doc.latitude]}>
                      <circle 
                        r={doc.historical_rx_volume > 150 ? 8 : 2.5} 
                        fill={color} stroke="#FFFFFF" strokeWidth={0.5}
                        style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                        onMouseEnter={() => setHoveredDoctor({ ...doc, color })}
                        onMouseLeave={() => setHoveredDoctor(null)}
                      />
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>
            <Tooltip doctor={hoveredDoctor} />
          </>
        )}
      </div>
    </div>
  );
}


const styles = {
  page: { padding: '2rem', fontFamily: 'system-ui, sans-serif', backgroundColor: '#0f172a', color: 'white', minHeight: '100vh', position: 'relative' },
  headerContainer: { marginBottom: '2rem' },
  title: { fontSize: '2.5rem', fontWeight: '800', margin: '0 0 0.5rem 0', background: 'linear-gradient(to right, #4ECDC4, #3498DB)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  subtitle: { color: '#94a3b8', margin: 0, fontSize: '1.1rem' },
  controlsCard: { backgroundColor: '#1e293b', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  controlItem: { flex: '1 1 300px' },
  label: { display: 'block', marginBottom: '0.75rem', fontWeight: '600', color: '#e2e8f0' },
  highlight: { color: '#4ECDC4', fontSize: '1.2rem' },
  select: { width: '100%', padding: '0.75rem', borderRadius: '0.5rem', backgroundColor: '#334155', color: 'white', border: '1px solid #475569', fontSize: '1rem', cursor: 'pointer', outline: 'none' },
  errorBanner: { padding: '1rem', backgroundColor: '#ef444420', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '0.5rem', marginBottom: '2rem', fontWeight: 'bold' },
  metricsContainer: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' },
  metricCard: { padding: '1.5rem', backgroundColor: '#1e293b', borderRadius: '1rem', flex: '1 1 200px', borderLeft: '4px solid #475569' },
  metricTitle: { margin: 0, color: '#94a3b8', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' },
  metricValue: { fontSize: '2rem', margin: '0.5rem 0 0 0', fontWeight: 'bold' },
  metricDesc: { fontSize: '0.8rem', color: '#64748b' },
  mapContainer: { height: '600px', backgroundColor: '#1e293b', borderRadius: '1rem', padding: '1rem', position: 'relative', overflow: 'hidden' },
  loadingContainer: { textAlign: 'center', marginTop: '200px' },
  spinner: { width: '40px', height: '40px', border: '4px solid #334155', borderTop: '4px solid #4ECDC4', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' },
  loadingText: { color: '#94a3b8' },
  errorText: { color: '#ef4444', textAlign: 'center', marginTop: '200px' },
  legend: { position: 'absolute', bottom: '20px', left: '20px', backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #334155', zIndex: 10 },
  legendTitle: { margin: '0 0 10px 0', fontSize: '0.9rem', color: '#e2e8f0' },
  legendRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' },
  legendDot: { borderRadius: '50%', backgroundColor: '#94a3b8' },
  legendText: { fontSize: '0.8rem', color: '#94a3b8' },
  legendFooter: { borderTop: '1px solid #334155', paddingTop: '10px' },
  tooltip: { position: 'absolute', top: '20px', right: '20px', backgroundColor: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(4px)', padding: '1.5rem', borderRadius: '0.75rem', color: 'white', minWidth: '200px', pointerEvents: 'none', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' },
  tooltipId: { margin: '0 0 0.5rem 0', fontWeight: '900', fontSize: '1.2rem' },
  tooltipGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', fontSize: '0.9rem', color: '#94a3b8' },
  tooltipFooter: { margin: 0, marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #334155' }
};