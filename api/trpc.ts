export default function handler(req: any, res: any) {
  res.status(200).json({ 
    status: "ok", 
    message: "Standard Vercel Node Function is working",
    url: req.url,
    method: req.method
  });
}
