import React, { useState, useEffect } from "react";
import { 
  FiPlus, FiPackage, FiAward, FiTrash2, 
  FiChevronRight, FiChevronDown, FiX, FiTag, FiEdit2 
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const CatalogManager = () => {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [expandedBrand, setExpandedBrand] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados de Modales y Control de Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBrandModalOpen, setIsBrandModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  // Estados de Formulario
  const [productData, setProductData] = useState({ name: "", barcode: "", brand_id: "", category_id: "" });
  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resBrands, resProducts, resCategories] = await Promise.all([
        api.get("/brands"),
        api.get("/products"),
        api.get("/categories")
      ]);
      setBrands(resBrands || []);
      setProducts(resProducts || []);
      setCategories(resCategories || []);
    } catch (err) {
      toast.error("Error al sincronizar catálogo");
    } finally {
      setLoading(false);
    }
  };

  // --- LÓGICA DE PRODUCTOS ---
  const handleOpenProductModal = (prod = null) => {
    setIsEditing(!!prod);
    setSelectedId(prod?.id || null);
    setProductData(prod ? { name: prod.name, barcode: prod.barcode, brand_id: prod.brand_id, category_id: prod.category_id } : { name: "", barcode: "", brand_id: "", category_id: "" });
    setIsModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/products/${selectedId}`, productData);
        toast.success("Producto actualizado");
      } else {
        await api.post("/products", productData);
        toast.success("Producto creado");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) { toast.error("Error en la operación"); }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("¿Eliminar este SKU del maestro?")) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success("Producto eliminado");
      loadData();
    } catch (err) { toast.error("Error al eliminar"); }
  };

  // --- LÓGICA DE MARCAS ---
  const handleOpenBrandModal = (brand = null) => {
    setIsEditing(!!brand);
    setSelectedId(brand?.id || null);
    setBrandName(brand ? brand.name : "");
    setIsBrandModalOpen(true);
  };

  const handleBrandSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/brands/${selectedId}`, { name: brandName });
        toast.success("Marca actualizada");
      } else {
        await api.post("/brands", { name: brandName });
        toast.success("Marca creada");
      }
      setIsBrandModalOpen(false);
      loadData();
    } catch (err) { toast.error("Error en la operación"); }
  };

  // --- LÓGICA DE CATEGORÍAS (LA MEJORA QUE FALTABA) ---
  const handleOpenCategoryModal = (cat = null) => {
    setIsEditing(!!cat);
    setSelectedId(cat?.id || null);
    setCategoryName(cat ? cat.name : "");
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/categories/${selectedId}`, { name: categoryName });
        toast.success("Categoría actualizada");
      } else {
        await api.post("/categories", { name: categoryName });
        toast.success("Categoría creada");
      }
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err) { toast.error("Error en la operación"); }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("¿Eliminar esta categoría? Esto podría afectar a los productos vinculados.")) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Categoría eliminada");
      loadData();
    } catch (err) { toast.error("No se pudo eliminar (verifique si tiene productos)"); }
  };

  const getProductsByBrand = (brandId) => products.filter(p => p.brand_id === brandId);

  if (loading) return <div className="p-10 text-center font-black uppercase animate-pulse text-gray-400 italic">Cargando Maestro...</div>;

  return (
    <div className="space-y-8 p-6 font-[Outfit] animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
        <div>
          <h2 className="text-5xl font-black text-gray-900 tracking-tighter uppercase italic leading-none">Catálogo Maestro</h2>
          <p className="text-[10px] font-black text-[#87be00] uppercase tracking-[0.4em] mt-4">Trazabilidad por SKU y Familia</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => handleOpenBrandModal()} className="bg-white border-2 border-black text-black px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all">+ Marca</button>
          <button onClick={() => handleOpenCategoryModal()} className="bg-white border-2 border-black text-black px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-gray-50 transition-all">+ Categoría</button>
          <button onClick={() => handleOpenProductModal()} className="bg-black text-[#87be00] px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:scale-105 transition-all shadow-2xl flex items-center gap-3"><FiPlus size={20}/> Nuevo Producto</button>
        </div>
      </header>

      {/* CATEGORÍAS (PILLS GESTIONABLES) */}
      <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-4">Categorías registradas</p>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <div key={cat.id} className="bg-white border border-gray-200 pl-4 pr-2 py-2 rounded-xl flex items-center gap-3 shadow-sm group hover:border-[#87be00] transition-all">
              <span className="text-[10px] font-black uppercase text-gray-700">{cat.name}</span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenCategoryModal(cat)} className="p-1 hover:text-[#87be00]"><FiEdit2 size={12}/></button>
                <button onClick={() => handleDeleteCategory(cat.id)} className="p-1 hover:text-red-500"><FiTrash2 size={12}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ACORDEÓN DE MARCAS */}
      <div className="space-y-4">
        {brands.map((brand) => {
          const brandProducts = getProductsByBrand(brand.id);
          const isExpanded = expandedBrand === brand.id;

          return (
            <div key={brand.id} className={`bg-white rounded-[2.5rem] border transition-all duration-300 ${isExpanded ? 'border-[#87be00] shadow-xl shadow-[#87be00]/5' : 'border-gray-100 shadow-sm'}`}>
              <div className="p-6 flex items-center justify-between">
                <div onClick={() => setExpandedBrand(isExpanded ? null : brand.id)} className="flex items-center gap-5 cursor-pointer flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isExpanded ? 'bg-black text-[#87be00]' : 'bg-gray-50 text-gray-400'}`}><FiAward size={28} /></div>
                  <div>
                    <h3 className="text-lg font-black uppercase italic text-gray-900 tracking-tight">{brand.name}</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{brandProducts.length} Productos</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => handleOpenBrandModal(brand)} className="p-2 text-gray-400 hover:text-black"><FiEdit2 size={18} /></button>
                  <button onClick={() => { if(window.confirm("¿Eliminar marca?")) api.delete(`/brands/${brand.id}`).then(()=>loadData()) }} className="p-2 text-gray-400 hover:text-red-500"><FiTrash2 size={18} /></button>
                  {isExpanded ? <FiChevronDown size={24} className="text-[#87be00]" /> : <FiChevronRight size={24} className="text-gray-300" />}
                </div>
              </div>

              {isExpanded && (
                <div className="px-6 pb-8 animate-in slide-in-from-top-2 duration-300">
                  <div className="h-px bg-gray-50 mb-6" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {brandProducts.map((prod) => (
                      <div key={prod.id} className="flex flex-col p-5 bg-gray-50 rounded-[2rem] border border-gray-100 group relative">
                        <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleOpenProductModal(prod)} className="p-2 bg-white rounded-xl shadow-sm text-black hover:text-[#87be00]"><FiEdit2 size={14}/></button>
                          <button onClick={() => handleDeleteProduct(prod.id)} className="p-2 bg-white rounded-xl shadow-sm text-black hover:text-red-500"><FiTrash2 size={14}/></button>
                        </div>
                        <span className="text-[11px] font-black uppercase text-gray-800 leading-tight pr-10">{prod.name}</span>
                        <span className="text-[9px] font-bold text-gray-400 tracking-wider mt-2">EAN: {prod.barcode}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL CATEGORÍA (NUEVO / EDITAR) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 relative shadow-2xl">
            <h4 className="text-2xl font-black uppercase italic mb-6 text-center">{isEditing ? "Editar" : "Nueva"} Categoría</h4>
            <form onSubmit={handleCategorySubmit} className="space-y-4">
              <input required className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none border-none focus:ring-2 focus:ring-[#87be00]" placeholder="Ej: Lácteos, Snacks..." value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-black text-[#87be00] py-4 rounded-xl font-black uppercase text-[10px]">{isEditing ? "Actualizar" : "Guardar"}</button>
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 bg-gray-100 py-4 rounded-xl font-black uppercase text-[10px]">Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ... (Modales de Producto y Marca que ya funcionan bien) ... */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xl rounded-[3.5rem] p-12 relative shadow-2xl">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-10 right-10 text-gray-300 hover:text-black"><FiX size={32} /></button>
            <h3 className="text-4xl font-black uppercase italic tracking-tighter mb-2 text-gray-900">{isEditing ? "Editar" : "Nuevo"} Producto</h3>
            <form onSubmit={handleProductSubmit} className="space-y-6 mt-10">
              <input required className="w-full bg-gray-50 border-none rounded-[1.5rem] p-5 text-sm font-bold focus:ring-2 focus:ring-[#87be00] outline-none" value={productData.name} onChange={(e) => setProductData({...productData, name: e.target.value})} placeholder="NOMBRE PRODUCTO" />
              <input required className="w-full bg-gray-50 border-none rounded-[1.5rem] p-5 text-sm font-bold focus:ring-2 focus:ring-[#87be00] outline-none" value={productData.barcode} onChange={(e) => setProductData({...productData, barcode: e.target.value})} placeholder="EAN / BARCODE" />
              <div className="grid grid-cols-2 gap-4">
                <select required className="w-full bg-gray-50 border-none rounded-[1.5rem] p-5 text-xs font-bold appearance-none" value={productData.brand_id} onChange={(e) => setProductData({...productData, brand_id: e.target.value})}>
                  <option value="">MARCA...</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select required className="w-full bg-gray-50 border-none rounded-[1.5rem] p-5 text-xs font-bold appearance-none" value={productData.category_id} onChange={(e) => setProductData({...productData, category_id: e.target.value})}>
                  <option value="">CATEGORÍA...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <button type="submit" className="w-full bg-black text-[#87be00] py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl">{isEditing ? "Actualizar" : "Registrar"}</button>
            </form>
          </div>
        </div>
      )}

      {isBrandModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-sm rounded-[3rem] p-10 relative shadow-2xl">
            <h4 className="text-2xl font-black uppercase italic mb-6 text-center">{isEditing ? "Editar" : "Nueva"} Marca</h4>
            <form onSubmit={handleBrandSubmit} className="space-y-4">
              <input required className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none border-none focus:ring-2 focus:ring-[#87be00]" placeholder="Nombre..." value={brandName} onChange={(e) => setBrandName(e.target.value)} />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-black text-[#87be00] py-4 rounded-xl font-black uppercase text-[10px]">Guardar</button>
                <button type="button" onClick={() => setIsBrandModalOpen(false)} className="flex-1 bg-gray-100 py-4 rounded-xl font-black uppercase text-[10px]">Cerrar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CatalogManager;