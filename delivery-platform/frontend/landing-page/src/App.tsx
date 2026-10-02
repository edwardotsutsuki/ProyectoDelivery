import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Search,
  Store,
  Bike,
  ShieldCheck,
  Clock,
  ArrowRight,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  Compass,
  Sparkles,
  Phone,
  AlertCircle,
  ExternalLink,
  User,
  UserCheck,
  LogOut,
  X,
  Loader2,
  Wallet,
  CreditCard,
  History,
  Settings,
  Edit2,
  Navigation,
  AlertTriangle,
  PlusCircle,
  Check
} from 'lucide-react';

interface TipoComercio {
  id: string;
  nombre: string;
  descripcion?: string;
  icono: string;
  tipo_layout: 'restaurante' | 'grid_ecommerce';
  requiere_cocina?: boolean;
  permite_recetas?: boolean;
  control_edad_18?: boolean;
}

interface Comercio {
  id: string;
  nombre_comercial: string;
  descripcion: string;
  direccion: string;
  is_abierto: boolean;
  telefono: string;
  categoria: string;
  tiempo_entrega_promedio: number;
  costo_base_envio: string | number;
  calificacion: string | number;
  canton?: string;
  tipo_comercio_id?: string;
  tipo_comercio_nombre?: string;
  tipo_comercio_icono?: string;
  tipo_layout?: 'restaurante' | 'grid_ecommerce';
  requiere_cocina?: boolean;
  maneja_inventario_general?: boolean;
}

interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  categoria: string;
  categoria_id?: string | null;
  categoria_nombre?: string | null;
  categoria_icono?: string | null;
  unidad_medida?: string;
  maneja_stock?: boolean;
  stock_disponible?: number | null;
  requiere_receta?: boolean;
  is_disponible: boolean;
  imagen_url?: string;
}

interface CartItem {
  producto: Producto;
  cantidad: number;
}

interface DireccionUsuario {
  id: string;
  usuario_id: string;
  alias: string;
  direccion: string;
  canton: string;
  referencia?: string;
  lat: number | string;
  lon: number | string;
  es_principal: boolean;
  fecha_creacion?: string;
}

interface LedgerMovimiento {
  id: string;
  pedido_id?: string | null;
  tipo_movimiento: string;
  monto: string | number;
  saldo_resultante: string | number;
  descripcion: string;
  metadata?: any;
  fecha_creacion: string;
}

const API_BASE = 'http://localhost:8080/api/v1';

const ADDRESS_PRESETS = [
  { label: 'San Antonio (Baba Centro)', direccion: 'Barrio San Antonio, Calle Bolívar y Sucre, Baba', canton: 'Baba', lat: -1.7940, lon: -79.6810 },
  { label: 'Parque Central (Baba)', direccion: 'Parque Central de Baba, Av. Guayaquil y Sucre', canton: 'Baba', lat: -1.7917, lon: -79.6783 },
  { label: 'Recinto La Nobleza (Baba)', direccion: 'Recinto La Nobleza, Vía Baba - Guare', canton: 'Baba', lat: -1.7650, lon: -79.6920 },
  { label: 'Babahoyo Centro (Comercial)', direccion: 'Av. 9 de Octubre y Pedro Carbo, Babahoyo', canton: 'Babahoyo', lat: -1.8022, lon: -79.5344 },
];

const DEFAULT_VERTICALES: TipoComercio[] = [
  { id: 'todos', nombre: 'Todos los Locales', icono: '🌟', tipo_layout: 'restaurante' },
  { id: 'restaurante', nombre: 'Restaurantes', icono: '🍔', tipo_layout: 'restaurante' },
  { id: 'supermercado', nombre: 'Supermercados', icono: '🛒', tipo_layout: 'grid_ecommerce' },
  { id: 'farmacia', nombre: 'Farmacias', icono: '💊', tipo_layout: 'grid_ecommerce' },
  { id: 'licorera', nombre: 'Licoreras', icono: '🍾', tipo_layout: 'grid_ecommerce' },
  { id: 'express', nombre: 'Express', icono: '⚡', tipo_layout: 'grid_ecommerce' },
];

