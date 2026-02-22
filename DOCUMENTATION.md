# PURA Call Center Control Panel - Complete Documentation

## Overview

The **PURA Call Center Control Panel** is a professional web-based application designed for managing patient calls, tracking appointment statuses, and providing administrative oversight. Built with modern technologies including React, TypeScript, tRPC, and MySQL, the system enables multiple agents to collaborate efficiently while maintaining data integrity and real-time synchronization.

## System Architecture

### Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| **Frontend** | React 19 + TypeScript | Latest |
| **Styling** | Tailwind CSS 4 | Latest |
| **Backend** | Express 4 + tRPC 11 | Latest |
| **Database** | MySQL/TiDB with Drizzle ORM | Latest |
| **Build Tool** | Vite | Latest |
| **Package Manager** | pnpm | Latest |
| **Testing** | Vitest | Latest |

### Project Structure

```
pura-call-center/
├── client/                          # Frontend application
│   ├── src/
│   │   ├── pages/Home.tsx          # Main application UI
│   │   ├── contexts/
│   │   │   ├── CallContext.tsx     # Call state management
│   │   │   └── AgentContext.tsx    # Agent authentication
│   │   ├── components/             # Reusable UI components
│   │   ├── lib/trpc.ts            # tRPC client configuration
│   │   └── index.css              # Global styles
│   └── public/                      # Static assets
├── server/                          # Backend application
│   ├── routers/
│   │   ├── calls.ts               # Call management procedures
│   │   └── agents.ts              # Agent procedures
│   ├── db.ts                       # Database query helpers
│   ├── _core/                      # Framework core
│   └── *.test.ts                   # Unit tests
├── drizzle/                         # Database schema & migrations
│   ├── schema.ts                   # Table definitions
│   └── migrations/                 # Migration files
├── shared/                          # Shared constants & types
└── package.json                     # Dependencies
```

## Database Schema

### Calls Table

The core table storing all patient call records with the following structure:

| Field | Type | Description |
|-------|------|-------------|
| `id` | INT | Primary key, auto-incremented |
| `patientName` | VARCHAR(255) | Patient full name |
| `appointmentId` | VARCHAR(50) | Unique appointment identifier |
| `appointmentTime` | VARCHAR(50) | Scheduled appointment time (HH:MM format) |
| `agentName` | VARCHAR(255) | Name of the agent handling the call |
| `status` | ENUM | Call outcome: `no_answer`, `confirmed`, or `redirected` |
| `comment` | TEXT | Optional notes about the call |
| `numberOfTrials` | INT | Number of times this patient has been contacted (auto-incremented on duplicate) |
| `isActive` | INT | Flag indicating if call is active (1) or cleared (0) |
| `createdAt` | TIMESTAMP | Record creation timestamp |
| `updatedAt` | TIMESTAMP | Last update timestamp |

### Key Features

**Duplicate Detection**: When a call is created with the same `patientName` and `appointmentId`, the system automatically updates the existing record instead of creating a duplicate. The `numberOfTrials` field is incremented to track how many times the patient has been contacted.

**Active Status Tracking**: The `isActive` field allows the "Start a New Day" feature to clear the UI display without deleting database records. All records remain in the database for historical tracking and reporting.

## Core Features

### 1. Agent Authentication

**Login System**: Agents enter their name to log in. No password is required for regular agents.

**Admin Access**: Only users with names "Chandan" and "Esmail" can access admin features. Admin access is verified during login and provides additional capabilities:
- View admin dashboard with statistics
- Edit existing call records
- Delete call records
- Access to all system data

**Session Management**: Each agent session is tracked with a unique session ID and timestamps for activity monitoring.

### 2. Calling Panel

The main interface for agents to log patient interactions:

**Input Fields**:
- **Patient Name**: Full name of the patient being contacted
- **Appointment ID**: Unique identifier for tracking the specific appointment
- **Appointment Time**: Time picker for selecting the scheduled appointment time
- **Call Status**: Three-button interface for recording call outcomes:
  - ✕ **No Answer**: Patient did not respond
  - ✓ **Confirmed**: Appointment confirmed with patient
  - → **Redirected**: Call transferred to another department

**Comments**: Optional field for recording additional notes about the call (displayed in modal dialog)

### 3. Patient List

Real-time display of all active patients with the following information:

- Patient name and appointment ID
- **Number of Trials**: Shows how many times the patient has been contacted (incremented on duplicate entries)
- Appointment time and assigned agent
- Call status indicator (color-coded)
- Comments if available
- Edit/Delete buttons (admin only)

**Search Functionality**: Filter patients by name, appointment ID, or time in real-time.

**Scrolling**: Displays 5 patients at a time with vertical scrolling for additional records.

### 4. Admin Dashboard

Accessible only to admin users (Chandan and Esmail), providing comprehensive statistics:

**Overall Statistics**:
- Total number of calls
- Number of confirmed appointments
- Number of no-answer calls
- Number of redirected calls

**Agent Statistics**: Detailed breakdown per agent showing:
- Total calls handled
- Confirmed appointments
- No-answer calls
- Redirected calls

### 5. Start a New Day

Clears the patient list from the UI display while preserving all data in the database. This feature:
- Deactivates all current calls (sets `isActive = 0`)
- Clears the displayed patient list
- Resets the search query
- Allows agents to start fresh without losing historical data

### 6. Data Export

