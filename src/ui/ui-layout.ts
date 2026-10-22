/**
 * UI Layout Containers
 *
 * Containers measure and position their children — children need no x/y/width.
 * Pass children declaratively and let the container flow them:
 *
 *   new VStack({ anchor: 'center', gap: 12, children: [title, body, button] })
 *   new HStack({ anchor: 'top', width: 600, justify: 'space-between', children: [...] })
 *
 * - VStack: vertical flow; children stretch to the stack width by default
 * - HStack: horizontal flow; children center vertically by default
 * - WrappedText: word-wrapping paragraph text
 * - Spacer: fixed-size gap
 *
 * `align` is the cross axis ('start' | 'center' | 'end' | 'stretch');
 * `justify` distributes along the main axis and only matters when the container
 * has an explicit size on that axis ('start' | 'center' | 'end' | 'space-between' |
 * 'space-around') — the same words they mean in CSS flexbox.
 */

import { MakkoEngine } from '@makko/engine';
import {
  type UIElement,
  type UIPlacement,
  type TextSize,
  type TextAlign,
  UIWidget,
  UI_THEME,
  fontFor,
  fontSizeOf,
  resolveColor,
  measureTextWidth,
} from './ui-layer';

// ============================================================================
// UIContainer
// ============================================================================

export type UIDirection = 'vertical' | 'horizontal';
export type UIAlign = 'start' | 'center' | 'end' | 'stretch';
export type UIJustify = 'start' | 'center' | 'end' | 'space-between' | 'space-around';

export interface UIContainerOptions extends UIPlacement {
  /** Omit for auto-size to content */
  width?: number;
  height?: number;
  /** Space between children. Default UI_THEME.spacing.md */
  gap?: number;
  /** Inner padding. Default 0 (Panel defaults to spacing.lg) */
  padding?: number;
  /** Cross-axis alignment of children */
  align?: UIAlign;
  /** Main-axis distribution (needs an explicit main-axis size to matter) */
  justify?: UIJustify;
  /** Children, declaratively. add() also works. */
  children?: UIElement[];
}

/**
 * Base container: one layout implementation shared by VStack, HStack, Panel,
 * and Modal. Positions children each layout() pass; stretch-assigns cross-axis
 * sizes BEFORE reading main-axis sizes (wrapped text height depends on width).
 */
export class UIContainer extends UIWidget {
  gap: number;
  padding: number;
  align: UIAlign;
  justify: UIJustify;

  protected direction: UIDirection;
  protected children: UIElement[] = [];

  constructor(direction: UIDirection, options: UIContainerOptions = {}) {
    super(options);
    this.direction = direction;
    this.gap = options.gap ?? UI_THEME.spacing.md;
    this.padding = options.padding ?? 0;
    this.align = options.align ?? (direction === 'vertical' ? 'stretch' : 'center');
    this.justify = options.justify ?? 'start';
    for (const child of options.children ?? []) this.add(child);
  }

  add(element: UIElement): void {
    element.layoutManaged = true;
    this.children.push(element);
  }

  remove(element: UIElement): void {
    element.layoutManaged = false;
    this.children = this.children.filter((e) => e !== element);
  }

  clear(): void {
    for (const child of this.children) child.layoutManaged = false;
    this.children = [];
  }

  getChildren(): UIElement[] {
    return this.children;
  }

  /** Extra space reserved at the top of the content box (Panel uses it for titles) */
  protected contentOffsetTop(): number {
    return 0;
  }

  private visibleChildren(): UIElement[] {
    return this.children.filter((c) => c.visible);
  }

