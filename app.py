from flask import Flask, request, jsonify, send_from_directory, send_file, render_template_string
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os
import shutil
import threading

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Configuración de la base de datos
DATABASE = 'asistencias.db'
BACKUP_DIR = 'backups'

# PIN para descarga de base de datos (cámbialo por el que quieras)
BACKUP_PIN = 'komei2024'

# =====================================================
# BACKUP AUTOMÁTICO DIARIO
# =====================================================

BACKUP_KEEP_COUNT = 5       # Cantidad de backups a conservar
CLEANUP_INTERVAL  = 604800  # Limpieza semanal (7 días en segundos)

def limpiar_backups_viejos():
    """Elimina los backups más viejos, conservando solo los últimos BACKUP_KEEP_COUNT."""
    try:
        if not os.path.exists(BACKUP_DIR):
            return

        archivos = sorted([
            f for f in os.listdir(BACKUP_DIR)
            if f.startswith('asistencias_') and f.endswith('.db')
        ], reverse=True)  # Más nuevo primero

        a_eliminar = archivos[BACKUP_KEEP_COUNT:]  # Todo lo que pase de los últimos 5
        for archivo in a_eliminar:
            os.remove(os.path.join(BACKUP_DIR, archivo))
            print(f'[Backup] Respaldo eliminado: {archivo}')

        if a_eliminar:
            print(f'[Backup] Limpieza semanal: {len(a_eliminar)} respaldo(s) eliminado(s), quedan {min(len(archivos), BACKUP_KEEP_COUNT)}')
        else:
            print(f'[Backup] Limpieza semanal: nada que eliminar ({len(archivos)} respaldo(s))')

    except Exception as e:
        print(f'[Backup] Error en limpieza: {e}')
    finally:
        # Programar la próxima limpieza en 7 días
        timer = threading.Timer(CLEANUP_INTERVAL, limpiar_backups_viejos)
        timer.daemon = True
        timer.start()


def realizar_backup():
    """Crea una copia de respaldo de la DB con la fecha del día."""
    try:
        if not os.path.exists(DATABASE):
            return

        os.makedirs(BACKUP_DIR, exist_ok=True)
        fecha_hoy = datetime.now().strftime('%Y%m%d')
        destino = os.path.join(BACKUP_DIR, f'asistencias_{fecha_hoy}.db')

        # Solo hacer backup si no existe uno de hoy
        if not os.path.exists(destino):
            shutil.copy2(DATABASE, destino)
            print(f'[Backup] Respaldo creado: {destino}')
        else:
            print(f'[Backup] Ya existe respaldo de hoy: {destino}')

    except Exception as e:
        print(f'[Backup] Error al crear respaldo: {e}')
    finally:
        # Programar el próximo backup en 24 horas
        timer = threading.Timer(86400, realizar_backup)
        timer.daemon = True
        timer.start()

