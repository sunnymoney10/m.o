import {inviteHash} from '../lib/guest-access';
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import { longId } from "../lib/short-link";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

const PLAN_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

// Invite links shared in a group chat show "<host> invited you: <plan>" instead of a generic m.o card.
// Uses only what anyone with the link can already see (plan name, host name), never the address.
async function withInvitePreview(request: Request, env: Cloudflare.Env, pending: Promise<Response> | Response): Promise<Response> {
  const response = await pending;
  const url = new URL(request.url);
  const id = url.searchParams.get("plan") || "";
  if (request.method !== "GET" || url.pathname !== "/" || !(response.headers.get("content-type") || "").includes("text/html")) return response;
  // A preview picture for every shared link: the plan's own cover (a photo or Genmoji the host chose), otherwise an
  // m.o illustration (public/og, made by scripts/og-images.cjs). Never the address or anyone's details.
  const image = (src: string, w: number, h: number, alt: string) => `<meta property="og:image" content="${src}"><meta property="og:image:width" content="${w}"><meta property="og:image:height" content="${h}"><meta property="og:image:alt" content="${esc(alt)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${src}">`;
  if (!PLAN_ID.test(id)) {
    if (url.search) return response;
    const home = `<meta property="og:title" content="m.o: Make it out the groupchat"><meta property="og:description" content="One link for the plan, who’s coming, and who’s bringing what. Free."><meta property="og:type" content="website"><meta property="og:site_name" content="m.o"><meta property="og:url" content="${url.origin}/">${image(`${url.origin}/og/home.png`, 1200, 630, "Friends around a table, drawn in m.o’s style")}`;
    return new HTMLRewriter().on("head", { element(el) { el.append(home, { html: true }); } }).transform(response);
  }
  try {
    const db = (env as unknown as { DB?: D1Database }).DB;
    const row = db && (await db.prepare("SELECT p.title, p.kind, p.cover_updated, length(p.cover_image) > 0 AS has_cover, g.name AS host FROM plans p LEFT JOIN guests g ON g.plan_id = p.id AND g.actor = p.owner WHERE p.id = ?").bind(id).first<{ title: string; kind: string; cover_updated: string | null; has_cover: number; host: string | null }>());
    if (!row) return response;
    const title = esc(row.host ? `${row.host} invited you: ${row.title}` : `You're invited: ${row.title}`);
    const description = esc(row.kind === "trip" ? "Tap to see the plan, say if you're in, and see what still needs doing." : "Tap to see the plan, say if you're coming, and pick something to bring.");
    const tags = `<meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:type" content="website"><meta property="og:site_name" content="m.o"><meta name="twitter:title" content="${title}"><meta name="description" content="${description}">${row.has_cover ? image(`${url.origin}/api/plan/${id}/cover?v=${encodeURIComponent(row.cover_updated || "")}`, 1000, 500, "The plan’s invite picture") : image(`${url.origin}/og/${row.kind === "trip" ? "trip" : "gathering"}.png`, 1200, 630, row.kind === "trip" ? "A road trip, drawn in m.o’s style" : "Friends around a table, drawn in m.o’s style")}`;
    return new HTMLRewriter()
      .on("title", { element(el) { el.setInnerContent(title, { html: true }); } })
      .on('meta[name="description"]', { element(el) { el.remove(); } })
      .on("head", { element(el) { el.append(tags, { html: true }); } })
      .transform(response);
  } catch {
    return response;
  }
}

// Short links: /p/<code> opens a plan, /i/<code> opens one guest's personal invite.
// They redirect to the full address, which also carries the group-chat preview.
async function shortLink(request: Request, env: Cloudflare.Env): Promise<Response | null> {
  const url = new URL(request.url);
  const personal=url.pathname.match(/^\/i\/([A-Za-z0-9_-]{43})\/?$/);
  if(personal&&(request.method==='GET'||request.method==='HEAD')){
    const db=(env as unknown as {DB?:D1Database}).DB;
    const row=db&&await db.prepare("SELECT plan_id,id FROM guests WHERE invite_hash=? AND invite_expires>?").bind(await inviteHash(personal[1]),new Date().toISOString()).first<{plan_id:string;id:string}>();
    return row?new Response(null,{status:302,headers:{Location:`${url.origin}/?plan=${row.plan_id}&g=${row.id}#invite=${personal[1]}`,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}}):new Response('This invitation has expired or was revoked. Ask your host for a new personal link.',{status:410,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
  }
  const hk = url.pathname.match(/^\/h\/([A-Za-z0-9_-]{24})\/?$/);
  if (hk && (request.method === "GET" || request.method === "HEAD")) return Response.redirect(`${url.origin}/?hostkey=${hk[1]}`, 302);
  const m = url.pathname.match(/^\/([pi])\/([A-Za-z0-9_-]{22})\/?$/);
  if (!m || (request.method !== "GET" && request.method !== "HEAD")) return null;
  const id = longId(m[2]);
  const home = (q: string) => Response.redirect(`${url.origin}/${q}`, 302);
  if (!id) return home("");
  if (m[1] === "p") return home(`?plan=${id}`);
  const db = (env as unknown as { DB?: D1Database }).DB;
  const row = db && (await db.prepare("SELECT plan_id FROM guests WHERE id = ?").bind(id).first<{ plan_id: string }>().catch(() => null));
  return row ? home(`?plan=${row.plan_id}&g=${id}`) : home("");
}

const worker = {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const short = await shortLink(request, env);
    if (short) return short;
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
    const rendered=await withInvitePreview(request,env,response);
    // Establish the visitor before the page starts parallel /me and /plans loads.
    // Otherwise two first-load API responses can race to overwrite the host's cookie.
    if((rendered.headers.get('content-type')||'').includes('text/html')){
      const headers=new Headers(rendered.headers);headers.set('Referrer-Policy','no-referrer');headers.set('Cache-Control','no-store');
      if(!/(?:^|; )mo_session=[a-f0-9-]{36}(?:;|$)/.test(request.headers.get('cookie')||''))headers.append('Set-Cookie',`mo_session=${crypto.randomUUID()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000`);
      headers.set('Cache-Control','private, no-store');
      return new Response(rendered.body,{status:rendered.status,statusText:rendered.statusText,headers});
    }
    return rendered;
  },
};

export default worker;
