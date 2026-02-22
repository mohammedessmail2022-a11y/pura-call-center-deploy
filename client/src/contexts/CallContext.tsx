import React, { createContext, useContext, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export interface Call {
  id: number;
  patientName: string;
  appointmentId: string;
  appointmentTime: string;
  agentName: string;
  status: "no_answer" | "confirmed" | "redirected";
  comment: string | null;
  numberOfTrials: number;
  createdAt: Date;
  updatedAt: Date;
}

interface CallContextType {
  calls: Call[];
  isLoading: boolean;
  addCall: (call: { patientName: string; appointmentId: string; appointmentTime: string; agentName: string; comment?: string | null }) => Promise<void>;
  updateCall: (id: number, updates: Partial<Call>) => Promise<void>;
  deleteCall: (id: number) => Promise<void>;
  exportCalls: () => Promise<{ csv: string; fileName: string }>;
  refreshCalls: () => Promise<void>;
  startNewDay: () => Promise<void>;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const listQuery = trpc.calls.listActive.useQuery(undefined, {
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
  });

  const createMutation = trpc.calls.create.useMutation();
  const updateMutation = trpc.calls.update.useMutation();
  const deleteMutation = trpc.calls.delete.useMutation();
  const startNewDayMutation = trpc.calls.startNewDay.useMutation();
  const exportQuery = trpc.calls.export.useQuery();

  // Update calls when query data changes
  useEffect(() => {
    if (listQuery.data) {
      setCalls(
        listQuery.data.map((call) => ({
          ...call,
          createdAt: new Date(call.createdAt),
          updatedAt: new Date(call.updatedAt),
        }))
      );
    }
  }, [listQuery.data]);

  const addCall = async (call: { patientName: string; appointmentId: string; appointmentTime: string; agentName: string; comment?: string | null }) => {
    setIsLoading(true);
    try {
      await createMutation.mutateAsync({
        patientName: call.patientName,
        appointmentId: call.appointmentId,
        appointmentTime: call.appointmentTime,
        agentName: call.agentName,
        comment: call.comment ? call.comment : "",
      });
      // Refetch calls after creation
      await listQuery.refetch();
    } finally {
      setIsLoading(false);
    }
  };

  const updateCall = async (id: number, updates: Partial<Call>) => {
    setIsLoading(true);
    try {
      const { createdAt, updatedAt, ...updateData } = updates;
      const cleanData = {
        ...updateData,
        comment: updateData.comment || undefined,
      };
      await updateMutation.mutateAsync({
        id,
        ...cleanData,
      });
      // Refetch calls after update
      await listQuery.refetch();
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCall = async (id: number) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync({ id });
      // Refetch calls after delete
      await listQuery.refetch();
    } finally {
      setIsLoading(false);
    }
  };

  const exportCalls = async () => {
    await exportQuery.refetch();
    if (exportQuery.data) {
      return exportQuery.data;
    }
    throw new Error("Failed to export calls");
  };

  const refreshCalls = async () => {
    await listQuery.refetch();
  };

  const startNewDay = async () => {
    setIsLoading(true);
    try {
      await startNewDayMutation.mutateAsync();
      // Refetch calls after starting new day
      await listQuery.refetch();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CallContext.Provider value={{ calls, isLoading, addCall, updateCall, deleteCall, exportCalls, refreshCalls, startNewDay }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error("useCall must be used within CallProvider");
  }
  return context;
};
