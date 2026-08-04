import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  FiPlus, FiAward, FiTrash2, FiEdit2, FiTag, FiX,
  FiUploadCloud, FiRotateCw, FiPackage, FiSearch,
  FiHelpCircle, FiDownload, FiCheckCircle, FiAlertCircle,
  FiBriefcase, FiChevronDown
} from "react-icons/fi";
import api from "../../api/apiClient";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const CULTIVA_COMPANY_ID =
  "0e342e01-d213-4353-b210-39a12ac335cf";

const CULTIVA_BULK_ADMIN_USER_ID =
  "97c6f210-eccc-48fe-b6b9-65dcf5968857";

const DEFAULT_CATALOG_NAME =
  "Otro";

const DEFAULT_PRODUCT_NAME =
  "Otro";

const DEFAULT_ALTERNATIVE_EAN =
  "ALTERNATIVO";

const EMPTY_PRODUCT = {
  name: "",
  barcode: "",
  brand_id: "",
  category_id: "",
  company_id: "",
};

const getResponseData = (
  response,
  fallback = [],
) => {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return fallback;
};

const buildCompanyQuery = (
  companyId,
) =>
  companyId
    ? `?company_id=${encodeURIComponent(
        companyId,
      )}`
    : "";

const normalizeCatalogName = (
  value,
) =>
  String(value || "")
    .trim()
    .toLocaleLowerCase(
      "es",
    );

const findOtherCatalogItem = (
  items,
) =>
  (
    Array.isArray(items)
      ? items
      : []
  ).find(
    (item) =>
      normalizeCatalogName(
        item?.name,
      ) ===
      normalizeCatalogName(
        DEFAULT_CATALOG_NAME,
      ),
  ) ||
  null;

const findDefaultProduct = (
  products,
) =>
  (
    Array.isArray(products)
      ? products
      : []
  ).find(
    (product) =>
      normalizeCatalogName(
        product?.name,
      ) ===
      normalizeCatalogName(
        DEFAULT_PRODUCT_NAME,
      ),
  ) ||
  null;

const getCreatedEntity = (
  response,
) => {
  const candidates = [
    response?.data,
    response?.item,
    response?.brand,
    response?.category,
    response?.product,
    response,
  ];

  return (
    candidates.find(
      (candidate) =>
        candidate &&
        typeof candidate ===
          "object" &&
        !Array.isArray(
          candidate,
        ) &&
        (
          candidate.id ||
          candidate.name
        ),
    ) ||
    null
  );
};

const isDuplicateCatalogError = (
  error,
) => {
  const status =
    error?.response?.status ??
    error?.status ??
    null;

  const message =
    String(
      error?.response?.data?.message ||
      error?.data?.message ||
      error?.message ||
      "",
    ).toLocaleLowerCase(
      "es",
    );

  return (
    status === 409 ||
    message.includes(
      "ya existe",
    ) ||
    message.includes(
      "duplic",
    ) ||
    message.includes(
      "unique",
    )
  );
};

const buildAlternativeBarcode = (
  companyId,
  products = [],
) => {
  const companyKey =
    String(
      companyId ||
      "EMPRESA",
    )
      .replace(
        /[^a-zA-Z0-9]/g,
        "",
      )
      .slice(
        0,
        8,
      )
      .toUpperCase() ||
    "EMPRESA";

  const baseBarcode =
    `${DEFAULT_ALTERNATIVE_EAN}-${companyKey}`;

  const usedBarcodes =
    new Set(
      (
        Array.isArray(products)
          ? products
          : []
      )
        .map(
          (product) =>
            String(
              product?.barcode ||
              "",
            )
              .trim()
              .toUpperCase(),
        )
        .filter(Boolean),
    );

  if (
    !usedBarcodes.has(
      baseBarcode,
    )
  ) {
    return baseBarcode;
  }

  let counter = 2;

  while (
    usedBarcodes.has(
      `${baseBarcode}-${counter}`,
    )
  ) {
    counter += 1;
  }

  return `${baseBarcode}-${counter}`;
};

const defaultCatalogPromises =
  new Map();

const fetchCompanyCatalog =
  async (
    companyId,
  ) => {
    const query =
      buildCompanyQuery(
        companyId,
      );

    const [
      brandsResponse,
      categoriesResponse,
      productsResponse,
    ] = await Promise.all([
      api.get(
        `/routes/brands${query}`,
      ),
      api.get(
        `/routes/categories${query}`,
      ),
      api.get(
        `/routes/products${query}`,
      ),
    ]);

    return {
      brands:
        getResponseData(
          brandsResponse,
          [],
        ),

      categories:
        getResponseData(
          categoriesResponse,
          [],
        ),

      products:
        getResponseData(
          productsResponse,
          [],
        ),
    };
  };

const ensureDefaultCatalogForCompany =
  async (
    companyId,
    initialCatalog = null,
  ) => {
    const normalizedCompanyId =
      String(
        companyId ||
        "",
      ).trim();

    if (!normalizedCompanyId) {
      return false;
    }

    if (
      defaultCatalogPromises.has(
        normalizedCompanyId,
      )
    ) {
      return defaultCatalogPromises.get(
        normalizedCompanyId,
      );
    }

    const promise =
      (async () => {
        const query =
          buildCompanyQuery(
            normalizedCompanyId,
          );

        let catalog =
          initialCatalog ||
          await fetchCompanyCatalog(
            normalizedCompanyId,
          );

        let brands =
          Array.isArray(
            catalog?.brands,
          )
            ? catalog.brands
            : [];

        let categories =
          Array.isArray(
            catalog?.categories,
          )
            ? catalog.categories
            : [];

        let products =
          Array.isArray(
            catalog?.products,
          )
            ? catalog.products
            : [];

        let defaultBrand =
          findOtherCatalogItem(
            brands,
          );

        let defaultCategory =
          findOtherCatalogItem(
            categories,
          );

        let changed = false;

        if (!defaultBrand) {
          try {
            const response =
              await api.post(
                `/routes/brands${query}`,
                {
                  name:
                    DEFAULT_CATALOG_NAME,
                  company_id:
                    normalizedCompanyId,
                },
              );

            defaultBrand =
              getCreatedEntity(
                response,
              );

            changed = true;
          } catch (error) {
            if (
              !isDuplicateCatalogError(
                error,
              )
            ) {
              throw error;
            }
          }
        }

        if (!defaultCategory) {
          try {
            const response =
              await api.post(
                `/routes/categories${query}`,
                {
                  name:
                    DEFAULT_CATALOG_NAME,
                  company_id:
                    normalizedCompanyId,
                },
              );

            defaultCategory =
              getCreatedEntity(
                response,
              );

            changed = true;
          } catch (error) {
            if (
              !isDuplicateCatalogError(
                error,
              )
            ) {
              throw error;
            }
          }
        }

        if (
          !defaultBrand?.id ||
          !defaultCategory?.id
        ) {
          const refreshed =
            await fetchCompanyCatalog(
              normalizedCompanyId,
            );

          brands =
            refreshed.brands;

          categories =
            refreshed.categories;

          products =
            refreshed.products;

          defaultBrand =
            findOtherCatalogItem(
              brands,
            );

          defaultCategory =
            findOtherCatalogItem(
              categories,
            );
        }

        const refreshedCatalog =
          await fetchCompanyCatalog(
            normalizedCompanyId,
          );

        brands =
          refreshedCatalog.brands;

        categories =
          refreshedCatalog.categories;

        products =
          refreshedCatalog.products;

        defaultBrand =
          findOtherCatalogItem(
            brands,
          );

        defaultCategory =
          findOtherCatalogItem(
            categories,
          );

        let defaultProduct =
          findDefaultProduct(
            products,
          );

        if (
          !defaultProduct &&
          defaultBrand?.id &&
          defaultCategory?.id
        ) {
          const createDefaultProduct =
            async (
              barcode,
            ) =>
              api.post(
                `/routes/products${query}`,
                {
                  name:
                    DEFAULT_PRODUCT_NAME,

                  barcode,

                  brand_id:
                    defaultBrand.id,

                  category_id:
                    defaultCategory.id,

                  company_id:
                    normalizedCompanyId,
                },
              );

          const alternativeBarcode =
            buildAlternativeBarcode(
              normalizedCompanyId,
              products,
            );

          try {
            const response =
              await createDefaultProduct(
                alternativeBarcode,
              );

            defaultProduct =
              getCreatedEntity(
                response,
              );

            changed = true;

            console.log(
              "✅ Producto predeterminado creado:",
              {
                company_id:
                  normalizedCompanyId,
                product:
                  DEFAULT_PRODUCT_NAME,
                barcode:
                  alternativeBarcode,
              },
            );
          } catch (error) {
            if (
              !isDuplicateCatalogError(
                error,
              )
            ) {
              throw error;
            }

            const afterDuplicate =
              await fetchCompanyCatalog(
                normalizedCompanyId,
              );

            defaultProduct =
              findDefaultProduct(
                afterDuplicate.products,
              );

            if (!defaultProduct) {
              const retryBarcode =
                `${alternativeBarcode}-${Date.now()
                  .toString(36)
                  .toUpperCase()}`;

              await createDefaultProduct(
                retryBarcode,
              );

              changed = true;
            }
          }
        }

        return changed;
      })();

    defaultCatalogPromises.set(
      normalizedCompanyId,
      promise,
    );

    try {
      return await promise;
    } finally {
      defaultCatalogPromises.delete(
        normalizedCompanyId,
      );
    }
  };

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.data?.message ||
  error?.message ||
  fallback;

