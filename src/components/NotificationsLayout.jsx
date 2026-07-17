import React from 'react';
import { useNotificationContext } from '../context/NotificationContext';
import { BellOff, RefreshCcw, CheckCheck, Eye, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
 
const NotificationsLayout = ({ userRole }) => {
  const { notifications, onMarkRead, onMarkAllRead, loading, refresh } = useNotificationContext();
 
  if (loading && notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 md:p-20 text-center animate-pulse">
        <RefreshCcw className="animate-spin text-[#87be00] mb-4" size={32} />
        <div className="font-[Outfit] font-black text-gray-300 italic uppercase tracking-widest text-xs">
          Sincronizando Alertas...
        </div>
      </div>
    );
  }
 
  return (
    <div className="w-full max-w-5xl mx-auto pt-16 pb-10 px-3 md:px-6 font-[Outfit] animate-in fade-in duration-500">
      
      {/* HEADER RESPONSIVO */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-6 gap-4 px-2">
        <div>
          <h1 className="text-3xl md:text-5xl font-black italic tracking-tight uppercase leading-none text-gray-900">
            Notificaciones
          </h1>
          <p className="text-[#87be00] text-[10px] font-black uppercase tracking-[0.2em] mt-2">
            Centro de Comunicación Cultivapp
          </p>
        </div>

        <button
          onClick={() => refresh()}
          className="p-3 rounded-full bg-white border border-gray-100 text-gray-400 hover:text-[#87be00] transition-all shadow-sm"
        >
          <RefreshCcw size={18} />
        </button>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white rounded-[2rem] p-4 md:p-6 border border-gray-100 shadow-sm">
        
        {/* BARRA DE ACCIÓN */}
        {notifications.length > 0 && (
          <div className="flex flex-wrap justify-between items-center mb-6 border-b border-gray-50 pb-4 gap-2">
            <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2">
              <Inbox size={14} className="text-[#87be00]" />
              {notifications.length} Mensajes pendientes
            </h3>
            <button 
              onClick={onMarkAllRead}
              className="text-[10px] font-black uppercase text-[#87be00] hover:underline"
            >
              Marcar todos como leídos
            </button>
          </div>
        )}

        {/* LISTA DE NOTIFICACIONES */}
        <div className="space-y-4">
          {notifications.length === 0 ? (
            <div className="bg-gray-50 rounded-[1.5rem] p-10 text-center border border-dashed border-gray-200">
              <BellOff className="mx-auto text-gray-300 mb-4" size={32} />
              <p className="text-gray-400 font-black uppercase text-[10px] tracking-widest italic">
                Sin mensajes pendientes
              </p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                className={`group relative flex items-start gap-4 p-4 md:p-6 rounded-[1.5rem] border transition-all duration-300 ${
                  !n.is_read
                    ? 'bg-white border-gray-100 shadow-sm'
                    : 'bg-gray-50 border-transparent opacity-80'
                }`}
              >
                {/* ÍCONO */}
                <div className={`p-3 rounded-2xl shrink-0 ${
                  !n.is_read ? 'bg-[#87be00] text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {n.scope === 'global' ? '🌍' : '🔔'}
                </div>

                {/* CONTENIDO */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    {/* TÍTULO CON WORD-WRAP PARA EVITAR PEGADO */}
                    <h3 className={`text-[14px] md:text-lg font-black italic uppercase leading-tight break-words ${
                      !n.is_read ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {n.title}
                    </h3>
                  </div>

                  {/* MENSAJE */}
                  <p className={`text-[11px] md:text-sm font-medium leading-snug mt-1 break-words ${!n.is_read ? 'text-gray-600' : 'text-gray-400'}`}>
                    {n.message}
                  </p>

                  {/* FOOTER */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">
                      {n.created_at ? format(new Date(n.created_at), "dd MMM HH:mm", { locale: es }) : '---'}
                    </span>

                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] font-black uppercase flex items-center gap-1 ${n.is_read ? 'text-gray-400' : 'text-[#87be00]'}`}>
                        <CheckCheck size={12} /> {n.is_read ? 'Visto' : 'Nuevo'}
                      </span>
                      
                      {!n.is_read && (
                        <button
                          onClick={() => onMarkRead(n.id)}
                          className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase hover:bg-[#87be00] transition-colors"
                        >
                          Leída
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
 
export default NotificationsLayout;