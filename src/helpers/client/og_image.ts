import { loadImageFromUrl } from "@/helpers/client/common";
import type { SafeUser } from "@/helpers/server/auth";

type CanvasParts = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

const fillBaseBackground = ({ canvas, ctx }: CanvasParts) => {
  ctx.fillStyle = "#1a202c";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

const drawMainBackgroundImage = async (
  { canvas, ctx }: CanvasParts,
  backgroundUrl: string,
) => {
  const background = await loadImageFromUrl(backgroundUrl);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
};

const applyBottomGradient = ({ canvas, ctx }: CanvasParts) => {
  const gradientHeight = canvas.height * 0.5;
  const gradient = ctx.createLinearGradient(
    0,
    canvas.height,
    0,
    canvas.height - gradientHeight,
  );

  // Original color #0b704f converted to HSV(160.4deg, 90.18%, 43.92%)
  gradient.addColorStop(0, "hsl(160deg 72% 16%)");
  gradient.addColorStop(0.3, "hsl(160deg 72% 16% / 90%)");
  gradient.addColorStop(1, "hsl(160deg 72% 16% / 0%)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);
};

const drawWordmark = async (
  { canvas, ctx }: CanvasParts,
  wordmarkUrl: string,
) => {
  const wordmark = await loadImageFromUrl(wordmarkUrl);
  const wordmarkTargetWidth = canvas.width * 0.22;
  const wordmarkTargetHeight =
    (wordmark.height / wordmark.width || 0.25) * wordmarkTargetWidth;

  const wordmarkPadding = 24;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
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

  ctx.restore();
};

const loadAvatarImages = (avatarUsers: (SafeUser | undefined)[]) =>
  Promise.all(
    avatarUsers.map((user) => user && loadImageFromUrl(user.imageUrl)),
  );

const getAvatarLayout = (canvas: HTMLCanvasElement, avatarCount: number) => {
  const avatarDiameter = Math.min(
    canvas.width / (avatarCount * 2),
    canvas.height * 0.18,
  );
  const avatarRadius = avatarDiameter / 2;
  const textHeight = 30;
  const verticalBlockHeight = avatarDiameter + 8 + textHeight;
  const blockTop = canvas.height / 2 - verticalBlockHeight / 2;
  const centerY = blockTop + avatarRadius;
  const textY = blockTop + avatarDiameter + textHeight;
  const spacing = avatarDiameter * 1.6;
  const totalWidth = spacing * (avatarCount - 1);
  const firstCenterX = canvas.width / 2 - totalWidth / 2;

  return {
    spacing,
    firstCenterX,
    centerY,
    textY,
    avatarRadius,
    avatarDiameter,
  };
};

const drawConnectingLine = (
  ctx: CanvasRenderingContext2D,
  firstCenterX: number,
  centerY: number,
  avatarRadius: number,
  spacing: number,
  avatars: (SafeUser | undefined)[],
) => {
  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.beginPath();
  for (let i = 0; i < avatars.length - 1; i += 1) {
    const x = firstCenterX + i * spacing;
    ctx.moveTo(x + avatarRadius, centerY);
    ctx.lineTo(x + spacing - avatarRadius, centerY);
  }
  ctx.stroke();
  ctx.restore();
};

const drawAvatars = async (
  { canvas, ctx }: CanvasParts,
  avatarUsers: (SafeUser | undefined)[],
) => {
  if (avatarUsers.length === 0) {
    return;
  }

  const maxDisplayedAvatars = 5;
  const shouldCondense = avatarUsers.length > maxDisplayedAvatars;

  const condensedUsers = shouldCondense
    ? [
        avatarUsers[0],
        undefined,
        ...avatarUsers.slice(-(maxDisplayedAvatars - 2)),
      ]
    : avatarUsers;

  const avatarImages = await loadAvatarImages(condensedUsers);
  const {
    spacing,
    firstCenterX,
    centerY,
    textY,
    avatarRadius,
    avatarDiameter,
  } = getAvatarLayout(canvas, condensedUsers.length);

  drawConnectingLine(
    ctx,
    firstCenterX,
    centerY,
    avatarRadius,
    spacing,
    condensedUsers,
  );

  ctx.font =
    "bold 22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";

  for (let slot = 0; slot < condensedUsers.length; slot += 1) {
    const user = condensedUsers[slot];
    const cx = firstCenterX + slot * spacing;
    const cy = centerY;

    if (!user && slot < condensedUsers.length - 1) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(cx - avatarRadius - 2, cy);
      ctx.lineTo(cx + avatarRadius + 2, cy);
      // ctx.arc(cx, cy, avatarRadius + 4, 0, Math.PI * 2);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
      ctx.restore();
      continue;
    }

    const img =
      avatarImages[slot] ?? (await loadImageFromUrl("/img/avatar9.jpeg"));

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

    ctx.beginPath();
    ctx.arc(cx, cy, avatarRadius + 4, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#ffffff";
    ctx.stroke();

    const name = user?.firstName || user?.fullName || "You";
    ctx.fillText(name, cx, textY);
  }
};

const drawFooter = (
  { canvas, ctx }: CanvasParts,
  footerMessage: string,
  footerValue: string,
) => {
  ctx.font = "22px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(footerMessage, canvas.width / 2, 0.75 * canvas.height);

  ctx.font = "18px system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText(footerValue, canvas.width - 24, canvas.height - 24);
};

type DrawConfig = {
  coverPhotoUrl: string;
  wordmarkUrl: string;
  avatarUsers: (SafeUser | undefined)[];
  footerMessage: string;
  rewardMessage: string;
};

export const renderOgImage = async (
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  config: DrawConfig,
) => {
  const {
    coverPhotoUrl: backgroundUrl,
    wordmarkUrl,
    avatarUsers,
    footerMessage,
    rewardMessage: footerValue,
  } = config;

  fillBaseBackground({ canvas, ctx });
  await drawMainBackgroundImage({ canvas, ctx }, backgroundUrl);
  applyBottomGradient({ canvas, ctx });
  await drawWordmark({ canvas, ctx }, wordmarkUrl);
  await drawAvatars({ canvas, ctx }, avatarUsers);
  drawFooter({ canvas, ctx }, footerMessage, footerValue);
};