const CatalogManager = () => {
  const currentUser =
    useMemo(() => {
      try {
        const storedUser =
          localStorage.getItem(
            "user",
          );

        return storedUser
          ? JSON.parse(
              storedUser,
            )
          : null;
      } catch {
        return null;
      }
    }, []);

  const normalizedRole =
    String(
      currentUser?.role ||
      "",
    ).toUpperCase();

  const isCultivaAdmin =
    normalizedRole ===
      "ADMIN_CLIENTE" &&
    String(
      currentUser?.company_id ||
      "",
    ) ===
      CULTIVA_COMPANY_ID;

  /*
   * Acceso global al catálogo:
   * - cualquier usuario cuyo perfil sea ROOT;
   * - ADMIN_CLIENTE perteneciente a la empresa Cultiva.
   *
   * Ya no se restringe ROOT a un user_id específico.
   */
  const isRoot =
    normalizedRole ===
      "ROOT";

  const normalizedCurrentUserId =
    String(
      currentUser?.id ||
      currentUser?.user_id ||
      "",
    ).trim();

  /*
   * Selector de empresa exclusivo para la carga masiva:
   * - todos los ROOT;
   * - ADMIN_CLIENTE Cultiva con el ID autorizado.
   */
  const isCultivaBulkAdmin =
    normalizedRole ===
      "ADMIN_CLIENTE" &&
    normalizedCurrentUserId ===
      CULTIVA_BULK_ADMIN_USER_ID;

  const canSelectBulkCompany =
    isRoot ||
    isCultivaBulkAdmin;

  const canManageCompanies =
    isRoot ||
    isCultivaAdmin;

  const canAccessCompanyList =
    canManageCompanies ||
    canSelectBulkCompany;

  const [companies, setCompanies] =
    useState([]);

  const [
    selectedCompanyId,
    setSelectedCompanyId,
  ] = useState("");

  const effectiveCompanyId =
    canManageCompanies
      ? selectedCompanyId
      : currentUser?.company_id ||
        "";

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
  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [bulkHelpModal, setBulkHelpModal] = useState(false);
  const [brandModal, setBrandModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const [editingProductId, setEditingProductId] = useState(null);
  const [editingBrandId, setEditingBrandId] = useState(null);
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [productData, setProductData] =
    useState(EMPTY_PRODUCT);

  const [
    productModalBrands,
    setProductModalBrands,
  ] = useState([]);

  const [
    productModalCategories,
    setProductModalCategories,
  ] = useState([]);

  const [
    productOptionsLoading,
    setProductOptionsLoading,
  ] = useState(false);

  const [brandName, setBrandName] = useState("");
  const [
    brandCompanyId,
    setBrandCompanyId,
  ] = useState("");

  const [categoryName, setCategoryName] = useState("");
  const [
    categoryCompanyId,
    setCategoryCompanyId,
  ] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  const selectedCompany =
    useMemo(
      () =>
        companies.find(
          (company) =>
            String(
              company.id,
            ) ===
            String(
              selectedCompanyId,
            ),
        ) || null,
      [
        companies,
        selectedCompanyId,
      ],
    );

  const companyNameById = (
    companyId,
  ) => {
    if (!companyId) {
      return "";
    }

    const company =
      companies.find(
        (item) =>
          String(item.id) ===
          String(companyId),
      );

    return (
      company?.name ||
      company?.nombre ||
      (
        String(
          currentUser?.company_id ||
          "",
        ) ===
        String(companyId)
          ? currentUser?.company_name ||
            currentUser?.company?.name ||
            "Mi empresa"
          : "Empresa"
      )
    );
  };

  const scopeItemsToCompany = (
    items,
  ) => {
    if (
      !effectiveCompanyId
    ) {
      return items;
    }

    const hasCompanyField =
      items.some(
        (item) =>
          item?.company_id,
      );

    if (!hasCompanyField) {
      return items;
    }

    return items.filter(
      (item) =>
        String(
          item.company_id,
        ) ===
        String(
          effectiveCompanyId,
        ),
    );
  };

  const loadCompanies =
    useCallback(async () => {
      if (!canAccessCompanyList) {
        setCompanies([]);
        return;
      }

      try {
        const response =
          await api.get(
            "/companies",
          );

        const companyData =
          getResponseData(
            response,
            [],
          )
            .filter(
              (company) =>
                company?.is_active !==
                false,
            )
            .sort(
              (first, second) =>
                String(
                  first?.name ||
                  first?.nombre ||
                  "",
                ).localeCompare(
                  String(
                    second?.name ||
                    second?.nombre ||
                    "",
                  ),
                  "es",
                ),
            );

        setCompanies(
          companyData,
        );
      } catch (error) {
        console.error(
          "Error cargando empresas del catálogo:",
          error,
        );

        setCompanies([]);

        toast.error(
          getErrorMessage(
            error,
            "No se pudieron cargar las empresas",
          ),
        );
      }
    }, [
      canAccessCompanyList,
    ]);

  const loadData =
    useCallback(async () => {
      try {
        setLoading(
          true,
        );

        const query =
          buildCompanyQuery(
            effectiveCompanyId,
          );

        const readCatalog =
          async () => {
            const [
              resBrands,
              resProducts,
              resCategories,
            ] = await Promise.all([
              api.get(
                `/routes/brands${query}`,
              ),
              api.get(
                `/routes/products${query}`,
              ),
              api.get(
                `/routes/categories${query}`,
              ),
            ]);

            return {
              brands:
                scopeItemsToCompany(
                  getResponseData(
                    resBrands,
                    [],
                  ),
                ),

              products:
                scopeItemsToCompany(
                  getResponseData(
                    resProducts,
                    [],
                  ),
                ),

              categories:
                scopeItemsToCompany(
                  getResponseData(
                    resCategories,
                    [],
                  ),
                ),
            };
          };

        let catalog =
          await readCatalog();

        let changed = false;

        const targetCompanyIds =
          effectiveCompanyId
            ? [
                String(
                  effectiveCompanyId,
                ),
              ]
            : (
                canManageCompanies
                  ? companies
                      .map(
                        (company) =>
                          company?.id,
                      )
                      .filter(Boolean)
                      .map(String)
                  : []
              );

        for (
          const companyId of
          targetCompanyIds
        ) {
          const isSingleCompany =
            Boolean(
              effectiveCompanyId,
            );

          const hasCompanyFields =
            [
              ...catalog.brands,
              ...catalog.categories,
              ...catalog.products,
            ].some(
              (item) =>
                item?.company_id,
            );

          const initialCatalog =
            isSingleCompany
              ? catalog
              : (
                  hasCompanyFields
                    ? {
                        brands:
                          catalog.brands.filter(
                            (item) =>
                              String(
                                item.company_id,
                              ) ===
                              String(
                                companyId,
                              ),
                          ),

                        categories:
                          catalog.categories.filter(
                            (item) =>
                              String(
                                item.company_id,
                              ) ===
                              String(
                                companyId,
                              ),
                          ),

                        products:
                          catalog.products.filter(
                            (item) =>
                              String(
                                item.company_id,
                              ) ===
                              String(
                                companyId,
                              ),
                          ),
                      }
                    : null
                );

          const companyChanged =
            await ensureDefaultCatalogForCompany(
              companyId,
              initialCatalog,
            );

          changed =
            changed ||
            companyChanged;
        }

        if (changed) {
          catalog =
            await readCatalog();

          toast.success(
            "Se garantizó Marca Otro, Categoría Otro y Producto Otro con EAN alternativo.",
          );
        }

        setBrands(
          catalog.brands,
        );

        setProducts(
          catalog.products,
        );

        setCategories(
          catalog.categories,
        );
      } catch (error) {
        console.error(
          "Error sincronizando catálogo:",
          error,
        );

        toast.error(
          getErrorMessage(
            error,
            "Error al sincronizar el catálogo",
          ),
        );
      } finally {
        setLoading(
          false,
        );
      }
    }, [
      canManageCompanies,
      companies,
      effectiveCompanyId,
    ]);

  useEffect(() => {
    loadCompanies();
  }, [
    loadCompanies,
  ]);

  useEffect(() => {
    loadData();
  }, [
    loadData,
  ]);

  useEffect(() => {
    setSearchTerm("");
    setSelectedBrand("");
    setSelectedCategory("");
    setActiveTab(
      "products",
    );
  }, [
    selectedCompanyId,
  ]);

  const requireTargetCompany =
    (
      actionLabel =
        "realizar esta acción",
    ) => {
      const targetCompanyId =
        effectiveCompanyId ||
        currentUser?.company_id ||
        "";

      if (
        canManageCompanies &&
        !targetCompanyId
      ) {
        toast.error(
          `Selecciona una empresa para ${actionLabel}.`,
        );

        return null;
      }

      if (!targetCompanyId) {
        toast.error(
          "No fue posible identificar la empresa del usuario.",
        );

        return null;
      }

      return String(
        targetCompanyId,
      );
    };


  const loadProductOptions =
    useCallback(
      async (
        companyId,
      ) => {
        if (!companyId) {
          setProductModalBrands(
            [],
          );

          setProductModalCategories(
            [],
          );

          return {
            brands:
              [],
            categories:
              [],
          };
        }

        try {
          setProductOptionsLoading(
            true,
          );

          await ensureDefaultCatalogForCompany(
            companyId,
          );

          const query =
            buildCompanyQuery(
              companyId,
            );

          const [
            brandsResponse,
            categoriesResponse,
          ] = await Promise.all([
            api.get(
              `/routes/brands${query}`,
            ),
            api.get(
              `/routes/categories${query}`,
            ),
          ]);

          const brandsData =
            getResponseData(
              brandsResponse,
              [],
            );

          const categoriesData =
            getResponseData(
              categoriesResponse,
              [],
            );

          const filteredBrands =
            brandsData.some(
              (brand) =>
                brand?.company_id,
            )
              ? brandsData.filter(
                  (brand) =>
                    String(
                      brand.company_id,
                    ) ===
                    String(
                      companyId,
                    ),
                )
              : brandsData;

          const filteredCategories =
            categoriesData.some(
              (category) =>
                category?.company_id,
            )
              ? categoriesData.filter(
                  (category) =>
                    String(
                      category.company_id,
                    ) ===
                    String(
                      companyId,
                    ),
                )
              : categoriesData;

          setProductModalBrands(
            filteredBrands,
          );

          setProductModalCategories(
            filteredCategories,
          );

          return {
            brands:
              filteredBrands,
            categories:
              filteredCategories,
          };
        } catch (error) {
          console.error(
            "Error cargando opciones del producto:",
            error,
          );

          setProductModalBrands(
            [],
          );

          setProductModalCategories(
            [],
          );

          toast.error(
            getErrorMessage(
              error,
              "No se pudieron cargar las marcas y categorías de la empresa",
            ),
          );

          return {
            brands:
              [],
            categories:
              [],
          };
        } finally {
          setProductOptionsLoading(
            false,
          );
        }
      },
      [],
    );

  const brandNameById = (id) =>
    brands.find(
      (item) =>
        String(item.id) ===
        String(id),
    )?.name ||
    DEFAULT_CATALOG_NAME;

  const categoryNameById = (id) =>
    categories.find(
      (item) =>
        String(item.id) ===
        String(id),
    )?.name ||
    DEFAULT_CATALOG_NAME;

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
    setProductData(
      EMPTY_PRODUCT,
    );
    setProductModalBrands(
      [],
    );
    setProductModalCategories(
      [],
    );
    setProductOptionsLoading(
      false,
    );
  };

  const closeBrandModal = () => {
    setBrandModal(false);
    setEditingBrandId(null);
    setBrandName("");
    setBrandCompanyId("");
  };

  const closeCategoryModal = () => {
    setCategoryModal(false);
    setEditingCategoryId(null);
    setCategoryName("");
    setCategoryCompanyId("");
  };

  const openNewProduct =
    async () => {
      const defaultCompanyId =
        canManageCompanies
          ? selectedCompanyId
          : currentUser?.company_id ||
            "";

      setEditingProductId(
        null,
      );

      setProductData({
        ...EMPTY_PRODUCT,

        company_id:
          defaultCompanyId,

        barcode:
          buildAlternativeBarcode(
            defaultCompanyId,
            products,
          ),
      });

      setProductModal(
        true,
      );

      const options =
        await loadProductOptions(
          defaultCompanyId,
        );

      const defaultBrand =
        findOtherCatalogItem(
          options.brands,
        ) ||
        options.brands[0] ||
        null;

      const defaultCategory =
        findOtherCatalogItem(
          options.categories,
        ) ||
        options.categories[0] ||
        null;

      setProductData(
        (current) => ({
          ...current,

          brand_id:
            defaultBrand?.id ||
            "",

          category_id:
            defaultCategory?.id ||
            "",
        }),
      );
    };

  const openEditProduct =
    async (product) => {
      const companyId =
        product.company_id ||
        effectiveCompanyId ||
        currentUser?.company_id ||
        "";

      setEditingProductId(
        product.id,
      );

      setProductData({
        name:
          product.name || "",
        barcode:
          product.barcode || "",
        brand_id:
          product.brand_id || "",
        category_id:
          product.category_id || "",
        company_id:
          companyId,
      });

      setProductModal(
        true,
      );

      const options =
        await loadProductOptions(
          companyId,
        );

      setProductData(
        (current) => ({
          ...current,

          brand_id:
            current.brand_id ||
            findOtherCatalogItem(
              options.brands,
            )?.id ||
            options.brands[0]
              ?.id ||
            "",

          category_id:
            current.category_id ||
            findOtherCatalogItem(
              options.categories,
            )?.id ||
            options.categories[0]
              ?.id ||
            "",
        }),
      );
    };

  const openNewBrand = () => {
    const defaultCompanyId =
      canManageCompanies
        ? selectedCompanyId
        : currentUser?.company_id ||
          "";

    setEditingBrandId(
      null,
    );

    setBrandName(
      "",
    );

    setBrandCompanyId(
      defaultCompanyId,
    );

    setBrandModal(
      true,
    );
  };

  const openEditBrand = (brand) => {
    setEditingBrandId(brand.id);
    setBrandName(brand.name || "");
    setBrandCompanyId(
      brand.company_id ||
      effectiveCompanyId ||
      currentUser?.company_id ||
      "",
    );
    setBrandModal(true);
  };

  const openNewCategory = () => {
    const defaultCompanyId =
      canManageCompanies
        ? selectedCompanyId
        : currentUser?.company_id ||
          "";

    setEditingCategoryId(
      null,
    );

    setCategoryName(
      "",
    );

    setCategoryCompanyId(
      defaultCompanyId,
    );

    setCategoryModal(
      true,
    );
  };

  const openEditCategory = (category) => {
    setEditingCategoryId(category.id);
    setCategoryName(category.name || "");
    setCategoryCompanyId(
      category.company_id ||
      effectiveCompanyId ||
      currentUser?.company_id ||
      "",
    );
    setCategoryModal(true);
  };

  const openBulkUpload = () => {
    setBulkUploadModal(
      true,
    );
  };

  const closeBulkUpload = () => {
    if (bulkLoading) {
      return;
    }

    setBulkUploadModal(
      false,
    );
  };

  const handleBulkUpload = async ({
    file,
    companyId,
  }) => {
    const targetCompanyId =
      String(
        companyId ||
        (
          !canSelectBulkCompany
            ? currentUser?.company_id
            : ""
        ) ||
        "",
      ).trim();

    if (!targetCompanyId) {
      throw new Error(
        "Selecciona la empresa donde se realizará la carga masiva.",
      );
    }

    if (!file) {
      throw new Error(
        "Selecciona un archivo para realizar la carga masiva.",
      );
    }

    const formData =
      new FormData();

    /*
     * Se mantiene el nombre esperado por el backend:
     * upload.single("excel")
     */
    formData.append(
      "excel",
      file,
    );

    formData.append(
      "company_id",
      targetCompanyId,
    );

    try {
      setBulkLoading(
        true,
      );

      /*
       * No agregar Content-Type manualmente.
       * Axios y el navegador generan el boundary.
       */
      const response =
        await api.post(
          `/routes/products/bulk${buildCompanyQuery(
            targetCompanyId,
          )}`,
          formData,
        );

      const successMessage =
        "Productos cargados correctamente.";

      toast.success(
        successMessage,
      );

      await loadData();

      /*
       * Cerrar el modal únicamente cuando la carga
       * masiva finaliza correctamente.
       */
      setBulkUploadModal(
        false,
      );

      return {
        ...(response &&
        typeof response ===
          "object"
          ? response
          : {}),
        message:
          successMessage,
      };
    } catch (error) {
      const message =
        getErrorMessage(
          error,
          "Error al procesar la carga masiva",
        );

      toast.error(
        message,
      );

      throw error;
    } finally {
      setBulkLoading(
        false,
      );
    }
  };

  const handleProductSubmit = async (event) => {
    event.preventDefault();

    const companyId =
      productData.company_id ||
      (
        !canManageCompanies
          ? currentUser?.company_id
          : ""
      );

    if (!companyId) {
      toast.error(
        "Selecciona la empresa donde se creará el producto.",
      );

      return;
    }

    const payload = {
      name:
        productData.name.trim(),

      barcode:
        productData.barcode.trim() ||
        buildAlternativeBarcode(
          companyId,
          products,
        ),

      brand_id:
        productData.brand_id,

      category_id:
        productData.category_id,

      company_id:
        companyId,
    };

    if (
      !payload.name ||
      !payload.brand_id ||
      !payload.category_id
    ) {
      toast.error(
        "Completa el nombre, la marca y la categoría del producto",
      );

      return;
    }

    const duplicate = products.some(
      (product) =>
        String(product.barcode).trim().toLowerCase() === payload.barcode.toLowerCase() &&
        String(product.id) !== String(editingProductId) &&
        (
          !product.company_id ||
          String(product.company_id) ===
            String(companyId)
        )
    );

    if (duplicate) {
      toast.error("Ya existe un producto con ese EAN");
      return;
    }

    try {
      setSaving(true);

      if (editingProductId) {
        await api.put(
          `/routes/products/${editingProductId}${buildCompanyQuery(
            companyId,
          )}`,
          payload,
        );
        toast.success("Producto actualizado");
      } else {
        await api.post(
          `/routes/products${buildCompanyQuery(
            companyId,
          )}`,
          payload,
        );
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

    const companyId =
      brandCompanyId ||
      (
        !canManageCompanies
          ? currentUser?.company_id
          : ""
      );

    if (!companyId) {
      toast.error(
        "Selecciona la empresa donde se creará la marca.",
      );

      return;
    }

    if (!name) {
      toast.error("Ingresa el nombre de la marca");
      return;
    }

    const duplicate = brands.some(
      (brand) =>
        brand.name?.trim().toLowerCase() === name.toLowerCase() &&
        String(brand.id) !== String(editingBrandId) &&
        (
          !brand.company_id ||
          String(brand.company_id) ===
            String(companyId)
        )
    );

    if (duplicate) {
      toast.error("La marca ya existe");
      return;
    }

    try {
      setSaving(true);

      if (editingBrandId) {
        await api.put(
          `/routes/brands/${editingBrandId}${buildCompanyQuery(
            companyId,
          )}`,
          {
            name,
            company_id:
              companyId,
          },
        );
        toast.success("Marca actualizada");
      } else {
        await api.post(
          `/routes/brands${buildCompanyQuery(
            companyId,
          )}`,
          {
            name,
            company_id:
              companyId,
          },
        );
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

    const companyId =
      categoryCompanyId ||
      (
        !canManageCompanies
          ? currentUser?.company_id
          : ""
      );

    if (!companyId) {
      toast.error(
        "Selecciona la empresa donde se creará la categoría.",
      );

      return;
    }

    if (!name) {
      toast.error("Ingresa el nombre de la categoría");
      return;
    }

    const duplicate = categories.some(
      (category) =>
        category.name?.trim().toLowerCase() === name.toLowerCase() &&
        String(category.id) !== String(editingCategoryId) &&
        (
          !category.company_id ||
          String(category.company_id) ===
            String(companyId)
        )
    );

    if (duplicate) {
      toast.error("La categoría ya existe");
      return;
    }

    try {
      setSaving(true);

      if (editingCategoryId) {
        await api.put(
          `/routes/categories/${editingCategoryId}${buildCompanyQuery(
            companyId,
          )}`,
          {
            name,
            company_id:
              companyId,
          },
        );
        toast.success("Categoría actualizada");
      } else {
        await api.post(
          `/routes/categories${buildCompanyQuery(
            companyId,
          )}`,
          {
            name,
            company_id:
              companyId,
          },
        );
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
      const companyId =
        item.company_id ||
        effectiveCompanyId ||
        currentUser?.company_id ||
        "";

      const companyQuery =
        buildCompanyQuery(
          companyId,
        );

      if (type === "product") {
        await api.delete(
          `/routes/products/${item.id}${companyQuery}`,
        );
      }

      if (type === "brand") {
        await api.delete(
          `/routes/brands/${item.id}${companyQuery}`,
        );
      }

      if (type === "category") {
        await api.delete(
          `/routes/categories/${item.id}${companyQuery}`,
        );
      }

      toast.success("Registro eliminado");
      setDeleteTarget(null);
      await loadData();
    } catch (error) {
      toast.error(getErrorMessage(error, "No fue posible eliminar el registro"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center font-[Outfit]">
        <div className="h-11 w-11 animate-spin rounded-full border-[3px] border-[#87be00]/20 border-t-[#87be00]" />
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-gray-400">
          Sincronizando catálogo...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/60 pb-20 pt-20 font-[Outfit] md:pt-6">
      <div className="mx-auto max-w-7xl space-y-5 px-3 sm:px-5 md:px-8">
        <header className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm sm:p-7 md:p-8">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-center">
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[0.28em] text-[#87be00]">
                Cultivapp · Catálogo maestro
              </p>
              <h1 className="text-3xl font-black leading-none tracking-tight text-gray-900 md:text-5xl">
                Productos SKU
              </h1>
              <p className="mt-3 text-xs font-medium leading-relaxed text-gray-500">
                Administra productos, marcas y categorías desde un solo módulo.
              </p>

              {canManageCompanies && (
                <div className="mt-4 inline-flex max-w-full items-center gap-2 rounded-xl border border-[#87be00]/20 bg-[#87be00]/5 px-3 py-2">
                  <FiBriefcase
                    className="shrink-0 text-[#87be00]"
                    size={13}
                  />

                  <span className="truncate text-[9px] font-black uppercase tracking-[0.12em] text-[#679300]">
                    {selectedCompany
                      ? `Empresa: ${
                          selectedCompany.name ||
                          selectedCompany.nombre ||
                          "Seleccionada"
                        }`
                      : `${
                          isRoot
                            ? "ROOT"
                            : "Cultiva"
                        } · Vista global · Selecciona una empresa para crear o importar`}
                  </span>
                </div>
              )}
            </div>

            <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 xl:flex xl:w-auto">
              <div className="group relative shrink-0">
                <button
                  type="button"
                  onClick={() => setBulkHelpModal(true)}
                  aria-label="Ver formato de carga masiva de productos"
                  className="flex h-full min-h-[46px] w-full items-center justify-center rounded-2xl border border-gray-100 bg-white px-4 text-gray-500 shadow-sm transition-all hover:border-[#87be00]/40 hover:bg-[#87be00]/5 hover:text-[#679300] xl:w-[48px]"
                >
                  <FiHelpCircle size={19} />
                </button>

                <div className="pointer-events-none absolute left-0 top-[calc(100%+10px)] z-[300] hidden w-64 rounded-2xl border border-gray-100 bg-gray-900 px-4 py-3 text-left shadow-2xl group-hover:block">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#87be00]">
                    Formato de carga
                  </p>

                  <p className="mt-1 text-[10px] font-medium leading-relaxed text-gray-300">
                    Revisa las columnas requeridas y descarga la plantilla oficial para productos.
                  </p>

                  <div className="absolute -top-1.5 left-4 h-3 w-3 rotate-45 bg-gray-900" />
                </div>
              </div>

              <ActionButton icon={<FiAward />} label="Nueva marca" onClick={openNewBrand} />
              <ActionButton icon={<FiTag />} label="Nueva categoría" onClick={openNewCategory} />

              <ActionButton
                icon={bulkLoading ? <FiRotateCw className="animate-spin" /> : <FiUploadCloud />}
                label="Carga masiva"
                onClick={openBulkUpload}
                disabled={bulkLoading}
              />

              <button
                type="button"
                onClick={openNewProduct}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00]"
              >
                <FiPlus size={15} />
                Nuevo producto
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <StatCard label="Productos" value={products.length} icon={<FiPackage />} />
          <StatCard label="Marcas" value={brands.length} icon={<FiAward />} />
          <StatCard label="Categorías" value={categories.length} icon={<FiTag />} />
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 bg-gray-50/60 p-4 md:p-5">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div className="custom-scrollbar flex gap-2 overflow-x-auto pb-1">
                <TabButton active={activeTab === "products"} onClick={() => setActiveTab("products")} icon={<FiPackage />} label="Productos" count={products.length} />
                <TabButton active={activeTab === "brands"} onClick={() => setActiveTab("brands")} icon={<FiAward />} label="Marcas" count={brands.length} />
                <TabButton active={activeTab === "categories"} onClick={() => setActiveTab("categories")} icon={<FiTag />} label="Categorías" count={categories.length} />
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
                {canManageCompanies && (
                  <div className="relative min-w-0 lg:min-w-[270px]">
                    <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                      <FiBriefcase
                        size={14}
                      />
                    </span>

                    <select
                      value={
                        selectedCompanyId
                      }
                      onChange={(
                        event,
                      ) =>
                        setSelectedCompanyId(
                          event.target.value,
                        )
                      }
                      className="catalog-company-select h-12 w-full cursor-pointer appearance-none"
                    >
                      <option value="">
                        Todas las empresas
                      </option>

                      {companies.map(
                        (company) => (
                          <option
                            key={
                              company.id
                            }
                            value={
                              company.id
                            }
                          >
                            {company.name ||
                              company.nombre ||
                              "Empresa"}
                          </option>
                        ),
                      )}
                    </select>

                    <FiChevronDown
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      size={15}
                    />
                  </div>
                )}

                <div className="relative min-w-0 flex-1 lg:min-w-[260px]">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar..."
                    className="h-12 w-full rounded-2xl border border-gray-100 bg-white pl-11 pr-10 text-xs font-bold text-gray-700 outline-none shadow-inner transition-all placeholder:text-gray-300 focus:border-[#87be00]/50 focus:ring-4 focus:ring-[#87be00]/10"
                  />
                  {searchTerm && (
                    <button type="button" onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-red-500">
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

          <div className="p-4 sm:p-5 md:p-6">
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
                    badges={[
                      ...(
                        canManageCompanies &&
                        !selectedCompanyId
                          ? [
                              companyNameById(
                                product.company_id,
                              ),
                            ]
                          : []
                      ),
                      brandNameById(
                        product.brand_id,
                      ),
                      categoryNameById(
                        product.category_id,
                      ),
                    ].filter(Boolean)}
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
                      badges={
                        canManageCompanies &&
                        !selectedCompanyId
                          ? [
                              companyNameById(
                                brand.company_id,
                              ),
                            ].filter(Boolean)
                          : []
                      }
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
                      badges={
                        canManageCompanies &&
                        !selectedCompanyId
                          ? [
                              companyNameById(
                                category.company_id,
                              ),
                            ].filter(Boolean)
                          : []
                      }
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

      {bulkUploadModal && (
        <BulkProductsUploadModal
          companies={
            companies
          }
          canSelectCompany={
            canSelectBulkCompany
          }
          defaultCompanyId={
            canSelectBulkCompany
              ? (
                  selectedCompanyId ||
                  (
                    isCultivaBulkAdmin
                      ? currentUser?.company_id ||
                        ""
                      : ""
                  )
                )
              : currentUser?.company_id ||
                ""
          }
          loading={
            bulkLoading
          }
          onClose={
            closeBulkUpload
          }
          onUpload={
            handleBulkUpload
          }
        />
      )}

      {bulkHelpModal && (
        <BulkProductsHelpModal
          onClose={() => setBulkHelpModal(false)}
        />
      )}

      {productModal && (
        <Modal title={editingProductId ? "Editar producto" : "Nuevo producto"} onClose={closeProductModal}>
          <form onSubmit={handleProductSubmit} className="space-y-4">
            {canManageCompanies &&
            !editingProductId ? (
              <CompanySelectField
                value={
                  productData.company_id
                }
                companies={
                  companies
                }
                disabled={
                  saving ||
                  productOptionsLoading
                }
                description="El producto, su marca y su categoría quedarán asociados a esta empresa."
                onChange={async (
                  companyId,
                ) => {
                  setProductData(
                    (current) => ({
                      ...current,

                      company_id:
                        companyId,

                      barcode:
                        buildAlternativeBarcode(
                          companyId,
                          products,
                        ),

                      brand_id:
                        "",

                      category_id:
                        "",
                    }),
                  );

                  const options =
                    await loadProductOptions(
                      companyId,
                    );

                  setProductData(
                    (current) => ({
                      ...current,

                      brand_id:
                        findOtherCatalogItem(
                          options.brands,
                        )?.id ||
                        options.brands[0]
                          ?.id ||
                        "",

                      category_id:
                        findOtherCatalogItem(
                          options.categories,
                        )?.id ||
                        options.categories[0]
                          ?.id ||
                        "",
                    }),
                  );
                }}
              />
            ) : (
              <CompanyContextBanner
                name={
                  companyNameById(
                    productData.company_id,
                  )
                }
              />
            )}

            <InputField label="Nombre" value={productData.name} onChange={(value) => setProductData({ ...productData, name: value })} />
            <InputField
              label="EAN"
              value={
                productData.barcode
              }
              placeholder={
                productData.company_id
                  ? buildAlternativeBarcode(
                      productData.company_id,
                      products,
                    )
                  : DEFAULT_ALTERNATIVE_EAN
              }
              onChange={(value) =>
                setProductData({
                  ...productData,
                  barcode:
                    value,
                })
              }
            />

            <div className="grid md:grid-cols-2 gap-4">
              <SelectField
                label="Marca"
                value={
                  productData.brand_id
                }
                onChange={(value) =>
                  setProductData({
                    ...productData,
                    brand_id:
                      value,
                  })
                }
                options={
                  productModalBrands
                }
                disabled={
                  !productData.company_id ||
                  productOptionsLoading
                }
                placeholder={
                  productOptionsLoading
                    ? "Cargando marcas..."
                    : !productData.company_id
                      ? "Selecciona una empresa"
                      : "Seleccionar"
                }
              />

              <SelectField
                label="Categoría"
                value={
                  productData.category_id
                }
                onChange={(value) =>
                  setProductData({
                    ...productData,
                    category_id:
                      value,
                  })
                }
                options={
                  productModalCategories
                }
                disabled={
                  !productData.company_id ||
                  productOptionsLoading
                }
                placeholder={
                  productOptionsLoading
                    ? "Cargando categorías..."
                    : !productData.company_id
                      ? "Selecciona una empresa"
                      : "Seleccionar"
                }
              />
            </div>

            <ModalActions loading={saving} onCancel={closeProductModal} />
          </form>
        </Modal>
      )}

      {brandModal && (
        <Modal title={editingBrandId ? "Editar marca" : "Nueva marca"} onClose={closeBrandModal}>
          <form
            onSubmit={
              handleBrandSubmit
            }
            className="space-y-4"
          >
            {canManageCompanies &&
            !editingBrandId ? (
              <CompanySelectField
                value={
                  brandCompanyId
                }
                companies={
                  companies
                }
                disabled={
                  saving
                }
                description="La nueva marca quedará asociada únicamente a la empresa seleccionada."
                onChange={
                  setBrandCompanyId
                }
              />
            ) : (
              <CompanyContextBanner
                name={
                  companyNameById(
                    brandCompanyId,
                  )
                }
              />
            )}

            <InputField
              label="Nombre de la marca"
              value={
                brandName
              }
              onChange={
                setBrandName
              }
            />

            <ModalActions
              loading={
                saving
              }
              onCancel={
                closeBrandModal
              }
            />
          </form>
        </Modal>
      )}

      {categoryModal && (
        <Modal title={editingCategoryId ? "Editar categoría" : "Nueva categoría"} onClose={closeCategoryModal}>
          <form
            onSubmit={
              handleCategorySubmit
            }
            className="space-y-4"
          >
            {canManageCompanies &&
            !editingCategoryId ? (
              <CompanySelectField
                value={
                  categoryCompanyId
                }
                companies={
                  companies
                }
                disabled={
                  saving
                }
                description="La nueva categoría quedará asociada únicamente a la empresa seleccionada."
                onChange={
                  setCategoryCompanyId
                }
              />
            ) : (
              <CompanyContextBanner
                name={
                  companyNameById(
                    categoryCompanyId,
                  )
                }
              />
            )}

            <InputField
              label="Nombre de la categoría"
              value={
                categoryName
              }
              onChange={
                setCategoryName
              }
            />

            <ModalActions
              loading={
                saving
              }
              onCancel={
                closeCategoryModal
              }
            />
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
          min-height: 3rem;
          border: 1px solid rgb(243 244 246);
          background: rgb(249 250 251);
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 700;
          color: rgb(55 65 81);
          outline: none;
          box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.03);
          transition:
            border-color 160ms ease,
            background-color 160ms ease,
            box-shadow 160ms ease;
        }

        .catalog-input:focus {
          border-color: rgb(135 190 0 / 0.5);
          background: white;
          box-shadow: 0 0 0 4px rgb(135 190 0 / 0.1);
        }

        .catalog-input:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .catalog-company-select {
          width: 100%;
          min-height: 3rem;
          border: 1px solid rgb(229 231 235);
          background: rgb(249 250 251);
          border-radius: 1rem;
          padding-top: 0.75rem;
          padding-bottom: 0.75rem;
          padding-left: 4rem !important;
          padding-right: 3rem !important;
          font-size: 0.75rem;
          font-weight: 800;
          line-height: 1.25rem;
          color: rgb(31 41 55);
          outline: none;
          box-shadow:
            inset 0 1px 2px rgb(0 0 0 / 0.025),
            0 1px 2px rgb(15 23 42 / 0.03);
          transition:
            border-color 160ms ease,
            background-color 160ms ease,
            box-shadow 160ms ease,
            transform 160ms ease;
        }

        .catalog-company-select:hover:not(:disabled) {
          border-color: rgb(135 190 0 / 0.35);
          background: white;
        }

        .catalog-company-select:focus {
          border-color: rgb(135 190 0 / 0.6);
          background: white;
          box-shadow:
            0 0 0 4px rgb(135 190 0 / 0.1),
            0 8px 20px rgb(15 23 42 / 0.06);
        }

        .catalog-company-select:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
      `}</style>
    </div>
  );
};

const BulkProductsUploadModal = ({
  companies = [],
  canSelectCompany = false,
  defaultCompanyId = "",
  loading = false,
  onClose,
  onUpload,
}) => {
  const [
    companyId,
    setCompanyId,
  ] = useState(
    defaultCompanyId ||
    "",
  );

  const [file, setFile] =
    useState(null);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState(null);

  useEffect(() => {
    setCompanyId(
      defaultCompanyId ||
      "",
    );
  }, [
    defaultCompanyId,
  ]);

  const selectedCompany =
    useMemo(
      () =>
        companies.find(
          (company) =>
            String(
              company?.id ||
              "",
            ) ===
            String(
              companyId ||
              "",
            ),
        ) ||
        null,
      [
        companies,
        companyId,
      ],
    );

  const handleFileChange = (
    event,
  ) => {
    const selectedFile =
      event.target.files?.[0];

    if (!selectedFile) {
      return;
    }

    const extension =
      selectedFile.name
        .slice(
          selectedFile.name
            .lastIndexOf(
              ".",
            ),
        )
        .toLowerCase();

    const allowedExtensions = [
      ".xlsx",
      ".xls",
      ".csv",
    ];

    if (
      !allowedExtensions.includes(
        extension,
      )
    ) {
      setFile(
        null,
      );

      setError(
        "El archivo debe ser .xlsx, .xls o .csv.",
      );

      event.target.value =
        "";

      return;
    }

    setFile(
      selectedFile,
    );

    setError(
      "",
    );

    setResult(
      null,
    );
  };

  const handleSubmit = async (
    event,
  ) => {
    event.preventDefault();

    setError(
      "",
    );

    setResult(
      null,
    );

    if (!companyId) {
      setError(
        "Selecciona la empresa donde se cargarán los productos.",
      );

      return;
    }

    if (!file) {
      setError(
        "Selecciona el archivo de carga masiva.",
      );

      return;
    }

    try {
      const response =
        await onUpload({
          file,
          companyId,
        });

      setResult(
        response ||
        {
          message:
            "Productos cargados correctamente.",
        },
      );
    } catch (uploadError) {
      setError(
        getErrorMessage(
          uploadError,
          "Error al procesar la carga masiva",
        ),
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-products-upload-title"
      onClick={
        loading
          ? undefined
          : onClose
      }
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

        <header className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
              <FiUploadCloud
                size={20}
              />
            </span>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                Productos SKU
              </p>

              <h2
                id="bulk-products-upload-title"
                className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
              >
                Carga masiva
              </h2>

              <p className="mt-2 text-[10px] font-semibold leading-relaxed text-gray-400">
                Selecciona la empresa y el archivo que contiene los productos.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              loading
            }
            aria-label="Cerrar carga masiva"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiX
              size={18}
            />
          </button>
        </header>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5 px-5 py-5 sm:px-7 sm:py-6"
        >
          {error && (
            <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-red-600">
              <FiAlertCircle
                className="mt-0.5 shrink-0"
                size={15}
              />

              <p className="text-[10px] font-black uppercase leading-relaxed tracking-[0.08em]">
                {error}
              </p>
            </div>
          )}

          {result && (
            <div className="flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-green-700">
              <FiCheckCircle
                className="mt-0.5 shrink-0"
                size={16}
              />

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.12em]">
                  Productos cargados
                </p>

                <p className="mt-1 text-[10px] font-semibold leading-relaxed text-green-600">
                  {result?.message ||
                    "Productos cargados correctamente."}
                </p>
              </div>
            </div>
          )}

          {canSelectCompany ? (
            <CompanySelectField
              value={
                companyId
              }
              companies={
                companies
              }
              disabled={
                loading
              }
              description="Todos los productos del archivo quedarán asociados a la empresa seleccionada."
              onChange={(
                value,
              ) => {
                setCompanyId(
                  value,
                );

                setError(
                  "",
                );

                setResult(
                  null,
                );
              }}
            />
          ) : (
            <div className="flex items-center gap-3 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/5 px-4 py-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
                <FiBriefcase
                  size={16}
                />
              </span>

              <div className="min-w-0">
                <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#679300]">
                  Empresa de la carga
                </p>

                <p className="mt-0.5 truncate text-xs font-black text-gray-800">
                  {selectedCompany?.name ||
                    selectedCompany?.nombre ||
                    "Tu empresa"}
                </p>
              </div>
            </div>
          )}

          <label
            className={`relative flex min-h-[190px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[1.7rem] border-2 border-dashed p-6 text-center transition-all ${
              file
                ? "border-[#87be00] bg-[#87be00]/5"
                : "border-gray-200 bg-gray-50 hover:border-[#87be00]/50 hover:bg-[#87be00]/5"
            } ${
              loading
                ? "pointer-events-none opacity-60"
                : ""
            }`}
          >
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={
                handleFileChange
              }
              disabled={
                loading
              }
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />

            <span
              className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                file
                  ? "bg-[#87be00] text-white"
                  : "bg-white text-gray-400 shadow-sm"
              }`}
            >
              {file ? (
                <FiCheckCircle
                  size={22}
                />
              ) : (
                <FiUploadCloud
                  size={22}
                />
              )}
            </span>

            <div className="max-w-full">
              <p className="break-all text-xs font-black text-gray-800">
                {file
                  ? file.name
                  : "Seleccionar archivo"}
              </p>

              <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-gray-400">
                Formatos .xlsx, .xls o .csv
              </p>
            </div>
          </label>

          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.14em] text-blue-600">
              Columnas esperadas
            </p>

            <p className="mt-1 text-[10px] font-semibold leading-relaxed text-blue-500">
              Nombre, Ean, Marca y Categoria.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                loading
              }
              className="order-2 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.15em] text-gray-500 transition-all hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:order-1"
            >
              Cerrar
            </button>

            <button
              type="submit"
              disabled={
                loading ||
                !file ||
                !companyId
              }
              className="order-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-5 py-3.5 text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] disabled:cursor-not-allowed disabled:opacity-50 sm:order-2"
            >
              {loading ? (
                <FiRotateCw
                  className="animate-spin"
                  size={15}
                />
              ) : (
                <FiUploadCloud
                  size={15}
                />
              )}

              {loading
                ? "Procesando..."
                : "Iniciar carga"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BulkProductsHelpModal = ({ onClose }) => {
  const handleDownloadTemplate = () => {
    const productsSheet =
      XLSX.utils.aoa_to_sheet([
        [
          "Nombre",
          "Ean",
          "Marca",
          "Categoria",
        ],
      ]);

    productsSheet["!cols"] = [
      { wch: 42 },
      { wch: 22 },
      { wch: 26 },
      { wch: 30 },
    ];

    productsSheet["!autofilter"] = {
      ref: "A1:D1",
    };

    const instructionsSheet =
      XLSX.utils.aoa_to_sheet([
        [
          "Campo",
          "Obligatorio",
          "Descripción",
          "Ejemplo",
        ],
        [
          "Nombre",
          "Sí",
          "Nombre comercial completo del producto.",
          "Cachantun + Citrus Limón 600 ml",
        ],
        [
          "Ean",
          "Sí",
          "Código EAN único del producto. Mantén todos sus dígitos.",
          "7801620009657",
        ],
        [
          "Marca",
          "Sí",
          "Nombre de la marca. Si no existe, debe crearse antes de importar.",
          "CCU",
        ],
        [
          "Categoria",
          "Sí",
          "Nombre de la categoría. Debe coincidir con el catálogo.",
          "Refrescos",
        ],
      ]);

    instructionsSheet["!cols"] = [
      { wch: 20 },
      { wch: 14 },
      { wch: 64 },
      { wch: 38 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      productsSheet,
      "Productos",
    );

    XLSX.utils.book_append_sheet(
      workbook,
      instructionsSheet,
      "Instrucciones",
    );

    XLSX.writeFile(
      workbook,
      "Carga_Masiva_Productos.xlsx",
      {
        bookType: "xlsx",
        compression: true,
      },
    );
  };

  const columns = [
    {
      name: "Nombre",
      description:
        "Nombre comercial completo utilizado para identificar el producto.",
      example:
        "Cachantun + Citrus Limón 600 ml",
    },
    {
      name: "Ean",
      description:
        "Código EAN único. Excel debe conservar todos los dígitos del código.",
      example: "7801620009657",
    },
    {
      name: "Marca",
      description:
        "Nombre exacto de la marca registrada dentro del catálogo.",
      example: "CCU",
    },
    {
      name: "Categoria",
      description:
        "Nombre exacto de la categoría registrada dentro del catálogo.",
      example: "Refrescos",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#111111]/70 p-3 font-[Outfit] backdrop-blur-sm sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-products-help-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <header className="relative shrink-0 border-b border-gray-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#87be00]" />

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">
                <FiPackage size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#87be00]">
                  Carga masiva
                </p>

                <h2
                  id="bulk-products-help-title"
                  className="mt-1 text-xl font-black leading-none tracking-tight text-gray-900 sm:text-2xl"
                >
                  Formato de productos
                </h2>

                <p className="mt-2 text-[11px] font-medium leading-relaxed text-gray-400">
                  Conserva exactamente los encabezados de la plantilla oficial.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ayuda de carga masiva"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"
            >
              <FiX size={18} />
            </button>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto bg-gray-50/40 px-5 py-5 sm:px-7 sm:py-6">
          <section className="rounded-[1.6rem] border border-[#87be00]/20 bg-[#87be00]/5 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <FiAlertCircle
                className="mt-0.5 shrink-0 text-[#679300]"
                size={17}
              />

              <div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-[#679300]">
                  Validación del catálogo
                </h3>

                <p className="mt-2 text-[11px] font-semibold leading-relaxed text-gray-600">
                  Cada empresa tendrá automáticamente la marca “Otro”, la categoría “Otro” y el producto “Otro” con un EAN alternativo único por empresa.
                </p>
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.6rem] border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-4 sm:px-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
                Leyenda de columnas
              </h3>

              <p className="mt-1 text-[10px] font-medium text-gray-400">
                Todas las columnas son obligatorias.
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {columns.map((column) => (
                <div
                  key={column.name}
                  className="grid grid-cols-1 gap-2 px-4 py-4 sm:grid-cols-[155px_1fr] sm:px-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-lg border border-[#87be00]/20 bg-[#87be00]/10 px-2.5 py-1 font-mono text-[9px] font-black text-[#679300]">
                      {column.name}
                    </span>

                    <span className="rounded-full border border-red-100 bg-red-50 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-red-500">
                      Obligatorio
                    </span>
                  </div>

                  <div>
                    <p className="text-[10px] font-semibold leading-relaxed text-gray-600">
                      {column.description}
                    </p>

                    <p className="mt-1 text-[9px] font-medium text-gray-400">
                      Ejemplo:{" "}
                      <strong className="text-gray-600">
                        {column.example}
                      </strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.6rem] border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.16em] text-gray-800">
              Antes de importar
            </h3>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                "Completa los productos en la hoja Productos.",
                "No cambies los nombres de los encabezados.",
                "Utiliza un EAN diferente para cada producto.",
                "No uses notación científica en la columna Ean.",
                "No dejes filas vacías entre registros.",
                "Guarda el archivo en formato .xlsx.",
              ].map((rule) => (
                <div
                  key={rule}
                  className="flex items-start gap-2 rounded-2xl border border-gray-100 bg-gray-50 px-3.5 py-3"
                >
                  <FiCheckCircle
                    className="mt-0.5 shrink-0 text-[#87be00]"
                    size={14}
                  />

                  <span className="text-[10px] font-semibold leading-relaxed text-gray-600">
                    {rule}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="grid shrink-0 grid-cols-1 gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:grid-cols-[auto_1fr] sm:px-7">
          <button
            type="button"
            onClick={onClose}
            className="order-2 rounded-2xl border border-gray-100 bg-gray-50 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.16em] text-gray-500 transition-all hover:bg-gray-100 sm:order-1"
          >
            Cerrar
          </button>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="order-1 flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-6 py-3.5 text-[9px] font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] sm:order-2"
          >
            <FiDownload size={15} />
            Descargar plantilla oficial
          </button>
        </footer>
      </div>
    </div>
  );
};

const CompanySelectField = ({
  value,
  companies,
  onChange,
  disabled = false,
  description =
    "El registro quedará asociado a la empresa seleccionada.",
}) => (
  <label className="block">
    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.16em] text-gray-500">
      Empresa
    </span>

    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-[0.9rem] border border-[#87be00]/15 bg-[#87be00]/10 text-[#87be00] shadow-sm">
        <FiBriefcase
          size={16}
        />
      </span>

      <select
        value={value}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        className="catalog-company-select min-h-[3.75rem] w-full cursor-pointer appearance-none disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">
          Selecciona una empresa
        </option>

        {companies.map(
          (company) => (
            <option
              key={company.id}
              value={company.id}
            >
              {company.name ||
                company.nombre ||
                "Empresa"}
            </option>
          ),
        )}
      </select>

      <FiChevronDown
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
        size={17}
      />
    </div>

    <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-[#87be00]/10 bg-[#87be00]/5 px-3 py-2.5">
      <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#87be00]" />

      <p className="text-[9px] font-semibold leading-relaxed text-gray-500">
        {description}
      </p>
    </div>
  </label>
);

const CompanyContextBanner = ({
  name,
}) => {
  if (!name) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#87be00]/20 bg-[#87be00]/5 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#87be00]/10 text-[#87be00]">
        <FiBriefcase
          size={15}
        />
      </span>

      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-[0.14em] text-[#679300]">
          Empresa del registro
        </p>

        <p className="mt-0.5 truncate text-xs font-black text-gray-800">
          {name}
        </p>
      </div>
    </div>
  );
};

const ActionButton = ({ icon, label, onClick, disabled }) => (
  <button type="button" onClick={onClick} disabled={disabled} className="flex items-center justify-center gap-2 rounded-2xl border border-gray-100 bg-white px-4 py-3.5 text-[9px] font-black uppercase tracking-[0.12em] text-gray-600 shadow-sm transition-all hover:border-[#87be00]/40 hover:bg-[#87be00]/5 hover:text-[#679300] disabled:cursor-not-allowed disabled:opacity-50">
    {icon}{label}
  </button>
);

const StatCard = ({ label, value, icon }) => (
  <div className="flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-black leading-none text-gray-900">{value}</p>
    </div>
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">{icon}</div>
  </div>
);

const TabButton = ({ active, onClick, icon, label, count }) => (
  <button type="button" onClick={onClick} className={`flex items-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-[9px] font-black uppercase tracking-[0.12em] transition-all ${active ? "bg-[#87be00] text-white shadow-md shadow-[#87be00]/20" : "border border-gray-100 bg-white text-gray-500 hover:border-[#87be00]/30 hover:text-[#679300]"}`}>
    {icon}{label}<span className={`rounded-full px-2 py-0.5 ${active ? "bg-white/20" : "bg-gray-100 text-gray-400"}`}>{count}</span>
  </button>
);

const GridList = ({ items, empty, renderItem }) =>
  items.length ? (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(renderItem)}</div>
  ) : (
    <div className="rounded-[1.5rem] border border-dashed border-gray-200 bg-gray-50/70 py-16 text-center text-sm font-bold text-gray-400">{empty}</div>
  );

const CatalogCard = ({ icon, title, subtitle, badges = [], onEdit, onDelete }) => (
  <article className="rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#87be00]/35 hover:shadow-lg">
    <div className="flex items-start justify-between gap-3">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#87be00]/10 text-[#87be00]">{icon}</div>
      <div className="flex gap-2">
        <button type="button" onClick={onEdit} className="rounded-xl border border-gray-100 bg-gray-50 p-2.5 text-gray-500 transition-all hover:border-[#87be00]/20 hover:bg-[#87be00] hover:text-white"><FiEdit2 size={13} /></button>
        <button type="button" onClick={onDelete} className="rounded-xl border border-red-100 bg-red-50 p-2.5 text-red-500 transition-all hover:bg-red-600 hover:text-white"><FiTrash2 size={13} /></button>
      </div>
    </div>
    <h3 className="mt-4 truncate text-sm font-black uppercase tracking-tight text-gray-900">{title}</h3>
    <p className="mt-1 text-[10px] font-medium text-gray-400">{subtitle}</p>
    {badges.length > 0 && (
      <div className="mt-4 flex flex-wrap gap-2">
        {badges.map((badge, index) => (
          <span key={`${badge}-${index}`} className="rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[8px] font-black uppercase tracking-wide text-gray-500">{badge}</span>
        ))}
      </div>
    )}
  </article>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#111111]/70 p-4 backdrop-blur-sm">
    <div className="max-h-[92vh] w-full max-w-xl overflow-hidden rounded-[2rem] border border-white/60 bg-white shadow-2xl">
      <div className="relative flex items-center justify-between border-b border-gray-100 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black tracking-tight text-gray-900">{title}</h2>
        <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-gray-400 transition-all hover:border-red-100 hover:bg-red-50 hover:text-red-500"><FiX /></button>
      </div>
      <div className="custom-scrollbar max-h-[calc(92vh-78px)] overflow-y-auto p-5 sm:p-6">{children}</div>
    </div>
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
  placeholder = "",
}) => (
  <label className="block">
    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
      {label}
    </span>

    <input
      value={value}
      placeholder={
        placeholder
      }
      onChange={(event) =>
        onChange(
          event.target.value,
        )
      }
      className="catalog-input w-full"
    />
  </label>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  placeholder = "Seleccionar",
}) => (
  <label className="block">
    <span className="mb-2 block text-[9px] font-black uppercase tracking-[0.14em] text-gray-500">
      {label}
    </span>

    <select
      value={value}
      disabled={disabled}
      onChange={(event) =>
        onChange(
          event.target.value,
        )
      }
      className="catalog-input w-full disabled:cursor-not-allowed disabled:opacity-60"
    >
      <option value="">
        {placeholder}
      </option>

      {options.map(
        (item) => (
          <option
            key={item.id}
            value={item.id}
          >
            {item.name}
          </option>
        ),
      )}
    </select>
  </label>
);

const ModalActions = ({ loading, onCancel }) => (
  <div className="grid grid-cols-1 gap-3 pt-3 sm:grid-cols-2">
    <button type="button" onClick={onCancel} disabled={loading} className="rounded-2xl border border-gray-100 bg-gray-50 py-3.5 text-[9px] font-black uppercase tracking-[0.12em] text-gray-500 transition-all hover:bg-gray-100 disabled:opacity-50">Cancelar</button>
    <button type="submit" disabled={loading} className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 py-3.5 text-[9px] font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-gray-200 transition-all hover:bg-[#87be00] disabled:opacity-50">
      {loading && <FiRotateCw className="animate-spin" />} {loading ? "Guardando..." : "Guardar"}
    </button>
  </div>
);

const ConfirmDelete = ({ item, onClose, onConfirm }) => (
  <div className="fixed inset-0 z-[220] flex items-center justify-center bg-[#111111]/70 p-4 backdrop-blur-sm">
    <div className="w-full max-w-md rounded-[2rem] border border-white/60 bg-white p-6 text-center shadow-2xl sm:p-7">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600"><FiTrash2 size={22} /></div>
      <h2 className="mt-5 text-lg font-black tracking-tight text-gray-900">Confirmar eliminación</h2>
      <p className="mt-3 text-xs font-medium leading-relaxed text-gray-500">¿Eliminar “{item.name}”? Esta acción no se puede revertir.</p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <button type="button" onClick={onClose} className="rounded-2xl border border-gray-100 bg-gray-50 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-gray-500 transition-all hover:bg-gray-100">Cancelar</button>
        <button type="button" onClick={onConfirm} className="rounded-2xl bg-red-600 py-3 text-[9px] font-black uppercase tracking-[0.12em] text-white transition-all hover:bg-red-700">Eliminar</button>
      </div>
    </div>
  </div>
);

export default CatalogManager;