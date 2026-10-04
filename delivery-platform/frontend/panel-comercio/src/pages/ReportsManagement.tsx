import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, DollarSign, Calendar, Download, Printer, 
  ArrowUpRight, ArrowDownRight, Package, ShoppingBag, 
  CreditCard, CheckCircle2, FileText, Filter, RefreshCw
} from 'lucide-react';
import { config } from '../config';

interface ReportsProps {
  comercioId: string;
  comercioNombre?: string;
}

interface SaleSummary {
  totalVentas: number;
  totalPedidos: number;
  ticketPromedio: number;
  comisionPlataforma: number;
  netoComercio: number;
  efectivoTotal: number;
  transferenciaTotal: number;
  tarjetaTotal: number;
}

interface TopProduct {
  id: string;
  nombre: string;
  cantidad: number;
  totalVentas: number;
}

interface SettlementItem {
  id: string;
  fecha: string;
  periodo: string;
  montoVentas: number;
  comision: number;
  montoLiquidado: number;
  estado: 'depositado' | 'pendiente' | 'en_proceso';
  comprobante?: string;
}

export default function ReportsManagement({ comercioId, comercioNombre = 'Local Aliado' }: ReportsProps) {
  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('semana');
  const [loading, setLoading] = useState(false);

  // Datos de resumen
  const [summary, setSummary] = useState<SaleSummary>({
    totalVentas: 485.50,
    totalPedidos: 42,
    ticketPromedio: 11.56,
    comisionPlataforma: 48.55, // 10%
    netoComercio: 436.95,
    efectivoTotal: 290.00,
    transferenciaTotal: 135.50,
    tarjetaTotal: 60.00,
  });

  const [topProducts, setTopProducts] = useState<TopProduct[]>([
    { id: '1', nombre: 'Seco de Gallina Criolla', cantidad: 28, totalVentas: 126.00 },
    { id: '2', nombre: 'Medio Pollo Asado con Menestra', cantidad: 22, totalVentas: 99.00 },
    { id: '3', nombre: 'Bolón Mixto con Chicharrón', cantidad: 19, totalVentas: 71.25 },
    { id: '4', nombre: 'Arroz con Menestra y Carne Asada', cantidad: 14, totalVentas: 91.00 },
    { id: '5', nombre: 'Jugo Natural de Naranja 1L', cantidad: 12, totalVentas: 30.00 },
  ]);

  const [settlements, setSettlements] = useState<SettlementItem[]>([
    {
      id: 'LIQ-2026-W39',
      fecha: '2026-10-02',
      periodo: 'Semana 39 (22 Sep - 28 Sep)',
      montoVentas: 620.00,
      comision: 62.00,
      montoLiquidado: 558.00,
      estado: 'depositado',
      comprobante: 'PICH-TR-998811',
    },
    {
      id: 'LIQ-2026-W38',
      fecha: '2026-09-25',
      periodo: 'Semana 38 (15 Sep - 21 Sep)',
      montoVentas: 540.00,
      comision: 54.00,
      montoLiquidado: 486.00,
      estado: 'depositado',
      comprobante: 'PICH-TR-887722',
    },
    {
      id: 'LIQ-2026-W40',
      fecha: '2026-10-04',
      periodo: 'Semana 40 (En curso)',
      montoVentas: 485.50,
      comision: 48.55,
      montoLiquidado: 436.95,
      estado: 'en_proceso',
    },
  ]);

  const currency = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Periodo,Total Ventas,Pedidos,Ticket Promedio,Comision Plataforma,Neto Comercio\n"
      + `${periodo},${summary.totalVentas},${summary.totalPedidos},${summary.ticketPromedio},${summary.comisionPlataforma},${summary.netoComercio}\n\n`
      + "Producto,Cantidad,Total Ventas\n"
      + topProducts.map(p => `"${p.nombre}",${p.cantidad},${p.totalVentas}`).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_ventas_${comercioNombre.replace(/\s+/g, '_')}_${periodo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider mb-1">
            <TrendingUp size={16} />
            <span>Métricas Financieras & Liquidaciones</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Reporte de Ventas & Liquidaciones
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Auditoría de ingresos brutos, desglose de métodos de cobro y pagos netos de la plataforma a tu cuenta.
          </p>
        </div>

        {/* Acciones y Filtro de Periodo */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPeriodo('hoy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodo === 'hoy' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Hoy
            </button>
            <button
              onClick={() => setPeriodo('semana')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodo === 'semana' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setPeriodo('mes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                periodo === 'mes' ? 'bg-rose-600 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Este Mes
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-colors"
          >
            <Download size={14} />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-2 rounded-xl border border-slate-700 transition-colors"
          >
            <Printer size={14} />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Métricas Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ventas Brutas */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ventas Totales Brutas</span>
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {currency.format(summary.totalVentas)}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 mt-1">
            <ArrowUpRight size={12} />
            <span>{summary.totalPedidos} pedidos completados</span>
          </div>
        </div>

        {/* Neto a Recibir por el Comercio */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Neto a Recibir (Tu Ganancia)</span>
            <CheckCircle2 size={16} className="text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">
            {currency.format(summary.netoComercio)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Tras deducir comisión de plataforma (10%)
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Ticket Promedio</span>
            <ShoppingBag size={16} className="text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {currency.format(summary.ticketPromedio)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Por comanda despachada
          </div>
        </div>

        {/* Comisión de Plataforma */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Comisión Plataforma (10%)</span>
            <FileText size={16} className="text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">
            {currency.format(summary.comisionPlataforma)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Incluye ruteo, tracking GPS y app
          </div>
        </div>
      </div>

      {/* Desglose por Método de Pago */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <h2 className="text-base font-extrabold text-white mb-4 flex items-center gap-2">
          <CreditCard size={18} className="text-indigo-400" />
          <span>Distribución de Ventas por Método de Cobro</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-bold">💵 Efectivo contra entrega</div>
            <div className="text-xl font-black text-white mt-1">{currency.format(summary.efectivoTotal)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {((summary.efectivoTotal / summary.totalVentas) * 100).toFixed(1)}% del total
            </div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-bold">📱 Transferencia / DeUna</div>
            <div className="text-xl font-black text-white mt-1">{currency.format(summary.transferenciaTotal)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {((summary.transferenciaTotal / summary.totalVentas) * 100).toFixed(1)}% del total
            </div>
          </div>
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400 font-bold">💳 Tarjeta Débito / Payphone</div>
            <div className="text-xl font-black text-white mt-1">{currency.format(summary.tarjetaTotal)}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {((summary.tarjetaTotal / summary.totalVentas) * 100).toFixed(1)}% del total
            </div>
          </div>
        </div>
      </div>

      {/* Dos Columnas: Top Productos y Registro de Liquidaciones Semanales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Productos Más Vendidos */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Package size={18} className="text-amber-400" />
            <span>Productos Estrella (Top Ventas)</span>
          </h2>
          <div className="divide-y divide-slate-800">
            {topProducts.map((p, idx) => (
              <div key={p.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-black text-xs">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">{p.nombre}</div>
                    <div className="text-xs text-slate-400">{p.cantidad} unidades vendidas</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-white">{currency.format(p.totalVentas)}</div>
                  <div className="text-[10px] text-slate-500">{currency.format(p.totalVentas / p.cantidad)} c/u</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Historial de Liquidaciones Bancarias de la Plataforma */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <FileText size={18} className="text-teal-400" />
            <span>Liquidaciones & Depósitos Bancarios</span>
          </h2>
          <div className="divide-y divide-slate-800">
            {settlements.map((liq) => (
              <div key={liq.id} className="py-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{liq.periodo}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    liq.estado === 'depositado' 
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                  }`}>
                    {liq.estado === 'depositado' ? '✓ Depositado' : '⏳ En Proceso'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Ventas: {currency.format(liq.montoVentas)} · Com: -{currency.format(liq.comision)}</span>
                  <span className="text-emerald-400 font-black text-sm">{currency.format(liq.montoLiquidado)}</span>
                </div>
                {liq.comprobante && (
                  <div className="text-[10px] text-slate-500 font-mono">
                    Comprobante: {liq.comprobante} · Fecha: {liq.fecha}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
