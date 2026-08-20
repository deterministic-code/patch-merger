import { Patch as Q, PatchMerger as X } from "./patch-merger.js";
const W = (t, n = !1) => {
  var r;
  const e = (r = t.options) == null ? void 0 : r.failIfExists;
  if (e === void 0) return n;
  if (typeof e != "boolean")
    throw new Error(
      `Patch.options.failIfExists for "${t.target}" must be a boolean`
    );
  return e;
}, I = (t, n = "") => {
  var r;
  const e = (r = t.options) == null ? void 0 : r.jsonTarget;
  if (e === void 0) return n;
  if (typeof e != "string")
    throw new Error(
      `Patch.options.jsonTarget for "${t.target}" must be a string`
    );
  return e;
}, T = (t) => {
  const n = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(t);
  return n ? `env:${n[1]}` : `line:${t}`;
}, P = (t) => t.replace(/\r\n/g, `
`).replace(/\n$/, "").split(`
`).map((n) => n.trimEnd()).filter((n) => n.length > 0), F = (t, n) => {
  const e = [], r = /* @__PURE__ */ new Map();
  for (const o of t) {
    const s = W(o);
    for (const c of P(o.content)) {
      const i = T(c), a = r.get(i);
      if (a !== void 0) {
        if (s)
          throw new Error(
            `LineUpsertWriter: line already exists in "${o.target}" (${i})`
          );
        if (n.failOnCollision && a !== c)
          throw new Error(
            `LineUpsertWriter: collision in "${o.target}" (${i})`
          );
      } else
        e.push(i);
      r.set(i, c);
    }
  }
  return e.length === 0 ? "" : `${e.map((o) => r.get(o)).join(`
`)}
`;
}, h = /^([ \t]*)(\/\/|#)\s*[—-]\s*START\s+(\S+)\s*$/, M = /^([ \t]*)(\/\/|#)\s*[—-]\s*END\s+(\S+)\s*$/, R = (t) => /\.(?:ts|tsx|js|jsx|cs|rs)$/.test(t) ? "//" : "#", U = (t) => {
  const n = t.replace(/\r\n/g, `
`).replace(/\n$/, "");
  return n.length === 0 ? [] : n.split(`
`);
}, _ = (t) => t.length === 0 ? "" : `${t.join(`
`)}
`, N = (t, n, e, r) => `${n}${t} — ${e} ${r}`, b = (t, n, e, r) => {
  for (let o = e; o < r; o++) {
    const s = h.exec(t[o] ?? "");
    if (!s || s[3] !== n) continue;
    let c = 0;
    for (let i = o + 1; i < r; i++) {
      const a = h.exec(t[i] ?? "");
      if ((a == null ? void 0 : a[3]) === n) {
        c += 1;
        continue;
      }
      const f = M.exec(t[i] ?? "");
      if ((f == null ? void 0 : f[3]) === n) {
        if (c > 0) {
          c -= 1;
          continue;
        }
        return {
          start: o,
          end: i,
          indent: s[1] ?? "",
          prefix: s[2] ?? "#"
        };
      }
    }
    throw new Error(`SectionWriter: missing END marker for "${n}"`);
  }
  return null;
}, k = (t, n, e, r) => {
  let o = 0, s = e;
  for (; s < r; ) {
    const c = h.exec(t[s] ?? "");
    if (!c) {
      s += 1;
      continue;
    }
    const i = b(t, c[3] ?? "", s, r);
    c[3] === n && (o += 1), s = i.end + 1;
  }
  return o;
}, A = (t, n, e, r) => {
  if (t.length === 0) return n;
  const [o, ...s] = t, c = A(s, n, e, r);
  return [
    N(e, r, "START", o),
    ...c,
    N(e, r, "END", o)
  ];
}, E = (t, n, e, r) => [
  ...t.slice(0, n),
  ...r,
  ...t.slice(n + e)
], z = (t) => {
  var e;
  const n = (e = t.options) == null ? void 0 : e.sections;
  if (!Array.isArray(n) || n.length === 0)
    throw new Error(
      `SectionWriter: options.sections for "${t.target}" must be a non-empty array`
    );
  if (!n.every((r) => typeof r == "string" && r.length > 0))
    throw new Error(
      `SectionWriter: options.sections for "${t.target}" must contain non-empty strings`
    );
  return n;
}, K = (t) => {
  var e;
  const n = (e = t.options) == null ? void 0 : e.appendIfNotExists;
  if (n === void 0) return "End";
  if (n === "None" || n === "End" || n === "Start") return n;
  throw new Error(
    `SectionWriter: options.appendIfNotExists for "${t.target}" must be None, End, or Start`
  );
}, Z = (t, n, e, r, o, s) => {
  if (r === "None")
    throw new Error(
      `SectionWriter: section "${s}" does not exist in "${o}"`
    );
  return n ? r === "Start" ? E(t, n.start + 1, 0, e) : E(t, n.end, 0, e) : r === "Start" ? [...e, ...t] : [...t, ...e];
}, V = (t, n) => {
  let e = [];
  const r = /* @__PURE__ */ new Map();
  for (const o of t) {
    const s = z(o), c = W(o), i = K(o), a = s.join("/"), f = r.get(a);
    if (f !== void 0) {
      if (c)
        throw new Error(
          `SectionWriter: section "${a}" already exists in "${o.target}"`
        );
      if (n.failOnCollision && f !== o.content)
        throw new Error(
          `SectionWriter: collision in "${o.target}" section "${a}"`
        );
    }
    r.set(a, o.content);
    const $ = R(o.target), x = U(o.content);
    let d = 0, g = e.length, u = null;
    for (let p = 0; p < s.length; p++) {
      const w = s[p], j = s.slice(p), O = k(e, w, d, g);
      if (n.failOnCollision && O > 1)
        throw new Error(
          `SectionWriter: collision: duplicate section "${w}" in "${o.target}"`
        );
      const l = b(e, w, d, g), m = p === s.length - 1;
      if (!l) {
        const D = (u == null ? void 0 : u.indent) ?? "", L = A(j, x, $, D);
        e = Z(
          e,
          u,
          L,
          i,
          o.target,
          j.join("/")
        );
        break;
      }
      if (m) {
        if (c)
          throw new Error(
            `SectionWriter: section "${a}" already exists in "${o.target}"`
          );
        e = E(
          e,
          l.start + 1,
          l.end - l.start - 1,
          x
        );
        break;
      }
      u = l, d = l.start + 1, g = l.end;
    }
  }
  return _(e);
}, S = (t) => t !== null && typeof t == "object" && !Array.isArray(t), B = (t) => t.split("/").filter((n) => n.length > 0), C = (t) => {
  try {
    return JSON.parse(t.content);
  } catch (n) {
    throw new Error(
      `DeepJsonWriter: invalid JSON for "${t.target}": ${String(n)}`
    );
  }
}, v = (t, n, e) => {
  if (S(t)) return t;
  throw new Error(
    `DeepJsonWriter: path "/${e.join("/")}" in "${n}" is not an object`
  );
}, y = (t, n, e, r, o, s) => {
  if (t === void 0) return n;
  if (S(t) && S(n))
    return Object.keys(n).reduce(
      (c, i) => ({
        ...c,
        [i]: y(
          t[i],
          n[i],
          e,
          [...r, i],
          o,
          s
        )
      }),
      { ...t }
    );
  if (o)
    throw new Error(
      `DeepJsonWriter: value already exists at "/${r.join("/")}" in "${e}"`
    );
  if (s && JSON.stringify(t) !== JSON.stringify(n))
    throw new Error(
      `DeepJsonWriter: collision at "/${r.join("/")}" in "${e}"`
    );
  return n;
}, J = (t, n, e, r, o, s, c = []) => {
  const [i, ...a] = n;
  if (i === void 0)
    return v(
      y(t, e, r, c, o, s),
      r,
      c
    );
  const f = [...c, i];
  if (a.length === 0)
    return {
      ...t,
      [i]: y(
        t[i],
        e,
        r,
        f,
        o,
        s
      )
    };
  const $ = t[i] === void 0 ? {} : v(t[i], r, f);
  return {
    ...t,
    [i]: J(
      $,
      a,
      e,
      r,
      o,
      s,
      f
    )
  };
}, q = (t, { failOnCollision: n }) => {
  const e = t.reduce((r, o) => {
    const s = W(o);
    return J(
      r ?? {},
      B(I(o)),
      C(o),
      o.target,
      s,
      n
    );
  }, void 0);
  return `${JSON.stringify(e ?? {}, null, 2)}
`;
};
export {
  q as DeepJsonWriter,
  F as LineUpsertWriter,
  Q as Patch,
  X as PatchMerger,
  V as SectionWriter,
  q as deepJsonWriter,
  F as lineUpsertWriter,
  V as sectionWriter
};
//# sourceMappingURL=index.js.map
