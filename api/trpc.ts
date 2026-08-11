export default async function handleRequest(request: Request): Promise<Response> {
  return new Response(JSON.stringify({ 
    status: "ok", 
    message: "Minimal Vercel Function is working",
    url: request.url,
    method: request.method
  }), {
    headers: { "Content-Type": "application/json" }
  });
}
