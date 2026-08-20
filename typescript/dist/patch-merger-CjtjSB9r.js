var nt = Object.defineProperty;
var C = (e) => {
  throw TypeError(e);
};
var st = (e, t, r) => t in e ? nt(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var W = (e, t, r) => st(e, typeof t != "symbol" ? t + "" : t, r), M = (e, t, r) => t.has(e) || C("Cannot " + r);
var p = (e, t, r) => (M(e, t, "read from private field"), r ? r.call(e) : t.get(e)), d = (e, t, r) => t.has(e) ? C("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), E = (e, t, r, n) => (M(e, t, "write to private field"), n ? n.call(e, r) : t.set(e, r), r), R = (e, t, r) => (M(e, t, "access private method"), r);
import { mkdir as ot, writeFile as it } from "node:fs/promises";
import { join as ct, dirname as at } from "node:path";
import { XMLParser as lt, XMLBuilder as ft, XMLValidator as ut } from "fast-xml-parser";
import { parse as pt, stringify as gt } from "yaml";
class Gt {
  constructor({
    target: t,
    content: r,
    options: n
  }) {
    W(this, "target");
    W(this, "content");
    W(this, "options");
    if (r.length === 0)
      throw new Error(
        `Patch: content for "${t}" must be a non-empty string`
      );
    this.target = t, this.content = r, n !== void 0 && (this.options = Object.freeze({ ...n })), Object.freeze(this);
  }
}
var $, N, Y;
class ht {
  constructor() {
    d(this, N);
    d(this, $, /* @__PURE__ */ new Map());
  }
  async apply(t, r, n) {
    const s = ct(n, t);
    await R(this, N, Y).call(this, at(s)), await it(s, r, "utf8");
  }
}
$ = new WeakMap(), N = new WeakSet(), Y = function(t) {
  const r = p(this, $).get(t);
  if (r) return r;
  const n = ot(t, { recursive: !0 }).then(
    () => {
    },
    (s) => {
      throw p(this, $).delete(t), s;
    }
  );
  return p(this, $).set(t, n), n;
};
const T = (e, t = !1) => {
  var n;
  const r = (n = e.options) == null ? void 0 : n.failIfExists;
  if (r === void 0) return t;
  if (typeof r != "boolean")
    throw new Error(
      `Patch.options.failIfExists for "${e.target}" must be a boolean`
    );
  return r;
}, dt = (e, t = "") => {
  var n;
  const r = (n = e.options) == null ? void 0 : n.jsonTarget;
  if (r === void 0) return t;
  if (typeof r != "string")
    throw new Error(
      `Patch.options.jsonTarget for "${e.target}" must be a string`
    );
  return r;
}, P = (e) => e !== null && typeof e == "object" && !Array.isArray(e), wt = (e) => e.split("/").filter((t) => t.length > 0), B = (e, t, r, n) => {
  if (P(e)) return e;
  throw new Error(
    `${t}: path "/${n.join("/")}" in "${r}" is not an object`
  );
}, D = (e, t, r, n, s, o, c) => {
  if (e === void 0) return t;
  if (P(e) && P(t)) {
    for (const a of Object.keys(t))
      e[a] = D(
        e[a],
        t[a],
        r,
        n,
        [...s, a],
        o,
        c
      );
    return e;
  }
  if (o)
    throw new Error(
      `${r}: value already exists at "/${s.join("/")}" in "${n}"`
    );
  if (c && JSON.stringify(e) !== JSON.stringify(t))
    throw new Error(
      `${r}: collision at "/${s.join("/")}" in "${n}"`
    );
  return t;
}, q = (e, t, r, n, s, o, c, a = []) => {
  const [i, ...f] = t;
  if (i === void 0)
    return B(
      D(
        e,
        r,
        n,
        s,
        a,
        o,
        c
      ),
      n,
      s,
      a
    );
  const g = [...a, i];
  if (f.length === 0)
    return e[i] = D(
      e[i],
      r,
      n,
      s,
      g,
      o,
      c
    ), e;
  const b = e[i] === void 0 ? {} : B(e[i], n, s, g);
  return e[i] = q(
    b,
    f,
    r,
    n,
    s,
    o,
    c,
    g
  ), e;
}, X = ({
  name: e,
  parse: t,
  stringify: r
}) => (s, { failOnCollision: o }) => {
  const c = s.reduce((a, i) => {
    const f = T(i);
    return q(
      a ?? {},
      wt(dt(i)),
      t(i.content, i.target),
      e,
      i.target,
      f,
      o
    );
  }, void 0);
  return r(c ?? {});
}, L = X({
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
}), mt = new lt({
  ignoreAttributes: !1,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: !0,
  parseTagValue: !0,
  parseAttributeValue: !0,
  trimValues: !0
}), $t = new ft({
  ignoreAttributes: !1,
  attributeNamePrefix: "@_",
  format: !0,
  indentBy: "  ",
  suppressEmptyNode: !0
}), xt = X({
  name: "DeepXmlWriter",
  parse: (e, t) => {
    const r = ut.validate(e);
    if (r !== !0)
      throw new Error(
        `DeepXmlWriter: invalid XML for "${t}": ${r.err.msg}`
      );
    return JSON.parse(JSON.stringify(mt.parse(e)));
  },
  stringify: (e) => {
    const t = String($t.build(e)).replace(/\s+$/u, "");
    return t.length === 0 ? `
` : `${t}
`;
  }
}), z = X({
  name: "DeepYamlWriter",
  parse: (e, t) => {
    try {
      const r = pt(e) ?? {};
      return JSON.parse(JSON.stringify(r));
    } catch (r) {
      throw new Error(
        `DeepYamlWriter: invalid YAML for "${t}": ${String(r)}`
      );
    }
  },
  stringify: (e) => `${gt(e, { indent: 2 }).replace(/\s+$/u, "")}
`
}), yt = (e) => {
  const t = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(e);
  return t ? `env:${t[1]}` : `line:${e}`;
}, Et = (e) => e.replace(/\r\n/g, `
`).replace(/\n$/, "").split(`
`).map((t) => t.trimEnd()).filter((t) => t.length > 0), l = (e, t) => {
  const r = [], n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = T(s);
    for (const c of Et(s.content)) {
      const a = yt(c), i = n.get(a);
      if (i !== void 0) {
        if (o)
          throw new Error(
            `LineUpsertWriter: line already exists in "${s.target}" (${a})`
          );
        if (t.failOnCollision && i !== c)
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
}, I = /^([ \t]*)(<!--|\/\/|\/\*|#|--)\s*(?:[—-]\s*START|={3}\s*BEGIN)\s+(\S+)(?:\s.*)?$/, St = /^([ \t]*)(<!--|\/\/|\/\*|#|--)\s*(?:[—-]\s*END|={3}\s*END)\s+(\S+)\s*(?:={3})?\s*(?:\*\/|-->)?\s*$/, vt = /* @__PURE__ */ new Set([
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
]), jt = /* @__PURE__ */ new Set(["css", "scss", "sass", "less"]), bt = /* @__PURE__ */ new Set([
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
]), Wt = /* @__PURE__ */ new Set([
  "Dockerfile",
  "Makefile",
  "makefile",
  "GNUmakefile",
  "Justfile",
  "justfile",
  "CMakeLists.txt"
]), Nt = (e) => {
  const t = Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\"));
  return e.slice(t + 1);
}, kt = (e) => {
  const t = Nt(e);
  if (Wt.has(t) || t.startsWith("Dockerfile."))
    return { open: "#", close: "" };
  const r = t.lastIndexOf("."), n = r > 0 ? t.slice(r + 1).toLowerCase() : "";
  return vt.has(n) ? { open: "<!--", close: " -->" } : jt.has(n) ? { open: "/*", close: " */" } : bt.has(n) ? { open: "//", close: "" } : { open: "#", close: "" };
}, U = (e) => {
  const t = e.replace(/\r\n/g, `
`).replace(/\n$/, "");
  return t.length === 0 ? [] : t.split(`
`);
}, Ot = (e) => e.length === 0 ? "" : `${e.join(`
`)}
`, G = (e, t, r, n) => `${t}${e.open} — ${r} ${n}${e.close}`, F = (e, t, r, n) => {
  for (let s = r; s < n; s++) {
    const o = I.exec(e[s] ?? "");
    if (!o || o[3] !== t) continue;
    let c = 0;
    for (let a = s + 1; a < n; a++) {
      const i = I.exec(e[a] ?? "");
      if ((i == null ? void 0 : i[3]) === t) {
        c += 1;
        continue;
      }
      const f = St.exec(e[a] ?? "");
      if ((f == null ? void 0 : f[3]) === t) {
        if (c > 0) {
          c -= 1;
          continue;
        }
        return {
          start: s,
          end: a,
          indent: o[1] ?? ""
        };
      }
    }
    throw new Error(`SectionWriter: missing END marker for "${t}"`);
  }
  return null;
}, At = (e, t, r, n) => {
  let s = 0, o = r;
  for (; o < n; ) {
    const c = I.exec(e[o] ?? "");
    if (!c) {
      o += 1;
      continue;
    }
    const a = F(e, c[3] ?? "", o, n);
    c[3] === t && (s += 1), o = a.end + 1;
  }
  return s;
}, H = (e, t, r, n) => {
  if (e.length === 0) return t;
  const [s, ...o] = e, c = H(o, t, r, n);
  return [
    G(r, n, "START", s),
    ...c,
    G(r, n, "END", s)
  ];
}, J = (e, t, r, n) => [
  ...e.slice(0, t),
  ...n,
  ...e.slice(t + r)
], Mt = (e) => {
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
}, Lt = (e) => {
  var r;
  const t = (r = e.options) == null ? void 0 : r.appendIfNotExists;
  if (t === void 0) return "End";
  if (t === "None" || t === "End" || t === "Start") return t;
  throw new Error(
    `SectionWriter: options.appendIfNotExists for "${e.target}" must be None, End, or Start`
  );
}, Pt = (e, t, r, n, s, o) => {
  if (n === "None")
    throw new Error(
      `SectionWriter: section "${o}" does not exist in "${s}"`
    );
  return t ? n === "Start" ? J(e, t.start + 1, 0, r) : J(e, t.end, 0, r) : n === "Start" ? [...r, ...e] : [...e, ...r];
}, u = (e, t) => {
  let r = [];
  const n = /* @__PURE__ */ new Map();
  for (const s of e) {
    const o = Mt(s), c = T(s);
    if (o === void 0) {
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
      n.clear(), n.set("", s.content), r = U(s.content);
      continue;
    }
    const a = Lt(s), i = o.join("/"), f = n.get(i);
    if (f !== void 0) {
      if (c)
        throw new Error(
          `SectionWriter: section "${i}" already exists in "${s.target}"`
        );
      if (t.failOnCollision && f !== s.content)
        throw new Error(
          `SectionWriter: collision in "${s.target}" section "${i}"`
        );
    }
    n.set(i, s.content);
    const g = kt(s.target), b = U(s.content);
    let k = 0, O = r.length, y = null;
    for (let h = 0; h < o.length; h++) {
      const A = o[h], _ = o.slice(h), Q = At(r, A, k, O);
      if (t.failOnCollision && Q > 1)
        throw new Error(
          `SectionWriter: collision: duplicate section "${A}" in "${s.target}"`
        );
      const w = F(r, A, k, O), tt = h === o.length - 1;
      if (!w) {
        const et = (y == null ? void 0 : y.indent) ?? "", rt = H(_, b, g, et);
        r = Pt(
          r,
          y,
          rt,
          a,
          s.target,
          _.join("/")
        );
        break;
      }
      if (tt) {
        if (c)
          throw new Error(
            `SectionWriter: section "${i}" already exists in "${s.target}"`
          );
        r = J(
          r,
          w.start + 1,
          w.end - w.start - 1,
          b
        );
        break;
      }
      y = w, k = w.start + 1, O = w.end;
    }
  }
  return Ot(r);
}, Dt = [
  ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}", u],
  ["**/*.{cs,csx,fs,fsx,vb}", u],
  ["**/*.rs", u],
  ["**/*.{go,java,kt,kts,scala,groovy,gradle}", u],
  ["**/*.{c,cc,cpp,cxx,h,hh,hpp,hxx,m,mm}", u],
  ["**/*.{swift,php}", u],
  ["**/*.{py,rb,pl,pm,r,jl}", u],
  ["**/*.{sh,bash,zsh,ksh,fish}", u],
  ["**/*.toml", u],
  ["**/*.{csproj,fsproj,vbproj,props,targets,nuspec}", u],
  ["**/*.{html,htm,vue,svelte,astro}", u],
  ["**/*.{css,scss,sass,less}", u],
  ["**/*.{sql,graphql,gql}", u],
  ["**/*.{cmake,mk,md}", u],
  [
    "**/{Dockerfile,Dockerfile.*,Makefile,makefile,GNUmakefile,Justfile,justfile,CMakeLists.txt}",
    u
  ],
  ["**/*.json", L],
  ["**/*.jsonc", L],
  ["**/*.json5", L],
  ["**/*.yml", z],
  ["**/*.yaml", z],
  ["**/*.xml", xt],
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
], K = (e) => {
  const t = /\{([^{}]+)\}/.exec(e);
  if (!t || t.index === void 0) return [e];
  const r = t[0];
  return t[1].split(",").flatMap(
    (s) => K(
      `${e.slice(0, t.index)}${s}${e.slice(t.index + r.length)}`
    )
  );
}, It = (e) => {
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
}, V = /* @__PURE__ */ new Map(), Z = (e) => {
  const t = e.replaceAll("\\", "/"), r = V.get(t);
  if (r) return r;
  const n = K(t).map((s) => It(s));
  return V.set(t, n), n;
}, Jt = 32, Tt = (e) => [...e].map(([t, r]) => ({
  regexes: Z(t),
  writer: r
})), Xt = (e, t) => {
  const r = t.replaceAll("\\", "/");
  for (let n = e.length - 1; n >= 0; n--) {
    const s = e[n];
    if (s.regexes.some((o) => o.test(r))) return s.writer;
  }
  return null;
}, _t = async (e, t, r, n) => {
  t.count >= n ? await new Promise((s) => {
    r.push(s);
  }) : t.count += 1;
  try {
    await e();
  } finally {
    const s = r.shift();
    s ? s() : t.count -= 1;
  }
};
var m, x, S, v, j;
class Vt {
  constructor({
    failOnCollision: t = !0,
    parallelWriteMode: r = !0,
    writers: n = Dt,
    applyStrategy: s = new ht()
  } = {}) {
    d(this, m, /* @__PURE__ */ new Map());
    d(this, x);
    d(this, S);
    d(this, v);
    d(this, j);
    E(this, S, t), E(this, v, r), E(this, x, Tt(n)), E(this, j, s);
  }
  registerWriter(t, r) {
    p(this, x).push({ regexes: Z(t), writer: r });
  }
  add(t) {
    const r = Xt(p(this, x), t.target);
    if (!r)
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${t.target}'`
      );
    const n = p(this, m).get(t.target);
    if (n) {
      n.writer = r, n.patches.push(t);
      return;
    }
    p(this, m).set(t.target, { writer: r, patches: [t] });
  }
  async apply(t, r = p(this, j)) {
    const n = { failOnCollision: p(this, S) }, s = [];
    if (!p(this, v)) {
      for (const [i, f] of p(this, m)) {
        const g = f.writer(f.patches, n);
        g !== null && (await r.apply(i, g, t), s.push(i));
      }
      return s;
    }
    const o = [], c = { count: 0 }, a = [];
    for (const [i, f] of p(this, m)) {
      const g = f.writer(f.patches, n);
      g !== null && (s.push(i), o.push(
        _t(
          () => r.apply(i, g, t),
          c,
          a,
          Jt
        )
      ));
    }
    return await Promise.all(o), s;
  }
}
m = new WeakMap(), x = new WeakMap(), S = new WeakMap(), v = new WeakMap(), j = new WeakMap();
export {
  ht as I,
  Gt as P,
  xt as a,
  z as b,
  Vt as c,
  L as d,
  Dt as e,
  l,
  u as s
};
//# sourceMappingURL=patch-merger-CjtjSB9r.js.map
