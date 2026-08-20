var V = Object.defineProperty;
var L = (e) => {
  throw TypeError(e);
};
var H = (e, t, r) => t in e ? V(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var S = (e, t, r) => H(e, typeof t != "symbol" ? t + "" : t, r), T = (e, t, r) => t.has(e) || L("Cannot " + r);
var g = (e, t, r) => (T(e, t, "read from private field"), r ? r.call(e) : t.get(e)), d = (e, t, r) => t.has(e) ? L("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), m = (e, t, r, n) => (T(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r);
import { mkdir as Q, writeFile as X } from "node:fs/promises";
import { join as Y, dirname as tt } from "node:path";
class St {
  constructor({
    target: t,
    content: r,
    options: n
  }) {
    S(this, "target");
    S(this, "content");
    S(this, "options");
    if (r.length === 0)
      throw new Error(
        `Patch: content for "${t}" must be a non-empty string`
      );
    this.target = t, this.content = r, n !== void 0 && (this.options = Object.freeze({ ...n })), Object.freeze(this);
  }
}
class et {
  async apply(t, r, n) {
    const s = Y(n, t);
    await Q(tt(s), { recursive: !0 }), await X(s, r, "utf8");
  }
}
const D = (e, t = !1) => {
  var n;
  const r = (n = e.options) == null ? void 0 : n.failIfExists;
  if (r === void 0) return t;
  if (typeof r != "boolean")
    throw new Error(
      `Patch.options.failIfExists for "${e.target}" must be a boolean`
    );
  return r;
}, rt = (e, t = "") => {
  var n;
  const r = (n = e.options) == null ? void 0 : n.jsonTarget;
  if (r === void 0) return t;
  if (typeof r != "string")
    throw new Error(
      `Patch.options.jsonTarget for "${e.target}" must be a string`
    );
  return r;
}, A = (e) => e !== null && typeof e == "object" && !Array.isArray(e), nt = (e) => e.split("/").filter((t) => t.length > 0), st = (e) => {
  try {
    return JSON.parse(e.content);
  } catch (t) {
    throw new Error(
      `DeepJsonWriter: invalid JSON for "${e.target}": ${String(t)}`
    );
  }
}, z = (e, t, r) => {
  if (A(e)) return e;
  throw new Error(
    `DeepJsonWriter: path "/${r.join("/")}" in "${t}" is not an object`
  );
}, O = (e, t, r, n, s, o) => {
  if (e === void 0) return t;
  if (A(e) && A(t))
    return Object.keys(t).reduce(
      (c, i) => ({
        ...c,
        [i]: O(
          e[i],
          t[i],
          r,
          [...n, i],
          s,
          o
        )
      }),
      { ...e }
    );
  if (s)
    throw new Error(
      `DeepJsonWriter: value already exists at "/${n.join("/")}" in "${r}"`
    );
  if (o && JSON.stringify(e) !== JSON.stringify(t))
    throw new Error(
      `DeepJsonWriter: collision at "/${n.join("/")}" in "${r}"`
    );
  return t;
}, F = (e, t, r, n, s, o, c = []) => {
  const [i, ...l] = t;
  if (i === void 0)
    return z(
      O(e, r, n, c, s, o),
      n,
      c
    );
  const u = [...c, i];
  if (l.length === 0)
    return {
      ...e,
      [i]: O(
        e[i],
        r,
        n,
        u,
        s,
        o
      )
    };
  const v = e[i] === void 0 ? {} : z(e[i], n, u);
  return {
    ...e,
    [i]: F(
      v,
      l,
      r,
      n,
      s,
      o,
      u
    )
  };
}, k = (e, { failOnCollision: t }) => {
  const r = e.reduce((n, s) => {
    const o = D(s);
    return F(
      n ?? {},
      nt(rt(s)),
      st(s),
      s.target,
      o,
      t
    );
  }, void 0);
  return `${JSON.stringify(r ?? {}, null, 2)}
`;
}, ot = (e) => {
  const t = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(e);
  return t ? `env:${t[1]}` : `line:${e}`;
}, it = (e) => e.replace(/\r\n/g, `
`).replace(/\n$/, "").split(`
`).map((t) => t.trimEnd()).filter((t) => t.length > 0), a = (e, t) => {
  const r = [], n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = D(s);
    for (const c of it(s.content)) {
      const i = ot(c), l = n.get(i);
      if (l !== void 0) {
        if (o)
          throw new Error(
            `LineUpsertWriter: line already exists in "${s.target}" (${i})`
          );
        if (t.failOnCollision && l !== c)
          throw new Error(
            `LineUpsertWriter: collision in "${s.target}" (${i})`
          );
      } else
        r.push(i);
      n.set(i, c);
    }
  }
  return r.length === 0 ? "" : `${r.map((s) => n.get(s)).join(`
`)}
`;
}, P = /^([ \t]*)(\/\/|#)\s*[—-]\s*START\s+(\S+)\s*$/, ct = /^([ \t]*)(\/\/|#)\s*[—-]\s*END\s+(\S+)\s*$/, at = (e) => /\.(?:ts|tsx|js|jsx|cs|rs)$/.test(e) ? "//" : "#", lt = (e) => {
  const t = e.replace(/\r\n/g, `
`).replace(/\n$/, "");
  return t.length === 0 ? [] : t.split(`
`);
}, ft = (e) => e.length === 0 ? "" : `${e.join(`
`)}
`, R = (e, t, r, n) => `${t}${e} — ${r} ${n}`, U = (e, t, r, n) => {
  for (let s = r; s < n; s++) {
    const o = P.exec(e[s] ?? "");
    if (!o || o[3] !== t) continue;
    let c = 0;
    for (let i = s + 1; i < n; i++) {
      const l = P.exec(e[i] ?? "");
      if ((l == null ? void 0 : l[3]) === t) {
        c += 1;
        continue;
      }
      const u = ct.exec(e[i] ?? "");
      if ((u == null ? void 0 : u[3]) === t) {
        if (c > 0) {
          c -= 1;
          continue;
        }
        return {
          start: s,
          end: i,
          indent: o[1] ?? "",
          prefix: o[2] ?? "#"
        };
      }
    }
    throw new Error(`SectionWriter: missing END marker for "${t}"`);
  }
  return null;
}, ut = (e, t, r, n) => {
  let s = 0, o = r;
  for (; o < n; ) {
    const c = P.exec(e[o] ?? "");
    if (!c) {
      o += 1;
      continue;
    }
    const i = U(e, c[3] ?? "", o, n);
    c[3] === t && (s += 1), o = i.end + 1;
  }
  return s;
}, _ = (e, t, r, n) => {
  if (e.length === 0) return t;
  const [s, ...o] = e, c = _(o, t, r, n);
  return [
    R(r, n, "START", s),
    ...c,
    R(r, n, "END", s)
  ];
}, J = (e, t, r, n) => [
  ...e.slice(0, t),
  ...n,
  ...e.slice(t + r)
], gt = (e) => {
  var r;
  const t = (r = e.options) == null ? void 0 : r.sections;
  if (!Array.isArray(t) || t.length === 0)
    throw new Error(
      `SectionWriter: options.sections for "${e.target}" must be a non-empty array`
    );
  if (!t.every((n) => typeof n == "string" && n.length > 0))
    throw new Error(
      `SectionWriter: options.sections for "${e.target}" must contain non-empty strings`
    );
  return t;
}, ht = (e) => {
  var r;
  const t = (r = e.options) == null ? void 0 : r.appendIfNotExists;
  if (t === void 0) return "End";
  if (t === "None" || t === "End" || t === "Start") return t;
  throw new Error(
    `SectionWriter: options.appendIfNotExists for "${e.target}" must be None, End, or Start`
  );
}, pt = (e, t, r, n, s, o) => {
  if (n === "None")
    throw new Error(
      `SectionWriter: section "${o}" does not exist in "${s}"`
    );
  return t ? n === "Start" ? J(e, t.start + 1, 0, r) : J(e, t.end, 0, r) : n === "Start" ? [...r, ...e] : [...e, ...r];
}, f = (e, t) => {
  let r = [];
  const n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = gt(s), c = D(s), i = ht(s), l = o.join("/"), u = n.get(l);
    if (u !== void 0) {
      if (c)
        throw new Error(
          `SectionWriter: section "${l}" already exists in "${s.target}"`
        );
      if (t.failOnCollision && u !== s.content)
        throw new Error(
          `SectionWriter: collision in "${s.target}" section "${l}"`
        );
    }
    n.set(l, s.content);
    const v = at(s.target), I = lt(s.content);
    let W = 0, b = r.length, w = null;
    for (let $ = 0; $ < o.length; $++) {
      const N = o[$], M = o.slice($), B = ut(r, N, W, b);
      if (t.failOnCollision && B > 1)
        throw new Error(
          `SectionWriter: collision: duplicate section "${N}" in "${s.target}"`
        );
      const h = U(r, N, W, b), G = $ === o.length - 1;
      if (!h) {
        const K = (w == null ? void 0 : w.indent) ?? "", Z = _(M, I, v, K);
        r = pt(
          r,
          w,
          Z,
          i,
          s.target,
          M.join("/")
        );
        break;
      }
      if (G) {
        if (c)
          throw new Error(
            `SectionWriter: section "${l}" already exists in "${s.target}"`
          );
        r = J(
          r,
          h.start + 1,
          h.end - h.start - 1,
          I
        );
        break;
      }
      w = h, W = h.start + 1, b = h.end;
    }
  }
  return ft(r);
}, dt = [
  ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", f],
  ["**/*.{cs,csx,fs,fsx,vb}", f],
  ["**/*.rs", f],
  ["**/*.{go,java,kt,kts,scala,groovy,gradle}", f],
  ["**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,m,mm}", f],
  ["**/*.{swift,php}", f],
  ["**/*.{py,rb,pl,pm,r,jl}", f],
  ["**/*.{sh,bash,zsh,ksh,fish}", f],
  ["**/*.{yml,yaml,toml}", f],
  ["**/*.{xml,csproj,fsproj,vbproj,props,targets,nuspec}", f],
  ["**/*.{html,htm,vue,svelte,astro}", f],
  ["**/*.{css,scss,sass,less}", f],
  ["**/*.{sql,graphql,gql}", f],
  ["**/*.{cmake,mk,md}", f],
  [
    "**/{Dockerfile,Dockerfile.*,Makefile,makefile,GNUmakefile,Justfile,justfile,CMakeLists.txt}",
    f
  ],
  ["**/*.json", k],
  ["**/*.jsonc", k],
  ["**/*.json5", k],
  ["**/.env", a],
  ["**/.env.*", a],
  ["**/.gitignore", a],
  ["**/.dockerignore", a],
  ["**/.containerignore", a],
  ["**/.ignore", a],
  ["**/.npmignore", a],
  ["**/.eslintignore", a],
  ["**/.prettierignore", a],
  ["**/.stylelintignore", a],
  ["**/.markdownlintignore", a],
  ["**/.helmignore", a],
  ["**/.gcloudignore", a],
  ["**/.fdignore", a],
  ["**/.rgignore", a],
  ["**/.cursorignore", a],
  ["**/.claudeignore", a],
  ["**/.slugignore", a],
  ["**/.tfignore", a],
  ["**/.cvsignore", a],
  ["**/.bzrignore", a],
  ["**/.hgignore", a]
], q = (e) => {
  const t = /\{([^{}]+)\}/.exec(e);
  if (!t || t.index === void 0) return [e];
  const r = t[0];
  return t[1].split(",").flatMap(
    (s) => q(
      `${e.slice(0, t.index)}${s}${e.slice(t.index + r.length)}`
    )
  );
}, wt = (e) => {
  let t = "";
  for (let r = 0; r < e.length; r++) {
    if (e.startsWith("**/", r)) {
      t += "(?:.*/)?", r += 2;
      continue;
    }
    if (e.startsWith("**", r)) {
      t += ".*", r += 1;
      continue;
    }
    const n = e[r];
    if (n === "*") {
      t += "[^/]*";
      continue;
    }
    if (n === "?") {
      t += "[^/]";
      continue;
    }
    t += n.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${t}$`);
}, $t = (e, t) => {
  const r = e.replaceAll("\\", "/");
  return q(t.replaceAll("\\", "/")).some(
    (n) => wt(n).test(r)
  );
}, C = (e, t) => {
  for (let r = e.length - 1; r >= 0; r--) {
    const n = e[r];
    if ($t(t, n[0])) return n[1];
  }
  return null;
}, mt = (e) => e.reduce((t, r) => (t.set(r.target, [...t.get(r.target) ?? [], r]), t), /* @__PURE__ */ new Map()), yt = (e, t, r) => r ? Promise.all(e.map(t)) : e.reduce(
  async (n, s) => [...await n, await t(s)],
  Promise.resolve([])
);
var y, p, E, x, j;
class vt {
  constructor({
    failOnCollision: t = !0,
    parallelWriteMode: r = !0,
    writers: n = dt,
    applyStrategy: s = new et()
  } = {}) {
    d(this, y, []);
    d(this, p);
    d(this, E);
    d(this, x);
    d(this, j);
    m(this, E, t), m(this, x, r), m(this, p, [...n]), m(this, j, s);
  }
  registerWriter(t, r) {
    g(this, p).push([t, r]);
  }
  add(t) {
    if (!C(g(this, p), t.target))
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${t.target}'`
      );
    g(this, y).push(t);
  }
  async apply(t, r = g(this, j)) {
    const n = { failOnCollision: g(this, E) }, s = async ([c, i]) => {
      const l = C(g(this, p), c)(i, n);
      return l === null ? null : (await r.apply(c, l, t), c);
    };
    return (await yt(
      [...mt(g(this, y))],
      s,
      g(this, x)
    )).filter((c) => c !== null);
  }
}
y = new WeakMap(), p = new WeakMap(), E = new WeakMap(), x = new WeakMap(), j = new WeakMap();
export {
  et as I,
  St as P,
  vt as a,
  dt as b,
  k as d,
  a as l,
  f as s
};
//# sourceMappingURL=patch-merger-BrffLy8o.js.map
