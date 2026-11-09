import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { orderSchema } from "./terminal-contract";
import { verifyDemoToken } from "./demo-token.server";
import { botRangeSchema } from "./bot-range-contract";

export async function handleTerminalRequest(request: Request, path: string) {
  const headers = { "Cache-Control": "no-store" };
  const reply = (data: unknown, status = 200) => Response.json(data, { status, headers });
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return reply({ error: "Please sign in again." }, 401);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const demoPayload = verifyDemoToken(token);
  let userId: string;
  let client: SupabaseClient;
  if (demoPayload) {
    userId = demoPayload.userId;
    client = supabaseAdmin as SupabaseClient;
  } else {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["PLOTOS_PUBLISHABLE_KEY"];
    if (!url || !key) return reply({ error: "Authentication unavailable" }, 503);
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          h.set("apikey", key);
          if (h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          return fetch(input, { ...init, headers: h });
        },
      },
    });
    const { data: identity, error: authError } = await client.auth.getUser(token);
    if (authError || !identity.user) return reply({ error: "Please sign in again." }, 401);
    userId = identity.user.id;
  }
  try {
    const botRead = path.match(/^v1\/accounts\/([A-Za-z0-9_-]{1,80})\/bot-range$/);
    if ((request.method === "GET" && botRead) || (request.method === "POST" && path === "update-bot-range")) {
      const input = request.method === "GET"
        ? { accountId: botRead?.[1], symbol: new URL(request.url).searchParams.get("symbol") }
        : botRangeSchema.parse(await readRangeBody(request));
      const accountId = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/).parse(input.accountId);
      z.literal("XAUUSD").parse(input.symbol);
      const { data: account, error: ownerError } = await client.from("pf_engine_accounts")
        .select("id,user_id").eq("id", accountId).eq("user_id", userId).maybeSingle();
      if (ownerError) throw ownerError;
      if (!account) return reply({ error: "Account not found" }, 404);
      // Only the account owner can access the privileged range RPC. It repeats
      // ownership under an account lock, and never creates or activates a bot.
      const write = request.method === "POST" ? botRangeSchema.parse(input) : null;
      const { data, error } = await supabaseAdmin.rpc("pf_engine_bot_range", {
        p_user_id: userId, p_account_id: accountId, p_symbol: "XAUUSD",
        p_high: write?.range_high ?? null, p_low: write?.range_low ?? null,
      });
      if (error) {
        if (error.code === "P0002") return reply({ error: "الروبوت غير موجود في قاعدة الحساب الحالية" }, 404);
        if (error.code === "42501") return reply({ error: "Access denied" }, 403);
        return reply({ error: "حفظ نطاق الروبوت غير متاح؛ يلزم ربط قاعدة الروبوت وتطبيق تحديثها" }, 503);
      }
      return reply(data);
    }
    if (request.method === "GET" && path === "v1/accounts") {
      const { data, error } = await client
        .from("pf_engine_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("id");
      if (error) throw error;
      return reply({ accounts: data ?? [] });
    }
    const state = path.match(/^v1\/accounts\/([A-Za-z0-9_-]{1,80})\/state$/);
    if (request.method === "GET" && state) {
      const { data: account, error } = await client
        .from("pf_engine_accounts")
        .select("*")
        .eq("id", state[1])
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!account) return reply({ error: "Account not found" }, 404);
      const tables = [
        "pf_engine_positions",
        "pf_engine_orders",
        "pf_engine_ledger",
        "pf_engine_trades_history",
      ];
      const results = await Promise.all(
        tables.map((table) =>
          client
            .from(table)
            .select("*")
            .eq("account_id", account.id)
            .eq("user_id", userId)
            .order(
              table === "pf_engine_positions"
                ? "opened_at"
                : table === "pf_engine_trades_history"
                  ? "closed_at"
                  : "created_at",
              { ascending: false },
            )
            .limit(500),
        ),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
      return reply({
        account,
        positions: results[0]?.data ?? [],
        orders: results[1]?.data ?? [],
        ledger: results[2]?.data ?? [],
        history: results[3]?.data ?? [],
      });
    }
    if (request.method !== "POST") return reply({ error: "Not found" }, 404);
    if (Number(request.headers.get("content-length") ?? 0) > 16384)
      return reply({ error: "Request too large" }, 413);
    const text = await request.text();
    if (text.length > 16384) return reply({ error: "Request too large" }, 413);
    const body: unknown = JSON.parse(text || "{}");
    if (path === "v1/reconcile-candles") {
      z.object({ lookbackMinutes: z.number().int().min(1).max(1000).optional() }).strict().parse(body);
      const { data: positions, error: positionsError } = await supabaseAdmin
        .from("pf_engine_positions")
        .select("id,symbol,opened_at,protection_changed_at")
        .eq("user_id", userId)
        .eq("status", "OPEN")
        .or("stop_loss.not.is.null,take_profit.not.is.null")
        .order("opened_at", { ascending: true })
        .limit(100);
      if (positionsError) throw positionsError;
      const symbols = [...new Set((positions ?? []).map((row) => row.symbol as string))];
      const results: Array<Record<string, unknown>> = [];
      const { parseRiskBars } = await import("./engine-candles");
      for (const symbol of symbols) {
        const response = await fetch(
          `https://biquote.io/api/${encodeURIComponent(symbol)}/ohlc?interval=1m&limit=1000`,
          { signal: AbortSignal.timeout(8_000) },
        );
        if (!response.ok) throw new Error(`Candle source returned ${response.status}`);
        const parsed = parseRiskBars(await response.json());
        if (!parsed.bars.length) {
          results.push({ symbol, closed: 0, unresolved: 0, bars: 0, basis: parsed.basis });
          continue;
        }
        const { data, error } = await supabaseAdmin.rpc("pf_engine_reconcile_candles", {
          p_symbol: symbol,
          p_bars: parsed.bars,
          p_basis: parsed.basis,
          p_user_id: userId,
        });
        if (error) throw error;
        results.push({ symbol, ...(data as Record<string, unknown>), bars: parsed.bars.length });
      }
      return reply({ results });
    }
    let rpc: string, args: Record<string, unknown>;
    if (path === "v1/orders") {
      const x = orderSchema.parse(body);
      rpc = "pf_engine_place_order";
      args = {
        p_user_id: userId,
        p_account_id: x.accountId,
        p_request_id: x.requestId,
        p_symbol: x.symbol,
        p_side: x.side,
        p_order_type: x.type,
        p_lots: x.lots,
        p_trigger: x.price ?? null,
        p_sl: x.stopLoss ?? null,
        p_tp: x.takeProfit ?? null,
      };
    } else {
      const m = path.match(
        /^v1\/(positions|orders)\/([^/]+)\/(close|close-partial|protection|cancel|modify)$/,
      );
      if (!m) return reply({ error: "Not found" }, 404);
      const id = z.string().uuid().parse(m[2]);
      const protection = z
        .object({
          stopLoss: z.number().positive().nullable(),
          takeProfit: z.number().positive().nullable(),
        })
        .strict();
      args = { p_user_id: userId };
      if (m[1] === "positions") {
        args["p_position_id"] = id;
        if (m[3] === "close" || m[3] === "close-partial") {
          const x = z
            .object({
              requestId: z.string().uuid(),
              ...(m[3] === "close-partial" ? { lots: z.number().min(0.01).max(99.99) } : {}),
            })
            .strict()
            .parse(body);
          args["p_request_id"] = x.requestId;
          rpc = m[3] === "close" ? "pf_engine_close_position" : "pf_engine_close_partial";
          if ("lots" in x) args["p_close_lots"] = x.lots;
        } else if (m[3] === "protection") {
          const x = protection.parse(body);
          rpc = "pf_engine_modify_position";
          args["p_sl"] = x.stopLoss;
          args["p_tp"] = x.takeProfit;
        } else return reply({ error: "Not found" }, 404);
      } else {
        args["p_order_id"] = id;
        if (m[3] === "cancel") {
          z.object({}).strict().parse(body);
          rpc = "pf_engine_cancel_order";
        } else if (m[3] === "modify") {
          const x = protection.extend({ price: z.number().positive() }).parse(body);
          rpc = "pf_engine_modify_order";
          args["p_trigger"] = x.price;
          args["p_sl"] = x.stopLoss;
          args["p_tp"] = x.takeProfit;
        } else return reply({ error: "Not found" }, 404);
      }
    }
    // Identity is verified above; engine RPCs enforce ownership atomically using p_user_id.
    // Order execution cannot depend on whether the minute monitor just ran.
    const { refreshEngineQuotes } = await import("./engine-quotes.server");
    await refreshEngineQuotes();
    const { data, error } = await client.rpc(rpc, args);
    if (error)
      return reply(
        { error: error.message },
        error.code === "42501"
          ? 403
          : error.code === "P0002"
            ? 404
            : error.code === "55000"
              ? 409
              : 400,
      );
    return reply(data);
  } catch (e) {
    if (e instanceof z.ZodError || e instanceof SyntaxError)
      return reply({ error: "Invalid request" }, 400);
    return reply({ error: "Trading state unavailable" }, 503);
  }
}

async function readRangeBody(request: Request): Promise<unknown> {
  if (Number(request.headers.get("content-length") ?? 0) > 2048) throw new SyntaxError("Body too large");
  const body = await request.text();
  if (body.length > 2048) throw new SyntaxError("Body too large");
  return JSON.parse(body);
}
