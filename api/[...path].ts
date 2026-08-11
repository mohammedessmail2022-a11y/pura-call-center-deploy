export default function handler(req: any, res: any) {
  res.status(200).json({
    status: "ok",
    route: "catch-all",
    url: req.url,
    method: req.method,
  });
}
