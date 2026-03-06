import React from 'react';
import { fmt } from '../utils/treeUtils';

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="stat-card" style={{ borderTop: `4px solid ${color}` }}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-body">
        <div className="stat-value" style={{ color }}>{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

export default function SummaryPanel({ stats, treeData, aceiteEnOrigen }) {
  const realRecords = treeData.filter(r => !r.is_waiting);
  const salesRecords = realRecords.filter(r => r.process_name && r.process_name.startsWith('SAL-'));

  return (
    <div className="summary-panel">
      <div className="summary-header">
        <h2>📊 Resumen de trazabilidad RPA</h2>
        <p>Métricas calculadas sobre el árbol de procesos en tiempo real.</p>
      </div>

      <div className="stats-grid">
        <StatCard
          label="Aceite RPA en origen"
          value={`${fmt(aceiteEnOrigen)} kg`}
          sub="Cantidad total de aceite en el proceso raíz"
          color="#6366f1"
          icon="🌿"
        />
        <StatCard
          label="RPA total trazado"
          value={`${fmt(stats.totalRPA)} kg`}
          sub={`${(stats.eficienciaGlobal * 100).toFixed(1)}% del aceite en origen`}
          color="#22c55e"
          icon="🔬"
        />
        <StatCard
          label="Merma total proceso"
          value={`${fmt(stats.totalMermaProceso)} kg`}
          sub="Suma de mermas propias de cada proceso"
          color="#ef4444"
          icon="📉"
        />
        <StatCard
          label="Merma total heredada"
          value={`${fmt(stats.totalMermaHeredada)} kg`}
          sub="Mermas acumuladas de procesos anteriores"
          color="#f59e0b"
          icon="🔗"
        />
        <StatCard
          label="Procesos trazados"
          value={stats.uniqueProcesses}
          sub={`${stats.salesOrders} pedidos de venta SAL`}
          color="#3b82f6"
          icon="⚙️"
        />
        <StatCard
          label="Productos distintos"
          value={stats.uniqueProducts}
          sub={`${stats.totalRecords} nodos en el árbol`}
          color="#8b5cf6"
          icon="📦"
        />
        <StatCard
          label="En espera (sin salida)"
          value={`${fmt(stats.totalEsperando)} kg`}
          sub={`${stats.waitingCount} nodos pendientes de proceso`}
          color="#64748b"
          icon="⏳"
        />
        <StatCard
          label="Procesos con pérdida"
          value={stats.lossProcesses}
          sub="Procesos con rendimiento < 99%"
          color="#dc2626"
          icon="⚠️"
        />
      </div>

      <div className="summary-tables">
        <div className="summary-table-section">
          <h3>📦 RPA por producto</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>RPA (kg)</th>
                <th>% sobre origen</th>
                <th>Qty padre (kg)</th>
                <th>Nodos</th>
              </tr>
            </thead>
            <tbody>
              {stats.byProduct.map(p => (
                <tr key={p.product}>
                  <td className="product-cell">{p.product}</td>
                  <td className="num-cell">{fmt(p.rpa)}</td>
                  <td className="num-cell">
                    <span className="pct-bar-wrap">
                      <span className="pct-bar" style={{ width: `${Math.min((p.rpa / aceiteEnOrigen) * 100, 100)}%` }}></span>
                      <span>{((p.rpa / aceiteEnOrigen) * 100).toFixed(1)}%</span>
                    </span>
                  </td>
                  <td className="num-cell">{fmt(p.qty)}</td>
                  <td className="num-cell">{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="summary-table-section">
          <h3>📦 Pedidos de venta (SAL)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Producto</th>
                <th>RPA asignado (kg)</th>
                <th>Q salida (kg)</th>
                <th>Merma heredada (kg)</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {salesRecords.map((r, idx) => (
                <tr key={idx}>
                  <td className="process-cell">{r.process_name}</td>
                  <td>{r.product}</td>
                  <td className="num-cell rpa-val">{fmt(r.rpa)}</td>
                  <td className="num-cell">{fmt(r.q_out)}</td>
                  <td className="num-cell merma">{fmt(r.merma_heredada)}</td>
                  <td className="date-cell">{r.fecha}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
