"use client";

import { loadImageFromUrl } from "@/helpers/client/common";
import { useEffect, useRef } from "react";

export default function OgImageGenPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      (async () => {
        const ctx = canvas.getContext("2d");

        if (ctx) {
          // Background
          ctx.fillStyle = "#1a202c";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Main background image
          const background = await loadImageFromUrl(
            "https://hopeflow.org/_next/image?url=https%3A%2F%2Fpub-7027dcead7294deeacde6da1a50ed32f.r2.dev%2Fquests%2F3c9706d3-8710-46b1-a854-b5dac8b64321%2Fmedia%2Fa51a7f15-530d-40ea-918f-03d72501475c.png&w=1080&q=75",
          );
          ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

          // --- Bottom gradient overlay (darker green, 40% of height) ---
          const gradientHeight = canvas.height * 0.5;
          const gradient = ctx.createLinearGradient(
            0,
            canvas.height, // bottom
            0,
            canvas.height - gradientHeight, // up
          );

          // Darker green at bottom, transparent at top
          gradient.addColorStop(0, "#0b704f");
          gradient.addColorStop(0.3, "#0b704f");
          gradient.addColorStop(1, "rgba(11, 112, 79, 0)");

          ctx.fillStyle = gradient;
          ctx.fillRect(
            0,
            canvas.height - gradientHeight,
            canvas.width,
            gradientHeight,
          );

          // --- Wordmark (top-left) ---
          const wordmark = await loadImageFromUrl("/img/wordmark.svg");
          const wordmarkTargetWidth = canvas.width * 0.22;
          const wordmarkTargetHeight =
            (wordmark.height / wordmark.width || 0.25) * wordmarkTargetWidth;

          const wordmarkPadding = 24;

          // Add shadow behind wordmark
          ctx.save();
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)"; // soft dark shadow
          ctx.shadowBlur = 18;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;

          ctx.drawImage(
            wordmark,
            wordmarkPadding,
            wordmarkPadding,
            wordmarkTargetWidth,
            wordmarkTargetHeight,
          );

          ctx.restore(); // Prevent shadow from affecting other drawings

          // --- Avatars row (centered both horizontally & vertically) ---
          const avatarIndexes = [1, 2, 3];
          const avatarNames = ["Kevin", "Omar", "Sarah"];

          const avatarImages = await Promise.all(
            avatarIndexes.map((i) => loadImageFromUrl(`/img/avatar${i}.jpeg`)),
          );

          const avatarCount = avatarImages.length;
          const avatarDiameter = Math.min(
            canvas.width / (avatarCount * 2),
            canvas.height * 0.18,
          );
          const avatarRadius = avatarDiameter / 2;

          // Layout: we treat "avatar row + text" as a vertical block and center that block.
          const textHeight = 30;
          const verticalBlockHeight = avatarDiameter + 8 + textHeight;
          const blockTop = canvas.height / 2 - verticalBlockHeight / 2;
          const centerY = blockTop + avatarRadius;
          const textY = blockTop + avatarDiameter + textHeight;

          // Horizontal centering of avatars
          const spacing = avatarDiameter * 1.6;
          const totalWidth = spacing * (avatarCount - 1);
          const firstCenterX = canvas.width / 2 - totalWidth / 2;

          // --- Connecting line between avatars (behind them) ---
          ctx.save();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath();
          ctx.moveTo(firstCenterX, centerY);
          ctx.lineTo(firstCenterX + spacing * (avatarCount - 1), centerY);
          ctx.stroke();
          ctx.restore();

          // --- Draw avatars and names ---
          ctx.font =
            "bold 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#ffffff";

          avatarImages.forEach((img, index) => {
            const cx = firstCenterX + index * spacing;
            const cy = centerY;

            // circular clip for avatar image
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, avatarRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(
              img,
              cx - avatarRadius,
              cy - avatarRadius,
              avatarDiameter,
              avatarDiameter,
            );
            ctx.restore();

            // white ring around avatar
            ctx.beginPath();
            ctx.arc(cx, cy, avatarRadius + 4, 0, Math.PI * 2);
            ctx.lineWidth = 4;
            ctx.strokeStyle = "#ffffff";
            ctx.stroke();

            // name under avatar
            const name = avatarNames[index];
            ctx.fillText(name, cx, textY);
          });

          ctx.font =
            "22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            "Alex is waiting for your contribution to keep hope flowing",
            canvas.width / 2,
            0.75 * canvas.height,
          );

          ctx.font =
            "18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText("500 credences", canvas.width - 24, canvas.height - 24);
        }
      })();
    }
  }, []);
  return (
    <div>
      <canvas
        className="h-auto w-full"
        ref={canvasRef}
        width={1024}
        height={576}
      />
    </div>
  );
}
