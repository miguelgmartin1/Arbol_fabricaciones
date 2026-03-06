import React, { useRef, useEffect } from 'react';
import { getNodeType, fmt, fmtPct, matchesSearch } from '../utils/treeUtils';

function NodeCard({ rec, subChildren, expandedNodes, toggleNode, searchTerm, highlightedNode, aceiteEnOrigen, depth }) {
  const nodeId = String(rec.process_id === 'esperando' ? `esp_${rec.parent_id}` : rec.process_id);
  const isExpanded = expandedNodes.has(nodeId);
  const hasChildren = subChildren && subChildren.length > 0;
  const nodeType = getNodeType(rec.process_name);
  const isHighlighted = highlightedNode === nodeId;
  const matchesFilter = matchesSearch(rec, searchTerm);
  const cardRef = useRef(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  if (searchTerm && !matchesFilter && !hasChildren) return null;

  const isWaiting = rec.is_waiting;
  const rdtoColor = rec.rdto === null ? '#888'
    : rec.rdto >= 0.99 ? '#22c55e'
    : rec.rdto >= 0.97 ? '#f59e0b'
    : '#ef4444';

  const rpaPct = aceiteEnOrigen > 0 ? (rec.rpa || 0) / aceiteEnOrigen : 0;

  return (
    <div className={`tree-node depth-${Math.min(depth, 5)}`}>
      <div
        ref={cardRef}
        className={`node-card node-${nodeType} ${isHighlighted ? 'node-highlighted' : ''} ${isWaiting ? 'node-waiting' : ''}`}
        onClick={() => hasChildren && toggleNode(nodeId)}
        style={{ cursor: hasChildren ? 'pointer' : 'default' }}
      >
        <div className="node-header">
          <div className="node-title-row">
            {hasChildren && (
              <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
            )}
            <span className={`node-type-badge badge-${nodeType}`}>
              {nodeType === 'waiting' ? '⏳' : nodeType === 'sale' ? '📦' : nodeType === 'ani' ? '🔄' : nodeType === 'entry' ? '📥' : '⚙️'}
            </span>
            <div className="node-names">
              <span className="node-process-name">{isWaiting ? '— esperando —' : rec.process_name}</span>
              {rec.product && !isWaiting && (
                <span className="node-product">{rec.product}</span>
              )}
            </div>
            <div className="node-ids">
              <span className="node-id">#{rec.process_id === 'esperando' ? '?' : rec.process_id}</span>
              <span className="node-parent-id">padre: {rec.parent_id}</span>
            </div>
          </div>
        </div>

        {!isWaiting && (
          <div className="node-metrics">
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">RPA</span>
                <span className="metric-value rpa-val">{fmt(rec.rpa, 2)} kg</span>
              </div>
              <div className="metric">
                <span className="metric-label">% sobre origen</span>
                <span className="metric-value">{(rpaPct * 100).toFixed(2)}%</span>
              </div>
            </div>
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">Q entrada</span>
                <span className="metric-value">{fmt(rec.q_in)} kg</span>
              </div>
              <div className="metric">
                <span className="metric-label">Q salida</span>
                <span className="metric-value">{fmt(rec.q_out)} kg</span>
              </div>
            </div>
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">Rdto</span>
                <span className="metric-value" style={{ color: rdtoColor, fontWeight: 600 }}>
                  {rec.rdto !== null ? fmtPct(rec.rdto) : '—'}
                </span>
              </div>
              <div className="metric">
                <span className="metric-label">% reparto</span>
                <span className="metric-value">{fmtPct(rec.pct_reparto)}</span>
              </div>
            </div>
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">Merma proceso</span>
                <span className="metric-value merma">{fmt(rec.merma_proceso)} kg</span>
              </div>
              <div className="metric">
                <span className="metric-label">Merma heredada</span>
                <span className="metric-value merma">{fmt(rec.merma_heredada)} kg</span>
              </div>
            </div>
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">Qty padre</span>
                <span className="metric-value">{fmt(rec.qty_del_padre)} kg</span>
              </div>
              <div className="metric">
                <span className="metric-label">Fecha</span>
                <span className="metric-value date-val">{rec.fecha || '—'}</span>
              </div>
            </div>
          </div>
        )}

        {isWaiting && (
          <div className="node-metrics">
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">RPA pendiente</span>
                <span className="metric-value rpa-val">{fmt(rec.rpa, 2)} kg</span>
              </div>
              <div className="metric">
                <span className="metric-label">Qty padre</span>
                <span className="metric-value">{fmt(rec.qty_del_padre)} kg</span>
              </div>
            </div>
            <div className="metric-group">
              <div className="metric">
                <span className="metric-label">% reparto</span>
                <span className="metric-value">{fmtPct(rec.pct_reparto)}</span>
              </div>
              <div className="metric">
                <span className="metric-label">Merma heredada</span>
                <span className="metric-value merma">{fmt(rec.merma_heredada)} kg</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="node-children">
          {subChildren.map((child, idx) => (
            <NodeCard
              key={`${child.process_id}_${idx}`}
              rec={child}
              subChildren={child.subChildren}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              searchTerm={searchTerm}
              highlightedNode={highlightedNode}
              aceiteEnOrigen={aceiteEnOrigen}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function TreeView({ tree, expandedNodes, toggleNode, searchTerm, highlightedNode, aceiteEnOrigen }) {
  if (!tree || tree.length === 0) return <div className="empty">Sin datos</div>;

  return (
    <div className="tree-view">
      {tree.map((rootNode, idx) => (
        <div key={idx} className="root-block">
          <div className="root-label">
            <span>🌳 Proceso raíz: <strong>{rootNode.id}</strong></span>
          </div>
          {rootNode.children.map((child, ci) => (
            <NodeCard
              key={`${child.process_id}_${ci}`}
              rec={child}
              subChildren={child.subChildren}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
              searchTerm={searchTerm}
              highlightedNode={highlightedNode}
              aceiteEnOrigen={aceiteEnOrigen}
              depth={0}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
