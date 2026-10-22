/**
 * UI Layer System — screen-space UI rendered on top of the game world.
 *
 * Use this for ALL on-canvas UI (buttons, modals, panels, HUD, menus). Hand-rolling
 * widgets is a defect — every common widget already lives in this template.
 *
 * Positioning: pass `anchor` to pin a widget to a screen region — it can never be
 * off-screen and follows window resizes automatically. Only use raw `x`/`y` for free
 * placement over game objects (a board square, a unit). NEVER hand-compute centering
 * like `(1920 - w) / 2` — that is what `anchor: 'center'` is for.
 *
 *   new Button({ label: 'Start', anchor: 'center' })          // centered, auto-sized
 *   new StatusBar({ anchor: 'top-left', value: hp, max: 100 })
 *   new Panel({ anchor: 'bottom-right', children: [...] })    // auto-sizes to content
 *
 * Layout: group widgets with Panel / VStack / HStack and pass `children` — containers
 * measure and position their children; children need no x/y/width at all.
 *
 * Integration per scene:
 *   const ui = new UILayer();
 *   ui.add(widget);            // insertion order = z-order; add modals last
 *   ui.update(dt);             // from the scene's update hook (required for clicks)
 *   ui.render();               // from the scene's render hook, AFTER the game world
 *
 * Theming: colors/spacing/fonts come from UI_THEME tokens — don't hardcode values.
 */

import { MakkoEngine } from '@makko/engine';

// ============================================================================
// Theme
// ============================================================================

/**
 * Default UI theme design tokens.
 * Customize per game by overriding values at startup (e.g. `UI_THEME.primary`).
 */
export const UI_THEME = {
  // Backgrounds
  background: '#111827',
  surface: '#1f2937',
  surfaceHover: '#374151',

  // Borders
  border: '#374151',
  borderLight: '#4b5563',

  // Text
  text: '#f9fafb',
  textMuted: '#9ca3af',
  textDim: '#6b7280',

  // Primary (buttons, highlights)
  primary: '#3b82f6',
  primaryHover: '#2563eb',
  primaryActive: '#1d4ed8',

  // Accent (selection highlight in menus/lists)
  accent: '#fbbf24',

  // Status bars (semantic colors)
  health: '#22c55e',
  healthLow: '#ef4444',
  mana: '#3b82f6',
  stamina: '#eab308',
  xp: '#a855f7',

  // Semantic feedback colors
  damage: '#ef4444',
  heal: '#22c55e',
  warning: '#f59e0b',

  // Font
  font: {
    family: 'system-ui, -apple-system, sans-serif',
    sizeXs: 10,
    sizeSm: 12,
    sizeMd: 14,
    sizeLg: 18,
    sizeXl: 24,
    size2xl: 32,
  },

  // Spacing
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },

  // Border radius
  radius: {
    sm: 4,
    md: 6,
    lg: 8,
    full: 9999,
  },
};

export type UITheme = typeof UI_THEME;

export type TextSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type TextAlign = 'left' | 'center' | 'right';

/** Pixel size for a TextSize token. */
export function fontSizeOf(size: TextSize): number {
  const sizes: Record<TextSize, number> = {
    xs: UI_THEME.font.sizeXs,
    sm: UI_THEME.font.sizeSm,
    md: UI_THEME.font.sizeMd,
    lg: UI_THEME.font.sizeLg,
    xl: UI_THEME.font.sizeXl,
    '2xl': UI_THEME.font.size2xl,
  };
  return sizes[size];
}

/** Canvas font string for a TextSize token. */
export function fontFor(size: TextSize, bold = false): string {
  return `${bold ? 'bold ' : ''}${fontSizeOf(size)}px ${UI_THEME.font.family}`;
}

/**
 * Resolve a color option: theme token names ('text', 'muted', 'dim', 'primary',
 * 'accent') map to UI_THEME values; any other string passes through as a CSS color.
 */
export function resolveColor(color: string): string {
  switch (color) {
    case 'text': return UI_THEME.text;
    case 'muted': return UI_THEME.textMuted;
    case 'dim': return UI_THEME.textDim;
    case 'primary': return UI_THEME.primary;
    case 'accent': return UI_THEME.accent;
    default: return color;
  }
}

// ============================================================================
// Text measurement (cached)
// ============================================================================

const textWidthCache = new Map<string, number>();
const TEXT_CACHE_MAX = 500;

/**
 * Measure text width with caching — the only sanctioned way widgets measure text.
 * Safe to call every frame for stable strings.
 */
