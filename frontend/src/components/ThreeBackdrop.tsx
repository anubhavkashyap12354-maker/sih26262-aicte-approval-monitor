import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeBackdropProps {
  theme: 'abyss' | 'daylight';
  overdueCount: number;
}

const TH_PALETTES = {
  abyss: {
    bg: '#02080c',
    c1: '#04202c',
    c2: '#0b5a6b',
    c3: '#7ff3ff',
    dots: '#7fe9ef',
    add: true,
  },
  daylight: {
    bg: '#f4f8fb',
    c1: '#dbe9f6',
    c2: '#a9c8f2',
    c3: '#ffffff',
    dots: '#2f6fe0',
    add: false,
  },
};

const NOISE_SHADER = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1.0,0.0)),f.x),mix(h21(i+vec2(0.0,1.0)),h21(i+vec2(1.0,1.0)),f.x),f.y);}
float fbm(vec2 p){float s=0.0,a=0.5;for(int i=0;i<4;i++){s+=a*vn(p);p=p*2.02+vec2(17.3,9.1);a*=0.5;}return s;}
`;

export const ThreeBackdrop: React.FC<ThreeBackdropProps> = ({ theme, overdueCount }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    } catch {
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 7;

    const cur: Record<string, THREE.Color> = {};
    const tgt: Record<string, THREE.Color> = {};
    const initPalette = TH_PALETTES[theme];

    (['bg', 'c1', 'c2', 'c3', 'dots'] as const).forEach((k) => {
      cur[k] = new THREE.Color(initPalette[k]);
      tgt[k] = new THREE.Color(initPalette[k]);
    });

    const bgMat = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uT: { value: 0 },
        uA: { value: 1.6 },
        uM: { value: new THREE.Vector2() },
        uBg: { value: cur.bg },
        uC1: { value: cur.c1 },
        uC2: { value: cur.c2 },
        uC3: { value: cur.c3 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main(){
          vUv=uv;
          gl_Position=vec4(position.xy, 0.9999, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform float uT, uA;
        uniform vec2 uM;
        uniform vec3 uBg, uC1, uC2, uC3;
        ${NOISE_SHADER}
        void main(){
          vec2 p=(vUv-0.5)*vec2(uA, 1.0)*2.2 + uM*0.15;
          float t=uT*0.04;
          vec2 q=vec2(fbm(p+vec2(0.0,t)), fbm(p+vec2(5.2,1.3)-t));
          float f=fbm(p+3.0*q);
          vec3 c=mix(uBg, uC1, smoothstep(0.1, 0.6, f));
          c=mix(c, uC2, smoothstep(0.45, 0.95, f)*0.7);
          c+=uC3*pow(smoothstep(0.55, 1.0, length(q)), 3.0)*0.18;
          c*=1.0-0.4*smoothstep(0.35, 1.1, length(vUv-0.5)*1.4);
          c+=(h21(gl_FragCoord.xy+uT)-0.5)/255.0;
          gl_FragColor=vec4(c, 1.0);
        }
      `,
    });

    const bgMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bgMesh.frustumCulled = false;
    bgMesh.renderOrder = -10;
    scene.add(bgMesh);

    // Drifting particles
    const N = window.matchMedia('(pointer: coarse)').matches ? 300 : 700;
    const pos = new Float32Array(N * 3);
    const sd = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 1;
      sd[i] = Math.random();
    }

    const partGeo = new THREE.BufferGeometry();
    partGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    partGeo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 1));

    const pMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: initPalette.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uT: { value: 0 },
        uP: { value: 0 },
        uS: { value: 900 },
        uC: { value: cur.dots },
      },
      vertexShader: `
        attribute float aSeed;
        uniform float uT, uP, uS;
        varying float vA;
        void main(){
          float y=mod(position.y+5.0+(uT*0.03+uP)*(0.4+aSeed), 10.0)-5.0;
          vec3 p=vec3(position.x+sin(uT*0.2+aSeed*40.0)*0.25, y, position.z);
          vec4 mv=modelViewMatrix*vec4(p, 1.0);
          gl_Position=projectionMatrix*mv;
          float d=max(-mv.z, 0.1);
          gl_PointSize=clamp(0.08*(0.4+aSeed)*uS/d, 1.0, 14.0);
          float q=d*0.06;
          vA=(0.3+0.6*aSeed)*exp(-q*q)*(1.0-smoothstep(4.0, 5.0, abs(y)));
        }
      `,
      fragmentShader: `
        uniform vec3 uC;
        varying float vA;
        void main(){
          float r=length(gl_PointCoord-0.5)*2.0;
          float a=1.0-smoothstep(0.0, 1.0, r);
          gl_FragColor=vec4(uC, a*a*vA*0.8);
        }
      `,
    });

    const pts = new THREE.Points(partGeo, pMat);
    pts.frustumCulled = false;
    scene.add(pts);

    // Torus Rings for Scrutiny / EVC / SAC
    const rings: THREE.Mesh[] = [];
    [1.2, 1.8, 2.4].forEach((r, j) => {
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(r, 0.012, 8, 96),
        new THREE.MeshBasicMaterial({ color: cur.dots, transparent: true, opacity: 0.55 })
      );
      ringMesh.position.set(3.4, 0, -2 - j * 0.6);
      ringMesh.rotation.x = 1.1;
      scene.add(ringMesh);
      rings.push(ringMesh);
    });

    const motion = { p: 0, v: 0, mx: 0, my: 0 };
    let lastY = window.scrollY;
    let push = 0;
    let scaleVal = 1;

    const handleScroll = () => {
      const dy = window.scrollY - lastY;
      lastY = window.scrollY;
      if (!reduced) motion.v = Math.min(3, Math.abs(dy) * 0.03);
    };

    const handleMouseMove = (e: MouseEvent) => {
      motion.mx = (e.clientX / window.innerWidth - 0.5) * 2;
      motion.my = (e.clientY / window.innerHeight - 0.5) * 2;
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      bgMat.uniforms.uA.value = w / h;
      pMat.uniforms.uS.value = (h * renderer.getPixelRatio() * 0.5) / Math.tan((25 * Math.PI) / 180);
      rings.forEach((r) => {
        r.visible = w > 760;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('resize', handleResize);
    handleResize();

    const clock = new THREE.Clock();
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const k = 1 - Math.exp(-dt * 4);

      // Lerp colors towards current palette target
      const pal = TH_PALETTES[theme];
      (['bg', 'c1', 'c2', 'c3', 'dots'] as const).forEach((colorKey) => {
        tgt[colorKey].set(pal[colorKey]);
        cur[colorKey].lerp(tgt[colorKey], k);
      });

      pMat.blending = pal.add ? THREE.AdditiveBlending : THREE.NormalBlending;
      pMat.needsUpdate = true;

      motion.v *= 0.9;
      if (motion.v < 0.01) motion.v = 0;
      push += reduced ? 0 : motion.v * dt * 0.8;
      const T = reduced ? 0 : t;

      bgMat.uniforms.uT.value = T;
      bgMat.uniforms.uM.value.set(motion.mx, -motion.my);
      pMat.uniforms.uT.value = T;
      pMat.uniforms.uP.value = push;

      scaleVal += (1 + Math.min(overdueCount || 0, 12) * 0.03 - scaleVal) * k;
      rings.forEach((r, j) => {
        r.rotation.z += reduced ? 0 : dt * (0.08 + j * 0.04 + motion.v * 0.3);
        r.scale.setScalar(scaleVal);
      });

      camera.position.x += (motion.mx * 0.4 * (reduced ? 0 : 1) - camera.position.x) * (1 - Math.exp(-dt * 3));
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };

    frame();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [theme, overdueCount]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      aria-hidden="true"
    />
  );
};
