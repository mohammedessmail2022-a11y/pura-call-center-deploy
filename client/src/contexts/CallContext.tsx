import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

export interface Call {
  id: number;
  patientName: string;
  appointmentId: string;
  appointmentTime: string;
  agentName: string;
  status: "no_answer" | "confirmed" | "redirected" | "other";
  comment: string | null;
  callCategory: string | null;
  callSubCategory: string | null;
  numberOfTrials: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ActiveCallSummaryRow {
  agentName: string;
  status: Call["status"];
  count: number;
}

interface CallContextType {
  calls: Call[];
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  totalCalls: number;
  summaryRows: ActiveCallSummaryRow[];
  setSearch: (query: string) => void;
  loadMoreCalls: () => void;
  addCall: (call: { patientName: string; appointmentId: string; appointmentTime: string; agentName: string; comment?: string | null; callCategory?: string | null; callSubCategory?: string | null }) => Promise<void>;
  updateCall: (id: number, updates: Partial<Call>) => Promise<void>;
  deleteCall: (id: number) => Promise<void>;
  exportCalls: () => Promise<{ csv: string; fileName: string }>;
  refreshCalls: () => Promise<void>;
  startNewDay: () => Promise<void>;
}

const PAGE_SIZE = 100;
const CallContext = createContext<CallContextType | undefined>(undefined);

const toCall = (call: Omit<Call, "createdAt" | "updatedAt"> & { createdAt: Date | string; updatedAt: Date | string }): Call => ({
  ...call,
  createdAt: new Date(call.createdAt),
  updatedAt: new Date(call.updatedAt),
});

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [calls, setCalls] = useState<Call[]>([]);
  const [offset, setOffset] = useState(0);
  const [search, setSearchValue] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const utils = trpc.useUtils();

  const listQuery = trpc.calls.listActivePage.useQuery(
    { limit: PAGE_SIZE, offset, search: search || undefined },
    {
      // The previous implementation reloaded 8k+ rows every two seconds.
      // Polling a bounded page every 15 seconds keeps the list current without overloading users or Supabase.
      refetchInterval: 15_000,
      refetchOnWindowFocus: true,
    },
  );
  const summaryQuery = trpc.calls.activeSummary.useQuery(undefined, {
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const createMutation = trpc.calls.create.useMutation();
  const updateMutation = trpc.calls.update.useMutation();
  const deleteMutation = trpc.calls.delete.useMutation();
  const startNewDayMutation = trpc.calls.startNewDay.useMutation();
  const exportQuery = trpc.calls.export.useQuery(undefined, { enabled: false });

  useEffect(() => {
    if (!listQuery.data) return;
    const pageCalls = listQuery.data.items.map(toCall);
    setCalls((existing) => {
      if (offset === 0) return pageCalls;
      const existingIds = new Set(existing.map((call) => call.id));
      return [...existing, ...pageCalls.filter((call) => !existingIds.has(call.id))];
    });
  }, [listQuery.data, offset]);

  const summaryRows = useMemo(
    () => (summaryQuery.data ?? []).map((row) => ({ ...row, count: Number(row.count) })),
    [summaryQuery.data],
  );

  const totalCalls = listQuery.data?.total ?? 0;
  const hasMore = calls.length < totalCalls;

  const refreshCalls = async () => {
    setOffset(0);
    await Promise.all([
      utils.calls.listActivePage.invalidate(),
      utils.calls.activeSummary.invalidate(),
    ]);
  };

  const setSearch = (query: string) => {
    setCalls([]);
    setOffset(0);
    setSearchValue(query.trim());
  };

  const loadMoreCalls = () => {
    if (!listQuery.isFetching && hasMore) {
      setOffset(calls.length);
    }
  };

  const addCall = async (call: { patientName: string; appointmentId: string; appointmentTime: string; agentName: string; comment?: string | null; callCategory?: string | null; callSubCategory?: string | null }) => {
    setActionLoading(true);
    try {
      await createMutation.mutateAsync({
        patientName: call.patientName,
        appointmentId: call.appointmentId,
        appointmentTime: call.appointmentTime,
        agentName: call.agentName,
        comment: call.comment || "",
        callCategory: call.callCategory || null,
        callSubCategory: call.callSubCategory || null,
      });
      await refreshCalls();
    } finally {
      setActionLoading(false);
    }
  };

  const updateCall = async (id: number, updates: Partial<Call>) => {
    setActionLoading(true);
    try {
      const { createdAt, updatedAt, id: _ignoredId, ...updateData } = updates;
      await updateMutation.mutateAsync({
        id,
        ...updateData,
        comment: updateData.comment ?? undefined,
        callCategory: updateData.callCategory ?? undefined,
        callSubCategory: updateData.callSubCategory ?? undefined,
      });
      await refreshCalls();
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCall = async (id: number) => {
    setActionLoading(true);
    try {
      await deleteMutation.mutateAsync({ id });
      await refreshCalls();
    } finally {
      setActionLoading(false);
    }
  };

  const exportCalls = async () => {
    const result = await exportQuery.refetch();
    if (result.data) return result.data;
    throw new Error("Failed to export calls");
  };

  const startNewDay = async () => {
    setActionLoading(true);
    try {
      await startNewDayMutation.mutateAsync();
      setCalls([]);
      await refreshCalls();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <CallContext.Provider
      value={{
        calls,
        isLoading: actionLoading || listQuery.isLoading,
        isFetchingMore: listQuery.isFetching && offset > 0,
        hasMore,
        totalCalls,
        summaryRows,
        setSearch,
        loadMoreCalls,
        addCall,
        updateCall,
        deleteCall,
        exportCalls,
        refreshCalls,
        startNewDay,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used within CallProvider");
  return context;
};
