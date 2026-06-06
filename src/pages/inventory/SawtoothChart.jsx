import React from 'react';
import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend
} from 'recharts';
import { FiTrendingDown, FiAlertTriangle, FiCheckCircle } from 'react-icons/fi';

// ─── Helper fecha ────────────────────────────────────────────────────────────
const formatFecha = (fecha) => {
  if (!fecha) return '—';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};

// ─── Tooltip personalizado ───────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const stock   = payload.find(p => p.dataKey === 'stock');
  const vendidas = payload.find(p => p.dataKey === 'vendidas');
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 text-[10px] min-w-[160px]">
      <p className="font-black text-gray-500 uppercase tracking-widest mb-3">
        {formatFecha(label)}
      </p>
      {stock && (
        <div className="flex justify-between gap-4 mb-1">
          <span className="text-gray-400 font-bold uppercase">Stock</span>
          <span className="font-black text-gray-900">{Number(stock.value).toLocaleString('es-CL')} uds</span>
        </div>
      )}
      {vendidas && (
        <div className="flex justify-between gap-4">
          <span className="text-gray-400 font-bold uppercase">Vendidas</span>
          <span className="font-black text-blue-600">{Number(vendidas.value).toLocaleString('es-CL')} uds</span>
        </div>
      )}
    </div>
  );
};

// ─── Componente principal ────────────────────────────────────────────────────
const SawtoothChart = ({ data = [], stockMinimo = 10, titulo = 'Curva de Stock' }) => {

  if (!data.length) {
    return (
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px] gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center">
          <FiTrendingDown size={24} />
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          Sin datos de evolución disponibles
        </p>
      </div>
    );
  }

  // ─── Enriquecer datos con días estimados para quiebre ───────────────────────
  const enriched = data.map((d, i) => {
    const prev  = data[i - 1];
    const delta = prev ? d.stock - prev.stock : 0;
    const tasaVentaDiaria = d.vendidas > 0 ? d.vendidas / 30 : 0;
    const diasParaQuiebre = tasaVentaDiaria > 0
      ? Math.round(d.stock / tasaVentaDiaria)
      : null;
    return { ...d, delta, diasParaQuiebre };
  });

  // ─── KPIs resumen ───────────────────────────────────────────────────────────
  const ultimo       = enriched[enriched.length - 1];
  const stockActual  = ultimo?.stock ?? 0;
  const tasaDiaria   = ultimo?.vendidas > 0 ? ultimo.vendidas / 30 : 0;
  const diasRestantes = tasaDiaria > 0 ? Math.round(stockActual / tasaDiaria) : null;
  const enRiesgo     = stockActual <= stockMinimo;
  const minStock     = Math.min(...enriched.map(d => d.stock));
  const maxStock     = Math.max(...enriched.map(d => d.stock));

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">
            {titulo}
          </h3>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
            Diente de Sierra — Evolución diaria de stock
          </p>
        </div>

        {/* Badge estado */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest shrink-0 ${
          enRiesgo
            ? 'bg-red-100 text-red-600'
            : diasRestantes !== null && diasRestantes <= 7
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-700'
        }`}>
          {enRiesgo
            ? <><FiAlertTriangle size={12} /> Quiebre inminente</>
            : diasRestantes !== null && diasRestantes <= 7
              ? <><FiAlertTriangle size={12} /> Stock bajo</>
              : <><FiCheckCircle size={12} /> Stock saludable</>
          }
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Stock Actual',    value: `${Number(stockActual).toLocaleString('es-CL')} uds`,          color: enRiesgo ? 'text-red-600' : 'text-gray-900' },
          { label: 'Días p/ Quiebre', value: diasRestantes !== null ? `~${diasRestantes} días` : 'N/A',     color: diasRestantes !== null && diasRestantes <= 7 ? 'text-red-600' : 'text-gray-900' },
          { label: 'Mínimo Período',  value: `${Number(minStock).toLocaleString('es-CL')} uds`,             color: 'text-gray-900' },
          { label: 'Máximo Período',  value: `${Number(maxStock).toLocaleString('es-CL')} uds`,             color: 'text-gray-900' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-gray-50 rounded-2xl p-4">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
            <p className={`text-base font-black tracking-tighter ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* GRÁFICO */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={enriched} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis
            dataKey="fecha_carga"
            fontSize={9}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatFecha}
          />
          <YAxis
            fontSize={9}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => Number(v).toLocaleString('es-CL')}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '12px' }} />

          {/* Área de stock — forma el diente de sierra */}
          <Area
            type="monotone"
            dataKey="stock"
            name="Stock (uds)"
            fill="#87be00"
            fillOpacity={0.12}
            stroke="#87be00"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#87be00', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />

          {/* Línea de ventas */}
          <Line
            type="monotone"
            dataKey="vendidas"
            name="Vendidas (uds)"
            stroke="#2563eb"
            strokeWidth={2}
            dot={false}
            strokeDasharray="5 3"
          />

          {/* Línea de stock mínimo */}
          <ReferenceLine
            y={stockMinimo}
            stroke="#ef4444"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{
              value: `Mín: ${stockMinimo}`,
              fill: '#ef4444',
              fontSize: 9,
              fontWeight: 900,
              position: 'insideTopRight'
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest text-center">
        Cada punto representa un día de carga · Línea roja = stock mínimo configurado ({stockMinimo} uds)
      </p>
    </div>
  );
};

export default SawtoothChart;