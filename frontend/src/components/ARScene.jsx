import { Suspense, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { getCharacter, getHealth } from "../lib/api";
import QuestPanel from "./QuestPanel";

function CharacterModel({ modelUrl, markerDetected }) {
  if (!markerDetected) {
    return null;
  }

  if (modelUrl) {
    return <LoadedModel modelUrl={modelUrl} />;
  }

  return <FallbackModel />;
}

function LoadedModel({ modelUrl }) {
  const gltf = useGLTF(modelUrl);

  return <primitive object={gltf.scene} scale={1.3} position={[0, -1.2, 0]} />;
}

function FallbackModel() {
  const meshRef = useRef(null);

  useFrame(({ clock }, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.8;
      meshRef.current.position.y = Math.sin(clock.elapsedTime * 2) * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} name="fallback-character" position={[0, 0, 0]}>
      <capsuleGeometry args={[0.45, 1.1, 8, 16]} />
      <meshStandardMaterial color="#8b5cf6" />
    </mesh>
  );
}

function SceneContent({ markerDetected, modelUrl }) {
  return (
    <>
      <ambientLight intensity={1.4} />
      <directionalLight position={[2, 3, 2]} intensity={2} />
      <gridHelper args={[10, 10, "#7c3aed", "#1f2937"]} position={[0, -1.4, 0]} />
      <Suspense
        fallback={
          <Html center>
            <div className="hud-card">Loading model...</div>
          </Html>
        }
      >
        <CharacterModel markerDetected={markerDetected} modelUrl={modelUrl} />
      </Suspense>
      <OrbitControls enablePan={false} />
    </>
  );
}

export default function ARScene() {
  const { characterId } = useParams();
  const [character, setCharacter] = useState(null);
  const [status, setStatus] = useState("Loading character scene...");
  const [apiStatus, setApiStatus] = useState("Checking backend...");
  const [markerDetected, setMarkerDetected] = useState(false);

  useEffect(() => {
    getCharacter(characterId)
      .then((payload) => {
        setCharacter(payload);
        setStatus("Allow camera access and point it at the scene marker.");
      })
      .catch((error) => {
        setStatus(`Could not load character. ${error.message}`);
      });

    getHealth()
      .then(() => setApiStatus("Backend connected"))
      .catch(() => setApiStatus("Backend unavailable"));
  }, [characterId]);

  return (
    <main className="page page-scene">
      <section className="panel scene-header">
        <div>
          <p className="eyebrow">Character Scene</p>
          <h1>{character?.name || characterId}</h1>
          <p className="muted">{status}</p>
        </div>
        <Link to="/" className="text-link">
          Scan another QR
        </Link>
      </section>

      <section className="scene-shell">
        <div className="video-layer">
          <div className="camera-placeholder">
            <p>Camera feed and MindAR marker tracking mount here.</p>
            <p className="muted">Current MVP fallback uses a 3D preview canvas while the tracking layer is being wired.</p>
          </div>
          <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
            <SceneContent markerDetected={markerDetected} modelUrl={character?.modelUrl} />
          </Canvas>
        </div>

        <div className="hud-stack">
          <div className="panel hud-card">
            <p className="status-chip">{apiStatus}</p>
            <p className="muted">Marker status: {markerDetected ? "detected" : "not detected"}</p>
            <button type="button" onClick={() => setMarkerDetected((value) => !value)}>
              {markerDetected ? "Hide Character" : "Simulate Marker Detection"}
            </button>
          </div>
          <QuestPanel characterId={characterId} characterName={character?.name || characterId} />
        </div>
      </section>
    </main>
  );
}
