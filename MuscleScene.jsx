import React, { useRef, useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { MUSCLES, MUSCLE_BY_ID, LIMBS } from './muscles';

// Stylised procedural anatomy model (no external GLB needed). All 14 muscle groups are separate, selectable meshes.
const DIST = 6.4;
const VIEWS = { front: [0, 0.15, DIST], back: [0, 0.15, -DIST], left: [-DIST, 0.15, 0], right: [DIST, 0.15, 0] };
const TARGET = new THREE.Vector3(0, 0.1, 0);
const SKIN = '#e6dfd7';

function Limb({ a, b, r }) {
  const { pos, quat, len } = useMemo(() => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), dir = vb.clone().sub(va);
    const len = dir.length();
    return { pos: va.clone().add(vb).multiplyScalar(0.5), quat: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()), len };
  }, [a, b]);
  return <mesh position={pos} quaternion={quat}><capsuleGeometry args={[r, Math.max(len - 2 * r, 0.01), 8, 16]}/><meshStandardMaterial color={SKIN} roughness={0.85}/></mesh>;
}

function MuscleMesh({ shape, sign, muscle, selected, hovered, onSelect, onHover }) {
  return <mesh position={[shape.p[0] * sign, shape.p[1], shape.p[2]]} scale={shape.s}
    onClick={e => { e.stopPropagation(); onSelect(muscle.id); }}
    onPointerOver={e => { e.stopPropagation(); onHover(muscle.id); document.body.style.cursor = 'pointer'; }}
    onPointerOut={() => { onHover(null); document.body.style.cursor = 'auto'; }}>
    <sphereGeometry args={[1, 28, 20]}/>
    <meshStandardMaterial color={selected ? '#22c55e' : hovered ? '#e0a79e' : '#cf9b92'} emissive={selected ? '#15803d' : '#000000'}
      emissiveIntensity={selected ? 0.45 : 0} roughness={0.55}/>
  </mesh>;
}

function NameTag({ id }) {
  const { camera } = useThree();
  const [show, setShow] = useState(true);
  const m = MUSCLE_BY_ID[id], sh = m.shapes[0];
  useFrame(() => {
    const facing = sh.side === 'both' || Math.abs(camera.position.z) < 1.5 || (sh.p[2] > 0) === (camera.position.z > 0);
    if (facing !== show) setShow(facing);
  });
  if (!show) return null;
  return <Html position={[sh.p[0], sh.p[1], sh.p[2] + (sh.p[2] >= 0 ? 0.25 : -0.25)]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
    <div className="muscle-tag">{m.name}</div></Html>;
}

const Controller = forwardRef(function Controller(_, ref) {
  const { camera } = useThree();
  const controls = useRef(), goal = useRef(null);
  const aim = (x, z, y) => { goal.current = { az: Math.atan2(x, z), r: Math.hypot(x, z), y }; };
  useImperativeHandle(ref, () => ({
    setView: n => aim(VIEWS[n][0], VIEWS[n][2], VIEWS[n][1]),
    reset: () => aim(...[VIEWS.front[0], VIEWS.front[2], VIEWS.front[1]]),
    zoom: f => { const c = camera.position, r = THREE.MathUtils.clamp(Math.hypot(c.x, c.z) * f, 3.2, 9); goal.current = { az: Math.atan2(c.x, c.z), r, y: c.y }; }
  }));
  useFrame(() => {
    const g = goal.current; if (!g) return;
    const c = camera.position, r = Math.hypot(c.x, c.z), az = Math.atan2(c.x, c.z);
    let d = g.az - az; d = Math.atan2(Math.sin(d), Math.cos(d));   // shortest way round: never cuts through the body
    const k = 0.14, naz = az + d * k, nr = r + (g.r - r) * k, ny = c.y + (g.y - c.y) * k;
    if (Math.abs(d) < 0.01 && Math.abs(g.r - r) < 0.02 && Math.abs(g.y - c.y) < 0.02) { c.set(Math.sin(g.az) * g.r, g.y, Math.cos(g.az) * g.r); goal.current = null; }
    else c.set(Math.sin(naz) * nr, ny, Math.cos(naz) * nr);
    controls.current?.update();
  });
  return <OrbitControls ref={controls} target={TARGET.toArray()} enablePan={false} minDistance={3.2} maxDistance={9} onStart={() => { goal.current = null; }}/>;
});

class Boundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-fallback">3D view is not available in this browser (WebGL is required). Use the muscle list on the right instead.</div> : this.props.children; }
}

export default function MuscleScene({ selectedId, onSelect, apiRef }) {
  const [hovered, setHovered] = useState(null);
  const limbs = useMemo(() => LIMBS.flatMap(([a, b, r], i) => [1, -1].map(sg => ({ k: i + '' + sg, a: [a[0] * sg, a[1], a[2]], b: [b[0] * sg, b[1], b[2]], r }))), []);
  const label = hovered || selectedId;
  return <div className="scene-wrap">
    <Boundary>
      <Canvas camera={{ position: VIEWS.front, fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={1.15}/><directionalLight position={[3, 5, 5]} intensity={1.6}/><directionalLight position={[-3, 2, -5]} intensity={0.9}/>
        <group>
          <mesh position={[0, 1.58, 0.02]}><sphereGeometry args={[0.25, 28, 20]}/><meshStandardMaterial color={SKIN}/></mesh>
          <mesh position={[0, 1.38, 0]}><cylinderGeometry args={[0.1, 0.12, 0.2, 16]}/><meshStandardMaterial color={SKIN}/></mesh>
          <mesh position={[0, 0.62, 0]} scale={[0.56, 0.82, 0.3]}><sphereGeometry args={[1, 32, 24]}/><meshStandardMaterial color={SKIN} roughness={0.85}/></mesh>
          <mesh position={[0, 0, 0]} scale={[0.5, 0.28, 0.3]}><sphereGeometry args={[1, 28, 20]}/><meshStandardMaterial color={SKIN} roughness={0.85}/></mesh>
          {limbs.map(l => <Limb key={l.k} a={l.a} b={l.b} r={l.r}/>)}
          {MUSCLES.map(m => m.shapes.map((sh, i) => (sh.mirror ? [1, -1] : [1]).map(sg =>
            <MuscleMesh key={m.id + i + sg} shape={sh} sign={sg} muscle={m} selected={selectedId === m.id} hovered={hovered === m.id} onSelect={onSelect} onHover={setHovered}/>)))}
          {label && <NameTag key={label} id={label}/>}
        </group>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.72, 0]}><circleGeometry args={[1.6, 48]}/><meshStandardMaterial color="#ecebe8"/></mesh>
        <Controller ref={apiRef}/>
      </Canvas>
    </Boundary>
    <div className="scene-hint">Drag to rotate · Scroll or pinch to zoom · Tap a muscle</div>
  </div>;
}
