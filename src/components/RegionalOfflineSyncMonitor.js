import { useAuth } from "../context/AuthContext";
import useRegionalOfflineSync from "../hooks/useRegionalOfflineSync";

const RegionalOfflineSyncMonitor = () => {
  const { user } = useAuth();
  useRegionalOfflineSync(user);
  return null;
};

export default RegionalOfflineSyncMonitor;