def get_db():
    """Obtiene una conexión a la base de datos"""
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Inicializa la base de datos con las tablas necesarias"""
    conn = get_db()
    cursor = conn.cursor()
    
    # Tabla de clientes
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS clientes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            razon_social TEXT,
            ruc_dni TEXT,
            telefono TEXT,
            email TEXT,
            direccion TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabla de líderes/encargados
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lideres (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            telefono TEXT,
            email TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabla de empleados
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            dni TEXT,
            telefono TEXT,
            cargo TEXT,
            fecha_ingreso DATE,
            estado TEXT DEFAULT 'activo',
            foto TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Tabla de obras
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS obras (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            cliente_id INTEGER,
            lider_id INTEGER,
            direccion TEXT,
            fecha_inicio DATE,
            fecha_fin DATE,
            estado TEXT DEFAULT 'activa',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (cliente_id) REFERENCES clientes(id),
            FOREIGN KEY (lider_id) REFERENCES lideres(id)
        )
    ''')
    
    # Tabla de relación empleados-obras
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS obra_empleados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            obra_id INTEGER NOT NULL,
            empleado_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (obra_id) REFERENCES obras(id) ON DELETE CASCADE,
            FOREIGN KEY (empleado_id) REFERENCES empleados(id) ON DELETE CASCADE,
            UNIQUE(obra_id, empleado_id)
        )
    ''')
    
    # Tabla de asistencias
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS asistencias (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha DATE NOT NULL,
            obra_id INTEGER NOT NULL,
            empleado_id INTEGER NOT NULL,
            presente BOOLEAN NOT NULL,
            tipo_jornada TEXT,
            horas_extras REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (obra_id) REFERENCES obras(id),
            FOREIGN KEY (empleado_id) REFERENCES empleados(id)
        )
    ''')
    
    conn.commit()
    
    # Insertar datos de ejemplo si no existen
    cursor.execute('SELECT COUNT(*) as count FROM clientes')
    if cursor.fetchone()['count'] == 0:
        # Datos de ejemplo
        cursor.execute('''
            INSERT INTO clientes (nombre, razon_social, ruc_dni, telefono, email, direccion)
            VALUES ('Construcciones SA', 'Construcciones SA', '20123456789', '+54 9 11 1234-5678', 
                    'contacto@construcciones.com', 'Av. Principal 123')
        ''')
        
        cursor.execute('''
            INSERT INTO lideres (nombre, apellido, telefono, email)
            VALUES ('Juan', 'Pérez', '+54 9 11 9876-5432', 'juan.perez@email.com')
        ''')
        
        cursor.execute('''
            INSERT INTO empleados (nombre, apellido, dni, telefono, cargo, fecha_ingreso, estado)
            VALUES 
                ('Carlos', 'González', '12345678', '+54 9 11 1111-1111', 'Albañil', '2024-01-15', 'activo'),
                ('Miguel', 'Rodríguez', '23456789', '+54 9 11 2222-2222', 'Electricista', '2024-02-01', 'activo'),
                ('Pedro', 'Martínez', '34567890', '+54 9 11 3333-3333', 'Plomero', '2024-03-10', 'activo')
        ''')
        
        cursor.execute('''
            INSERT INTO obras (nombre, cliente_id, lider_id, direccion, fecha_inicio, fecha_fin, estado)
            VALUES ('Edificio Central', 1, 1, 'Calle 1 #123', '2024-01-01', '2024-12-31', 'activa')
        ''')
        
        # Asignar empleados a la obra
        cursor.execute('INSERT INTO obra_empleados (obra_id, empleado_id) VALUES (1, 1), (1, 2), (1, 3)')
        
        conn.commit()
    
    conn.close()

# =====================================================
# RUTAS - CLIENTES
# =====================================================

# =====================================================
# RUTAS FRONTEND
# =====================================================

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory('.', filename)

# =====================================================
# CLIENTES
# =====================================================

@app.route('/api/clientes', methods=['GET'])
def get_clientes():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM clientes ORDER BY nombre')
    clientes = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(clientes)

@app.route('/api/clientes', methods=['POST'])
def create_cliente():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO clientes (nombre, razon_social, ruc_dni, telefono, email, direccion)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (data['nombre'], data.get('razon_social'), data.get('ruc_dni'), 
          data.get('telefono'), data.get('email'), data.get('direccion')))
    conn.commit()
    cliente_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': cliente_id, 'message': 'Cliente creado exitosamente'}), 201

@app.route('/api/clientes/<int:id>', methods=['PUT'])
def update_cliente(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE clientes 
        SET nombre = ?, razon_social = ?, ruc_dni = ?, telefono = ?, email = ?, direccion = ?
        WHERE id = ?
    ''', (data['nombre'], data.get('razon_social'), data.get('ruc_dni'),
          data.get('telefono'), data.get('email'), data.get('direccion'), id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Cliente actualizado exitosamente'})

@app.route('/api/clientes/<int:id>', methods=['DELETE'])
def delete_cliente(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM clientes WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Cliente eliminado exitosamente'})

# =====================================================
# RUTAS - LÍDERES
# =====================================================

@app.route('/api/lideres', methods=['GET'])
def get_lideres():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM lideres ORDER BY nombre, apellido')
    lideres = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(lideres)

@app.route('/api/lideres', methods=['POST'])
def create_lider():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO lideres (nombre, apellido, telefono, email)
        VALUES (?, ?, ?, ?)
    ''', (data['nombre'], data['apellido'], data.get('telefono'), data.get('email')))
    conn.commit()
    lider_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': lider_id, 'message': 'Líder creado exitosamente'}), 201

@app.route('/api/lideres/<int:id>', methods=['PUT'])
def update_lider(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE lideres 
        SET nombre = ?, apellido = ?, telefono = ?, email = ?
        WHERE id = ?
    ''', (data['nombre'], data['apellido'], data.get('telefono'), data.get('email'), id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Líder actualizado exitosamente'})

@app.route('/api/lideres/<int:id>', methods=['DELETE'])
def delete_lider(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM lideres WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Líder eliminado exitosamente'})

# =====================================================
# RUTAS - EMPLEADOS
# =====================================================

@app.route('/api/empleados', methods=['GET'])
def get_empleados():
    estado = request.args.get('estado')
    conn = get_db()
    cursor = conn.cursor()
    
    if estado:
        cursor.execute('SELECT * FROM empleados WHERE estado = ? ORDER BY nombre, apellido', (estado,))
    else:
        cursor.execute('SELECT * FROM empleados ORDER BY nombre, apellido')
    
    empleados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(empleados)

@app.route('/api/empleados', methods=['POST'])
def create_empleado():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO empleados (nombre, apellido, dni, telefono, cargo, fecha_ingreso, estado, foto)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (data['nombre'], data['apellido'], data.get('dni'), data.get('telefono'),
          data.get('cargo'), data.get('fecha_ingreso'), data.get('estado', 'activo'), data.get('foto')))
    conn.commit()
    empleado_id = cursor.lastrowid
    conn.close()
    return jsonify({'id': empleado_id, 'message': 'Empleado creado exitosamente'}), 201

@app.route('/api/empleados/<int:id>', methods=['PUT'])
def update_empleado(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE empleados 
        SET nombre = ?, apellido = ?, dni = ?, telefono = ?, cargo = ?, 
            fecha_ingreso = ?, estado = ?, foto = ?
        WHERE id = ?
    ''', (data['nombre'], data['apellido'], data.get('dni'), data.get('telefono'),
          data.get('cargo'), data.get('fecha_ingreso'), data.get('estado'), data.get('foto'), id))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Empleado actualizado exitosamente'})

@app.route('/api/empleados/<int:id>', methods=['DELETE'])
def delete_empleado(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM empleados WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Empleado eliminado exitosamente'})

# =====================================================
# RUTAS - OBRAS
# =====================================================

@app.route('/api/obras', methods=['GET'])
def get_obras():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT o.*, c.nombre as cliente_nombre, 
               l.nombre || ' ' || l.apellido as lider_nombre
        FROM obras o
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN lideres l ON o.lider_id = l.id
        ORDER BY o.nombre
    ''')
    obras = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(obras)

@app.route('/api/obras', methods=['POST'])
def create_obra():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        INSERT INTO obras (nombre, cliente_id, lider_id, direccion, fecha_inicio, fecha_fin, estado)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (data['nombre'], data.get('cliente_id'), data.get('lider_id'), data.get('direccion'),
          data.get('fecha_inicio'), data.get('fecha_fin'), data.get('estado', 'activa')))
    
    obra_id = cursor.lastrowid
    
    # Asignar empleados a la obra
    if 'empleados_ids' in data and data['empleados_ids']:
        for empleado_id in data['empleados_ids']:
            cursor.execute('INSERT INTO obra_empleados (obra_id, empleado_id) VALUES (?, ?)',
                         (obra_id, empleado_id))
    
    conn.commit()
    conn.close()
    return jsonify({'id': obra_id, 'message': 'Obra creada exitosamente'}), 201

@app.route('/api/obras/<int:id>', methods=['PUT'])
def update_obra(id):
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        UPDATE obras 
        SET nombre = ?, cliente_id = ?, lider_id = ?, direccion = ?, 
            fecha_inicio = ?, fecha_fin = ?, estado = ?
        WHERE id = ?
    ''', (data['nombre'], data.get('cliente_id'), data.get('lider_id'), data.get('direccion'),
          data.get('fecha_inicio'), data.get('fecha_fin'), data.get('estado'), id))
    
    # Actualizar empleados asignados
    cursor.execute('DELETE FROM obra_empleados WHERE obra_id = ?', (id,))
    if 'empleados_ids' in data and data['empleados_ids']:
        for empleado_id in data['empleados_ids']:
            cursor.execute('INSERT INTO obra_empleados (obra_id, empleado_id) VALUES (?, ?)',
                         (id, empleado_id))
    
    conn.commit()
    conn.close()
    return jsonify({'message': 'Obra actualizada exitosamente'})

@app.route('/api/obras/<int:id>', methods=['DELETE'])
def delete_obra(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM obras WHERE id = ?', (id,))
    conn.commit()
    conn.close()
    return jsonify({'message': 'Obra eliminada exitosamente'})

@app.route('/api/obras/<int:id>/empleados', methods=['GET'])
def get_obra_empleados(id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT e.*
        FROM empleados e
        INNER JOIN obra_empleados oe ON e.id = oe.empleado_id
        WHERE oe.obra_id = ? AND e.estado = 'activo'
        ORDER BY e.nombre, e.apellido
    ''', (id,))
    empleados = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(empleados)

# =====================================================
# RUTAS - ASISTENCIAS
# =====================================================

@app.route('/api/asistencias/registrar', methods=['POST'])
def registrar_asistencias():
    data = request.json
    conn = get_db()
    cursor = conn.cursor()
    
    fecha    = data['fecha']
    obra_id  = data['obra_id']
    lider_id = data['lider_id']
    registros = data['registros']
    
    # ── Validar conflictos: empleados que ya marcaron PRESENTE en otra obra ese día ──
    empleados_presentes = [
        r['empleado_id'] for r in registros if r.get('presente') == True
    ]
    
    conflictos = []
    if empleados_presentes:
        placeholders = ','.join('?' * len(empleados_presentes))
        cursor.execute(f'''
            SELECT a.empleado_id,
                   e.nombre || '　' || e.apellido AS nombre_completo,
                   o.nombre AS otra_obra
            FROM asistencias a
            INNER JOIN empleados e ON a.empleado_id = e.id
            INNER JOIN obras o ON a.obra_id = o.id
            WHERE a.fecha = ?
              AND a.obra_id != ?
              AND a.presente = 1
              AND a.empleado_id IN ({placeholders})
        ''', [fecha, obra_id] + empleados_presentes)
        conflictos = [dict(row) for row in cursor.fetchall()]
    
    if conflictos:
        conn.close()
        # Armar mensaje en japonés con cada conflicto
        detalles = ', '.join(
            f"{c['nombre_completo']}（{c['otra_obra']}）" for c in conflictos
        )
        return jsonify({
            'error': 'conflict',
            'message': f'以下の作業員は既に別の現場で出勤済みです：{detalles}',
            'conflictos': conflictos
        }), 409

    # ── Sin conflictos: guardar ──────────────────────────────────
    # Eliminar asistencias existentes para esa fecha y obra
    cursor.execute('DELETE FROM asistencias WHERE fecha = ? AND obra_id = ?', (fecha, obra_id))
    
    # Insertar nuevas asistencias
    for registro in registros:
        cursor.execute('''
            INSERT INTO asistencias (fecha, obra_id, empleado_id, presente, tipo_jornada, horas_extras)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (fecha, obra_id, registro['empleado_id'], registro['presente'],
              registro['tipo_jornada'], registro.get('horas_extras', 0)))
    
    conn.commit()
    conn.close()
    return jsonify({'message': f'{len(registros)} asistencias guardadas exitosamente'}), 201

@app.route('/api/asistencias', methods=['GET'])
def get_asistencias():
    conn = get_db()
    cursor = conn.cursor()
    
    # Construir query con filtros
    query = '''
        SELECT a.*, 
               o.nombre as obra_nombre,
               c.id as cliente_id, c.nombre as cliente_nombre,
               l.id as lider_id, l.nombre as lider_nombre, l.apellido as lider_apellido,
               e.nombre as empleado_nombre, e.apellido as empleado_apellido, e.cargo
        FROM asistencias a
        INNER JOIN obras o ON a.obra_id = o.id
        LEFT JOIN clientes c ON o.cliente_id = c.id
        LEFT JOIN lideres l ON o.lider_id = l.id
        INNER JOIN empleados e ON a.empleado_id = e.id
        WHERE 1=1
    '''
    params = []
    
    if request.args.get('fecha_desde'):
        query += ' AND a.fecha >= ?'
        params.append(request.args.get('fecha_desde'))
    
    if request.args.get('fecha_hasta'):
        query += ' AND a.fecha <= ?'
        params.append(request.args.get('fecha_hasta'))
    
    if request.args.get('cliente_id'):
        query += ' AND c.id = ?'
        params.append(request.args.get('cliente_id'))
    
    if request.args.get('obra_id'):
        query += ' AND a.obra_id = ?'
        params.append(request.args.get('obra_id'))
    
    if request.args.get('empleado_id'):
        query += ' AND a.empleado_id = ?'
        params.append(request.args.get('empleado_id'))
    
    if request.args.get('lider_id'):
        query += ' AND l.id = ?'
        params.append(request.args.get('lider_id'))
    
    query += ' ORDER BY a.fecha DESC, e.nombre'
    
    cursor.execute(query, params)
    asistencias = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(asistencias)

@app.route('/api/asistencias/verificar', methods=['GET'])
def verificar_asistencia():
    fecha = request.args.get('fecha')
    obra_id = request.args.get('obra_id')
    
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT a.*, e.nombre, e.apellido
        FROM asistencias a
        INNER JOIN empleados e ON a.empleado_id = e.id
        WHERE a.fecha = ? AND a.obra_id = ?
    ''', (fecha, obra_id))
    
    asistencias = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify(asistencias)

# =====================================================
# DESCARGA DE BASE DE DATOS (URL PRIVADA + PIN)
# =====================================================

PAGE_BACKUP = '''<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>データベース管理</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Meiryo', sans-serif;
            background: #1a1a2e;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: #16213e;
            border: 1px solid #0f3460;
            border-radius: 12px;
            padding: 40px;
            width: 100%;
            max-width: 420px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .logo {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo h1 { color: #e94560; font-size: 1.4rem; letter-spacing: 2px; }
        .logo p  { color: #888; font-size: 0.85rem; margin-top: 6px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; color: #aaa; font-size: 0.85rem; margin-bottom: 8px; }
        input[type=password] {
            width: 100%;
            padding: 12px 16px;
            background: #0f3460;
            border: 1px solid #1a4a80;
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
            letter-spacing: 4px;
            text-align: center;
            outline: none;
        }
        input[type=password]:focus { border-color: #e94560; }
        .btn {
            width: 100%;
            padding: 13px;
            border: none;
            border-radius: 8px;
            font-size: 1rem;
            cursor: pointer;
            font-family: inherit;
            transition: opacity 0.2s;
        }
        .btn:hover { opacity: 0.85; }
        .btn-primary { background: #e94560; color: #fff; margin-bottom: 10px; }
        .btn-secondary { background: #0f3460; color: #aaa; }
        .error {
            background: rgba(233,69,96,0.15);
            border: 1px solid #e94560;
            border-radius: 8px;
            color: #e94560;
            padding: 10px 14px;
            font-size: 0.875rem;
            margin-bottom: 16px;
            display: none;
        }
        .file-list {
            margin-top: 24px;
            display: none;
        }
        .file-list h3 { color: #aaa; font-size: 0.85rem; margin-bottom: 12px; letter-spacing: 1px; }
        .file-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 14px;
            background: #0f3460;
            border-radius: 8px;
            margin-bottom: 8px;
        }
        .file-name { color: #ddd; font-size: 0.9rem; }
        .file-date { color: #888; font-size: 0.75rem; }
        .btn-download {
            background: #1a4a80;
            color: #7eb8f7;
            border: none;
            padding: 6px 14px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.8rem;
            text-decoration: none;
        }
        .btn-download:hover { background: #e94560; color: #fff; }
        .tag-current {
            background: #e94560;
            color: #fff;
            font-size: 0.7rem;
            padding: 2px 7px;
            border-radius: 4px;
            margin-left: 6px;
        }
    </style>
</head>
<body>
<div class="container">
    <div class="logo">
        <h1>🗄️ データベース管理</h1>
        <p>Komei Densetsu - バックアップ</p>
    </div>

    <div class="error" id="errorMsg">PINが正しくありません</div>

    <div id="loginForm">
        <div class="form-group">
            <label>PINコードを入力してください</label>
            <input type="password" id="pinInput" placeholder="••••••••" maxlength="20"
                   onkeydown="if(event.key==='Enter') verificar()">
        </div>
        <button class="btn btn-primary" onclick="verificar()">🔓 確認</button>
    </div>

    <div class="file-list" id="fileList">
        <h3>📁 利用可能なバックアップ</h3>
        <div id="filesContainer"></div>
        <div style="margin-top:16px;">
            <button class="btn btn-secondary" onclick="logout()">🔒 ログアウト</button>
        </div>
    </div>
</div>

<script>
let pinOk = '';

async function verificar() {
    const pin = document.getElementById('pinInput').value;
    if (!pin) return;

    const res = await fetch('/backup/lista?pin=' + encodeURIComponent(pin));
    if (res.status === 403) {
        document.getElementById('errorMsg').style.display = 'block';
        document.getElementById('pinInput').value = '';
        return;
    }

    const data = await res.json();
    pinOk = pin;
    document.getElementById('errorMsg').style.display = 'none';
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('fileList').style.display = 'block';

    const container = document.getElementById('filesContainer');
    container.innerHTML = '';

    if (data.archivos.length === 0) {
        container.innerHTML = '<p style="color:#888;font-size:0.85rem;">バックアップがありません</p>';
        return;
    }

    data.archivos.forEach((f, i) => {
        const isLatest = i === 0;
        container.innerHTML += `
            <div class="file-item">
                <div>
                    <span class="file-name">${f.nombre}</span>
                    ${isLatest ? '<span class="tag-current">最新</span>' : ''}
                    <div class="file-date">${f.fecha} &nbsp;|&nbsp; ${f.tamaño}</div>
                </div>
                <a class="btn-download" href="/backup/descargar/${f.nombre}?pin=${encodeURIComponent(pinOk)}">
                    ⬇ DL
                </a>
            </div>`;
    });
}

function logout() {
    pinOk = '';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('fileList').style.display = 'none';
    document.getElementById('pinInput').value = '';
}
</script>
</body>
</html>'''


@app.route('/backup')
def backup_page():
    """Página de descarga de backups — URL privada."""
    return render_template_string(PAGE_BACKUP)


@app.route('/backup/lista')
def backup_lista():
    """Devuelve la lista de backups disponibles (requiere PIN)."""
    pin = request.args.get('pin', '')
    if pin != BACKUP_PIN:
        return jsonify({'error': 'PIN incorrecto'}), 403

    archivos = []
    if os.path.exists(BACKUP_DIR):
        for nombre in sorted(os.listdir(BACKUP_DIR), reverse=True):
            if nombre.startswith('asistencias_') and nombre.endswith('.db'):
                ruta = os.path.join(BACKUP_DIR, nombre)
                stat = os.stat(ruta)
                tamaño_kb = stat.st_size / 1024
                fecha_mod = datetime.fromtimestamp(stat.st_mtime).strftime('%Y/%m/%d %H:%M')
                archivos.append({
                    'nombre': nombre,
                    'fecha':  fecha_mod,
                    'tamaño': f'{tamaño_kb:.1f} KB'
                })

    # También incluir la DB activa
    if os.path.exists(DATABASE):
        stat = os.stat(DATABASE)
        archivos.insert(0, {
            'nombre': 'asistencias.db (本番)',
            'fecha':  datetime.fromtimestamp(stat.st_mtime).strftime('%Y/%m/%d %H:%M'),
            'tamaño': f'{stat.st_size/1024:.1f} KB'
        })

    return jsonify({'archivos': archivos})


@app.route('/backup/descargar/<filename>')
def backup_descargar(filename):
    """Descarga un archivo de backup (requiere PIN)."""
    pin = request.args.get('pin', '')
    if pin != BACKUP_PIN:
        return jsonify({'error': 'PIN incorrecto'}), 403

    # Solo permitir archivos .db para evitar path traversal
    if not filename.endswith('.db') or '/' in filename or '\\' in filename or '..' in filename:
        return jsonify({'error': 'Archivo no válido'}), 400

    # Determinar si es la DB activa o un backup
    if filename == 'asistencias.db (本番)':
        if not os.path.exists(DATABASE):
            return jsonify({'error': 'Archivo no encontrado'}), 404
        return send_file(
            os.path.abspath(DATABASE),
            as_attachment=True,
            download_name=f'asistencias_actual_{datetime.now().strftime("%Y%m%d_%H%M")}.db'
        )

    ruta = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(ruta):
        return jsonify({'error': 'Archivo no encontrado'}), 404

    return send_file(os.path.abspath(ruta), as_attachment=True, download_name=filename)


# =====================================================
# INICIALIZACIÓN Y ARRANQUE
# =====================================================

if __name__ == '__main__':
    # Crear la base de datos si no existe
    if not os.path.exists(DATABASE):
        print('Creando base de datos...')
        init_db()
        print('Base de datos creada exitosamente!')
    else:
        # Verificar que existan las tablas
        init_db()
    
    # Iniciar backup automático diario y limpieza semanal
    realizar_backup()
    limpiar_backups_viejos()
    print(f'[Backup] Respaldo diario activado → carpeta /{BACKUP_DIR}/')
    print(f'[Backup] Limpieza semanal activada → conserva los últimos {BACKUP_KEEP_COUNT} respaldos')
    
    print('Servidor iniciado en http://localhost:5000')
    print('Presiona CTRL+C para detener')
    app.run(debug=True, host='0.0.0.0', port=5000)
