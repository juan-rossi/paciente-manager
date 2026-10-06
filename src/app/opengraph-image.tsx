import { ImageResponse } from "next/og";

export const alt = "Semio360 — Tu consultorio. Más simple. Más conectado.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%)",
          color: "white",
        }}
      >
        <div style={{ display: "flex", fontSize: 40, fontWeight: 700, opacity: 0.85 }}>Semio360</div>
        <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.1, marginTop: 24 }}>
          Tu consultorio. Más simple. Más conectado.
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 32, opacity: 0.8 }}>
          Turnos, historia clínica y dictado de la consulta en un solo lugar.
        </div>
      </div>
    ),
    size
  );
}
