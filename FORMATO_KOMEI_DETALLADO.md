# 📊 FORMATO EXCEL KOMEI DENSETSU - DOCUMENTACIÓN COMPLETA

## ESTRUCTURA EXACTA DEL DOCUMENTO

### FILA 1 - Encabezado Principal
```
A1: "会社名" [center align]
B1-D1: "Komei Densetsu" [merged cells]
Q1: "出　　　勤　　　表" [BOLD, título principal]
AG1: "自" [right align] (Desde)
AH1-AI1: "令和　4年　3月 21日" [merged, right align]
```

### FILA 2 - Obra y Fecha Fin
```
A2: "現場名" [center align]
B2-D2: [Nombre de la obra] [merged cells]
AG2: "至" [right align] (Hasta)
AH2-AI2: "令和　4年　4月 20日" [merged, right align]
```

### FILA 3 - Meses y Headers de Totales
```
A3: "１" [left align]
G3-I3: "（  3月 ）" [merged, BOLD, center]
V3-Y3: "（ 4月 ）" [merged, BOLD, center]
AH3-AH5: "定時小計" [merged vertical, center]
AI3-AI5: "残業小計" [merged vertical, center]
```

### FILA 4 - Números de Días
```
A4: "No" [BOLD, center]
B4: "氏　名" [BOLD, center]
C4-AG4: Días del mes (21, 22, 23... 31, 1, 2... 20) [center]
  - Los DOMINGOS están en BOLD
```

### FILA 5 - Días de la Semana
```
C5-AG5: 月, 火, 水, 木, 金, 土, 日 [center]
  - Los DOMINGOS (日) están en BOLD
```

## DATOS DE EMPLEADOS (Filas 6 en adelante)

### Estructura por Empleado (2 filas por empleado)

**Fila PAR (6, 8, 10, 12...)** - Asistencia:
```
A: [vacío]
B: [Nombre completo del empleado]
C-AG: "出" (presente) o vacío (ausente)
AH: =COUNTIF(C6:AG6,"出")
AI: [vacío]
```

**Fila IMPAR (7, 9, 11, 13...)** - Horas Extras:
```
A: [Número empleado: 1, 2, 3...]
B: "残業時間"
C-AG: [Horas extras: números o vacío]
AH: [vacío]
AI: =SUM(C7:AG7)
```

## CELDAS COMBINADAS (Merged Cells)

```javascript
[
  'B1:D1',     // Nombre empresa
  'B2:D2',     // Nombre obra
  'AH1:AI1',   // Fecha inicio
  'AH2:AI2',   // Fecha fin
  'G3:I3',     // Mes inicio
  'V3:Y3',     // Mes fin
  'AH3:AH5',   // Header "定時小計" (vertical)
  'AI3:AI5'    // Header "残業小計" (vertical)
]
```

## ESTILOS Y FORMATOS

### Fuentes en BOLD:
- Q1: Título principal
- G3, V3: Nombres de meses
- A4, B4: Headers "No" y "氏　名"
- Domingos en fila 4 (números de día)
- Domingos en fila 5 (日)

### Alineación:
- **Center**: A1, A2, B4, días (C4-AG4), días de semana (C5-AG5), AH3, AI3
- **Right**: AG1, AG2, AH1, AH2
- **Left**: A3, datos de empleados

### Anchos de Columnas:
- A: 9.71
- B: 17.14
- C-AG: 3.57 (días)
- AH: 11.0 (totales)
- AI: 11.0 (totales)

### Altura de Filas:
- Fila 1: 13.5
- Fila 2: 14.25
- Fila 3: 12.0
- Fila 4: 11.25
- Fila 5: 11.25
- Filas empleados: 15.0 (nombre), 13.5 (horas extras)

## PERIODO DE FECHAS

El sistema usa periodos del 21 al 20:
- **Inicio**: Día 21 del mes 1
- **Fin**: Día 20 del mes 2

Ejemplo: 3/21 al 4/20

## SÍMBOLOS Y VALORES

- **出**: Presente (出席)
- **Vacío**: Ausente
- **Números**: Horas extras (0-12 típicamente)

## CALENDARIO JAPONÉS (Reiwa)

Conversión de año:
- 2019 = Reiwa 1 (令和元年)
- 2020 = Reiwa 2 (令和2年)
- 2021 = Reiwa 3 (令和3年)
- 2022 = Reiwa 4 (令和4年)
- 2023 = Reiwa 5 (令和5年)
- 2024 = Reiwa 6 (令和6年)
- 2025 = Reiwa 7 (令和7年)
- 2026 = Reiwa 8 (令和8年)

Fórmula: Año Reiwa = Año Occidental - 2018

## NOTAS IMPORTANTES

1. ✅ Los domingos se marcan automáticamente en BOLD
2. ✅ Las fórmulas usan rangos C:AG (31 columnas)
3. ✅ Cada empleado ocupa exactamente 2 filas
4. ✅ El documento está diseñado para impresión en A3 horizontal
5. ✅ Todos los bordes están definidos en las celdas
