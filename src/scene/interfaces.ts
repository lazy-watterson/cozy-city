/**
 * Scene and System Interfaces
 *
 * Core interfaces for the scene-based game loop architecture.
 * Systems are modular components that handle specific game functionality.
 * Scenes manage collections of systems and their lifecycle.
 */

import type { SceneManager } from './scene-manager';

/**
 * A System handles a specific aspect of game functionality.
 *
 * Systems are registered to scenes and automatically receive lifecycle
 * callbacks. Use priority to control execution order (lower = earlier).
 *
 * Example:
 *   class MovementSystem implements System {
 *     readonly id = 'movement';
 *     readonly priority = 50;
 *     enabled = true;
 *
 *     update(dt: number, scene: Scene): void {
 *       // Move entities...
 *     }
 *   }
 */
export interface System {
  /** Unique identifier for this system */
  readonly id: string;

  /** Execution priority (lower = earlier). Default systems use 0-200 range. */
  readonly priority: number;

  /** Whether this system is currently active */
  enabled: boolean;

  /** Called when system is added to a scene */
  onMount?(scene: Scene): void;

  /** Called when system is removed from a scene */
  onUnmount?(scene: Scene): void;

  /** Called during input phase (before update) */
  handleInput?(scene: Scene): void;

  /** Called during update phase */
  update?(dt: number, scene: Scene): void;

  /** Called during render phase */
  render?(scene: Scene): void;
}

/**
 * A Scene represents a distinct game state (title, gameplay, pause, etc.)
 *
 * Scenes can be simple objects or extend BaseScene for system management.
 * The SceneManager handles transitions between scenes.
 *
 * Lifecycle:
 *   1. init() - Called once when scene is registered (async allowed)
 *   2. enter() - Called when scene becomes active
 *   3. handleInput/update/render - Called each frame while active
 *   4. exit() - Called when scene becomes inactive
 *   5. destroy() - Called when scene is unregistered
 */
export interface Scene {
  /** Unique identifier for this scene */
  readonly id: string;

  /** Reference to parent scene manager (set automatically) */
  manager?: SceneManager;

  /** Initialize scene resources (called once on registration) */
  init?(): Promise<void> | void;

  /** Called when scene becomes active */
  enter?(previousScene?: string): void;

  /** Called when scene becomes inactive */
  exit?(nextScene?: string): void;

  /** Handle input for this frame */
  handleInput?(): void;

  /** Update scene logic */
  update?(dt: number): void;

  /** Render scene visuals */
  render?(): void;

  /** Cleanup scene resources (called on unregistration) */
  destroy?(): void;
}

/**
 * Scene transition types for SceneManager
 */
export type SceneTransition = 'switch' | 'push' | 'pop';

/**
 * Configuration for scene transitions
 */
export interface TransitionConfig {
  /** Type of transition */
  type: SceneTransition;

  /** Target scene ID (not needed for 'pop') */
  targetId?: string;

  /** Whether to call exit on current scene (default: true) */
  exitCurrent?: boolean;

  /** Whether to call enter on target scene (default: true) */
  enterTarget?: boolean;
}
