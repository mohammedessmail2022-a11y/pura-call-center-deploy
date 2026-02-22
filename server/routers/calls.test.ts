import { describe, it, expect, vi, beforeEach } from "vitest";
import { callsRouter } from "./calls";
import * as db from "../db";

// Mock the database functions
vi.mock("../db", () => ({
  getAllCalls: vi.fn(),
  createCall: vi.fn(),
  updateCallRecord: vi.fn(),
  deleteCallRecord: vi.fn(),
  findDuplicateCall: vi.fn(),
  getDb: vi.fn(),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getCallById: vi.fn(),
  getAgentSession: vi.fn(),
  upsertAgentSession: vi.fn(),
}));

describe("callsRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return all calls sorted by newest first", async () => {
      const mockCalls = [
        {
          id: 1,
          patientName: "John Doe",
          appointmentId: "12345",
          appointmentTime: "10:00 AM",
          agentName: "Agent 1",
          status: "confirmed" as const,
          comment: "Test",
          numberOfTrials: 1,
          isActive: 1,
          createdAt: new Date("2026-02-09T08:00:00Z"),
          updatedAt: new Date("2026-02-09T08:00:00Z"),
        },
        {
          id: 2,
          patientName: "Jane Smith",
          appointmentId: "67890",
          appointmentTime: "11:00 AM",
          agentName: "Agent 2",
          status: "no_answer" as const,
          comment: null,
          numberOfTrials: 1,
          isActive: 1,
          createdAt: new Date("2026-02-09T09:00:00Z"),
          updatedAt: new Date("2026-02-09T09:00:00Z"),
        },
      ];

      (db.getAllCalls as any).mockResolvedValue(mockCalls);

      const caller = callsRouter.createCaller({});
      const result = await caller.list();

      expect(result).toHaveLength(2);
      expect(result[0].patientName).toBe("Jane Smith");
    });

    it("should return empty array when no calls exist", async () => {
      (db.getAllCalls as any).mockResolvedValue([]);

      const caller = callsRouter.createCaller({});
      const result = await caller.list();

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a new call with no_answer status", async () => {
      (db.findDuplicateCall as any).mockResolvedValue(undefined);
      (db.createCall as any).mockResolvedValue({ insertId: 1 } as any);

      const caller = callsRouter.createCaller({});
      const result = await caller.create({
        patientName: "John Doe",
        appointmentId: "12345",
        appointmentTime: "10:00 AM",
        agentName: "Agent 1",
        comment: "Test comment",
      });

      expect(result.success).toBe(true);
      expect(result.isUpdate).toBe(false);
      expect(db.createCall).toHaveBeenCalledWith({
        patientName: "John Doe",
        appointmentId: "12345",
        appointmentTime: "10:00 AM",
        agentName: "Agent 1",
        status: "no_answer",
        comment: "Test comment",
        numberOfTrials: 1,
      });
    });

    it("should fail with invalid input", async () => {
      (db.findDuplicateCall as any).mockResolvedValue(undefined);

      const caller = callsRouter.createCaller({});

      try {
        await caller.create({
          patientName: "",
          appointmentId: "12345",
          appointmentTime: "10:00 AM",
          agentName: "Agent 1",
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it("should update existing call and increment numberOfTrials on duplicate", async () => {
      const existingCall = {
        id: 1,
        patientName: "John Doe",
        appointmentId: "12345",
        appointmentTime: "10:00 AM",
        agentName: "Agent 1",
        status: "no_answer" as const,
        comment: null,
        numberOfTrials: 1,
        isActive: 1,
        createdAt: new Date("2026-02-09T08:00:00Z"),
        updatedAt: new Date("2026-02-09T08:00:00Z"),
      };

      (db.findDuplicateCall as any).mockResolvedValue(existingCall);
      (db.updateCallRecord as any).mockResolvedValue({} as any);

      const caller = callsRouter.createCaller({});
      const result = await caller.create({
        patientName: "John Doe",
        appointmentId: "12345",
        appointmentTime: "10:30 AM",
        agentName: "Agent 1",
        comment: "Second attempt",
      });

      expect(result.success).toBe(true);
      expect(result.isUpdate).toBe(true);
      expect(db.updateCallRecord).toHaveBeenCalledWith(1, {
        appointmentTime: "10:30 AM",
        agentName: "Agent 1",
        status: "no_answer",
        comment: "Second attempt",
        numberOfTrials: 2,
      });
    });
  });

  describe("update", () => {
    it("should update a call", async () => {
      (db.updateCallRecord as any).mockResolvedValue({} as any);

      const caller = callsRouter.createCaller({});
      const result = await caller.update({
        id: 1,
        status: "confirmed",
        comment: "Updated comment",
      });

      expect(result.success).toBe(true);
      expect(db.updateCallRecord).toHaveBeenCalledWith(1, {
        status: "confirmed",
        comment: "Updated comment",
      });
    });
  });

  describe("delete", () => {
    it("should delete a call", async () => {
      (db.deleteCallRecord as any).mockResolvedValue({} as any);

      const caller = callsRouter.createCaller({});
      const result = await caller.delete({ id: 1 });

      expect(result.success).toBe(true);
      expect(db.deleteCallRecord).toHaveBeenCalledWith(1);
    });
  });

  describe("export", () => {
    it("should export calls as CSV", async () => {
      const mockCalls = [
        {
          id: 1,
          patientName: "John Doe",
          appointmentId: "12345",
          appointmentTime: "10:00 AM",
          agentName: "Agent 1",
          status: "confirmed" as const,
          comment: "Test",
          numberOfTrials: 1,
          isActive: 1,
          createdAt: new Date("2026-02-09T08:00:00Z"),
          updatedAt: new Date("2026-02-09T08:00:00Z"),
        },
      ];

      (db.getAllCalls as any).mockResolvedValue(mockCalls);

      const caller = callsRouter.createCaller({});
      const result = await caller.export();

      expect(result.success).toBe(true);
      expect(result.csv).toContain("ID,Patient Name,Appointment ID");
      expect(result.csv).toContain("Number of Trials");
      expect(result.csv).toContain("John Doe");
      expect(result.csv).toContain("12345");
      expect(result.fileName).toMatch(/pura_calls_\d{4}-\d{2}-\d{2}\.csv/);
    });

    it("should export multiple calls as CSV", async () => {
      const mockCalls = [
        {
          id: 1,
          patientName: "John Doe",
          appointmentId: "12345",
          appointmentTime: "10:00 AM",
          agentName: "Agent 1",
          status: "confirmed" as const,
          comment: "Test",
          numberOfTrials: 2,
          isActive: 1,
          createdAt: new Date("2026-02-09T08:00:00Z"),
          updatedAt: new Date("2026-02-09T08:00:00Z"),
        },
        {
          id: 2,
          patientName: "Jane Smith",
          appointmentId: "67890",
          appointmentTime: "11:00 AM",
          agentName: "Agent 2",
          status: "no_answer" as const,
          comment: null,
          numberOfTrials: 1,
          isActive: 1,
          createdAt: new Date("2026-02-09T09:00:00Z"),
          updatedAt: new Date("2026-02-09T09:00:00Z"),
        },
      ];

      (db.getAllCalls as any).mockResolvedValue(mockCalls);

      const caller = callsRouter.createCaller({});
      const result = await caller.export();

      expect(result.success).toBe(true);
      expect(result.csv).toContain("John Doe");
      expect(result.csv).toContain("Jane Smith");
      expect(result.csv).toContain("12345");
      expect(result.csv).toContain("67890");
      expect(result.csv).toContain("2"); // numberOfTrials for John Doe
    });
  });
});
