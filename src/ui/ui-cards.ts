/**
 * UI Content Display Components
 *
 * Structured content widgets, typically used inside Panel/VStack:
 * - Card: icon + title + subtitle + wrapped body, with hit-testing
 * - Badge: compact pill label/tag
 * - Divider: separator line (stretches to its container)
 *
 *   new Card({ title: 'Cannon', subtitle: '50g', body: 'Slow but mighty.' })
 *   new Badge({ label: 'LVL 3', color: UI_THEME.primary })
 *   new Divider({})
 */

import { MakkoEngine } from '@makko/engine';
import {
  type UIPlacement,
  UIWidget,
  UI_THEME,
  fontFor,
  measureTextWidth,
} from './ui-layer';
import { WrappedText } from './ui-layout';

// ============================================================================
// Card
// ============================================================================

export interface CardOptions extends UIPlacement {
  icon?: { text?: string; color: string };
  title?: string;
  subtitle?: string;
  body?: string;
  /** Default 280; stretches inside a VStack */
  width?: number;
  padding?: number;
  iconSize?: number;
  selected?: boolean;
  disabled?: boolean;
  borderColor?: string;
}

/**
 * Card - structured content card. Height follows content.
 * Use contains(pointer.x, pointer.y) for hit testing.
 */
export class Card extends UIWidget {
  icon: { text?: string; color: string } | null;
  title: string;
  subtitle: string;
  body: string;
  padding: number;
  iconSize: number;
  selected: boolean;
  disabled: boolean;
  borderColor: string;

  private bodyWrapped: WrappedText | null = null;

  constructor(options: CardOptions = {}) {
    super({ ...options, width: options.width ?? 280 });
    this.icon = options.icon ?? null;
    this.title = options.title ?? '';
    this.subtitle = options.subtitle ?? '';
    this.body = options.body ?? '';
    this.padding = options.padding ?? UI_THEME.spacing.sm;
    this.iconSize = options.iconSize ?? 20;
    this.selected = options.selected ?? false;
    this.disabled = options.disabled ?? false;
    this.borderColor = options.borderColor ?? UI_THEME.border;
  }

  private bodyWidth(): number {
    return this.getWidth() - this.padding * 2 - (this.icon ? this.iconSize + UI_THEME.spacing.sm : 0);
  }

  private getBodyWrapped(): WrappedText | null {
    if (!this.body) return null;
    const w = this.bodyWidth();
    if (!this.bodyWrapped || this.bodyWrapped.text !== this.body || this.bodyWrapped.width !== w) {
      this.bodyWrapped = new WrappedText({ text: this.body, width: w, size: 'sm', color: 'dim' });
    }
    return this.bodyWrapped;
  }

  protected measureWidth(): number {
    return 280;
  }

  protected measureHeight(): number {
    let h = this.padding * 2;
    if (this.title || this.icon) {
      h += Math.max(this.iconSize, UI_THEME.font.sizeMd);
    }
    if (this.subtitle) {
      h += UI_THEME.font.sizeSm + UI_THEME.spacing.xs;
    }
    const wrapped = this.getBodyWrapped();
    if (wrapped) {
      h += wrapped.getHeight() + UI_THEME.spacing.xs;
    }
    return h;
  }

  protected draw(): void {
    const display = MakkoEngine.display;
    const width = this.getWidth();
    const height = this.getHeight();

    const bgColor = this.selected ? UI_THEME.surfaceHover : UI_THEME.surface;
    const strokeColor = this.selected ? UI_THEME.primary : this.borderColor;

    display.drawRoundRect(this.x, this.y, width, height, UI_THEME.radius.md, {
      fill: bgColor,
      stroke: strokeColor,
      lineWidth: this.selected ? 2 : 1,
    });

    let contentY = this.y + this.padding;
    const contentX = this.x + this.padding;
    const textStartX = contentX + (this.icon ? this.iconSize + UI_THEME.spacing.sm : 0);

    if (this.icon) {
      const iconCenterX = contentX + this.iconSize / 2;
      const iconCenterY = contentY + this.iconSize / 2;
      display.drawCircle(iconCenterX, iconCenterY, this.iconSize / 2, {
        fill: this.disabled ? UI_THEME.textDim : this.icon.color,
      });
      if (this.icon.text) {
        display.drawText(this.icon.text, iconCenterX, iconCenterY, {
          font: fontFor('xs', true),
          fill: UI_THEME.text,
          align: 'center',
          baseline: 'middle',
        });
      }
    }

    if (this.title) {
      display.drawText(this.title, textStartX, contentY + (this.icon ? this.iconSize / 2 : UI_THEME.font.sizeMd / 2), {
        font: fontFor('md', true),
        fill: this.disabled ? UI_THEME.textDim : UI_THEME.text,
        align: 'left',
        baseline: 'middle',
      });
    }
    if (this.title || this.icon) {
      contentY += Math.max(this.iconSize, UI_THEME.font.sizeMd);
    }

    if (this.subtitle) {
      contentY += UI_THEME.spacing.xs;
      display.drawText(this.subtitle, textStartX, contentY, {
        font: fontFor('sm'),
        fill: this.disabled ? UI_THEME.textDim : UI_THEME.textMuted,
        align: 'left',
        baseline: 'top',
      });
      contentY += UI_THEME.font.sizeSm;
    }

    const wrapped = this.getBodyWrapped();
    if (wrapped) {
      contentY += UI_THEME.spacing.xs;
      wrapped.x = textStartX;
      wrapped.y = contentY;
      wrapped.render();
    }
  }
}

