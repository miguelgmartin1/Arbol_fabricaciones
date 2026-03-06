/**
 * Builds a hierarchical tree from flat records.
 * Each record has parent_id and process_id.
 * Root nodes are those whose parent_id does not appear as any process_id.
 */
export function buildTree(records) {
  const nodeMap = {};
  const childrenMap = {};

  // First pass: identify all process_ids
  const allProcessIds = new Set(
    records.filter(r => !r.is_waiting).map(r => String(r.process_id))
  );

  // Group records by parent_id
  records.forEach(rec => {
    const pid = String(rec.parent_id);
    if (!childrenMap[pid]) childrenMap[pid] = [];
    childrenMap[pid].push(rec);
  });

  // Find root parent IDs (parent that is not a child process_id of another)
  const allParentIds = new Set(records.map(r => String(r.parent_id)));
  const rootIds = [...allParentIds].filter(pid => !allProcessIds.has(pid));

  // Build nodes recursively
  function buildNode(parentId, visited = new Set()) {
    if (visited.has(parentId)) return null; // cycle guard
    visited = new Set([...visited, parentId]);

    const children = childrenMap[parentId] || [];
    return {
      id: parentId,
      children: children.map(rec => {
        const childId = String(rec.process_id);
        const subChildren = !rec.is_waiting ? buildNode(childId, visited) : null;
        return {
          ...rec,
          nodeId: childId,
          subChildren: subChildren ? subChildren.children : [],
        };
      }),
    };
  }

  return rootIds.map(rid => buildNode(rid));
}

/**
 * Compute summary statistics from flat tree records.
 */
export function computeTreeStats(records, aceiteEnOrigen) {
  const realRecords = records.filter(r => !r.is_waiting && r.process_name !== '-- esperando --');
  const waitingRecords = records.filter(r => r.is_waiting);

  const totalRPA = realRecords.reduce((sum, r) => sum + (r.rpa || 0), 0);
  const totalMermaProceso = realRecords.reduce((sum, r) => sum + (r.merma_proceso || 0), 0);
  const totalMermaHeredada = realRecords.reduce((sum, r) => sum + (r.merma_heredada || 0), 0);

  // Unique processes and products
  const uniqueProcesses = new Set(realRecords.map(r => r.process_name).filter(Boolean));
  const uniqueProducts = new Set(realRecords.map(r => r.product).filter(Boolean));

  // Sales orders (SAL-*)
  const salesOrders = realRecords.filter(r => r.process_name && r.process_name.startsWith('SAL-'));
  const totalQOutSales = salesOrders.reduce((sum, r) => sum + (r.q_out || 0), 0);

  // Processes with rendimiento < 1 (losses)
  const lossProcesses = realRecords.filter(r => r.rdto !== null && r.rdto < 0.99 && r.rdto > 0);

  // Waiting quantity
  const totalEsperando = waitingRecords.reduce((sum, r) => sum + (r.qty_del_padre || 0), 0);

  // Group by product
  const byProduct = {};
  realRecords.forEach(r => {
    if (!r.product) return;
    if (!byProduct[r.product]) byProduct[r.product] = { rpa: 0, qty: 0, count: 0 };
    byProduct[r.product].rpa += r.rpa || 0;
    byProduct[r.product].qty += r.qty_del_padre || 0;
    byProduct[r.product].count += 1;
  });

  return {
    totalRecords: realRecords.length,
    waitingCount: waitingRecords.length,
    uniqueProcesses: uniqueProcesses.size,
    uniqueProducts: uniqueProducts.size,
    totalRPA,
    totalMermaProceso,
    totalMermaHeredada,
    totalMerma: totalMermaProceso + totalMermaHeredada,
    aceiteEnOrigen,
    eficienciaGlobal: aceiteEnOrigen > 0 ? totalRPA / aceiteEnOrigen : 0,
    salesOrders: salesOrders.length,
    totalQOutSales,
    lossProcesses: lossProcesses.length,
    totalEsperando,
    byProduct: Object.entries(byProduct)
      .map(([product, data]) => ({ product, ...data }))
      .sort((a, b) => b.rpa - a.rpa),
  };
}

/**
 * Format a number for display, with optional decimal places.
 */
export function fmt(val, decimals = 2) {
  if (val === null || val === undefined) return '—';
  return Number(val).toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtPct(val) {
  if (val === null || val === undefined) return '—';
  return (Number(val) * 100).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + '%';
}

/**
 * Returns node type based on process_name pattern.
 */
export function getNodeType(processName) {
  if (!processName || processName === '-- esperando --') return 'waiting';
  if (processName.startsWith('SAL-')) return 'sale';
  if (processName.startsWith('ANI')) return 'ani';
  if (processName.startsWith('ENT-')) return 'entry';
  return 'process';
}

/**
 * Check if a record matches a search term.
 */
export function matchesSearch(rec, term) {
  if (!term) return true;
  const t = term.toLowerCase();
  return (
    String(rec.process_id).toLowerCase().includes(t) ||
    (rec.process_name || '').toLowerCase().includes(t) ||
    (rec.product || '').toLowerCase().includes(t) ||
    String(rec.parent_id).toLowerCase().includes(t)
  );
}
