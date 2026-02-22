import React, { createContext, useContext, useState, useEffect } from "react";

export interface Agent {
  sessionId: string;
  agentName: string;
  isAdmin: boolean;
}

interface AgentContextType {
  currentAgent: Agent | null;
  isAuthenticated: boolean;
  login: (agentName: string, isAdmin?: boolean) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AgentContext = createContext<AgentContextType | undefined>(undefined);

export const AgentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentAgent, setCurrentAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load agent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("agent");
    if (stored) {
      try {
        setCurrentAgent(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse stored agent:", error);
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (agentName: string, isAdmin = false) => {
    setIsLoading(true);
    try {
      // In a real app, this would call the backend
      // For now, we'll create a session ID locally
      const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const agent: Agent = {
        sessionId,
        agentName,
        isAdmin,
      };
      setCurrentAgent(agent);
      localStorage.setItem("agent", JSON.stringify(agent));
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setCurrentAgent(null);
    localStorage.removeItem("agent");
  };

  return (
    <AgentContext.Provider
      value={{
        currentAgent,
        isAuthenticated: !!currentAgent,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
};

export const useAgent = () => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within AgentProvider");
  }
  return context;
};
