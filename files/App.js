import React, { useState, useMemo } from 'react';
import rawData from './data/treeData.json';
import TreeView from './components/TreeView';
import ExclusionesPanel from './components/ExclusionesPanel';
import SummaryPanel from './components/SummaryPanel';
import SearchBar from './components/SearchBar';
import { buildTree, computeTreeStats } from './utils/treeUtils';
import './App.css';

export default function App() {
  const [exclusiones, setExclusiones] = useState(rawData.exclusiones);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('arbol'); // 'arbol' | 'exclusiones' | 'resumen'
  const [expandedNodes, setExpandedNodes] = useState(new Set(['47201']));
  const [highlightedNode, setHighlightedNode] = useState(null);

  const tree = useMemo(() => buildTree(rawData.tree), []);
  const stats = useMemo(() => computeTreeStats(rawData.tree, rawData.aceite_en_origen), []);

  const toggleNode = (id) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(rawData.tree.map(r => String(r.parent_id)));
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set(['47201']));
  };

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

        {activeTab === 'resumen' && (
          <SummaryPanel stats={stats} treeData={rawData.tree} aceiteEnOrigen={rawData.aceite_en_origen} />
        )}

        {activeTab === 'exclusiones' && (
          <ExclusionesPanel exclusiones={exclusiones} setExclusiones={setExclusiones} />
        )}
      </main>
    </div>
  );
}
