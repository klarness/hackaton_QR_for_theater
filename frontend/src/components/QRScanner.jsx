import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";

function extractCharacterId(value) {
  if (!value) {
    return "dragon";
  }

  try {
    const url = new URL(value);
    return url.searchParams.get("character") || url.pathname.split("/").pop() || "dragon";
  } catch {
    return value;
  }
}

export default function QRScanner() {
  const navigate = useNavigate();
  const scannerRef = useRef(null);
  const [status, setStatus] = useState("Request camera access to scan a QR code.");
  const [manualCharacterId, setManualCharacterId] = useState("dragon");

  useEffect(() => {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;
    let active = true;

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!active) {
            return;
          }

          const characterId = extractCharacterId(decodedText);
          setStatus(`QR detected. Opening ${characterId} scene.`);
          active = false;
          scanner.stop().catch(() => undefined);
          navigate(`/scene/${characterId}`);
        },
        () => undefined,
      )
      .then(() => {
        if (active) {
          setStatus("Point the camera at a QR code.");
        }
      })
      .catch((error) => {
        setStatus(`Camera unavailable. ${error}`);
      });

    return () => {
      active = false;

      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => undefined);
      }
    };
  }, [navigate]);

  return (
    <main className="page page-scanner">
      <section className="panel hero-panel">
        <p className="eyebrow">Theater QR Quest</p>
        <h1>Scan the entrance code</h1>
        <p className="muted">Open the camera, scan a QR code, then continue into the AR character scene.</p>
      </section>

      <section className="panel scanner-panel">
        <div id="qr-reader" className="scanner-frame" />
        <p className="status-line">{status}</p>
      </section>

      <section className="panel manual-panel">
        <label htmlFor="characterId">Fallback character id</label>
        <div className="manual-row">
          <input
            id="characterId"
            value={manualCharacterId}
            onChange={(event) => setManualCharacterId(event.target.value)}
            placeholder="dragon"
          />
          <button type="button" onClick={() => navigate(`/scene/${manualCharacterId || "dragon"}`)}>
            Open Scene
          </button>
        </div>
      </section>
    </main>
  );
}
