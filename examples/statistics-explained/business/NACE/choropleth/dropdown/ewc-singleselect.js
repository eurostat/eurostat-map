//beta 1.0.10
function m(r, t, e, o) {
  var i = arguments.length, s = i < 3 ? t : o === null ? o = Object.getOwnPropertyDescriptor(t, e) : o, n;
  if (typeof Reflect == "object" && typeof Reflect.decorate == "function") s = Reflect.decorate(r, t, e, o);
  else for (var c = r.length - 1; c >= 0; c--) (n = r[c]) && (s = (i < 3 ? n(s) : i > 3 ? n(t, e, s) : n(t, e)) || s);
  return i > 3 && s && Object.defineProperty(t, e, s), s;
}
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const W = globalThis, Q = W.ShadowRoot && (W.ShadyCSS === void 0 || W.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, $t = Symbol(), ht = /* @__PURE__ */ new WeakMap();
let Ot = class {
  constructor(t, e, o) {
    if (this._$cssResult$ = !0, o !== $t) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (Q && t === void 0) {
      const o = e !== void 0 && e.length === 1;
      o && (t = ht.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), o && ht.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const Ct = (r) => new Ot(typeof r == "string" ? r : r + "", void 0, $t), Rt = (r, t) => {
  if (Q) r.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const o = document.createElement("style"), i = W.litNonce;
    i !== void 0 && o.setAttribute("nonce", i), o.textContent = e.cssText, r.appendChild(o);
  }
}, pt = Q ? (r) => r : (r) => r instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const o of t.cssRules) e += o.cssText;
  return Ct(e);
})(r) : r;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: Pt, defineProperty: zt, getOwnPropertyDescriptor: Ut, getOwnPropertyNames: It, getOwnPropertySymbols: Tt, getPrototypeOf: Ht } = Object, E = globalThis, ut = E.trustedTypes, Mt = ut ? ut.emptyScript : "", J = E.reactiveElementPolyfillSupport, M = (r, t) => r, F = {
  toAttribute(r, t) {
    switch (t) {
      case Boolean:
        r = r ? Mt : null;
        break;
      case Object:
      case Array:
        r = r == null ? r : JSON.stringify(r);
    }
    return r;
  }, fromAttribute(r, t) {
    let e = r;
    switch (t) {
      case Boolean:
        e = r !== null;
        break;
      case Number:
        e = r === null ? null : Number(r);
        break;
      case Object:
      case Array:
        try {
          e = JSON.parse(r);
        } catch {
          e = null;
        }
    }
    return e;
  }
}, tt = (r, t) => !Pt(r, t), wt = { attribute: !0, type: String, converter: F, reflect: !1, hasChanged: tt };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), E.litPropertyMetadata ?? (E.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
class U extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = wt) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.elementProperties.set(t, e), !e.noAccessor) {
      const o = Symbol(), i = this.getPropertyDescriptor(t, o, e);
      i !== void 0 && zt(this.prototype, t, i);
    }
  }
  static getPropertyDescriptor(t, e, o) {
    const { get: i, set: s } = Ut(this.prototype, t) ?? {
      get() {
        return this[e];
      }, set(n) {
        this[e] = n;
      }
    };
    return {
      get() {
        return i == null ? void 0 : i.call(this);
      }, set(n) {
        const c = i == null ? void 0 : i.call(this);
        s.call(this, n), this.requestUpdate(t, c, o);
      }, configurable: !0, enumerable: !0
    };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? wt;
  }
  static _$Ei() {
    if (this.hasOwnProperty(M("elementProperties"))) return;
    const t = Ht(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(M("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(M("properties"))) {
      const e = this.properties, o = [...It(e), ...Tt(e)];
      for (const i of o) this.createProperty(i, e[i]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [o, i] of e) this.elementProperties.set(o, i);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, o] of this.elementProperties) {
      const i = this._$Eu(e, o);
      i !== void 0 && this._$Eh.set(i, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const o = new Set(t.flat(1 / 0).reverse());
      for (const i of o) e.unshift(pt(i));
    } else t !== void 0 && e.push(pt(t));
    return e;
  }
  static _$Eu(t, e) {
    const o = e.attribute;
    return o === !1 ? void 0 : typeof o == "string" ? o : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const o of e.keys()) this.hasOwnProperty(o) && (t.set(o, this[o]), delete this[o]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return Rt(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var o;
      return (o = e.hostConnected) == null ? void 0 : o.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var o;
      return (o = e.hostDisconnected) == null ? void 0 : o.call(e);
    });
  }
  attributeChangedCallback(t, e, o) {
    this._$AK(t, o);
  }
  _$EC(t, e) {
    var s;
    const o = this.constructor.elementProperties.get(t), i = this.constructor._$Eu(t, o);
    if (i !== void 0 && o.reflect === !0) {
      const n = (((s = o.converter) == null ? void 0 : s.toAttribute) !== void 0 ? o.converter : F).toAttribute(e, o.type);
      this._$Em = t, n == null ? this.removeAttribute(i) : this.setAttribute(i, n), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var s;
    const o = this.constructor, i = o._$Eh.get(t);
    if (i !== void 0 && this._$Em !== i) {
      const n = o.getPropertyOptions(i), c = typeof n.converter == "function" ? { fromAttribute: n.converter } : ((s = n.converter) == null ? void 0 : s.fromAttribute) !== void 0 ? n.converter : F;
      this._$Em = i, this[i] = c.fromAttribute(e, n.type), this._$Em = null;
    }
  }
  requestUpdate(t, e, o) {
    if (t !== void 0) {
      if (o ?? (o = this.constructor.getPropertyOptions(t)), !(o.hasChanged ?? tt)(this[t], e)) return;
      this.P(t, e, o);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$ET());
  }
  P(t, e, o) {
    this._$AL.has(t) || this._$AL.set(t, e), o.reflect === !0 && this._$Em !== t && (this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Set())).add(t);
  }
  async _$ET() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var o;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [s, n] of this._$Ep) this[s] = n;
        this._$Ep = void 0;
      }
      const i = this.constructor.elementProperties;
      if (i.size > 0) for (const [s, n] of i) n.wrapped !== !0 || this._$AL.has(s) || this[s] === void 0 || this.P(s, this[s], n);
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (o = this._$EO) == null || o.forEach((i) => {
        var s;
        return (s = i.hostUpdate) == null ? void 0 : s.call(i);
      }), this.update(e)) : this._$EU();
    } catch (i) {
      throw t = !1, this._$EU(), i;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((o) => {
      var i;
      return (i = o.hostUpdated) == null ? void 0 : i.call(o);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EU() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Ej && (this._$Ej = this._$Ej.forEach((e) => this._$EC(e, this[e]))), this._$EU();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
}
U.elementStyles = [], U.shadowRootOptions = { mode: "open" }, U[M("elementProperties")] = /* @__PURE__ */ new Map(), U[M("finalized")] = /* @__PURE__ */ new Map(), J == null || J({ ReactiveElement: U }), (E.reactiveElementVersions ?? (E.reactiveElementVersions = [])).push("2.0.4");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const D = globalThis, V = D.trustedTypes, ft = V ? V.createPolicy("lit-html", { createHTML: (r) => r }) : void 0, _t = "$lit$", S = `lit$${Math.random().toFixed(9).slice(2)}$`, kt = "?" + S, Dt = `<${kt}>`, z = document, j = () => z.createComment(""), L = (r) => r === null || typeof r != "object" && typeof r != "function", et = Array.isArray, Nt = (r) => et(r) || typeof (r == null ? void 0 : r[Symbol.iterator]) == "function", Y = `[ 	
\f\r]`, H = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, gt = /-->/g, bt = />/g, R = RegExp(`>|${Y}(?:([^\\s"'>=/]+)(${Y}*=${Y}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), mt = /'/g, vt = /"/g, At = /^(?:script|style|textarea|title)$/i, jt = (r) => (t, ...e) => ({ _$litType$: r, strings: t, values: e }), A = jt(1), I = Symbol.for("lit-noChange"), f = Symbol.for("lit-nothing"), yt = /* @__PURE__ */ new WeakMap(), P = z.createTreeWalker(z, 129);
function St(r, t) {
  if (!et(r) || !r.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return ft !== void 0 ? ft.createHTML(t) : t;
}
const Lt = (r, t) => {
  const e = r.length - 1, o = [];
  let i, s = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", n = H;
  for (let c = 0; c < e; c++) {
    const a = r[c];
    let d, u, h = -1, x = 0;
    for (; x < a.length && (n.lastIndex = x, u = n.exec(a), u !== null);) x = n.lastIndex, n === H ? u[1] === "!--" ? n = gt : u[1] !== void 0 ? n = bt : u[2] !== void 0 ? (At.test(u[2]) && (i = RegExp("</" + u[2], "g")), n = R) : u[3] !== void 0 && (n = R) : n === R ? u[0] === ">" ? (n = i ?? H, h = -1) : u[1] === void 0 ? h = -2 : (h = n.lastIndex - u[2].length, d = u[1], n = u[3] === void 0 ? R : u[3] === '"' ? vt : mt) : n === vt || n === mt ? n = R : n === gt || n === bt ? n = H : (n = R, i = void 0);
    const $ = n === R && r[c + 1].startsWith("/>") ? " " : "";
    s += n === H ? a + Dt : h >= 0 ? (o.push(d), a.slice(0, h) + _t + a.slice(h) + S + $) : a + S + (h === -2 ? c : $);
  }
  return [St(r, s + (r[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), o];
};
class q {
  constructor({ strings: t, _$litType$: e }, o) {
    let i;
    this.parts = [];
    let s = 0, n = 0;
    const c = t.length - 1, a = this.parts, [d, u] = Lt(t, e);
    if (this.el = q.createElement(d, o), P.currentNode = this.el.content, e === 2 || e === 3) {
      const h = this.el.content.firstChild;
      h.replaceWith(...h.childNodes);
    }
    for (; (i = P.nextNode()) !== null && a.length < c;) {
      if (i.nodeType === 1) {
        if (i.hasAttributes()) for (const h of i.getAttributeNames()) if (h.endsWith(_t)) {
          const x = u[n++], $ = i.getAttribute(h).split(S), C = /([.?@])?(.*)/.exec(x);
          a.push({ type: 1, index: s, name: C[2], strings: $, ctor: C[1] === "." ? Bt : C[1] === "?" ? Wt : C[1] === "@" ? Ft : K }), i.removeAttribute(h);
        } else h.startsWith(S) && (a.push({ type: 6, index: s }), i.removeAttribute(h));
        if (At.test(i.tagName)) {
          const h = i.textContent.split(S), x = h.length - 1;
          if (x > 0) {
            i.textContent = V ? V.emptyScript : "";
            for (let $ = 0; $ < x; $++) i.append(h[$], j()), P.nextNode(), a.push({ type: 2, index: ++s });
            i.append(h[x], j());
          }
        }
      } else if (i.nodeType === 8) if (i.data === kt) a.push({ type: 2, index: s });
      else {
        let h = -1;
        for (; (h = i.data.indexOf(S, h + 1)) !== -1;) a.push({ type: 7, index: s }), h += S.length - 1;
      }
      s++;
    }
  }
  static createElement(t, e) {
    const o = z.createElement("template");
    return o.innerHTML = t, o;
  }
}
function T(r, t, e = r, o) {
  var n, c;
  if (t === I) return t;
  let i = o !== void 0 ? (n = e.o) == null ? void 0 : n[o] : e.l;
  const s = L(t) ? void 0 : t._$litDirective$;
  return (i == null ? void 0 : i.constructor) !== s && ((c = i == null ? void 0 : i._$AO) == null || c.call(i, !1), s === void 0 ? i = void 0 : (i = new s(r), i._$AT(r, e, o)), o !== void 0 ? (e.o ?? (e.o = []))[o] = i : e.l = i), i !== void 0 && (t = T(r, i._$AS(r, t.values), i, o)), t;
}
class qt {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: o } = this._$AD, i = ((t == null ? void 0 : t.creationScope) ?? z).importNode(e, !0);
    P.currentNode = i;
    let s = P.nextNode(), n = 0, c = 0, a = o[0];
    for (; a !== void 0;) {
      if (n === a.index) {
        let d;
        a.type === 2 ? d = new B(s, s.nextSibling, this, t) : a.type === 1 ? d = new a.ctor(s, a.name, a.strings, this, t) : a.type === 6 && (d = new Vt(s, this, t)), this._$AV.push(d), a = o[++c];
      }
      n !== (a == null ? void 0 : a.index) && (s = P.nextNode(), n++);
    }
    return P.currentNode = z, i;
  }
  p(t) {
    let e = 0;
    for (const o of this._$AV) o !== void 0 && (o.strings !== void 0 ? (o._$AI(t, o, e), e += o.strings.length - 2) : o._$AI(t[e])), e++;
  }
}
class B {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this.v;
  }
  constructor(t, e, o, i) {
    this.type = 2, this._$AH = f, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = o, this.options = i, this.v = (i == null ? void 0 : i.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = T(this, t, e), L(t) ? t === f || t == null || t === "" ? (this._$AH !== f && this._$AR(), this._$AH = f) : t !== this._$AH && t !== I && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Nt(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== f && L(this._$AH) ? this._$AA.nextSibling.data = t : this.T(z.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var s;
    const { values: e, _$litType$: o } = t, i = typeof o == "number" ? this._$AC(t) : (o.el === void 0 && (o.el = q.createElement(St(o.h, o.h[0]), this.options)), o);
    if (((s = this._$AH) == null ? void 0 : s._$AD) === i) this._$AH.p(e);
    else {
      const n = new qt(i, this), c = n.u(this.options);
      n.p(e), this.T(c), this._$AH = n;
    }
  }
  _$AC(t) {
    let e = yt.get(t.strings);
    return e === void 0 && yt.set(t.strings, e = new q(t)), e;
  }
  k(t) {
    et(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let o, i = 0;
    for (const s of t) i === e.length ? e.push(o = new B(this.O(j()), this.O(j()), this, this.options)) : o = e[i], o._$AI(s), i++;
    i < e.length && (this._$AR(o && o._$AB.nextSibling, i), e.length = i);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var o;
    for ((o = this._$AP) == null ? void 0 : o.call(this, !1, !0, e); t && t !== this._$AB;) {
      const i = t.nextSibling;
      t.remove(), t = i;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this.v = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class K {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, o, i, s) {
    this.type = 1, this._$AH = f, this._$AN = void 0, this.element = t, this.name = e, this._$AM = i, this.options = s, o.length > 2 || o[0] !== "" || o[1] !== "" ? (this._$AH = Array(o.length - 1).fill(new String()), this.strings = o) : this._$AH = f;
  }
  _$AI(t, e = this, o, i) {
    const s = this.strings;
    let n = !1;
    if (s === void 0) t = T(this, t, e, 0), n = !L(t) || t !== this._$AH && t !== I, n && (this._$AH = t);
    else {
      const c = t;
      let a, d;
      for (t = s[0], a = 0; a < s.length - 1; a++) d = T(this, c[o + a], e, a), d === I && (d = this._$AH[a]), n || (n = !L(d) || d !== this._$AH[a]), d === f ? t = f : t !== f && (t += (d ?? "") + s[a + 1]), this._$AH[a] = d;
    }
    n && !i && this.j(t);
  }
  j(t) {
    t === f ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Bt extends K {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === f ? void 0 : t;
  }
}
class Wt extends K {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== f);
  }
}
class Ft extends K {
  constructor(t, e, o, i, s) {
    super(t, e, o, i, s), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = T(this, t, e, 0) ?? f) === I) return;
    const o = this._$AH, i = t === f && o !== f || t.capture !== o.capture || t.once !== o.once || t.passive !== o.passive, s = t !== f && (o === f || i);
    i && this.element.removeEventListener(this.name, this, o), s && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class Vt {
  constructor(t, e, o) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = o;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    T(this, t);
  }
}
const G = D.litHtmlPolyfillSupport;
G == null || G(q, B), (D.litHtmlVersions ?? (D.litHtmlVersions = [])).push("3.2.0");
const Kt = (r, t, e) => {
  const o = (e == null ? void 0 : e.renderBefore) ?? t;
  let i = o._$litPart$;
  if (i === void 0) {
    const s = (e == null ? void 0 : e.renderBefore) ?? null;
    o._$litPart$ = i = new B(t.insertBefore(j(), s), s, void 0, e ?? {});
  }
  return i._$AI(r), i;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
class N extends U {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this.o = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this.o = Kt(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this.o) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this.o) == null || t.setConnected(!1);
  }
  render() {
    return I;
  }
}
var xt;
N._$litElement$ = !0, N.finalized = !0, (xt = globalThis.litElementHydrateSupport) == null || xt.call(globalThis, { LitElement: N });
const Z = globalThis.litElementPolyfillSupport;
Z == null || Z({ LitElement: N });
(globalThis.litElementVersions ?? (globalThis.litElementVersions = [])).push("4.1.0");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Jt = (r) => (t, e) => {
  e !== void 0 ? e.addInitializer(() => {
    customElements.define(r, t);
  }) : customElements.define(r, t);
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Yt = { attribute: !0, type: String, converter: F, reflect: !1, hasChanged: tt }, Gt = (r = Yt, t, e) => {
  const { kind: o, metadata: i } = e;
  let s = globalThis.litPropertyMetadata.get(i);
  if (s === void 0 && globalThis.litPropertyMetadata.set(i, s = /* @__PURE__ */ new Map()), s.set(e.name, r), o === "accessor") {
    const { name: n } = e;
    return {
      set(c) {
        const a = t.get.call(this);
        t.set.call(this, c), this.requestUpdate(n, a, r);
      }, init(c) {
        return c !== void 0 && this.P(n, void 0, r), c;
      }
    };
  }
  if (o === "setter") {
    const { name: n } = e;
    return function (c) {
      const a = this[n];
      t.call(this, c), this.requestUpdate(n, a, r);
    };
  }
  throw Error("Unsupported decorator location: " + o);
};
function y(r) {
  return (t, e) => typeof e == "object" ? Gt(r, t, e) : ((o, i, s) => {
    const n = i.hasOwnProperty(s);
    return i.constructor.createProperty(s, n ? { ...o, wrapped: !0 } : o), n ? Object.getOwnPropertyDescriptor(i, s) : void 0;
  })(r, t, e);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function Zt(r) {
  return y({ ...r, state: !0, attribute: !1 });
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Xt = (r, t, e) => (e.configurable = !0, e.enumerable = !0, Reflect.decorate && typeof t != "object" && Object.defineProperty(r, t, e), e);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
function Qt(r) {
  return (t, e) => Xt(t, e, {
    async get() {
      var o;
      return await this.updateComplete, ((o = this.renderRoot) == null ? void 0 : o.querySelector(r)) ?? null;
    }
  });
}
const te = `*,:before,:after{box-sizing:border-box;border-width:0;border-style:solid;border-color:#e5e7eb}:before,:after{--tw-content: ""}html,:host{line-height:1.5;-webkit-text-size-adjust:100%;-moz-tab-size:4;-o-tab-size:4;tab-size:4;font-family:Arial,sans-serif;font-feature-settings:normal;font-variation-settings:normal;-webkit-tap-highlight-color:transparent}body{margin:0;line-height:inherit}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,Liberation Mono,Courier New,monospace;font-feature-settings:normal;font-variation-settings:normal;font-size:1em}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}button,input,optgroup,select,textarea{font-family:inherit;font-feature-settings:inherit;font-variation-settings:inherit;font-size:100%;font-weight:inherit;line-height:inherit;letter-spacing:inherit;color:inherit;margin:0;padding:0}button,select{text-transform:none}button,input:where([type=button]),input:where([type=reset]),input:where([type=submit]){-webkit-appearance:button;background-color:transparent;background-image:none}:-moz-focusring{outline:auto}:-moz-ui-invalid{box-shadow:none}progress{vertical-align:baseline}::-webkit-inner-spin-button,::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}summary{display:list-item}blockquote,dl,dd,h1,h2,h3,h4,h5,h6,hr,figure,p,pre{margin:0}fieldset{margin:0;padding:0}legend{padding:0}ol,ul,menu{list-style:none;margin:0;padding:0}dialog{padding:0}textarea{resize:vertical}input::-moz-placeholder,textarea::-moz-placeholder{opacity:1;color:#9ca3af}input::placeholder,textarea::placeholder{opacity:1;color:#9ca3af}button,[role=button]{cursor:pointer}:disabled{cursor:default}img,svg,video,canvas,audio,iframe,embed,object{display:block;vertical-align:middle}img,video{max-width:100%;height:auto}[hidden]{display:none}[type=text],input:where(:not([type])),[type=email],[type=url],[type=password],[type=number],[type=date],[type=datetime-local],[type=month],[type=search],[type=tel],[type=time],[type=week],[multiple],textarea,select{-webkit-appearance:none;-moz-appearance:none;appearance:none;background-color:#fff;border-color:#6b7280;border-width:1px;border-radius:0;padding:.5rem .75rem;font-size:1rem;line-height:1.5rem;--tw-shadow: 0 0 #0000}[type=text]:focus,input:where(:not([type])):focus,[type=email]:focus,[type=url]:focus,[type=password]:focus,[type=number]:focus,[type=date]:focus,[type=datetime-local]:focus,[type=month]:focus,[type=search]:focus,[type=tel]:focus,[type=time]:focus,[type=week]:focus,[multiple]:focus,textarea:focus,select:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-inset: var(--tw-empty, );--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: #2563eb;--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow);border-color:#2563eb}input::-moz-placeholder,textarea::-moz-placeholder{color:#6b7280;opacity:1}input::placeholder,textarea::placeholder{color:#6b7280;opacity:1}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-date-and-time-value{min-height:1.5em;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit,::-webkit-datetime-edit-year-field,::-webkit-datetime-edit-month-field,::-webkit-datetime-edit-day-field,::-webkit-datetime-edit-hour-field,::-webkit-datetime-edit-minute-field,::-webkit-datetime-edit-second-field,::-webkit-datetime-edit-millisecond-field,::-webkit-datetime-edit-meridiem-field{padding-top:0;padding-bottom:0}select{background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");background-position:right .5rem center;background-repeat:no-repeat;background-size:1.5em 1.5em;padding-right:2.5rem;-webkit-print-color-adjust:exact;print-color-adjust:exact}[multiple],[size]:where(select:not([size="1"])){background-image:initial;background-position:initial;background-repeat:unset;background-size:initial;padding-right:.75rem;-webkit-print-color-adjust:unset;print-color-adjust:unset}[type=checkbox],[type=radio]{-webkit-appearance:none;-moz-appearance:none;appearance:none;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;display:inline-block;vertical-align:middle;background-origin:border-box;-webkit-user-select:none;-moz-user-select:none;user-select:none;flex-shrink:0;height:1rem;width:1rem;color:#2563eb;background-color:#fff;border-color:#6b7280;border-width:1px;--tw-shadow: 0 0 #0000}[type=checkbox]{border-radius:0}[type=radio]{border-radius:100%}[type=checkbox]:focus,[type=radio]:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-inset: var(--tw-empty, );--tw-ring-offset-width: 2px;--tw-ring-offset-color: #fff;--tw-ring-color: #2563eb;--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow)}[type=checkbox]:checked,[type=radio]:checked{border-color:transparent;background-color:currentColor;background-size:100% 100%;background-position:center;background-repeat:no-repeat}[type=checkbox]:checked{background-image:url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e")}@media (forced-colors: active){[type=checkbox]:checked{-webkit-appearance:auto;-moz-appearance:auto;appearance:auto}}[type=radio]:checked{background-image:url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3ccircle cx='8' cy='8' r='3'/%3e%3c/svg%3e")}@media (forced-colors: active){[type=radio]:checked{-webkit-appearance:auto;-moz-appearance:auto;appearance:auto}}[type=checkbox]:checked:hover,[type=checkbox]:checked:focus,[type=radio]:checked:hover,[type=radio]:checked:focus{border-color:transparent;background-color:currentColor}[type=checkbox]:indeterminate{background-image:url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 16 16'%3e%3cpath stroke='white' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M4 8h8'/%3e%3c/svg%3e");border-color:transparent;background-color:currentColor;background-size:100% 100%;background-position:center;background-repeat:no-repeat}@media (forced-colors: active){[type=checkbox]:indeterminate{-webkit-appearance:auto;-moz-appearance:auto;appearance:auto}}[type=checkbox]:indeterminate:hover,[type=checkbox]:indeterminate:focus{border-color:transparent;background-color:currentColor}[type=file]{background:unset;border-color:inherit;border-width:0;border-radius:0;padding:0;font-size:unset;line-height:inherit}[type=file]:focus{outline:1px solid ButtonText;outline:1px auto -webkit-focus-ring-color}*,:before,:after{--tw-border-spacing-x: 0;--tw-border-spacing-y: 0;--tw-translate-x: 0;--tw-translate-y: 0;--tw-rotate: 0;--tw-skew-x: 0;--tw-skew-y: 0;--tw-scale-x: 1;--tw-scale-y: 1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness: proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: rgb(59 130 246 / .5);--tw-ring-offset-shadow: 0 0 #0000;--tw-ring-shadow: 0 0 #0000;--tw-shadow: 0 0 #0000;--tw-shadow-colored: 0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }::backdrop{--tw-border-spacing-x: 0;--tw-border-spacing-y: 0;--tw-translate-x: 0;--tw-translate-y: 0;--tw-rotate: 0;--tw-skew-x: 0;--tw-skew-y: 0;--tw-scale-x: 1;--tw-scale-y: 1;--tw-pan-x: ;--tw-pan-y: ;--tw-pinch-zoom: ;--tw-scroll-snap-strictness: proximity;--tw-gradient-from-position: ;--tw-gradient-via-position: ;--tw-gradient-to-position: ;--tw-ordinal: ;--tw-slashed-zero: ;--tw-numeric-figure: ;--tw-numeric-spacing: ;--tw-numeric-fraction: ;--tw-ring-inset: ;--tw-ring-offset-width: 0px;--tw-ring-offset-color: #fff;--tw-ring-color: rgb(59 130 246 / .5);--tw-ring-offset-shadow: 0 0 #0000;--tw-ring-shadow: 0 0 #0000;--tw-shadow: 0 0 #0000;--tw-shadow-colored: 0 0 #0000;--tw-blur: ;--tw-brightness: ;--tw-contrast: ;--tw-grayscale: ;--tw-hue-rotate: ;--tw-invert: ;--tw-saturate: ;--tw-sepia: ;--tw-drop-shadow: ;--tw-backdrop-blur: ;--tw-backdrop-brightness: ;--tw-backdrop-contrast: ;--tw-backdrop-grayscale: ;--tw-backdrop-hue-rotate: ;--tw-backdrop-invert: ;--tw-backdrop-opacity: ;--tw-backdrop-saturate: ;--tw-backdrop-sepia: ;--tw-contain-size: ;--tw-contain-layout: ;--tw-contain-paint: ;--tw-contain-style: }.static{position:static}.absolute{position:absolute}.relative{position:relative}.bottom-full{bottom:100%}.left-0{left:0}.right-0{right:0}.top-0{top:0}.z-20{z-index:20}.m-2{margin:.5rem}.my-2{margin-top:.5rem;margin-bottom:.5rem}.mb-1{margin-bottom:.25rem}.ml-2{margin-left:.5rem}.mr-2{margin-right:.5rem}.mt-1{margin-top:.25rem}.box-border{box-sizing:border-box}.block{display:block}.inline{display:inline}.flex{display:flex}.hidden{display:none}.size-5{width:1.25rem;height:1.25rem}.h-10\\.5{height:2.625rem}.h-11{height:2.75rem}.h-5{height:1.25rem}.h-full{height:100%}.max-h-48{max-height:12rem}.w-11{width:2.75rem}.w-5{width:1.25rem}.w-\\[93\\%\\]{width:93%}.w-full{width:100%}.min-w-11{min-width:2.75rem}.max-w-\\[93\\%\\]{max-width:93%}.shrink-0{flex-shrink:0}.rotate-180{--tw-rotate: 180deg;transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skew(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.transform{transform:translate(var(--tw-translate-x),var(--tw-translate-y)) rotate(var(--tw-rotate)) skew(var(--tw-skew-x)) skewY(var(--tw-skew-y)) scaleX(var(--tw-scale-x)) scaleY(var(--tw-scale-y))}.cursor-auto{cursor:auto}.cursor-not-allowed{cursor:not-allowed}.cursor-pointer{cursor:pointer}.scroll-py-1{scroll-padding-top:.25rem;scroll-padding-bottom:.25rem}.appearance-none{-webkit-appearance:none;-moz-appearance:none;appearance:none}.items-center{align-items:center}.justify-center{justify-content:center}.justify-between{justify-content:space-between}.justify-items-center{justify-items:center}.overflow-y-auto{overflow-y:auto}.scroll-smooth{scroll-behavior:smooth}.rounded{border-radius:.25rem}.rounded-r{border-top-right-radius:.25rem;border-bottom-right-radius:.25rem}.rounded-br-sm{border-bottom-right-radius:.125rem}.rounded-tr-sm{border-top-right-radius:.125rem}.border{border-width:1px}.border-b{border-bottom-width:1px}.border-t{border-top-width:1px}.border-none{border-style:none}.border-ewc-msBorder{--tw-border-opacity: 1;border-color:rgb(81 85 96 / var(--tw-border-opacity))}.border-ewc-msBorderInvert{--tw-border-opacity: 1;border-color:rgb(168 170 175 / var(--tw-border-opacity))}.border-gray-300{--tw-border-opacity: 1;border-color:rgb(209 213 219 / var(--tw-border-opacity))}.bg-ewc-availableHover,.bg-ewc-blue{--tw-bg-opacity: 1;background-color:rgb(14 71 203 / var(--tw-bg-opacity))}.bg-white{--tw-bg-opacity: 1;background-color:rgb(255 255 255 / var(--tw-bg-opacity))}.fill-current{fill:currentColor}.fill-white{fill:#fff}.p-1{padding:.25rem}.p-2{padding:.5rem}.p-2\\.75{padding:.6875}.pl-2{padding-left:.5rem}.pr-12{padding-right:3rem}.text-left{text-align:left}.align-middle{vertical-align:middle}.text-ewc-available,.text-ewc-msText{--tw-text-opacity: 1;color:rgb(23 26 34 / var(--tw-text-opacity))}.text-ewc-notAvailable{--tw-text-opacity: 1;color:rgb(81 85 96 / var(--tw-text-opacity))}.text-white{--tw-text-opacity: 1;color:rgb(255 255 255 / var(--tw-text-opacity))}.shadow{--tw-shadow: 0 1px 3px 0 rgb(0 0 0 / .1), 0 1px 2px -1px rgb(0 0 0 / .1);--tw-shadow-colored: 0 1px 3px 0 var(--tw-shadow-color), 0 1px 2px -1px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.shadow-md{--tw-shadow: 0 4px 6px -1px rgb(0 0 0 / .1), 0 2px 4px -2px rgb(0 0 0 / .1);--tw-shadow-colored: 0 4px 6px -1px var(--tw-shadow-color), 0 2px 4px -2px var(--tw-shadow-color);box-shadow:var(--tw-ring-offset-shadow, 0 0 #0000),var(--tw-ring-shadow, 0 0 #0000),var(--tw-shadow)}.filter{filter:var(--tw-blur) var(--tw-brightness) var(--tw-contrast) var(--tw-grayscale) var(--tw-hue-rotate) var(--tw-invert) var(--tw-saturate) var(--tw-sepia) var(--tw-drop-shadow)}.transition{transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,-webkit-backdrop-filter;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter;transition-property:color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,-webkit-backdrop-filter;transition-timing-function:cubic-bezier(.4,0,.2,1);transition-duration:.15s}.duration-300{transition-duration:.3s}.ewc-focus:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow, 0 0 #0000);--tw-ring-inset: inset;--tw-ring-opacity: 1;--tw-ring-color: rgb(14 71 203 / var(--tw-ring-opacity))}.ewc-focus-invert:focus{outline:2px solid transparent;outline-offset:2px;--tw-ring-offset-shadow: var(--tw-ring-inset) 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color);--tw-ring-shadow: var(--tw-ring-inset) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color);box-shadow:var(--tw-ring-offset-shadow),var(--tw-ring-shadow),var(--tw-shadow, 0 0 #0000);--tw-ring-inset: inset;--tw-ring-opacity: 1;--tw-ring-color: rgb(255 255 255 / var(--tw-ring-opacity))}.ewc-hover:hover,.ewc-hover-invert:hover{opacity:.8}.hover\\:bg-\\[\\#CFDAF5\\]:hover{--tw-bg-opacity: 1;background-color:rgb(207 218 245 / var(--tw-bg-opacity))}.hover\\:bg-ewc-notAvailableHover:hover{--tw-bg-opacity: 1;background-color:rgb(125 128 136 / var(--tw-bg-opacity))}.hover\\:text-black:hover{--tw-text-opacity: 1;color:rgb(0 0 0 / var(--tw-text-opacity))}.hover\\:text-white:hover{--tw-text-opacity: 1;color:rgb(255 255 255 / var(--tw-text-opacity))}.focus\\:bg-\\[\\#CFDAF5\\]:focus{--tw-bg-opacity: 1;background-color:rgb(207 218 245 / var(--tw-bg-opacity))}.focus\\:bg-ewc-notAvailableHover:focus{--tw-bg-opacity: 1;background-color:rgb(125 128 136 / var(--tw-bg-opacity))}.focus\\:text-black:focus{--tw-text-opacity: 1;color:rgb(0 0 0 / var(--tw-text-opacity))}.focus\\:text-white:focus{--tw-text-opacity: 1;color:rgb(255 255 255 / var(--tw-text-opacity))}.focus\\:outline-none:focus{outline:2px solid transparent;outline-offset:2px}`;
var X, O;
let b = (O = class extends N {
  get invertColors() {
    return this._invertColors;
  }
  set invertColors(t) {
    typeof t == "string" ? this._invertColors = t.toLowerCase() === "true" : this._invertColors = t;
  }
  constructor() {
    super(), this.options = [], this.selectedOption = "", this.isExpanded = !1, this.defaultOption = "", this.activeOption = "", this.dropdownHeight = "", this.selectedLabel = "options selected", this.searchMode = "", this._searchText = "", this.useParentWidth = !1, this._shouldShowSearch = !1, this._dropdownPosition = "bottom", this._invertColors = !1, this._originalOptions = [], this._initialOptions = [], this._initialDefaultOption = "", this._initialActiveOption = "", this._componentWidth = 250, this._handleShadowClick = (t) => {
      t.stopPropagation();
    }, this.handleClickOutside = (t) => {
      var e, o;
      (o = (e = this.shadowRoot) == null ? void 0 : e.querySelector("#searchInput")) != null && o.contains(t.target) || this.shadowRoot && !this.shadowRoot.contains(t.target) && this.closeDropdownWithoutFocus();
    }, this.constructor.styles[0].replaceSync(te), this.addEventListener("keydown", this.handleKeyDown);
  }
  connectedCallback() {
    super.connectedCallback(), this.setAttribute("ewc-version", X.version);
  }
  updated(t) {
    var e;
    if (super.updated(t), t.has("searchMode") && (this._shouldShowSearch = this.determineInitialSearchVisibility()), t.has("useParentWidth") && this._updateWidth(), this.dropdownElement.then((o) => {
      var i;
      o && ((i = this.shadowRoot) == null || i.addEventListener("click", this._handleShadowClick), document.addEventListener("click", this.handleClickOutside));
    }), t.has("isExpanded") && this.isExpanded) {
      const o = (e = this.shadowRoot) == null ? void 0 : e.querySelector("#dropdown");
      o == null || o.addEventListener("keydown", this.handleKeyDown);
    }
  }
  firstUpdated() {
    this._initialOptions = JSON.parse(JSON.stringify(this.options)), this._initialDefaultOption = this.defaultOption, this._initialActiveOption = this.activeOption, this._originalOptions = JSON.parse(this.getAttribute("options") || "[]"), this.options = [...this._originalOptions], this.selectedOption || (this.selectedOption = this.activeOption ? this.activeOption : this.defaultOption), this._shouldShowSearch = this.determineInitialSearchVisibility(), this.requestUpdate(), this._updateWidth();
  }
  determineInitialSearchVisibility() {
    return this.searchMode === "force" ? !0 : this.searchMode === "false" ? !1 : this._originalOptions.flat().length >= 10;
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this.shadowRoot) == null || t.removeEventListener("click", this._handleShadowClick), document.removeEventListener("click", this.handleClickOutside);
  }
  _updateWidth() {
    var s;
    const t = this._originalOptions.flat();
    if (t.length === 0) {
      this.style.width = "250px";
      return;
    }
    const e = t.reduce((n, c) => c.name.length > n.length ? c.name : n, ""), i = document.createElement("canvas").getContext("2d");
    if (i) {
      this.style.display = "block";
      const n = (s = this.shadowRoot) == null ? void 0 : s.querySelector("#selectedText");
      if (n) {
        const c = window.getComputedStyle(n);
        i.font = `${c.fontSize} ${c.fontFamily}`;
        const d = i.measureText(e).width + 72;
        this._componentWidth = Math.max(d, 150), this.useParentWidth ? (this.style.width = "100%", this.style.minWidth = "0") : (this.style.width = `${this._componentWidth}px`, this.style.minWidth = `${this._componentWidth}px`);
      } else
        this.style.width = "150px";
    } else
      this.style.width = "150px";
  }
  resetSearch() {
    if (this.shadowRoot) {
      const t = this.shadowRoot.querySelector("#searchInput");
      t && (t.value = "", t.dispatchEvent(new Event("input"))), this.options = [...this._originalOptions], this.requestUpdate();
    }
  }
  focusSearchInput() {
    if (this.shadowRoot) {
      const t = this.shadowRoot.querySelector("#searchInput");
      t && t.focus();
    }
  }
  focusMultiSelect() {
    if (this.shadowRoot) {
      const t = this.shadowRoot.querySelector("#select");
      t && t.focus();
    }
  }
  closeDropdown() {
    this.isExpanded = !1, this.resetSearch(), this.focusMultiSelect();
  }
  closeDropdownWithoutFocus() {
    this.isExpanded = !1, this.resetSearch();
  }
  toggleDropdown() {
    if (this.isExpanded = !this.isExpanded, this.isExpanded) {
      const t = this.getBoundingClientRect(), e = window.innerHeight - t.bottom, o = t.top;
      let i = 0;
      this.dropdownHeight ? i = parseInt(this.dropdownHeight, 10) : i = 192, this.shouldShowSearch() && (i += 50), e < i && o > e ? this._dropdownPosition = "top" : this._dropdownPosition = "bottom", setTimeout(() => {
        this.focusSearchInput();
      }, 0);
    } else
      this.resetSearch(), this.focusMultiSelect();
  }
  search(t) {
    const e = t.target.value.toLowerCase();
    this.options = this._originalOptions.map((o) => o.filter((i) => i.name.toLowerCase().includes(e))), this.requestUpdate();
  }
  getSelectedOptionNames() {
    if (this.selectedOption) {
      const t = this._originalOptions.flat().find((e) => e.code === this.selectedOption);
      return t ? t.name : "";
    } else
      return this.selectedLabel;
  }
  get selectedText() {
    var e;
    return `${((e = this.selectedLabel) == null ? void 0 : e.trim()) || "options selected"}`;
  }
  getFirstFocusableOptionElement() {
    return this.shadowRoot && Array.from(this.shadowRoot.querySelectorAll('div[role="option"]')).filter((e) => {
      const o = e.closest('div[role="option"]'), i = o == null ? void 0 : o.getAttribute("data-option-code");
      if (i) {
        const s = this.options.flat().find((n) => n.code === i);
        return (s == null ? void 0 : s.status) === "active";
      }
      return !1;
    })[0] || null;
  }
  handleKeyDown(t, e) {
    var s, n, c, a, d, u, h, x, $, C, ot, it, rt, st, nt, at, ct, lt, dt;
    if (!this.shadowRoot)
      return;
    const o = Array.from(this.shadowRoot.querySelectorAll('div[role="option"]')).filter((p) => {
      const l = p.closest('div[role="option"]'), v = l == null ? void 0 : l.getAttribute("data-option-code");
      if (v) {
        const w = this.options.flat().find((g) => g.code === v);
        return (w == null ? void 0 : w.status) === "active";
      }
      return !1;
    });
    let i = o.findIndex((p) => {
      var l;
      return p === ((l = this.shadowRoot) == null ? void 0 : l.activeElement);
    });
    switch (t.key) {
      case "ArrowDown":
        if (t.preventDefault(), this.isExpanded) {
          const p = (n = this.shadowRoot) == null ? void 0 : n.activeElement;
          if ((p == null ? void 0 : p.id) === "searchInput")
            i = 0, (c = o[i]) == null || c.focus();
          else if (i === o.length - 1) {
            const l = (a = this.shadowRoot) == null ? void 0 : a.querySelector("#searchInput");
            l ? l.focus() : (i = 0, (d = o[i]) == null || d.focus());
          } else i === -1 ? (i = 0, (u = o[i]) == null || u.focus()) : (i++, (h = o[i]) == null || h.focus());
        } else {
          this.isExpanded = !0, this.options = [...this._originalOptions];
          const p = (s = this.shadowRoot) == null ? void 0 : s.querySelector("#searchInput");
          p && (p.value = "", p.dispatchEvent(new Event("input"))), this.requestUpdate(), setTimeout(() => {
            this.focusSearchInput();
          }, 0);
        }
        break;
      case "ArrowUp":
        if (t.preventDefault(), this.isExpanded) {
          const p = (x = this.shadowRoot) == null ? void 0 : x.querySelector("#searchInput"), l = ($ = this.shadowRoot) == null ? void 0 : $.activeElement;
          (l == null ? void 0 : l.id) === "searchInput" ? (i = o.length - 1, (C = o[i]) == null || C.focus()) : i === 0 ? p ? p.focus() : (i = o.length - 1, (ot = o[i]) == null || ot.focus()) : i === -1 ? (i = o.length - 1, (it = o[i]) == null || it.focus()) : (i--, (rt = o[i]) == null || rt.focus());
        }
        break;
      case "ArrowRight":
      case "ArrowLeft":
        if (t.preventDefault(), this.isExpanded) {
          const l = ((st = this.shadowRoot) == null ? void 0 : st.activeElement).closest('div[role="option"]');
          if (l && t.key === "ArrowRight") {
            const v = l.querySelector(".favouriteOptionBtn");
            v && v.focus();
          }
        }
        break;
      case "Enter":
      case " ":
        if (t.preventDefault(), this.isExpanded) {
          let l = ((at = this.shadowRoot) == null ? void 0 : at.activeElement).closest('div[role="option"]');
          if (l != null && l.hasAttribute("data-option-code")) {
            const v = l.getAttribute("data-option-code");
            if (v) {
              const w = this.options.flat().find((g) => g.code === v);
              (w == null ? void 0 : w.status) === "active" && this.toggleSelection(w);
            }
          }
        } else {
          this.isExpanded = !0, this.options = [...this._originalOptions];
          const p = (nt = this.shadowRoot) == null ? void 0 : nt.querySelector("#searchInput");
          p && (p.value = "", p.dispatchEvent(new Event("input"))), this.requestUpdate(), setTimeout(() => {
            this.focusSearchInput();
          }, 0);
        }
        break;
      case "Escape":
        this.isExpanded && (t.preventDefault(), this.closeDropdown());
        break;
      case "Tab":
        if (this.isExpanded) {
          const p = (ct = this.shadowRoot) == null ? void 0 : ct.activeElement;
          if ((p == null ? void 0 : p.id) === "searchInput")
            if (t.preventDefault(), t.shiftKey) {
              const l = Array.from(this.shadowRoot.querySelectorAll('div[role="option"]')).filter((v) => {
                const w = v.closest('div[role="option"]'), g = w == null ? void 0 : w.getAttribute("data-option-code");
                if (g) {
                  const _ = this.options.flat().find((k) => k.code === g);
                  return (_ == null ? void 0 : _.status) === "active";
                }
                return !1;
              });
              if (l.length > 0) {
                l[l.length - 1].focus();
                return;
              }
            } else {
              const l = this.getFirstFocusableOptionElement();
              l && l.focus();
            }
          else {
            const l = Array.from(this.shadowRoot.querySelectorAll('div[role="option"]')).filter((g) => {
              const _ = g.getAttribute("data-option-code"), k = this.options.flat().find((Et) => Et.code === _);
              return (k == null ? void 0 : k.status) === "active";
            }), v = p == null ? void 0 : p.closest('div[role="option"]'), w = v ? l.indexOf(v) : -1;
            if (t.shiftKey)
              if (w > 0) {
                t.preventDefault();
                const g = l[w - 1];
                g && g.focus();
              } else w === 0 && (t.preventDefault(), this.focusSearchInput());
            else if (w < l.length - 1) {
              t.preventDefault();
              const g = l[w + 1];
              if (g)
                g.focus();
              else {
                const _ = (lt = this.shadowRoot) == null ? void 0 : lt.querySelector("#searchInput");
                if (_)
                  _.focus();
                else {
                  const k = this.getFirstFocusableOptionElement();
                  k && k.focus();
                }
              }
            } else if (w === l.length - 1) {
              t.preventDefault();
              const g = (dt = this.shadowRoot) == null ? void 0 : dt.querySelector("#searchInput");
              if (g)
                g.focus();
              else {
                const _ = this.getFirstFocusableOptionElement();
                _ && _.focus();
              }
            }
          }
        }
        break;
    }
  }
  hasVisibleOptionsInNextGroup(t) {
    for (let e = t + 1; e < this.options.length; e++)
      if (this.options[e].length > 0)
        return !0;
    return !1;
  }
  renderOptionList() {
    return A`
      ${this.options.map((t, e) => A`
          ${t.map((o, i) => A`
              <div
                role="option"
                aria-selected="${o.code === this.selectedOption}"
                class="p-2 scroll-py-1 scroll-smooth flex items-center justify-between ewc-focus
                  ${o.status === "inactive" ? "cursor-not-allowed text-ewc-notAvailable hover:bg-ewc-notAvailableHover hover:text-white focus:bg-ewc-notAvailableHover focus:text-white focus:outline-none" : `cursor-pointer text-ewc-available focus:outline-none hover:bg-[#CFDAF5] hover:text-black focus:bg-[#CFDAF5] focus:text-black ${o.code === this.selectedOption ? "bg-ewc-availableHover text-white" : ""}`}"
                data-option-code="${o.code}"
                tabindex="0"
                @click="${(s) => {
        o.status === "active" && (s.preventDefault(), s.stopPropagation(), this.toggleSelection(o));
      }}"
              >
                <label
                  for="option-${o.code}"
                  class="flex items-center w-full group justify-between ${o.status === "active" ? "cursor-pointer" : "cursor-not-allowed text-ewc-disabled"}"
                  data-option-code="${o.code}"
                  tabindex="-1"
                  @click="${(s) => {
        o.status === "active" && (s.preventDefault(), s.stopPropagation(), this.toggleSelection(o));
      }}"
                >
                  <span class="ml-2"> ${o.name} </span>
                  ${o.code === this.selectedOption ? A`<svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="h-5 w-5 shrink-0 fill-current mr-2"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fill-rule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clip-rule="evenodd"
                        />
                      </svg>` : ""}
                </label>
              </div>
              ${i === t.length - 1 && this.hasVisibleOptionsInNextGroup(e) ? A`<hr class="border-t border-gray-300 my-2" />` : ""}
            `)}
        `)}
    `;
  }
  toggleOptionStatus(t) {
    const e = this.options.map((a) => a.map((d) => ({ ...d }))), o = this._originalOptions.map((a) => a.map((d) => ({ ...d }))), i = (a) => a.map((d) => d.map((u) => u.code === t ? {
      ...u,
      status: u.status === "active" ? "inactive" : "active"
    } : u)), s = i(e), n = i(o), c = s.flat().find((a) => a.code === t);
    (c == null ? void 0 : c.status) === "inactive" && this.selectedOption === t && (this.selectedOption = ""), this.options = s, this._originalOptions = n, this.requestUpdate(), this.dispatchEvent(new CustomEvent("option-status-change", {
      detail: {
        optionCode: t,
        status: c == null ? void 0 : c.status
      }
    }));
  }
  toggleSelection(t) {
    var o;
    if (t.status !== "active")
      return;
    this.selectedOption !== t.code && (this.selectedOption = t.code, this.dispatchEvent(new CustomEvent("option-selected", { detail: { option: t } })));
    const e = (o = this.shadowRoot) == null ? void 0 : o.querySelector("#searchInput");
    if (e) {
      const i = new Event("input", {
        bubbles: !0,
        cancelable: !0,
        composed: !0
      });
      e.dispatchEvent(i);
    }
    this.requestUpdate(), this.closeDropdown();
  }
  shouldShowSearch() {
    return this._shouldShowSearch;
  }
  // Add reset method
  resetSelect() {
    this.options = JSON.parse(JSON.stringify(this._initialOptions)), this.selectedOption = this._initialDefaultOption, this.activeOption = this._initialActiveOption, this.dispatchEvent(new CustomEvent("reset-select", {
      detail: {
        defaultOption: this._initialDefaultOption,
        activeOption: this._initialActiveOption
      }
    })), this.requestUpdate();
  }
  render() {
    return A`
      <div class="relative bg-white rounded">
        <button
          id="select"
          class="w-full h-11 border cursor-pointer align-middle flex relative rounded ewc-hover
          ${this.invertColors ? "ewc-focus-invert border-ewc-msBorderInvert" : "ewc-focus border-ewc-msBorder "}"
          @click="${this.toggleDropdown}"
          @keydown="${this.handleKeyDown}"
          aria-expanded="${this.isExpanded}"
        >
          <div id="selectedText" class="flex text-ewc-msText items-center text-left h-full pl-2 pr-12 relative w-full">
            ${this.getSelectedOptionNames()}
          </div>
          <div
            class="items-center bg-ewc-blue flex h-10.5 absolute top-0 right-0 w-11 rounded-tr-sm rounded-br-sm"
          >
            <div id="dropdownButton" class="rounded-r min-w-11 h-10.5 w-full text-white bg-ewc-blue flex justify-center items-center p-1">
              <span class="cursor-pointer flex">
                <svg id="dropdownArrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" focusable="false" aria-hidden="true" class="transform transition duration-300 fill-white size-5 ${this.isExpanded ? "" : "rotate-180"}">
                  <path fill-rule="evenodd" d="m45 30.12-2.73 2.82-18.24-18.36L5.73 33 3 30.18 24.03 9z" clip-rule="evenodd"></path>
                </svg>
              </span>
            </div>
          </div>
        </button>
        ${this.isExpanded ? A`
              <div
                id="dropdown"
                class="absolute block justify-items-center left-0 w-full rounded shadow bg-white cursor-auto border-none box-border border-ewc-msBorder z-20 ${this._dropdownPosition === "top" ? "bottom-full mb-1" : "mt-1"}"
                style="max-height: 80vh; overflow: hidden;"
              >
                ${this.shouldShowSearch() ? A`
                  <input
                    id="searchInput"
                    type="text"
                    placeholder="Search"
                    aria-label="Search"
                    autocomplete="off"
                    .value="${this._searchText}"
                    class="border-b border-ewc-msBorder box-border appearance-none bg-white w-[93%] max-w-[93%] rounded text-ewc-msText block p-2.75 m-2 shadow-md"
                    @input="${this.search}"
                  />
                ` : ""}
                <div
                  id="optionList"
                  style="
                    ${this.dropdownHeight ? `max-height: ${this.dropdownHeight};` : ""}
"
                  class="overflow-y-auto w-full ${this.dropdownHeight ? "" : "max-h-48"}"
                >
                  ${this.renderOptionList()}
                </div>
              </div>
            ` : ""}
      </div>
    `;
  }
}, X = O, O.version = "1.0.10-beta", O.styles = [new CSSStyleSheet()], O);
m([
  y({ type: Array })
], b.prototype, "options", void 0);
m([
  y({ type: String })
], b.prototype, "selectedOption", void 0);
m([
  y({ type: Boolean })
], b.prototype, "isExpanded", void 0);
m([
  y({ type: String })
], b.prototype, "defaultOption", void 0);
m([
  y({ type: String })
], b.prototype, "activeOption", void 0);
m([
  y({ type: String })
], b.prototype, "dropdownHeight", void 0);
m([
  y({ type: String })
], b.prototype, "invertColors", null);
m([
  y({ type: String })
], b.prototype, "selectedLabel", void 0);
m([
  y({ type: String })
], b.prototype, "searchMode", void 0);
m([
  y({ type: String })
], b.prototype, "_searchText", void 0);
m([
  y({
    type: Boolean,
    converter: (r) => r === "true"
  })
], b.prototype, "useParentWidth", void 0);
m([
  y({ type: Boolean })
], b.prototype, "_shouldShowSearch", void 0);
m([
  Zt()
], b.prototype, "_dropdownPosition", void 0);
m([
  Qt("#dropdown")
], b.prototype, "dropdownElement", void 0);
b = X = m([
  Jt("ewc-singleselect")
], b);
//# sourceMappingURL=main.es.js.map