// ============================================================================
// Badge
// ============================================================================

export interface BadgeOptions extends UIPlacement {
  label: string;
  /** Background color. Default UI_THEME.primary */
  color?: string;
  textColor?: string;
  fontSize?: number;
}

/**
 * Badge - small labeled pill. Auto-sized to its text.
 */
export class Badge extends UIWidget {
  label: string;
  bgColor: string;
  textColor: string;
  fontSize: number;

  constructor(options: BadgeOptions) {
    super(options);
    this.label = options.label;
    this.bgColor = options.color ?? UI_THEME.primary;
    this.textColor = options.textColor ?? UI_THEME.text;
    this.fontSize = options.fontSize ?? UI_THEME.font.sizeXs;
  }

  private font(): string {
    return `bold ${this.fontSize}px ${UI_THEME.font.family}`;
  }

  private getPadX(): number {
    return UI_THEME.spacing.xs + 2;
  }

  protected measureWidth(): number {
    return measureTextWidth(this.label, this.font()) + this.getPadX() * 2;
  }

  protected measureHeight(): number {
    return this.fontSize + UI_THEME.spacing.xs * 2;
  }

  protected draw(): void {
    const display = MakkoEngine.display;
    const w = this.getWidth();
    const h = this.getHeight();

    display.drawRoundRect(this.x, this.y, w, h, UI_THEME.radius.full, {
      fill: this.bgColor,
    });
    display.drawText(this.label, this.x + w / 2, this.y + h / 2, {
      font: this.font(),
      fill: this.textColor,
      align: 'center',
      baseline: 'middle',
    });
  }
}

// ============================================================================
// Divider
// ============================================================================

export interface DividerOptions extends UIPlacement {
  /** Omit to stretch to the container (standalone default 200) */
  width?: number;
  color?: string;
  alpha?: number;
  gradient?: boolean;
  /** Vertical breathing room above and below the line */
  margin?: number;
}

/**
 * Divider - separator line with optional gradient fade at the edges.
 */
export class Divider extends UIWidget {
  color: string;
  alpha: number;
  gradient: boolean;
  lineMargin: number;

  constructor(options: DividerOptions = {}) {
    // `margin` here means vertical spacing around the line, not an anchor inset
    super({ anchor: options.anchor, x: options.x, y: options.y, width: options.width });
    this.color = options.color ?? UI_THEME.border;
    this.alpha = options.alpha ?? 0.5;
    this.gradient = options.gradient ?? false;
    this.lineMargin = options.margin ?? UI_THEME.spacing.sm;
  }

  protected measureWidth(): number {
    return 200;
  }

  protected measureHeight(): number {
    return 1 + this.lineMargin * 2;
  }

  private parseHex(hex: string): { r: number; g: number; b: number } {
    let h = hex.replace('#', '');
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return {
      r: parseInt(h.slice(0, 2), 16) || 0,
      g: parseInt(h.slice(2, 4), 16) || 0,
      b: parseInt(h.slice(4, 6), 16) || 0,
    };
  }

  protected draw(): void {
    const display = MakkoEngine.display;
    const w = this.getWidth();
    const lineY = this.y + this.lineMargin;

    if (this.gradient) {
      const { r, g, b } = this.parseHex(this.color);
      display.drawRect(this.x, lineY, w, 1, {
        fill: {
          type: 'linear',
          x0: this.x,
          y0: 0,
          x1: this.x + w,
          y1: 0,
          stops: [
            { offset: 0, color: `rgba(${r}, ${g}, ${b}, 0)` },
            { offset: 0.5, color: `rgba(${r}, ${g}, ${b}, ${this.alpha})` },
            { offset: 1, color: `rgba(${r}, ${g}, ${b}, 0)` },
          ],
        },
      });
    } else {
      display.drawLine(this.x, lineY, this.x + w, lineY, {
        stroke: this.color,
        lineWidth: 1,
        alpha: this.alpha,
      });
    }
  }
}