export default function App() {
  const [vista, setVista] = useState<'home' | 'menu' | 'checkout' | 'tracking'>('home');
  const [ciudadFiltro, setCiudadFiltro] = useState<'Todas' | 'Baba' | 'Babahoyo'>('Baba');
  const [verticales, setVerticales] = useState<TipoComercio[]>(DEFAULT_VERTICALES);
  const [verticalFiltro, setVerticalFiltro] = useState<string>('todos');
  const [menuCategoriaFiltro, setMenuCategoriaFiltro] = useState<string>('todas');
  const [menuSearch, setMenuSearch] = useState<string>('');

  // Preferencias Retail, Farmacia y Licorera
  const [politicaSustitucion, setPoliticaSustitucion] = useState<'similar' | 'llamar' | 'no_reemplazar'>('similar');
  const [recetaAdjunta, setRecetaAdjunta] = useState<string | null>(null);
  const [confirmaMayorEdad, setConfirmaMayorEdad] = useState<boolean>(false);

  // Datos del backend
  const [comercios, setComercios] = useState<Comercio[]>([]);
  const [comercioActivo, setComercioActivo] = useState<Comercio | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrito de compras
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [drawerCarritoAbierto, setDrawerCarritoAbierto] = useState(false);

  // Checkout & Autenticación de Cliente
  const [customerUser, setCustomerUser] = useState<{ id: string; name: string; email: string; phone?: string } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('+5939');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Aislamiento de Carrito Multitienda
  const [comercioCarrito, setComercioCarrito] = useState<Comercio | null>(null);
  const [showSwitchStoreModal, setShowSwitchStoreModal] = useState(false);
  const [pendingAddProduct, setPendingAddProduct] = useState<Producto | null>(null);

  // Perfil, Ubicaciones & Billetera Virtual (Ledger)
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState<'datos' | 'direcciones' | 'billetera' | 'pedidos'>('datos');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletMovimientos, setWalletMovimientos] = useState<LedgerMovimiento[]>([]);
  const [direcciones, setDirecciones] = useState<DireccionUsuario[]>([]);
  const [customerOrders, setCustomerOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Formulario Perfil
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  // Formulario Dirección
  const [newAlias, setNewAlias] = useState('Casa');
  const [newCanton, setNewCanton] = useState('Baba');
  const [newDireccion, setNewDireccion] = useState('');
  const [newReferencia, setNewReferencia] = useState('');
  const [newEsPrincipal, setNewEsPrincipal] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);

  // Recarga Billetera
  const [rechargeAmount, setRechargeAmount] = useState<number>(10);
  const [rechargeMetodo, setRechargeMetodo] = useState<'deuna' | 'transferencia'>('deuna');
  const [rechargeReferencia, setRechargeReferencia] = useState('');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeSuccess, setRechargeSuccess] = useState('');

  const [direccionEntrega, setDireccionEntrega] = useState(ADDRESS_PRESETS[0].direccion);
  const [coordsEntrega, setCoordsEntrega] = useState({ lat: ADDRESS_PRESETS[0].lat, lon: ADDRESS_PRESETS[0].lon });
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia' | 'saldo_virtual'>('efectivo');
  const [clienteNombre, setClienteNombre] = useState('Edward Otsutsuki');
  const [clienteTelefono, setClienteTelefono] = useState('+593995544332');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Consultar Billetera Virtual (Ledger)
  const fetchWallet = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/ledger/billetera/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setWalletBalance(parseFloat(data.data.saldoActual || '0'));
          setWalletMovimientos(data.data.movimientos || []);
        }
      }
    } catch (err) {
      console.warn('Error al consultar billetera:', err);
    }
  };

  // Consultar Direcciones Guardadas
  const fetchDirecciones = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/users/${userId}/direcciones`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setDirecciones(data.data);
          const principal = data.data.find((d: DireccionUsuario) => d.es_principal);
          if (principal) {
            setDireccionEntrega(principal.direccion);
            setCoordsEntrega({ lat: Number(principal.lat), lon: Number(principal.lon) });
            setCiudadFiltro(principal.canton as any);
          }
        }
      }
    } catch (err) {
      console.warn('Error al cargar direcciones:', err);
    }
  };

  // Consultar Historial de Pedidos del Cliente
  const fetchCustomerOrders = async (userId: string) => {
    try {
      setLoadingOrders(true);
      const res = await fetch(`${API_BASE}/orders/cliente/${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setCustomerOrders(data.data);
        }
      }
    } catch (err) {
      console.warn('Error al cargar pedidos del cliente:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Restaurar sesión de cliente guardada
  useEffect(() => {
    const savedUser = localStorage.getItem('delivery_customer_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        setCustomerUser(u);
        setClienteNombre(u.name || 'Cliente Baba');
        if (u.phone) setClienteTelefono(u.phone);
      } catch {
        localStorage.removeItem('delivery_customer_user');
      }
    }
  }, []);

  // Cargar datos del cliente cuando inicia sesión
  useEffect(() => {
    if (customerUser?.id) {
      setProfileName(customerUser.name || '');
      setProfileEmail(customerUser.email || '');
      setProfilePhone(customerUser.phone || '');
      fetchWallet(customerUser.id);
      fetchDirecciones(customerUser.id);
      fetchCustomerOrders(customerUser.id);
    }
  }, [customerUser]);

  const handleLogoutCustomer = () => {
    localStorage.removeItem('delivery_customer_user');
    localStorage.removeItem('delivery_customer_token');
    setCustomerUser(null);
    setDirecciones([]);
    setWalletBalance(0);
    setWalletMovimientos([]);
    setCustomerOrders([]);
    setShowProfileModal(false);
  };

  // Estado para Solicitud de Afiliación de Comercio (Rappi/PedidosYa Partner Onboarding)
  const [showAfiliacionModal, setShowAfiliacionModal] = useState(false);
  const [afiliacionPaso, setAfiliacionPaso] = useState<1 | 2 | 3>(1);
  const [afilNombreComercial, setAfilNombreComercial] = useState('');
  const [afilCategoria, setAfilCategoria] = useState('Restaurante');
  const [afilRuc, setAfilRuc] = useState('');
  const [afilRazonSocial, setAfilRazonSocial] = useState('');
  const [afilCanton, setAfilCanton] = useState<'baba' | 'babahoyo'>('baba');
  const [afilDireccion, setAfilDireccion] = useState('');
  const [afilTelefonoComercio, setAfilTelefonoComercio] = useState('+5939');
  const [afilDescripcion, setAfilDescripcion] = useState('');

  const [afilNombreEncargado, setAfilNombreEncargado] = useState('');
  const [afilEmail, setAfilEmail] = useState('');
  const [afilPassword, setAfilPassword] = useState('');
  const [afilTelefonoEncargado, setAfilTelefonoEncargado] = useState('+5939');

  const [afilBanco, setAfilBanco] = useState('Banco Pichincha');
  const [afilTipoCuenta, setAfilTipoCuenta] = useState<'ahorros' | 'corriente'>('ahorros');
  const [afilNumeroCuenta, setAfilNumeroCuenta] = useState('');
  const [afilTitularCuenta, setAfilTitularCuenta] = useState('');

  const [afiliacionLoading, setAfiliacionLoading] = useState(false);
  const [afiliacionError, setAfiliacionError] = useState('');
  const [afiliacionSuccess, setAfiliacionSuccess] = useState(false);

  const handleSubmitAfiliacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!afilNombreComercial.trim() || !afilDireccion.trim() || !afilEmail.trim() || !afilPassword.trim() || !afilNombreEncargado.trim()) {
      setAfiliacionError('Por favor completa todos los campos obligatorios.');
      return;
    }

    setAfiliacionLoading(true);
    setAfiliacionError('');

    try {
      const res = await fetch(`${API_BASE}/auth/afiliar-comercio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreComercial: afilNombreComercial.trim(),
          categoria: afilCategoria,
          descripcion: afilDescripcion.trim(),
          direccion: afilDireccion.trim(),
          canton: afilCanton,
          telefonoComercio: afilTelefonoComercio.trim(),
          ruc: afilRuc.trim() || null,
          razonSocial: afilRazonSocial.trim() || null,
          banco: afilBanco,
          tipoCuenta: afilTipoCuenta,
          numeroCuenta: afilNumeroCuenta.trim() || null,
          titularCuenta: afilTitularCuenta.trim() || afilNombreEncargado.trim(),
          nombreEncargado: afilNombreEncargado.trim(),
          email: afilEmail.trim().toLowerCase(),
          password: afilPassword.trim(),
          telefonoEncargado: afilTelefonoEncargado.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al procesar la solicitud de afiliación.');
      }

      setAfiliacionSuccess(true);
    } catch (err: any) {
      setAfiliacionError(err.message || 'Error de comunicación.');
    } finally {
      setAfiliacionLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (authMode === 'login') {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authEmail.trim(), password: authPassword.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Credenciales inválidas.');
        }

        const userObj = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          phone: data.data.user.phone || '+593995544332',
        };
        setCustomerUser(userObj);
        localStorage.setItem('delivery_customer_user', JSON.stringify(userObj));
        if (data.data.tokens?.accessToken) {
          localStorage.setItem('delivery_customer_token', data.data.tokens.accessToken);
        }
        setClienteNombre(userObj.name);
        if (userObj.phone) setClienteTelefono(userObj.phone);
        setShowAuthModal(false);
      } else {
        if (!authName.trim()) throw new Error('El nombre completo es requerido.');
        const res = await fetch(`${API_BASE}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: authName.trim(),
            email: authEmail.trim().toLowerCase(),
            password: authPassword.trim(),
            phone: authPhone.trim(),
            role: 'cliente',
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Error al crear la cuenta.');
        }

        const userObj = {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          phone: data.data.user.phone || authPhone.trim(),
        };
        setCustomerUser(userObj);
        localStorage.setItem('delivery_customer_user', JSON.stringify(userObj));
        if (data.data.tokens?.accessToken) {
          localStorage.setItem('delivery_customer_token', data.data.tokens.accessToken);
        }
        setClienteNombre(userObj.name);
        setClienteTelefono(userObj.phone);
        setShowAuthModal(false);
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error de conexión.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Pedido Confirmado & Tracking
  const [pedidoConfirmado, setPedidoConfirmado] = useState<any>(null);
  const [trackingEta, setTrackingEta] = useState<any>(null);

  // 1. Cargar comercios y verticales desde API
  const fetchComercios = async () => {
    try {
      setLoading(true);

      // Cargar verticales activas
      try {
        const resVert = await fetch(`${API_BASE}/catalog/tipos-comercio`);
        if (resVert.ok) {
          const dataVert = await resVert.json();
          if (dataVert.success && Array.isArray(dataVert.data)) {
            setVerticales([
              { id: 'todos', nombre: 'Todos los Locales', icono: '🌟', tipo_layout: 'restaurante' },
              ...dataVert.data
            ]);
          }
        }
      } catch (errVert) {
        console.warn('Error al cargar tipos de comercio:', errVert);
      }

      const res = await fetch(`${API_BASE}/catalog/comercios`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const mapped = data.data.map((c: any) => ({
            ...c,
            canton: c.direccion.toLowerCase().includes('babahoyo') ? 'Babahoyo' : 'Baba',
          }));
          setComercios(mapped);
          if (!comercioActivo && mapped.length > 0) {
            setComercioActivo(mapped[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Error al cargar comercios de API, usando respaldo local:', err);
      // Fallback local oficial
      const fallbackComercios: Comercio[] = [
        {
          id: '55555555-5555-5555-5555-555555555555',
          nombre_comercial: 'Picantería El Buen Sabor - Baba Centro',
          descripcion: 'Comida criolla típica, secos y asados en el corazón de Baba.',
          direccion: 'Calle Bolívar y Sucre, Barrio San Antonio, Baba',
          is_abierto: true,
          telefono: '+593987654321',
          categoria: 'Comida Criolla',
          tiempo_entrega_promedio: 30,
          costo_base_envio: 1.25,
          calificacion: 4.9,
          canton: 'Baba',
          tipo_comercio_id: 'restaurante',
          tipo_comercio_nombre: 'Restaurante',
          tipo_comercio_icono: '🍔',
          tipo_layout: 'restaurante',
        },
        {
          id: '77777777-7777-7777-7777-777777777777',
          nombre_comercial: 'Restaurante El Gran Chef Babahoyo',
          descripcion: 'Gastronomía de mariscos y cortes finos en Babahoyo.',
          direccion: 'Av. 9 de Octubre y Pedro Carbo, Babahoyo',
          is_abierto: true,
          telefono: '+593998877665',
          categoria: 'Mariscos y Carnes',
          tiempo_entrega_promedio: 35,
          costo_base_envio: 1.50,
          calificacion: 4.8,
          canton: 'Babahoyo',
          tipo_comercio_id: 'restaurante',
          tipo_comercio_nombre: 'Restaurante',
          tipo_comercio_icono: '🍔',
          tipo_layout: 'restaurante',
        }
      ];
      setComercios(fallbackComercios);
      if (!comercioActivo) setComercioActivo(fallbackComercios[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComercios();
  }, []);

  // 2. Cargar menú cuando se selecciona un comercio
  const abrirMenuComercio = async (comercio: Comercio) => {
    setComercioActivo(comercio);
    setMenuCategoriaFiltro('todas');
    setMenuSearch('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/catalog/comercio/${comercio.id}/productos`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const parsedProducts = data.data.map((p: any) => ({
            ...p,
            precio: parseFloat(p.precio) || 0,
            categoria: p.categoria_nombre || p.categoria || 'Especialidades',
            categoria_id: p.categoria_id,
            categoria_nombre: p.categoria_nombre || p.categoria || 'Especialidades',
            categoria_icono: p.categoria_icono || '🏷️',
            unidad_medida: p.unidad_medida || 'unidad',
            maneja_stock: Boolean(p.maneja_stock),
            stock_disponible: p.stock_disponible !== null && p.stock_disponible !== undefined ? Number(p.stock_disponible) : null,
            requiere_receta: Boolean(p.requiere_receta),
            is_disponible: p.is_disponible !== false,
          }));
          setProductos(parsedProducts);
          setVista('menu');
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }
    } catch (err) {
      console.warn('Error al cargar productos del API:', err);
    } finally {
      setLoading(false);
    }

    // Fallback de menú criollo de Baba
    setProductos([
      { id: '66666666-6666-6666-6666-666666666601', nombre: 'Seco de gallina criolla Baba', descripcion: 'Preparado con chicha tradicional y hierbitas frescas, arroz y maduro.', precio: 4.50, categoria: 'Platos Fuertes', categoria_nombre: 'Platos Fuertes', categoria_icono: '🍲', unidad_medida: 'unidad', maneja_stock: false, stock_disponible: null, is_disponible: true },
      { id: '66666666-6666-6666-6666-666666666602', nombre: 'Bolón mixto con queso y chicharrón', descripcion: 'Plátano verde majado con queso manaba y chicharrón crocante.', precio: 3.75, categoria: 'Desayunos', categoria_nombre: 'Desayunos', categoria_icono: '☕', unidad_medida: 'unidad', maneja_stock: false, stock_disponible: null, is_disponible: true },
      { id: '66666666-6666-6666-6666-666666666603', nombre: 'Seco de pollo de campo', descripcion: 'Guiso tierno con arroz amarillo, ensalada criolla y plátano maduro.', precio: 5.25, categoria: 'Platos Fuertes', categoria_nombre: 'Platos Fuertes', categoria_icono: '🍲', unidad_medida: 'unidad', maneja_stock: false, stock_disponible: null, is_disponible: true },
      { id: '66666666-6666-6666-6666-666666666604', nombre: 'Arroz con menestra y carne asada', descripcion: 'Carne al carbón con menestra de lenteja casera.', precio: 6.50, categoria: 'Platos Fuertes', categoria_nombre: 'Platos Fuertes', categoria_icono: '🍲', unidad_medida: 'unidad', maneja_stock: false, stock_disponible: null, is_disponible: true },
      { id: '66666666-6666-6666-6666-666666666605', nombre: 'Jugo natural de maracuyá', descripcion: 'Fruta fresca de los huertos de Los Ríos.', precio: 1.50, categoria: 'Bebidas', categoria_nombre: 'Bebidas', categoria_icono: '🥤', unidad_medida: 'vaso', maneja_stock: false, stock_disponible: null, is_disponible: true },
      { id: '66666666-6666-6666-6666-666666666606', nombre: 'Patacones con queso criollo', descripcion: 'Porción de patacones crocantes con queso fresco de Baba.', precio: 2.00, categoria: 'Acompañamientos', categoria_nombre: 'Acompañamientos', categoria_icono: '🍟', unidad_medida: 'porción', maneja_stock: false, stock_disponible: null, is_disponible: true },
    ]);
    setVista('menu');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Gestión de Carrito con Aislamiento Multitienda y Control Opcional de Stock
  const agregarAlCarrito = (producto: Producto) => {
    if (!comercioActivo) return;

    if (carrito.length > 0 && comercioCarrito && comercioCarrito.id !== comercioActivo.id) {
      setPendingAddProduct(producto);
      setShowSwitchStoreModal(true);
      return;
    }

    // Validación opcional de stock (solo si el producto tiene maneja_stock = true)
    if (producto.maneja_stock && producto.stock_disponible !== null && producto.stock_disponible !== undefined) {
      const existe = carrito.find(item => item.producto.id === producto.id);
      const cantidadEnCarrito = existe ? existe.cantidad : 0;
      if (cantidadEnCarrito >= producto.stock_disponible) {
        alert(`Lo sentimos, solo quedan ${producto.stock_disponible} unidades disponibles de este producto.`);
        return;
      }
    }

    setComercioCarrito(comercioActivo);
    setCarrito(prev => {
      const existe = prev.find(item => item.producto.id === producto.id);
      if (existe) {
        return prev.map(item =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  };

  const confirmarCambioDeRestaurante = () => {
    if (pendingAddProduct && comercioActivo) {
      setCarrito([{ producto: pendingAddProduct, cantidad: 1 }]);
      setComercioCarrito(comercioActivo);
      setPendingAddProduct(null);
      setShowSwitchStoreModal(false);
    }
  };

  const modificarCantidad = (productoId: string, delta: number) => {
    setCarrito(prev => {
      const itemExistente = prev.find(it => it.producto.id === productoId);
      if (itemExistente && delta > 0) {
        const prod = itemExistente.producto;
        if (prod.maneja_stock && prod.stock_disponible !== null && prod.stock_disponible !== undefined) {
          if (itemExistente.cantidad >= prod.stock_disponible) {
            alert(`Stock máximo alcanzado (${prod.stock_disponible} unidades disponibles).`);
            return prev;
          }
        }
      }

      const next = prev
        .map(item => {
          if (item.producto.id === productoId) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0 ? { ...item, cantidad: nuevaCantidad } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
      
      if (next.length === 0) {
        setComercioCarrito(null);
      }
      return next;
    });
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    setComercioCarrito(null);
  };

  const storeActivoParaPedido = comercioCarrito || comercioActivo;
  const totalItemsCount = carrito.reduce((acc, item) => acc + item.cantidad, 0);
  const subtotalCents = carrito.reduce((acc, item) => acc + Math.round(Number(item.producto.precio || 0) * 100) * item.cantidad, 0);
  const subtotal = subtotalCents / 100;
  const costoEnvio = storeActivoParaPedido?.canton === 'Babahoyo' ? 1.50 : 1.25;
  const total = subtotal + (carrito.length > 0 ? costoEnvio : 0);

  // Gestión de Perfil de Usuario
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUser) return;
    setProfileLoading(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const body: any = {
        nombre: profileName.trim(),
        telefono: profilePhone.trim(),
      };
      if (profilePassword && profilePassword.trim().length > 0) {
        body.password = profilePassword.trim();
      }

      const res = await fetch(`${API_BASE}/users/${customerUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudieron actualizar los datos');
      }

      const updatedUser = {
        ...customerUser,
        name: data.data.nombre,
        phone: data.data.telefono,
      };
      setCustomerUser(updatedUser);
      localStorage.setItem('delivery_customer_user', JSON.stringify(updatedUser));
      setClienteNombre(updatedUser.name);
      setClienteTelefono(updatedUser.phone || '');
      setProfilePassword('');
      setProfileSuccess('¡Tus datos han sido actualizados con éxito!');
    } catch (err: any) {
      setProfileError(err.message || 'Error al guardar los datos.');
    } finally {
      setProfileLoading(false);
    }
  };

  // Gestión de Direcciones Guardadas
  const handleSaveDireccion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUser || !newDireccion.trim()) return;
    setSavingAddress(true);

    try {
      const coords = newCanton === 'Babahoyo' ? { lat: -1.8022, lon: -79.5344 } : { lat: -1.7917, lon: -79.6783 };
      const res = await fetch(`${API_BASE}/users/${customerUser.id}/direcciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alias: newAlias.trim(),
          canton: newCanton,
          direccion: newDireccion.trim(),
          referencia: newReferencia.trim(),
          lat: coords.lat,
          lon: coords.lon,
          es_principal: newEsPrincipal,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await fetchDirecciones(customerUser.id);
        setNewDireccion('');
        setNewReferencia('');
      }
    } catch (err) {
      console.warn('Error al guardar dirección:', err);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteDireccion = async (dirId: string) => {
    if (!customerUser) return;
    try {
      await fetch(`${API_BASE}/users/${customerUser.id}/direcciones/${dirId}`, { method: 'DELETE' });
      await fetchDirecciones(customerUser.id);
    } catch (err) {
      console.warn('Error al eliminar dirección:', err);
    }
  };

  const handleSetPrincipalDireccion = async (dirId: string) => {
    if (!customerUser) return;
    try {
      await fetch(`${API_BASE}/users/${customerUser.id}/direcciones/${dirId}/principal`, { method: 'PATCH' });
      await fetchDirecciones(customerUser.id);
    } catch (err) {
      console.warn('Error al marcar dirección principal:', err);
    }
  };

  // Recarga de Billetera Virtual
  const handleRechargeWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUser || rechargeAmount <= 0) return;
    setRechargeLoading(true);
    setRechargeSuccess('');

    try {
      const res = await fetch(`${API_BASE}/users/${customerUser.id}/recargar-billetera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: rechargeAmount,
          metodo: rechargeMetodo,
          referencia: rechargeReferencia || `TRANSF-${Date.now().toString().slice(-6)}`,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRechargeSuccess(`¡Recarga exitosa! Se han acreditado $${Number(rechargeAmount).toFixed(2)} a tu Billetera.`);
        await fetchWallet(customerUser.id);
        setRechargeReferencia('');
      }
    } catch (err) {
      console.warn('Error al recargar billetera:', err);
    } finally {
      setRechargeLoading(false);
    }
  };

  // Enviar Pedido a Cocina o Picking en Vivo
  const handleConfirmarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    if (!customerUser) {
      setShowAuthModal(true);
      return;
    }

    const targetComercio = comercioCarrito || comercioActivo;
    const esLicorera = targetComercio?.tipo_comercio_id === 'licorera';
    const tieneProductosReceta = carrito.some(it => it.producto.requiere_receta);

    if (esLicorera && !confirmaMayorEdad) {
      setOrderError('Debes certificar que eres mayor de 18 años para comprar bebidas alcohólicas.');
      return;
    }

    if (tieneProductosReceta && !recetaAdjunta) {
      setOrderError('Tu pedido contiene medicamentos que requieren receta médica obligatoria. Por favor adjunta la prescripción.');
      return;
    }

    try {
      setSubmittingOrder(true);
      setOrderError('');

      const payload = {
        clienteId: customerUser.id,
        comercioId: targetComercio?.id || '55555555-5555-5555-5555-555555555555',
        items: carrito.map(item => ({
          id: item.producto.id,
          cantidad: item.cantidad,
          precio: item.producto.precio,
        })),
        direccionEntrega,
        metodoPago,
        latEntrega: coordsEntrega.lat,
        lonEntrega: coordsEntrega.lon,
        costoEnvio,
        politicaSustitucion: targetComercio?.tipo_layout === 'grid_ecommerce' ? politicaSustitucion : undefined,
        recetaAdjunta: tieneProductosReceta ? recetaAdjunta : undefined,
      };

      const res = await fetch(`${API_BASE}/orders/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setPedidoConfirmado(data.pedido);
        setTrackingEta({
          distanciaMetros: 505,
          etaMinutos: 15,
          estado: 'en_preparacion',
          repartidor: 'Carlos Repartidor - Moto Baba 01',
        });
        setCarrito([]);
        setComercioCarrito(null);
        if (customerUser?.id) {
          fetchWallet(customerUser.id);
          fetchCustomerOrders(customerUser.id);
        }
        setVista('tracking');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setOrderError(data.error || data.message || 'Error al procesar el pedido con el restaurante');
      }
    } catch (err: any) {
      // Si el backend no responde, simular comanda exitosa para pruebas de interfaz
      setPedidoConfirmado({
        id: `ord-baba-${Date.now().toString().slice(-6)}`,
        estado: 'en_preparacion',
        total: total.toFixed(2),
        subtotal: subtotal.toFixed(2),
        costo_envio: costoEnvio.toFixed(2),
        direccion_entrega: direccionEntrega,
      });
      setTrackingEta({
        distanciaMetros: 505,
        etaMinutos: 15,
        estado: 'en_preparacion',
        repartidor: 'Carlos Repartidor - Moto Baba 01',
      });
      setCarrito([]);
      setComercioCarrito(null);
      setVista('tracking');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const comerciosFiltrados = comercios.filter(c => {
    const matchCiudad = ciudadFiltro === 'Todas' || c.canton === ciudadFiltro;
    const matchVertical = verticalFiltro === 'todos' || c.tipo_comercio_id === verticalFiltro || (!c.tipo_comercio_id && verticalFiltro === 'restaurante');
    return matchCiudad && matchVertical;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#1e293b', background: '#f8fafc', fontFamily: 'sans-serif' }}>
      
      {/* 1. Header Global con Navegación y Enlaces a Paneles */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '14px 32px',
        borderBottom: '1px solid #e2e8f0',
        background: '#fff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }} onClick={() => setVista('home')}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #e11d48, #be123c)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '900',
            fontSize: '22px',
            boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
          }}>
            D
          </div>
          <div>
            <span style={{ fontSize: '24px', fontWeight: '900', color: '#0f172a', letterSpacing: '-0.5px' }}>
              Delivery<span style={{ color: '#e11d48' }}>Ya</span>
            </span>
            <span style={{ display: 'block', fontSize: '11px', color: '#64748b', fontWeight: '600' }}>
              Los Ríos · Baba & Babahoyo
            </span>
          </div>
        </div>

        {/* Selector Rápido de Ubicación */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 14px', borderRadius: '10px' }}>
          <MapPin size={16} color="#e11d48" />
          <span style={{ fontSize: '12px', color: '#64748b' }}>Entregar en:</span>
          <select
            value={direccionEntrega}
            onChange={(e) => {
              const preset = ADDRESS_PRESETS.find(p => p.direccion === e.target.value);
              if (preset) {
                setDireccionEntrega(preset.direccion);
                setCoordsEntrega({ lat: preset.lat, lon: preset.lon });
                setCiudadFiltro(preset.canton as any);
              }
            }}
            style={{
              background: 'transparent',
              border: 'none',
              fontWeight: '700',
              fontSize: '13px',
              color: '#0f172a',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {ADDRESS_PRESETS.map((p, idx) => (
              <option key={idx} value={p.direccion}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* Acciones & Enlaces a Otros Paneles del Proyecto */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => {
              setAfiliacionSuccess(false);
              setAfiliacionError('');
              setAfiliacionPaso(1);
              setShowAfiliacionModal(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fff',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              padding: '8px 14px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <Store size={15} color="#e11d48" />
            <span>¿Tienes un restaurante? <strong style={{ color: '#e11d48' }}>Afíliate</strong></span>
          </button>

          <button
            onClick={() => setDrawerCarritoAbierto(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: '#ffe4e6',
              color: '#e11d48',
              border: '1px solid #fecdd3',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <ShoppingBag size={18} />
            <span>Carrito ({totalItemsCount})</span>
            {totalItemsCount > 0 && <span>· ${subtotal.toFixed(2)}</span>}
          </button>

          {customerUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Píldora de Billetera Virtual */}
              <button
                onClick={() => {
                  setProfileTab('billetera');
                  setShowProfileModal(true);
                }}
                title="Ver saldo y movimientos de Billetera"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  color: '#065f46',
                  padding: '7px 12px',
                  borderRadius: '10px',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <Wallet size={15} color="#059669" />
                <span>${walletBalance.toFixed(2)}</span>
              </button>

              {/* Píldora de Perfil de Usuario */}
              <button
                onClick={() => {
                  setProfileTab('datos');
                  setShowProfileModal(true);
                }}
                title="Gestionar mi perfil, direcciones y pedidos"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#f1f5f9',
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: '#0f172a',
                  cursor: 'pointer',
                }}
              >
                <UserCheck size={16} color="#10b981" />
                <span>{customerUser.name.split(' ')[0]}</span>
                <Settings size={13} color="#64748b" />
              </button>

              {/* Botón Salir */}
              <button
                onClick={handleLogoutCustomer}
                title="Cerrar sesión"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: 'none',
                  background: '#fee2e2',
                  color: '#e11d48',
                  padding: '7px 10px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '700',
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
                setShowAuthModal(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: '#fff',
                background: '#0f172a',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                padding: '9px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              <User size={15} color="#38bdf8" /> Iniciar Sesión / Registro
            </button>
          )}
        </div>
      </header>

      {/* 2. Vista Principal: Tienda y Restaurantes */}
      {vista === 'home' && (
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>
          
          {/* Banner Hero */}
          <div style={{
            background: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 50%, #ffffff 100%)',
            borderRadius: '24px',
            padding: '40px',
            marginBottom: '36px',
            border: '1px solid #fecdd3',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ maxWidth: '650px' }}>
              <span style={{
                background: '#e11d48',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '800',
                padding: '4px 10px',
                borderRadius: '6px',
                letterSpacing: '0.5px'
              }}>
                PILOTO OFICIAL BABA · LOS RÍOS
              </span>
              <h1 style={{ fontSize: '38px', fontWeight: '900', color: '#0f172a', margin: '14px 0 10px 0', lineHeight: 1.15 }}>
                Pide comida típica, secos y asados a domicilio en <span style={{ color: '#e11d48' }}>Baba</span>
              </h1>
              <p style={{ color: '#475569', fontSize: '15px', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                Tu pedido llega directo a tu casa con entrega en moto, pago en efectivo o transferencia y seguimiento por GPS en tiempo real.
              </p>

              {/* Filtro por Cantón */}
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['Todas', 'Baba', 'Babahoyo'] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setCiudadFiltro(c)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '10px',
                      border: '1px solid',
                      borderColor: ciudadFiltro === c ? '#e11d48' : '#cbd5e1',
                      background: ciudadFiltro === c ? '#e11d48' : '#fff',
                      color: ciudadFiltro === c ? '#fff' : '#475569',
                      fontWeight: '700',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    📍 {c === 'Todas' ? 'Ver Todos' : `Cantón ${c}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ textAlign: 'center', padding: '20px', background: '#fff', borderRadius: '20px', boxShadow: '0 10px 25px rgba(225, 29, 72, 0.08)' }}>
              <div style={{ fontSize: '50px', marginBottom: '8px' }}>🍲 🍗 🥤</div>
              <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '16px' }}>Picantería El Buen Sabor</div>
              <div style={{ color: '#10b981', fontSize: '12px', fontWeight: '700', marginTop: '2px' }}>● Abierto para despacho</div>
              <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Tarifa de envío: $1.25 en Baba</div>
            </div>
          </div>

          {/* Selector de Verticales de Negocio (Multi-Vertical) */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px', WebkitOverflowScrolling: 'touch' }}>
              {verticales.map(v => {
                const count = v.id === 'todos' 
                  ? comercios.filter(c => ciudadFiltro === 'Todas' || c.canton === ciudadFiltro).length
                  : comercios.filter(c => (ciudadFiltro === 'Todas' || c.canton === ciudadFiltro) && (c.tipo_comercio_id === v.id || (!c.tipo_comercio_id && v.id === 'restaurante'))).length;
                const isSelected = verticalFiltro === v.id;

                return (
                  <button
                    key={v.id}
                    onClick={() => setVerticalFiltro(v.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 18px',
                      borderRadius: '12px',
                      border: isSelected ? '2px solid #e11d48' : '1px solid #e2e8f0',
                      background: isSelected ? '#fff1f2' : '#fff',
                      color: isSelected ? '#e11d48' : '#334155',
                      fontWeight: isSelected ? '800' : '600',
                      fontSize: '13px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      boxShadow: isSelected ? '0 2px 8px rgba(225, 29, 72, 0.12)' : '0 1px 2px rgba(0,0,0,0.03)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{v.icono}</span>
                    <span>{v.nombre}</span>
                    <span style={{
                      background: isSelected ? '#e11d48' : '#f1f5f9',
                      color: isSelected ? '#fff' : '#64748b',
                      fontSize: '11px',
                      padding: '2px 7px',
                      borderRadius: '20px',
                      fontWeight: '700'
                    }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Listado de Locales Disponibles */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                {verticalFiltro === 'todos' ? 'Locales y Comercios' : verticales.find(v => v.id === verticalFiltro)?.nombre || 'Locales'} en {ciudadFiltro === 'Todas' ? 'Los Ríos' : `Cantón ${ciudadFiltro}`}
              </h2>
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0 0' }}>
                {verticalFiltro === 'restaurante' || verticalFiltro === 'todos' 
                  ? 'Pide comida preparada, platos típicos, secos y asados con despacho veloz.' 
                  : 'Abastecimiento de víveres, medicinas y productos de retail entregados en minutos.'}
              </p>
            </div>
            <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>
              {comerciosFiltrados.length} local(es) disponible(s)
            </span>
          </div>

          {comerciosFiltrados.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: '18px', border: '1px dashed #cbd5e1', padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '42px', marginBottom: '10px' }}>🏪</div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                No encontramos locales en este momento
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '420px', margin: '0 auto 18px auto' }}>
                No hay comercios registrados en esta categoría o cantón con despacho inmediato.
              </p>
              <button
                onClick={() => { setVerticalFiltro('todos'); setCiudadFiltro('Todas'); }}
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Ver todos los locales
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
              {comerciosFiltrados.map((c) => (
                <div
                  key={c.id}
                  onClick={() => abrirMenuComercio(c)}
                  style={{
                    background: '#fff',
                    borderRadius: '18px',
                    border: '1px solid #e2e8f0',
                    padding: '24px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{
                        background: '#ecfdf5',
                        color: '#059669',
                        fontSize: '11px',
                        fontWeight: '800',
                        padding: '3px 8px',
                        borderRadius: '6px',
                      }}>
                        ● ABIERTO AHORA
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{
                          background: '#fff1f2',
                          color: '#e11d48',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}>
                          {c.tipo_comercio_icono || '🏪'} {c.tipo_comercio_nombre || c.categoria}
                        </span>
                        <span style={{
                          background: '#f1f5f9',
                          color: '#475569',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}>
                          {c.canton?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                      {c.nombre_comercial}
                    </h3>
                    <p style={{ color: '#64748b', fontSize: '13px', lineHeight: 1.4, margin: '0 0 16px 0' }}>
                      {c.descripcion}
                    </p>
                  </div>

                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#64748b' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} color="#e11d48" /> {c.tiempo_entrega_promedio} min
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Bike size={14} color="#10b981" /> Envío ${Number(c.costo_base_envio).toFixed(2)}
                      </span>
                    </div>
                    <span style={{
                      background: '#e11d48',
                      color: '#fff',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {c.tipo_layout === 'grid_ecommerce' ? 'Ver Tienda' : 'Ver Menú'} <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* 3. Vista Menú o Catálogo del Comercio */}
      {vista === 'menu' && comercioActivo && (
        <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>
          
          <button
            onClick={() => setVista('home')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#e11d48',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            <ChevronLeft size={18} /> Volver a locales
          </button>

          {/* Cabecera del Comercio */}
          <div style={{ background: '#fff', padding: '28px', borderRadius: '20px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ background: '#ffe4e6', color: '#e11d48', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px' }}>
                    {comercioActivo.tipo_comercio_icono || '🏪'} {comercioActivo.tipo_comercio_nombre || comercioActivo.categoria} · {comercioActivo.canton || 'Baba'}
                  </span>
                  <span style={{
                    background: comercioActivo.tipo_layout === 'grid_ecommerce' ? '#eff6ff' : '#fef3c7',
                    color: comercioActivo.tipo_layout === 'grid_ecommerce' ? '#1d4ed8' : '#b45309',
                    fontSize: '11px',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '6px'
                  }}>
                    {comercioActivo.tipo_layout === 'grid_ecommerce' ? '🛍️ Retail & Despensa' : '🍳 Cocina & Comanda'}
                  </span>
                </div>
                <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', margin: '4px 0 6px 0' }}>
                  {comercioActivo.nombre_comercial}
                </h1>
                <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px 0', maxWidth: '650px' }}>
                  {comercioActivo.descripcion || ''}
                </p>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#475569', flexWrap: 'wrap' }}>
                  <span>📍 {comercioActivo.direccion || 'Baba'}</span>
                  <span>🕒 ~{comercioActivo.tiempo_entrega_promedio || 30} min</span>
                  <span>🛵 Flete base: ${Number(comercioActivo.costo_base_envio || 1.25).toFixed(2)}</span>
                </div>
              </div>

              {carrito.length > 0 && (
                <button
                  onClick={() => setVista('checkout')}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <ShoppingBag size={18} /> Ir a Pagar (${total.toFixed(2)}) 🚀
                </button>
              )}
            </div>
          </div>

          {/* Barra de Búsqueda y Filtros de Categorías dentro del Comercio */}
          <div style={{ background: '#fff', padding: '16px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', background: '#f8fafc', padding: '8px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder={`Buscar en ${comercioActivo.nombre_comercial}...`}
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '13px', color: '#1e293b' }}
                />
                {menuSearch && (
                  <button onClick={() => setMenuSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Chips de Categorías */}
            {(() => {
              const categoriasUnicas = ['todas', ...Array.from(new Set(productos.map(p => p.categoria_nombre || p.categoria).filter(Boolean)))];
              return (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', WebkitOverflowScrolling: 'touch' }}>
                  {categoriasUnicas.map(cat => {
                    const isSelected = menuCategoriaFiltro === cat;
                    const count = cat === 'todas' ? productos.length : productos.filter(p => (p.categoria_nombre || p.categoria) === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setMenuCategoriaFiltro(cat)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          border: isSelected ? '1px solid #e11d48' : '1px solid #e2e8f0',
                          background: isSelected ? '#e11d48' : '#f8fafc',
                          color: isSelected ? '#fff' : '#475569',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span>{cat === 'todas' ? '🏷️ Todas las Categorías' : cat}</span>
                        <span style={{
                          background: isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0',
                          color: isSelected ? '#fff' : '#64748b',
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '10px'
                        }}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Listado de Productos (Adaptativo según tipo_layout: 'grid_ecommerce' vs 'restaurante') */}
          {(() => {
            const prodsFiltrados = productos.filter(p => {
              const catName = p.categoria_nombre || p.categoria;
              const matchCat = menuCategoriaFiltro === 'todas' || catName === menuCategoriaFiltro;
              const q = menuSearch.trim().toLowerCase();
              const matchSearch = !q || p.nombre.toLowerCase().includes(q) || (p.descripcion && p.descripcion.toLowerCase().includes(q));
              return matchCat && matchSearch;
            });

            if (prodsFiltrados.length === 0) {
              return (
                <div style={{ background: '#fff', borderRadius: '16px', border: '1px dashed #cbd5e1', padding: '40px', textAlign: 'center' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔍</div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '800', color: '#0f172a' }}>No encontramos productos</h4>
                  <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>Intenta buscando otro término o seleccionando otra categoría.</p>
                </div>
              );
            }

            const isRetailLayout = comercioActivo.tipo_layout === 'grid_ecommerce';

            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isRetailLayout ? 'repeat(auto-fill, minmax(230px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
              }}>
                {prodsFiltrados.map(prod => {
                  const itemCarrito = carrito.find(it => it.producto.id === prod.id);
                  const cantidad = itemCarrito?.cantidad || 0;
                  const isAgotado = prod.maneja_stock && prod.stock_disponible !== null && prod.stock_disponible <= 0;

                  return (
                    <div
                      key={prod.id}
                      style={{
                        background: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        padding: isRetailLayout ? '16px' : '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        opacity: isAgotado ? 0.6 : 1,
                        position: 'relative'
                      }}
                    >
                      <div>
                        {/* Header de la tarjeta de producto */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
                            {prod.categoria_icono || '🏷️'} {prod.categoria_nombre || prod.categoria || 'General'}
                          </span>
                          {prod.requiere_receta && (
                            <span style={{ background: '#fee2e2', color: '#dc2626', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '4px' }}>
                              💊 Receta
                            </span>
                          )}
                        </div>

                        <h3 style={{ fontSize: isRetailLayout ? '15px' : '16px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                          {prod.nombre}
                        </h3>

                        <p style={{ color: '#64748b', fontSize: '12px', lineHeight: 1.4, margin: '0 0 12px 0' }}>
                          {prod.descripcion}
                        </p>

                        {/* Control Opcional de Stock: Solo se muestra si maneja_stock = true */}
                        {prod.maneja_stock && (
                          <div style={{ marginBottom: '10px' }}>
                            {isAgotado ? (
                              <span style={{ background: '#f1f5f9', color: '#dc2626', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                                ❌ Agotado
                              </span>
                            ) : prod.stock_disponible !== null && prod.stock_disponible <= 5 ? (
                              <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: '800', padding: '2px 8px', borderRadius: '4px' }}>
                                ⚡ ¡Solo {prod.stock_disponible} disponibles!
                              </span>
                            ) : prod.stock_disponible !== null ? (
                              <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '4px' }}>
                                📦 Stock: {prod.stock_disponible}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {/* Footer con Precio, Unidad de Medida y Stepper de Carrito */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '12px', marginTop: '4px' }}>
                        <div>
                          <div style={{ fontSize: '18px', fontWeight: '900', color: '#e11d48', lineHeight: 1 }}>
                            ${Number(prod.precio || 0).toFixed(2)}
                          </div>
                          {prod.unidad_medida && prod.unidad_medida !== 'unidad' && (
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>
                              / {prod.unidad_medida}
                            </span>
                          )}
                        </div>

                        {isAgotado ? (
                          <button
                            disabled
                            style={{
                              background: '#f1f5f9',
                              color: '#94a3b8',
                              border: '1px solid #e2e8f0',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'not-allowed'
                            }}
                          >
                            Sin Stock
                          </button>
                        ) : cantidad > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => modificarCantidad(prod.id, -1)}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#f8fafc',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Minus size={13} />
                            </button>
                            <span style={{ fontWeight: '800', fontSize: '13px', minWidth: '18px', textAlign: 'center' }}>
                              {cantidad}
                            </span>
                            <button
                              onClick={() => modificarCantidad(prod.id, 1)}
                              style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                border: 'none',
                                background: '#e11d48',
                                color: '#fff',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => agregarAlCarrito(prod)}
                            style={{
                              background: '#ffe4e6',
                              color: '#e11d48',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '8px',
                              fontWeight: '700',
                              fontSize: '13px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={14} /> Agregar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Barra Flotante Sticky de Canasta / Carrito (Especial para Retail y Móvil) */}
          {carrito.length > 0 && (
            <div style={{
              position: 'fixed',
              bottom: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 48px)',
              maxWidth: '680px',
              background: '#0f172a',
              color: '#fff',
              borderRadius: '18px',
              padding: '14px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              zIndex: 900,
              backdropFilter: 'blur(10px)',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  background: '#e11d48',
                  color: '#fff',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  fontWeight: '900',
                  fontSize: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <ShoppingBag size={18} />
                  <span>{totalItemsCount}</span>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Canasta {comercioActivo?.nombre_comercial}
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: '900', color: '#fff' }}>
                    ${total.toFixed(2)} USD
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setDrawerCarritoAbierto(true)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  Ver Ítems
                </button>
                <button
                  type="button"
                  onClick={() => setVista('checkout')}
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  Ir a Pagar ➔
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {/* 4. Vista Checkout Web */}
      {vista === 'checkout' && (
        <main style={{ maxWidth: '850px', margin: '0 auto', padding: '32px 24px', width: '100%', boxSizing: 'border-box' }}>
          
          <button
            onClick={() => setVista('menu')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#e11d48',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              marginBottom: '16px',
            }}
          >
            <ChevronLeft size={18} /> Volver al menú
          </button>

          <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#0f172a', marginBottom: '8px' }}>
            Finalizar Pedido y Datos de Entrega
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 24px 0' }}>
            El restaurante {comercioActivo?.nombre_comercial} recibirá tu comanda en su pantalla Kanban de inmediato.
          </p>

          {/* Banner de Identificación de Cliente */}
          {!customerUser ? (
            <div style={{
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              borderRadius: '16px',
              padding: '16px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: '#1e3a8a' }}>
                  Identifícate para procesar tu orden
                </div>
                <div style={{ fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
                  Inicia sesión o regístrate en 30 segundos. Tu carrito de compras está completamente seguro.
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                  setShowAuthModal(true);
                }}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Iniciar Sesión / Registro
              </button>
            </div>
          ) : (
            <div style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '16px',
              padding: '14px 20px',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <UserCheck size={20} color="#16a34a" />
              <div>
                <span style={{ fontSize: '13px', color: '#166534' }}>
                  Pedido a nombre de: <strong style={{ color: '#14532d' }}>{customerUser.name}</strong> ({customerUser.email}) · Tel: {customerUser.phone || clienteTelefono}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleConfirmarPedido} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px' }}>
            
            {/* Columna Izquierda: Datos del Cliente y Dirección */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div style={{ background: '#fff', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px 0', color: '#0f172a' }}>
                  1. Punto de Entrega en Los Ríos
                </h3>

                {/* Ubicaciones Guardadas del Usuario */}
                {direcciones.length > 0 && (
                  <div style={{ marginBottom: '14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#475569', display: 'block', marginBottom: '6px' }}>
                      Tus Ubicaciones Guardadas:
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {direcciones.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => {
                            setDireccionEntrega(d.direccion);
                            setCoordsEntrega({ lat: Number(d.lat), lon: Number(d.lon) });
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            border: '1px solid',
                            borderColor: direccionEntrega === d.direccion ? '#e11d48' : '#cbd5e1',
                            background: direccionEntrega === d.direccion ? '#ffe4e6' : '#fff',
                            color: direccionEntrega === d.direccion ? '#e11d48' : '#334155',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <MapPin size={13} color={direccionEntrega === d.direccion ? '#e11d48' : '#64748b'} />
                          <span>{d.alias} ({d.canton})</span>
                          {d.es_principal && (
                            <span style={{ fontSize: '10px', background: '#dcfce7', color: '#166534', padding: '1px 5px', borderRadius: '4px' }}>
                              Principal
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                  {ADDRESS_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setDireccionEntrega(p.direccion);
                        setCoordsEntrega({ lat: p.lat, lon: p.lon });
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: '1px solid',
                        borderColor: direccionEntrega === p.direccion ? '#e11d48' : '#cbd5e1',
                        background: direccionEntrega === p.direccion ? '#ffe4e6' : '#f8fafc',
                        color: direccionEntrega === p.direccion ? '#e11d48' : '#475569',
                        cursor: 'pointer',
                      }}
                    >
                      📍 {p.label}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={2}
                  required
                  value={direccionEntrega}
                  onChange={(e) => setDireccionEntrega(e.target.value)}
                  placeholder="Calle, número de casa, barrio y referencia en Baba..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ background: '#fff', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 14px 0', color: '#0f172a' }}>
                  2. Método de Pago
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: metodoPago === 'efectivo' ? '#e11d48' : '#e2e8f0',
                    background: metodoPago === 'efectivo' ? '#fff1f2' : '#fff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="metodoPago"
                      checked={metodoPago === 'efectivo'}
                      onChange={() => setMetodoPago('efectivo')}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>
                        💵 Efectivo contra entrega
                      </strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Pagas al motorizado al momento de recibir tus alimentos en Baba.
                      </span>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: metodoPago === 'transferencia' ? '#e11d48' : '#e2e8f0',
                    background: metodoPago === 'transferencia' ? '#fff1f2' : '#fff',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="radio"
                      name="metodoPago"
                      checked={metodoPago === 'transferencia'}
                      onChange={() => setMetodoPago('transferencia')}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '14px', color: '#0f172a' }}>
                        📲 Transferencia / DeUna Los Ríos
                      </strong>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        Banco Pichincha, Guayaquil o DeUna sin recargo.
                      </span>
                    </div>
                  </label>

                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    borderRadius: '12px',
                    border: '1px solid',
                    borderColor: metodoPago === 'saldo_virtual' ? '#10b981' : '#e2e8f0',
                    background: metodoPago === 'saldo_virtual' ? '#ecfdf5' : '#fff',
                    cursor: walletBalance >= total ? 'pointer' : 'not-allowed',
                    opacity: walletBalance >= total ? 1 : 0.7,
                  }}>
                    <input
                      type="radio"
                      name="metodoPago"
                      disabled={walletBalance < total}
                      checked={metodoPago === 'saldo_virtual'}
                      onChange={() => setMetodoPago('saldo_virtual')}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '14px', color: '#0f172a' }}>
                          ⚡ Saldo Billetera Virtual (Ledger)
                        </strong>
                        <span style={{
                          fontSize: '12px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: walletBalance >= total ? '#d1fae5' : '#fee2e2',
                          color: walletBalance >= total ? '#065f46' : '#991b1b',
                        }}>
                          Disp: ${walletBalance.toFixed(2)} USD
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                        {walletBalance >= total
                          ? 'Pago instantáneo. Se debitará de tu saldo virtual al confirmar la orden.'
                          : 'Saldo insuficiente para pagar esta comanda. Recarga en tu perfil o usa otro medio.'}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 3. Preferencias de Sustitución en Tienda (Modo Retail / Supermercado / Farmacia) */}
              {(comercioCarrito || comercioActivo)?.tipo_layout === 'grid_ecommerce' && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '18px' }}>🔄</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                      3. Preferencias si se agota algún producto
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
                    El encargado de picking en tienda seguirá tus instrucciones si un artículo no está disponible en la percha:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: politicaSustitucion === 'similar' ? '#10b981' : '#e2e8f0',
                      background: politicaSustitucion === 'similar' ? '#ecfdf5' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="politicaSustitucion"
                        checked={politicaSustitucion === 'similar'}
                        onChange={() => setPoliticaSustitucion('similar')}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          Reemplazar por producto similar (Recomendado)
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          El picker escogerá la mejor alternativa de igual o menor precio sin retrasar tu orden.
                        </span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: politicaSustitucion === 'llamar' ? '#2563eb' : '#e2e8f0',
                      background: politicaSustitucion === 'llamar' ? '#eff6ff' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="politicaSustitucion"
                        checked={politicaSustitucion === 'llamar'}
                        onChange={() => setPoliticaSustitucion('llamar')}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          Llamarme o escribirme por WhatsApp
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          El recolector te contactará antes de realizar cualquier cambio en tu canasta.
                        </span>
                      </div>
                    </label>

                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1px solid',
                      borderColor: politicaSustitucion === 'no_reemplazar' ? '#ef4444' : '#e2e8f0',
                      background: politicaSustitucion === 'no_reemplazar' ? '#fef2f2' : '#fff',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="radio"
                        name="politicaSustitucion"
                        checked={politicaSustitucion === 'no_reemplazar'}
                        onChange={() => setPoliticaSustitucion('no_reemplazar')}
                        style={{ marginTop: '3px' }}
                      />
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          No reemplazar (Cancelar ítem)
                        </strong>
                        <span style={{ fontSize: '12px', color: '#64748b', display: 'block', marginTop: '2px' }}>
                          Se omitirá el ítem de la canasta y no se cobrará el valor de ese producto.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* 4. Validaciones Especiales: Farmacia (Receta Médica) y Licorera (+18 Años) */}
              {carrito.some(it => it.producto.requiere_receta) && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '18px', border: '2px solid #f87171' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>💊</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#991b1b' }}>
                      Receta Médica Obligatoria (ARCSA Ecuador)
                    </h3>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 14px 0' }}>
                    Tu orden incluye medicamentos bajo prescripción médica. Debes adjuntar una foto legible o comprobante de tu receta médica:
                  </p>

                  {recetaAdjunta ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f0fdf4',
                      border: '1px solid #86efac',
                      borderRadius: '12px',
                      padding: '12px 16px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>📄</span>
                        <div>
                          <strong style={{ fontSize: '13px', color: '#166534' }}>Receta médica cargada</strong>
                          <div style={{ fontSize: '11px', color: '#15803d' }}>{recetaAdjunta}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRecetaAdjunta(null)}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                        }}
                      >
                        Quitar / Cambiar
                      </button>
                    </div>
                  ) : (
                    <div>
                      <label style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px dashed #cbd5e1',
                        borderRadius: '12px',
                        padding: '20px',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        transition: 'border-color 0.2s',
                      }}>
                        <span style={{ fontSize: '28px', marginBottom: '6px' }}>📎</span>
                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a' }}>
                          Subir foto o documento de la receta médica
                        </span>
                        <span style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                          PNG, JPG o PDF legible (Máx. 5MB)
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setRecetaAdjunta(file.name);
                            }
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {(comercioCarrito || comercioActivo)?.tipo_comercio_id === 'licorera' && (
                <div style={{ background: '#fff', padding: '20px', borderRadius: '18px', border: '2px solid #fbbf24' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '20px' }}>🔞</span>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#92400e' }}>
                      Control de Mayoría de Edad (+18 Años)
                    </h3>
                  </div>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#451a03',
                    fontWeight: '600',
                  }}>
                    <input
                      type="checkbox"
                      checked={confirmaMayorEdad}
                      onChange={(e) => setConfirmaMayorEdad(e.target.checked)}
                      style={{ marginTop: '3px', width: '16px', height: '16px' }}
                    />
                    <span>
                      Certifico bajo juramento que soy mayor de 18 años y presentaré mi cédula física de identidad original al repartidor al momento de recibir mis bebidas alcohólicas.
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Columna Derecha: Resumen de Comanda */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '18px', border: '1px solid #e2e8f0', height: 'fit-content' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 16px 0', color: '#0f172a' }}>
                Resumen de tu Pedido
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {carrito.map(it => (
                  <div key={it.producto.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#334155' }}>
                      {it.cantidad}x {it.producto.nombre}
                      {it.producto.unidad_medida && it.producto.unidad_medida !== 'unidad' ? (
                        <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '4px' }}>({it.producto.unidad_medida})</span>
                      ) : null}
                    </span>
                    <strong style={{ color: '#0f172a' }}>${(Number(it.producto.precio || 0) * it.cantidad).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal comida:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Tarifa de envío (Baba):</span>
                  <span>${costoEnvio.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '10px', fontSize: '18px', fontWeight: '900', color: '#0f172a' }}>
                  <span>Total:</span>
                  <span style={{ color: '#e11d48' }}>${total.toFixed(2)} USD</span>
                </div>
              </div>

              {orderError && (
                <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px', borderRadius: '8px', fontSize: '12px', marginTop: '12px' }}>
                  {orderError}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingOrder || carrito.length === 0}
                style={{
                  width: '100%',
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  padding: '14px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '15px',
                  cursor: 'pointer',
                  marginTop: '20px',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)'
                }}
              >
                {submittingOrder
                  ? 'Enviando a cocina...'
                  : !customerUser
                  ? 'Identificarse para Confirmar Pedido 🔑'
                  : 'Confirmar Pedido Real 🚀'}
              </button>
            </div>
          </form>
        </main>
      )}

      {/* 5. Vista Tracking / Radar de Pedido en Vivo */}
      {vista === 'tracking' && pedidoConfirmado && (
        <main style={{ maxWidth: '750px', margin: '0 auto', padding: '40px 24px', width: '100%', boxSizing: 'border-box' }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            border: '2px solid #10b981',
            padding: '36px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.1)',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: '#ecfdf5',
              color: '#059669',
              padding: '6px 16px',
              borderRadius: '999px',
              fontWeight: '800',
              fontSize: '13px',
              marginBottom: '16px'
            }}>
              ● PEDIDO TRANSMITIDO A COCINA EN VIVO
            </div>

            <h1 style={{ fontSize: '30px', fontWeight: '900', color: '#0f172a', margin: '0 0 8px 0' }}>
              ¡Comanda #{pedidoConfirmado.id.slice(0, 8)} Confirmada!
            </h1>
            <p style={{ color: '#64748b', fontSize: '15px', margin: '0 0 28px 0' }}>
              Tu pedido ha ingresado a la comanda de {comercioActivo?.nombre_comercial} en Baba.
            </p>

            {/* Stepper de Progreso */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 'bold' }}>✓</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', display: 'block', marginTop: '6px' }}>Recibido</span>
              </div>
              <div style={{ width: '60px', height: '4px', background: '#10b981' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontWeight: 'bold' }}>🍳</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', display: 'block', marginTop: '6px' }}>Preparación</span>
              </div>
              <div style={{ width: '60px', height: '4px', background: '#cbd5e1' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>🛵</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginTop: '6px' }}>En Camino</span>
              </div>
              <div style={{ width: '60px', height: '4px', background: '#cbd5e1' }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#f1f5f9', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>🏠</div>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', display: 'block', marginTop: '6px' }}>Entregado</span>
              </div>
            </div>

            {/* Cuadro de Telemetría OSRM */}
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Repartidor asignado:</span>
                <strong style={{ color: '#0f172a' }}>{trackingEta?.repartidor || 'Carlos Repartidor - Moto Baba 01'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Tiempo estimado (ETA):</span>
                <strong style={{ color: '#059669', fontSize: '15px' }}>~{trackingEta?.etaMinutos || 15} minutos</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Dirección de destino:</span>
                <strong style={{ color: '#0f172a' }}>{direccionEntrega}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>Total a pagar:</span>
                <strong style={{ color: '#e11d48', fontSize: '18px' }}>${pedidoConfirmado.total} USD</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={() => setVista('home')}
                style={{
                  background: '#0f172a',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Volver al Inicio
              </button>

              <button
                onClick={() => {
                  setPedidoConfirmado(null);
                  setVista('home');
                }}
                style={{
                  background: '#ffe4e6',
                  color: '#e11d48',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Hacer otro pedido en Los Ríos
              </button>
            </div>
          </div>
        </main>
      )}

      {/* Drawer Lateral del Carrito */}
      {drawerCarritoAbierto && (
        <div style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <div style={{
            background: '#fff',
            width: '100%',
            maxWidth: '380px',
            height: '100%',
            padding: '24px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '-4px 0 20px rgba(0,0,0,0.1)'
          }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #f1f5f9', pb: '14px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800' }}>Tu Carrito ({totalItemsCount})</h3>
                <button
                  onClick={() => setDrawerCarritoAbierto(false)}
                  style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#94a3b8' }}
                >
                  ✕
                </button>
              </div>

              {carrito.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
                  <p style={{ margin: 0, fontWeight: '600' }}>El carrito está vacío</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {carrito.map(it => (
                    <div key={it.producto.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc', paddingBottom: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                          {it.producto.nombre}
                          {it.producto.unidad_medida && it.producto.unidad_medida !== 'unidad' ? (
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginLeft: '4px' }}>({it.producto.unidad_medida})</span>
                          ) : null}
                        </strong>
                        <div style={{ fontSize: '12px', color: '#e11d48', fontWeight: '700' }}>${Number(it.producto.precio || 0).toFixed(2)} c/u</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button onClick={() => modificarCantidad(it.producto.id, -1)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}>-</button>
                        <span style={{ fontWeight: '800', fontSize: '13px' }}>{it.cantidad}</span>
                        <button onClick={() => modificarCantidad(it.producto.id, 1)} style={{ width: '26px', height: '26px', borderRadius: '6px', border: 'none', background: '#e11d48', color: '#fff', cursor: 'pointer' }}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {carrito.length > 0 && (
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', marginBottom: '16px' }}>
                  <span>Total estimado:</span>
                  <span style={{ color: '#e11d48' }}>${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => {
                    setDrawerCarritoAbierto(false);
                    setVista('checkout');
                  }}
                  style={{
                    width: '100%',
                    background: '#10b981',
                    color: '#fff',
                    border: 'none',
                    padding: '14px',
                    borderRadius: '12px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                >
                  Continuar a Entrega ➔
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Autenticación / Registro de Cliente */}
      {showAuthModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '460px',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            boxSizing: 'border-box',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                  {authMode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
                  {authMode === 'login'
                    ? 'Accede a tu cuenta para confirmar tu pedido en Baba'
                    : 'Regístrate para recibir tus pedidos rápidamente'}
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pestañas Login vs Registro */}
            <div style={{ display: 'flex', gap: '8px', background: '#f1f5f9', padding: '4px', borderRadius: '12px', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: authMode === 'login' ? '#fff' : 'transparent',
                  color: authMode === 'login' ? '#0f172a' : '#64748b',
                  boxShadow: authMode === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Ya tengo cuenta
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                style={{
                  flex: 1,
                  padding: '8px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: authMode === 'register' ? '#fff' : 'transparent',
                  color: authMode === 'register' ? '#0f172a' : '#64748b',
                  boxShadow: authMode === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                Crear cuenta nueva
              </button>
            </div>

            {authError && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '10px 14px',
                borderRadius: '10px',
                marginBottom: '16px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertCircle size={16} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {authMode === 'register' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Ej: Rosa Alvarado"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                      Teléfono / WhatsApp *
                    </label>
                    <input
                      type="text"
                      required
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="+5939..."
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: '1px solid #cbd5e1',
                        fontSize: '14px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                style={{
                  marginTop: '10px',
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: authLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                }}
              >
                {authLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : authMode === 'login' ? (
                  'Ingresar y Continuar con el Pedido'
                ) : (
                  'Registrarme y Continuar con el Pedido'
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Advertencia de Cambio de Restaurante (Aislamiento de Carrito) */}
      {showSwitchStoreModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            maxWidth: '460px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            textAlign: 'center',
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#fff1f2',
              color: '#e11d48',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}>
              <AlertTriangle size={28} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '0 0 10px 0' }}>
              ¿Empezar un nuevo pedido?
            </h3>
            <p style={{ fontSize: '14px', color: '#64748b', lineHeight: 1.5, margin: '0 0 24px 0' }}>
              Ya tienes productos de <strong style={{ color: '#0f172a' }}>{comercioCarrito?.nombre_comercial}</strong> en tu carrito. Cada pedido debe ser del mismo local para garantizar los tiempos de cocina y entrega.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={confirmarCambioDeRestaurante}
                style={{
                  background: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(225, 29, 72, 0.3)'
                }}
              >
                Vaciar carrito y ordenar en {comercioActivo?.nombre_comercial}
              </button>

              <button
                onClick={() => {
                  setPendingAddProduct(null);
                  setShowSwitchStoreModal(false);
                }}
                style={{
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Mantener mi carrito actual
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Central de Perfil, Billetera y Direcciones */}
      {showProfileModal && customerUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999,
          padding: '20px',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#e11d48',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '16px',
                }}>
                  {customerUser.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: '#0f172a' }}>
                    Mi Cuenta Delivery Baba
                  </h3>
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    {customerUser.email}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowProfileModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Pestañas de Navegación del Perfil */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              background: '#fff',
              padding: '0 16px',
              overflowX: 'auto',
            }}>
              {[
                { id: 'datos', label: '👤 Mis Datos' },
                { id: 'direcciones', label: '📍 Mis Ubicaciones' },
                { id: 'billetera', label: '💳 Mi Billetera' },
                { id: 'pedidos', label: '📦 Mis Pedidos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProfileTab(tab.id as any)}
                  style={{
                    padding: '14px 16px',
                    border: 'none',
                    borderBottom: profileTab === tab.id ? '2px solid #e11d48' : '2px solid transparent',
                    background: 'transparent',
                    color: profileTab === tab.id ? '#e11d48' : '#64748b',
                    fontWeight: profileTab === tab.id ? '800' : '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Contenido según pestaña */}
            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              
              {/* TAB 1: DATOS PERSONALES */}
              {profileTab === 'datos' && (
                <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {profileSuccess && (
                    <div style={{ background: '#f0fdf4', color: '#166534', padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid #bbf7d0' }}>
                      {profileSuccess}
                    </div>
                  )}
                  {profileError && (
                    <div style={{ background: '#fef2f2', color: '#991b1b', padding: '12px', borderRadius: '10px', fontSize: '13px', border: '1px solid #fecaca' }}>
                      {profileError}
                    </div>
                  )}

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                      Nombre Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                      Teléfono / WhatsApp de Entrega
                    </label>
                    <input
                      type="text"
                      required
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      placeholder="+5939..."
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                      Nueva Contraseña (Opcional)
                    </label>
                    <input
                      type="password"
                      value={profilePassword}
                      onChange={(e) => setProfilePassword(e.target.value)}
                      placeholder="Dejar en blanco para mantener la actual"
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '14px', boxSizing: 'border-box' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={profileLoading}
                    style={{
                      background: '#e11d48',
                      color: '#fff',
                      border: 'none',
                      padding: '12px',
                      borderRadius: '12px',
                      fontWeight: '800',
                      fontSize: '14px',
                      cursor: profileLoading ? 'not-allowed' : 'pointer',
                      marginTop: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {profileLoading ? <Loader2 size={16} className="animate-spin" /> : 'Guardar Cambios'}
                  </button>
                </form>
              )}

              {/* TAB 2: MIS UBICACIONES GUARDADAS */}
              {profileTab === 'direcciones' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                      Ubicaciones Registradas
                    </h4>
                    
                    {direcciones.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                        No tienes direcciones registradas aún. Agrega una abajo para acelerar tus pedidos en Baba y Babahoyo.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {direcciones.map(d => (
                          <div
                            key={d.id}
                            style={{
                              border: '1px solid #e2e8f0',
                              borderRadius: '14px',
                              padding: '14px 16px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              background: d.es_principal ? '#f0fdf4' : '#fff',
                            }}
                          >
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <strong style={{ fontSize: '14px', color: '#0f172a' }}>{d.alias}</strong>
                                <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                                  {d.canton}
                                </span>
                                {d.es_principal && (
                                  <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontWeight: '800' }}>
                                    Principal
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '13px', color: '#334155' }}>{d.direccion}</div>
                              {d.referencia && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Ref: {d.referencia}</div>}
                            </div>

                            <div style={{ display: 'flex', gap: '6px' }}>
                              {!d.es_principal && (
                                <button
                                  type="button"
                                  onClick={() => handleSetPrincipalDireccion(d.id)}
                                  title="Marcar como Principal"
                                  style={{ background: '#f1f5f9', border: 'none', color: '#475569', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                                >
                                  Principal
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteDireccion(d.id)}
                                title="Eliminar dirección"
                                style={{ background: '#fee2e2', border: 'none', color: '#e11d48', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer' }}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Formulario Agregar Ubicación */}
                  <form onSubmit={handleSaveDireccion} style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      + Agregar Nueva Dirección de Entrega
                    </h5>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                          Alias (Ej: Casa, Trabajo)
                        </label>
                        <input
                          type="text"
                          required
                          value={newAlias}
                          onChange={(e) => setNewAlias(e.target.value)}
                          placeholder="Casa Baba Centro"
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                          Cantón
                        </label>
                        <select
                          value={newCanton}
                          onChange={(e) => setNewCanton(e.target.value)}
                          style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box', background: '#fff' }}
                        >
                          <option value="Baba">Baba (Sede Principal)</option>
                          <option value="Babahoyo">Babahoyo (Expansión)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                        Dirección Exacta
                      </label>
                      <input
                        type="text"
                        required
                        value={newDireccion}
                        onChange={(e) => setNewDireccion(e.target.value)}
                        placeholder="Calle principal, número y calle secundaria..."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '4px', color: '#334155' }}>
                        Referencia de Llegada
                      </label>
                      <input
                        type="text"
                        value={newReferencia}
                        onChange={(e) => setNewReferencia(e.target.value)}
                        placeholder="Frente a la tienda, portón azul, etc."
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', boxSizing: 'border-box' }}
                      />
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newEsPrincipal}
                        onChange={(e) => setNewEsPrincipal(e.target.checked)}
                      />
                      <span>Establecer como dirección principal de entrega</span>
                    </label>

                    <button
                      type="submit"
                      disabled={savingAddress}
                      style={{
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        padding: '10px',
                        borderRadius: '10px',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: savingAddress ? 'not-allowed' : 'pointer',
                        marginTop: '4px',
                      }}
                    >
                      {savingAddress ? 'Guardando...' : 'Guardar Ubicación'}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: BILLETERA VIRTUAL & MÉTODOS DE PAGO */}
              {profileTab === 'billetera' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Tarjeta Visual de Saldo */}
                  <div style={{
                    background: 'linear-gradient(135deg, #059669, #047857)',
                    borderRadius: '20px',
                    padding: '24px',
                    color: '#fff',
                    boxShadow: '0 8px 20px rgba(5, 150, 105, 0.25)',
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.9 }}>
                      Billetera Virtual Delivery Baba
                    </span>
                    <div style={{ fontSize: '36px', fontWeight: '900', margin: '8px 0 14px 0' }}>
                      ${walletBalance.toFixed(2)} <span style={{ fontSize: '18px', fontWeight: '600' }}>USD</span>
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.85 }}>
                      Saldo protegido e inmutable asentado en Ledger contable de doble entrada.
                    </div>
                  </div>

                  {/* Formulario de Recarga */}
                  <form onSubmit={handleRechargeWallet} style={{ background: '#f8fafc', padding: '18px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h5 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      Recargar Saldo (Transferencia / DeUna / Efectivo)
                    </h5>

                    {rechargeSuccess && (
                      <div style={{ background: '#f0fdf4', color: '#166534', padding: '10px', borderRadius: '8px', fontSize: '13px', border: '1px solid #bbf7d0' }}>
                        {rechargeSuccess}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {[5, 10, 20, 50].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setRechargeAmount(amt)}
                          style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '8px',
                            border: '1px solid',
                            borderColor: rechargeAmount === amt ? '#059669' : '#cbd5e1',
                            background: rechargeAmount === amt ? '#ecfdf5' : '#fff',
                            color: rechargeAmount === amt ? '#059669' : '#334155',
                            fontWeight: '800',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>

                    <div style={{ fontSize: '12px', color: '#64748b', background: '#fff', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      🏦 <strong>Banco Pichincha / DeUna:</strong> Cta. Ahorros #2200112233 · Titular: DeliveryBaba S.A.S. (Acreditación inmediata para pruebas del sistema).
                    </div>

                    <button
                      type="submit"
                      disabled={rechargeLoading}
                      style={{
                        background: '#059669',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: rechargeLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {rechargeLoading ? 'Acreditando...' : `Acreditar $${rechargeAmount.toFixed(2)} a mi Billetera 🚀`}
                    </button>
                  </form>

                  {/* Extracto de Movimientos del Ledger */}
                  <div>
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '800', color: '#0f172a' }}>
                      Extracto de Transacciones
                    </h5>
                    {walletMovimientos.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                        No hay movimientos registrados en tu billetera.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {walletMovimientos.map((m) => {
                          const isPos = parseFloat(m.monto as string) >= 0;
                          return (
                            <div
                              key={m.id}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid #e2e8f0',
                                background: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '13px',
                              }}
                            >
                              <div>
                                <strong style={{ color: '#0f172a' }}>{m.descripcion}</strong>
                                <div style={{ fontSize: '11px', color: '#64748b' }}>
                                  {new Date(m.fecha_creacion).toLocaleString('es-EC')} · Saldo: ${Number(m.saldo_resultante).toFixed(2)}
                                </div>
                              </div>
                              <span style={{ fontWeight: '800', color: isPos ? '#059669' : '#e11d48' }}>
                                {isPos ? '+' : ''}${Number(m.monto).toFixed(2)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: HISTORIAL DE PEDIDOS */}
              {profileTab === 'pedidos' && (
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '15px', fontWeight: '800', color: '#0f172a' }}>
                    Tus Pedidos en Los Ríos
                  </h4>

                  {loadingOrders ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      Cargando tus comandas...
                    </div>
                  ) : customerOrders.length === 0 ? (
                    <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>
                      Aún no has realizado pedidos. ¡Explora los restaurantes de Baba y Babahoyo para ordenar!
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {customerOrders.map((ord) => (
                        <div
                          key={ord.id}
                          style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '16px',
                            background: '#fff',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div>
                              <strong style={{ fontSize: '15px', color: '#0f172a' }}>
                                {ord.nombre_comercial}
                              </strong>
                              <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>
                                #{ord.id.slice(0, 8)} · {new Date(ord.fecha_creacion).toLocaleString('es-EC')}
                              </span>
                            </div>

                            <span style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              fontWeight: '800',
                              background: ord.estado === 'entregado' ? '#dcfce7' : ord.estado === 'en_camino' ? '#dbeafe' : '#fef3c7',
                              color: ord.estado === 'entregado' ? '#15803d' : ord.estado === 'en_camino' ? '#1d4ed8' : '#b45309',
                            }}>
                              {ord.estado.toUpperCase().replace('_', ' ')}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#475569', marginBottom: '10px' }}>
                            📍 Entrega en: {ord.direccion_entrega}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#64748b' }}>
                              Pago: <strong>{ord.metodo_pago.toUpperCase()}</strong> · Total: <strong style={{ color: '#e11d48' }}>${Number(ord.total).toFixed(2)}</strong>
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setPedidoConfirmado(ord);
                                setTrackingEta({
                                  distanciaMetros: 505,
                                  etaMinutos: 15,
                                  estado: ord.estado,
                                  repartidor: ord.repartidor_nombre || 'Carlos Repartidor - Moto Baba 01',
                                });
                                setShowProfileModal(false);
                                setVista('tracking');
                              }}
                              style={{
                                background: '#e11d48',
                                color: '#fff',
                                border: 'none',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: '700',
                                cursor: 'pointer',
                              }}
                            >
                              Ver Mapa & Seguimiento 🗺️
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Afiliar Mi Restaurante / Onboarding de Comercios */}
      {showAfiliacionModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 9999,
          backdropFilter: 'blur(5px)',
        }}>
          <div style={{
            background: '#fff',
            borderRadius: '24px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            border: '1px solid #e2e8f0',
            color: '#0f172a',
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '24px 28px',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'linear-gradient(135deg, #fff1f2 0%, #ffffff 100%)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
            }}>
              <div>
                <span style={{ background: '#ffe4e6', color: '#e11d48', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '6px' }}>
                  PROGRAMA PARTNERS · BABA & BABAHOYO
                </span>
                <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#0f172a', margin: '6px 0 2px 0' }}>
                  Afiliar mi Restaurante a DeliveryYa
                </h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  Vende más y digitaliza tus comandas con nuestra flota motorizada.
                </p>
              </div>

              <button
                onClick={() => setShowAfiliacionModal(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '10px',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {afiliacionSuccess ? (
              <div style={{ padding: '40px 28px', textAlign: 'center' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  background: '#ecfdf5',
                  color: '#059669',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto',
                  border: '2px solid #a7f3d0'
                }}>
                  <CheckCircle2 size={36} />
                </div>

                <h3 style={{ fontSize: '22px', fontWeight: '900', color: '#065f46', margin: '0 0 10px 0' }}>
                  ¡Solicitud Recibida con Éxito!
                </h3>

                <p style={{ color: '#334155', fontSize: '14px', lineHeight: 1.6, maxWidth: '480px', margin: '0 auto 24px auto' }}>
                  El restaurante <strong>{afilNombreComercial}</strong> ha sido registrado en nuestra plataforma y está en proceso de revisión por el equipo administrativo.
                  <br /><br />
                  Se han creado tus credenciales de acceso bajo el correo <strong>{afilEmail}</strong>. En cuanto tu tienda sea aprobada, podrás ingresar al panel de comercio y activar tu menú para comenzar a recibir pedidos.
                </p>

                <button
                  type="button"
                  onClick={() => setShowAfiliacionModal(false)}
                  style={{
                    background: '#e11d48',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '12px 32px',
                    fontWeight: '800',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                  }}
                >
                  Entendido, volver a la tienda 🚀
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitAfiliacion} style={{ padding: '24px 28px' }}>
                {/* Indicador de Pasos */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                  <div
                    onClick={() => setAfiliacionPaso(1)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: afiliacionPaso === 1 ? '#ffe4e6' : '#f8fafc',
                      border: `1px solid ${afiliacionPaso === 1 ? '#fecdd3' : '#e2e8f0'}`,
                      color: afiliacionPaso === 1 ? '#e11d48' : '#64748b',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    1. Tu Negocio
                  </div>

                  <div
                    onClick={() => setAfiliacionPaso(2)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: afiliacionPaso === 2 ? '#ffe4e6' : '#f8fafc',
                      border: `1px solid ${afiliacionPaso === 2 ? '#fecdd3' : '#e2e8f0'}`,
                      color: afiliacionPaso === 2 ? '#e11d48' : '#64748b',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    2. Encargado
                  </div>

                  <div
                    onClick={() => setAfiliacionPaso(3)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: afiliacionPaso === 3 ? '#ffe4e6' : '#f8fafc',
                      border: `1px solid ${afiliacionPaso === 3 ? '#fecdd3' : '#e2e8f0'}`,
                      color: afiliacionPaso === 3 ? '#e11d48' : '#64748b',
                      fontSize: '12px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    3. Pagos & Banco
                  </div>
                </div>

                {afiliacionError && (
                  <div style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    marginBottom: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <AlertCircle size={16} />
                    <span>{afiliacionError}</span>
                  </div>
                )}

                {/* PASO 1: DATOS DEL NEGOCIO */}
                {afiliacionPaso === 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                        Nombre Comercial del Restaurante / Local *
                      </label>
                      <input
                        type="text"
                        required
                        value={afilNombreComercial}
                        onChange={(e) => setAfilNombreComercial(e.target.value)}
                        placeholder="Ej: Picantería Los Almendros"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Categoría
                        </label>
                        <select
                          value={afilCategoria}
                          onChange={(e) => setAfilCategoria(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            background: '#fff',
                            outline: 'none',
                          }}
                        >
                          <option value="Restaurante">Comida Criolla / Típica</option>
                          <option value="Comida Rápida">Comida Rápida & Burgers</option>
                          <option value="Pizzería">Pizzas & Pastas</option>
                          <option value="Mariscos">Pescados & Mariscos</option>
                          <option value="Parrilladas">Parrilladas & Asados</option>
                          <option value="Bebidas">Jugos & Cafetería</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Cantón *
                        </label>
                        <select
                          value={afilCanton}
                          onChange={(e: any) => setAfilCanton(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            background: '#fff',
                            outline: 'none',
                          }}
                        >
                          <option value="baba">📍 Baba (Sede)</option>
                          <option value="babahoyo">📍 Babahoyo</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          RUC o Cédula (SRI)
                        </label>
                        <input
                          type="text"
                          value={afilRuc}
                          onChange={(e) => setAfilRuc(e.target.value)}
                          placeholder="1203456789001"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Razón Social (opcional)
                        </label>
                        <input
                          type="text"
                          value={afilRazonSocial}
                          onChange={(e) => setAfilRazonSocial(e.target.value)}
                          placeholder="Ej: ALMENDROS FOOD S.A.S."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                        Dirección del Local *
                      </label>
                      <input
                        type="text"
                        required
                        value={afilDireccion}
                        onChange={(e) => setAfilDireccion(e.target.value)}
                        placeholder="Calle principal, número o referencia..."
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Teléfono del Local *
                        </label>
                        <input
                          type="text"
                          required
                          value={afilTelefonoComercio}
                          onChange={(e) => setAfilTelefonoComercio(e.target.value)}
                          placeholder="+5939..."
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Plato Estrella / Descripción
                        </label>
                        <input
                          type="text"
                          value={afilDescripcion}
                          onChange={(e) => setAfilDescripcion(e.target.value)}
                          placeholder="Ej: Secos criollos al leño"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (!afilNombreComercial.trim() || !afilDireccion.trim()) {
                          setAfiliacionError('Ingresa el nombre comercial y la dirección del local.');
                          return;
                        }
                        setAfiliacionError('');
                        setAfiliacionPaso(2);
                      }}
                      style={{
                        marginTop: '10px',
                        background: '#0f172a',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px',
                        fontWeight: '800',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Continuar a Datos del Encargado ➔
                    </button>
                  </div>
                )}

                {/* PASO 2: DATOS DEL ENCARGADO / CREDENCIALES */}
                {afiliacionPaso === 2 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', color: '#475569' }}>
                      ℹ️ Estos datos se utilizarán para crear tu cuenta de acceso al <strong>Panel del Comercio</strong> (Kanban y administración de platos).
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                        Nombre y Apellido del Encargado / Dueño *
                      </label>
                      <input
                        type="text"
                        required
                        value={afilNombreEncargado}
                        onChange={(e) => setAfilNombreEncargado(e.target.value)}
                        placeholder="Ej: Darwin Vargas"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Correo Electrónico (Tu Usuario) *
                        </label>
                        <input
                          type="email"
                          required
                          value={afilEmail}
                          onChange={(e) => setAfilEmail(e.target.value)}
                          placeholder="admin@tu-restaurante.com"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Contraseña de Acceso *
                        </label>
                        <input
                          type="password"
                          required
                          value={afilPassword}
                          onChange={(e) => setAfilPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                        Teléfono / WhatsApp de Contacto Personal
                      </label>
                      <input
                        type="text"
                        value={afilTelefonoEncargado}
                        onChange={(e) => setAfilTelefonoEncargado(e.target.value)}
                        placeholder="+5939..."
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '13px',
                          boxSizing: 'border-box',
                          outline: 'none',
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setAfiliacionPaso(1)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#475569',
                          fontWeight: '700',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        ⬅ Volver
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!afilNombreEncargado.trim() || !afilEmail.trim() || !afilPassword.trim()) {
                            setAfiliacionError('Ingresa el nombre, correo y contraseña del encargado.');
                            return;
                          }
                          setAfiliacionError('');
                          setAfiliacionPaso(3);
                        }}
                        style={{
                          flex: 2,
                          background: '#0f172a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        Continuar a Datos de Cobro ➔
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 3: DATOS BANCARIOS & ENVÍO */}
                {afiliacionPaso === 3 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ background: '#ecfdf5', padding: '12px 16px', borderRadius: '12px', border: '1px solid #a7f3d0', fontSize: '13px', color: '#065f46' }}>
                      💰 <strong>Liquidaciones de Ventas:</strong> En esta cuenta bancaria acreditaremos semanalmente los pagos por los pedidos entregados en Baba y Babahoyo.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Banco en Ecuador
                        </label>
                        <select
                          value={afilBanco}
                          onChange={(e) => setAfilBanco(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            background: '#fff',
                            outline: 'none',
                          }}
                        >
                          <option value="Banco Pichincha">Banco Pichincha</option>
                          <option value="Banco Guayaquil">Banco Guayaquil</option>
                          <option value="Banco Bolivariano">Banco Bolivariano</option>
                          <option value="Banco del Pacífico">Banco del Pacífico</option>
                          <option value="Produbanco">Produbanco</option>
                          <option value="Cooperativa JEP">Cooperativa JEP</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Tipo de Cuenta
                        </label>
                        <select
                          value={afilTipoCuenta}
                          onChange={(e: any) => setAfilTipoCuenta(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            background: '#fff',
                            outline: 'none',
                          }}
                        >
                          <option value="ahorros">Cuenta de Ahorros</option>
                          <option value="corriente">Cuenta Corriente</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Número de Cuenta
                        </label>
                        <input
                          type="text"
                          value={afilNumeroCuenta}
                          onChange={(e) => setAfilNumeroCuenta(e.target.value)}
                          placeholder="Ej: 2200334455"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                          Titular de la Cuenta
                        </label>
                        <input
                          type="text"
                          value={afilTitularCuenta}
                          onChange={(e) => setAfilTitularCuenta(e.target.value)}
                          placeholder="Nombre o Razón Social"
                          style={{
                            width: '100%',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            fontSize: '13px',
                            boxSizing: 'border-box',
                            outline: 'none',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                      <button
                        type="button"
                        onClick={() => setAfiliacionPaso(2)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid #cbd5e1',
                          background: '#fff',
                          color: '#475569',
                          fontWeight: '700',
                          fontSize: '14px',
                          cursor: 'pointer',
                        }}
                      >
                        ⬅ Volver
                      </button>

                      <button
                        type="submit"
                        disabled={afiliacionLoading}
                        style={{
                          flex: 2,
                          background: 'linear-gradient(135deg, #e11d48, #be123c)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '12px',
                          padding: '12px',
                          fontWeight: '800',
                          fontSize: '14px',
                          cursor: afiliacionLoading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 14px rgba(225, 29, 72, 0.3)',
                          opacity: afiliacionLoading ? 0.7 : 1,
                        }}
                      >
                        {afiliacionLoading && <Loader2 size={16} className="animate-spin" />}
                        {afiliacionLoading ? 'Enviando Solicitud...' : 'Enviar Solicitud de Afiliación 🚀'}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 'auto', background: '#0f172a', color: '#94a3b8', padding: '24px', textAlign: 'center', fontSize: '13px' }}>
        <p style={{ margin: 0 }}>
          Plataforma de Delivery Los Ríos · Baba (Sede Principal) & Babahoyo (Expansión) · PostgreSQL 15 + PostGIS · OSRM Routing
        </p>
      </footer>
    </div>
  );
}
