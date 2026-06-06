import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const QRScanner = lazy(() => import("./components/QRScanner"));
const ARScene = lazy(() => import("./components/ARScene"));

export default function App() {
  return (
    <Suspense fallback={<main className="page"><section className="panel">Loading...</section></main>}>
      <Routes>
        <Route path="/" element={<QRScanner />} />
        <Route path="/scene/:characterId" element={<ARScene />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
