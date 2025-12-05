import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  PlusCircle, 
  Search, 
  Phone, 
  Mail, 
  Car, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  MessageSquare, 
  UserPlus,
  BarChart3,
  ChevronRight,
  Clock,
  UserCog,
  LogOut,
  Target,
  Menu,
  X,
  Send,
  MapPin,
  Activity
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  signInWithCustomToken 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  doc, 
  updateDoc, 
  query, 
  serverTimestamp,
  deleteDoc
} from "firebase/firestore";

/**
 * CONFIGURACIÓN DE FIREBASE
 * Esta sección maneja la configuración automática para el entorno de prueba
 * y permite fácil migración a CodeSandbox/Netlify.
 */
const getFirebaseConfig = () => {
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }
  // Configuración de Honda CRM Ventas
  return {
    apiKey: "AIzaSyBbfZXYcBhg8xrBQ4i7LhKqmk7CZUz715Y",
    authDomain: "honda-crm-ventas.firebaseapp.com",
    projectId: "honda-crm-ventas",
    storageBucket: "honda-crm-ventas.firebasestorage.app",
    messagingSenderId: "186941272958",
    appId: "1:186941272958:web:9c5b73554a2d897c19b92f",
    measurementId: "G-FWBEN09R85"
  };
};

// Inicialización de Servicios
const config = getFirebaseConfig();
const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

// ID de la App (Dinámico o fijo para producción)
const APP_ID = typeof __app_id !== 'undefined' ? __app_id : 'honda-crm-v1';

// --- Constantes y Utilidades ---
const ADVISORS = [
  { id: 'adv1', name: 'Alejandro Hurtado', color: '#3B82F6' },
  { id: 'adv2', name: 'Triana Montes', color: '#10B981' },
  { id: 'adv3', name: 'Jonathan Rodriguez', color: '#F59E0B' },
  { id: 'adv4', name: 'Lucy Figueroa', color: '#8B5CF6' },
  { id: 'adv5', name: 'Giovanni Gonzalez', color: '#EC4899' }
];

const STATUS_FLOW = [
  { key: 'new', label: 'Nuevo', color: 'bg-blue-100 text-blue-800' },
  { key: 'contacted', label: 'Contactado', color: 'bg-yellow-100 text-yellow-800' },
  { key: 'appointment', label: 'Cita Agendada', color: 'bg-purple-100 text-purple-800' },
  { key: 'visit', label: 'Visita Showroom', color: 'bg-orange-100 text-orange-800' },
  { key: 'negotiation', label: 'Negociación', color: 'bg-indigo-100 text-indigo-800' },
  { key: 'sold', label: 'Vendido', color: 'bg-green-100 text-green-800' },
  { key: 'lost', label: 'Perdido', color: 'bg-red-100 text-red-800' }
];

const SOURCES = [
  { id: 'hdm', label: 'HDM (Honda Digital)', color: 'text-blue-600 bg-blue-50' },
  { id: 'redes', label: 'Redes Sociales', color: 'text-pink-600 bg-pink-50' },
  { id: 'prospeccion', label: 'Prospección', color: 'text-emerald-600 bg-emerald-50' },
  { id: 'piso', label: 'Piso / Showroom', color: 'text-purple-600 bg-purple-50' },
  { id: 'whatsapp', label: 'WhatsApp', color: 'text-green-600 bg-green-50' },
  { id: 'llamada', label: 'Llamada Entrante', color: 'text-orange-600 bg-orange-50' },
  { id: 'gerencia', label: 'Gerencia', color: 'text-slate-600 bg-slate-50' }
];

const MODELS = ['City', 'Civic', 'Accord', 'B-RV', 'HR-V', 'CR-V', 'Pilot','Odyssey', 'Seminuevo'];

