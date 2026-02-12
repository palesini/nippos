// API Base URL - se ajusta automáticamente según el entorno
const API_URL = window.location.origin + '/api';

// Estado global
let currentShift = 'dia';
let registrosAsistencia = {};

// =====================================================
// INICIALIZACIÓN
// =====================================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando aplicación...');
    
    // Establecer fecha actual
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('registroFecha').value = today;
    
    // Cargar datos iniciales
    await cargarDatosIniciales();
    
    console.log('Aplicación inicializada correctamente');
});

async function cargarDatosIniciales() {
    try {
        await Promise.all([
            cargarClientes(),
            cargarObras(),
            cargarLideres(),
            cargarEmpleados(),
            cargarEmpleadosRegistro()
        ]);
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        mostrarNotificacion('サーバーに接続できません。サーバーが起動しているか確認してください。', 'error');
    }
}

// =====================================================
// NAVEGACIÓN
// =====================================================

function changeView(viewName) {
    console.log('Cambiando a vista:', viewName);
    
    // Actualizar botones de navegación
    document.querySelectorAll('.nav-item').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Cambiar vista
    document.querySelectorAll('.view').forEach(view => {
        view.classList.remove('active');
    });
    const activeView = document.getElementById(`view-${viewName}`);
    if (activeView) {
        activeView.classList.add('active');
    }
    
    // Cargar datos según la vista
    switch(viewName) {
        case 'empleados':
            cargarTablaEmpleados();
            break;
        case 'clientes':
            cargarTablaClientes();
            break;
        case 'obras':
            cargarTablaObras();
            break;
        case 'lideres':
            cargarTablaLideres();
            break;
        case 'consultas':
            cargarFiltrosConsultas();
            break;
        case 'reportes':
            cargarFiltrosReportes();
            break;
    }
}

// =====================================================
// REGISTRO DE ASISTENCIA
// =====================================================

