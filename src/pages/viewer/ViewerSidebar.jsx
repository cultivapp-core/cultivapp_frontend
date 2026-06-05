 import React from "react";

import { Link, useLocation } from "react-router-dom";

import { FiPieChart, FiBarChart2, FiMap, FiCamera, FiAlertCircle } from "react-icons/fi";


const ViewerSidebar = () => {

const location = useLocation();


// Definimos las rutas exclusivas para el rol de Gerencia/Viewer

const menuItems = [

{ path: "/viewer/dashboard", name: "Panorama", icon: <FiPieChart size={18} /> },

{ path: "/viewer/reportes", name: "Métricas", icon: <FiBarChart2 size={18} /> },

{ path: "/viewer/mapa", name: "Monitoreo GPS", icon: <FiMap size={18} /> },

{ path: "/viewer/galeria", name: "Evidencias", icon: <FiCamera size={18} /> },

{ path: "/viewer/alertas", name: "Alertas", icon: <FiAlertCircle size={18} /> },

];


return (

<div className="flex flex-col gap-6 w-full font-[Outfit] mt-6 px-2">

{/* SECCIÓN DEL MENÚ */}

<div>

<span className="text-[9px] font-black text-gray-300 uppercase tracking-[0.2em] px-4 block mb-4">

Módulo Gerencial

</span>

<nav className="flex flex-col gap-2">

{menuItems.map((item) => {

// Verifica si la ruta actual coincide con el ítem (soporta subrutas)

const isActive = location.pathname.includes(item.path);

return (

<Link

key={item.path}

to={item.path}

className={`

group flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300

${isActive

? "bg-[#87be00] text-white shadow-lg shadow-[#87be00]/30"

: "text-gray-400 hover:bg-gray-50 hover:text-gray-900"

}

`}

>

{/* ÍCONO CON ANIMACIÓN DE ESCALA */}

<span className={`

transition-transform duration-300

${isActive ? "scale-110 text-white" : "group-hover:scale-110 group-hover:text-[#87be00] text-gray-400"}

`}>

{item.icon}

</span>

{/* TEXTO CON ANIMACIÓN DE DESPLAZAMIENTO */}

<span className={`

text-[10px] font-black uppercase tracking-widest transition-transform duration-300

${!isActive && "group-hover:translate-x-1"}

`}>

{item.name}

</span>

</Link>

);

})}

</nav>

</div>


</div>

);

};


export default ViewerSidebar; 