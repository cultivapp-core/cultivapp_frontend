import {
  createContext,
  useContext,
  useEffect,
  useState
} from "react";
import { presenceSocket } from "../services/presenceSocket";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      try {
        const storedToken = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        const storedPasswordFlag =
          localStorage.getItem("mustChangePassword");

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);

          if (storedPasswordFlag === "true") {
            setMustChangePassword(true);
          }
        }
      } catch (error) {
        console.error("❌ Error recuperando sesión:", error);
        localStorage.clear();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (token && user) {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem(
        "mustChangePassword",
        mustChangePassword ? "true" : "false"
      );
      setIsAuthenticated(true);
    }
  }, [token, user, mustChangePassword]);

  const login = (data) => {
    const passwordFlag = Boolean(
      data.mustChangePassword ??
      data.must_change_password
    );

    setToken(data.token);
    setUser(data.user);
    setMustChangePassword(passwordFlag);
    setIsAuthenticated(true);

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem(
      "mustChangePassword",
      passwordFlag ? "true" : "false"
    );
  };

  const logout = () => {
    if (presenceSocket.connected) {
      presenceSocket.emit("presence_logout");
      presenceSocket.disconnect();
    }

    setToken(null);
    setUser(null);
    setMustChangePassword(false);
    setIsAuthenticated(false);
    localStorage.clear();
  };

  const clearMustChangePassword = () => {
    setMustChangePassword(false);
    localStorage.setItem("mustChangePassword", "false");
  };

  const hasRole = (allowedRoles) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        mustChangePassword,
        login,
        logout,
        hasRole,
        clearMustChangePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);