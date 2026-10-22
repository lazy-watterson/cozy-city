import { MakkoEngine } from '@makko/engine';
import { Game } from './game/game';

const progressLabel = document.getElementById('loadingLabel');
const progressBar = document.getElementById('loadingProgress');
const loadingScreen = document.getElementById('loadingScreen');

function showLoadingProgress(loaded: number, total: number): void {
  const percent = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
  if (progressLabel) {
    progressLabel.textContent = total > 0
      ? `Preparing the city map… ${loaded} / ${total}`
      : 'Preparing the city map…';
  }
  if (progressBar instanceof HTMLProgressElement) {
    progressBar.max = 100;
    progressBar.value = percent;
  }
}

function showLoadingError(error: unknown): void {
  const message = error instanceof Error ? error.message : 'An unexpected loading error occurred.';
  if (progressLabel) progressLabel.textContent = `Unable to load the game: ${message}`;
  if (progressBar instanceof HTMLProgressElement) progressBar.hidden = true;
}

async function main(): Promise<void> {
  if (!(loadingScreen instanceof HTMLElement)) {
    throw new Error('The loading screen is missing from the page.');
  }

  showLoadingProgress(0, 0);
  await MakkoEngine.initEngine({
    canvas: document.getElementById('gameCanvas') as HTMLCanvasElement,
    width: 1920,
    height: 1080,
    onProgress: showLoadingProgress,
  });

  MakkoEngine.display.setImageSmoothing(true);

  // Managed project assets are ready after initEngine resolves.
  if (!MakkoEngine.staticAsset('city_map')) {
    throw new Error('The City map background could not be found after loading.');
  }

  MakkoEngine.input.capture(['Space', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

  const game = new Game();
  await game.init();
  loadingScreen.hidden = true;
  game.start();
}

main().catch((error: unknown) => showLoadingError(error));
