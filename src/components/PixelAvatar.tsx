import { useMemo } from "react";
import { AvatarState, renderAvatarSVG, RenderOpts } from "../lib/avatar";

interface Props extends RenderOpts {
  state: AvatarState;
  /** CSS width, e.g. 96. Height follows the sprite's aspect ratio. */
  width?: number;
  className?: string;
}

/** Renders an evolving pixel avatar. SVG markup is generated purely from the
 * bundled sprite data (never from user input), so injecting it is safe. */
export function PixelAvatar({ state, width, className, ...opts }: Props) {
  const svg = useMemo(
    () => renderAvatarSVG(state, opts),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(state), opts.scale, opts.background, opts.title]
  );
  return (
    <div
      className={`pixel-avatar${className ? ` ${className}` : ""}`}
      style={width ? { width, lineHeight: 0 } : { lineHeight: 0 }}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
