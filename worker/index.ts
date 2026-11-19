import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const PLAN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Invite links shared in a group chat show "<host> invited you: <plan>" instead of a generic m.o card.
// Uses only what anyone with the link can already see (plan name, host name), never the address.
async function withInvitePreview(request: Request, env: Cloudflare.Env, pending: Promise<Response> | Response): Promise<Response> {
  const response = await pending;
  const url = new URL(request.url);
  const id = url.searchParams.get("plan") || "";
  if (request.method !== "GET" || url.pathname !== "/" || !PLAN_ID.test(id) || !(response.headers.get("content-type") || "").includes("text/html")) return response;
  try {
    const db = (env as unknown as { DB?: D1Database }).DB;
    const row = db && (await db.prepare("SELECT p.title, g.name AS host FROM plans p LEFT JOIN guests g ON g.plan_id = p.id AND g.actor = p.owner WHERE p.id = ?").bind(id).first<{ title: string; host: string | null }>());
    if (!row) return response;
    const title = esc(row.host ? `${row.host} invited you: ${row.title}` : `You're invited: ${row.title}`);
    const description = esc("Tap to see the plan, say if you're coming, and pick something to bring.");
    const tags = `<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="m.o"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="${title}"><meta name="description" content="${description}">`;
    return new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title, { html: true }); } })
      .on('meta[name="description"]', { element(el) { el.remove(); } })
      .on("head", { element(el) { el.append(tags, { html: true }); } })
      .transform(response);
  } catch {
    return response;
  }
}

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    const response = runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
    return withInvitePreview(request, env, response);
  },
};

export default worker;
