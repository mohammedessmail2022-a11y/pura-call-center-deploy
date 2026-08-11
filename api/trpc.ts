export default async function handler(req: any, res: any) {
  const dbUrl = process.env.DATABASE_URL || "";
  const maskedUrl = dbUrl.substring(0, 15) + "..." + dbUrl.substring(dbUrl.length - 5);
  console.log(`[tRPC] DB URL check: ${maskedUrl}`);

  return res.status(200).json({ 
    status: "ok", 
    db_check: maskedUrl,
    url: req.url
  });
}