**Download Data Button**: Exports all call records as a CSV file containing:
- Call ID
- Patient name
- Appointment ID
- Appointment time
- Agent name
- Call status
- Number of trials
- Comments
- Creation timestamp

The CSV file is automatically named with the current date (format: `pura_calls_YYYY-MM-DD.csv`).

## API Procedures (tRPC)

### Call Management

#### `calls.create`
Creates a new call or updates an existing one if a duplicate is detected.

**Input**:
```typescript
{
  patientName: string;
  appointmentId: string;
  appointmentTime: string;
  agentName: string;
  comment?: string;
}
```

**Behavior**: If a call with the same `patientName` and `appointmentId` exists, the system increments `numberOfTrials` and updates the record instead of creating a duplicate.

#### `calls.list`
Retrieves all calls from the database, sorted by newest first.

#### `calls.listActive`
Retrieves only active calls (where `isActive = 1`), used for the main patient list display.

#### `calls.update`
Updates an existing call record with new values.

**Input**:
```typescript
{
  id: number;
  patientName?: string;
  appointmentId?: string;
  appointmentTime?: string;
  agentName?: string;
  status?: "no_answer" | "confirmed" | "redirected";
  comment?: string;
  numberOfTrials?: number;
}
```

#### `calls.delete`
Deletes a call record (admin only).

#### `calls.export`
Exports all calls as CSV content.

**Returns**:
```typescript
{
  success: boolean;
  csv: string;
  fileName: string;
}
```

#### `calls.startNewDay`
Deactivates all calls (sets `isActive = 0`), clearing them from the UI display.

## Frontend State Management

### CallContext

Manages all call-related state and operations:

```typescript
interface CallContextType {
  calls: Call[];                    // Array of active calls
  isLoading: boolean;               // Loading state
  addCall: (call) => Promise<void>; // Create/update call
  updateCall: (id, updates) => Promise<void>; // Update call
  deleteCall: (id) => Promise<void>; // Delete call
  exportCalls: () => Promise<{csv, fileName}>; // Export as CSV
  refreshCalls: () => Promise<void>; // Manually refresh
  startNewDay: () => Promise<void>; // Clear patient list
}
```

**Real-time Updates**: The context automatically refetches data every 2 seconds, ensuring all agents see the latest call information.

### AgentContext

Manages agent authentication and session:

```typescript
interface AgentContextType {
  currentAgent: Agent | null;       // Current logged-in agent
  login: (name, isAdmin) => Promise<void>; // Login agent
  logout: () => void;               // Logout agent
  isLoading: boolean;               // Loading state
}
```

## User Interface

### Design System

**Color Scheme**:
- **Primary**: Cyan (#06B6D4) for main actions and highlights
- **Success**: Green (#22C55E) for confirmed calls
- **Warning**: Red (#EF4444) for no-answer calls
- **Info**: Orange (#F97316) for redirected calls
- **Background**: Dark slate (#0F172A to #1E293B) for professional appearance

**Typography**:
- **Headings**: Bold, larger font sizes for clear hierarchy
- **Body**: Regular weight for readability
- **Status**: Small, monospace for technical information

**Components**:
- Shadcn/ui components for consistency
- Tailwind CSS utilities for responsive design
- Custom TimePicker for appointment time selection
- Popover for dropdown selections
- Dialog modals for comments and admin dashboard

## Installation & Setup

### Prerequisites

- Node.js 18+ with pnpm package manager
- MySQL/TiDB database instance
- Environment variables configured

### Local Development

1. **Clone and Install**:
   ```bash
   cd pura-call-center
   pnpm install
   ```

2. **Database Setup**:
   ```bash
   pnpm db:push
   ```

3. **Start Development Server**:
   ```bash
   pnpm dev
   ```

4. **Run Tests**:
   ```bash
   pnpm test
   ```

### Environment Variables

Required environment variables (automatically injected by Manus platform):

```
DATABASE_URL=mysql://user:password@host:port/database
JWT_SECRET=your-secret-key
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

## Testing

The project includes 9 unit tests covering:

- Call creation and duplicate detection
- Call updates and status changes
- Call deletion
- CSV export functionality
- Start a new day feature
- Agent authentication
- Admin access control

**Run Tests**:
```bash
pnpm test
```

## Deployment

### Manus Hosting (Current)

The application is deployed at: **https://puracallcntr-drrmizus.manus.space/**

**Features**:
- Automatic SSL/TLS encryption
- Built-in database hosting
- Real-time synchronization
- Persistent storage

### Alternative Hosting Options

See the **Deployment Guide** section below for instructions on migrating to free hosting platforms like Render.com or Railway.

## Troubleshooting

### Common Issues

**Issue**: Clinic field still appears in UI
**Solution**: Clear browser cache and refresh the page. The clinic field has been removed from the database schema and UI.

**Issue**: Number of trials not incrementing
**Solution**: Ensure the patient name and appointment ID match exactly. The duplicate detection is case-sensitive.

**Issue**: Data not persisting after "Start a New Day"
**Solution**: Data is preserved in the database with `isActive = 0`. Use the search function to restore view or manually query the database.

**Issue**: Admin dashboard not accessible
**Solution**: Verify your login name is exactly "Chandan" or "Esmail" (case-sensitive).

## Support & Maintenance

For issues or feature requests, contact the development team. All data is automatically backed up by the database system.

---

**Last Updated**: February 20, 2026
**Version**: 1.0.0
**Status**: Production Ready
