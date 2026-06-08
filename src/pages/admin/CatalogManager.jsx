import { useState, useEffect, useRef } from "react";
import { 
  FiPlus, FiAward, FiTrash2, FiEdit2, FiTag, FiX,
  FiUploadCloud, FiRotateCw, FiChevronRight, FiChevronDown, FiPackage 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const CatalogManager = () => {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedBrand, setExpandedBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Estados de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [productData, setProductData] = useState({ name: "", barcode: "", brand_id: "", category_id: "" });
  
  // Categorías y Marcas (Modales simples)
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resBrands, resProducts, resCategories] = await Promise.all([
        api.get("/routes/brands"),
        api.get("/routes/products"),
        api.get("/routes/categories")
      ]);
      setBrands(resBrands || []);
      setProducts(resProducts || []);
      setCategories(resCategories || []);
    } catch (err) { toast.error("Error al sincronizar"); } finally { setLoading(false); }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("excel", file);
    try {
      setBulkLoading(true);
      const res = await api.post("/routes/products/bulk", formData);
      toast.success(res?.message || "Carga exitosa");
      loadData();
    } catch (error) { toast.error("Error al procesar"); } finally { setBulkLoading(false); }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) await api.put(`/routes/products/${selectedId}`, productData);
      else await api.post("/routes/products", productData);
      
      setIsModalOpen(false);
      setProductData({ name: "", barcode: "", brand_id: "", category_id: "" });
      loadData();
      toast.success("Producto guardado");
    } catch (err) { toast.error("Error en la operación"); }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-[#87be00]">SINCRONIZANDO CATÁLOGO...</div>;

  return (
    <div className="space-y-8 p-4 md:p-8 font-[Outfit] animate-in fade-in duration-500 pt-20 md:pt-8 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Productos SKU</h2>
          <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.3em] mt-3 italic">Gestión integral de productos y familia</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleBulkUpload} />
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 md:flex-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 px-5 py-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center justify-center gap-2">
            {bulkLoading ? <FiRotateCw className="animate-spin" /> : <FiUploadCloud size={14} />} Carga Masiva
          </button>
          <button onClick={() => setIsModalOpen(true)} className="w-full md:w-auto bg-gray-900 text-[#87be00] px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl flex items-center justify-center gap-3 hover:bg-[#87be00] hover:text-white transition-all">
            <FiPlus size={16}/> Nuevo Producto
          </button>
        </div>
      </header>

      {/* CATEGORÍAS */}
      <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
            <FiTag className="text-[#87be00]" size={16}/>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Categorías activas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <span key={cat.id} className="px-4 py-2 bg-green-50 border border-green-100 text-[#87be00] rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm">
              {cat.name}
            </span>
          ))}
        </div>
      </div>

      {/* ACORDEÓN DE MARCAS */}
      <div className="space-y-4">
        {brands.map((brand) => {
          const brandProducts = products.filter(p => p.brand_id === brand.id);
          const isExpanded = expandedBrand === brand.id;

          return (
            <div key={brand.id} className={`bg-white rounded-[2rem] border transition-all duration-300 ${isExpanded ? 'border-[#87be00] shadow-lg shadow-green-500/5' : 'border-gray-100 shadow-sm'}`}>
              <div 
                className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50/50 transition-colors" 
                onClick={() => setExpandedBrand(isExpanded ? null : brand.id)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isExpanded ? 'bg-green-100 text-[#87be00]' : 'bg-gray-50 text-gray-400'}`}>
                    <FiAward size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase italic text-gray-900">{brand.name}</h3>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{brandProducts.length} SKUs</p>
                  </div>
                </div>
                <div className="text-gray-300">
                  {isExpanded ? <FiChevronDown size={20} className="text-[#87be00]" /> : <FiChevronRight size={20} />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-4 pb-6 md:px-6 animate-in slide-in-from-top-2 duration-300">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {brandProducts.map((prod) => (
                      <div key={prod.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#87be00] transition-colors group">
                        <p className="text-[10px] font-black uppercase text-gray-800 truncate">{prod.name}</p>
                        <p className="text-[8px] font-bold text-gray-400 mt-1">EAN: {prod.barcode}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL NUEVO PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-8 relative shadow-2xl animate-in zoom-in duration-300">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-black"><FiX size={24} /></button>
            <h3 className="text-2xl font-black uppercase italic mb-6">Nuevo Producto</h3>
            <form onSubmit={handleProductSubmit} className="space-y-4">
              <input required className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" placeholder="Nombre" value={productData.name} onChange={(e) => setProductData({...productData, name: e.target.value})} />
              <input required className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" placeholder="EAN" value={productData.barcode} onChange={(e) => setProductData({...productData, barcode: e.target.value})} />
              <select className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" value={productData.brand_id} onChange={(e) => setProductData({...productData, brand_id: e.target.value})}>
                <option value="">Seleccionar Marca</option>
                {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold border-none" value={productData.category_id} onChange={(e) => setProductData({...productData, category_id: e.target.value})}>
                <option value="">Seleccionar Categoría</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="submit" className="w-full bg-black text-[#87be00] py-4 rounded-xl font-black uppercase text-[10px] tracking-widest mt-4">Guardar Producto</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManager;