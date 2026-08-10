import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"] | FetchCreateContextFnOptions["req"];
  res: CreateExpressContextOptions["res"] | FetchCreateContextFnOptions["resHeaders"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  // No Manus OAuth - user is always null (app uses its own agent auth)
  return {
    req: opts.req,
    res: opts.res,
    user: null,
  };
}

export async function createFetchContext(
  opts: FetchCreateContextFnOptions
): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.resHeaders,
    user: null,
  };
}
