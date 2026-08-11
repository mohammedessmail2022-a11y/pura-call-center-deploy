const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  const [stats, indexes] = await Promise.all([
    client.query(`
      SELECT
        count(*)::int AS total_calls,
        count(*) FILTER (WHERE "isActive" = 1)::int AS active_calls
      FROM calls;
    `),
    client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' AND tablename = 'calls'
      ORDER BY indexname;
    `),
  ]);

  console.log(JSON.stringify({
    calls: stats.rows[0],
    indexes: indexes.rows,
  }, null, 2));

  await client.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
