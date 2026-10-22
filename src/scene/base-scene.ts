/**
 * Base Scene
 *
 * Abstract base class for scenes that use the system architecture.
 * Provides helper methods for system management and scene transitions.
 */

import type { Scene, System } from './interfaces';
import type { SceneManager } from './scene-manager';
import { SystemRegistry } from './system-registry';

/**
 * Abstract base class for scenes with system management.
 *
 * Extend this class to create scenes that use the system architecture.
 * Systems are automatically updated and rendered in priority order.
 *
 * Example:
 *   class GameScene extends BaseScene {
 *     readonly id = 'game';
 *
 *     init(): void {
 *       this.addSystem(new MovementSystem());
 *       this.addSystem(new RenderSystem());
 *     }
 *
 *     enter(): void {
 *       console.log('Game started!');
 *     }
 *   }
 */
export abstract class BaseScene implements Scene {
  abstract readonly id: string;

  /** Reference to parent scene manager */
  manager?: SceneManager;

  /** Registry of systems for this scene */
  protected readonly systems = new SystemRegistry();

  /**
   * Initialize scene resources.
   * Override to add systems and load resources.
   */
  init?(): Promise<void> | void;

  /**
   * Called when scene becomes active.
   *
   * @param previousScene - ID of previous scene (if any)
   */
  enter?(previousScene?: string): void;

  /**
   * Called when scene becomes inactive.
   *
   * @param nextScene - ID of next scene (if any)
   */
  exit?(nextScene?: string): void;

  /**
   * Handle input for this frame.
   * Delegates to all enabled systems.
   */
  handleInput(): void {
    this.systems.handleInput(this);
  }

  /**
   * Update scene logic.
   * Delegates to all enabled systems.
   *
   * @param dt - Delta time in milliseconds
   */
  update(dt: number): void {
    this.systems.update(dt, this);
  }

  /**
   * Render scene visuals.
   * Delegates to all enabled systems.
   */
  render(): void {
    this.systems.render(this);
  }

  /**
   * Cleanup scene resources.
   * Override to clean up resources.
   */
  destroy(): void {
    this.systems.clear(this);
  }

  // ============================================================================
  // System Management Helpers
  // ============================================================================

  /**
   * Add a system to this scene.
   *
   * @param system - System to add
   */
  protected addSystem(system: System): void {
    this.systems.register(system, this);
  }

  /**
   * Remove a system from this scene.
   *
   * @param systemId - ID of system to remove
   */
  protected removeSystem(systemId: string): void {
    this.systems.unregister(systemId, this);
  }

  /**
   * Get a system by ID.
   *
   * @param systemId - ID of system to retrieve
   * @returns System or undefined
   */
  protected getSystem<T extends System>(systemId: string): T | undefined {
    return this.systems.get<T>(systemId);
  }

  /**
   * Enable a system.
   *
   * @param systemId - ID of system to enable
   */
  protected enableSystem(systemId: string): void {
    this.systems.enable(systemId);
  }

  /**
   * Disable a system.
   *
   * @param systemId - ID of system to disable
   */
  protected disableSystem(systemId: string): void {
    this.systems.disable(systemId);
  }

  // ============================================================================
  // Scene Transition Helpers
  // ============================================================================

  /**
   * Switch to a different scene (replaces scene stack).
   *
   * @param sceneId - ID of scene to switch to
   */
  protected switchTo(sceneId: string): void {
    if (!this.manager) {
      console.warn(`[BaseScene] Cannot switchTo "${sceneId}": no manager attached`);
      return;
    }
    this.manager.switchTo(sceneId);
  }

  /**
   * Push a scene on top of the current scene (for overlays/pause menus).
   *
   * @param sceneId - ID of scene to push
   */
  protected pushScene(sceneId: string): void {
    if (!this.manager) {
      console.warn(`[BaseScene] Cannot pushScene "${sceneId}": no manager attached`);
      return;
    }
    this.manager.push(sceneId);
  }

  /**
   * Pop the current scene and return to the previous one.
   */
  protected popScene(): void {
    if (!this.manager) {
      console.warn('[BaseScene] Cannot popScene: no manager attached');
      return;
    }
    this.manager.pop();
  }

  /**
   * Get the current scene stack depth.
   */
  protected getStackDepth(): number {
    return this.manager?.stackDepth ?? 0;
  }
}
