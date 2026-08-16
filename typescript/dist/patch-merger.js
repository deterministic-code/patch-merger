var Y = Object.defineProperty;
var H = (t, e, n) => e in t ? Y(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var p = (t, e, n) => H(t, typeof e != "symbol" ? e + "" : e, n);
import { readFile as P, mkdir as C, chmod as V, writeFile as q, readdir as z } from "node:fs/promises";
import { join as $, dirname as _ } from "node:path";
class j extends Error {
  constructor(e) {
    super(e), this.name = "MarkedSectionMissingError";
  }
}
function U(t) {
  var r, o;
  if (t.length === 0) return t;
  const e = t.split(`
`);
  let n = 1 / 0;
  for (const i of e) {
    if (i.length === 0) continue;
    const c = ((o = (r = i.match(/^[ \t]*/)) == null ? void 0 : r[0]) == null ? void 0 : o.length) ?? 0;
    c < i.length && c < n && (n = c);
  }
  return !Number.isFinite(n) || n === 0 ? t : e.map((i) => i.length === 0 ? "" : i.slice(n)).join(`
`);
}
function M(t, e) {
  const n = t.endsWith(`
`) ? t.slice(0, -1) : t, r = U(n);
  return r.length === 0 ? "" : r.split(`
`).map((o) => o.length === 0 ? "" : `${e}${o}`).join(`
`);
}
function N(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function F(t, e) {
  var o, i;
  const n = (o = t.match(
    new RegExp(`^.*===\\s*BEGIN\\s+${N(e)}\\b.*$`, "m")
  )) == null ? void 0 : o[0], r = (i = t.match(
    new RegExp(`^.*===\\s*END\\s+${N(e)}\\b.*$`, "m")
  )) == null ? void 0 : i[0];
  return n && r ? { start: n, end: r } : null;
}
function X(t) {
  var e;
  return ((e = t.match(/^.*===\s*BEGIN\s+\S+.*$/m)) == null ? void 0 : e[0]) ?? null;
}
function W({
  original: t,
  startMarker: e,
  endMarker: n,
  block: r
}) {
  const o = t.indexOf(e), i = t.indexOf(n);
  if (o === -1 || i === -1 || i < o)
    throw new j(
      `markers '${e}' / '${n}' absent or out of order`
    );
  const c = t.slice(0, o + e.length), s = t.slice(i), a = t.lastIndexOf(`
`, o) + 1, l = t.slice(a, o), f = M(r, l), h = f.length === 0 ? `
${l}` : `
${f}
${l}`;
  return `${c}${h}${s}`;
}
const A = {
  "docker-compose.yml": {
    skeleton: `services:
`,
    indent: "  ",
    sectionPrefix: "COMPOSE_SERVICE"
  },
  ".env": {
    skeleton: "",
    indent: "",
    sectionPrefix: "ENV"
  },
  ".env.example": {
    skeleton: "",
    indent: "",
    sectionPrefix: "ENV"
  },
  ".gitignore": {
    skeleton: `.env
`,
    indent: "",
    sectionPrefix: "GITIGNORE"
  }
};
function Z(t) {
  const e = t.slice(t.lastIndexOf("/") + 1);
  return A[e] ?? null;
}
function Ct(t) {
  return Z(t) !== null;
}
function Q(t) {
  const e = `${t.sectionPrefix}_`;
  return (n) => {
    if (!n.some((s) => {
      var a;
      return (a = s.section) == null ? void 0 : a.startsWith(e);
    })) return null;
    const o = /* @__PURE__ */ new Map();
    for (const s of n) o.set(s.section, s.content);
    const i = [...o.values()].map((s) => M(s, t.indent)).filter((s) => s.length > 0);
    return i.length === 0 ? t.skeleton : `${t.skeleton.length === 0 || t.skeleton.endsWith(`
`) ? t.skeleton : `${t.skeleton}
`}${i.join(`

`)}
`;
  };
}
function m(t) {
  return JSON.parse(t);
}
function d(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
function D(t) {
  return d(t) && typeof t.code == "string";
}
const B = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config"
], G = ["allowScripts"], tt = [
  ...B,
  ...G
];
function I(t, e) {
  if (!d(t)) return !1;
  for (const n of Object.values(t))
    if (typeof n !== e) return !1;
  return !0;
}
function et(t) {
  if (!d(t) || t.name !== void 0 && typeof t.name != "string") return !1;
  for (const e of B) {
    const n = t[e];
    if (n !== void 0 && !I(n, "string")) return !1;
  }
  for (const e of G) {
    const n = t[e];
    if (n !== void 0 && !I(n, "boolean")) return !1;
  }
  return !0;
}
function nt(t) {
  const e = m(t);
  if (!et(e))
    throw new Error("package.json piece content must be a JSON object");
  return e;
}
function rt(t) {
  const e = t.map((o) => ({
    piece: o,
    json: nt(o.content)
  })), n = e.find((o) => o.json.name), r = n ? { ...n.json } : {};
  for (const { piece: o, json: i } of e)
    if (!(n && o === n.piece))
      for (const c of tt) {
        const s = i[c];
        if (!s) continue;
        const a = r[c] ?? {};
        r[c] = { ...s, ...a };
      }
  return `${JSON.stringify(r, null, 2)}
`;
}
function y(t) {
  return t.section !== void 0;
}
function w(t, e) {
  let n = t;
  for (const r of e) {
    const o = F(n, r.section);
    if (!o)
      throw new Error(
        `applyMarkedFills: skeleton has no marked region for section ${JSON.stringify(r.section)}`
      );
    n = W({
      original: n,
      startMarker: o.start,
      endMarker: o.end,
      block: r.content
    });
  }
  return n;
}
function k(t) {
  const e = t.find((n) => !n.section);
  return e ? w(e.content, t.filter(y)) : null;
}
function ot(t) {
  const e = t.filter((o) => !o.section), n = e.find(
    (o) => X(o.content) !== null
  );
  if (n)
    return w(
      n.content,
      t.filter(y)
    );
  const r = e[0];
  return r ? r.content : null;
}
function it(t) {
  if (!d(t) || typeof t.src != "string" || typeof t.dest != "string")
    throw new Error("Dockerfile COPY entry must have string src and dest");
  const e = { src: t.src, dest: t.dest };
  return t.workdirRelative === !0 && (e.workdirRelative = !0), e;
}
function st(t) {
  const e = m(t);
  if (!d(e) || !Array.isArray(e.copies))
    throw new Error("Dockerfile COPY piece must be JSON { copies: [...] }");
  const n = {
    copies: e.copies.map(it)
  };
  return typeof e.anchorSection == "string" && (n.anchorSection = e.anchorSection), n;
}
function ct(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function at(t) {
  var n;
  const e = (n = t.match(/^WORKDIR\s+(\S+)\s*$/m)) == null ? void 0 : n[1];
  if (!e)
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing the expected `WORKDIR` line — create-backend-app template drift; re-run create-backend-app first."
    );
  return e === "/app" ? "" : `${e.slice(5)}/`;
}
function ft(t, e) {
  if (e) {
    const o = F(t, e);
    if (o)
      return t.indexOf(o.start) + o.start.length;
  }
  const n = [...t.matchAll(/^COPY [^\n]*$/gm)], r = n[n.length - 1];
  if ((r == null ? void 0 : r.index) === void 0)
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to anchor after — create-backend-app template drift; re-run create-backend-app first."
    );
  return r.index + r[0].length;
}
function lt(t, e, n) {
  if (e.length === 0) return t;
  const r = [];
  for (const i of e) {
    const c = `COPY ${i.src} ${i.dest}`;
    new RegExp(`^${ct(c)}\\s*$`, "m").test(t) || r.push(c);
  }
  if (r.length === 0) return t;
  const o = ft(t, n);
  return `${t.slice(0, o)}
${r.join(`
`)}${t.slice(o)}`;
}
function ut(t, e) {
  const n = at(t);
  let r = t;
  for (const o of e) {
    const i = st(o.content), c = i.copies.map(
      (s) => s.workdirRelative ? { src: `${n}${s.src}`, dest: s.dest } : s
    );
    r = lt(r, c, i.anchorSection);
  }
  return r;
}
function dt(t) {
  return /^FROM\s/m.test(t);
}
function pt(t) {
  const e = t.filter((i) => !i.section), n = e.find((i) => dt(i.content));
  if (!n) return null;
  const r = e.filter((i) => i !== n), o = ut(n.content, r);
  return w(o, t.filter(y));
}
function v(t) {
  const e = /* @__PURE__ */ new Set(), n = [];
  for (const r of t) {
    const o = r.replace(/\n+$/, "");
    o.length === 0 || e.has(o) || (e.add(o), n.push(o));
  }
  return n;
}
function ht(t) {
  const e = v(t.map((n) => n.content));
  return e.length > 0 ? `${e.join(`
`)}
` : null;
}
function gt(t) {
  const e = t.find((o) => !o.section);
  if (!e) return null;
  const n = /* @__PURE__ */ new Map();
  for (const o of t) {
    if (!o.section) continue;
    const i = n.get(o.section);
    i ? i.push(o.content) : n.set(o.section, [o.content]);
  }
  const r = [...n].map(([o, i]) => ({
    section: o,
    content: v(i).join(`
`)
  }));
  return w(e.content, r);
}
const kt = {
  typescript: ["node_modules", "dist", ".test"],
  rust: ["target"],
  csharp: ["bin", "obj", "out", "publish"]
}, mt = ["node_modules", "dist"], wt = [
  ".git",
  ".env.local",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  "*.db"
], Et = /^DOCKERIGNORE_(.+)$/, _t = "# the root .dockerignore is composed from settings by the dockerignore writer";
function jt(t) {
  return `DOCKERIGNORE_${t.toUpperCase()}`;
}
function $t(t) {
  const e = Et.exec(t ?? ""), n = e == null ? void 0 : e[1];
  return n ? n.toLowerCase() : null;
}
function Ot(t) {
  const e = t.lastIndexOf("/");
  return e === -1 ? "" : t.slice(0, e + 1);
}
function yt(t, e) {
  if (t.length === 0) return null;
  const n = new Set(wt);
  for (const r of t) {
    const o = $t(r.section);
    if (!o) continue;
    const i = kt[o];
    if (!i) continue;
    const c = Ot(r.target);
    for (const s of i) n.add(`${c}${s}`);
  }
  if ((e == null ? void 0 : e.applicationTier) === "full-stack")
    for (const r of mt) n.add(`frontend/${r}`);
  return `${[...n].sort().join(`
`)}
`;
}
const O = "DETERMINISTIC_PATCH ";
function xt(t) {
  return J(t) !== void 0;
}
function Mt({
  target: t,
  content: e,
  section: n
}) {
  if (e.length === 0)
    throw new Error(
      `makePatchEntry: content for "${t}" must be a non-empty string`
    );
  const r = { kind: "patch", target: t, content: e };
  return n && (r.section = n), r;
}
const R = new Map([
  ...Object.entries(A).map(
    ([t, e]) => [
      t,
      Q(e)
    ]
  ),
  ["package.json", rt],
  ["Cargo.toml", ot],
  ["app.ts", k],
  ["test-app.ts", k],
  ["entrypoint.sh", k],
  ["Dockerfile", pt],
  [".csproj", k],
  ["mod.rs", ht],
  ["lib.rs", gt],
  [".dockerignore", yt]
]);
function x(t) {
  return t.slice(t.lastIndexOf("/") + 1);
}
function St(t) {
  const e = x(t), n = e.lastIndexOf(".");
  return n > 0 ? e.slice(n) : "";
}
function J(t) {
  return R.get(x(t)) ?? R.get(St(t));
}
function Nt(t) {
  return J(t) ?? null;
}
function L({
  target: t,
  pieces: e,
  settings: n
}) {
  const r = Nt(t);
  if (!r)
    throw new Error(`composePatchTarget: no writer for '${t}'`);
  return r(e, n);
}
function Ft(t) {
  return E(t), `${O}${JSON.stringify(t)}
`;
}
function Wt(t) {
  if (!t.startsWith(O)) return null;
  const e = m(t.slice(O.length));
  return E(e), e;
}
const T = /* @__PURE__ */ new Set(["kind", "target", "content", "section"]);
function E(t) {
  if (!d(t) || t.kind !== "patch" || typeof t.target != "string" || typeof t.content != "string")
    throw new Error(
      `invalid patch entry: ${JSON.stringify(t)} — expected {kind:"patch", target, content}`
    );
  if (t.section !== void 0 && typeof t.section != "string")
    throw new Error(
      `invalid patch entry section: ${JSON.stringify(t.section)} — expected a string`
    );
  for (const e of Object.keys(t))
    if (!T.has(e))
      throw new Error(
        `invalid patch entry: unexpected key "${e}" — the shape is frozen to {${[...T].join(", ")}}`
      );
}
async function b(t) {
  return P(t, "utf8").catch((e) => {
    if (D(e) && e.code === "ENOENT") return null;
    throw e;
  });
}
async function S(t, e) {
  await C(_(t), { recursive: !0 }), await q(t, e, "utf8");
}
class At {
  constructor({ writeTextFile: e } = {}) {
    p(this, "writeTextFile");
    this.writeTextFile = e ?? S;
  }
  async patchMarkedBlock({
    filePath: e,
    startMarker: n,
    endMarker: r,
    block: o,
    missingFileOk: i = !0,
    contextLabel: c
  }) {
    const s = await b(e);
    if (s === null) {
      if (i) return !1;
      throw new Error(
        `patchMarkedBlock: ${e} does not exist (contextLabel=${c ?? "unspecified"})`
      );
    }
    let a;
    try {
      a = W({
        original: s,
        startMarker: n,
        endMarker: r,
        block: o
      });
    } catch (l) {
      throw l instanceof j ? new Error(
        `patchMarkedBlock: ${e} is missing the expected '${n}' / '${r}' markers — the backend_app step's template markers are absent; re-run codegen (backend_app) first (${c ?? "unspecified"}).`
      ) : l;
    }
    return a === s ? !1 : (await this.writeTextFile(e, a), !0);
  }
  async ensureLinesInMarkedBlock({
    filePath: e,
    startMarker: n,
    endMarker: r,
    lines: o,
    contextLabel: i
  }) {
    const c = await b(e);
    if (c === null) return !1;
    const s = c.indexOf(n), a = c.indexOf(r);
    if (s === -1 || a === -1 || a < s)
      throw new Error(
        `ensureLinesInMarkedBlock: ${e} is missing the expected '${n}' / '${r}' markers (${i ?? "unspecified"}).`
      );
    const l = c.slice(s + n.length, a).split(`
`).map((u) => u.trim()).filter((u) => u.length > 0), f = [];
    for (const u of l) {
      const g = f[f.length - 1];
      g != null && g.endsWith("]") ? f[f.length - 1] = `${g}
${u}` : f.push(u);
    }
    const h = new Set(f);
    for (const u of o) h.add(u.trim());
    return await this.patchMarkedBlock({
      filePath: e,
      startMarker: n,
      endMarker: r,
      block: [...h].sort().join(`
`),
      ...i === void 0 ? {} : { contextLabel: i }
    });
  }
}
function It(t) {
  return x(t) === ".dockerignore" ? ".dockerignore" : t;
}
function K(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t) {
    const r = It(n.target);
    e.set(r, [...e.get(r) ?? [], n]);
  }
  return e;
}
class Dt {
  constructor({
    writeTextFile: e,
    settings: n
  } = {}) {
    p(this, "writeTextFile");
    p(this, "settings");
    p(this, "entries");
    this.writeTextFile = e ?? S, this.settings = n, this.entries = [];
  }
  register(e) {
    if (E(e), !xt(e.target))
      throw new Error(
        `PatchMerger.register: no PatchWriter for target '${e.target}'`
      );
    this.entries.push(e);
  }
  hasEntries() {
    return this.entries.length > 0;
  }
  async apply(e) {
    const n = [];
    for (const [r, o] of K(this.entries)) {
      const i = L({
        target: r,
        pieces: o,
        settings: this.settings
      });
      i !== null && (await this.writeTextFile($(e, r), i), n.push(r));
    }
    return n;
  }
}
const Bt = "deterministic/patches";
function Gt(t, e) {
  const n = e.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(t).padStart(5, "0")}-${n}.json`;
}
async function Rt(t) {
  return z(t).catch((e) => {
    if (D(e) && e.code === "ENOENT") return [];
    throw e;
  });
}
async function vt({
  patchesDir: t,
  outRoot: e,
  writeTextFile: n = S,
  settings: r
}) {
  const o = (await Rt(t)).filter((s) => s.endsWith(".json")).sort(), i = [];
  for (const s of o) {
    const a = m(await P($(t, s), "utf8"));
    E(a), i.push(a);
  }
  const c = [];
  for (const [s, a] of K(i)) {
    const l = L({ target: s, pieces: a, settings: r });
    if (l !== null) {
      const f = $(e, s);
      await C(_(f), { recursive: !0 }), await n(f, l), s.endsWith(".sh") && await V(f, 493), c.push({ file: s, contents: l });
    }
  }
  return c;
}
export {
  _t as DOCKERIGNORE_TRIGGER,
  At as MarkedFileEditor,
  j as MarkedSectionMissingError,
  Bt as PATCHES_DIR,
  O as PATCH_ENTRY_LINE_PREFIX,
  Dt as PatchMerger,
  vt as assemblePatches,
  L as composePatchTarget,
  Z as conventionForTarget,
  jt as dockerignoreSection,
  Ft as formatPatchEntryLine,
  lt as insertDockerfileCopies,
  xt as isPatchTarget,
  Ct as isSharedPatchTarget,
  Mt as makePatchEntry,
  Wt as parsePatchEntryLine,
  Gt as patchPieceFilename,
  Nt as patchWriterFor,
  W as replaceMarkedBlockText
};
//# sourceMappingURL=patch-merger.js.map
