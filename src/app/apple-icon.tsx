import { ImageResponse } from "next/og";

// iOS "Add to Home Screen" icon — same mark as icon.tsx, at the larger size
// Apple expects, with a bit more padding so the corner radius reads at that
// scale (Next auto-derives /apple-icon from this).

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3d7dff",
          borderRadius: 40,
        }}
      >
        <span
          style={{
            fontSize: 124,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1,
            marginTop: -6,
          }}
        >
          T
        </span>
      </div>
    ),
    { ...size },
  );
}
