import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Admin   from "./Admin.jsx";    // rename kiosk-admin-v2.jsx → Admin.jsx
import Display from "./Display.jsx";  // rename kiosk-display.jsx  → Display.jsx

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Admin />}   />
        <Route path="/display" element={<Display />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
