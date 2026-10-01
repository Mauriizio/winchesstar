import { assetUrl, type SpriteSpec } from "../data/catalog";
export function Piece({
  sprite,
  className = "",
  x,
  y,
  size,
  onError,
}: {
  sprite: SpriteSpec;
  className?: string;
  x?: number;
  y?: number;
  size?: number;
  onError?: () => void;
}) {
  const c = sprite.crop;
  return (
    <svg
      className={`piece ${className}`}
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox={`${c.x} ${c.y} ${c.width} ${c.height}`}
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
      style={{
        pointerEvents: "none",
        ...(size ? { width: size, height: size } : {}),
      }}
    >
      <image
        href={assetUrl(sprite)}
        width={sprite.sourceWidth}
        height={sprite.sourceHeight}
        onError={onError}
      />
    </svg>
  );
}
