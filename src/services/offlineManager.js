import { addToSyncQueue } from "../utils/db";

// Convierte archivos (fotos) a Base64
const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

const serializeBody = async (body) => {
  if (!body) return null;
  
  if (body instanceof FormData) {
    const serialized = {};
    for (let [key, value] of body.entries()) {
      // Si es una foto, la transformamos para que sobreviva offline
      if (value instanceof File || value instanceof Blob) {
        serialized[key] = await fileToBase64(value);
      } else {
        serialized[key] = value;
      }
    }
    return { __type: "FormData", data: serialized };
  }
  
  if (typeof body === "string") {
    try { return JSON.parse(body); } catch (e) { return body; }
  }
  return body;
};

const OfflineManager = {
  save: async (endpoint, method, body) => {
    console.warn(`🌐 [OfflineManager] Guardando en cola: ${method} ${endpoint}`);
    
    const type = endpoint.includes("/finish") ? "FINISH" : 
                 endpoint.includes("/photo") ? "PHOTO" : 
                 endpoint.includes("/task") ? "TASK" : "OTHER";

    const routeMatch = endpoint.match(/\/routes\/([^/]+)/);
    const routeId = routeMatch ? routeMatch[1] : null;

    const payload = await serializeBody(body);

    await addToSyncQueue({
      type, endpoint, method, routeId, payload,
      createdAt: new Date().toISOString(),
    });

    return { offline: true, message: "Guardado localmente" };
  }
};

export default OfflineManager;