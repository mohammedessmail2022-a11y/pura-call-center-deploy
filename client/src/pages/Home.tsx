import React, { useState, useEffect, useMemo } from "react";
import { useAgent } from "@/contexts/AgentContext";
import { useCall } from "@/contexts/CallContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Clock, Phone, Save, X, Download, LogOut, Lock, Search, BarChart3, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TimePicker from "@/components/TimePicker";
import { ADMIN_NAMES } from "../../../shared/constants";

export default function Home() {
  const { currentAgent, login, logout, isLoading: authLoading } = useAgent();
  const { calls, addCall, updateCall, deleteCall, exportCalls, refreshCalls, startNewDay, isLoading: callsLoading } = useCall();

  // Login form state
  const [agentName, setAgentName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Calling form state
  const [patientName, setPatientName] = useState("");
  const [appointmentId, setAppointmentId] = useState("");
  const [appointmentTime, setAppointmentTime] = useState("12:00");
  const [comment, setComment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"no_answer" | "confirmed" | "redirected" | null>(null);
  const [isInProgress, setIsInProgress] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    // Check if user is trying to login as admin
    const requestedAdmin = isAdmin;
    const isValidAdmin = ADMIN_NAMES.includes(agentName);

    if (requestedAdmin && !isValidAdmin) {
      setAdminError("Invalid admin credentials");
      setIsAdmin(false);
      return;
    }

    try {
      await login(agentName, requestedAdmin && isValidAdmin);
      toast.success(`Welcome, ${agentName}!`);
      setAgentName("");
      setIsAdmin(false);
      setAdminError("");
    } catch (error) {
      toast.error("Login failed");
    }
  };

  const handleStartCall = async () => {
    if (!patientName.trim() || !appointmentId.trim() || !appointmentTime.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!currentAgent) {
      toast.error("Agent not authenticated");
      return;
    }

    try {
      await addCall({
        patientName,
        appointmentId,
        appointmentTime,
        agentName: currentAgent.agentName,
        comment: "",
      });
      setIsInProgress(true);
      toast.success("Call started");
    } catch (error) {
      toast.error("Failed to start call");
    }
  };

  const handleSaveCall = async () => {
    if (!isInProgress || !selectedStatus) {
      toast.error("Please select a status");
      return;
    }

    try {
      const recentCall = calls[0];
      if (recentCall && recentCall.agentName === currentAgent?.agentName) {
        await updateCall(recentCall.id, {
          status: selectedStatus,
          comment,
        });

        setPatientName("");
        setAppointmentId("");
        setAppointmentTime("12:00");
        setComment("");
        setSelectedStatus(null);
        setIsInProgress(false);
        setShowCommentModal(false);

        toast.success("Call saved successfully");
      }
    } catch (error) {
      toast.error("Failed to save call");
    }
  };

  const handleCancelCall = () => {
    setPatientName("");
    setAppointmentId("");
    setAppointmentTime("12:00");
    setComment("");
    setSelectedStatus(null);
    setIsInProgress(false);
    setShowCommentModal(false);
  };

  const handleDownloadData = async () => {
    try {
      const { csv, fileName } = await exportCalls();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Data downloaded successfully");
    } catch (error) {
      toast.error("Failed to download data");
    }
  };

  const handleStartNewDay = async () => {
    try {
      await startNewDay();
      setPatientName("");
      setAppointmentId("");
      setAppointmentTime("12:00");
      setComment("");
      setSelectedStatus(null);
      setIsInProgress(false);
      toast.success("New day started - patient list cleared.");
    } catch (error) {
      toast.error("Failed to start new day");
    }
  };

  const handleDeleteCall = async (id: number) => {
    if (!currentAgent?.isAdmin) {
      toast.error("Only admins can delete calls");
      return;
    }
    if (window.confirm("Are you sure you want to delete this call?")) {
      try {
        await deleteCall(id);
        toast.success("Call deleted");
      } catch (error) {
        toast.error("Failed to delete call");
      }
    }
  };

  const handleEditCall = async (id: number) => {
    if (!currentAgent?.isAdmin) {
      toast.error("Only admins can edit calls");
      return;
    }
    const call = calls.find((c) => c.id === id);
    if (call) {
      setEditingId(id);
      setPatientName(call.patientName);
      setAppointmentId(call.appointmentId);
      setAppointmentTime(call.appointmentTime);
      setComment(call.comment || "");
      setSelectedStatus(call.status);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      await updateCall(editingId, {
        patientName,
        appointmentId,
        appointmentTime,
        comment,
        status: selectedStatus || "no_answer",
      });
      setEditingId(null);
      setPatientName("");
      setAppointmentId("");
      setAppointmentTime("12:00");
      setComment("");
      setSelectedStatus(null);
      toast.success("Call updated");
    } catch (error) {
      toast.error("Failed to update call");
    }
  };

  // Filter calls based on search query
  const filteredCalls = useMemo(() => {
    // If search query is "__CLEARED__", return empty array (for Start New Day)
    if (searchQuery === "__CLEARED__") return [];
    if (!searchQuery.trim()) return calls;
    const query = searchQuery.toLowerCase();
    return calls.filter(
      (call) =>
        call.patientName.toLowerCase().includes(query) ||
        call.appointmentId.toLowerCase().includes(query) ||
        call.appointmentTime.toLowerCase().includes(query)
    );
  }, [calls, searchQuery]);

  // Calculate agent statistics
  const agentStats = useMemo(() => {
    const stats: Record<string, { total: number; confirmed: number; noAnswer: number; redirected: number }> = {};
    calls.forEach((call) => {
      if (!stats[call.agentName]) {
        stats[call.agentName] = { total: 0, confirmed: 0, noAnswer: 0, redirected: 0 };
      }
      stats[call.agentName].total++;
      if (call.status === "confirmed") stats[call.agentName].confirmed++;
      if (call.status === "no_answer") stats[call.agentName].noAnswer++;
      if (call.status === "redirected") stats[call.agentName].redirected++;
    });
    return stats;
  }, [calls]);

  // Calculate total statistics
  const totalStats = useMemo(() => {
    return {
      total: calls.length,
      confirmed: calls.filter((c) => c.status === "confirmed").length,
      noAnswer: calls.filter((c) => c.status === "no_answer").length,
      redirected: calls.filter((c) => c.status === "redirected").length,
    };
  }, [calls]);

  // Login screen
  if (!currentAgent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 p-8 max-w-md w-full space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <img
              src="https://pura.ai/wp-content/uploads/2025/06/logo.png"
              alt="PURA Logo"
              className="h-12 mx-auto"
            />
            <h1 className="text-3xl font-bold text-cyan-400">PURA</h1>
            <p className="text-sm text-slate-400">Call Center Control Panel</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Your Name</label>
              <Input
                type="text"
                placeholder="Enter your full name"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                disabled={authLoading}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="admin"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                disabled={authLoading}
                className="rounded border-slate-600"
              />
              <label htmlFor="admin" className="text-sm text-slate-200 cursor-pointer flex items-center gap-1">
                <Lock size={14} />
                Admin Access
              </label>
            </div>

            {adminError && <p className="text-xs text-red-400">{adminError}</p>}

            <Button type="submit" disabled={authLoading} className="w-full bg-cyan-600 text-white hover:bg-cyan-700 py-2 font-semibold">
              {authLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Main application screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
            src="https://pura.ai/wp-content/uploads/2025/06/logo.png"
            alt="PURA Logo"
            className="h-8"
          />
          <h1 className="text-3xl font-bold text-cyan-400">PURA Call Center</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={handleDownloadData}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <Download size={16} className="mr-2" />
            Download Data
          </Button>
          <Button
            onClick={handleStartNewDay}
            variant="outline"
            className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/30"
          >
            <RefreshCw size={16} className="mr-2" />
            Start New Day
          </Button>
          <div className="text-right">
            <p className="text-sm text-slate-400">Agent</p>
            <p className="font-semibold text-white">{currentAgent.agentName}</p>
            {currentAgent.isAdmin && <span className="text-xs text-cyan-400">Admin</span>}
          </div>
          {currentAgent.isAdmin && (
            <Button
              onClick={() => setShowAdminDashboard(true)}
              variant="outline"
              className="border-cyan-600 text-cyan-400 hover:bg-cyan-900/30"
            >
              <BarChart3 size={16} className="mr-2" />
              Dashboard
            </Button>
          )}
          <Button onClick={logout} variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
            <LogOut size={16} className="mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Calling Panel */}
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-cyan-400">Calling Panel</h2>
            {isInProgress && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-red-900/30 border border-red-500/50">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-sm text-red-400">Call In Progress</span>
              </div>
            )}
          </div>

          {/* Input Section */}
          <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Patient Name</label>
                <Input
                  type="text"
                  placeholder="Enter patient name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  disabled={isInProgress}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">Appointment ID</label>
                <Input
                  type="text"
                  placeholder="Enter appointment ID"
                  value={appointmentId}
                  onChange={(e) => setAppointmentId(e.target.value)}
                  disabled={isInProgress}
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Appointment Time</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={isInProgress}
                    className="w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {appointmentTime}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700" align="start">
                  <TimePicker value={appointmentTime} onChange={(time) => setAppointmentTime(time)} />
                </PopoverContent>
              </Popover>
            </div>

            <Button
              onClick={handleStartCall}
              disabled={isInProgress || callsLoading}
              className="w-full bg-cyan-600 text-white hover:bg-cyan-700 py-6 text-lg font-semibold flex items-center justify-center gap-2"
            >
              <Phone size={20} />
              Calling on Pura
            </Button>
          </Card>

          {/* Status Buttons */}
          {isInProgress && (
            <Card className="bg-slate-800 border-slate-700 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wide">Call Status</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSelectedStatus(selectedStatus === "no_answer" ? null : "no_answer")}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 border text-sm ${
                    selectedStatus === "no_answer"
                      ? "bg-red-900/50 border-red-500 text-red-400"
                      : "bg-red-900/20 border-red-500/30 text-red-400 hover:bg-red-900/30"
                  }`}
                >
                  ✕ No Answer
                </button>

                <button
                  onClick={() => setSelectedStatus(selectedStatus === "confirmed" ? null : "confirmed")}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 border text-sm ${
                    selectedStatus === "confirmed"
                      ? "bg-green-900/50 border-green-500 text-green-400"
                      : "bg-green-900/20 border-green-500/30 text-green-400 hover:bg-green-900/30"
                  }`}
                >
                  ✓ Confirmed
                </button>

                <button
                  onClick={() => setSelectedStatus(selectedStatus === "redirected" ? null : "redirected")}
                  className={`py-3 px-4 rounded-lg font-semibold transition-all duration-200 border text-sm ${
                    selectedStatus === "redirected"
                      ? "bg-orange-900/50 border-orange-500 text-orange-400"
                      : "bg-orange-900/20 border-orange-500/30 text-orange-400 hover:bg-orange-900/30"
                  }`}
                >
                  → Redirected
                </button>
              </div>
            </Card>
          )}

          {/* Save/Cancel Buttons */}
          {isInProgress && (
            <div className="flex gap-3">
              <Button
                onClick={() => setShowCommentModal(true)}
                className="flex-1 bg-cyan-600 text-white hover:bg-cyan-700 py-3 font-semibold flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Save Call
              </Button>
              <Button
                onClick={handleCancelCall}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 py-3 font-semibold flex items-center justify-center gap-2"
              >
                <X size={18} />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Patient List */}
        <div className="lg:col-span-5">
          <Card className="bg-slate-800 border-slate-700 h-[calc(100vh-200px)] p-4 overflow-hidden flex flex-col">
            <h3 className="text-lg font-bold text-cyan-400 mb-4">All Patients</h3>

            {/* Search Bar */}
            <div className="mb-4 relative">
              <Search size={18} className="absolute left-3 top-3 text-slate-400" />
              <Input
                type="text"
                placeholder="Search by name, ID, or time..."
                value={searchQuery === "__CLEARED__" ? "" : searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-10 text-sm"
              />
            </div>

            {/* Patient List with Scrolling - Fixed height for 5 patients */}
            <div className="border border-slate-600 rounded overflow-hidden" style={{ maxHeight: "400px" }}>
              <ScrollArea className="w-full h-full">
                <div className="space-y-2 p-4">
                  {filteredCalls.length === 0 ? (
                    <p className="text-center text-slate-400 py-8 text-sm">
                      {searchQuery === "__CLEARED__" ? "Patient list cleared. Data is saved." : searchQuery ? "No patients found" : "No calls yet"}
                    </p>
                  ) : (
                    filteredCalls.map((call) => (
                    <Card
                      key={call.id}
                      className={`bg-slate-700 border p-2 cursor-pointer hover:bg-slate-600 transition-colors text-xs ${
                        call.status === "confirmed"
                          ? "border-green-500/50"
                          : call.status === "no_answer"
                            ? "border-red-500/50"
                            : "border-orange-500/50"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-white text-sm">{call.patientName}</p>
                            <p className="text-xs text-slate-400">ID: {call.appointmentId}</p>
                            <p className="text-xs text-cyan-400">Trials: {call.numberOfTrials}</p>
                          </div>
                          <span
                            className={`text-xs font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ml-2 ${
                              call.status === "confirmed"
                                ? "bg-green-900/50 text-green-400"
                                : call.status === "no_answer"
                                  ? "bg-red-900/50 text-red-400"
                                  : "bg-orange-900/50 text-orange-400"
                            }`}
                          >
                            {call.status === "confirmed"
                              ? "✓"
                              : call.status === "no_answer"
                                ? "✕"
                                : "→"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">
                          <span className="font-semibold">{call.appointmentTime}</span> • {call.agentName}
                        </p>
                        {call.comment && <p className="text-xs text-slate-300 italic">{call.comment}</p>}
                        {currentAgent.isAdmin && (
                          <div className="flex gap-1 mt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditCall(call.id)}
                              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-500 text-xs h-6"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteCall(call.id)}
                              className="flex-1 border-red-600/50 text-red-400 hover:bg-red-900/30 text-xs h-6"
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))
                )}
                </div>
              </ScrollArea>
            </div>
          </Card>
        </div>
      </div>

      {/* Admin Dashboard Modal */}
      {showAdminDashboard && (
        <Dialog open={showAdminDashboard} onOpenChange={setShowAdminDashboard}>
          <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">Admin Dashboard</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Total Statistics */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Overall Statistics</h3>
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-slate-700 p-3 rounded">
                    <p className="text-xs text-slate-400">Total Calls</p>
                    <p className="text-2xl font-bold text-white">{totalStats.total}</p>
                  </div>
                  <div className="bg-green-900/30 p-3 rounded border border-green-500/30">
                    <p className="text-xs text-green-400">Confirmed</p>
                    <p className="text-2xl font-bold text-green-400">{totalStats.confirmed}</p>
                  </div>
                  <div className="bg-red-900/30 p-3 rounded border border-red-500/30">
                    <p className="text-xs text-red-400">No Answer</p>
                    <p className="text-2xl font-bold text-red-400">{totalStats.noAnswer}</p>
                  </div>
                  <div className="bg-orange-900/30 p-3 rounded border border-orange-500/30">
                    <p className="text-xs text-orange-400">Redirected</p>
                    <p className="text-2xl font-bold text-orange-400">{totalStats.redirected}</p>
                  </div>
                </div>
              </div>

              {/* Agent Statistics */}
              <div>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">Agent Statistics</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {Object.entries(agentStats).map(([agent, stats]) => (
                    <div key={agent} className="bg-slate-700 p-3 rounded text-sm">
                      <div className="flex justify-between items-center mb-2">
                        <p className="font-semibold text-white">{agent}</p>
                        <p className="text-xs text-slate-400">Total: {stats.total}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-green-400">✓ Confirmed: {stats.confirmed}</div>
                        <div className="text-red-400">✕ No Answer: {stats.noAnswer}</div>
                        <div className="text-orange-400">→ Redirected: {stats.redirected}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Comment Modal */}
      <Dialog open={showCommentModal} onOpenChange={setShowCommentModal}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-cyan-400">Comments & Call Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-2">Comments (Optional)</label>
              <Textarea
                placeholder="Add any notes about this call..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white placeholder-slate-400 min-h-[100px] text-sm"
              />
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleSaveCall}
                className="flex-1 bg-cyan-600 text-white hover:bg-cyan-700 py-2 font-semibold"
              >
                Save Call
              </Button>
              <Button
                onClick={() => setShowCommentModal(false)}
                variant="outline"
                className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 py-2 font-semibold"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
