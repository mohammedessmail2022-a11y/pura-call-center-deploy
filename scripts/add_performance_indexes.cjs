const { Client } = require('pg');

const statements = [
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS calls_active_recent_idx
     ON public.calls ("createdAt" DESC, id DESC)
     WHERE "isActive" = 1`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS calls_active_agent_status_idx
     ON public.calls ("agentName", status)
     WHERE "isActive" = 1`,
];

const searchStatements = [
  `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS calls_active_patient_name_trgm_idx
     ON public.calls USING gin ("patientName" gin_trgm_ops)
     WHERE "isActive" = 1`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS calls_active_appointment_id_trgm_idx
     ON public.calls USING gin ("appointmentId" gin_trgm_ops)
     WHERE "isActive" = 1`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS calls_active_appointment_time_trgm_idx
     ON public.calls USING gin ("appointmentTime" gin_trgm_ops)
     WHERE "isActive" = 1`,
];

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });
  await client.connect();

  const completed = [];
  try {
    for (const statement of statements) {
      await client.query(statement);
      completed.push(statement.replace(/\s+/g, ' ').trim());
    }

    try {
      for (const statement of searchStatements) {
        await client.query(statement);
        completed.push(statement.replace(/\s+/g, ' ').trim());
      }
    } catch (searchError) {
      // The critical ordering and aggregation indexes have already been created.
      console.warn(`Search-index setup skipped: ${searchError.message}`);
    }

    console.log(JSON.stringify({ created_or_present: completed.length }, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
