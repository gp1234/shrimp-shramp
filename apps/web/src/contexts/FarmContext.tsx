import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../api";

interface Farm {
  id: string;
  name: string;
  location: string | null;
}

interface FarmContextType {
  currentFarm: Farm | null;
  availableFarms: Farm[];
  setCurrentFarm: (farm: Farm) => void;
  isLoading: boolean;
}

const FarmContext = createContext<FarmContextType | undefined>(undefined);

export function FarmProvider({ children }: { children: ReactNode }) {
  const [currentFarm, setCurrentFarmState] = useState<Farm | null>(null);

  // Fetch user's farms from /auth/me
  const { data: userData, isLoading } = useQuery({
    queryKey: ["auth-me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data.data),
  });

  const availableFarms: Farm[] = userData?.farms || [];

  // Debug logging
  console.log("FarmContext Debug:", {
    isLoading,
    userData,
    availableFarms,
    currentFarm,
  });

  // Initialize current farm from localStorage or first available farm
  useEffect(() => {
    if (availableFarms.length > 0 && !currentFarm) {
      const storedFarmId = localStorage.getItem("shrampi_current_farm");
      const farm = storedFarmId
        ? (availableFarms.find((f) => f.id === storedFarmId) ??
          availableFarms[0]!)
        : availableFarms[0]!;
      console.log("Setting current farm:", farm);
      setCurrentFarmState(farm);
    }
  }, [availableFarms, currentFarm]);

  const setCurrentFarm = (farm: Farm) => {
    setCurrentFarmState(farm);
    localStorage.setItem("shrampi_current_farm", farm.id);
  };

  return (
    <FarmContext.Provider
      value={{ currentFarm, availableFarms, setCurrentFarm, isLoading }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarm() {
  const context = useContext(FarmContext);
  if (!context) {
    throw new Error("useFarm must be used within FarmProvider");
  }
  return context;
}