export function measureTextWidth(text: string, font: string): number {
  const key = `${font}|${text}`;
  const cached = textWidthCache.get(key);
  if (cached !== undefined) return cached;
  const width = MakkoEngine.display.measureText(text, { font }).width;
  if (textWidthCache.size >= TEXT_CACHE_MAX) textWidthCache.clear();
  textWidthCache.set(key, width);
  return width;
}

// ============================================================================
// Pointer (unified mouse + touch)
// ============================================================================

export interface PointerState {
  x: number;
  y: number;
  /** Pointer is currently held down */
  down: boolean;
  /** Pointer went down this frame */
  pressed: boolean;
  /** Pointer was released this frame */
  released: boolean;
}

let lastTouchX = 0;
let lastTouchY = 0;

/**
 * Unified mouse+touch pointer, polled per frame.
 * All widget hit-testing goes through this so touch works everywhere mouse does.
 */
export function getPointer(): PointerState {
  const input = MakkoEngine.input;
  const touch = input.touches.length > 0 ? input.touches[0] : null;
  if (touch) {
    lastTouchX = touch.x;
    lastTouchY = touch.y;
  }
  // On the touch-release frame `touches` is already empty — use the cached position.
  if (touch || input.isTouchReleased()) {
    return {
      x: touch ? touch.x : lastTouchX,
      y: touch ? touch.y : lastTouchY,
      down: input.isTouchDown(),
      pressed: input.isTouchPressed(),
      released: input.isTouchReleased(),
    };
  }
  return {
    x: input.mouseX,
    y: input.mouseY,
    down: input.isMouseDown(),
    pressed: input.isMousePressed(),
    released: input.isMouseReleased(),
  };
}

// ============================================================================
// Element contract
// ============================================================================

/**
 * UI Element interface — all UI components implement this.
 * Extend UIWidget instead of implementing this directly: it provides anchoring,
 * sizing, and the layout/update/render protocol for free.
 */
export interface UIElement {
  /** Resolved screen X (top-left, pixels). Computed from anchor when one is set. */
  x: number;
  /** Resolved screen Y (top-left, pixels). */
  y: number;
  /** Whether element is visible and should update/render */
  visible: boolean;
  /** Current laid-out width in pixels */
  getWidth(): number;
  /** Current laid-out height in pixels */
  getHeight(): number;
  /** Resolve own placement and arrange children (containers) */
  layout(): void;
  /** Set true by a parent container when it adopts this element */
  layoutManaged?: boolean;
  /** Optional per-frame update for interactive elements */
  update?(dt: number): void;
  /** Draw the element */
  render(): void;
}

/**
 * Screen region to pin a widget to. Resolved every frame from the live display
 * size, so anchored widgets survive resizes and can never be off-screen.
 */
export type UIAnchor =
  | 'top-left' | 'top' | 'top-right'
  | 'left' | 'center' | 'right'
  | 'bottom-left' | 'bottom' | 'bottom-right';

/**
 * Placement options shared by every widget.
 * - With `anchor`: position is computed from the screen edge/center; `x`/`y` become
 *   fine-tune offsets and `margin` insets from the anchored edges.
 * - Without `anchor`: `x`/`y` are absolute screen pixels (free placement).
 */
export interface UIPlacement {
  anchor?: UIAnchor;
  x?: number;
  y?: number;
  /** Inset from anchored screen edges. Default: UI_THEME.spacing.lg when anchored. */
  margin?: number;
}

// ============================================================================
// UIWidget base class
// ============================================================================

/**
 * Base class for all widgets: anchor placement, sizing, hit-testing, and the
 * layout/update/render protocol. Subclasses implement draw() and the two
 * measure hooks; containers additionally override arrange().
 *
 * Sizing precedence: container-assigned size (stretch) → explicit `width`/`height`
 * option → measured intrinsic size.
 */
export abstract class UIWidget implements UIElement {
  x = 0;
  y = 0;
  visible = true;

  anchor?: UIAnchor;
  margin: number;
  /** Fine-tune offsets (the `x`/`y` options) applied after anchor resolution */
  offsetX: number;
  offsetY: number;
  /** Explicit size from options; undefined = auto-size to content */
  width?: number;
  height?: number;
  /** True once a container adopts this element; disables self-anchoring. */
  layoutManaged = false;

  protected assignedWidth?: number;
  protected assignedHeight?: number;

