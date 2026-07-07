"use client";

import { useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, Line, OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { ContentGapBlueprint, SemanticPoint } from "@/types/geo";

const PAGE_COLOR = "#4fd6ff";
const QUERY_COLOR = "#ffb454";
const GAP_COLOR = "#ff4d6d";

interface SemanticCanvasProps {
  points: SemanticPoint[];
  gaps: ContentGapBlueprint[];
}

function distance(
  a: [number, number, number],
  b: [number, number, number],
): number {
  return Math.sqrt(
    (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2,
  );
}

function Node({
  point,
  active,
  onHover,
}: {
  point: SemanticPoint;
  active: boolean;
  onHover: (id: string | null) => void;
}) {
  const color = point.kind === "page" ? PAGE_COLOR : QUERY_COLOR;
  const size = point.kind === "page" ? 0.32 : 0.22;

  return (
    <group position={[point.x, point.y, point.z]}>
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(point.id);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHover(null);
        }}
      >
        <sphereGeometry args={[size, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={active ? 2.6 : 1.1}
          toneMapped={false}
        />
      </mesh>
      {active && (
        <Html distanceFactor={10} style={{ pointerEvents: "none" }}>
          <div className="rounded-md bg-black/80 px-2 py-1 text-xs whitespace-nowrap text-white border border-white/10 shadow-lg">
            <span className="opacity-60 mr-1">
              {point.kind === "page" ? "PAGE" : "QUERY"}
            </span>
            {point.label}
          </div>
        </Html>
      )}
    </group>
  );
}

function GapMarker({ gap }: { gap: ContentGapBlueprint }) {
  const radius = 0.8 + gap.strength * 1.4;
  return (
    <group position={gap.center}>
      <mesh>
        <sphereGeometry args={[radius, 20, 20]} />
        <meshBasicMaterial
          color={GAP_COLOR}
          transparent
          opacity={0.09}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial
          color={GAP_COLOR}
          emissive={GAP_COLOR}
          emissiveIntensity={2}
          toneMapped={false}
        />
      </mesh>
      <Html distanceFactor={12} style={{ pointerEvents: "none" }}>
        <div className="rounded-md bg-red-950/80 px-2 py-1 text-[11px] whitespace-nowrap text-red-200 border border-red-500/30">
          {gap.title}
        </div>
      </Html>
    </group>
  );
}

function Edges({ points }: { points: SemanticPoint[] }) {
  const pages = points.filter((p) => p.kind === "page");
  const queries = points.filter((p) => p.kind === "query");

  const links = useMemo(() => {
    if (pages.length === 0) return [];
    return queries.map((q) => {
      const nearest = [...pages].sort(
        (a, b) =>
          distance([q.x, q.y, q.z], [a.x, a.y, a.z]) -
          distance([q.x, q.y, q.z], [b.x, b.y, b.z]),
      )[0];
      return { from: q, to: nearest };
    });
  }, [pages, queries]);

  return (
    <>
      {links.map((link, i) => (
        <Line
          key={i}
          points={[
            [link.from.x, link.from.y, link.from.z],
            [link.to.x, link.to.y, link.to.z],
          ]}
          color="#5b6b7c"
          lineWidth={0.6}
          transparent
          opacity={0.35}
        />
      ))}
    </>
  );
}

export default function SemanticCanvas({ points, gaps }: SemanticCanvasProps) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-white/10 bg-[#05070c]">
      <Canvas camera={{ position: [14, 10, 14], fov: 45 }}>
        <color attach="background" args={["#05070c"]} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={40} />
        <Stars radius={60} depth={30} count={1200} factor={2} fade speed={0.5} />

        <Edges points={points} />

        {points.map((point) => (
          <Node
            key={point.id}
            point={point}
            active={hovered === point.id}
            onHover={setHovered}
          />
        ))}

        {gaps.map((gap) => (
          <GapMarker key={gap.id} gap={gap} />
        ))}

        <OrbitControls enableDamping dampingFactor={0.08} />
        <EffectComposer>
          <Bloom
            intensity={0.9}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
