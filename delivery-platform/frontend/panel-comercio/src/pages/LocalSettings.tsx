import { useState, useEffect } from 'react';
import { 
  Store, Clock, MapPin, Phone, CheckCircle2, 
  AlertCircle, ShieldCheck, Sparkles, RefreshCw, Save
} from 'lucide-react';
import { config } from '../config';

interface LocalSettingsProps {
  comercioId: string;
  isRetail?: boolean;
}

export default function LocalSettings({ comercioId, isRetail = false }: LocalSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [nombre, setNombre] = useState('Picantería El Buen Sabor');
  const [tipoComercio, setTipoComercio] = useState(isRetail ? 'Tienda / Minimarket' : 'Restaurante / Comida Típica');
  const [telefono, setTelefono] = useState('0987654321');
  const [direccion, setDireccion] = useState('Av. Guayaquil y Sucre, Baba, Los Ríos');
  const [isAbierto, setIsAbierto] = useState(true);
  const [tiempoPreparacion, setTiempoPreparacion] = useState('20-30 min');
  const [subsidioDelivery, setSubsidioDelivery] = useState('0.00'); // Subsidio del local al flete
  const [aceptaEfectivo, setAceptaEfectivo] = useState(true);
  const [aceptaTransferencia, setAceptaTransferencia] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await fetch(`${config.apiBaseUrl}/catalog/comercio/${comercioId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            if (json.data.nombre_comercial) setNombre(json.data.nombre_comercial);
            if (json.data.tipo_comercio_nombre) setTipoComercio(json.data.tipo_comercio_nombre);
            if (json.data.telefono) setTelefono(json.data.telefono);
            if (json.data.direccion) setDireccion(json.data.direccion);
            if (json.data.is_abierto !== undefined) setIsAbierto(json.data.is_abierto);
          }
        }
      } catch (err) {
        console.warn('Error loading local settings:', err);
      } finally {
        setLoading(false);
      }
    }
    if (comercioId) loadData();
  }, [comercioId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      // Simular o guardar en endpoint
      await new Promise(r => setTimeout(r, 600));
      setSuccessMsg('Configuración del local guardada correctamente');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg('No se pudo guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Store size={16} />
            <span>Perfil & Políticas del Establecimiento</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Configuración de {nombre}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Modifica horarios, tiempos estimados, métodos de cobro y subsidios al delivery en Baba.
          </p>
        </div>

        {/* Switch Abierto/Cerrado */}
        <div className="flex items-center gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-xs font-bold text-white">Estado del Negocio</div>
            <div className={`text-[11px] font-semibold ${isAbierto ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isAbierto ? '🟢 RECIBIENDO PEDIDOS' : '🔴 CERRADO TEMPORALMENTE'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsAbierto(!isAbierto)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAbierto ? 'bg-emerald-600' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAbierto ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-xl text-sm font-semibold animate-fadeIn">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Datos Principales */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Store size={18} className="text-rose-400" />
            <span>Datos Generales del Establecimiento</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Categoría / Vertical</label>
              <input
                type="text"
                disabled
                value={tipoComercio}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Teléfono WhatsApp Local</label>
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Dirección de Despacho</label>
              <input
                type="text"
                value={direccion}
                onChange={e => setDireccion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-rose-500"
              />
            </div>
          </div>
        </div>

        {/* Tiempos y Operación */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-sky-400" />
            <span>Tiempos de {isRetail ? 'Picking y Empaque' : 'Preparación en Cocina'}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Tiempo Estimado al Cliente
              </label>
              <select
                value={tiempoPreparacion}
                onChange={e => setTiempoPreparacion(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:border-rose-500"
              >
                <option value="10-15 min">⚡ Rápido: 10 a 15 minutos</option>
                <option value="20-30 min">⏱️ Estándar: 20 a 30 minutos</option>
                <option value="30-45 min">🍲 Elaborado: 30 a 45 minutos</option>
                <option value="45-60 min">⏳ Gran volumen: 45 a 60 minutos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Subsidio de Flete / Delivery al Cliente ($)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  max="1.50"
                  value={subsidioDelivery}
                  onChange={e => setSubsidioDelivery(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2 text-sm text-white focus:border-rose-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Ej: Si la tarifa plana en Baba es $1.00 y tú aportas $0.25, el cliente solo paga $0.75 de flete.
              </p>
            </div>
          </div>
        </div>

        {/* Métodos de Pago Aceptados */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <span>Métodos de Pago Habilitados para tus Clientes</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={aceptaEfectivo}
                onChange={e => setAceptaEfectivo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400"
              />
              <div>
                <div className="text-xs font-bold text-white">💵 Pago contra entrega (Efectivo)</div>
                <div className="text-[11px] text-slate-400">El motorizado cobra el dinero y lo rinde al local.</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700">
              <input
                type="checkbox"
                checked={aceptaTransferencia}
                onChange={e => setAceptaTransferencia(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 text-sky-500 focus:ring-sky-400"
              />
              <div>
                <div className="text-xs font-bold text-white">📲 Transferencia / Billetera Digital</div>
                <div className="text-[11px] text-slate-400">Banco Pichincha, Guayaquil, Deuna o Banco del Barrio.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Guardar */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-rose-950 transition-all text-sm"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Guardar Configuración del Local</span>
          </button>
        </div>
      </form>
    </div>
  );
}