  constructor(options: UIPlacement & { width?: number; height?: number } = {}) {
    this.anchor = options.anchor;
    this.offsetX = options.x ?? 0;
    this.offsetY = options.y ?? 0;
    this.margin = options.margin ?? (options.anchor ? UI_THEME.spacing.lg : 0);
    this.width = options.width;
    this.height = options.height;
    if (!this.anchor) {
      this.x = this.offsetX;
      this.y = this.offsetY;
    }
  }

  // -- protocol (final — subclasses implement the protected hooks instead) --

  update(dt: number): void {
    if (!this.visible) return;
    if (!this.layoutManaged) this.layout();
    this.tick(dt);
  }

  render(): void {
    if (!this.visible) return;
    if (!this.layoutManaged) this.layout();
    this.draw();
  }

  layout(): void {
    this.place();
    this.arrange();
  }

  // -- sizing --

  getWidth(): number {
    return this.assignedWidth ?? this.width ?? this.measureWidth();
  }

  getHeight(): number {
    return this.assignedHeight ?? this.height ?? this.measureHeight();
  }

  /** Intrinsic size, ignoring any container-assigned stretch */
  getIntrinsicWidth(): number {
    return this.width ?? this.measureWidth();
  }

  getIntrinsicHeight(): number {
    return this.height ?? this.measureHeight();
  }

  /** Container-only API: stretch this widget to a size. Pass undefined to clear. */
  setAssignedSize(width?: number, height?: number): void {
    this.assignedWidth = width;
    this.assignedHeight = height;
  }

  /** Hit test in screen space */
  contains(px: number, py: number): boolean {
    return (
      px >= this.x &&
      px <= this.x + this.getWidth() &&
      py >= this.y &&
      py <= this.y + this.getHeight()
    );
  }

  // -- hooks --

  /** Resolve anchor to x/y from the live display size. No-op when un-anchored. */
  protected place(): void {
    if (this.layoutManaged || !this.anchor) return;
    const display = MakkoEngine.display;
    const w = this.getWidth();
    const h = this.getHeight();

    if (this.anchor === 'top-left' || this.anchor === 'left' || this.anchor === 'bottom-left') {
      this.x = this.margin + this.offsetX;
    } else if (this.anchor === 'top' || this.anchor === 'center' || this.anchor === 'bottom') {
      this.x = (display.width - w) / 2 + this.offsetX;
    } else {
      this.x = display.width - w - this.margin + this.offsetX;
    }

    if (this.anchor === 'top-left' || this.anchor === 'top' || this.anchor === 'top-right') {
      this.y = this.margin + this.offsetY;
    } else if (this.anchor === 'left' || this.anchor === 'center' || this.anchor === 'right') {
      this.y = (display.height - h) / 2 + this.offsetY;
    } else {
      this.y = display.height - h - this.margin + this.offsetY;
    }
  }

  /** Containers override: position children and cascade their layout() */
  protected arrange(): void {}

  /** Per-frame input/animation logic */
  protected tick(_dt: number): void {}

  protected abstract draw(): void;
  /** Intrinsic content width (including own padding) */
  protected abstract measureWidth(): number;
  protected abstract measureHeight(): number;
}

// ============================================================================
// UILayer
// ============================================================================

/**
 * UILayer - manages a scene's root UI elements.
 * Insertion order is z-order; render this AFTER the game world.
 */
export class UILayer {
  private elements: UIElement[] = [];

  add(element: UIElement): void {
    this.elements.push(element);
  }

  remove(element: UIElement): void {
    this.elements = this.elements.filter((e) => e !== element);
  }

  /** Move an element to the top of the z-order (e.g. a just-opened modal) */
  bringToFront(element: UIElement): void {
    const i = this.elements.indexOf(element);
    if (i >= 0) {
      this.elements.splice(i, 1);
      this.elements.push(element);
    }
  }

  update(dt: number): void {
    for (const el of this.elements) {
      if (el.visible && el.update) {
        el.update(dt);
      }
    }
  }

  /** Render all visible elements. Resets the camera offset to screen space first. */
  render(): void {
    const display = MakkoEngine.display;
    display.setGlobalOffset(0, 0);
    for (const el of this.elements) {
      if (el.visible) {
        el.render();
      }
    }
  }

  showAll(): void {
    for (const el of this.elements) el.visible = true;
  }

  hideAll(): void {
    for (const el of this.elements) el.visible = false;
  }

  clear(): void {
    this.elements = [];
  }

  getCount(): number {
    return this.elements.length;
  }
}
