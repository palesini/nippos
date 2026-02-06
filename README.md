# Sistema de Asistencia para Construcción

Sistema completo de gestión de asistencias con backend Flask y SQLite.

## 📋 Requisitos

- Python 3.8 o superior
- Navegador web moderno (Chrome, Firefox, Edge)

## 🚀 Instalación

### 1. Instalar Python
Si no tienes Python instalado, descárgalo de: https://www.python.org/downloads/

### 2. Instalar dependencias
Abre una terminal/consola en la carpeta del proyecto y ejecuta:

```bash
pip install Flask flask-cors
```

O usando el archivo requirements.txt:

```bash
pip install -r requirements.txt
```

## ▶️ Cómo usar

### Paso 1: Iniciar el servidor
Abre una terminal en la carpeta del proyecto y ejecuta:

```bash
python app.py
```

Deberías ver algo como:
```
Creando base de datos...
Base de datos creada exitosamente!
Servidor iniciado en http://localhost:5000
 * Running on http://0.0.0.0:5000
```

### Paso 2: Abrir la aplicación
Abre tu navegador y abre el archivo `index.html` directamente (doble clic)

O si prefieres, sirve los archivos estáticos con:
```bash
python -m http.server 8080
```

Y luego visita: http://localhost:8080

## 📁 Estructura del proyecto

```
proyecto/
├── app.py                  # Servidor backend Flask
├── asistencias.db         # Base de datos SQLite (se crea automáticamente)
├── requirements.txt       # Dependencias de Python
├── index.html            # Interfaz web
├── script.js             # JavaScript (conecta con backend)
├── styles.css            # Estilos
└── README.md             # Este archivo
```

## 🔧 Funcionalidades

### ✅ Gestión de Empleados
- Agregar, editar y eliminar empleados
- Estados: Activo/Inactivo
- Información: nombre, DNI, cargo, teléfono, fecha de ingreso

### ✅ Gestión de Clientes
- Agregar, editar y eliminar clientes
- Información completa: razón social, RUC/DNI, contacto

### ✅ Gestión de Obras
- Crear obras y asignar clientes y líderes
- Asignar múltiples empleados a cada obra
- Estados: Activa, Pausada, Finalizada

### ✅ Gestión de Líderes/Encargados
- Registro de responsables de obras
- Información de contacto

### ✅ Registro de Asistencias
- Marcar presente/ausente por empleado
- Tipos de jornada: Día, Noche, Día y Noche
- Registro de horas extras
- Cargar registros existentes para editar

### ✅ Consultas y Reportes
- Filtrar por fecha, cliente, obra, empleado, líder
- Visualización de asistencias completas
- Reportes estadísticos con totales

## 🗄️ Base de Datos

El sistema usa SQLite, que crea un archivo `asistencias.db` automáticamente.

### Tablas principales:
- `clientes` - Información de clientes
- `lideres` - Líderes/encargados de obras
- `empleados` - Trabajadores
- `obras` - Proyectos de construcción
- `obra_empleados` - Relación empleados-obras
- `asistencias` - Registro de asistencias diarias

## 🔄 API Endpoints

El backend expone los siguientes endpoints REST:

### Clientes
- `GET /api/clientes` - Listar todos
- `POST /api/clientes` - Crear nuevo
- `PUT /api/clientes/<id>` - Actualizar
- `DELETE /api/clientes/<id>` - Eliminar

### Empleados
- `GET /api/empleados` - Listar todos
- `GET /api/empleados?estado=activo` - Filtrar por estado
- `POST /api/empleados` - Crear nuevo
- `PUT /api/empleados/<id>` - Actualizar
- `DELETE /api/empleados/<id>` - Eliminar

### Obras
- `GET /api/obras` - Listar todas
- `GET /api/obras/<id>/empleados` - Empleados de una obra
- `POST /api/obras` - Crear nueva
- `PUT /api/obras/<id>` - Actualizar
- `DELETE /api/obras/<id>` - Eliminar

### Líderes
- `GET /api/lideres` - Listar todos
- `POST /api/lideres` - Crear nuevo
- `PUT /api/lideres/<id>` - Actualizar
- `DELETE /api/lideres/<id>` - Eliminar

### Asistencias
- `POST /api/asistencias/registrar` - Guardar asistencias
- `GET /api/asistencias` - Consultar con filtros
- `GET /api/asistencias/verificar?fecha=X&obra_id=Y` - Verificar existentes

## ⚠️ Solución de Problemas

### Error: "No se puede conectar al servidor"
1. Verifica que el servidor Python esté corriendo (`python app.py`)
2. Asegúrate de que muestre "Running on http://0.0.0.0:5000"
3. Revisa la consola del navegador (F12) para ver errores

### Error: "ModuleNotFoundError: No module named 'flask'"
Instala Flask:
```bash
pip install Flask flask-cors
```

### La base de datos no se crea
1. Verifica que tengas permisos de escritura en la carpeta
2. El archivo `asistencias.db` se crea automáticamente al ejecutar `app.py`

### Los cambios no se guardan
1. Verifica que el servidor esté corriendo
2. Abre la consola del navegador (F12) para ver errores
3. Asegúrate de que el archivo `script.js` apunte a `http://localhost:5000/api`

## 📝 Datos de Ejemplo

El sistema viene con datos de ejemplo:
- 1 Cliente: "Construcciones SA"
- 1 Líder: "Juan Pérez"
- 3 Empleados: Carlos, Miguel, Pedro
- 1 Obra: "Edificio Central" con los 3 empleados asignados

Estos datos te permiten probar el sistema inmediatamente.

## 🔐 Seguridad

**IMPORTANTE**: Este es un sistema básico para uso local. Para producción deberías:
- Agregar autenticación de usuarios
- Implementar HTTPS
- Validar y sanitizar todas las entradas
- Agregar control de acceso basado en roles

## 📧 Soporte

Si tienes problemas:
1. Revisa la consola del navegador (F12 → Console)
2. Revisa la terminal donde corre Python
3. Verifica que todos los archivos estén en la misma carpeta

## 📄 Licencia

Sistema de uso libre para gestión interna.
