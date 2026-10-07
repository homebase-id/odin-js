// A jsdom-free DOM stand-in. innerHTML is a throwing setter: any renderer that assigns it fails.
class El {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.attributes = {};
    this.children = [];
    this._text = '';
    this.listeners = {};
    this.className = '';
  }
  set innerHTML(_v) {
    throw new Error('innerHTML assigned in a preview renderer');
  }
  get innerHTML() {
    return '';
  }
  set textContent(v) {
    this._text = String(v);
    this.children = [];
  }
  get textContent() {
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  setAttribute(k, v) {
    this.attributes[k] = String(v);
  }
  hasAttribute(k) {
    return k in this.attributes;
  }
  appendChild(c) {
    this.children.push(c);
    return c;
  }
  replaceChildren(...cs) {
    this.children = cs;
    this._text = '';
  }
  addEventListener(t, fn) {
    (this.listeners[t] ??= []).push(fn);
  }
  replaceWith() {}
  set src(v) {
    this.attributes.src = v;
  }
  set alt(v) {
    this.attributes.alt = v;
  }
  set controls(v) {
    this.attributes.controls = v;
  }
  set draggable(v) {
    this.attributes.draggable = String(v);
  }
}

export const installDomStub = () => {
  globalThis.document = { createElement: (tag) => new El(tag) };
};

/** Every element in a tree, depth first. */
export const walk = (el) => [el, ...el.children.flatMap(walk)];
