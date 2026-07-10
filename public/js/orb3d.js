// A real WebGL shader orb for the Coach voice UI, replacing the flat blurred-CSS-gradient blob.
// A single icosahedron surface is displaced per-vertex by a time-varying noise field; amplitude,
// speed, and color respond to idle/listening/thinking/speaking so the orb actually reads as
// "alive" rather than a gradient that fades into nothing. Three.js is vendored locally (see
// sphere3d.js for the same rationale) and loaded as an ES module.
import * as THREE from './vendor/three.module.min.js';

function cssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

const VERTEX_SHADER = `
  uniform float uTime;
  uniform float uAmp;
  uniform float uFreq;
  varying vec3 vNormalView;
  varying float vDisp;

  float wobble(vec3 p) {
    return sin(p.x * 1.7 + uTime * 1.3)
         * sin(p.y * 1.9 - uTime * 1.15)
         * sin(p.z * 2.3 + uTime * 0.8);
  }

  void main() {
    vNormalView = normalize(normalMatrix * normal);
    float n = wobble(normal * uFreq);
    vDisp = n;
    vec3 newPos = position + normal * (n * uAmp);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPos, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vNormalView;
  varying float vDisp;

  void main() {
    float fresnel = pow(1.0 - clamp(abs(vNormalView.z), 0.0, 1.0), 2.4);
    vec3 base = mix(uColorA, uColorB, clamp(vDisp * 1.6 + 0.5, 0.0, 1.0));
    vec3 col = base + fresnel * 0.55;
    gl_FragColor = vec4(col, 0.96);
  }
`;

const STATE_PARAMS = {
  idle: { amp: 0.05, freq: 1.6, speed: 0.5, scale: 1.0 },
  listening: { amp: 0.11, freq: 2.1, speed: 1.1, scale: 1.05 },
  thinking: { amp: 0.09, freq: 2.8, speed: 2.0, scale: 1.0 },
  speaking: { amp: 0.16, freq: 2.2, speed: 1.6, scale: 1.08 },
};

class VoiceOrb3D {
  constructor(container) {
    this.container = container;
    this.state = 'idle';
    this._target = { ...STATE_PARAMS.idle };
    this._current = { ...STATE_PARAMS.idle };
    this._disposed = false;
    this._buildScene();
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
    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 10);
    this.camera.position.set(0, 0, 3.1);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.domElement.className = 'orb-canvas';
    this.container.appendChild(this.renderer.domElement);

    const accent = new THREE.Color(cssVar('--accent', '#5b5fef'));
    const accent2 = new THREE.Color(cssVar('--accent-2', '#14b8a6'));

    this.uniforms = {
      uTime: { value: 0 },
      uAmp: { value: STATE_PARAMS.idle.amp },
      uFreq: { value: STATE_PARAMS.idle.freq },
      uColorA: { value: accent },
      uColorB: { value: accent2 },
    };
    const geo = new THREE.IcosahedronGeometry(1, 24);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms, vertexShader: VERTEX_SHADER, fragmentShader: FRAGMENT_SHADER, transparent: true,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.mesh);

    // Soft outer halo to sell "glow" beyond the mesh silhouette (same additive-backside trick
    // used by the sphere compass, kept cheap rather than a full bloom postprocess pass).
    const glowGeo = new THREE.SphereGeometry(1.35, 24, 24);
    this.glowMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.22, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
    this.glow = new THREE.Mesh(glowGeo, this.glowMat);
    this.scene.add(this.glow);
  }

  setState(state) {
    this.state = STATE_PARAMS[state] ? state : 'idle';
    this._target = { ...STATE_PARAMS[this.state] };
  }

  refreshTheme() {
    this.uniforms.uColorA.value.set(cssVar('--accent', '#5b5fef'));
    this.uniforms.uColorB.value.set(cssVar('--accent-2', '#14b8a6'));
    this.glowMat.color.set(cssVar('--accent', '#5b5fef'));
  }

  _onResize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _animate(t) {
    if (this._disposed) return;
    this._raf = requestAnimationFrame(this._animate);
    const dt = 0.016;
    ['amp', 'freq', 'speed', 'scale'].forEach((k) => {
      this._current[k] += (this._target[k] - this._current[k]) * 0.08;
    });
    this.uniforms.uTime.value += dt * this._current.speed;
    this.uniforms.uAmp.value = this._current.amp;
    this.uniforms.uFreq.value = this._current.freq;
    const s = this._current.scale;
    this.mesh.scale.setScalar(s);
    this.glow.scale.setScalar(s);
    this.mesh.rotation.y += 0.0018 * this._current.speed;
    this.mesh.rotation.x += 0.0009 * this._current.speed;
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this._disposed = true;
    cancelAnimationFrame(this._raf);
    if (this._ro) this._ro.disconnect();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  }
}

function mountOrb(container) {
  try {
    return new VoiceOrb3D(container);
  } catch (err) {
    console.error('Voice orb 3D init failed', err);
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
window.LC_orbReady = new Promise((res) => { resolveReady = res; });
window.LC_orb = { mount: mountOrb, supportsWebGL };
resolveReady(window.LC_orb);
