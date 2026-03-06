/**
 * server.js — API local para Árbol Solutraza
 *
 * Implementa la misma lógica BFS del macro VBA original:
 *  1. Lee procesos hijo de st_processes
 *  2. Suma cantidades de aceites útiles en st_process_input / st_process_output
 *  3. Calcula RPA prorrateado, mermas y rendimiento
 *  4. Excluye pedidos SAL con códigos DRWBCK
 *
 * IMPORTANTE: si los nombres de columna de tu BD difieren, ajusta
 * la función getChildren() — hay comentarios marcados con "⚠️ AJUSTAR"
 */

const express = require('express');
const { Pool }  = require('pg');
const cors      = require('cors');
require('dotenv').config();

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());

// ─── Conexión a PostgreSQL ────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'soluclon_test',
  user:     process.env.DB_USER     || 'soluclon_excel',
  password: process.env.DB_PASSWORD,
  ssl:      false,
});

// ─── Configuración del árbol ─────────────────────────────────────────────────
const ROOT_ID         = parseInt(process.env.ROOT_PROCESS_ID) || 47201;
const ACEITE_EN_ORIGEN = parseFloat(process.env.ACEITE_EN_ORIGEN) || 15200;

const DEFAULT_EXCLUSIONES = {
  drwbck:          ['FAC', 'AND', 'SDC', 'ARE', 'VTK', 'MAR'],
  aceites_utiles:  ['solutex', 'omegatex', 'hf', 'sx70ee', 'sx85ee', 'alga', 'magomega', 'om3ga', 'lipinova'],
  aceites_no_utiles: ['solutexn20', '0100', '0501', 'feed'],
};

// ─── Query: hijos de un proceso ───────────────────────────────────────────────
async function getChildren(parentId, aceitesUtiles, client) {
  const aceites = aceitesUtiles.map(a => a.toLowerCase());

  /*
   * ⚠️ AJUSTAR si los nombres de columna difieren en tu BD:
   *   p.id        → id del proceso
   *   p.parent_id → id del proceso padre
   *   p.name      → nombre del proceso (BL103-26-07, SAL-xxx, etc.)
   *   p.date      → fecha del proceso
   *   p.element_id → id del elemento/producto principal
   *   e.code      → código del producto (SM3322AHF, etc.)
   *   pi.quantity / po.quantity → cantidades en input/output
   *   el.code     → código del elemento para filtrar aceites útiles
   */
  const { rows } = await client.query(`
    SELECT
      p.id                        AS process_id,
      p.name                      AS process_name,
      p.date                      AS fecha,
      e.code                      AS product,
      COALESCE(pi_agg.qty, 0)     AS q_in,
      COALESCE(po_agg.qty, 0)     AS q_out
    FROM st_processes p
    LEFT JOIN st_elements e
           ON e.id = p.element_id
    LEFT JOIN (
        SELECT pi.process_id, SUM(pi.quantity) AS qty
        FROM   st_process_input pi
        JOIN   st_elements el ON el.id = pi.element_id
        WHERE  lower(el.code) = ANY($2::text[])
        GROUP  BY pi.process_id
    ) pi_agg ON pi_agg.process_id = p.id
    LEFT JOIN (
        SELECT po.process_id, SUM(po.quantity) AS qty
        FROM   st_process_output po
        JOIN   st_elements el ON el.id = po.element_id
        WHERE  lower(el.code) = ANY($2::text[])
        GROUP  BY po.process_id
    ) po_agg ON po_agg.process_id = p.id
    WHERE p.parent_id = $1
    ORDER BY p.id
  `, [parentId, aceites]);

  return rows;
}

// ─── BFS: construye el árbol plano igual que el VBA ──────────────────────────
async function buildArbol(rootId, exclusiones, client) {
  const { drwbck, aceites_utiles } = exclusiones;
  const treeFlat = [];

  const queue = [{
    parentId:          rootId,
    parentRpa:         ACEITE_EN_ORIGEN,
    mermaHeredadaAccum: 0,
  }];

  const visited = new Set();

  while (queue.length > 0) {
    const { parentId, parentRpa, mermaHeredadaAccum } = queue.shift();

    if (visited.has(parentId)) continue;
    visited.add(parentId);

    const children = await getChildren(parentId, aceites_utiles, client);

    for (const child of children) {
      const qIn  = parseFloat(child.q_in);
      const qOut = parseFloat(child.q_out);
      const name = child.process_name || '';

      // Excluir pedidos SAL con código DRWBCK
      const isDrwbck = drwbck.some(code => name.includes(code));
      if (name.startsWith('SAL-') && isDrwbck) continue;

      // is_waiting: proceso sin cantidades registradas todavía
      const isWaiting = qIn === 0 && qOut === 0;

      // Cálculos RPA (misma lógica que VBA):
      //   qty_del_padre = aceite útil de entrada (asignación desde padre)
      //   pct_reparto   = qty_del_padre / RPA del padre
      //   rpa           = RPA padre × pct_reparto
      const qtyDelPadre = qIn;
      const pctReparto  = parentRpa > 0 ? qtyDelPadre / parentRpa : 0;
      const rpa         = parentRpa * pctReparto;

      // rdto = rendimiento = q_out / q_in
      const rdto = qIn > 0 ? qOut / qIn : (qOut > 0 ? 1 : 0);

      // merma_proceso en kg de RPA = (1 - rdto) * rpa
      const merma_proceso  = (1 - rdto) * rpa;
      const merma_heredada = mermaHeredadaAccum;

      // Formatear fecha dd-mm-yyyy
      let fecha = null;
      if (child.fecha) {
        const d = new Date(child.fecha);
        fecha = `${String(d.getDate()).padStart(2,'0')}-${String(d.getMonth()+1).padStart(2,'0')}-${d.getFullYear()}`;
      }

      treeFlat.push({
        parent_id:      parentId,
        process_id:     child.process_id,
        process_name:   name,
        product:        child.product || null,
        qty_del_padre:  qtyDelPadre,
        fecha,
        pct_reparto:    pctReparto,
        rpa,
        q_in:           qIn,
        q_out:          qOut,
        rdto,
        merma_proceso,
        merma_heredada,
        is_waiting:     isWaiting,
      });

      if (!isWaiting) {
        queue.push({
          parentId:          child.process_id,
          parentRpa:         rpa,
          mermaHeredadaAccum: merma_heredada + merma_proceso,
        });
      }
    }
  }

  return treeFlat;
}

// ─── ENDPOINT: GET /api/arbol/:rootId ────────────────────────────────────────
app.get('/api/arbol/:rootId', async (req, res) => {
  const rootId     = parseInt(req.params.rootId) || ROOT_ID;
  const exclusiones = DEFAULT_EXCLUSIONES;
  const client     = await pool.connect();

  try {
    const tree = await buildArbol(rootId, exclusiones, client);
    res.json({ tree, exclusiones, aceite_en_origen: ACEITE_EN_ORIGEN });
  } catch (err) {
    console.error('[/api/arbol] Error:', err.message);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// ─── ENDPOINT: GET /health ────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', db: err.message });
  }
});

// ─── ENDPOINT: GET /api/schema  (solo para depuración) ───────────────────────
app.get('/api/schema', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM   information_schema.columns
      WHERE  table_name IN ('st_processes','st_process_input','st_process_output','st_elements')
      ORDER  BY table_name, ordinal_position
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Arranque ─────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`API Árbol Solutraza corriendo en http://localhost:${PORT}`);
  console.log(`  → Proceso raíz: ${ROOT_ID}`);
  console.log(`  → Aceite en origen: ${ACEITE_EN_ORIGEN} kg`);
});
