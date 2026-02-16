
const SUPABASE_URL = 'https://nvnbqoapevtntrrvuihd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im52bmJxb2FwZXZ0bnRycnZ1aWhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyMDMyODYsImV4cCI6MjA4Njc3OTI4Nn0.2Z0JD53Wb80eWblln_J9QHVg5ty6FC6rZD_cO58TSaU';
// Renamed to supabaseClient to avoid conflict with the 'supabase' global variable from the SDK script
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const app = {
    state: {
        currentRole: null,
        currentUser: null,
        isAuthenticated: false,
        currentView: 'calendar',
        agendaFilter: 'today',
        appointments: [],
        services: []
    },

    users: {
        'manuela': { pass: '123', role: 'worker' },
        'mariana': { pass: '123', role: 'admin' }
    },

    async init() {
        console.log('🌸 Agenda Studio Initializing...');
        const savedSession = JSON.parse(localStorage.getItem('coquette_session'));
        if (savedSession) {
            this.state.currentUser = savedSession.user;
            this.state.currentRole = savedSession.role;
            this.state.isAuthenticated = true;
        }

        await this.loadData();
        this.subscribe();
        this.render();
    },

    async loadData() {
        const { data: services, error: servicesError } = await supabaseClient
            .from('services')
            .select('*')
            .order('name');

        const { data: appointments, error: appointmentsError } = await supabaseClient
            .from('appointments')
            .select('*')
            .order('date', { ascending: false });

        if (servicesError) console.error('Error fetching services:', servicesError);
        else this.state.services = services || [];

        if (appointmentsError) console.error('Error fetching appointments:', appointmentsError);
        else this.state.appointments = appointments || [];

        this.render();
    },

    subscribe() {
        supabaseClient.channel('custom-all-channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'appointments' },
                () => this.loadData()
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'services' },
                () => this.loadData()
            )
            .subscribe();
    },

    login() {
        const user = document.getElementById('login-user').value.toLowerCase();
        const pass = document.getElementById('login-pass').value;
        const errorMsg = document.getElementById('login-error');

        if (this.users[user] && this.users[user].pass === pass) {
            this.state.currentUser = user;
            this.state.currentRole = this.users[user].role;
            this.state.isAuthenticated = true;
            this.state.currentView = 'calendar';

            localStorage.setItem('coquette_session', JSON.stringify({
                user: user,
                role: this.state.currentRole
            }));

            this.render();
        } else {
            errorMsg.innerText = 'Usuario o contraseña incorrectos ✨';
            errorMsg.classList.remove('hidden');
        }
    },

    logout() {
        this.state.isAuthenticated = false;
        this.state.currentUser = null;
        this.state.currentRole = null;
        localStorage.removeItem('coquette_session');
        this.render();
    },

    navigateTo(view) {
        if (!this.state.isAuthenticated) return;
        this.state.currentView = view;
        this.render();

        document.querySelectorAll('.nav-item').forEach(nav => {
            nav.classList.remove('active');
            if (nav.innerText.toLowerCase().includes(view === 'calendar' ? 'agenda' : view === 'earnings' ? 'ingresos' : 'ajustes')) {
                nav.classList.add('active');
            }
        });
    },

    setAgendaFilter(filter) {
        this.state.agendaFilter = filter;
        this.render();
    },

    render() {
        const container = document.getElementById('view-container');
        const appHeader = document.querySelector('.app-header');
        const bottomNav = document.querySelector('.bottom-nav');
        const roleBadge = document.getElementById('role-indicator');

        if (!this.state.isAuthenticated) {
            appHeader.classList.add('hidden');
            bottomNav.classList.add('hidden');
            this.renderLogin(container);
            return;
        }

        appHeader.classList.remove('hidden');
        bottomNav.classList.remove('hidden');
        roleBadge.innerText = this.state.currentUser.charAt(0).toUpperCase() + this.state.currentUser.slice(1);

        switch (this.state.currentView) {
            case 'calendar':
                this.renderCalendar(container);
                break;
            case 'earnings':
                this.renderEarnings(container);
                break;
            case 'settings':
                this.renderSettings(container);
                break;
            default:
                this.renderCalendar(container);
        }
    },

    renderLogin(container) {
        container.innerHTML = `
            <div class="login-container">
                <div class="login-card">
                    <h1 class="login-logo">Agenda Studio</h1>
                    <p style="margin-bottom: 30px; opacity: 0.7; font-weight: 600;">Bienvenida, ingresa tus datos ✨</p>
                    
                    <div class="form-group">
                        <label class="label-premium">Usuario</label>
                        <input type="text" id="login-user" class="input-premium" placeholder="Nombre" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="label-premium">Contraseña</label>
                        <input type="password" id="login-pass" class="input-premium" placeholder="***" required>
                    </div>
                    
                    <p id="login-error" class="hidden" style="color: var(--secondary-vibrant); font-size: 0.8rem; margin-bottom: 15px; font-weight: 700;"></p>
                    
                    <button class="btn" style="margin-top: 10px;" onclick="app.login()">Entrar ✨</button>
                    
                    <p style="margin-top: 30px; font-size: 0.7rem; opacity: 0.5;">mariana (admin) | manuela (worker)</p>
                </div>
            </div>
        `;
    },

    formatDateLabel(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        return date.toLocaleDateString('es-ES', options);
    },

    renderCalendar(container) {
        const todayStr = new Date().toISOString().split('T')[0];
        let filtered = [];
        let title = "";

        if (this.state.agendaFilter === 'today') {
            filtered = this.state.appointments.filter(a => a.date === todayStr);
            title = "Citas de Hoy";
        } else if (this.state.agendaFilter === 'pending') {
            filtered = this.state.appointments.filter(a => a.status === 'pending');
            title = "Todas las Pendientes";
        } else if (this.state.agendaFilter === 'completed') {
            filtered = this.state.appointments.filter(a => a.status === 'completed');
            title = "Historial Completadas";
        }

        // Sort by time
        filtered.sort((a, b) => a.time.localeCompare(b.time));

        const renderAptCard = (apt) => `
            <div class="card appointment-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <div style="font-size: 0.7rem; opacity: 0.6; font-weight: 700; text-transform: uppercase; margin-bottom: 5px;">
                            ${this.formatDateLabel(apt.date)}
                        </div>
                        <h3>${apt.time} - ${apt.client}</h3>
                        <p>${apt.service}</p>
                        <p style="font-weight: 600; color: var(--secondary-vibrant); margin-top: 5px;">$${apt.price.toLocaleString()}</p>
                    </div>
                    ${apt.status === 'completed' ? '<span style="font-size: 1.2rem;">✅</span>' : ''}
                </div>
                ${this.state.currentRole === 'worker' && apt.status === 'pending' ? `
                    <div style="margin-top: 15px;">
                        <button class="btn btn-outline" style="padding: 10px 20px; font-size: 0.85rem;" onclick="app.completeAppointment(${apt.id})">
                             Finalizar ✨
                        </button>
                    </div>
                ` : ''}
            </div>
        `;

        container.innerHTML = `
            <div style="margin-bottom: 25px;">
                <h2 style="color: var(--secondary-vibrant); font-size: 1.8rem; margin-bottom: 15px;">Inicia Tu Día ✨</h2>
                
                <div class="filter-bar">
                    <div class="filter-chip ${this.state.agendaFilter === 'today' ? 'active' : ''}" onclick="app.setAgendaFilter('today')">Hoy</div>
                    <div class="filter-chip ${this.state.agendaFilter === 'pending' ? 'active' : ''}" onclick="app.setAgendaFilter('pending')">Pendientes</div>
                    <div class="filter-chip ${this.state.agendaFilter === 'completed' ? 'active' : ''}" onclick="app.setAgendaFilter('completed')">Historial</div>
                </div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <h3 style="color: var(--secondary-vibrant); font-size: 1.1rem;">${title}</h3>
                <span style="font-size: 0.8rem; opacity: 0.5; font-weight: 700;">${filtered.length} Turnos</span>
            </div>

            <div class="appointments-list">
                ${filtered.map(renderAptCard).join('') || `<p style="text-align:center; padding: 50px 20px; opacity:0.5; font-style: italic;">No hay registros en esta sección ✨</p>`}
            </div>

            <button class="btn" style="margin-top: 35px; box-shadow: 0 10px 30px rgba(255, 92, 138, 0.4);" onclick="app.showAddAppointment()">
                NUEVA CITA 🪄
            </button>
        `;
    },

    renderEarnings(container) {
        const totalSession = this.state.appointments
            .filter(a => a.status === 'completed')
            .reduce((sum, a) => sum + a.price, 0);

        const workerGain = totalSession * 0.5;

        container.innerHTML = `
            <h2 style="color: var(--secondary-vibrant); margin-bottom: 25px;">Balance Real 💎</h2>
            
            <div class="card" style="background: linear-gradient(135deg, var(--secondary-vibrant), var(--secondary)); color: white; border: none;">
                <p style="text-transform: uppercase; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px;">Ingreso Total</p>
                <h1 style="font-size: 2.8rem; margin: 5px 0;">$${totalSession.toLocaleString()}</h1>
                <p style="opacity: 0.9; font-size: 0.8rem;">Total recaudado por servicios realizados</p>
            </div>

            <div class="card">
                <p style="text-transform: uppercase; font-size: 0.7rem; font-weight: 700; letter-spacing: 1px; color: var(--secondary-vibrant);">Tu Ganancia (50%)</p>
                <h2 style="font-size: 2.2rem; color: var(--text); margin: 5px 0;">$${workerGain.toLocaleString()}</h2>
                <p style="font-size: 0.8rem; opacity: 0.7;">¡Buen trabajo! ✨</p>
            </div>

            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="color: var(--secondary-vibrant); margin-bottom: 0;">Catálogo de Servicios</h3>
                    ${this.state.currentRole === 'admin' ? `
                        <button class="btn" style="padding: 8px 12px; font-size: 0.7rem; width: auto;" onclick="app.showAddService()">+ Nuevo</button>
                    ` : ''}
                </div>
                ${this.state.services.map(s => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px dashed var(--primary);">
                        <div>
                            <span style="font-weight: 600;">${s.name}</span>
                            <br>
                            <b style="color: var(--secondary-vibrant);">$${s.price.toLocaleString()}</b>
                        </div>
                        ${this.state.currentRole === 'admin' ? `
                            <div style="display: flex; gap: 8px;">
                                <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.65rem; width: auto;" onclick="app.showEditService(${s.id})">✏️</button>
                                <button class="btn btn-outline" style="padding: 6px 10px; font-size: 0.65rem; width: auto; border-color: #ff8ba0; color: #ff5c8a;" onclick="app.deleteService(${s.id})">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderSettings(container) {
        container.innerHTML = `
            <div style="margin-bottom: 30px;">
                <h2 style="color: var(--secondary-vibrant); font-size: 1.8rem;">Ajustes ⚙️</h2>
                <p style="opacity: 0.7; font-weight: 600;">Gestiona tu cuenta</p>
            </div>

            <div class="card">
                <h3 style="margin-bottom: 15px; font-size: 1.1rem;">Cuenta</h3>
                <p style="font-size: 0.9rem; margin-bottom: 5px;">Usuario: <b>${this.state.currentUser}</b></p>
                <p style="font-size: 0.9rem; margin-bottom: 20px; opacity: 0.7;">Rol: ${this.state.currentRole === 'admin' ? 'Administradora' : 'Trabajadora'}</p>
                <button class="btn btn-outline" style="width: 100%; border-color: #ff5c8a; color: #ff5c8a;" onclick="app.logout()">
                    Cerrar Sesión 🚪
                </button>
            </div>
            
            <div class="card">
                <h3 style="margin-bottom: 10px; font-size: 1.1rem;">Depuración ✨</h3>
                <p style="font-size: 0.8rem; opacity:0.6; margin-bottom: 15px;">Asegúrate de tener la última versión del diseño.</p>
                <button class="btn" style="padding: 12px; font-size: 0.9rem;" onclick="location.reload(true)">
                    🔄 Forzar Actualización
                </button>
            </div>

            <div style="text-align: center; margin-top: 40px; opacity: 0.5;">
                <p style="font-size: 0.8rem; font-weight: 600;">Agenda Studio v1.6 (Supabase-Stable)</p>
                <p style="font-size: 0.7rem;">Hecho con ❤️ para tu negocio</p>
            </div>
        `;
    },

    showAddService() {
        const modal = document.getElementById('modal-container');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: var(--secondary-vibrant); font-size: 1.6rem;">Nuevo Servicio ✨</h2>
                <p style="opacity:0.6; font-size: 0.9rem;">Agrega un servicio al catálogo</p>
            </div>
            
            <form id="service-form">
                <div class="form-group">
                    <label class="label-premium">Nombre del Servicio</label>
                    <input type="text" id="service-name" class="input-premium" placeholder="Ej: Uñas Acrílicas" required>
                </div>
                <div class="form-group">
                    <label class="label-premium">Precio ($)</label>
                    <input type="number" id="service-price" class="input-premium" placeholder="15000" required>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button type="button" class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Cerrar</button>
                    <button type="submit" class="btn" style="flex:2">Guardar ✨</button>
                </div>
            </form>
        `;

        modal.classList.add('active');
        modal.classList.remove('hidden');

        document.getElementById('service-form').onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('service-name').value;
            const price = parseInt(document.getElementById('service-price').value);

            const { error } = await supabaseClient.from('services').insert({ name, price });

            if (error) alert('Error al guardar: ' + error.message);
            else {
                this.loadData();
                this.closeModal();
            }
        };
    },

    showEditService(id) {
        const service = this.state.services.find(s => s.id === id);
        if (!service) return;

        const modal = document.getElementById('modal-container');
        const modalContent = modal.querySelector('.modal-content');

        modalContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: var(--secondary-vibrant); font-size: 1.6rem;">Editar Servicio ✨</h2>
                <p style="opacity:0.6; font-size: 0.9rem;">Modifica el precio de ${service.name}</p>
            </div>
            
            <form id="edit-service-form">
                <div class="form-group">
                    <label class="label-premium">Precio ($)</label>
                    <input type="number" id="edit-service-price" class="input-premium" value="${service.price}" required>
                </div>
                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button type="button" class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Cerrar</button>
                    <button type="submit" class="btn" style="flex:2">Actualizar ✨</button>
                </div>
            </form>
        `;

        modal.classList.add('active');
        modal.classList.remove('hidden');

        document.getElementById('edit-service-form').onsubmit = async (e) => {
            e.preventDefault();
            const price = parseInt(document.getElementById('edit-service-price').value);

            const { error } = await supabaseClient.from('services').update({ price }).eq('id', id);

            if (error) alert('Error al actualizar: ' + error.message);
            else {
                this.loadData();
                this.closeModal();
            }
        };
    },

    async deleteService(id) {
        const service = this.state.services.find(s => s.id === id);
        if (confirm(`¿Estás segura de eliminar el servicio "${service ? service.name : ''}"?`)) {
            const { error } = await supabaseClient.from('services').delete().eq('id', id);
            if (error) alert('Error al eliminar: ' + error.message);
            else this.loadData();
        }
    },

    showAddAppointment() {
        const modal = document.getElementById('modal-container');
        const modalContent = modal.querySelector('.modal-content');

        const today = new Date().toISOString().split('T')[0];

        modalContent.innerHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="color: var(--secondary-vibrant); font-size: 1.6rem;">Nueva Cita ✨</h2>
                <p style="opacity:0.6; font-size: 0.9rem;">Organiza tu agenda ✨</p>
            </div>
            
            <form id="appointment-form">
                <div class="form-group">
                    <label class="label-premium">Nombre del Cliente</label>
                    <input type="text" id="client-name" class="input-premium" placeholder="Ej: Valentina" required>
                </div>
                <div class="form-group">
                    <label class="label-premium">Tipo de Servicio</label>
                    <select id="service-select" class="input-premium">
                        ${this.state.services.map(s => `<option value="${s.name}">${s.name} ($${s.price.toLocaleString()})</option>`).join('')}
                    </select>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="label-premium">Día (Calendario)</label>
                        <input type="date" id="appointment-date" class="input-premium" value="${today}" required>
                    </div>
                    <div class="form-group" style="margin-bottom: 0;">
                        <label class="label-premium">Hora</label>
                        <input type="time" id="appointment-time" class="input-premium" required>
                    </div>
                </div>

                <div style="grid-column: span 2; margin-top: 10px;">
                    <p style="font-size: 0.8rem; opacity: 0.5; font-style: italic;">* Ingresa la hora exacta deseada</p>
                </div>

                <div style="display: flex; gap: 15px; margin-top: 30px;">
                    <button type="button" class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Cerrar</button>
                    <button type="submit" class="btn" style="flex:2">Agendar ✨</button>
                </div>
            </form>
        `;

        modal.classList.add('active');
        modal.classList.remove('hidden');

        document.getElementById('appointment-form').onsubmit = (e) => {
            e.preventDefault();
            this.addAppointment();
        };
    },

    closeModal() {
        const modal = document.getElementById('modal-container');
        modal.classList.remove('active');
        setTimeout(() => modal.classList.add('hidden'), 300);
    },

    async addAppointment() {
        const client = document.getElementById('client-name').value;
        const serviceName = document.getElementById('service-select').value;
        const date = document.getElementById('appointment-date').value;
        const time = document.getElementById('appointment-time').value;
        const service = this.state.services.find(s => s.name === serviceName);

        const newApt = {
            client,
            service: serviceName,
            date: date,
            time,
            price: service.price,
            worker: this.state.currentUser,
            status: 'pending'
        };

        const { error } = await supabaseClient.from('appointments').insert(newApt);

        if (error) alert('Error al agendar: ' + error.message);
        else {
            this.loadData();
            this.closeModal();
        }
    },

    async completeAppointment(id) {
        const { error } = await supabaseClient
            .from('appointments')
            .update({ status: 'completed' })
            .eq('id', id);

        if (error) alert('Error al finalizar: ' + error.message);
        else this.loadData();
    }
};

window.onload = () => app.init();
