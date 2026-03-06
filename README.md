# Arbol Solutraza

Web app React que replica el Excel `arbol_solutraza.xlsm` para visualizar la trazabilidad de RPA (Refined Palm Oil) en origen a través del árbol de procesos de fabricación.

## ¿Qué hace?

- **Árbol jerárquico expandible** de ~101 nodos de procesos, con colores por rendimiento (verde ≥99%, ámbar ≥97%, rojo <97%)
- **Métricas por nodo**: cantidad entrada/salida, merma proceso y heredada, rendimiento %, fecha, % reparto
- **Panel de resumen**: KPIs globales, tabla de RPA por producto, pedidos de venta
- **Listas de exclusión editables**: códigos DRWBCK, aceites útiles/no útiles
- **Búsqueda** en tiempo real por ID, nombre de proceso o producto

## Estructura del proyecto

```
Arbol_fabricaciones/
├── public/
│   └── index.html
├── src/
│   ├── App.js                      # Componente raíz, navegación, estado global
│   ├── App.css                     # Estilos globales (dark theme)
│   ├── index.js                    # Entry point
│   ├── components/
│   │   ├── TreeView.js             # Árbol jerárquico (reemplaza hoja "arbol")
│   │   ├── ExclusionesPanel.js     # Editor de listas de exclusión (hoja "exclusiones")
│   │   ├── SummaryPanel.js         # Métricas y tablas resumen
│   │   └── SearchBar.js            # Búsqueda por proceso/producto/ID
│   ├── utils/
│   │   └── treeUtils.js            # buildTree(), computeTreeStats(), fmt(), matchesSearch()
│   └── data/
│       └── treeData.json           # Datos exportados del Excel (101 nodos + exclusiones)
├── package.json
└── .gitignore
```

## Instalación y arranque

```bash
npm install
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador.

## Datos incluidos

- **101 nodos** en el árbol de procesos (exportados del Excel actual)
- **Proceso raíz**: 47201
- **Aceite RPA en origen**: 15.200 kg
- **Exclusiones DRWBCK**: FAC, AND, SDC, ARE, VTK, MAR
- **Aceites útiles**: solutex, omegatex, hf, sx70ee, sx85ee, alga, magomega, om3ga, lipinova
- **Aceites no útiles**: solutexn20, 0100, 0501, feed

## Lógica replicada del Excel/VBA

El macro VBA original:
1. Conecta a PostgreSQL (`soluclon_test`) y consulta `st_processes`, `st_process_output`, `st_process_input`, `st_elements`
2. Recorre el árbol en BFS (FIFO) desde el proceso raíz hacia abajo
3. Filtra por tipo de aceite (útiles vs no útiles)
4. Calcula mermas: propia del proceso + heredada (acumulada de padres)
5. Excluye pedidos SAL con códigos DRWBCK
6. Calcula RPA prorrateado: `RPA_padre × % reparto`

En la web app, estos datos están pre-calculados en `src/data/treeData.json`. Para conectar con la BBDD en tiempo real, ver la sección siguiente.

## Extensión futura: backend en tiempo real

Para que los datos vengan de Solutraza en tiempo real en lugar del JSON estático:

```bash
npm install express pg cors
```

Crea un `server.js` con un endpoint `/api/arbol/:procesoId` que ejecute el BFS sobre la base de datos PostgreSQL y devuelva el árbol calculado. Las credenciales de conexión deben gestionarse mediante variables de entorno (`.env`), nunca en el código fuente.

## Tecnologías

| Capa | Tecnología |
|---|---|
| UI | React 18 (hooks) |
| Estilos | CSS con variables (dark theme) |
| Datos | JSON estático exportado del Excel |
| Build | Create React App |
| Backend (futuro) | Node.js + Express + PostgreSQL |
