// A real WebGL globe replacing the flat SVG compass dial on the Overview page. Three.js is
// vendored locally (public/js/vendor/three.module.min.js) rather than pulled from a CDN, so the
// app has no runtime dependency on third-party hosts. Loaded as an ES module (deferred by the
// browser), so it can finish initializing after the classic app.js script has already run —
// app.js awaits window.LC_sphereReady before calling in, rather than assuming load order.
import * as THREE from './vendor/three.module.min.js';

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

let haloTexture = null;
function haloTextureOnce() {
  if (haloTexture) return haloTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  haloTexture = new THREE.CanvasTexture(canvas);
  return haloTexture;
}

// Even distribution of N points on a unit sphere — used to place topic markers so they read as
// a real globe layout rather than a flat ring wrapped around an axis.
function fibonacciPoint(i, n) {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
  const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = golden * i;
  return new THREE.Vector3(Math.cos(theta) * radiusAtY, y, Math.sin(theta) * radiusAtY);
}

class SphereCompass {
  constructor(container, topics, scores, opts) {
    opts = opts || {};
    this.container = container;
    this.topics = topics;
    this.onTopicClick = opts.onTopicClick || function () {};
    this.onTopicHover = opts.onTopicHover || function () {};
    this.scores = topics.map((_, i) => scores[i] || 0);
    this.targetScores = this.scores.slice();
    this._disposed = false;
    this._hoveredId = null;
    this._buildScene();
    this._bindEvents();
    this._animate = this._animate.bind(this);
    this._raf = requestAnimationFrame(this._animate);
    if (typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(() => this._onResize());
      this._ro.observe(container);
    }
  }

