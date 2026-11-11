/**
 * Anchor table of the card frames: centres (and sizes) of the printed fields – level field, type-icon
 * field, gem socket, art window, name plate – as FRACTIONS OF THE FRAME'S contentBBox (0..1, origin top
 * left). Measured from the pixels of `assets/hd` (dark inner areas of each frame; regenerate with the dev
 * function `__anchors()` from `src/view/layoutAudit.ts` after the art changes). Because they are fractions
 * of the *displayed* frame box, they stay correct at every size (hand ×1, shop ×1.2, zoom ×2.4 …).
 */
export interface Anchor {
  x: number;
  y: number;
  /** field size as a fraction of the frame box */
  w?: number;
  h?: number;
}
export interface FrameAnchors {
  level?: Anchor;
  icon?: Anchor;
  gem?: Anchor;
  art: Anchor;
  name?: Anchor;
}

export const FRAME_ANCHORS: Record<string, FrameAnchors> = {
  card_frame_cpu: { level: { x: 0.26, y: 0.152, w: 0.358, h: 0.141 }, icon: { x: 0.806, y: 0.152, w: 0.225, h: 0.141 }, art: { x: 0.5, y: 0.502, w: 0.711, h: 0.38 }, name: { x: 0.503, y: 0.835, w: 0.74, h: 0.141 } },
  card_frame_gpu: { level: { x: 0.259, y: 0.15, w: 0.366, h: 0.145 }, icon: { x: 0.805, y: 0.15, w: 0.227, h: 0.145 }, art: { x: 0.497, y: 0.502, w: 0.715, h: 0.38 }, name: { x: 0.503, y: 0.833, w: 0.75, h: 0.137 } },
  card_frame_ram: { level: { x: 0.263, y: 0.152, w: 0.364, h: 0.141 }, icon: { x: 0.806, y: 0.152, w: 0.225, h: 0.141 }, art: { x: 0.5, y: 0.502, w: 0.711, h: 0.38 }, name: { x: 0.5, y: 0.833, w: 0.746, h: 0.137 } },
  card_frame_io: { level: { x: 0.26, y: 0.152, w: 0.358, h: 0.141 }, icon: { x: 0.803, y: 0.152, w: 0.22, h: 0.141 }, art: { x: 0.497, y: 0.502, w: 0.717, h: 0.38 }, name: { x: 0.5, y: 0.833, w: 0.746, h: 0.137 } },
  card_frame_hardware: { gem: { x: 0.792, y: 0.161, w: 0.173, h: 0.13 }, art: { x: 0.517, y: 0.487, w: 0.757, h: 0.496 }, name: { x: 0.503, y: 0.854, w: 0.763, h: 0.126 } },
  card_frame_treiber: { art: { x: 0.503, y: 0.511, w: 0.769, h: 0.422 }, name: { x: 0.503, y: 0.848, w: 0.769, h: 0.13 } },
  card_frame_tool: { art: { x: 0.503, y: 0.511, w: 0.769, h: 0.422 }, name: { x: 0.503, y: 0.853, w: 0.636, h: 0.121 } },
  card_frame_software_g: { art: { x: 0.503, y: 0.526, w: 0.786, h: 0.536 }, name: { x: 0.503, y: 0.876, w: 0.821, h: 0.112 } },
  card_frame_software_s: { art: { x: 0.503, y: 0.528, w: 0.785, h: 0.534 }, name: { x: 0.503, y: 0.876, w: 0.82, h: 0.111 } },
};

/** Node-space position (centre of the frame = 0,0) of an anchor in a frame box of w × h. */
export function anchorPos(a: Anchor, w: number, h: number): { x: number; y: number } {
  return { x: (a.x - 0.5) * w, y: (a.y - 0.5) * h };
}