  /** Stretch-assign cross-axis sizes. Must run before reading main-axis sizes. */
  private assignCrossAxis(kids: UIElement[]): void {
    const stretch = this.align === 'stretch';
    if (this.direction === 'vertical') {
      const innerW = stretch ? this.getWidth() - this.padding * 2 : undefined;
      for (const child of kids) {
        if (child instanceof UIWidget) child.setAssignedSize(innerW, undefined);
      }
      return;
    }
    // Horizontal: an auto-height container stretches children to the tallest
    // child's intrinsic height (calling getHeight() here would recurse).
    let innerH: number | undefined;
    if (stretch) {
      if (this.height !== undefined || this.assignedHeight !== undefined) {
        innerH = this.getHeight() - this.padding * 2;
      } else {
        innerH = 0;
        for (const c of kids) {
          innerH = Math.max(innerH, c instanceof UIWidget ? c.getIntrinsicHeight() : c.getHeight());
        }
      }
    }
    for (const child of kids) {
      if (child instanceof UIWidget) child.setAssignedSize(undefined, innerH);
    }
  }

  protected measureWidth(): number {
    const kids = this.visibleChildren();
    if (kids.length === 0) return this.padding * 2;
    if (this.direction === 'vertical') {
      let max = 0;
      for (const c of kids) max = Math.max(max, intrinsicWidth(c));
      return max + this.padding * 2;
    }
    let sum = 0;
    for (const c of kids) sum += intrinsicWidth(c);
    return sum + this.gap * (kids.length - 1) + this.padding * 2;
  }

  protected measureHeight(): number {
    const kids = this.visibleChildren();
    if (kids.length === 0) return this.padding * 2 + this.contentOffsetTop();
    this.assignCrossAxis(kids);
    if (this.direction === 'vertical') {
      let sum = 0;
      for (const c of kids) sum += c.getHeight();
      return sum + this.gap * (kids.length - 1) + this.padding * 2 + this.contentOffsetTop();
    }
    let max = 0;
    for (const c of kids) max = Math.max(max, c.getHeight());
    return max + this.padding * 2 + this.contentOffsetTop();
  }

  protected arrange(): void {
    const kids = this.visibleChildren();
    if (kids.length === 0) return;

    // 1. Cross-axis stretch first — wrapped text height depends on assigned width
    this.assignCrossAxis(kids);

    const innerW = this.getWidth() - this.padding * 2;
    const innerH = this.getHeight() - this.padding * 2 - this.contentOffsetTop();
    const mainSizes = kids.map((c) => (this.direction === 'vertical' ? c.getHeight() : c.getWidth()));
    let contentMain = 0;
    for (const s of mainSizes) contentMain += s;
    contentMain += this.gap * (kids.length - 1);

    // 2. Main-axis distribution
    const innerMain = this.direction === 'vertical' ? innerH : innerW;
    const free = innerMain - contentMain;
    let cursor = 0;
    let extraGap = 0;
    if (free > 0) {
      if (this.justify === 'center') cursor = free / 2;
      else if (this.justify === 'end') cursor = free;
      else if (this.justify === 'space-between' && kids.length > 1) extraGap = free / (kids.length - 1);
      else if (this.justify === 'space-around') {
        const segment = free / kids.length;
        cursor = segment / 2;
        extraGap = segment;
      }
    }

    // 3. Position children and cascade
    const originX = this.x + this.padding;
    const originY = this.y + this.padding + this.contentOffsetTop();
    for (let i = 0; i < kids.length; i++) {
      const child = kids[i];
      if (this.direction === 'vertical') {
        const cross = innerW - child.getWidth();
        child.x = originX + (this.align === 'center' ? cross / 2 : this.align === 'end' ? cross : 0);
        child.y = originY + cursor;
      } else {
        const cross = innerH - child.getHeight();
        child.x = originX + cursor;
        child.y = originY + (this.align === 'center' ? cross / 2 : this.align === 'end' ? cross : 0);
      }
      child.layout();
      cursor += mainSizes[i] + this.gap + extraGap;
    }
  }

  protected tick(dt: number): void {
    for (const child of this.children) {
      if (child.visible && child.update) child.update(dt);
    }
  }

  /** Background hook — Panel overrides; plain stacks draw nothing themselves */
  protected drawBackground(): void {}

  protected draw(): void {
    this.drawBackground();
    for (const child of this.children) {
      if (child.visible) child.render();
    }
  }
}

