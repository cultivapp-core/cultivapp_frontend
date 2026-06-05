import React, { useState } from 'react';
import SawtoothChart from './SawtoothChart';
import InventoryAlerts from './InventoryAlerts';

const InventoryModule = () => {
  // Datos MOCK (Simulados)
  const mockData = {
    history: [
      { fecha: 'Lun', stock: 100 },
      { fecha: 'Mar', stock: 80 },
      { fecha: 'Mié', stock: 60 },
      { fecha: 'Jue', stock: 120 }, // Reposición
      { fecha: 'Vie', stock: 90 },
    ],
    alerts: [
      { marca: 'Producto A', local_nombre: 'Local 1', inventario_unidades: 5, stock_percentage: 10 },
      { marca: 'Producto B', local_nombre: 'Local 2', inventario_unidades: 2, stock_percentage: 5 },
    ]
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-blue-50 p-4 rounded-xl text-blue-800 text-[10px] font-black uppercase mb-4">
        Modo Demo: Si ves esto, el componente funciona. El problema es la conexión API.
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Gráfico (Demo)</h3>
            <SawtoothChart data={mockData.history} />
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest mb-4">Alertas (Demo)</h3>
            <InventoryAlerts items={mockData.alerts} />
        </div>
      </div>
    </div>
  );
};

export default InventoryModule;