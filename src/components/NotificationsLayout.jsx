import React from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { Trash2, BellOff, RefreshCcw, CheckCheck, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
 
const NotificationsLayout = ({ userRole }) => {
  const { notifications, onMarkRead, onMarkAllRead, onDelete, loading, refresh } = useNotificationContext();
  const canDelete = userRole === 'ROOT' || userRole === 'ADMIN' || userRole === 'ADMIN_CLIENTE';
  const isSupervisor = userRole === 'SUPERVISOR' || canDelete;
 
  if (loading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 md:p-20 text-center animate-pulse">
        <RefreshCcw className="animate-spin text-[#87be00] mb-4" size={32} />
        <div className="font-[Outfit] font-black text-gray-300 italic uppercase tracking-widest text-[10px] md:text-xs">
          Sincronizando Alertas...
        </div>
      </div>
    );
  }
 
  return (
    // 🔴 pt-20 en móvil asegura que nada se solape con el menú hamburguesa
    <div className="max-w-5xl mx-auto pt-20 md:pt-8 pb-10 px-4 md:px-6 font-[Outfit] animate-in fade-in duration-700">
      
      {/* HEADER RESPONSIVO */}
      {/* 🔴 pl-10 en móvil compensa el espacio del botón hamburguesa */}
      <div className="pl-10 md:pl-0 flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 md:mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-5xl font-black italic tracking-tighter uppercase leading-none text-gray-900">
            Notificaciones
          </h1>
          <p className="text-[#87be00] text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em] mt-1.5 md:mt-2">
            Centro de Comunicación Cultivapp
          </p>
        </div>
 
        <div className="flex items-center gap-3">
          <button
            onClick={() => refresh()}
            className="p-2.5 rounded-full bg-gray-50 border border-gray-100 text-gray-400 hover:text-[#87be00] transition-all shadow-sm"
          >
            <RefreshCcw size={16} />
          </button>
        </div>
      </div>
 
      {/* LISTA DE NOTIFICACIONES */}
      <div className="grid grid-cols-1 gap-3 md:gap-4">
        {notifications.length === 0 ? (
          <div className="bg-gray-50 rounded-[2rem] p-10 md:p-20 text-center border-2 border-dashed border-gray-100">
            <BellOff className="mx-auto text-gray-300 mb-4" size={32} />
            <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest italic">
              Sin mensajes pendientes
            </p>
          </div>
        ) : (
          notifications.map(n => (
            <div
              key={n.id}
              className={`group relative flex items-start gap-3 md:gap-6 p-4 md:p-8 rounded-[1.5rem] md:rounded-[3rem] border-2 transition-all duration-500 ${
                !n.is_read
                  ? 'bg-white border-gray-100 shadow-xl shadow-gray-200/50'
                  : 'bg-gray-50/50 border-transparent opacity-80'
              }`}
            >
              {/* ÍCONO */}
              <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl shrink-0 text-base md:text-xl shadow-sm ${
                !n.is_read ? 'bg-[#87be00] text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {n.scope === 'global' ? '🌍' : '🔔'}
              </div>
 
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <h3 className={`text-sm md:text-xl font-black italic uppercase tracking-tighter truncate leading-tight ${
                    !n.is_read ? 'text-gray-800' : 'text-gray-400'
                  }`}>
                    {n.title}
                  </h3>
                  
                  {/* ESTADO */}
                  <div className="shrink-0 flex items-center gap-1 text-[8px] font-black uppercase tracking-widest text-gray-400">
                    <CheckCheck className="w-3 h-3" strokeWidth={2} />
                    <span className="hidden sm:inline">{n.is_read ? 'Visto' : 'Entregado'}</span>
                  </div>
                </div>
 
                {/* MENSAJE */}
                <p className={`text-[10px] md:text-sm font-medium leading-relaxed mt-1 ${!n.is_read ? 'text-gray-600' : 'text-gray-400'}`}>
                  {n.message}
                </p>
 
                {/* FOOTER DE NOTIFICACIÓN */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-[8px] md:text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {n.created_at ? format(new Date(n.created_at), "dd MMM HH:mm", { locale: es }) : '---'}
                  </span>

                  {!n.is_read && (
                    <button
                      onClick={() => onMarkRead(n.id)}
                      className="bg-[#87be00] text-white px-4 py-2 rounded-lg text-[8px] md:text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shadow-[#87be00]/20"
                    >
                      Leída
                    </button>
                  )}
                </div>
              </div>
              
            </div>
          ))
        )}
      </div>
    </div>
  );
};
 
export default NotificationsLayout;