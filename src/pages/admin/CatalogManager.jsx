import { useEffect, useMemo, useRef, useState } from "react";
import {
  FiPlus, FiAward, FiTrash2, FiEdit2, FiTag, FiX,
  FiUploadCloud, FiRotateCw, FiPackage, FiSearch
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";

const EMPTY_PRODUCT = { name: "", barcode: "", brand_id: "", category_id: "" };

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  fallback;

const CatalogManager = () => {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [activeTab, setActiveTab] = useState("products");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  const [productModal, setProductModal] = useState(false);
  const [brandModal, setBrandModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const [editingProductId, setEditingProductId] = useState(null);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [productData, setProductData] = useState(EMPTY_PRODUCT);
  const [brandName, setBrandName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [resBrands, resProducts, resCategories] = await Promise.all([
        api.get("/routes/brands"),
        api.get("/routes/products"),
        api.get("/routes/categories")
      ]);

      setBrands(Array.isArray(resBrands) ? resBrands : resBrands?.data || []);
      setProducts(Array.isArray(resProducts) ? resProducts : resProducts?.data || []);
      setCategories(Array.isArray(resCategories) ? resCategories : resCategories?.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al sincronizar el catálogo"));
    } finally {
      setLoading(false);
    }
  };

  const brandNameById = (id) =>
    brands.find((item) => String(item.id) === String(id))?.name || "Sin marca";

  const categoryNameById = (id) =>
    categories.find((item) => String(item.id) === String(id))?.name || "Sin categoría";

  const filteredProducts = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name?.toLowerCase().includes(search) ||
        String(product.barcode || "").toLowerCase().includes(search) ||
        brandNameById(product.brand_id).toLowerCase().includes(search) ||
        categoryNameById(product.category_id).toLowerCase().includes(search);

      const matchesBrand =
        !selectedBrand || String(product.brand_id) === String(selectedBrand);

      const matchesCategory =
        !selectedCategory || String(product.category_id) === String(selectedCategory);

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [products, brands, categories, searchTerm, selectedBrand, selectedCategory]);

  const filteredBrands = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return brands.filter((item) => !search || item.name?.toLowerCase().includes(search));
  }, [brands, searchTerm]);

  const filteredCategories = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return categories.filter((item) => !search || item.name?.toLowerCase().includes(search));
  }, [categories, searchTerm]);

  const closeProductModal = () => {
    setProductModal(false);
    setEditingProductId(null);
    setProductData(EMPTY_PRODUCT);
  };

  const closeBrandModal = () => {
    setBrandModal(false);
    setEditingBrandId(null);
    setBrandName("");
  };

  const closeCategoryModal = () => {
    setCategoryModal(false);
    setEditingCategoryId(null);
    setCategoryName("");
  };

  const openNewProduct = () => {
    setEditingProductId(null);
    setProductData(EMPTY_PRODUCT);
    setProductModal(true);
  };

  const openEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductData({
      name: product.name || "",
      barcode: product.barcode || "",
      brand_id: product.brand_id || "",
      category_id: product.category_id || ""
    });
    setProductModal(true);
  };

  const openNewBrand = () => {
    setEditingBrandId(null);
    setBrandName("");
    setBrandModal(true);
  };

  const openEditBrand = (brand) => {
    setEditingBrandId(brand.id);
    setBrandName(brand.name || "");
    setBrandModal(true);
  };

  const openNewCategory = () => {
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryModal(true);
  };

  const openEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name || "");
    setCategoryModal(true);
  };

  const handleBulkUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("excel", file);

    try {
      setBulkLoading(true);
      const response = await api.post("/routes/products/bulk", formData);
      toast.success(response?.message || "Carga masiva completada");
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al procesar la carga masiva"));
    } finally {
      setBulkLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      name: productData.name.trim(),
      barcode: productData.barcode.trim(),
      brand_id: productData.brand_id,
      category_id: productData.category_id
    };

    if (!payload.name || !payload.barcode || !payload.brand_id || !payload.category_id) {
      toast.error("Completa todos los campos del producto");
      return;
    }

    const duplicate = products.some(
      (product) =>
        String(product.barcode).trim().toLowerCase() === payload.barcode.toLowerCase() &&
        String(product.id) !== String(editingProductId)
    );

    if (duplicate) {
      toast.error("Ya existe un producto con ese EAN");
      return;
    }

    try {
      setSaving(true);

      if (editingProductId) {
        await api.put(`/routes/products/${editingProductId}`, payload);
        toast.success("Producto actualizado");
      } else {
        await api.post("/routes/products", payload);
        toast.success("Producto creado");
      }

      closeProductModal();
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al guardar el producto"));
    } finally {
      setSaving(false);
    }
  };

  const handleBrandSubmit = async (event) => {
    event.preventDefault();
    const name = brandName.trim();

    if (!name) {
      toast.error("Ingresa el nombre de la marca");
      return;
    }

    const duplicate = brands.some(
      (brand) =>
        brand.name?.trim().toLowerCase() === name.toLowerCase() &&
        String(brand.id) !== String(editingBrandId)
    );

    if (duplicate) {
      toast.error("La marca ya existe");
      return;
    }

    try {
      setSaving(true);

      if (editingBrandId) {
        await api.put(`/routes/brands/${editingBrandId}`, { name });
        toast.success("Marca actualizada");
      } else {
        await api.post("/routes/brands", { name });
        toast.success("Marca creada");
      }

      closeBrandModal();
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al guardar la marca"));
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (event) => {
    event.preventDefault();
    const name = categoryName.trim();

    if (!name) {
      toast.error("Ingresa el nombre de la categoría");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name?.trim().toLowerCase() === name.toLowerCase() &&
        String(category.id) !== String(editingCategoryId)
    );

    if (duplicate) {
      toast.error("La categoría ya existe");
      return;
    }

    try {
      setSaving(true);

      if (editingCategoryId) {
        await api.put(`/routes/categories/${editingCategoryId}`, { name });
        toast.success("Categoría actualizada");
      } else {
        await api.post("/routes/categories", { name });
        toast.success("Categoría creada");
      }

      closeCategoryModal();
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "Error al guardar la categoría"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, item } = deleteTarget;

    try {
      if (type === "product") await api.delete(`/routes/products/${item.id}`);
      if (type === "brand") await api.delete(`/routes/brands/${item.id}`);
      if (type === "category") await api.delete(`/routes/categories/${item.id}`);

      toast.success("Registro eliminado");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible eliminar el registro"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 font-[Outfit]">
        <div className="w-10 h-10 border-2 border-[#87be00] border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
          Sincronizando catálogo...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16 pt-20 md:pt-6 font-[Outfit]">
      <div className="max-w-7xl mx-auto px-4 md:px-6 space-y-6">
        <header className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 md:p-8">
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-[#87be00] mb-2">
                Cultivapp · Catálogo maestro
              </p>
              <h1 className="text-3xl md:text-5xl font-black text-slate-900 uppercase italic tracking-tight leading-none">
                Productos SKU
              </h1>
              <p className="text-xs text-slate-500 mt-3">
                Administra productos, marcas y categorías desde un solo módulo.
              </p>
            </div>

            <div className="grid grid-cols-2 md:flex gap-2 w-full xl:w-auto">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={handleBulkUpload}
              />

              <ActionButton icon={<FiAward />} label="Nueva marca" onClick={openNewBrand} />
              <ActionButton icon={<FiTag />} label="Nueva categoría" onClick={openNewCategory} />

              <ActionButton
                icon={bulkLoading ? <FiRotateCw className="animate-spin" /> : <FiUploadCloud />}
                label="Carga masiva"
                onClick={() => fileInputRef.current?.click()}
                disabled={bulkLoading}
              />

              <button
                type="button"
                onClick={openNewProduct}
                className="flex items-center justify-center gap-2 bg-slate-900 text-[#87be00] px-5 py-3.5 rounded-xl font-black uppercase text-[9px] tracking-wider hover:bg-[#87be00] hover:text-white transition-all shadow-lg"
              >
                <FiPlus size={15} />
                Nuevo producto
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Productos" value={products.length} icon={<FiPackage />} />
          <StatCard label="Marcas" value={brands.length} icon={<FiAward />} />
          <StatCard label="Categorías" value={categories.length} icon={<FiTag />} />
        </section>

        <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 md:p-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex flex-col lg:flex-row gap-4 justify-between">
              <div className="flex gap-2 overflow-x-auto">
                <TabButton active={activeTab === "products"} onClick={() => setActiveTab("products")} icon={<FiPackage />} label="Productos" count={products.length} />
                <TabButton active={activeTab === "brands"} onClick={() => setActiveTab("brands")} icon={<FiAward />} label="Marcas" count={brands.length} />
                <TabButton active={activeTab === "categories"} onClick={() => setActiveTab("categories")} icon={<FiTag />} label="Categorías" count={categories.length} />
              </div>

              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative min-w-[250px]">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar..."
                    className="w-full bg-white border border-slate-200 pl-11 pr-10 py-3 rounded-xl text-xs outline-none focus:border-[#87be00]"
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <FiX />
                    </button>
                  )}
                </div>

                {activeTab === "products" && (
                  <>
                    <select value={selectedBrand} onChange={(event) => setSelectedBrand(event.target.value)} className="catalog-input">
                      <option value="">Todas las marcas</option>
                      {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                    </select>

                    <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="catalog-input">
                      <option value="">Todas las categorías</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === "products" && (
              <GridList
                items={filteredProducts}
                empty="No se encontraron productos"
                renderItem={(product) => (
                  <CatalogCard
                    key={product.id}
                    icon={<FiPackage />}
                    title={product.name}
                    subtitle={`EAN: ${product.barcode || "—"}`}
                    badges={[brandNameById(product.brand_id), categoryNameById(product.category_id)]}
                    onEdit={() => openEditProduct(product)}
                    onDelete={() => setDeleteTarget({ type: "product", item: product })}
                  />
                )}
              />
            )}

            {activeTab === "brands" && (
              <GridList
                items={filteredBrands}
                empty="No se encontraron marcas"
                renderItem={(brand) => {
                  const count = products.filter((p) => String(p.brand_id) === String(brand.id)).length;
                  return (
                    <CatalogCard
                      key={brand.id}
                      icon={<FiAward />}
                      title={brand.name}
                      subtitle={`${count} productos asociados`}
                      onEdit={() => openEditBrand(brand)}
                      onDelete={() => {
                        if (count > 0) return toast.error("La marca tiene productos asociados");
                        setDeleteTarget({ type: "brand", item: brand });
                      }}
                    />
                  );
                }}
              />
            )}

            {activeTab === "categories" && (
              <GridList
                items={filteredCategories}
                empty="No se encontraron categorías"
                renderItem={(category) => {
                  const count = products.filter((p) => String(p.category_id) === String(category.id)).length;
                  return (
                    <CatalogCard
                      key={category.id}
                      icon={<FiTag />}
                      title={category.name}
                      subtitle={`${count} productos asociados`}
                      onEdit={() => openEditCategory(category)}
                      onDelete={() => {
                        if (count > 0) return toast.error("La categoría tiene productos asociados");
                        setDeleteTarget({ type: "category", item: category });
                      }}
                    />
                  );
                }}
              />
            )}
          </div>
        </section>
      </div>

      {productModal && (
        <Modal title={editingProductId ? "Editar producto" : "Nuevo producto"} onClose={closeProductModal}>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <InputField label="Nombre" value={productData.name} onChange={(value) => setProductData({ ...productData, name: value })} />
            <InputField label="EAN" value={productData.barcode} onChange={(value) => setProductData({ ...productData, barcode: value })} />

            <div className="grid md:grid-cols-2 gap-4">
              <SelectField label="Marca" value={productData.brand_id} onChange={(value) => setProductData({ ...productData, brand_id: value })} options={brands} />
              <SelectField label="Categoría" value={productData.category_id} onChange={(value) => setProductData({ ...productData, category_id: value })} options={categories} />
            </div>

            <ModalActions loading={saving} onCancel={closeProductModal} />
          </form>
        </Modal>
      )}

      {brandModal && (
        <Modal title={editingBrandId ? "Editar marca" : "Nueva marca"} onClose={closeBrandModal}>
          <form onSubmit={handleBrandSubmit} className="space-y-4">
            <InputField label="Nombre de la marca" value={brandName} onChange={setBrandName} />
            <ModalActions loading={saving} onCancel={closeBrandModal} />
          </form>
        </Modal>
      )}

      {categoryModal && (
        <Modal title={editingCategoryId ? "Editar categoría" : "Nueva categoría"} onClose={closeCategoryModal}>
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <InputField label="Nombre de la categoría" value={categoryName} onChange={setCategoryName} />
            <ModalActions loading={saving} onCancel={closeCategoryModal} />
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDelete
          item={deleteTarget.item}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      )}

      <style>{`
        .catalog-input {
          border: 1px solid rgb(226 232 240);
          background: white;
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgb(71 85 105);
          outline: none;
        }
        .catalog-input:focus { border-color: #87be00; }
      `}</style>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-3.5 rounded-xl font-black uppercase text-[9px] tracking-wider hover:border-[#87be00] hover:text-[#87be00] transition-all disabled:opacity-50">
    {icon}{label}
  </button>
);

const StatCard = ({ label, value, icon }) => (
  <div className="bg-white border border-slate-100 shadow-sm rounded-2xl p-5 flex items-center justify-between">
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="text-3xl font-black text-slate-900 mt-2">{value}</p>
    </div>
    <div className="w-11 h-11 rounded-xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center">{icon}</div>
  </div>
);

const TabButton = ({ active, onClick, icon, label, count }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-wider whitespace-nowrap ${active ? "bg-[#87be00] text-white shadow-md" : "bg-white text-slate-500 border border-slate-200"}`}>
    {icon}{label}<span className="px-2 py-0.5 rounded-full bg-black/10">{count}</span>
  </button>
);

const GridList = ({ items, empty, renderItem }) =>
  items.length ? (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">{items.map(renderItem)}</div>
  ) : (
    <div className="py-16 text-center text-sm font-bold text-slate-400">{empty}</div>
  );

const CatalogCard = ({ icon, title, subtitle, badges = [], onEdit, onDelete }) => (
  <article className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-[#87be00] hover:shadow-lg transition-all">
    <div className="flex items-start justify-between gap-3">
      <div className="w-11 h-11 rounded-xl bg-[#87be00]/10 text-[#87be00] flex items-center justify-center">{icon}</div>
      <div className="flex gap-1.5">
        <button type="button" onClick={onEdit} className="p-2.5 rounded-lg bg-slate-50 text-slate-500 hover:bg-[#87be00] hover:text-white"><FiEdit2 size={13} /></button>
        <button type="button" onClick={onDelete} className="p-2.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-600 hover:text-white"><FiTrash2 size={13} /></button>
      </div>
    </div>
    <h3 className="text-sm font-black uppercase text-slate-900 mt-4 truncate">{title}</h3>
    <p className="text-[10px] text-slate-400 mt-1">{subtitle}</p>
    {badges.length > 0 && (
      <div className="flex flex-wrap gap-2 mt-4">
        {badges.map((badge, index) => (
          <span key={`${badge}-${index}`} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[8px] font-black uppercase text-slate-500">{badge}</span>
        ))}
      </div>
    )}
  </article>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
    <div className="bg-white w-full max-w-xl rounded-[2rem] shadow-2xl overflow-hidden">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <h2 className="text-lg font-black uppercase italic text-slate-900">{title}</h2>
        <button type="button" onClick={onClose} className="p-2 rounded-lg bg-slate-50 text-slate-400"><FiX /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const InputField = ({ label, value, onChange }) => (
  <label className="block">
    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2">{label}</span>
    <input value={value} onChange={(event) => onChange(event.target.value)} className="w-full catalog-input bg-slate-50" />
  </label>
);

const SelectField = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-500 mb-2">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full catalog-input bg-slate-50">
      <option value="">Seleccionar</option>
      {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
    </select>
  </label>
);

const ModalActions = ({ loading, onCancel }) => (
  <div className="grid grid-cols-2 gap-3 pt-3">
    <button type="button" onClick={onCancel} disabled={loading} className="py-3.5 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[9px]">Cancelar</button>
    <button type="submit" disabled={loading} className="py-3.5 rounded-xl bg-slate-900 text-[#87be00] font-black uppercase text-[9px] flex items-center justify-center gap-2">
      {loading && <FiRotateCw className="animate-spin" />} {loading ? "Guardando..." : "Guardar"}
    </button>
  </div>
);

const ConfirmDelete = ({ item, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
    <div className="bg-white w-full max-w-md rounded-[2rem] p-7 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center"><FiTrash2 size={22} /></div>
      <h2 className="text-lg font-black uppercase italic text-slate-900 mt-5">Confirmar eliminación</h2>
      <p className="text-xs text-slate-500 mt-3">¿Eliminar “{item.name}”? Esta acción no se puede revertir.</p>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button type="button" onClick={onClose} className="py-3 rounded-xl bg-slate-100 text-slate-500 font-black uppercase text-[9px]">Cancelar</button>
        <button type="button" onClick={onConfirm} className="py-3 rounded-xl bg-rose-600 text-white font-black uppercase text-[9px]">Eliminar</button>
      </div>
    </div>
  </div>
);

export default CatalogManager;