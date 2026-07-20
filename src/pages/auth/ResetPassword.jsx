import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiLock,
} from "react-icons/fi";
import toast from "react-hot-toast";
import api from "../../api/apiClient";
import { Button } from "../../components/ui";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (password.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/reset-password", {
        token,
        newPassword: password,
      });

      toast.success("Contraseña actualizada correctamente");
      navigate("/");
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "No se pudo actualizar la contraseña",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fbf8] p-6 font-[Outfit]">
        <div className="bg-white w-full max-w-md rounded-3xl shadow-xl shadow-red-500/5 p-10 text-center border border-red-50 space-y-5">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mx-auto shadow-inner">
            <FiAlertTriangle size={32} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Enlace inválido
            </h2>

            <p className="text-sm text-gray-500 mt-2 px-4">
              El enlace de recuperación no es válido o está incompleto.
              Solicita uno nuevo para continuar.
            </p>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            leftIcon={<FiArrowLeft size={17} />}
            onClick={() => navigate("/forgot-password")}
          >
            Solicitar otro enlace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f9fbf8] p-6 font-[Outfit] relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#87be00] rounded-full mix-blend-multiply blur-[100px] opacity-20" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#87be00] rounded-full mix-blend-multiply blur-[100px] opacity-10" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl shadow-[#87be00]/5 p-8 sm:p-10 space-y-8 z-10 border border-gray-50"
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-[#87be00]/10 rounded-2xl flex items-center justify-center text-[#87be00] shadow-inner">
            <FiLock size={32} />
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl font-extrabold text-gray-800 tracking-tight">
              Crear nueva contraseña
            </h2>

            <p className="text-sm text-gray-500 px-2">
              Ingresa y confirma tu nueva contraseña para recuperar el
              acceso a tu cuenta.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="new-password"
              className="text-sm font-semibold text-gray-700 ml-1"
            >
              Nueva contraseña
            </label>

            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              disabled={loading}
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-3.5 text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all duration-200 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password"
              className="text-sm font-semibold text-gray-700 ml-1"
            >
              Confirmar contraseña
            </label>

            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Repite la nueva contraseña"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              minLength={8}
              required
              disabled={loading}
              className="w-full border border-gray-200 bg-gray-50 rounded-2xl px-5 py-3.5 text-gray-700 focus:bg-white focus:ring-2 focus:ring-[#87be00] focus:border-transparent outline-none transition-all duration-200 disabled:opacity-60"
            />
          </div>

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            loadingText="Actualizando contraseña..."
            leftIcon={<FiLock size={17} />}
          >
            Actualizar contraseña
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;