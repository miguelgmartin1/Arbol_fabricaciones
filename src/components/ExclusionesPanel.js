import React, { useState } from 'react';

function ListEditor({ title, description, items, onChange, color }) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed && !items.includes(trimmed)) {
      onChange([...items, trimmed]);
      setNewItem('');
    }
  };

  const removeItem = (item) => {
    onChange(items.filter(i => i !== item));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') addItem();
  };

  return (
    <div className="excl-list-card" style={{ borderTop: `4px solid ${color}` }}>
      <h3>{title}</h3>
      <p className="excl-desc">{description}</p>
      <div className="excl-tags">
        {items.map(item => (
          <span key={item} className="excl-tag" style={{ background: color + '22', borderColor: color }}>
            {item}
            <button className="excl-remove" onClick={() => removeItem(item)} title="Eliminar">×</button>
          </span>
        ))}
        {items.length === 0 && <span className="excl-empty">Sin elementos</span>}
      </div>
      <div className="excl-add-row">
        <input
          className="excl-input"
          placeholder="Añadir elemento..."
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="excl-add-btn" onClick={addItem} style={{ background: color }}>+ Añadir</button>
      </div>
    </div>
  );
}

export default function ExclusionesPanel({ exclusiones, setExclusiones }) {
  const updateList = (key) => (newList) => {
    setExclusiones(prev => ({ ...prev, [key]: newList }));
  };

  return (
    <div className="exclusiones-panel">
      <div className="excl-header">
        <h2>⚙️ Configuración de exclusiones</h2>
        <p>
          Estas listas controlan qué procesos, destinos y tipos de aceites se consideran en el árbol de trazabilidad.
          Replican la hoja <strong>"exclusiones"</strong> del Excel original.
        </p>
      </div>

      <div className="excl-grid">
        <ListEditor
          title="🚫 Destinos DRWBCK (No Drawback)"
          description="Códigos de destino a los que se aplica la norma NO DRAWBACK. Los pedidos SAL a estos destinos se excluyen del cálculo de drawback."
          items={exclusiones.drwbck}
          onChange={updateList('drwbck')}
          color="#ef4444"
        />
        <ListEditor
          title="✅ Aceites útiles"
          description="Tipos de aceite considerados ÚTILES para la trazabilidad RPA. Solo los procesos que producen estos aceites se incluyen en el árbol."
          items={exclusiones.aceites_utiles}
          onChange={updateList('aceites_utiles')}
          color="#22c55e"
        />
        <ListEditor
          title="❌ Aceites no útiles"
          description="Tipos de aceite considerados NO ÚTILES. Los procesos que generan exclusivamente estos aceites se filtran del árbol."
          items={exclusiones.aceites_no_utiles}
          onChange={updateList('aceites_no_utiles')}
          color="#f59e0b"
        />
      </div>

      <div className="excl-info">
        <h4>📋 Lógica de exclusiones (replicada del VBA)</h4>
        <ul>
          <li>Los <strong>destinos DRWBCK</strong> son los códigos finales de país/región que no tienen derecho a drawback de aduanas.</li>
          <li>Los <strong>aceites útiles</strong> son los que pueden contener RPA (ácido retinoico precursor de astaxantina) y por ello se trazan.</li>
          <li>Los <strong>aceites no útiles</strong> son subproductos o residuos que no se incluyen en el cálculo de merma de RPA.</li>
          <li>La condición de filtro del árbol original era: <code>LOWER(pr.name) NOT LIKE '%[aceite_no_util]%'</code></li>
        </ul>
      </div>
    </div>
  );
}
