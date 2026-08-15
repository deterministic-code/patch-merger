var D = Object.defineProperty;
var B = (t, e, n) => e in t ? D(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var p = (t, e, n) => B(t, typeof e != "symbol" ? e + "" : e, n);
import { readFile as N, mkdir as I, chmod as G, writeFile as J, readdir as v } from "node:fs/promises";
import { join as k, dirname as R } from "node:path";
class b extends Error {
  constructor(e) {
    super(e), this.name = "MarkedSectionMissingError";
  }
}
function L(t) {
  if (t.length === 0) return t;
  const e = t.split(`
`);
  let n = 1 / 0;
  for (const r of e) {
    if (r.length === 0) continue;
    const o = r.match(/^[ \t]*/)[0].length;
    o < r.length && o < n && (n = o);
  }
  return !Number.isFinite(n) || n === 0 ? t : e.map((r) => r.length === 0 ? "" : r.slice(n)).join(`
`);
}
function T(t, e) {
  const n = t.endsWith(`
`) ? t.slice(0, -1) : t, r = L(n);
  return r.length === 0 ? "" : r.split(`
`).map((o) => o.length === 0 ? "" : `${e}${o}`).join(`
`);
}
function $(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function C(t, e) {
  const n = t.match(
    new RegExp(`^.*===\\s*BEGIN\\s+${$(e)}\\b.*$`, "m")
  ), r = t.match(
    new RegExp(`^.*===\\s*END\\s+${$(e)}\\b.*$`, "m")
  );
  return n && r ? { start: n[0], end: r[0] } : null;
}
function K(t) {
  const e = t.match(/^.*===\s*BEGIN\s+\S+.*$/m);
  return e ? e[0] : null;
}
function P({
  original: t,
  startMarker: e,
  endMarker: n,
  block: r
}) {
  const o = t.indexOf(e), i = t.indexOf(n);
  if (o === -1 || i === -1 || i < o)
    throw new b(
      `markers '${e}' / '${n}' absent or out of order`
    );
  const c = t.slice(0, o + e.length), s = t.slice(i), a = t.lastIndexOf(`
`, o) + 1, l = t.slice(a, o), f = T(r, l), h = f.length === 0 ? `
${l}` : `
${f}
${l}`;
  return `${c}${h}${s}`;
}
const _ = {
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
function H(t) {
  const e = t.slice(t.lastIndexOf("/") + 1);
  return _[e] ?? null;
}
function wt(t) {
  return H(t) !== null;
}
function Y(t) {
  const e = `${t.sectionPrefix}_`;
  return (n) => {
    if (!n.some((s) => {
      var a;
      return (a = s.section) == null ? void 0 : a.startsWith(e);
    })) return null;
    const o = /* @__PURE__ */ new Map();
    for (const s of n) o.set(s.section, s.content);
    const i = [...o.values()].map((s) => T(s, t.indent)).filter((s) => s.length > 0);
    return i.length === 0 ? t.skeleton : `${t.skeleton.length === 0 || t.skeleton.endsWith(`
`) ? t.skeleton : `${t.skeleton}
`}${i.join(`

`)}
`;
  };
}
const y = (t) => t && typeof t == "object" && !Array.isArray(t) ? t : {}, V = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config",
  "allowScripts"
];
function q(t) {
  const e = t.map((o) => ({
    piece: o,
    json: JSON.parse(o.content)
  })), n = e.find((o) => o.json.name), r = n ? n.json : {};
  for (const { piece: o, json: i } of e)
    if (!(n && o === n.piece))
      for (const c of V)
        i[c] && (r[c] = { ...y(i[c]), ...y(r[c]) });
  return `${JSON.stringify(r, null, 2)}
`;
}
function m(t, e) {
  let n = t;
  for (const r of e) {
    const o = C(n, r.section);
    if (!o)
      throw new Error(
        `applyMarkedFills: skeleton has no marked region for section ${JSON.stringify(r.section)}`
      );
    n = P({
      original: n,
      startMarker: o.start,
      endMarker: o.end,
      block: r.content
    });
  }
  return n;
}
function g(t) {
  const e = t.find((n) => !n.section);
  return e ? m(
    e.content,
    t.filter((n) => n.section)
  ) : null;
}
function z(t) {
  const e = t.filter((r) => !r.section), n = e.find(
    (r) => K(r.content) !== null
  );
  return n ? m(
    n.content,
    t.filter((r) => r.section)
  ) : e.length > 0 ? e[0].content : null;
}
function U(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function X(t) {
  const e = t.match(/^WORKDIR\s+(\S+)\s*$/m);
  if (!e)
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing the expected `WORKDIR` line — create-backend-app template drift; re-run create-backend-app first."
    );
  return e[1] === "/app" ? "" : `${e[1].slice(5)}/`;
}
function Z(t, e) {
  if (e) {
    const o = C(t, e);
    if (o)
      return t.indexOf(o.start) + o.start.length;
  }
  const n = [...t.matchAll(/^COPY [^\n]*$/gm)];
  if (n.length === 0)
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to anchor after — create-backend-app template drift; re-run create-backend-app first."
    );
  const r = n[n.length - 1];
  return r.index + r[0].length;
}
function Q(t, e, n) {
  if (!Array.isArray(e) || e.length === 0) return t;
  const r = [];
  for (const i of e) {
    const c = `COPY ${i.src} ${i.dest}`;
    new RegExp(`^${U(c)}\\s*$`, "m").test(t) || r.push(c);
  }
  if (r.length === 0) return t;
  const o = Z(t, n);
  return `${t.slice(0, o)}
${r.join(`
`)}${t.slice(o)}`;
}
function tt(t, e) {
  const n = X(t);
  let r = t;
  for (const o of e) {
    const i = JSON.parse(o.content), c = i.copies.map(
      (s) => s.workdirRelative ? { src: `${n}${s.src}`, dest: s.dest } : s
    );
    r = Q(r, c, i.anchorSection);
  }
  return r;
}
function et(t) {
  return /^FROM\s/m.test(t);
}
function nt(t) {
  const e = t.filter((i) => !i.section), n = e.find((i) => et(i.content));
  if (!n) return null;
  const r = e.filter((i) => i !== n), o = tt(n.content, r);
  return m(
    o,
    t.filter((i) => i.section)
  );
}
function j(t) {
  const e = /* @__PURE__ */ new Set(), n = [];
  for (const r of t) {
    const o = r.replace(/\n+$/, "");
    o.length === 0 || e.has(o) || (e.add(o), n.push(o));
  }
  return n;
}
function rt(t) {
  const e = j(t.map((n) => n.content));
  return e.length > 0 ? `${e.join(`
`)}
` : null;
}
function ot(t) {
  const e = t.find((o) => !o.section);
  if (!e) return null;
  const n = /* @__PURE__ */ new Map();
  for (const o of t)
    o.section && (n.has(o.section) || n.set(o.section, []), n.get(o.section).push(o.content));
  const r = [...n].map(([o, i]) => ({
    section: o,
    content: j(i).join(`
`)
  }));
  return m(e.content, r);
}
const it = {
  typescript: ["node_modules", "dist", ".test"],
  rust: ["target"],
  csharp: ["bin", "obj", "out", "publish"]
}, st = ["node_modules", "dist"], ct = [
  ".git",
  ".env.local",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  "*.db"
], at = /^DOCKERIGNORE_(.+)$/, Et = "# the root .dockerignore is composed from settings by the dockerignore writer";
function $t(t) {
  return `DOCKERIGNORE_${t.toUpperCase()}`;
}
function ft(t) {
  const e = at.exec(t ?? "");
  return e ? e[1].toLowerCase() : null;
}
function lt(t, e) {
  if (!t || t.length === 0) return null;
  const n = new Set(ct);
  for (const r of t) {
    const o = ft(r.section);
    if (!o) continue;
    const i = it[o];
    if (!i) continue;
    const c = r.path ?? "";
    for (const s of i) n.add(`${c}${s}`);
  }
  if ((e == null ? void 0 : e.applicationTier) === "full-stack")
    for (const r of st) n.add(`frontend/${r}`);
  return `${[...n].sort().join(`
`)}
`;
}
const w = "DETERMINISTIC_PATCH ";
function ut(t) {
  return W(t) !== void 0;
}
function yt({
  target: t,
  content: e,
  section: n,
  path: r
}) {
  if (typeof e != "string" || e.length === 0)
    throw new Error(
      `makePatchEntry: content for "${t}" must be a non-empty string`
    );
  const o = { kind: "patch", target: t, content: e };
  return n && (o.section = n), r !== void 0 && (o.path = r), d(o), o;
}
const O = new Map([
  ...Object.entries(_).map(
    ([t, e]) => [
      t,
      Y(e)
    ]
  ),
  ["package.json", q],
  ["Cargo.toml", z],
  ["app.ts", g],
  ["test-app.ts", g],
  ["entrypoint.sh", g],
  ["Dockerfile", nt],
  [".csproj", g],
  ["mod.rs", rt],
  ["lib.rs", ot],
  [".dockerignore", lt]
]);
function F(t) {
  return t.slice(t.lastIndexOf("/") + 1);
}
function pt(t) {
  const e = F(t), n = e.lastIndexOf(".");
  return n > 0 ? e.slice(n) : "";
}
function W(t) {
  return O.get(F(t)) ?? O.get(pt(t));
}
function dt(t) {
  return W(t) ?? null;
}
function M({
  target: t,
  pieces: e,
  settings: n
}) {
  const r = dt(t);
  if (!r)
    throw new Error(`composePatchTarget: no writer for '${t}'`);
  return r(e, n);
}
function Ot(t) {
  return d(t), `${w}${JSON.stringify(t)}
`;
}
function xt(t) {
  if (!t.startsWith(w)) return null;
  const e = JSON.parse(
    t.slice(w.length)
  );
  return d(e), e;
}
const x = /* @__PURE__ */ new Set([
  "kind",
  "target",
  "content",
  "section",
  "path"
]);
function d(t) {
  const e = t;
  if (t === null || typeof t != "object" || Array.isArray(t) || e.kind !== "patch" || typeof e.target != "string" || typeof e.content != "string")
    throw new Error(
      `invalid patch entry: ${JSON.stringify(t)} — expected {kind:"patch", target, content}`
    );
  if (e.section !== void 0 && typeof e.section != "string")
    throw new Error(
      `invalid patch entry section: ${JSON.stringify(e.section)} — expected a string`
    );
  if (e.path !== void 0 && typeof e.path != "string")
    throw new Error(
      `invalid patch entry path: ${JSON.stringify(e.path)} — expected a string`
    );
  for (const n of Object.keys(t))
    if (!x.has(n))
      throw new Error(
        `invalid patch entry: unexpected key "${n}" — the shape is frozen to {${[...x].join(", ")}}`
      );
}
async function S(t) {
  return N(t, "utf8").catch((e) => {
    if (e.code === "ENOENT") return null;
    throw e;
  });
}
async function E(t, e) {
  await I(R(t), { recursive: !0 }), await J(t, e, "utf8");
}
class St {
  constructor({ writeTextFile: e } = {}) {
    p(this, "writeTextFile");
    this.writeTextFile = e ?? E;
  }
  async patchMarkedBlock({
    filePath: e,
    startMarker: n,
    endMarker: r,
    block: o,
    missingFileOk: i = !0,
    contextLabel: c
  }) {
    const s = await S(e);
    if (s === null) {
      if (i) return !1;
      throw new Error(
        `patchMarkedBlock: ${e} does not exist (contextLabel=${c ?? "unspecified"})`
      );
    }
    let a;
    try {
      a = P({
        original: s,
        startMarker: n,
        endMarker: r,
        block: o
      });
    } catch (l) {
      throw l instanceof b ? new Error(
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
    const c = await S(e);
    if (c === null) return !1;
    const s = c.indexOf(n), a = c.indexOf(r);
    if (s === -1 || a === -1 || a < s)
      throw new Error(
        `ensureLinesInMarkedBlock: ${e} is missing the expected '${n}' / '${r}' markers (${i ?? "unspecified"}).`
      );
    const l = c.slice(s + n.length, a).split(`
`).map((u) => u.trim()).filter((u) => u.length > 0), f = [];
    for (const u of l)
      f.length > 0 && f[f.length - 1].endsWith("]") ? f[f.length - 1] += `
${u}` : f.push(u);
    const h = new Set(f);
    for (const u of o) h.add(u.trim());
    return await this.patchMarkedBlock({
      filePath: e,
      startMarker: n,
      endMarker: r,
      block: [...h].sort().join(`
`),
      contextLabel: i
    });
  }
}
function A(t) {
  const e = /* @__PURE__ */ new Map();
  for (const n of t)
    e.set(n.target, [...e.get(n.target) ?? [], n]);
  return e;
}
class Nt {
  constructor({
    writeTextFile: e,
    settings: n
  } = {}) {
    p(this, "writeTextFile");
    p(this, "settings");
    p(this, "entries");
    this.writeTextFile = e ?? E, this.settings = n, this.entries = [];
  }
  register(e) {
    if (d(e), !ut(e.target))
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
    for (const [r, o] of A(this.entries)) {
      const i = M({
        target: r,
        pieces: o,
        settings: this.settings
      });
      i !== null && (await this.writeTextFile(k(e, r), i), n.push(r));
    }
    return n;
  }
}
const It = "deterministic/patches";
function Rt(t, e) {
  const n = e.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${String(t).padStart(5, "0")}-${n}.json`;
}
async function ht(t) {
  return v(t).catch((e) => {
    if (e.code === "ENOENT") return [];
    throw e;
  });
}
async function bt({
  patchesDir: t,
  outRoot: e,
  writeTextFile: n = E,
  settings: r
}) {
  const o = (await ht(t)).filter((s) => s.endsWith(".json")).sort(), i = [];
  for (const s of o) {
    const a = JSON.parse(
      await N(k(t, s), "utf8")
    );
    d(a), i.push(a);
  }
  const c = [];
  for (const [s, a] of A(i)) {
    const l = M({ target: s, pieces: a, settings: r });
    if (l !== null) {
      const f = k(e, s);
      await I(R(f), { recursive: !0 }), await n(f, l), s.endsWith(".sh") && await G(f, 493), c.push({ file: s, contents: l });
    }
  }
  return c;
}
export {
  Et as DOCKERIGNORE_TRIGGER,
  St as MarkedFileEditor,
  b as MarkedSectionMissingError,
  It as PATCHES_DIR,
  w as PATCH_ENTRY_LINE_PREFIX,
  Nt as PatchMerger,
  bt as assemblePatches,
  M as composePatchTarget,
  H as conventionForTarget,
  $t as dockerignoreSection,
  Ot as formatPatchEntryLine,
  Q as insertDockerfileCopies,
  ut as isPatchTarget,
  wt as isSharedPatchTarget,
  yt as makePatchEntry,
  xt as parsePatchEntryLine,
  Rt as patchPieceFilename,
  dt as patchWriterFor,
  P as replaceMarkedBlockText
};
//# sourceMappingURL=patch-merger.js.map