function intrinsicWidth(el: UIElement): number {
  return el instanceof UIWidget ? el.getIntrinsicWidth() : el.getWidth();
}

// ============================================================================
// VStack / HStack
// ============================================================================

export interface StackOptions extends Omit<UIContainerOptions, 'children'> {
  children?: UIElement[];
}

/**
 * VStack - vertical flow. Children stretch to the stack width by default,
 * so Text/Button alignment inside just works.
 */
export class VStack extends UIContainer {
  constructor(options: StackOptions = {}) {
    super('vertical', options);
  }
}

/**
 * HStack - horizontal flow. Children center vertically by default.
 * Give it a width + `justify: 'space-between'` for a HUD row pinned to both edges:
 *   new HStack({ anchor: 'top', width: MakkoEngine.display.width - 48, justify: 'space-between', ... })
 */
export class HStack extends UIContainer {
  constructor(options: StackOptions = {}) {
    super('horizontal', options);
  }
}

// ============================================================================
// WrappedText
// ============================================================================

export interface WrappedTextOptions extends UIPlacement {
  text: string;
  /** Wrap width. Omit to stretch in a container, or default to fit the screen. */
  width?: number;
  size?: TextSize;
  /** Theme token ('text' | 'muted' | 'dim' | 'primary' | 'accent') or any CSS color */
  color?: string;
  align?: TextAlign;
  lineHeight?: number;
}

/**
 * WrappedText - paragraph text with automatic word wrapping.
 * Height follows the effective wrap width (containers can stretch it).
 */
export class WrappedText extends UIWidget {
  text: string;
  size: TextSize;
  color: string;
  align: TextAlign;
  lineHeight: number;

  private cachedLines: string[] | null = null;
  private cachedKey = '';

  constructor(options: WrappedTextOptions) {
    super(options);
    this.text = options.text;
    this.size = options.size ?? 'sm';
    this.color = options.color ?? 'muted';
    this.align = options.align ?? 'left';
    this.lineHeight = options.lineHeight ?? 1.3;
  }

  private effectiveWidth(): number {
    const assigned = this.getWidth();
    return assigned;
  }

  protected measureWidth(): number {
    // Standalone default: fit the screen, capped for readability
    const display = MakkoEngine.display;
    return Math.min(display.width - this.margin * 2, 600);
  }

  protected measureHeight(): number {
    const lines = this.wrapLines();
    return Math.max(1, lines.length) * fontSizeOf(this.size) * this.lineHeight;
  }

  private wrapLines(): string[] {
    const font = fontFor(this.size);
    const maxWidth = this.effectiveWidth();
    const key = `${font}|${maxWidth}|${this.text}`;
    if (this.cachedLines && this.cachedKey === key) return this.cachedLines;

    const words = this.text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (measureTextWidth(testLine, font) > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);

    this.cachedLines = lines;
    this.cachedKey = key;
    return lines;
  }

  protected draw(): void {
    const display = MakkoEngine.display;
    const lines = this.wrapLines();
    const font = fontFor(this.size);
    const fill = resolveColor(this.color);
    const spacing = fontSizeOf(this.size) * this.lineHeight;
    const w = this.effectiveWidth();

    for (let i = 0; i < lines.length; i++) {
      let drawX = this.x;
      if (this.align === 'center') drawX = this.x + w / 2;
      else if (this.align === 'right') drawX = this.x + w;
      display.drawText(lines[i], drawX, this.y + i * spacing, {
        font,
        fill,
        align: this.align,
        baseline: 'top',
      });
    }
  }
}

// ============================================================================
// Spacer
// ============================================================================

/**
 * Spacer - fixed-size gap inside a stack.
 */
export class Spacer extends UIWidget {
  size: number;

  constructor(options: { size?: number } = {}) {
    super({});
    this.size = options.size ?? UI_THEME.spacing.lg;
  }

  protected measureWidth(): number {
    return this.size;
  }

  protected measureHeight(): number {
    return this.size;
  }

  protected draw(): void {}
}