// Componente Principal
export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [error, setError] = useState(null);
  
  // Estado para simular el usuario logueado ('supervisor' o ID de asesor)
  const [currentUserId, setCurrentUserId] = useState('supervisor');

  // 1. Inicialización y Autenticación (Patrón Robusto)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("Error de autenticación. Recarga la página.");
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false); // Stop loading if auth fails/is null
    });
    return () => unsubscribe();
  }, []);

  // 2. Carga de Datos (Leads)
  useEffect(() => {
    if (!user) return;
    
    // Usamos la ruta estandarizada para datos públicos compartidos
    const leadsCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', 'leads');
    
    // Consulta simple para evitar errores de índices en Firestore
    const q = query(leadsCollection);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const leadsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Convertir Timestamp a Date de forma segura
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        };
      });
      
      // Ordenamiento en cliente
      leadsData.sort((a, b) => b.createdAt - a.createdAt);
      
      setLeads(leadsData);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching leads:", err);
      setError("Error cargando leads. Verifica tu conexión.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Lógica de Asignación Equitativa
  const getNextAdvisor = () => {
    const counts = {};
    ADVISORS.forEach(adv => counts[adv.id] = 0);
    leads.forEach(lead => {
      if (counts[lead.advisorId] !== undefined && lead.status !== 'sold' && lead.status !== 'lost') {
        counts[lead.advisorId]++;
      }
    });

    let selectedAdvisor = ADVISORS[0];
    let minCount = Infinity;

    ADVISORS.forEach(adv => {
      if (counts[adv.id] < minCount) {
        minCount = counts[adv.id];
        selectedAdvisor = adv;
      }
    });
    return selectedAdvisor;
  };

  const handleAddLead = async (formData) => {
    if (!user) return;
    
    let advisorToAssign;
    const isSupervisor = currentUserId === 'supervisor';

    if (isSupervisor) {
      if (formData.manualAdvisorId && formData.manualAdvisorId !== 'auto') {
        advisorToAssign = ADVISORS.find(a => a.id === formData.manualAdvisorId);
      } else {
        advisorToAssign = getNextAdvisor();
      }
    } else {
      advisorToAssign = ADVISORS.find(a => a.id === currentUserId);
    }
    
    if (!advisorToAssign) advisorToAssign = ADVISORS[0]; // Fallback

    try {
      const leadsCollection = collection(db, 'artifacts', APP_ID, 'public', 'data', 'leads');
      await addDoc(leadsCollection, {
        ...formData,
        advisorId: advisorToAssign.id,
        advisorName: advisorToAssign.name,
        status: 'new',
        createdAt: serverTimestamp(),
        authorId: user.uid,
        history: [{
          type: 'system',
          text: `Lead creado (${formData.source}) y asignado a ${advisorToAssign.name}`,
          date: new Date().toISOString()
        }]
      });
      setActiveTab('leads');
    } catch (err) {
      console.error("Error adding lead:", err);
      alert("Error al guardar. Intenta nuevamente.");
    }
  };

  const handleUpdateStatus = async (leadId, newStatus, comment) => {
    if (!user) return;
    try {
      const leadRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leads', leadId);
      const oldLead = leads.find(l => l.id === leadId);
      const currentUserObj = ADVISORS.find(a => a.id === currentUserId);
      const userName = currentUserId === 'supervisor' ? 'Supervisor' : (currentUserObj?.name || 'Agente');
      
      const newHistoryEntry = {
        type: 'status_change',
        text: `Cambio de ${oldLead.status} a ${newStatus}. Nota: ${comment}`,
        date: new Date().toISOString(),
        user: userName
      };

      await updateDoc(leadRef, {
        status: newStatus,
        history: [...(oldLead.history || []), newHistoryEntry]
      });
      setSelectedLead(null);
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleAddComment = async (leadId, comment) => {
    if (!user) return;
    try {
      const leadRef = doc(db, 'artifacts', APP_ID, 'public', 'data', 'leads', leadId);
      const oldLead = leads.find(l => l.id === leadId);
      const currentUserObj = ADVISORS.find(a => a.id === currentUserId);
      const userName = currentUserId === 'supervisor' ? 'Supervisor' : (currentUserObj?.name || 'Agente');

      const newHistoryEntry = {
        type: 'comment',
        text: comment,
        date: new Date().toISOString(),
        user: userName
      };

      await updateDoc(leadRef, {
        history: [...(oldLead.history || []), newHistoryEntry]
      });
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  // --- FILTRADO DE VISTAS ---
  const visibleLeads = useMemo(() => {
    if (currentUserId === 'supervisor') return leads;
    return leads.filter(l => l.advisorId === currentUserId);
  }, [leads, currentUserId]);

  const currentUserData = useMemo(() => {
    if (currentUserId === 'supervisor') return { name: 'Supervisor General', role: 'Gerencia' };
    const adv = ADVISORS.find(a => a.id === currentUserId);
    return adv ? { name: adv.name, role: 'Asesor de Ventas' } : { name: 'Usuario', role: 'Ventas' };
  }, [currentUserId]);

  const renderContent = () => {
    if (loading) return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
        <div className="animate-spin text-blue-600"><Activity size={32}/></div>
        <p>Conectando con CRM...</p>
      </div>
    );

    switch (activeTab) {
      case 'dashboard':
        return <DashboardView leads={visibleLeads} isSupervisor={currentUserId === 'supervisor'} />;
      case 'leads':
        return <LeadsListView leads={visibleLeads} onSelect={setSelectedLead} isSupervisor={currentUserId === 'supervisor'} />;
      case 'new-lead':
        return (
          <NewLeadForm 
            onSubmit={handleAddLead} 
            onCancel={() => setActiveTab('leads')} 
            isSupervisor={currentUserId === 'supervisor'}
            currentUserData={currentUserData}
          />
        );
      default:
        return <DashboardView leads={visibleLeads} isSupervisor={currentUserId === 'supervisor'} />;
    }
  };

  return (
    <>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slide-in-right { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
        .safe-area-pb { padding-bottom: env(safe-area-inset-bottom); }
      `}</style>
      
      <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-slate-900/50 z-20 md:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar Navigation */}
        <aside className={`
          fixed md:relative inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-xl z-30 transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="p-6 border-b border-slate-700 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Car size={28} />
                <h1 className="text-xl font-bold tracking-tight text-white">Honda App</h1>
              </div>
              <p className="text-xs text-slate-400">CRM Móvil</p>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>
          
          <nav className="flex-1 p-4 space-y-2">
            <NavButton 
              active={activeTab === 'dashboard'} 
              onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
              icon={<LayoutDashboard size={20} />} 
              label="Dashboard" 
            />
            <NavButton 
              active={activeTab === 'leads'} 
              onClick={() => { setActiveTab('leads'); setIsSidebarOpen(false); }} 
              icon={<Users size={20} />} 
              label="Mis Clientes" 
            />
            <div className="h-4"></div>
            <NavButton 
              active={activeTab === 'new-lead'} 
              onClick={() => { setActiveTab('new-lead'); setIsSidebarOpen(false); }} 
              icon={<UserPlus size={20} />} 
              label="Registrar Lead" 
              primary
            />
          </nav>

          {/* User Switcher Section */}
          <div className="p-4 bg-slate-800 border-t border-slate-700 safe-area-pb">
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${currentUserId === 'supervisor' ? 'bg-blue-600' : 'bg-emerald-500'}`}>
                {currentUserData.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentUserData.name}</p>
                <p className="text-xs text-slate-400 truncate">{currentUserData.role}</p>
              </div>
            </div>
            
            <select 
              value={currentUserId}
              onChange={(e) => setCurrentUserId(e.target.value)}
              className="w-full bg-slate-900 text-slate-300 text-xs py-2 px-3 rounded border border-slate-700 focus:outline-none focus:border-blue-500 appearance-none cursor-pointer"
            >
              <option value="supervisor">Vista: Supervisor</option>
              <optgroup label="Asesores">
                {ADVISORS.map(adv => (
                  <option key={adv.id} value={adv.id}>{adv.name}</option>
                ))}
              </optgroup>
            </select>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative bg-slate-50">
          <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shadow-sm z-10 sticky top-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-lg font-semibold text-slate-800 capitalize truncate">
                {activeTab === 'new-lead' ? 'Nuevo' : activeTab === 'dashboard' ? 'Tablero' : 'Clientes'}
              </h2>
              {currentUserId !== 'supervisor' && (
                <span className="hidden sm:inline-block px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium border border-emerald-200">
                  Personal
                </span>
              )}
            </div>
            {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 relative">
            {renderContent()}
          </div>

          {/* Modal Full Screen Mobile */}
          {selectedLead && (
            <LeadDetailModal 
              lead={selectedLead} 
              onClose={() => setSelectedLead(null)} 
              onUpdateStatus={handleUpdateStatus}
              onAddComment={handleAddComment}
              currentUserRole={currentUserId === 'supervisor' ? 'Supervisor' : 'Asesor'}
            />
          )}
        </main>
      </div>
    </>
  );
}

// --- Sub-Componentes ---

const NavButton = ({ active, onClick, icon, label, primary }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-blue-600 text-white shadow-md' 
        : primary 
          ? 'bg-white/10 text-white hover:bg-white/20' 
          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

const DashboardView = ({ leads, isSupervisor }) => {
  const stats = useMemo(() => {
    const total = leads.length;
    const sold = leads.filter(l => l.status === 'sold').length;
    const visits = leads.filter(l => l.status === 'visit' || l.status === 'sold' || l.status === 'negotiation').length;
    const appointments = leads.filter(l => l.status === 'appointment' || l.status === 'visit' || l.status === 'sold').length;
    
    const statusData = STATUS_FLOW.map(s => ({
      name: s.label,
      count: leads.filter(l => l.status === s.key).length
    }));

    // Data for models (Top 5)
    const modelCounts = {};
    leads.forEach(l => {
      modelCounts[l.modelInterest] = (modelCounts[l.modelInterest] || 0) + 1;
    });
    // Convert to array and sort
    let modelData = Object.keys(modelCounts)
      .map(key => ({ name: key, value: modelCounts[key] }))
      .sort((a,b) => b.value - a.value);

    return { total, sold, visits, appointments, statusData, modelData };
  }, [leads]);

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* KPI Cards Grid Mobile */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <KPICard title={isSupervisor ? "Total" : "Míos"} value={stats.total} icon={<Users className="text-blue-500 w-5 h-5 md:w-6 md:h-6" />} />
        <KPICard title="Citas" value={stats.appointments} icon={<Calendar className="text-purple-500 w-5 h-5 md:w-6 md:h-6" />} />
        <KPICard title="Visitas" value={stats.visits} icon={<MapPin className="text-orange-500 w-5 h-5 md:w-6 md:h-6" />} />
        <KPICard title="Ventas" value={stats.sold} icon={<CheckCircle className="text-green-500 w-5 h-5 md:w-6 md:h-6" />} isSuccess />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={20} className="text-slate-400"/>
            Embudo de Ventas
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={60}/>
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Car size={20} className="text-slate-400"/>
            Modelos de Interés
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
               <BarChart layout="vertical" data={stats.modelData}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fontSize: 12}} />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon, isSuccess }) => (
  <div className={`bg-white p-4 rounded-xl border ${isSuccess ? 'border-green-200 bg-green-50' : 'border-slate-200'} shadow-sm flex flex-col justify-between h-24 md:h-auto`}>
    <div className="flex justify-between items-start">
      <p className="text-xs font-medium text-slate-500">{title}</p>
      <div className={`p-1.5 rounded-full ${isSuccess ? 'bg-green-100' : 'bg-slate-100'}`}>
        {icon}
      </div>
    </div>
    <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
  </div>
);

const LeadsListView = ({ leads, onSelect, isSupervisor }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          lead.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || lead.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full animate-fade-in overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">Todos los estatus</option>
          {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* List (Responsive Table) */}
      <div className="overflow-y-auto flex-1 pb-10">
        {filteredLeads.length === 0 ? (
          <div className="p-10 text-center text-slate-400">No hay resultados.</div>
        ) : (
          filteredLeads.map(lead => {
             const sourceConfig = SOURCES.find(s => s.id === lead.source) || SOURCES[0];
             const statusConfig = STATUS_FLOW.find(s => s.key === lead.status) || STATUS_FLOW[0];
             
             return (
              <div 
                key={lead.id} 
                onClick={() => onSelect(lead)}
                className="p-4 border-b border-slate-100 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sourceConfig.color}`}>
                        {sourceConfig.label}
                      </span>
                      <span className="text-xs text-slate-400">
                        {lead.createdAt instanceof Date 
                          ? lead.createdAt.toLocaleDateString(undefined, {month:'short', day:'numeric'})
                          : 'Hoy'}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-800 text-base">{lead.name}</p>
                  </div>
                  <ChevronRight className="text-slate-300" size={20} />
                </div>
                
                <div className="flex justify-between items-end">
                  <div className="flex flex-col gap-1">
                     <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Car size={12}/> {lead.modelInterest}
                     </span>
                     {isSupervisor && (
                       <span className="text-xs text-slate-400">
                         Asesor: {lead.advisorName?.split(' ')[0]}
                       </span>
                     )}
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const NewLeadForm = ({ onSubmit, onCancel, isSupervisor, currentUserData }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    modelInterest: MODELS[0],
    source: isSupervisor ? 'hdm' : 'prospeccion', 
    manualAdvisorId: 'auto',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const InputGroup = ({ label, type, required, value, onChange }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input 
        type={type} 
        required={required}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8 animate-fade-in pb-20">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
        <div className="bg-blue-100 p-3 rounded-full text-blue-600">
          <UserPlus size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Registrar</h2>
          <p className="text-sm text-slate-500">Nuevo cliente potencial</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
          <InputGroup label="Nombre Completo" type="text" required 
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          
          <div className="grid grid-cols-2 gap-4">
             <InputGroup label="Teléfono" type="tel" required 
              value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Modelo</label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none bg-white"
                value={formData.modelInterest}
                onChange={e => setFormData({...formData, modelInterest: e.target.value})}
              >
                {MODELS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          
          <InputGroup label="Correo (Opcional)" type="email" 
            value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />

          {/* Selector de Fuente */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <Target size={16} className="text-slate-400"/> Fuente
              </label>
              <select 
                className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none bg-white"
                value={formData.source}
                onChange={e => setFormData({...formData, source: e.target.value})}
              >
                {SOURCES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            {/* Selector de Asignación (Solo Supervisor) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                <UserCog size={16} className="text-slate-400"/> Asignar
              </label>
              {isSupervisor ? (
                <select 
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 outline-none bg-white"
                  value={formData.manualAdvisorId}
                  onChange={e => setFormData({...formData, manualAdvisorId: e.target.value})}
                >
                  <option value="auto">⚡ Automático</option>
                  <optgroup label="Asignación Manual">
                    {ADVISORS.map(adv => (
                      <option key={adv.id} value={adv.id}>{adv.name}</option>
                    ))}
                  </optgroup>
                </select>
              ) : (
                <div className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 text-sm flex items-center gap-2">
                  <CheckCircle size={14} className="text-green-500"/>
                  Mí mismo
                </div>
              )}
            </div>
          </div>

        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onCancel} className="flex-1 py-3 rounded-lg text-slate-600 bg-slate-100 font-medium">Cancelar</button>
          <button type="submit" className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-medium shadow-md">Guardar</button>
        </div>
      </form>
    </div>
  );
};

const LeadDetailModal = ({ lead, onClose, onUpdateStatus, onAddComment, currentUserRole }) => {
  const [comment, setComment] = useState('');
  const [newStatus, setNewStatus] = useState(lead.status);
  const sourceConfig = SOURCES.find(s => s.id === lead.source) || SOURCES[0];
  
  // Limpieza de teléfono para links
  const cleanPhone = lead.phone ? lead.phone.replace(/\D/g, '') : ''; 

  const historyRef = useRef(null);
  useEffect(() => {
    if(historyRef.current) historyRef.current.scrollTop = historyRef.current.scrollHeight;
  }, [lead.history]);

  const handleStatusSubmit = () => {
    if (newStatus !== lead.status) {
      onUpdateStatus(lead.id, newStatus, comment || 'Cambio de estatus rápido');
      setComment('');
    }
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if(comment.trim()) {
      onAddComment(lead.id, comment);
      setComment('');
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full md:max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header con Acciones Rápidas */}
        <div className="p-4 md:p-6 border-b border-slate-200 bg-slate-50 relative">
          <button onClick={onClose} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-2">
            <X size={24} />
          </button>
          
          <div className="pr-10">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${sourceConfig.color}`}>
                {sourceConfig.label}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{lead.name}</h2>
            <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
               <span>{lead.modelInterest}</span>
               <span className="w-1 h-1 rounded-full bg-slate-300"></span>
               <span>{lead.phone}</span>
            </div>
          </div>

          {/* Botones de Acción Móvil */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <a 
              href={`https://wa.me/${cleanPhone}`} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-green-500 text-white font-medium shadow-sm hover:bg-green-600 transition-colors"
            >
              <MessageSquare size={18} /> WhatsApp
            </a>
            <a 
              href={`tel:${cleanPhone}`} 
              className="flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 text-white font-medium shadow-sm hover:bg-blue-600 transition-colors"
            >
              <Phone size={18} /> Llamar
            </a>
          </div>
        </div>

        {/* Status Control */}
        <div className="p-4 bg-white border-b border-slate-100">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Estatus Actual</label>
          <div className="flex gap-2">
            <select 
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="flex-1 p-2 border border-slate-300 rounded-lg text-sm bg-white"
            >
              {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <button 
              onClick={handleStatusSubmit}
              disabled={newStatus === lead.status}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Ok
            </button>
          </div>
        </div>

        {/* History / Timeline */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50" ref={historyRef}>
          <div className="space-y-5 pb-4">
            {lead.history && lead.history.map((item, idx) => (
              <div key={idx} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    item.type === 'system' ? 'bg-slate-200 text-slate-500' :
                    item.type === 'status_change' ? 'bg-orange-100 text-orange-600' :
                    'bg-blue-100 text-blue-600'
                  }`}>
                    {item.type === 'system' ? <Clock size={14}/> : 
                     item.type === 'status_change' ? <CheckCircle size={14}/> : 
                     <MessageSquare size={14}/>}
                  </div>
                  {idx < lead.history.length - 1 && <div className="w-0.5 h-full bg-slate-200 mt-2"></div>}
                </div>
                <div className="pb-2 flex-1">
                  <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                    <span>{item.user || 'Sistema'}</span>
                    <span>{new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className={`p-3 rounded-lg text-sm ${
                    item.type === 'system' ? 'bg-white border border-slate-200 text-slate-500 italic' :
                    item.type === 'status_change' ? 'bg-white border border-orange-200 text-slate-700' :
                    'bg-blue-50 text-blue-900'
                  }`}>
                    {item.text}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* New Comment Input */}
        <div className="p-3 border-t border-slate-200 bg-white safe-area-pb">
          <form onSubmit={handleCommentSubmit} className="flex gap-2 items-center">
            <input
              type="text"
              className="flex-1 p-2 bg-slate-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              placeholder="Escribir nota..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button 
              type="submit"
              disabled={!comment.trim()}
              className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