  _buildScene() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 0.25, 4.3);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.domElement.className = 'sphere-canvas';
    this.container.appendChild(this.renderer.domElement);

    this.rotGroup = new THREE.Group();
    this.rotGroup.rotation.x = -0.15;
    this.scene.add(this.rotGroup);

    const accent = new THREE.Color(cssVar('--accent', '#5b5fef'));
    const accent2 = new THREE.Color(cssVar('--accent-2', '#14b8a6'));
    const gridline = new THREE.Color(cssVar('--gridline', '#e5e7f4'));

    const coreGeo = new THREE.SphereGeometry(1.26, 48, 48);
    this.coreMat = new THREE.MeshStandardMaterial({
      color: accent, transparent: true, opacity: 0.09, roughness: 0.4, metalness: 0.05, side: THREE.DoubleSide,
    });
    this.core = new THREE.Mesh(coreGeo, this.coreMat);
    this.rotGroup.add(this.core);

    const wireGeo = new THREE.SphereGeometry(1.3, 22, 14);
    this.wireMat = new THREE.MeshBasicMaterial({ color: gridline, wireframe: true, transparent: true, opacity: 0.45 });
    this.wire = new THREE.Mesh(wireGeo, this.wireMat);
    this.rotGroup.add(this.wire);

    // Soft outer atmosphere — a slightly larger back-facing shell, additive-blended, to give
    // the globe a glow/rim-light "wow" read without a full postprocessing bloom pass.
    const glowGeo = new THREE.SphereGeometry(1.55, 32, 32);
    this.glowMat = new THREE.MeshBasicMaterial({ color: accent2, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = new THREE.Mesh(glowGeo, this.glowMat);
    this.scene.add(this.glow);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dl = new THREE.DirectionalLight(0xffffff, 0.7);
    dl.position.set(2, 3, 4);
    this.scene.add(dl);

    this.markers = this.topics.map((t, i) => this._buildMarker(t, i));
    this.markers.forEach((m) => this.rotGroup.add(m.group));

    this._raycaster = new THREE.Raycaster();
    this._raycaster.params.Sprite = { threshold: 0.08 };
  }

  _buildMarker(topic, i) {
    const n = this.topics.length;
    const dir = fibonacciPoint(i, n).normalize();
    const colorHex = (typeof window.topicAccent === 'function') ? window.topicAccent(topic.id) : '#5b5fef';
    const color = new THREE.Color(colorHex);
    const group = new THREE.Group();
    group.position.copy(dir.clone().multiplyScalar(1.32));

    const dotGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    group.add(dot);

    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTextureOnce(), color, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(0.4, 0.4, 1);
    group.add(halo);

    group.userData.topicId = topic.id;
    return { group, dot, halo };
  }

  _bindEvents() {
    const dom = this.renderer.domElement;
    dom.style.touchAction = 'none';
    dom.style.cursor = 'grab';
    let dragging = false, lastX = 0, lastY = 0, moved = false;
    this._autoRotate = true;

    this._onDown = (e) => {
      dragging = true; moved = false;
      lastX = e.clientX; lastY = e.clientY;
      dom.style.cursor = 'grabbing';
      try { dom.setPointerCapture(e.pointerId); } catch (err) {}
      this._autoRotate = false;
      clearTimeout(this._resumeTimer);
    };
    this._onMove = (e) => {
      if (!dragging) { this._hoverCheck(e); return; }
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      if (Math.abs(dx) + Math.abs(dy) > 2) moved = true;
      lastX = e.clientX; lastY = e.clientY;
      this.rotGroup.rotation.y += dx * 0.006;
      this.rotGroup.rotation.x = Math.max(-1.1, Math.min(1.1, this.rotGroup.rotation.x + dy * 0.006));
    };
    this._onUp = (e) => {
      dragging = false;
      dom.style.cursor = 'grab';
      this._resumeTimer = setTimeout(() => { this._autoRotate = true; }, 2600);
      if (!moved) this._handleClick(e);
    };
    dom.addEventListener('pointerdown', this._onDown);
    window.addEventListener('pointermove', this._onMove);
    window.addEventListener('pointerup', this._onUp);
  }

  _ndcFromEvent(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  _hits(e) {
    const ndc = this._ndcFromEvent(e);
    this._raycaster.setFromCamera(ndc, this.camera);
    return this._raycaster.intersectObjects(this.markers.map((m) => m.dot), false);
  }

  _hoverCheck(e) {
    const hits = this._hits(e);
    this.renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
    const hoveredId = hits.length ? hits[0].object.parent.userData.topicId : null;
    if (hoveredId !== this._hoveredId) {
      this._hoveredId = hoveredId;
      this.onTopicHover(hoveredId);
    }
  }

  _handleClick(e) {
    const hits = this._hits(e);
    if (hits.length) this.onTopicClick(hits[0].object.parent.userData.topicId);
  }

  update(scores) {
    this.targetScores = this.topics.map((_, i) => scores[i] || 0);
  }

  refreshTheme() {
    this.coreMat.color.set(cssVar('--accent', '#5b5fef'));
    this.wireMat.color.set(cssVar('--gridline', '#e5e7f4'));
    this.glowMat.color.set(cssVar('--accent-2', '#14b8a6'));
    this.markers.forEach((m) => {
      const colorHex = (typeof window.topicAccent === 'function') ? window.topicAccent(m.group.userData.topicId) : '#5b5fef';
      m.dot.material.color.set(colorHex);
      m.halo.material.color.set(colorHex);
    });
  }

  _onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate() {
    if (this._disposed) return;
    this._raf = requestAnimationFrame(this._animate);
    if (this._autoRotate) this.rotGroup.rotation.y += 0.0022;

    let changed = false;
    this.scores = this.scores.map((s, i) => {
      const next = s + (this.targetScores[i] - s) * 0.08;
      if (Math.abs(next - s) > 0.01) changed = true;
      return next;
    });
    this.markers.forEach((m, i) => {
      const pct = Math.max(0, Math.min(100, this.scores[i] || 0));
      const scale = 0.65 + (pct / 100) * 1.05;
      m.dot.scale.setScalar(scale);
      m.halo.scale.setScalar(0.3 + (pct / 100) * 0.5);
      m.halo.material.opacity = 0.22 + (pct / 100) * 0.45;
    });

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    clearTimeout(this._resumeTimer);
    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this._onDown);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    if (this._ro) this._ro.disconnect();
    this.renderer.dispose();
    if (dom.parentNode) dom.parentNode.removeChild(dom);
  }
}

let current = null;
function initSphereCompass(container, topics, scores, opts) {
  if (current) { current.dispose(); current = null; }
  try {
    current = new SphereCompass(container, topics, scores, opts);
    return current;
  } catch (err) {
    console.error('Sphere compass init failed', err);
    return null;
  }
}

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

let resolveReady;
window.LC_sphereReady = new Promise((res) => { resolveReady = res; });
window.LC_sphere = { init: initSphereCompass, supportsWebGL };
resolveReady(window.LC_sphere);
