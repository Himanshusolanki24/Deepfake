import { ImageResponse } from "next/og";

export const alt = "AUTHENTIQ — Digital Media Authenticity Verification";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "#f7f8fa",
          color: "#111827",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid #dbe2ec",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: "#2563eb",
                transform: "rotate(45deg)",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: 5 }}>
              AUTHENTIQ
            </div>
            <div
              style={{
                fontSize: 15,
                letterSpacing: 4,
                color: "#667085",
                marginTop: 4,
              }}
            >
              DIGITAL MEDIA FORENSICS
            </div>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 46,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: -3,
            lineHeight: 1.02,
          }}
        >
          <span>VERIFY WHAT</span>
          <span>YOU SEE.</span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 26,
            color: "#667085",
            display: "flex",
            gap: 26,
            borderTop: "1px solid #e5e7eb",
            paddingTop: 30,
            width: "100%",
          }}
        >
          <span>Multi-signal evidence</span>
          <span>·</span>
          <span>Calibrated confidence</span>
          <span>·</span>
          <span>Explainable results</span>
        </div>
      </div>
    ),
    { ...size }
  );
}