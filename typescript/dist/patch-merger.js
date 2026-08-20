var O = Object.defineProperty;
var m = (e) => {
  throw TypeError(e);
};
var M = (e, t, r) => t in e ? O(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r;
var f = (e, t, r) => M(e, typeof t != "symbol" ? t + "" : t, r), p = (e, t, r) => t.has(e) || m("Cannot " + r);
var s = (e, t, r) => (p(e, t, "read from private field"), r ? r.call(e) : t.get(e)), n = (e, t, r) => t.has(e) ? m("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), w = (e, t, r, i) => (p(e, t, "write to private field"), i ? i.call(e, r) : t.set(e, r), r);
import { mkdir as W, writeFile as x } from "node:fs/promises";
import { join as j, dirname as v } from "node:path";
class $ {
  constructor({
    target: t,
    content: r,
    options: i
  }) {
    f(this, "target");
    f(this, "content");
    f(this, "options");
    if (r.length === 0)
      throw new Error(
        `Patch: content for "${t}" must be a non-empty string`
      );
    this.target = t, this.content = r, i !== void 0 && (this.options = Object.freeze({ ...i })), Object.freeze(this);
  }
}
const F = async (e, t) => {
  await W(v(e), { recursive: !0 }), await x(e, t, "utf8");
}, P = (e, t) => {
  const r = t.slice(t.lastIndexOf("/") + 1), i = r.lastIndexOf(".");
  return e.get(r) ?? e.get(i > 0 ? r.slice(i) : "") ?? null;
}, b = (e) => e.reduce((t, r) => (t.set(r.target, [...t.get(r.target) ?? [], r]), t), /* @__PURE__ */ new Map()), z = (e, t, r) => r ? Promise.all(e.map(t)) : e.reduce(
  async (i, d) => [...await i, await t(d)],
  Promise.resolve([])
);
var c, o, l, u, h;
class k {
  constructor({
    failOnCollision: t = !0,
    parallelWriteMode: r = !0,
    fileWriter: i = F
  } = {}) {
    n(this, c, []);
    n(this, o, /* @__PURE__ */ new Map());
    n(this, l);
    n(this, u);
    n(this, h);
    w(this, l, t), w(this, u, r), w(this, h, i);
  }
  registerWriter(t, r) {
    s(this, o).set(t, r);
  }
  add(t) {
    if (!P(s(this, o), t.target))
      throw new Error(
        `PatchMerger.add: no PatchWriter for target '${t.target}'`
      );
    s(this, c).push(t);
  }
  async apply(t) {
    const r = { failOnCollision: s(this, l) }, i = async ([a, y]) => {
      const g = P(s(this, o), a)(y, r);
      return g === null ? null : (await s(this, h).call(this, j(t, a), g), a);
    };
    return (await z(
      [...b(s(this, c))],
      i,
      s(this, u)
    )).filter((a) => a !== null);
  }
}
c = new WeakMap(), o = new WeakMap(), l = new WeakMap(), u = new WeakMap(), h = new WeakMap();
export {
  $ as Patch,
  k as PatchMerger
};
//# sourceMappingURL=patch-merger.js.map
