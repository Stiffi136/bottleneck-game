import '@fontsource/pixelify-sans/500.css';
import '@fontsource/silkscreen/400.css';
import '@fontsource/vt323/400.css';
import './style.css';
import { loadAssets } from './render/assets';
import { loadFonts } from './render/font';
import { game } from './game/game';
import { installUiSprites } from './ui/dom';
import { TitleScreen } from './ui/screens/title';
import { SelectScreen } from './ui/screens/select';
import { BenchScreen } from './ui/screens/bench';
import { ReceiptScreen } from './ui/screens/receipt';
import { ShopScreen } from './ui/screens/shop';
import { WorkbenchScreen } from './ui/screens/workbench';
import { GameOverScreen } from './ui/screens/gameover';
import { L, setLang } from './i18n';
import { loadSettings } from './game/storage';
import { timeScale } from './render/tween';

const loading = document.getElementById('loading')!;
const bar = loading.querySelector('.bar i') as HTMLElement;
const msg = loading.querySelector('.msg') as HTMLElement;

function fatal(err: unknown): void {
  console.error(err);
  loading.style.display = 'flex';
  loading.style.opacity = '1';
  loading.classList.add('err');
  msg.textContent = `${L().meta.loadError} (${err instanceof Error ? err.message : String(err)})`;
}

window.addEventListener('error', (e) => {
  if (!booted) fatal(e.error ?? e.message);
  else console.error(e.error ?? e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  if (!booted) fatal(e.reason);
  else console.error(e.reason);
});

let booted = false;

async function boot(): Promise<void> {
  setLang(loadSettings().lang);
  msg.textContent = L().meta.loading;
  await loadAssets((p) => (bar.style.width = `${Math.round(p * 90)}%`));
  await loadFonts();
  bar.style.width = '100%';
  installUiSprites();
  game.init(document.getElementById('app')!);
  game.register('title', (g) => new TitleScreen(g));
  game.register('select', (g) => new SelectScreen(g));
  game.register('bench', (g) => new BenchScreen(g));
  game.register('receipt', (g) => new ReceiptScreen(g));
  game.register('shop', (g) => new ShopScreen(g));
  game.register('workbench', (g) => new WorkbenchScreen(g));
  game.register('gameover', (g) => new GameOverScreen(g));
  game.show('title');
  booted = true;
  loading.style.opacity = '0';
  setTimeout(() => (loading.style.display = 'none'), 400);
  Object.assign(window as object, { __game: game, __timeScale: timeScale });
}

boot().catch(fatal);
