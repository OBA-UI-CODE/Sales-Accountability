import { ImageResponse } from "next/og";

// Browser-tab favicon: a rounded-square mark with a bold "T" for T-Max
// Store, in SaleBook's own accent blue — same "letterform on a rounded
// square" language as JOHTA's icon, just this app's colour and initial.

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
          background: "#3d7dff",
          borderRadius: 7,
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: "#ffffff",
            lineHeight: 1,
            marginTop: -1,
          }}
        >
          T
        </span>
      </div>
    ),
    { ...size },
  );
}
