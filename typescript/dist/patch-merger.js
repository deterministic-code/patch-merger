var P = Object.defineProperty;
var $ = (t) => {
  throw TypeError(t);
};
var R = (t, n, e) => n in t ? P(t, n, { enumerable: !0, configurable: !0, writable: !0, value: e }) : t[n] = e;
var d = (t, n, e) => R(t, typeof n != "symbol" ? n + "" : n, e), b = (t, n, e) => n.has(t) || $("Cannot " + e);
var l = (t, n, e) => (b(t, n, "read from private field"), e ? e.call(t) : n.get(t)), k = (t, n, e) => n.has(t) ? $("Cannot add the same private member more than once") : n instanceof WeakSet ? n.add(t) : n.set(t, e);
import { mkdir as C, writeFile as D, chmod as j } from "node:fs/promises";
import { join as v, dirname as B } from "node:path";
class et {
  constructor({
    target: n,
    content: e,
    section: s
  }) {
    d(this, "target");
    d(this, "content");
    d(this, "section");
    if (e.length === 0)
      throw new Error(
        `Patch: content for "${n}" must be a non-empty string`
      );
    this.target = n, this.content = e, s && (this.section = s), Object.freeze(this);
  }
}
class T extends Error {
  constructor(n) {
    super(n), this.name = "MarkedSectionMissingError";
  }
}
const S = (t, n) => {
  const e = (t.endsWith(`
`) ? t.slice(0, -1) : t).split(`
`);
  if (e.length === 1 && e[0] === "") return "";
  const s = Math.min(
    ...e.map((o) => {
      const i = /^[ \t]*/.exec(o)[0].length;
      return i < o.length ? i : 1 / 0;
    })
  ), r = Number.isFinite(s) ? s : 0;
  return e.map((o) => {
    const i = o.slice(r);
    return i ? `${n}${i}` : "";
  }).join(`
`);
}, M = (t, n) => {
  const e = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), s = (i) => {
    var c;
    return (c = t.match(new RegExp(`^.*===\\s*${i}\\s+${e}\\b.*$`, "m"))) == null ? void 0 : c[0];
  }, r = s("BEGIN"), o = s("END");
  return r && o ? { start: r, end: o } : null;
}, x = (t, n, e, s) => `${t.slice(0, n)}${s}${t.slice(e)}`, F = (t, n, e) => {
  const s = t.lastIndexOf(n);
  if (s < 0)
    throw new Error(`insertAfter: ${JSON.stringify(n)} not found`);
  const r = s + n.length;
  return x(t, r, r, `
${e}`);
}, I = (t, n) => n ? `${t && !t.endsWith(`
`) ? `${t}
` : t}${n.endsWith(`
`) ? n : `${n}
`}` : t, A = (t) => /^.*===\s*BEGIN\s+\S+.*$/m.test(t), J = (t, n, e, s) => {
  const r = t.indexOf(n), o = t.indexOf(e);
  if (r === -1 || o < r)
    throw new T(
      `markers '${n}' / '${e}' absent or out of order`
    );
  const i = t.slice(t.lastIndexOf(`
`, r) + 1, r), c = S(s, i);
  return x(
    t,
    r + n.length,
    o,
    `
${c ? `${c}
` : ""}${i}`
  );
}, G = (t, n, e) => {
  const s = M(t, n);
  return s ? J(t, s.start, s.end, e) : null;
}, h = (t, n) => n.reduce((e, s) => {
  if (!s.section) return e;
  const r = G(e, s.section, s.content);
  if (r === null)
    throw new Error(
      `applyMarkedFills: skeleton has no marked region for section ${JSON.stringify(s.section)}`
    );
  return r;
}, t), w = {
  skeleton: "",
  indent: "",
  sectionPrefix: "ENV"
}, W = {
  "docker-compose.yml": {
    skeleton: `services:
`,
    indent: "  ",
    sectionPrefix: "COMPOSE_SERVICE"
  },
  ".env": w,
  ".env.example": w,
  ".gitignore": { skeleton: `.env
`, indent: "", sectionPrefix: "GITIGNORE" },
  ".dockerignore": {
    skeleton: `.git
.env.local
*.log
*.sqlite
*.sqlite3
*.db
`,
    indent: "",
    sectionPrefix: "DOCKERIGNORE",
    root: !0
  }
}, _ = ({
  skeleton: t,
  indent: n,
  sectionPrefix: e
}) => (s) => {
  if (!s.some((o) => {
    var i;
    return (i = o.section) == null ? void 0 : i.startsWith(`${e}_`);
  })) return null;
  const r = [...new Map(s.map((o) => [o.section, o.content])).values()].map((o) => S(o, n)).filter(Boolean);
  return r.length === 0 ? t : I(t, r.join(`

`));
}, V = (t) => {
  var e;
  const n = t.slice(t.lastIndexOf("/") + 1);
  return (e = W[n]) != null && e.root ? n : t;
}, N = (t) => JSON.parse(t), q = [
  "scripts",
  "dependencies",
  "devDependencies",
  "config",
  "allowScripts"
], K = (t) => {
  const n = t.map((r) => N(r.content)), e = n.find((r) => r.name), s = { ...e };
  for (const r of n)
    if (r !== e)
      for (const o of q)
        r[o] && (s[o] = { ...r[o], ...s[o] });
  return `${JSON.stringify(s, null, 2)}
`;
}, g = (t) => t.filter((n) => !n.section), Y = (t) => {
  const n = /* @__PURE__ */ new Map();
  for (const e of t) {
    if (!e.section) continue;
    const s = n.get(e.section);
    s ? s.push(e.content) : n.set(e.section, [e.content]);
  }
  return n;
}, E = (t) => {
  const n = /* @__PURE__ */ new Set(), e = [];
  for (const s of t) {
    const r = s.replace(/\n+$/, "");
    r.length === 0 || n.has(r) || (n.add(r), e.push(r));
  }
  return e;
}, p = (t) => {
  const n = g(t)[0];
  return n ? h(n.content, t) : null;
}, z = (t) => {
  var s;
  const n = g(t), e = n.find((r) => A(r.content));
  return e ? h(e.content, t) : ((s = n[0]) == null ? void 0 : s.content) ?? null;
}, L = (t, n, e) => {
  var o, i;
  const s = n.map((c) => `COPY ${c.src} ${c.dest}`).filter((c) => !t.split(`
`).some((m) => m.trim() === c));
  if (s.length === 0) return t;
  const r = e && ((o = M(t, e)) == null ? void 0 : o.start) || ((i = [...t.matchAll(/^COPY [^\n]*$/gm)].at(-1)) == null ? void 0 : i[0]);
  if (!r)
    throw new Error(
      "insertDockerfileCopies: content has neither the anchor section's markers nor a COPY line to insert after"
    );
  return F(t, r, s.join(`
`));
}, H = (t, n) => {
  var r;
  const e = (r = t.match(/^WORKDIR\s+(\S+)\s*$/m)) == null ? void 0 : r[1];
  if (!e)
    throw new Error(
      "applyDockerfileCopies: Dockerfile is missing a `WORKDIR` line"
    );
  const s = e === "/app" ? "" : `${e.slice(5)}/`;
  return n.reduce((o, { content: i }) => {
    const { copies: c, anchorSection: m } = N(i);
    return L(
      o,
      c.map(
        (u) => u.workdirRelative ? { src: `${s}${u.src}`, dest: u.dest } : u
      ),
      m
    );
  }, t);
}, Q = (t) => {
  const n = g(t), e = n.find((s) => /^FROM\s/m.test(s.content));
  return e ? h(
    H(
      e.content,
      n.filter((s) => s !== e)
    ),
    t
  ) : null;
}, O = (t) => {
  const n = g(t)[0], e = Y(t);
  if (n && e.size > 0) {
    const r = [...e].map(([o, i]) => ({
      section: o,
      content: E(i).join(`
`)
    }));
    return h(n.content, r);
  }
  const s = E(t.map((r) => r.content));
  return s.length > 0 ? I("", s.join(`
`)) : null;
}, U = new Map([
  ...Object.entries(W).map(
    ([t, n]) => [
      t,
      _(n)
    ]
  ),
  ["package.json", K],
  ["Cargo.toml", z],
  ["app.ts", p],
  ["test-app.ts", p],
  ["entrypoint.sh", p],
  ["Dockerfile", Q],
  [".csproj", p],
  ["mod.rs", O],
  ["lib.rs", O]
]), y = (t, n) => {
  const e = n.slice(n.lastIndexOf("/") + 1), s = e.lastIndexOf("."), r = s > 0 ? e.slice(s) : "";
  return t.get(e) ?? t.get(r) ?? null;
}, X = async (t, n) => {
  await C(B(t), { recursive: !0 }), await D(t, n, "utf8"), t.endsWith(".sh") && await j(t, 493);
};
var f, a;
class st {
  constructor(n = X) {
    k(this, f, []);
    k(this, a, new Map(U));
    this.writer = n;
  }
  registerWriter(n, e) {
    l(this, a).set(n, e);
  }
  add(n) {
    if (!y(l(this, a), n.target))
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${n.target}'`
      );
    l(this, f).push(n);
  }
  async apply(n) {
    const e = /* @__PURE__ */ new Map();
    for (const r of l(this, f)) {
      const o = V(r.target);
      e.set(o, [...e.get(o) ?? [], r]);
    }
    const s = [];
    for (const [r, o] of e) {
      const i = y(l(this, a), r);
      if (!i)
        throw new Error(`PatchMerger.apply: no PatchWriter for target '${r}'`);
      const c = i(o);
      c !== null && (await this.writer(v(n, r), c), s.push(r));
    }
    return s;
  }
}
f = new WeakMap(), a = new WeakMap();
export {
  et as Patch,
  st as PatchMerger
};
//# sourceMappingURL=patch-merger.js.map
