import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4F46E5",
          borderRadius: 7,
        }}
      >
        <svg width="21" height="21" viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="30" stroke="#FFFFFF" strokeWidth="5" opacity="0.5" />
          <circle cx="50" cy="20" r="10" fill="#FFFFFF" />
          <circle cx="24" cy="65" r="8" fill="#0EA5E9" />
          <circle cx="76" cy="65" r="8" fill="#10B981" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
