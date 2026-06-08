/**
 * TalkingAvatar.tsx — Avatar 3D thérapeute qui parle
 * Ready Player Me (.glb) + react-three-fiber
 * Lip-sync par animation de la mâchoire + clignement + micro-mouvements doux
 * Optimisé TDAH : mouvements lents et apaisants, jamais brusques
 */
import { Suspense, useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { DEFAULT_AVATARS } from './avatarConstants';

export { DEFAULT_AVATARS };

interface AvatarModelProps {
  url: string;
  speaking: boolean;
  emotion?: string; // 'calme' | 'anxieux' | 'joyeux' | 'neutre'
}

function AvatarModel({ url, speaking, emotion = 'neutre' }: AvatarModelProps) {
  const group = useRef<THREE.Group>(null);
  const { scene } = useGLTF(url);
  const headBone = useRef<THREE.Object3D | null>(null);
  const morphMeshes = useRef<THREE.Mesh[]>([]);

  // Trouver les meshes avec morph targets (bouche, yeux) + l'os de la tête
  useEffect(() => {
    morphMeshes.current = [];
    scene.traverse((obj: any) => {
      if (obj.isMesh && obj.morphTargetDictionary) {
        morphMeshes.current.push(obj);
      }
      if (obj.isBone && (obj.name === 'Head' || obj.name === 'head')) {
        headBone.current = obj;
      }
    });
  }, [scene]);

  // Helper : appliquer une valeur à un morph target par nom
  const setMorph = (mesh: any, names: string[], value: number) => {
    if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
    for (const name of names) {
      const idx = mesh.morphTargetDictionary[name];
      if (idx !== undefined) {
        mesh.morphTargetInfluences[idx] = THREE.MathUtils.lerp(
          mesh.morphTargetInfluences[idx], value, 0.3
        );
      }
    }
  };

  const blinkTimer = useRef(0);
  const nextBlink = useRef(2 + Math.random() * 3);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // ── Micro-mouvement de tête doux (respiration / présence) ──
    if (headBone.current) {
      headBone.current.rotation.y = Math.sin(t * 0.4) * 0.04;
      headBone.current.rotation.x = Math.sin(t * 0.3) * 0.02;
    }
    if (group.current) {
      // léger balancement du corps
      group.current.position.y = -1.55 + Math.sin(t * 0.6) * 0.005;
    }

    for (const mesh of morphMeshes.current) {
      // ── Lip-sync : bouche s'ouvre/ferme pendant la parole ──
      if (speaking) {
        // Mouvement de bouche crédible (mix de fréquences)
        const mouth = (Math.sin(t * 12) * 0.5 + 0.5) * (Math.sin(t * 7) * 0.3 + 0.5);
        setMorph(mesh, ['jawOpen', 'mouthOpen', 'viseme_aa'], mouth * 0.5);
        setMorph(mesh, ['viseme_O'], Math.max(0, Math.sin(t * 9)) * 0.2);
      } else {
        setMorph(mesh, ['jawOpen', 'mouthOpen', 'viseme_aa', 'viseme_O'], 0);
      }

      // ── Clignement des yeux ──
      blinkTimer.current += delta;
      let blink = 0;
      if (blinkTimer.current > nextBlink.current) {
        const phase = blinkTimer.current - nextBlink.current;
        if (phase < 0.15) {
          blink = Math.sin((phase / 0.15) * Math.PI);
        } else {
          blinkTimer.current = 0;
          nextBlink.current = 2 + Math.random() * 3;
        }
      }
      setMorph(mesh, ['eyeBlinkLeft', 'eyesClosed'], blink);
      setMorph(mesh, ['eyeBlinkRight'], blink);

      // ── Expression selon l'émotion ──
      if (emotion === 'joyeux') {
        setMorph(mesh, ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'], 0.35);
      } else if (emotion === 'calme') {
        setMorph(mesh, ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'], 0.15);
      } else {
        setMorph(mesh, ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight'], 0.05);
      }
    }
  });

  return (
    <group ref={group} position={[0, -1.55, 0]}>
      <primitive object={scene} />
    </group>
  );
}

// Fallback pendant le chargement
function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.3, 16, 16]} />
      <meshStandardMaterial color="#5eead4" wireframe />
    </mesh>
  );
}

export default function TalkingAvatar({ url, speaking, emotion }: {
  url?: string; speaking: boolean; emotion?: string;
}) {
  const modelUrl = useMemo(() => {
    if (!url) return DEFAULT_AVATARS.FEMME;
    // Forcer le chargement des morph targets + textures
    return url.includes('?') ? url : `${url}?morphTargets=ARKit,Oculus%20Visemes&textureAtlas=1024`;
  }, [url]);

  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 0.05, 0.75], fov: 28 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.8} />
        <directionalLight position={[2, 3, 2]} intensity={1.1} />
        <directionalLight position={[-2, 1, 1]} intensity={0.4} color="#a5f3fc" />
        <Suspense fallback={<LoadingFallback />}>
          <AvatarModel url={modelUrl} speaking={speaking} emotion={emotion} />
          <Environment preset="apartment" />
        </Suspense>
      </Canvas>
    </div>
  );
}

// Précharger les avatars par défaut (sécurisé)
try {
  useGLTF.preload(DEFAULT_AVATARS.FEMME + '?morphTargets=ARKit,Oculus%20Visemes');
  useGLTF.preload(DEFAULT_AVATARS.HOMME + '?morphTargets=ARKit,Oculus%20Visemes');
} catch { /* preload optionnel */ }
