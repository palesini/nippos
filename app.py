from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import os

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Configuración de la base de datos
DATABASE = 'asistencias.db'

# Ruta principal para servir el index.html
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

# Ruta para servir archivos estáticos (CSS, JS)
@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('.', path)

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
    
    fecha = data['fecha']
    obra_id = data['obra_id']
    lider_id = data['lider_id']
    registros = data['registros']
    
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
    
    print('Servidor iniciado en http://localhost:5000')
    print('Presiona CTRL+C para detener')
    app.run(debug=True, host='0.0.0.0', port=5000)
