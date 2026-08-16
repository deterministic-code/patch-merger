var D = Object.defineProperty;
var A = (t, e, n) => e in t ? D(t, e, { enumerable: !0, configurable: !0, writable: !0, value: n }) : t[e] = n;
var l = (t, e, n) => A(t, typeof e != "symbol" ? e + "" : e, n);
import { readdir as F, readFile as J, mkdir as S, chmod as N, writeFile as G } from "node:fs/promises";
import { join as x, dirname as I } from "node:path";
function h(t) {
  return JSON.parse(t);
}
function u(t) {
  return typeof t == "object" && t !== null && !Array.isArray(t);
}
const m = "DETERMINISTIC_PATCH ", E = /* @__PURE__ */ new Set(["kind", "target", "content", "section"]);
class p {
  constructor({
    target: e,
    content: n,
    section: o
  }) {
    l(this, "kind", "patch");
    l(this, "target");
    l(this, "content");
    l(this, "section");
    if (n.length === 0)
      throw new Error(
        `makePatchEntry: content for "${e}" must be a non-empty string`
      );
    this.target = e, this.content = n, o && (this.section = o), Object.freeze(this);
  }
  static parse(e) {
    if (!u(e) || e.kind !== "patch" || typeof e.target != "string" || typeof e.content != "string")
      throw new Error(
        `invalid patch entry: ${JSON.stringify(e)} — expected {kind:"patch", target, content}`
      );
    if (e.section !== void 0 && typeof e.section != "string")
      throw new Error(
        `invalid patch entry section: ${JSON.stringify(e.section)} — expected a string`
      );
    for (const n of Object.keys(e))
      if (!E.has(n))
        throw new Error(
          `invalid patch entry: unexpected key "${n}" — the shape is frozen to {${[...E].join(", ")}}`
        );
    return new p({
      target: e.target,
      content: e.content,
      ...e.section ? { section: e.section } : {}
    });
  }
  static async readDir(e) {
    const n = await F(e).catch((r) => {
      if (u(r) && r.code === "ENOENT") return [];
      throw r;
    }), o = [];
    for (const r of n.filter((s) => s.endsWith(".json")).sort())
      o.push(
        p.parse(h(await J(x(e, r), "utf8")))
      );
    return o;
  }
}
function kt(t) {
  return new p(t);
}
function mt(t) {
  return `${m}${JSON.stringify(t)}
`;
}
function wt(t) {
  return t.startsWith(m) ? p.parse(h(t.slice(m.length))) : null;
}
class L extends Error {
  constructor(e) {
    super(e), this.name = "MarkedSectionMissingError";
  }
}
function R(t, e) {
  var i, c;
  const n = t.endsWith(`
`) ? t.slice(0, -1) : t;
  if (n.length === 0) return "";
  const o = n.split(`
`);
  let r = 1 / 0;
  for (const a of o) {
    if (a.length === 0) continue;
    const f = ((c = (i = a.match(/^[ \t]*/)) == null ? void 0 : i[0]) == null ? void 0 : c.length) ?? 0;
    f < a.length && f < r && (r = f);
  }
  const s = !Number.isFinite(r) || r === 0 ? n : o.map((a) => a.length === 0 ? "" : a.slice(r)).join(`
`);
  return s.length === 0 ? "" : s.split(`
`).map((a) => a.length === 0 ? "" : `${e}${a}`).join(`
`);
}
function y(t) {
  return t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function P(t, e) {
  var r, s;
  const n = (r = t.match(
    new RegExp(`^.*===\\s*BEGIN\\s+${y(e)}\\b.*$`, "m")
  )) == null ? void 0 : r[0], o = (s = t.match(
    new RegExp(`^.*===\\s*END\\s+${y(e)}\\b.*$`, "m")
  )) == null ? void 0 : s[0];
  return n && o ? { start: n, end: o } : null;
}
function B({
  original: t,
  startMarker: e,
  endMarker: n,
  block: o
}) {
  const r = t.indexOf(e), s = t.indexOf(n);
  if (r === -1 || s === -1 || s < r)
    throw new L(
      `markers '${e}' / '${n}' absent or out of order`
    );
  const i = t.slice(0, r + e.length), c = t.slice(s), a = t.slice(t.lastIndexOf(`
`, r) + 1, r), f = R(o, a), k = f.length === 0 ? `
${a}` : `
${f}
${a}`;
  return `${i}${k}${c}`;
}
const O = {
  skeleton: "",
  indent: "",
  sectionPrefix: "ENV"
}, Y = {
  "docker-compose.yml": {
    skeleton: `services:
`,
    indent: "  ",
    sectionPrefix: "COMPOSE_SERVICE"
  },
  ".env": O,
  ".env.example": O,
  ".gitignore": { skeleton: `.env
`, indent: "", sectionPrefix: "GITIGNORE" }
};
function K(t) {
  const e = `${t.sectionPrefix}_`;
  return (n) => {
    if (!n.some((i) => {
      var c;
      return (c = i.section) == null ? void 0 : c.startsWith(e);
    })) return null;
    const o = /* @__PURE__ */ new Map();
    for (const i of n) o.set(i.section, i.content);
    const r = [...o.values()].map((i) => R(i, t.indent)).filter((i) => i.length > 0);
    return r.length === 0 ? t.skeleton : `${t.skeleton.length === 0 || t.skeleton.endsWith(`
`) ? t.skeleton : `${t.skeleton}
`}${r.join(`

`)}
`;
  };
}
const j = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config"
], C = ["allowScripts"], H = [
  ...j,
  ...C
];
function $(t, e) {
  if (!u(t)) return !1;
  for (const n of Object.values(t))
    if (typeof n !== e) return !1;
  return !0;
}
function V(t) {
  const e = h(t);
  if (!u(e))
    throw new Error("package.json piece content must be a JSON object");
  if (e.name !== void 0 && typeof e.name != "string")
    throw new Error("package.json piece content must be a JSON object");
  for (const n of j) {
    const o = e[n];
    if (o !== void 0 && !$(o, "string"))
      throw new Error("package.json piece content must be a JSON object");
  }
  for (const n of C) {
    const o = e[n];
    if (o !== void 0 && !$(o, "boolean"))
      throw new Error("package.json piece content must be a JSON object");
  }
  return e;
}
function v(t) {
  const e = t.map((r) => ({
    piece: r,
    json: V(r.content)
  })), n = e.find((r) => r.json.name), o = n ? { ...n.json } : {};
  for (const { piece: r, json: s } of e)
    if (!(n && r === n.piece))
      for (const i of H) {
        const c = s[i];
        if (!c) continue;
        const a = o[i] ?? {};
        o[i] = { ...c, ...a };
      }
  return `${JSON.stringify(o, null, 2)}
`;
}
function w(t) {
  return t.section !== void 0;
}
function g(t, e) {
  let n = t;
  for (const o of e) {
    const r = P(n, o.section);
    if (!r)
      throw new Error(
        `applyMarkedFills: skeleton has no marked region for section ${JSON.stringify(o.section)}`
      );
    n = B({
      original: n,
      startMarker: r.start,
      endMarker: r.end,
      block: o.content
    });
  }
  return n;
}
function d(t) {
  const e = t.find((n) => !n.section);
  return e ? g(e.content, t.filter(w)) : null;
}
function q(t) {
  var o;
  const e = t.filter((r) => !r.section), n = e.find(
    (r) => /^.*===\s*BEGIN\s+\S+.*$/m.test(r.content)
  );
  return n ? g(n.content, t.filter(w)) : ((o = e[0]) == null ? void 0 : o.content) ?? null;
}
function z(t) {
  if (!u(t) || typeof t.src != "string" || typeof t.dest != "string")
    throw new Error("Dockerfile COPY entry must have string src and dest");
  const e = { src: t.src, dest: t.dest };
  return t.workdirRelative === !0 && (e.workdirRelative = !0), e;
}
function X(t) {
  const e = h(t);
  if (!u(e) || !Array.isArray(e.copies))
    throw new Error("Dockerfile COPY piece must be JSON { copies: [...] }");
  const n = {
    copies: e.copies.map(z)
  };
  return typeof e.anchorSection == "string" && (n.anchorSection = e.anchorSection), n;
}
function Q(t) {
  var n;
  const e = (n = t.match(/^WORKDIR\s+(\S+)\s*$/m)) == null ? void 0 : n[1];
  if (!e)
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing the expected `WORKDIR` line — create-backend-app template drift; re-run create-backend-app first."
    );
  return e === "/app" ? "" : `${e.slice(5)}/`;
}
function U(t, e) {
  if (e) {
    const r = P(t, e);
    if (r) return t.indexOf(r.start) + r.start.length;
  }
  const n = [...t.matchAll(/^COPY [^\n]*$/gm)], o = n[n.length - 1];
  if ((o == null ? void 0 : o.index) === void 0)
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to anchor after — create-backend-app template drift; re-run create-backend-app first."
    );
  return o.index + o[0].length;
}
function Z(t, e, n) {
  if (e.length === 0) return t;
  const o = e.map((s) => `COPY ${s.src} ${s.dest}`).filter(
    (s) => !new RegExp(
      `^${s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
      "m"
    ).test(t)
  );
  if (o.length === 0) return t;
  const r = U(t, n);
  return `${t.slice(0, r)}
${o.join(`
`)}${t.slice(r)}`;
}
function tt(t, e) {
  const n = Q(t);
  let o = t;
  for (const r of e) {
    const s = X(r.content), i = s.copies.map(
      (c) => c.workdirRelative ? { src: `${n}${c.src}`, dest: c.dest } : c
    );
    o = Z(o, i, s.anchorSection);
  }
  return o;
}
function et(t) {
  const e = t.filter((r) => !r.section), n = e.find((r) => /^FROM\s/m.test(r.content));
  if (!n) return null;
  const o = tt(
    n.content,
    e.filter((r) => r !== n)
  );
  return g(o, t.filter(w));
}
function T(t) {
  const e = /* @__PURE__ */ new Set(), n = [];
  for (const o of t) {
    const r = o.replace(/\n+$/, "");
    r.length === 0 || e.has(r) || (e.add(r), n.push(r));
  }
  return n;
}
function nt(t) {
  const e = T(t.map((n) => n.content));
  return e.length > 0 ? `${e.join(`
`)}
` : null;
}
function rt(t) {
  const e = t.find((r) => !r.section);
  if (!e) return null;
  const n = /* @__PURE__ */ new Map();
  for (const r of t) {
    if (!r.section) continue;
    const s = n.get(r.section);
    s ? s.push(r.content) : n.set(r.section, [r.content]);
  }
  const o = [...n].map(([r, s]) => ({
    section: r,
    content: T(s).join(`
`)
  }));
  return g(e.content, o);
}
const ot = {
  typescript: ["node_modules", "dist", ".test"],
  rust: ["target"],
  csharp: ["bin", "obj", "out", "publish"]
}, st = ["node_modules", "dist"], it = [
  ".git",
  ".env.local",
  "*.log",
  "*.sqlite",
  "*.sqlite3",
  "*.db"
], ct = /^DOCKERIGNORE_(.+)$/;
function at(t, e) {
  var o, r;
  if (t.length === 0) return null;
  const n = new Set(it);
  for (const s of t) {
    const i = (r = (o = ct.exec(s.section ?? "")) == null ? void 0 : o[1]) == null ? void 0 : r.toLowerCase(), c = i ? ot[i] : void 0;
    if (!c) continue;
    const a = s.target.lastIndexOf("/"), f = a === -1 ? "" : s.target.slice(0, a + 1);
    for (const k of c) n.add(`${f}${k}`);
  }
  if ((e == null ? void 0 : e.applicationTier) === "full-stack")
    for (const s of st) n.add(`frontend/${s}`);
  return `${[...n].sort().join(`
`)}
`;
}
function ft(t) {
  return t.slice(t.lastIndexOf("/") + 1) === ".dockerignore" ? ".dockerignore" : t;
}
const b = new Map([
  ...Object.entries(Y).map(
    ([t, e]) => [
      t,
      K(e)
    ]
  ),
  ["package.json", v],
  ["Cargo.toml", q],
  ["app.ts", d],
  ["test-app.ts", d],
  ["entrypoint.sh", d],
  ["Dockerfile", et],
  [".csproj", d],
  ["mod.rs", nt],
  ["lib.rs", rt],
  [".dockerignore", at]
]);
function M(t) {
  const e = t.slice(t.lastIndexOf("/") + 1), n = e.lastIndexOf("."), o = n > 0 ? e.slice(n) : "";
  return b.get(e) ?? b.get(o) ?? null;
}
function lt(t) {
  return M(t) !== null;
}
function pt({
  target: t,
  pieces: e,
  settings: n
}) {
  const o = M(t);
  if (!o) throw new Error(`composePatchTarget: no writer for '${t}'`);
  return o(e, n);
}
async function W(t, e) {
  await S(I(t), { recursive: !0 }), await G(t, e, "utf8"), t.endsWith(".sh") && await N(t, 493);
}
class ut {
  constructor({
    writeTextFile: e,
    settings: n
  } = {}) {
    l(this, "writeTextFile");
    l(this, "settings");
    l(this, "entries");
    this.writeTextFile = e ?? W, this.settings = n, this.entries = [];
  }
  register(e) {
    const n = e instanceof p ? e : p.parse(e);
    if (!lt(n.target))
      throw new Error(
        `PatchMerger.register: no PatchWriter for target '${n.target}'`
      );
    this.entries.push(n);
  }
  async apply(e) {
    return (await _(this, e)).map((n) => n.file);
  }
}
async function _(t, e) {
  const n = /* @__PURE__ */ new Map();
  for (const r of t.entries) {
    const s = ft(r.target), i = n.get(s);
    i ? i.push(r) : n.set(s, [r]);
  }
  const o = [];
  for (const [r, s] of n) {
    const i = pt({
      target: r,
      pieces: s,
      settings: t.settings
    });
    i !== null && (await t.writeTextFile(x(e, r), i), o.push({ file: r, contents: i }));
  }
  return o;
}
async function Et({
  patchesDir: t,
  outRoot: e,
  writeTextFile: n = W,
  settings: o
}) {
  const r = new ut({
    writeTextFile: async (s, i) => {
      await S(I(s), { recursive: !0 }), await n(s, i), s.endsWith(".sh") && await N(s, 493);
    },
    settings: o
  });
  for (const s of await p.readDir(t))
    r.register(s);
  return _(r, e);
}
export {
  m as PATCH_ENTRY_LINE_PREFIX,
  p as PatchEntry,
  ut as PatchMerger,
  Et as assemblePatches,
  pt as composePatchTarget,
  mt as formatPatchEntryLine,
  lt as isPatchTarget,
  kt as makePatchEntry,
  wt as parsePatchEntryLine
};
//# sourceMappingURL=patch-merger.js.map
