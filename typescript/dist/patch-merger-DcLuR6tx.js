var Z = Object.defineProperty;
var J = (e) => {
  throw TypeError(e);
};
var V = (e, t, n) => t in e ? Z(e, t, { enumerable: !0, configurable: !0, writable: !0, value: n }) : e[t] = n;
var v = (e, t, n) => V(e, typeof t != "symbol" ? t + "" : t, n), T = (e, t, n) => t.has(e) || J("Cannot " + n);
var p = (e, t, n) => (T(e, t, "read from private field"), n ? n.call(e) : t.get(e)), w = (e, t, n) => t.has(e) ? J("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, n), $ = (e, t, n, r) => (T(e, t, "write to private field"), r ? r.call(e, n) : t.set(e, n), n);
import { mkdir as Q, writeFile as Y } from "node:fs/promises";
import { join as tt, dirname as et } from "node:path";
class Nt {
  constructor({
    target: t,
    content: n,
    options: r
  }) {
    v(this, "target");
    v(this, "content");
    v(this, "options");
    if (n.length === 0)
      throw new Error(
        `Patch: content for "${t}" must be a non-empty string`
      );
    this.target = t, this.content = n, r !== void 0 && (this.options = Object.freeze({ ...r })), Object.freeze(this);
  }
}
class nt {
  async apply(t, n, r) {
    const s = tt(r, t);
    await Q(et(s), { recursive: !0 }), await Y(s, n, "utf8");
  }
}
const L = (e, t = !1) => {
  var r;
  const n = (r = e.options) == null ? void 0 : r.failIfExists;
  if (n === void 0) return t;
  if (typeof n != "boolean")
    throw new Error(
      `Patch.options.failIfExists for "${e.target}" must be a boolean`
    );
  return n;
}, rt = (e, t = "") => {
  var r;
  const n = (r = e.options) == null ? void 0 : r.jsonTarget;
  if (n === void 0) return t;
  if (typeof n != "string")
    throw new Error(
      `Patch.options.jsonTarget for "${e.target}" must be a string`
    );
  return n;
}, O = (e) => e !== null && typeof e == "object" && !Array.isArray(e), st = (e) => e.split("/").filter((t) => t.length > 0), ot = (e) => {
  try {
    return JSON.parse(e.content);
  } catch (t) {
    throw new Error(
      `DeepJsonWriter: invalid JSON for "${e.target}": ${String(t)}`
    );
  }
}, C = (e, t, n) => {
  if (O(e)) return e;
  throw new Error(
    `DeepJsonWriter: path "/${n.join("/")}" in "${t}" is not an object`
  );
}, A = (e, t, n, r, s, o) => {
  if (e === void 0) return t;
  if (O(e) && O(t))
    return Object.keys(t).reduce(
      (c, i) => ({
        ...c,
        [i]: A(
          e[i],
          t[i],
          n,
          [...r, i],
          s,
          o
        )
      }),
      { ...e }
    );
  if (s)
    throw new Error(
      `DeepJsonWriter: value already exists at "/${r.join("/")}" in "${n}"`
    );
  if (o && JSON.stringify(e) !== JSON.stringify(t))
    throw new Error(
      `DeepJsonWriter: collision at "/${r.join("/")}" in "${n}"`
    );
  return t;
}, B = (e, t, n, r, s, o, c = []) => {
  const [i, ...l] = t;
  if (i === void 0)
    return C(
      A(e, n, r, c, s, o),
      r,
      c
    );
  const u = [...c, i];
  if (l.length === 0)
    return {
      ...e,
      [i]: A(
        e[i],
        n,
        r,
        u,
        s,
        o
      )
    };
  const y = e[i] === void 0 ? {} : C(e[i], r, u);
  return {
    ...e,
    [i]: B(
      y,
      l,
      n,
      r,
      s,
      o,
      u
    )
  };
}, N = (e, { failOnCollision: t }) => {
  const n = e.reduce((r, s) => {
    const o = L(s);
    return B(
      r ?? {},
      st(rt(s)),
      ot(s),
      s.target,
      o,
      t
    );
  }, void 0);
  return `${JSON.stringify(n ?? {}, null, 2)}
`;
}, it = (e) => {
  const t = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(e);
  return t ? `env:${t[1]}` : `line:${e}`;
}, ct = (e) => e.replace(/\r\n/g, `
`).replace(/\n$/, "").split(`
`).map((t) => t.trimEnd()).filter((t) => t.length > 0), a = (e, t) => {
  const n = [], r = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = L(s);
    for (const c of ct(s.content)) {
      const i = it(c), l = r.get(i);
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
        n.push(i);
      r.set(i, c);
    }
  }
  return n.length === 0 ? "" : `${n.map((s) => r.get(s)).join(`
`)}
`;
}, M = /^([ \t]*)(<!--|\/\/|\/\*|#|--)\s*(?:[—-]\s*START|={3}\s*BEGIN)\s+(\S+)(?:\s.*)?$/, at = /^([ \t]*)(<!--|\/\/|\/\*|#|--)\s*(?:[—-]\s*END|={3}\s*END)\s+(\S+)\s*(?:={3})?\s*(?:\*\/|-->)?\s*$/, lt = /* @__PURE__ */ new Set([
  "xml",
  "csproj",
  "fsproj",
  "vbproj",
  "props",
  "targets",
  "nuspec",
  "html",
  "htm",
  "vue",
  "svelte",
  "astro"
]), ft = /* @__PURE__ */ new Set(["css", "scss", "sass", "less"]), ut = /* @__PURE__ */ new Set([
  "ts",
  "tsx",
  "mts",
  "cts",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "cs",
  "csx",
  "fs",
  "fsx",
  "vb",
  "rs",
  "go",
  "java",
  "kt",
  "kts",
  "scala",
  "groovy",
  "gradle",
  "c",
  "cc",
  "cpp",
  "cxx",
  "h",
  "hh",
  "hpp",
  "hxx",
  "m",
  "mm",
  "swift",
  "php"
]), pt = /* @__PURE__ */ new Set([
  "Dockerfile",
  "Makefile",
  "makefile",
  "GNUmakefile",
  "Justfile",
  "justfile",
  "CMakeLists.txt"
]), ht = (e) => {
  const t = Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\"));
  return e.slice(t + 1);
}, gt = (e) => {
  const t = ht(e);
  if (pt.has(t) || t.startsWith("Dockerfile."))
    return { open: "#", close: "" };
  const n = t.lastIndexOf("."), r = n > 0 ? t.slice(n + 1).toLowerCase() : "";
  return lt.has(r) ? { open: "<!--", close: " -->" } : ft.has(r) ? { open: "/*", close: " */" } : ut.has(r) ? { open: "//", close: "" } : { open: "#", close: "" };
}, _ = (e) => {
  const t = e.replace(/\r\n/g, `
`).replace(/\n$/, "");
  return t.length === 0 ? [] : t.split(`
`);
}, dt = (e) => e.length === 0 ? "" : `${e.join(`
`)}
`, z = (e, t, n, r) => `${t}${e.open} — ${n} ${r}${e.close}`, U = (e, t, n, r) => {
  for (let s = n; s < r; s++) {
    const o = M.exec(e[s] ?? "");
    if (!o || o[3] !== t) continue;
    let c = 0;
    for (let i = s + 1; i < r; i++) {
      const l = M.exec(e[i] ?? "");
      if ((l == null ? void 0 : l[3]) === t) {
        c += 1;
        continue;
      }
      const u = at.exec(e[i] ?? "");
      if ((u == null ? void 0 : u[3]) === t) {
        if (c > 0) {
          c -= 1;
          continue;
        }
        return {
          start: s,
          end: i,
          indent: o[1] ?? ""
        };
      }
    }
    throw new Error(`SectionWriter: missing END marker for "${t}"`);
  }
  return null;
}, wt = (e, t, n, r) => {
  let s = 0, o = n;
  for (; o < r; ) {
    const c = M.exec(e[o] ?? "");
    if (!c) {
      o += 1;
      continue;
    }
    const i = U(e, c[3] ?? "", o, r);
    c[3] === t && (s += 1), o = i.end + 1;
  }
  return s;
}, F = (e, t, n, r) => {
  if (e.length === 0) return t;
  const [s, ...o] = e, c = F(o, t, n, r);
  return [
    z(n, r, "START", s),
    ...c,
    z(n, r, "END", s)
  ];
}, I = (e, t, n, r) => [
  ...e.slice(0, t),
  ...r,
  ...e.slice(t + n)
], mt = (e) => {
  var n;
  const t = (n = e.options) == null ? void 0 : n.sections;
  if (t !== void 0) {
    if (!Array.isArray(t) || t.length === 0)
      throw new Error(
        `SectionWriter: options.sections for "${e.target}" must be a non-empty array`
      );
    if (!t.every((r) => typeof r == "string" && r.length > 0))
      throw new Error(
        `SectionWriter: options.sections for "${e.target}" must contain non-empty strings`
      );
    return t;
  }
}, $t = (e) => {
  var n;
  const t = (n = e.options) == null ? void 0 : n.appendIfNotExists;
  if (t === void 0) return "End";
  if (t === "None" || t === "End" || t === "Start") return t;
  throw new Error(
    `SectionWriter: options.appendIfNotExists for "${e.target}" must be None, End, or Start`
  );
}, xt = (e, t, n, r, s, o) => {
  if (r === "None")
    throw new Error(
      `SectionWriter: section "${o}" does not exist in "${s}"`
    );
  return t ? r === "Start" ? I(e, t.start + 1, 0, n) : I(e, t.end, 0, n) : r === "Start" ? [...n, ...e] : [...e, ...n];
}, f = (e, t) => {
  let n = [];
  const r = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = mt(s), c = L(s);
    if (o === void 0) {
      const h = r.get("");
      if (h !== void 0) {
        if (c)
          throw new Error(
            `SectionWriter: seed already exists in "${s.target}"`
          );
        if (t.failOnCollision && h !== s.content)
          throw new Error(
            `SectionWriter: collision in "${s.target}" seed`
          );
      }
      r.clear(), r.set("", s.content), n = _(s.content);
      continue;
    }
    const i = $t(s), l = o.join("/"), u = r.get(l);
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
    r.set(l, s.content);
    const y = gt(s.target), D = _(s.content);
    let W = 0, k = n.length, m = null;
    for (let h = 0; h < o.length; h++) {
      const b = o[h], P = o.slice(h), X = wt(n, b, W, k);
      if (t.failOnCollision && X > 1)
        throw new Error(
          `SectionWriter: collision: duplicate section "${b}" in "${s.target}"`
        );
      const g = U(n, b, W, k), q = h === o.length - 1;
      if (!g) {
        const H = (m == null ? void 0 : m.indent) ?? "", K = F(P, D, y, H);
        n = xt(
          n,
          m,
          K,
          i,
          s.target,
          P.join("/")
        );
        break;
      }
      if (q) {
        if (c)
          throw new Error(
            `SectionWriter: section "${l}" already exists in "${s.target}"`
          );
        n = I(
          n,
          g.start + 1,
          g.end - g.start - 1,
          D
        );
        break;
      }
      m = g, W = g.start + 1, k = g.end;
    }
  }
  return dt(n);
}, Et = [
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
  ["**/*.json", N],
  ["**/*.jsonc", N],
  ["**/*.json5", N],
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
], G = (e) => {
  const t = /\{([^{}]+)\}/.exec(e);
  if (!t || t.index === void 0) return [e];
  const n = t[0];
  return t[1].split(",").flatMap(
    (s) => G(
      `${e.slice(0, t.index)}${s}${e.slice(t.index + n.length)}`
    )
  );
}, St = (e) => {
  let t = "";
  for (let n = 0; n < e.length; n++) {
    if (e.startsWith("**/", n)) {
      t += "(?:.*/)?", n += 2;
      continue;
    }
    if (e.startsWith("**", n)) {
      t += ".*", n += 1;
      continue;
    }
    const r = e[n];
    if (r === "*") {
      t += "[^/]*";
      continue;
    }
    if (r === "?") {
      t += "[^/]";
      continue;
    }
    t += r.replace(/[.*+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${t}$`);
}, jt = (e, t) => {
  const n = e.replaceAll("\\", "/");
  return G(t.replaceAll("\\", "/")).some(
    (r) => St(r).test(n)
  );
}, R = (e, t) => {
  for (let n = e.length - 1; n >= 0; n--) {
    const r = e[n];
    if (jt(t, r[0])) return r[1];
  }
  return null;
}, vt = (e) => e.reduce((t, n) => (t.set(n.target, [...t.get(n.target) ?? [], n]), t), /* @__PURE__ */ new Map()), yt = (e, t, n) => n ? Promise.all(e.map(t)) : e.reduce(
  async (r, s) => [...await r, await t(s)],
  Promise.resolve([])
);
var x, d, E, S, j;
class Ot {
  constructor({
    failOnCollision: t = !0,
    parallelWriteMode: n = !0,
    writers: r = Et,
    applyStrategy: s = new nt()
  } = {}) {
    w(this, x, []);
    w(this, d);
    w(this, E);
    w(this, S);
    w(this, j);
    $(this, E, t), $(this, S, n), $(this, d, [...r]), $(this, j, s);
  }
  registerWriter(t, n) {
    p(this, d).push([t, n]);
  }
  add(t) {
    if (!R(p(this, d), t.target))
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${t.target}'`
      );
    p(this, x).push(t);
  }
  async apply(t, n = p(this, j)) {
    const r = { failOnCollision: p(this, E) }, s = async ([c, i]) => {
      const l = R(p(this, d), c)(i, r);
      return l === null ? null : (await n.apply(c, l, t), c);
    };
    return (await yt(
      [...vt(p(this, x))],
      s,
      p(this, S)
    )).filter((c) => c !== null);
  }
}
x = new WeakMap(), d = new WeakMap(), E = new WeakMap(), S = new WeakMap(), j = new WeakMap();
export {
  nt as I,
  Nt as P,
  Ot as a,
  Et as b,
  N as d,
  a as l,
  f as s
};
//# sourceMappingURL=patch-merger-DcLuR6tx.js.map