function selectShift(shift) {
    currentShift = shift;
    document.querySelectorAll('.shift-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`[data-shift="${shift}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
}

async function cargarEmpleadosRegistro() {
    try {
        const response = await fetch(`${API_URL}/empleados?estado=activo`);
        const empleados = await response.json();
        
        const container = document.getElementById('listaEmpleadosRegistro');
        container.innerHTML = '';
        
        if (empleados.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No hay empleados activos. Agrega empleados desde la sección Empleados.</p>';
            return;
        }
        
        empleados.forEach(empleado => {
            const registro = registrosAsistencia[empleado.id] || {};
            const presente = registro.presente;
            
            const fotoHtml = empleado.foto 
                ? `<img src="${empleado.foto}" class="employee-photo-small" alt="${empleado.nombre}">` 
                : `<div class="employee-photo-placeholder">👷</div>`;
            
            const item = document.createElement('div');
            item.className = 'worker-item';
            item.innerHTML = `
                <div class="worker-info">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        ${fotoHtml}
                        <div>
                            <div class="worker-name">${empleado.nombre} ${empleado.apellido}</div>
                            <div class="worker-meta">${empleado.cargo || 'Sin cargo'}${empleado.telefono ? ' • ' + empleado.telefono : ''}</div>
                        </div>
                    </div>
                </div>
                <div class="worker-controls">
                    <div class="attendance-toggle">
                        <button class="attendance-btn ${presente === true ? 'present' : 'unset'}" 
                                onclick="marcarAsistencia(${empleado.id}, true)">
                            ✓
                        </button>
                        <button class="attendance-btn ${presente === false ? 'absent' : 'unset'}" 
                                onclick="marcarAsistencia(${empleado.id}, false)">
                            ✕
                        </button>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <label style="font-size: 12px; font-weight: 600; color: #666;">残業</label>
                        <input type="number" 
                               class="overtime-input" 
                               placeholder="0"
                               min="0" 
                               step="0.5"
                               value="${registro.horas_extras || 0}"
                               onchange="actualizarHorasExtras(${empleado.id}, this.value)"
                               title="残業">
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
        
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error al cargar empleados:', error);
        mostrarNotificacion('作業員の読み込みエラー：' + error.message, 'error');
    }
}

function marcarAsistencia(empleadoId, presente) {
    if (!registrosAsistencia[empleadoId]) {
        registrosAsistencia[empleadoId] = {};
    }
    
    if (registrosAsistencia[empleadoId].presente === presente) {
        delete registrosAsistencia[empleadoId].presente;
    } else {
        registrosAsistencia[empleadoId].presente = presente;
    }
    
    // Recargar empleados respetando la obra seleccionada
    const obraId = document.getElementById('registroObra').value;
    if (obraId) {
        cargarEmpleadosDeObra(obraId);
    } else {
        cargarEmpleadosRegistro();
    }
}

function actualizarHorasExtras(empleadoId, horas) {
    if (!registrosAsistencia[empleadoId]) {
        registrosAsistencia[empleadoId] = {};
    }
    registrosAsistencia[empleadoId].horas_extras = parseFloat(horas) || 0;
}

function actualizarEstadisticas() {
    let presentes = 0;
    let ausentes = 0;
    
    Object.values(registrosAsistencia).forEach(registro => {
        if (registro.presente === true) presentes++;
        if (registro.presente === false) ausentes++;
    });
    
    document.getElementById('statPresentes').textContent = presentes;
    document.getElementById('statAusentes').textContent = ausentes;
    document.getElementById('statTotal').textContent = presentes + ausentes;
}

async function guardarAsistencias() {
    const fecha = document.getElementById('registroFecha').value;
    const obraId = document.getElementById('registroObra').value;
    
    if (!fecha || !obraId) {
        mostrarNotificacion('日付と現場を選択してください', 'error');
        return;
    }
    
    // Obtener el líder de la obra
    const obras = await fetch(`${API_URL}/obras`).then(r => r.json());
    const obra = obras.find(o => o.id == obraId);
    
    if (!obra || !obra.lider_id) {
        mostrarNotificacion('責任者を選択してください', 'error');
        return;
    }
    
    const registros = Object.entries(registrosAsistencia)
        .filter(([_, registro]) => registro.presente !== undefined)
        .map(([empleadoId, registro]) => ({
            empleado_id: parseInt(empleadoId),
            presente: registro.presente,
            tipo_jornada: currentShift,
            horas_extras: registro.horas_extras || 0
        }));
    
    if (registros.length === 0) {
        mostrarNotificacion('少なくとも1人の出勤・欠勤を登録してください', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/asistencias/registrar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fecha,
                obra_id: parseInt(obraId),
                lider_id: obra.lider_id,
                registros
            })
        });
        
        if (response.ok) {
            mostrarNotificacion(`✓ ${registros.length}件の出勤データを保存しました`);
            registrosAsistencia = {};
            cargarEmpleadosRegistro();
        } else {
            throw new Error('保存エラー');
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('出勤保存エラー', 'error');
    }
}

async function cargarAsistenciaExistente() {
    const fecha = document.getElementById('registroFecha').value;
    const obraId = document.getElementById('registroObra').value;
    
    if (!fecha || !obraId) {
        mostrarNotificacion('日付と現場を選択してください', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/asistencias/verificar?fecha=${fecha}&obra_id=${obraId}`);
        const asistencias = await response.json();
        
        if (asistencias.length === 0) {
            mostrarNotificacion('この日付と現場のデータがありません', 'error');
            return;
        }
        
        registrosAsistencia = {};
        asistencias.forEach(asist => {
            registrosAsistencia[asist.empleado_id] = {
                presente: asist.presente,
                horas_extras: asist.horas_extras
            };
        });
        
        if (asistencias[0].tipo_jornada) {
            selectShift(asistencias[0].tipo_jornada);
        }
        
        cargarEmpleadosRegistro();
        mostrarNotificacion(`✓ Cargados ${asistencias.length} registros`);
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('データ読み込みエラー', 'error');
    }
}

// =====================================================
// EMPLEADOS
// =====================================================

async function cargarEmpleados() {
    try {
        const response = await fetch(`${API_URL}/empleados`);
        const empleados = await response.json();
        
        const select = document.getElementById('consultaEmpleado');
        if (select) {
            select.innerHTML = '<option value="">Todos los empleados</option>';
            empleados.forEach(emp => {
                select.innerHTML += `<option value="${emp.id}">${emp.nombre} ${emp.apellido}</option>`;
            });
        }
    } catch (error) {
        console.error('Error al cargar empleados:', error);
    }
}

async function cargarTablaEmpleados() {
    try {
        const response = await fetch(`${API_URL}/empleados`);
        const empleados = await response.json();
        
        const tbody = document.querySelector('#tablaEmpleados tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (empleados.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay empleados registrados</td></tr>';
            return;
        }
        
        empleados.forEach(emp => {
            // Generar HTML para la foto
            const fotoHtml = emp.foto 
                ? `<img src="${emp.foto}" class="employee-photo-small" alt="${emp.nombre}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` 
                : `<div class="employee-photo-placeholder" style="width: 50px; height: 50px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 24px;">👷</div>`;
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: center;">${fotoHtml}</td>
                <td>${emp.nombre} ${emp.apellido}</td>
                <td>${emp.dni || '-'}</td>
                <td>${emp.cargo || '-'}</td>
                <td>${emp.telefono || '-'}</td>
                <td>${emp.fecha_ingreso ? formatearFecha(emp.fecha_ingreso) : '-'}</td>
                <td>
                    <span class="badge ${emp.estado === 'activo' ? 'badge-success' : 'badge-danger'}">
                        ${emp.estado === 'activo' ? '在職中' : '退職'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editarEmpleado(${emp.id})">変更</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarEmpleado(${emp.id})">削除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('作業員の読み込みエラー', 'error');
    }
}

function mostrarModalEmpleado() {
    document.getElementById('modalEmpleadoTitulo').textContent = 'Agregar Empleado';
    document.getElementById('empleadoId').value = '';
    document.getElementById('empleadoNombre').value = '';
    document.getElementById('empleadoApellido').value = '';
    document.getElementById('empleadoDNI').value = '';
    document.getElementById('empleadoTelefono').value = '';
    document.getElementById('empleadoCargo').value = '';
    document.getElementById('empleadoFechaIngreso').value = '';
    document.getElementById('empleadoEstado').value = 'activo';
    
    // Limpiar foto
    fotoBase64 = null;
    document.getElementById('empleadoFoto').value = '';
    document.getElementById('photoPreviewImg').style.display = 'none';
    document.getElementById('photoPlaceholder').style.display = 'block';
    document.getElementById('btnEliminarFoto').style.display = 'none';
    
    document.getElementById('modalEmpleado').classList.add('active');
}

function cerrarModalEmpleado() {
    document.getElementById('modalEmpleado').classList.remove('active');
    // Limpiar la previsualización de foto al cerrar
    document.getElementById('photoPreviewImg').style.display = 'none';
    document.getElementById('photoPlaceholder').style.display = 'block';
    document.getElementById('btnEliminarFoto').style.display = 'none';
    document.getElementById('empleadoFoto').value = '';
}

// =====================================================
// FUNCIONES DE FOTO
// =====================================================

let fotoBase64 = null;

function previsualizarFoto(input) {
    const file = input.files[0];
    
    if (file) {
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            mostrarNotificacion('有効な画像ファイルを選択してください', 'error');
            input.value = '';
            return;
        }
        
        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
            mostrarNotificacion('画像サイズが大きすぎます。最大5MBです', 'error');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
            fotoBase64 = e.target.result;
            
            // Mostrar previsualización
            const imgPreview = document.getElementById('photoPreviewImg');
            const placeholder = document.getElementById('photoPlaceholder');
            const btnEliminar = document.getElementById('btnEliminarFoto');
            
            imgPreview.src = fotoBase64;
            imgPreview.style.display = 'block';
            placeholder.style.display = 'none';
            btnEliminar.style.display = 'inline-block';
        };
        
        reader.onerror = function() {
            mostrarNotificacion('画像の読み込みエラー', 'error');
        };
        
        reader.readAsDataURL(file);
    }
}

function eliminarFoto() {
    fotoBase64 = null;
    
    const imgPreview = document.getElementById('photoPreviewImg');
    const placeholder = document.getElementById('photoPlaceholder');
    const btnEliminar = document.getElementById('btnEliminarFoto');
    const inputFoto = document.getElementById('empleadoFoto');
    
    imgPreview.src = '';
    imgPreview.style.display = 'none';
    placeholder.style.display = 'block';
    btnEliminar.style.display = 'none';
    inputFoto.value = '';
}

// =====================================================
// FIN FUNCIONES DE FOTO
// =====================================================


async function editarEmpleado(id) {
    try {
        const response = await fetch(`${API_URL}/empleados`);
        const empleados = await response.json();
        const empleado = empleados.find(e => e.id === id);
        
        if (!empleado) return;
        
        document.getElementById('modalEmpleadoTitulo').textContent = 'Editar Empleado';
        document.getElementById('empleadoId').value = empleado.id;
        document.getElementById('empleadoNombre').value = empleado.nombre;
        document.getElementById('empleadoApellido').value = empleado.apellido;
        document.getElementById('empleadoDNI').value = empleado.dni || '';
        document.getElementById('empleadoTelefono').value = empleado.telefono || '';
        document.getElementById('empleadoCargo').value = empleado.cargo || '';
        document.getElementById('empleadoFechaIngreso').value = empleado.fecha_ingreso || '';
        document.getElementById('empleadoEstado').value = empleado.estado;
        
        // Cargar foto si existe
        if (empleado.foto) {
            fotoBase64 = empleado.foto;
            document.getElementById('photoPreviewImg').src = empleado.foto;
            document.getElementById('photoPreviewImg').style.display = 'block';
            document.getElementById('photoPlaceholder').style.display = 'none';
            document.getElementById('btnEliminarFoto').style.display = 'inline-block';
        } else {
            // Limpiar foto si no hay
            fotoBase64 = null;
            document.getElementById('photoPreviewImg').style.display = 'none';
            document.getElementById('photoPlaceholder').style.display = 'block';
            document.getElementById('btnEliminarFoto').style.display = 'none';
        }
        
        document.getElementById('modalEmpleado').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarEmpleado() {
    const id = document.getElementById('empleadoId').value;
    const nombre = document.getElementById('empleadoNombre').value.trim();
    const apellido = document.getElementById('empleadoApellido').value.trim();
    const dni = document.getElementById('empleadoDNI').value.trim();
    const telefono = document.getElementById('empleadoTelefono').value.trim();
    const cargo = document.getElementById('empleadoCargo').value.trim();
    const fecha_ingreso = document.getElementById('empleadoFechaIngreso').value;
    const estado = document.getElementById('empleadoEstado').value;
    
    if (!nombre || !apellido) {
        mostrarNotificacion('必須項目を入力してください', 'error');
        return;
    }
    
    try {
        // Incluir la foto si existe
        const data = { 
            nombre, 
            apellido, 
            dni, 
            telefono, 
            cargo, 
            fecha_ingreso, 
            estado, 
            foto: fotoBase64 
        };
        
        let response;
        if (id) {
            response = await fetch(`${API_URL}/empleados/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 作業員情報を更新しました');
        } else {
            response = await fetch(`${API_URL}/empleados`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 作業員を追加しました');
        }
        
        if (response.ok) {
            cerrarModalEmpleado();
            cargarTablaEmpleados();
            cargarEmpleados();
            cargarEmpleadosRegistro();
            // Limpiar foto después de guardar
            fotoBase64 = null;
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('作業員保存エラー', 'error');
    }
}

async function eliminarEmpleado(id) {
    if (!confirm('この作業員を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_URL}/empleados/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('✓ Empleado eliminado');
            cargarTablaEmpleados();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('作業員削除エラー', 'error');
    }
}

// =====================================================
// CLIENTES
// =====================================================

async function cargarClientes() {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        const clientes = await response.json();
        
        // Solo cargar en los selects de filtros (consulta y reporte)
        const selects = ['consultaCliente', 'reporteCliente'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Todos los clientes</option>';
                clientes.forEach(cliente => {
                    select.innerHTML += `<option value="${cliente.id}">${cliente.nombre}</option>`;
                });
            }
        });
        
        // NO tocar el select 'obraCliente' aquí, se carga solo cuando se abre el modal
    } catch (error) {
        console.error('Error al cargar clientes:', error);
    }
}

async function cargarTablaClientes() {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        const clientes = await response.json();
        
        const tbody = document.querySelector('#tablaClientes tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (clientes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay clientes registrados</td></tr>';
            return;
        }
        
        clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nombre}</td>
                <td>${cliente.razon_social || '-'}</td>
                <td>${cliente.ruc_dni || '-'}</td>
                <td>${cliente.telefono || '-'}</td>
                <td>${cliente.email || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editarCliente(${cliente.id})">変更</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarCliente(${cliente.id})">削除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('取引先の読み込みエラー', 'error');
    }
}

function mostrarModalCliente() {
    document.getElementById('modalClienteTitulo').textContent = 'Agregar Cliente';
    document.getElementById('clienteId').value = '';
    document.getElementById('clienteNombre').value = '';
    document.getElementById('clienteRazonSocial').value = '';
    document.getElementById('clienteRucDni').value = '';
    document.getElementById('clienteTelefono').value = '';
    document.getElementById('clienteEmail').value = '';
    document.getElementById('clienteDireccion').value = '';
    document.getElementById('modalCliente').classList.add('active');
}

function cerrarModalCliente() {
    document.getElementById('modalCliente').classList.remove('active');
}

async function editarCliente(id) {
    try {
        const response = await fetch(`${API_URL}/clientes`);
        const clientes = await response.json();
        const cliente = clientes.find(c => c.id === id);
        
        if (!cliente) return;
        
        document.getElementById('modalClienteTitulo').textContent = 'Editar Cliente';
        document.getElementById('clienteId').value = cliente.id;
        document.getElementById('clienteNombre').value = cliente.nombre;
        document.getElementById('clienteRazonSocial').value = cliente.razon_social || '';
        document.getElementById('clienteRucDni').value = cliente.ruc_dni || '';
        document.getElementById('clienteTelefono').value = cliente.telefono || '';
        document.getElementById('clienteEmail').value = cliente.email || '';
        document.getElementById('clienteDireccion').value = cliente.direccion || '';
        
        document.getElementById('modalCliente').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarCliente() {
    const id = document.getElementById('clienteId').value;
    const nombre = document.getElementById('clienteNombre').value.trim();
    const razon_social = document.getElementById('clienteRazonSocial').value.trim();
    const ruc_dni = document.getElementById('clienteRucDni').value.trim();
    const telefono = document.getElementById('clienteTelefono').value.trim();
    const email = document.getElementById('clienteEmail').value.trim();
    const direccion = document.getElementById('clienteDireccion').value.trim();
    
    if (!nombre) {
        mostrarNotificacion('名前は必須です', 'error');
        return;
    }
    
    try {
        const data = { nombre, razon_social, ruc_dni, telefono, email, direccion };
        
        let response;
        if (id) {
            response = await fetch(`${API_URL}/clientes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 取引先情報を更新しました');
        } else {
            response = await fetch(`${API_URL}/clientes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 取引先を追加しました');
        }
        
        if (response.ok) {
            cerrarModalCliente();
            cargarTablaClientes();
            cargarClientes();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('取引先保存エラー', 'error');
    }
}

async function eliminarCliente(id) {
    if (!confirm('この取引先を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_URL}/clientes/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('✓ Cliente eliminado');
            cargarTablaClientes();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('取引先削除エラー', 'error');
    }
}

// =====================================================
// OBRAS
// =====================================================

let empleadosSeleccionados = [];

async function cargarObras() {
    try {
        const response = await fetch(`${API_URL}/obras`);
        const obras = await response.json();
        
        const selects = ['registroObra', 'consultaObra', 'reporteObra'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Seleccione una obra...</option>';
                obras.filter(o => o.estado === 'activa').forEach(obra => {
                    select.innerHTML += `<option value="${obra.id}">${obra.nombre}</option>`;
                });
            }
        });
    } catch (error) {
        console.error('Error al cargar obras:', error);
    }
}

async function cargarTablaObras() {
    try {
        const response = await fetch(`${API_URL}/obras`);
        const obras = await response.json();
        
        const tbody = document.querySelector('#tablaObras tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (obras.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay obras registradas</td></tr>';
            return;
        }
        
        obras.forEach(obra => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${obra.nombre}</td>
                <td>${obra.cliente_nombre || '-'}</td>
                <td>${obra.lider_nombre || '-'}</td>
                <td>${obra.direccion || '-'}</td>
                <td>${obra.fecha_inicio ? formatearFecha(obra.fecha_inicio) : '-'}</td>
                <td>
                    <span class="badge ${
                        obra.estado === 'activa' ? 'badge-success' : 
                        obra.estado === 'pausada' ? 'badge-warning' : 'badge-info'
                    }">
                        ${obra.estado === 'activa' ? '施工中' : obra.estado === 'pausada' ? '一時中止' : '終了'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editarObra(${obra.id})">変更</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarObra(${obra.id})">削除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('現場の読み込みエラー', 'error');
    }
}

async function mostrarModalObra() {
    document.getElementById('modalObraTitulo').textContent = 'Agregar Obra';
    document.getElementById('obraId').value = '';
    document.getElementById('obraNombre').value = '';
    document.getElementById('obraDireccion').value = '';
    document.getElementById('obraFechaInicio').value = '';
    document.getElementById('obraFechaFin').value = '';
    document.getElementById('obraEstado').value = 'activa';
    empleadosSeleccionados = [];
    
    // Cargar clientes y líderes en los selects del modal
    await cargarClientesYLideresParaObra();
    await cargarEmpleadosParaObra();
    
    document.getElementById('modalObra').classList.add('active');
}

async function cargarClientesYLideresParaObra() {
    try {
        // Cargar clientes
        const responseClientes = await fetch(`${API_URL}/clientes`);
        const clientes = await responseClientes.json();
        
        const selectCliente = document.getElementById('obraCliente');
        selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
        clientes.forEach(cliente => {
            selectCliente.innerHTML += `<option value="${cliente.id}">${cliente.nombre}</option>`;
        });
        
        // Cargar líderes
        const responseLideres = await fetch(`${API_URL}/lideres`);
        const lideres = await responseLideres.json();
        
        const selectLider = document.getElementById('obraLider');
        selectLider.innerHTML = '<option value="">Seleccione un líder...</option>';
        lideres.forEach(lider => {
            selectLider.innerHTML += `<option value="${lider.id}">${lider.nombre} ${lider.apellido}</option>`;
        });
    } catch (error) {
        console.error('Error al cargar clientes y líderes:', error);
    }
}

function cerrarModalObra() {
    document.getElementById('modalObra').classList.remove('active');
}

async function editarObra(id) {
    try {
        const response = await fetch(`${API_URL}/obras`);
        const obras = await response.json();
        const obra = obras.find(o => o.id === id);
        
        if (!obra) return;
        
        document.getElementById('modalObraTitulo').textContent = 'Editar Obra';
        document.getElementById('obraId').value = obra.id;
        document.getElementById('obraNombre').value = obra.nombre;
        document.getElementById('obraDireccion').value = obra.direccion || '';
        document.getElementById('obraFechaInicio').value = obra.fecha_inicio || '';
        document.getElementById('obraFechaFin').value = obra.fecha_fin || '';
        document.getElementById('obraEstado').value = obra.estado;
        
        // Cargar clientes y líderes en los selects
        await cargarClientesYLideresParaObra();
        
        // Establecer los valores seleccionados
        document.getElementById('obraCliente').value = obra.cliente_id || '';
        document.getElementById('obraLider').value = obra.lider_id || '';
        
        // Cargar empleados asignados
        const empResponse = await fetch(`${API_URL}/obras/${id}/empleados`);
        const empleadosObra = await empResponse.json();
        empleadosSeleccionados = empleadosObra.map(e => e.id);
        
        await cargarEmpleadosParaObra();
        
        document.getElementById('modalObra').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarObra() {
    const id = document.getElementById('obraId').value;
    const nombre = document.getElementById('obraNombre').value.trim();
    const cliente_id = document.getElementById('obraCliente').value;
    const lider_id = document.getElementById('obraLider').value;
    const direccion = document.getElementById('obraDireccion').value.trim();
    const fecha_inicio = document.getElementById('obraFechaInicio').value;
    const fecha_fin = document.getElementById('obraFechaFin').value;
    const estado = document.getElementById('obraEstado').value;
    
    if (!nombre || !cliente_id || !lider_id) {
        mostrarNotificacion('必須項目を入力してください', 'error');
        return;
    }
    
    try {
        const data = {
            nombre,
            cliente_id: parseInt(cliente_id),
            lider_id: parseInt(lider_id),
            direccion,
            fecha_inicio,
            fecha_fin,
            estado,
            empleados_ids: empleadosSeleccionados
        };
        
        let response;
        if (id) {
            response = await fetch(`${API_URL}/obras/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 現場情報を更新しました');
        } else {
            response = await fetch(`${API_URL}/obras`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 現場を追加しました');
        }
        
        if (response.ok) {
            cerrarModalObra();
            cargarTablaObras();
            cargarObras();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('現場保存エラー', 'error');
    }
}

async function eliminarObra(id) {
    if (!confirm('この現場を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_URL}/obras/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('✓ Obra eliminada');
            cargarTablaObras();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('現場削除エラー', 'error');
    }
}

async function cargarEmpleadosParaObra() {
    try {
        const response = await fetch(`${API_URL}/empleados?estado=activo`);
        const empleados = await response.json();
        
        const container = document.getElementById('listaEmpleadosObra');
        container.innerHTML = '';
        
        empleados.forEach(emp => {
            const checked = empleadosSeleccionados.includes(emp.id) ? 'checked' : '';
            const div = document.createElement('div');
            div.style.padding = '8px';
            div.style.borderBottom = '1px solid #e0e0e0';
            div.innerHTML = `
                <label style="display: flex; align-items: center; cursor: pointer;">
                    <input type="checkbox" 
                           value="${emp.id}" 
                           ${checked}
                           onchange="toggleEmpleadoObra(${emp.id}, this.checked)"
                           style="margin-right: 10px;">
                    <span>${emp.nombre} ${emp.apellido} - ${emp.cargo || 'Sin cargo'}</span>
                </label>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

function toggleEmpleadoObra(empleadoId, checked) {
    if (checked) {
        if (!empleadosSeleccionados.includes(empleadoId)) {
            empleadosSeleccionados.push(empleadoId);
        }
    } else {
        empleadosSeleccionados = empleadosSeleccionados.filter(id => id !== empleadoId);
    }
}

async function cargarInfoObra() {
    const obraId = document.getElementById('registroObra').value;
    const container = document.getElementById('obraInfoContainer');
    
    if (!obraId) {
        container.style.display = 'none';
        // Cuando no hay obra seleccionada, mostrar todos los empleados activos
        cargarEmpleadosRegistro();
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/obras`);
        const obras = await response.json();
        const obra = obras.find(o => o.id == obraId);
        
        if (obra) {
            // Usar los IDs sin conflicto (con prefijo 'info')
            document.getElementById('infoObraCliente').textContent = obra.cliente_nombre || '-';
            document.getElementById('infoObraLider').textContent = obra.lider_nombre || '-';
            document.getElementById('infoObraDireccion').textContent = obra.direccion || '-';
            container.style.display = 'block';
            
            // Cargar SOLO los empleados asignados a esta obra
            cargarEmpleadosDeObra(obraId);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

async function cargarEmpleadosDeObra(obraId) {
    try {
        const response = await fetch(`${API_URL}/obras/${obraId}/empleados`);
        const empleados = await response.json();
        
        const container = document.getElementById('listaEmpleadosRegistro');
        container.innerHTML = '';
        
        if (empleados.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 20px; color: #999;">No hay empleados asignados a esta obra. Edita la obra para asignar empleados.</p>';
            return;
        }
        
        empleados.forEach(empleado => {
            const registro = registrosAsistencia[empleado.id] || {};
            const presente = registro.presente;
            
            const fotoHtml = empleado.foto 
                ? `<img src="${empleado.foto}" class="employee-photo-small" alt="${empleado.nombre}">` 
                : `<div class="employee-photo-placeholder">👷</div>`;
            
            const item = document.createElement('div');
            item.className = 'worker-item';
            item.innerHTML = `
                <div class="worker-info">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
                        ${fotoHtml}
                        <div>
                            <div class="worker-name">${empleado.nombre} ${empleado.apellido}</div>
                            <div class="worker-meta">${empleado.cargo || 'Sin cargo'}${empleado.telefono ? ' • ' + empleado.telefono : ''}</div>
                        </div>
                    </div>
                </div>
                <div class="worker-controls">
                    <div class="attendance-toggle">
                        <button class="attendance-btn ${presente === true ? 'present' : 'unset'}" 
                                onclick="marcarAsistencia(${empleado.id}, true)">
                            ✓
                        </button>
                        <button class="attendance-btn ${presente === false ? 'absent' : 'unset'}" 
                                onclick="marcarAsistencia(${empleado.id}, false)">
                            ✕
                        </button>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <label style="font-size: 12px; font-weight: 600; color: #666;">残業</label>
                        <input type="number" 
                               class="overtime-input" 
                               placeholder="0"
                               min="0" 
                               step="0.5"
                               value="${registro.horas_extras || 0}"
                               onchange="actualizarHorasExtras(${empleado.id}, this.value)"
                               title="残業">
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
        
        actualizarEstadisticas();
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('作業員の読み込みエラー', 'error');
    }
}

// =====================================================
// LÍDERES
// =====================================================

async function cargarLideres() {
    try {
        const response = await fetch(`${API_URL}/lideres`);
        const lideres = await response.json();
        
        // Solo cargar en los selects de filtros (consulta y reporte)
        const selects = ['consultaLider', 'reporteLider'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Todos los líderes</option>';
                lideres.forEach(lider => {
                    select.innerHTML += `<option value="${lider.id}">${lider.nombre} ${lider.apellido}</option>`;
                });
            }
        });
        
        // NO tocar el select 'obraLider' aquí, se carga solo cuando se abre el modal
    } catch (error) {
        console.error('Error al cargar líderes:', error);
    }
}

async function cargarTablaLideres() {
    try {
        const response = await fetch(`${API_URL}/lideres`);
        const lideres = await response.json();
        
        const tbody = document.querySelector('#tablaLideres tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (lideres.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay líderes registrados</td></tr>';
            return;
        }
        
        lideres.forEach(lider => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${lider.nombre} ${lider.apellido}</td>
                <td>${lider.telefono || '-'}</td>
                <td>${lider.email || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" onclick="editarLider(${lider.id})">変更</button>
                    <button class="btn btn-sm btn-danger" onclick="eliminarLider(${lider.id})">削除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('責任者の読み込みエラー', 'error');
    }
}

function mostrarModalLider() {
    document.getElementById('modalLiderTitulo').textContent = 'Agregar Líder/Encargado';
    document.getElementById('liderId').value = '';
    document.getElementById('liderNombre').value = '';
    document.getElementById('liderApellido').value = '';
    document.getElementById('liderTelefono').value = '';
    document.getElementById('liderEmail').value = '';
    document.getElementById('modalLider').classList.add('active');
}

function cerrarModalLider() {
    document.getElementById('modalLider').classList.remove('active');
}

async function editarLider(id) {
    try {
        const response = await fetch(`${API_URL}/lideres`);
        const lideres = await response.json();
        const lider = lideres.find(l => l.id === id);
        
        if (!lider) return;
        
        document.getElementById('modalLiderTitulo').textContent = 'Editar Líder/Encargado';
        document.getElementById('liderId').value = lider.id;
        document.getElementById('liderNombre').value = lider.nombre;
        document.getElementById('liderApellido').value = lider.apellido;
        document.getElementById('liderTelefono').value = lider.telefono || '';
        document.getElementById('liderEmail').value = lider.email || '';
        
        document.getElementById('modalLider').classList.add('active');
    } catch (error) {
        console.error('Error:', error);
    }
}

async function guardarLider() {
    const id = document.getElementById('liderId').value;
    const nombre = document.getElementById('liderNombre').value.trim();
    const apellido = document.getElementById('liderApellido').value.trim();
    const telefono = document.getElementById('liderTelefono').value.trim();
    const email = document.getElementById('liderEmail').value.trim();
    
    if (!nombre || !apellido) {
        mostrarNotificacion('必須項目を入力してください', 'error');
        return;
    }
    
    try {
        const data = { nombre, apellido, telefono, email };
        
        let response;
        if (id) {
            response = await fetch(`${API_URL}/lideres/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 責任者情報を更新しました');
        } else {
            response = await fetch(`${API_URL}/lideres`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            mostrarNotificacion('✓ 責任者を追加しました');
        }
        
        if (response.ok) {
            cerrarModalLider();
            cargarTablaLideres();
            cargarLideres();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('責任者保存エラー', 'error');
    }
}

async function eliminarLider(id) {
    if (!confirm('この責任者を削除しますか？')) return;
    
    try {
        const response = await fetch(`${API_URL}/lideres/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            mostrarNotificacion('✓ Líder eliminado');
            cargarTablaLideres();
        }
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('責任者削除エラー', 'error');
    }
}

// =====================================================
// CONSULTAS
// =====================================================

async function cargarFiltrosConsultas() {
    await Promise.all([
        cargarClientes(),
        cargarObras(),
        cargarLideres(),
        cargarEmpleados()
    ]);
}

async function buscarAsistencias() {
    const fechaDesde = document.getElementById('consultaFechaDesde').value;
    const fechaHasta = document.getElementById('consultaFechaHasta').value;
    const clienteId = document.getElementById('consultaCliente').value;
    const obraId = document.getElementById('consultaObra').value;
    const empleadoId = document.getElementById('consultaEmpleado').value;
    const liderId = document.getElementById('consultaLider').value;
    
    let url = `${API_URL}/asistencias?`;
    if (fechaDesde) url += `fecha_desde=${fechaDesde}&`;
    if (fechaHasta) url += `fecha_hasta=${fechaHasta}&`;
    if (clienteId) url += `cliente_id=${clienteId}&`;
    if (obraId) url += `obra_id=${obraId}&`;
    if (empleadoId) url += `empleado_id=${empleadoId}&`;
    if (liderId) url += `lider_id=${liderId}&`;
    
    try {
        const response = await fetch(url);
        const asistencias = await response.json();
        
        // Guardar para exportar
        ultimasAsistenciasConsulta = asistencias;
        
        const tbody = document.querySelector('#tablaConsultas tbody');
        tbody.innerHTML = '';
        
        if (asistencias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">データが見つかりません</td></tr>';
            ultimasAsistenciasConsulta = [];
            return;
        }
        
        asistencias.forEach(asist => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${formatearFecha(asist.fecha)}</td>
                <td>${asist.cliente_nombre || '-'}</td>
                <td>${asist.obra_nombre}</td>
                <td>${asist.empleado_nombre} ${asist.empleado_apellido}</td>
                <td>${asist.cargo || '-'}</td>
                <td>${asist.lider_nombre} ${asist.lider_apellido}</td>
                <td>
                    <span class="badge ${asist.presente ? 'badge-success' : 'badge-danger'}">
                        ${asist.presente ? '出席' : '欠席'}
                    </span>
                </td>
                <td>${formatearJornada(asist.tipo_jornada)}</td>
                <td>${asist.horas_extras || 0}</td>
            `;
            tbody.appendChild(tr);
        });
        
        mostrarNotificacion(`✓ ${asistencias.length}件のデータが見つかりました`);
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('検索エラー', 'error');
    }
}

// =====================================================
// REPORTES
// =====================================================

async function cargarFiltrosReportes() {
    // Cargar datos en paralelo
    const [clientes, obras, lideres] = await Promise.all([
        fetch(`${API_URL}/clientes`).then(r => r.json()),
        fetch(`${API_URL}/obras`).then(r => r.json()),
        fetch(`${API_URL}/lideres`).then(r => r.json())
    ]);
    
    // Llenar selector de clientes
    const selectCliente = document.getElementById('reporteCliente');
    selectCliente.innerHTML = '<option value="">Todos los clientes</option>';
    clientes.forEach(cliente => {
        const option = document.createElement('option');
        option.value = cliente.id;
        option.textContent = cliente.nombre;
        selectCliente.appendChild(option);
    });
    
    // Llenar selector de obras
    const selectObra = document.getElementById('reporteObra');
    selectObra.innerHTML = '<option value="">Todas las obras</option>';
    obras.forEach(obra => {
        const option = document.createElement('option');
        option.value = obra.id;
        option.textContent = obra.nombre;
        selectObra.appendChild(option);
    });
    
    // Llenar selector de líderes
    const selectLider = document.getElementById('reporteLider');
    selectLider.innerHTML = '<option value="">Todos los líderes</option>';
    lideres.forEach(lider => {
        const option = document.createElement('option');
        option.value = lider.id;
        option.textContent = `${lider.nombre} ${lider.apellido}`;
        selectLider.appendChild(option);
    });
}

async function generarReporte() {
    const fechaDesde = document.getElementById('reporteFechaDesde').value;
    const fechaHasta = document.getElementById('reporteFechaHasta').value;
    const clienteId = document.getElementById('reporteCliente').value;
    const obraId = document.getElementById('reporteObra').value;
    const liderId = document.getElementById('reporteLider').value;
    
    if (!fechaDesde || !fechaHasta) {
        mostrarNotificacion('日付を選択してください', 'error');
        return;
    }
    
    // Validar que fecha desde no sea mayor que fecha hasta
    if (fechaDesde > fechaHasta) {
        mostrarNotificacion('開始日は終了日より前でなければなりません', 'error');
        return;
    }
    
    let url = `${API_URL}/asistencias?fecha_desde=${fechaDesde}&fecha_hasta=${fechaHasta}`;
    if (clienteId) url += `&cliente_id=${clienteId}`;
    if (obraId) url += `&obra_id=${obraId}`;
    if (liderId) url += `&lider_id=${liderId}`;
    
    try {
        console.log('Generando reporte con URL:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }
        
        const asistencias = await response.json();
        
        // Guardar para exportar
        ultimasAsistenciasReporte = asistencias;
        
        console.log('Asistencias recibidas:', asistencias.length);
        
        const totalAsistencias = asistencias.length;
        const presentes = asistencias.filter(a => a.presente).length;
        const ausentes = asistencias.filter(a => !a.presente).length;
        const totalHorasExtras = asistencias.reduce((sum, a) => sum + (parseFloat(a.horas_extras) || 0), 0);
        
        // Actualizar los valores en el DOM
        document.getElementById('reporteTotalAsistencias').textContent = totalAsistencias;
        document.getElementById('reportePresentes').textContent = presentes;
        document.getElementById('reporteAusentes').textContent = ausentes;
        document.getElementById('reporteHorasExtras').textContent = totalHorasExtras.toFixed(1);
        
        if (totalAsistencias === 0) {
            ultimasAsistenciasReporte = [];
            mostrarNotificacion('⚠️ 選択した期間にデータがありません', 'error');
        } else {
            mostrarNotificacion(`✓ レポート作成完了：${totalAsistencias}件`);
        }
    } catch (error) {
        console.error('Error completo:', error);
        mostrarNotificacion('レポートエラー：' + error.message, 'error');
    }
}

// =====================================================
// UTILIDADES
// =====================================================

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const [year, month, day] = fecha.split('-');
    return `${day}/${month}/${year}`;
}

function formatearJornada(tipo) {
    const tipos = {
        'dia': '昼',
        'noche': '夜',
        'dia_noche': '昼夜'
    };
    return tipos[tipo] || tipo;
}

function mostrarNotificacion(mensaje, tipo = 'success') {
    const notif = document.getElementById('notification');
    notif.textContent = mensaje;
    notif.className = `notification ${tipo} show`;
    
    setTimeout(() => {
        notif.classList.remove('show');
    }, 3000);
}

// =====================================================
// EXPORTAR A EXCEL - FORMATO KOMEI DENSETSU
// =====================================================

let ultimasAsistenciasConsulta = [];
let ultimasAsistenciasReporte = [];

async function exportarConsultasExcel() {
    if (ultimasAsistenciasConsulta.length === 0) {
        mostrarNotificacion('先に検索してください', 'error');
        return;
    }
    try {
        const agrupadoPorObra = agruparAsistenciasPorObraPeriodo(ultimasAsistenciasConsulta);
        if (agrupadoPorObra.length === 0) {
            mostrarNotificacion('出力するデータがありません', 'error');
            return;
        }
        const wb = XLSX.utils.book_new();
        for (const obra of agrupadoPorObra) {
            const ws = crearHojaKomeiDensetsu(obra);
            XLSX.utils.book_append_sheet(wb, ws, sanitizarNombreHoja(obra.nombreObra));
        }
        const fecha = new Date().toISOString().split('T')[0].replace(/-/g, '');
        XLSX.writeFile(wb, `出勤表_${fecha}.xlsx`);
        mostrarNotificacion('✓ Excel出力完了');
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Excel出力エラー：' + error.message, 'error');
    }
}

async function exportarReporteExcel() {
    if (ultimasAsistenciasReporte.length === 0) {
        mostrarNotificacion('先にレポートを作成してください', 'error');
        return;
    }
    const temp = ultimasAsistenciasConsulta;
    ultimasAsistenciasConsulta = ultimasAsistenciasReporte;
    await exportarConsultasExcel();
    ultimasAsistenciasConsulta = temp;
}

function agruparAsistenciasPorObraPeriodo(asistencias) {
    const grupos = {};
    asistencias.forEach(asist => {
        const fecha = new Date(asist.fecha + 'T00:00:00');
        const periodo = calcularPeriodoKomei(fecha);
        const key = `${asist.obra_id}_${periodo.mesInicio}_${periodo.añoInicio}`;
        if (!grupos[key]) {
            grupos[key] = {
                obraId: asist.obra_id,
                nombreObra: asist.obra_nombre,
                clienteNombre: asist.cliente_nombre || '',
                periodo: periodo,
                empleados: {}
            };
        }
        const empKey = asist.empleado_id;
        if (!grupos[key].empleados[empKey]) {
            grupos[key].empleados[empKey] = {
                nombre: `${asist.empleado_nombre}　${asist.empleado_apellido}`,
                asistencias: {},
                horasExtras: {}
            };
        }
        const dia = fecha.getDate();
        grupos[key].empleados[empKey].asistencias[dia] = asist.presente;
        grupos[key].empleados[empKey].horasExtras[dia] = parseFloat(asist.horas_extras) || 0;
    });
    return Object.values(grupos);
}

function calcularPeriodoKomei(fecha) {
    const year = fecha.getFullYear();
    const month = fecha.getMonth() + 1; // 1-12
    const day = fecha.getDate();
    let mesInicio, añoInicio, mesFin, añoFin;
    if (day >= 21) {
        mesInicio = month;
        añoInicio = year;
        mesFin = month === 12 ? 1 : month + 1;
        añoFin = month === 12 ? year + 1 : year;
    } else {
        mesInicio = month === 1 ? 12 : month - 1;
        añoInicio = month === 1 ? year - 1 : year;
        mesFin = month;
        añoFin = year;
    }
    return { mesInicio, añoInicio, mesFin, añoFin };
}

function crearHojaKomeiDensetsu(obraData) {
    const p = obraData.periodo;
    const añoReiwa = p.añoInicio - 2018;
    const diasMes1 = new Date(p.añoInicio, p.mesInicio, 0).getDate(); // último día del mesInicio
    const dias = ['日', '月', '火', '水', '木', '金', '土'];
    const aoa = [];

    // FILA 1
    const f1 = Array(36).fill('');
    f1[0] = '会社名'; f1[1] = 'Komei Densetsu';
    f1[16] = '出　　　勤　　　表';
    f1[32] = '自'; f1[33] = `令和　${añoReiwa}年　${p.mesInicio}月 21日`;
    aoa.push(f1);

    // FILA 2
    const f2 = Array(36).fill('');
    f2[0] = '現場名'; f2[1] = obraData.nombreObra;
    f2[32] = '至'; f2[33] = `令和　${añoReiwa}年　${p.mesFin}月 20日`;
    aoa.push(f2);

    // FILA 3
    const f3 = Array(36).fill('');
    f3[0] = '１'; f3[6] = `（  ${p.mesInicio}月 ）`;
    f3[21] = `（ ${p.mesFin}月 ）`;
    f3[33] = '定時小計'; f3[34] = '残業小計';
    aoa.push(f3);

    // FILA 4 - Días numéricos
    const f4 = Array(36).fill('');
    f4[0] = 'No'; f4[1] = '氏　名';
    let col = 2;
    for (let d = 21; d <= diasMes1; d++) f4[col++] = d;
    for (let d = 1; d <= 20; d++) f4[col++] = d;
    aoa.push(f4);

    // FILA 5 - Días de la semana
    const f5 = Array(36).fill('');
    col = 2;
    for (let d = 21; d <= diasMes1; d++) {
        f5[col++] = dias[new Date(p.añoInicio, p.mesInicio - 1, d).getDay()];
    }
    for (let d = 1; d <= 20; d++) {
        f5[col++] = dias[new Date(p.añoFin, p.mesFin - 1, d).getDay()];
    }
    aoa.push(f5);

    // EMPLEADOS
    Object.values(obraData.empleados).forEach((emp, idx) => {
        // Fila asistencia
        const fa = Array(36).fill('');
        fa[1] = emp.nombre;
        col = 2;
        for (let d = 21; d <= diasMes1; d++) fa[col++] = emp.asistencias[d] ? '出' : '';
        for (let d = 1; d <= 20; d++) fa[col++] = emp.asistencias[d] ? '出' : '';
        const rAsist = aoa.length + 1;
        fa[33] = `=COUNTIF(C${rAsist}:AG${rAsist},"出")`;
        aoa.push(fa);

        // Fila horas extras
        const fhe = Array(36).fill('');
        fhe[0] = idx + 1; fhe[1] = '残業時間';
        col = 2;
        for (let d = 21; d <= diasMes1; d++) { const h = emp.horasExtras[d] || 0; fhe[col++] = h > 0 ? h : ''; }
        for (let d = 1; d <= 20; d++) { const h = emp.horasExtras[d] || 0; fhe[col++] = h > 0 ? h : ''; }
        const rHE = aoa.length + 1;
        fhe[34] = `=SUM(C${rHE}:AG${rHE})`;
        aoa.push(fhe);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    ws['!merges'] = [
        XLSX.utils.decode_range('B1:D1'),
        XLSX.utils.decode_range('B2:D2'),
        XLSX.utils.decode_range('AH1:AI1'),
        XLSX.utils.decode_range('AH2:AI2'),
        XLSX.utils.decode_range('G3:I3'),
        XLSX.utils.decode_range('V3:Y3'),
        XLSX.utils.decode_range('AH3:AH5'),
        XLSX.utils.decode_range('AI3:AI5')
    ];

    ws['!cols'] = [
        { wch: 9.71 }, { wch: 17.14 },
        ...Array(31).fill({ wch: 3.57 }),
        { wch: 11 }, { wch: 11 }
    ];

    return ws;
}

function sanitizarNombreHoja(nombre) {
    return nombre.replace(/[:\\/?*\[\]]/g, '').substring(0, 31);
}

// =====================================================
// MENÚ MÓVIL
// =====================================================

function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function closeMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
}

// Cerrar menú al hacer clic en un item de navegación (solo en móvil)
document.addEventListener('DOMContentLoaded', () => {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                closeMobileMenu();
            }
        });
    });
});
