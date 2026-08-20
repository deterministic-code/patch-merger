var Z = Object.defineProperty;
var T = (e) => {
  throw TypeError(e);
};
var Q = (e, t, r) => t in e ? Z(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var b = (e, t, r) => Q(e, typeof t != "symbol" ? t + "" : t, r), X = (e, t, r) => t.has(e) || T("Cannot " + r);
var p = (e, t, r) => (X(e, t, "read from private field"), r ? r.call(e) : t.get(e)), w = (e, t, r) => t.has(e) ? T("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), x = (e, t, r, n) => (X(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r);
import { mkdir as tt, writeFile as et } from "node:fs/promises";
import { join as rt, dirname as nt } from "node:path";
import { XMLParser as st, XMLBuilder as ot, XMLValidator as it } from "fast-xml-parser";
import { parse as ct, stringify as at } from "yaml";
class _t {
  constructor({
    target: t,
    content: r,
    options: n
  }) {
    b(this, "target");
    b(this, "content");
    b(this, "options");
    if (r.length === 0)
      throw new Error(
        `Patch: content for "${t}" must be a non-empty string`
      );
    this.target = t, this.content = r, n !== void 0 && (this.options = Object.freeze({ ...n })), Object.freeze(this);
  }
}
class lt {
  async apply(t, r, n) {
    const s = rt(n, t);
    await tt(nt(s), { recursive: !0 }), await et(s, r, "utf8");
  }
}
const P = (e, t = !1) => {
  var n;
  const r = (n = e.options) == null ? void 0 : n.failIfExists;
  if (r === void 0) return t;
  if (typeof r != "boolean")
    throw new Error(
      `Patch.options.failIfExists for "${e.target}" must be a boolean`
    );
  return r;
}, ft = (e, t = "") => {
  var n;
  const r = (n = e.options) == null ? void 0 : n.jsonTarget;
  if (r === void 0) return t;
  if (typeof r != "string")
    throw new Error(
      `Patch.options.jsonTarget for "${e.target}" must be a string`
    );
  return r;
}, A = (e) => e !== null && typeof e == "object" && !Array.isArray(e), ut = (e) => e.split("/").filter((t) => t.length > 0), _ = (e, t, r, n) => {
  if (A(e)) return e;
  throw new Error(
    `${t}: path "/${n.join("/")}" in "${r}" is not an object`
  );
}, M = (e, t, r, n, s, i, c) => {
  if (e === void 0) return t;
  if (A(e) && A(t))
    return Object.keys(t).reduce(
      (a, o) => ({
        ...a,
        [o]: M(
          e[o],
          t[o],
          r,
          n,
          [...s, o],
          i,
          c
        )
      }),
      { ...e }
    );
  if (i)
    throw new Error(
      `${r}: value already exists at "/${s.join("/")}" in "${n}"`
    );
  if (c && JSON.stringify(e) !== JSON.stringify(t))
    throw new Error(
      `${r}: collision at "/${s.join("/")}" in "${n}"`
    );
  return t;
}, U = (e, t, r, n, s, i, c, a = []) => {
  const [o, ...u] = t;
  if (o === void 0)
    return _(
      M(
        e,
        r,
        n,
        s,
        a,
        i,
        c
      ),
      n,
      s,
      a
    );
  const m = [...a, o];
  if (u.length === 0)
    return {
      ...e,
      [o]: M(
        e[o],
        r,
        n,
        s,
        m,
        i,
        c
      )
    };
  const j = e[o] === void 0 ? {} : _(e[o], n, s, m);
  return {
    ...e,
    [o]: U(
      j,
      u,
      r,
      n,
      s,
      i,
      c,
      m
    )
  };
}, I = ({
  name: e,
  parse: t,
  stringify: r
}) => (s, { failOnCollision: i }) => {
  const c = s.reduce((a, o) => {
    const u = P(o);
    return U(
      a ?? {},
      ut(ft(o)),
      t(o.content, o.target),
      e,
      o.target,
      u,
      i
    );
  }, void 0);
  return r(c ?? {});
}, O = I({
  name: "DeepJsonWriter",
  parse: (e, t) => {
    try {
      return JSON.parse(e);
    } catch (r) {
      throw new Error(
        `DeepJsonWriter: invalid JSON for "${t}": ${String(r)}`
      );
    }
  },
  stringify: (e) => `${JSON.stringify(e, null, 2)}
`
}), pt = new st({
  ignoreAttributes: !1,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: !0,
  parseTagValue: !0,
  parseAttributeValue: !0,
  trimValues: !0
}), ht = new ot({
  ignoreAttributes: !1,
  attributeNamePrefix: "@_",
  format: !0,
  indentBy: "  ",
  suppressEmptyNode: !0
}), gt = I({
  name: "DeepXmlWriter",
  parse: (e, t) => {
    const r = it.validate(e);
    if (r !== !0)
      throw new Error(
        `DeepXmlWriter: invalid XML for "${t}": ${r.err.msg}`
      );
    return JSON.parse(JSON.stringify(pt.parse(e)));
  },
  stringify: (e) => {
    const t = String(ht.build(e)).replace(/\s+$/u, "");
    return t.length === 0 ? `
` : `${t}
`;
  }
}), B = I({
  name: "DeepYamlWriter",
  parse: (e, t) => {
    try {
      const r = ct(e) ?? {};
      return JSON.parse(JSON.stringify(r));
    } catch (r) {
      throw new Error(
        `DeepYamlWriter: invalid YAML for "${t}": ${String(r)}`
      );
    }
  },
  stringify: (e) => `${at(e, { indent: 2 }).replace(/\s+$/u, "")}
`
}), dt = (e) => {
  const t = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(e);
  return t ? `env:${t[1]}` : `line:${e}`;
}, wt = (e) => e.replace(/\r\n/g, `
`).replace(/\n$/, "").split(`
`).map((t) => t.trimEnd()).filter((t) => t.length > 0), l = (e, t) => {
  const r = [], n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const i = P(s);
    for (const c of wt(s.content)) {
      const a = dt(c), o = n.get(a);
      if (o !== void 0) {
        if (i)
          throw new Error(
            `LineUpsertWriter: line already exists in "${s.target}" (${a})`
          );
        if (t.failOnCollision && o !== c)
          throw new Error(
            `LineUpsertWriter: collision in "${s.target}" (${a})`
          );
      } else
        r.push(a);
      n.set(a, c);
    }
  }
  return r.length === 0 ? "" : `${r.map((s) => n.get(s)).join(`
`)}
`;
}, L = /^([ \t]*)(<!--|\/\/|\/\*|#|--)\s*(?:[—-]\s*START|={3}\s*BEGIN)\s+(\S+)(?:\s.*)?$/, mt = /^([ \t]*)(<!--|\/\/|\/\*|#|--)\s*(?:[—-]\s*END|={3}\s*END)\s+(\S+)\s*(?:={3})?\s*(?:\*\/|-->)?\s*$/, $t = /* @__PURE__ */ new Set([
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
]), xt = /* @__PURE__ */ new Set(["css", "scss", "sass", "less"]), yt = /* @__PURE__ */ new Set([
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
]), Et = /* @__PURE__ */ new Set([
  "Dockerfile",
  "Makefile",
  "makefile",
  "GNUmakefile",
  "Justfile",
  "justfile",
  "CMakeLists.txt"
]), St = (e) => {
  const t = Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\"));
  return e.slice(t + 1);
}, vt = (e) => {
  const t = St(e);
  if (Et.has(t) || t.startsWith("Dockerfile."))
    return { open: "#", close: "" };
  const r = t.lastIndexOf("."), n = r > 0 ? t.slice(r + 1).toLowerCase() : "";
  return $t.has(n) ? { open: "<!--", close: " -->" } : xt.has(n) ? { open: "/*", close: " */" } : yt.has(n) ? { open: "//", close: "" } : { open: "#", close: "" };
}, C = (e) => {
  const t = e.replace(/\r\n/g, `
`).replace(/\n$/, "");
  return t.length === 0 ? [] : t.split(`
`);
}, jt = (e) => e.length === 0 ? "" : `${e.join(`
`)}
`, z = (e, t, r, n) => `${t}${e.open} — ${r} ${n}${e.close}`, V = (e, t, r, n) => {
  for (let s = r; s < n; s++) {
    const i = L.exec(e[s] ?? "");
    if (!i || i[3] !== t) continue;
    let c = 0;
    for (let a = s + 1; a < n; a++) {
      const o = L.exec(e[a] ?? "");
      if ((o == null ? void 0 : o[3]) === t) {
        c += 1;
        continue;
      }
      const u = mt.exec(e[a] ?? "");
      if ((u == null ? void 0 : u[3]) === t) {
        if (c > 0) {
          c -= 1;
          continue;
        }
        return {
          start: s,
          end: a,
          indent: i[1] ?? ""
        };
      }
    }
    throw new Error(`SectionWriter: missing END marker for "${t}"`);
  }
  return null;
}, bt = (e, t, r, n) => {
  let s = 0, i = r;
  for (; i < n; ) {
    const c = L.exec(e[i] ?? "");
    if (!c) {
      i += 1;
      continue;
    }
    const a = V(e, c[3] ?? "", i, n);
    c[3] === t && (s += 1), i = a.end + 1;
  }
  return s;
}, F = (e, t, r, n) => {
  if (e.length === 0) return t;
  const [s, ...i] = e, c = F(i, t, r, n);
  return [
    z(r, n, "START", s),
    ...c,
    z(r, n, "END", s)
  ];
}, D = (e, t, r, n) => [
  ...e.slice(0, t),
  ...n,
  ...e.slice(t + r)
], Wt = (e) => {
  var r;
  const t = (r = e.options) == null ? void 0 : r.sections;
  if (t !== void 0) {
    if (!Array.isArray(t) || t.length === 0)
      throw new Error(
        `SectionWriter: options.sections for "${e.target}" must be a non-empty array`
      );
    if (!t.every((n) => typeof n == "string" && n.length > 0))
      throw new Error(
        `SectionWriter: options.sections for "${e.target}" must contain non-empty strings`
      );
    return t;
  }
}, Nt = (e) => {
  var r;
  const t = (r = e.options) == null ? void 0 : r.appendIfNotExists;
  if (t === void 0) return "End";
  if (t === "None" || t === "End" || t === "Start") return t;
  throw new Error(
    `SectionWriter: options.appendIfNotExists for "${e.target}" must be None, End, or Start`
  );
}, kt = (e, t, r, n, s, i) => {
  if (n === "None")
    throw new Error(
      `SectionWriter: section "${i}" does not exist in "${s}"`
    );
  return t ? n === "Start" ? D(e, t.start + 1, 0, r) : D(e, t.end, 0, r) : n === "Start" ? [...r, ...e] : [...e, ...r];
}, f = (e, t) => {
  let r = [];
  const n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const i = Wt(s), c = P(s);
    if (i === void 0) {
      const h = n.get("");
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
      n.clear(), n.set("", s.content), r = C(s.content);
      continue;
    }
    const a = Nt(s), o = i.join("/"), u = n.get(o);
    if (u !== void 0) {
      if (c)
        throw new Error(
          `SectionWriter: section "${o}" already exists in "${s.target}"`
        );
      if (t.failOnCollision && u !== s.content)
        throw new Error(
          `SectionWriter: collision in "${s.target}" section "${o}"`
        );
    }
    n.set(o, s.content);
    const m = vt(s.target), j = C(s.content);
    let W = 0, N = r.length, $ = null;
    for (let h = 0; h < i.length; h++) {
      const k = i[h], J = i.slice(h), Y = bt(r, k, W, N);
      if (t.failOnCollision && Y > 1)
        throw new Error(
          `SectionWriter: collision: duplicate section "${k}" in "${s.target}"`
        );
      const g = V(r, k, W, N), q = h === i.length - 1;
      if (!g) {
        const H = ($ == null ? void 0 : $.indent) ?? "", K = F(J, j, m, H);
        r = kt(
          r,
          $,
          K,
          a,
          s.target,
          J.join("/")
        );
        break;
      }
      if (q) {
        if (c)
          throw new Error(
            `SectionWriter: section "${o}" already exists in "${s.target}"`
          );
        r = D(
          r,
          g.start + 1,
          g.end - g.start - 1,
          j
        );
        break;
      }
      $ = g, W = g.start + 1, N = g.end;
    }
  }
  return jt(r);
}, Ot = [
  ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", f],
  ["**/*.{cs,csx,fs,fsx,vb}", f],
  ["**/*.rs", f],
  ["**/*.{go,java,kt,kts,scala,groovy,gradle}", f],
  ["**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,m,mm}", f],
  ["**/*.{swift,php}", f],
  ["**/*.{py,rb,pl,pm,r,jl}", f],
  ["**/*.{sh,bash,zsh,ksh,fish}", f],
  ["**/*.toml", f],
  ["**/*.{csproj,fsproj,vbproj,props,targets,nuspec}", f],
  ["**/*.{html,htm,vue,svelte,astro}", f],
  ["**/*.{css,scss,sass,less}", f],
  ["**/*.{sql,graphql,gql}", f],
  ["**/*.{cmake,mk,md}", f],
  [
    "**/{Dockerfile,Dockerfile.*,Makefile,makefile,GNUmakefile,Justfile,justfile,CMakeLists.txt}",
    f
  ],
  ["**/*.json", O],
  ["**/*.jsonc", O],
  ["**/*.json5", O],
  ["**/*.yml", B],
  ["**/*.yaml", B],
  ["**/*.xml", gt],
  ["**/.env", l],
  ["**/.env.*", l],
  ["**/.gitignore", l],
  ["**/.dockerignore", l],
  ["**/.containerignore", l],
  ["**/.ignore", l],
  ["**/.npmignore", l],
  ["**/.eslintignore", l],
  ["**/.prettierignore", l],
  ["**/.stylelintignore", l],
  ["**/.markdownlintignore", l],
  ["**/.helmignore", l],
  ["**/.gcloudignore", l],
  ["**/.fdignore", l],
  ["**/.rgignore", l],
  ["**/.cursorignore", l],
  ["**/.claudeignore", l],
  ["**/.slugignore", l],
  ["**/.tfignore", l],
  ["**/.cvsignore", l],
  ["**/.bzrignore", l],
  ["**/.hgignore", l]
], G = (e) => {
  const t = /\{([^{}]+)\}/.exec(e);
  if (!t || t.index === void 0) return [e];
  const r = t[0];
  return t[1].split(",").flatMap(
    (s) => G(
      `${e.slice(0, t.index)}${s}${e.slice(t.index + r.length)}`
    )
  );
}, At = (e) => {
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
}, Mt = (e, t) => {
  const r = e.replaceAll("\\", "/");
  return G(t.replaceAll("\\", "/")).some(
    (n) => At(n).test(r)
  );
}, R = (e, t) => {
  for (let r = e.length - 1; r >= 0; r--) {
    const n = e[r];
    if (Mt(t, n[0])) return n[1];
  }
  return null;
}, Lt = (e) => e.reduce((t, r) => (t.set(r.target, [...t.get(r.target) ?? [], r]), t), /* @__PURE__ */ new Map()), Dt = (e, t, r) => r ? Promise.all(e.map(t)) : e.reduce(
  async (n, s) => [...await n, await t(s)],
  Promise.resolve([])
);
var y, d, E, S, v;
class Bt {
  constructor({
    failOnCollision: t = !0,
    parallelWriteMode: r = !0,
    writers: n = Ot,
    applyStrategy: s = new lt()
  } = {}) {
    w(this, y, []);
    w(this, d);
    w(this, E);
    w(this, S);
    w(this, v);
    x(this, E, t), x(this, S, r), x(this, d, [...n]), x(this, v, s);
  }
  registerWriter(t, r) {
    p(this, d).push([t, r]);
  }
  add(t) {
    if (!R(p(this, d), t.target))
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${t.target}'`
      );
    p(this, y).push(t);
  }
  async apply(t, r = p(this, v)) {
    const n = { failOnCollision: p(this, E) }, s = async ([c, a]) => {
      const o = R(p(this, d), c)(a, n);
      return o === null ? null : (await r.apply(c, o, t), c);
    };
    return (await Dt(
      [...Lt(p(this, y))],
      s,
      p(this, S)
    )).filter((c) => c !== null);
  }
}
y = new WeakMap(), d = new WeakMap(), E = new WeakMap(), S = new WeakMap(), v = new WeakMap();
export {
  lt as I,
  _t as P,
  gt as a,
  B as b,
  Bt as c,
  O as d,
  Ot as e,
  l,
  f as s
};
//# sourceMappingURL=patch-merger-BUeyiYse.js.map
