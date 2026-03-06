import React, { useState, useMemo, useEffect } from 'react';
import fallbackData from './data/treeData.json';
import TreeView from './components/TreeView';
import ExclusionesPanel from './components/ExclusionesPanel';
import SummaryPanel from './components/SummaryPanel';
import SearchBar from './components/SearchBar';
import { buildTree, computeTreeStats } from './utils/treeUtils';
import './App.css';

const API_URL    = process.env.REACT_APP_API_URL;
const ROOT_ID    = process.env.REACT_APP_ROOT_ID || '47201';

export default function App() {
  // Si hay API configurada, empieza con null y carga desde el servidor.
  // En desarrollo local sin servidor, usa el JSON estático como fallback.
  const [rawData,    setRawData]    = useState(API_URL ? null : fallbackData);
  const [loading,    setLoading]    = useState(!!API_URL);
  const [error,      setError]      = useState(null);
  const [exclusiones, setExclusiones] = useState(null);
  const [searchTerm,  setSearchTerm]  = useState('');
  const [activeTab,   setActiveTab]   = useState('arbol');
  const [expandedNodes, setExpandedNodes] = useState(new Set([ROOT_ID]));
  const [highlightedNode, setHighlightedNode] = useState(null);

  // Carga desde la API (solo cuando REACT_APP_API_URL está definido)
  useEffect(() => {
    if (!API_URL) return;

    setLoading(true);
    setError(null);

    fetch(`${API_URL}/api/arbol/${ROOT_ID}`)
      .then(r => {
        if (!r.ok) throw new Error(`Error ${r.status}: ${r.statusText}`);
        return r.json();
      })
      .then(data => {
        setRawData(data);
        setExclusiones(data.exclusiones);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error cargando datos:', err);
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Inicializar exclusiones desde el JSON estático (modo sin API)
  useEffect(() => {
    if (!API_URL && rawData && !exclusiones) {
      setExclusiones(rawData.exclusiones);
    }
  }, [rawData, exclusiones]);

  const tree  = useMemo(() => rawData ? buildTree(rawData.tree) : [], [rawData]);
  const stats = useMemo(() => rawData ? computeTreeStats(rawData.tree, rawData.aceite_en_origen) : null, [rawData]);

  const toggleNode = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  };

  const expandAll = () => {
    if (!rawData) return;
    const allIds = new Set(rawData.tree.map(r => String(r.parent_id)));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([ROOT_ID]));
  };

  // ── Estados de carga / error ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>🌳</span>
          <p style={{ color: '#94a3b8' }}>Cargando árbol de trazabilidad…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', gap: '1rem' }}>
          <span style={{ fontSize: '2rem' }}>⚠️</span>
          <p style={{ color: '#f87171' }}>No se pudo conectar con la API</p>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{error}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1.5rem', borderRadius: '6px', cursor: 'pointer' }}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!rawData || !exclusiones) return null;

  // ── UI principal ───────────────────────────────────────────────────────────
  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🌳</span>
            <div>
              <h1>Árbol Solutraza</h1>
              <span className="subtitle">Trazabilidad de RPA en origen</span>
            </div>
          </div>
        </div>
        <div className="header-center">
          <SearchBar value={searchTerm} onChange={setSearchTerm} onHighlight={setHighlightedNode} treeData={rawData.tree} />
        </div>
        <div className="header-right">
          <div className="aceite-badge">
            <span className="badge-label">Aceite RPA en origen</span>
            <span className="badge-value">{rawData.aceite_en_origen.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg</span>
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button className={activeTab === 'arbol' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('arbol')}>
          🌿 Árbol de procesos
        </button>
        <button className={activeTab === 'resumen' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('resumen')}>
          📊 Resumen & métricas
        </button>
        <button className={activeTab === 'exclusiones' ? 'nav-btn active' : 'nav-btn'} onClick={() => setActiveTab('exclusiones')}>
          ⚙️ Exclusiones
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'arbol' && (
          <div className="arbol-layout">
            <div className="tree-controls">
              <button className="ctrl-btn" onClick={expandAll}>Expandir todo</button>
              <button className="ctrl-btn" onClick={collapseAll}>Colapsar todo</button>
              <span className="tree-info">
                <span className="dot waiting"></span> Esperando
                <span className="dot sale"></span> Pedido venta
                <span className="dot process"></span> Proceso
              </span>
            </div>
            <TreeView
              tree={tree}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              searchTerm={searchTerm}
              highlightedNode={highlightedNode}
              aceiteEnOrigen={rawData.aceite_en_origen}
            />
          </div>
        )}

        {activeTab === 'resumen' && stats && (
          <SummaryPanel stats={stats} treeData={rawData.tree} aceiteEnOrigen={rawData.aceite_en_origen} />
        )}

        {activeTab === 'exclusiones' && (
          <ExclusionesPanel exclusiones={exclusiones} setExclusiones={setExclusiones} />
        )}
      </main>
    </div>
  );
}
