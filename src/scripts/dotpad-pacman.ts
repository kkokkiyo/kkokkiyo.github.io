// 팩맨 게임과 Dot Pad 60×40 핀 표현 (게임 상태를 그대로 핀으로 변환)
const W = 28, H = 30, TILE = 20;
const COLS = 60, ROWS = 40;
const PLAYER_MOVE_MS = 145, GHOST_MOVE_MS = 260;

// 2×2 촉각 기호 (1 = 올라온 핀)
export const GLYPHS = {
  power: ['10', '01'],
  pacman: ['11', '10'],
  ghost: ['01', '10'],
  fruit: ['11', '11'],
} as const;

const CLASSIC = [
  '############################', '############################', '####........####........####', '####.#######..#######.####', '####o#######..#######o####',
  '####.#######..#######.####', '####.#######..#######.####', '####........................', '####.####.########.####.####', '####.####.########.####.####',
  '.... .####.########.####. ....', '####.####.########.####.####', '####.####............####.####', '####.####.########.####.####', '####.####.########.####.####',
  '####.####.########.####.####', '.... .####.##    ##.####. ....', '####.####.##    ##.####.####', '####.####.##    ##.####.####',
  '####.####.########.####.####', '####.####............####.####', '####.####.########.####.####', '####.####.########.####.####', '####........................', '####.####.########.####.####', '####.####.########.####.####',
  '####o......................o####', '############################', '############################', '############################',
].map((r) => r.padEnd(W, '#').slice(0, W).split(''));

type Dir = [number, number];
type Ghost = { x: number; y: number; start: Dir; dir: Dir; respawn: number; color: string; mode: 'chase' | 'ambush' | 'scatter'; name: string };
type View = 'overview' | 'focus';

export function createGame(opts: {
  canvas: HTMLCanvasElement;
  pad: HTMLCanvasElement;
  onStatus: (s: { score: number; lives: number; mode: string; view: string }) => void;
  onMessage: (text: string) => void;
}) {
  const ctx = opts.canvas.getContext('2d')!;
  const pctx = opts.pad.getContext('2d')!;
  const key = (x: number, y: number) => `${x},${y}`;

  let maze = CLASSIC.map((r) => [...r]);
  let pellets = new Set<string>();
  let player = { x: 13, y: 23, dir: [0, 0] as Dir, want: [0, 0] as Dir };
  let ghosts: Ghost[] = [];
  let fruit: { x: number; y: number } | null = null;
  let fruitStage = 0, fruitThresholds: number[] = [];
  let frightened = 0, score = 0, lives = 3, mode: 'ready' | 'playing' | 'paused' | 'over' | 'won' = 'ready';
  let last = 0, playerTimer = 0, ghostTimer = 0, mouth = 0;
  let view: View = 'overview', follow = true;
  const camera = { pageX: 0, pageY: 0, x: 0, y: 0, ready: false };
  const PAGE_X = [0, 13], PAGE_Y = [0, 10, 20];

  const walk = (x: number, y: number) => x >= 0 && x < W && y >= 0 && y < H && maze[y][x] !== '#';

  function connectedFrom(start: Dir) {
    const seen = new Set([key(...start)]), queue = [start];
    while (queue.length) {
      const [x, y] = queue.shift()!;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (walk(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); queue.push([nx, ny]); }
      }
    }
    return seen;
  }

  // 모든 통로가 시작 위치에서 이어지도록 보정
  function ensureConnectivity() {
    const start: Dir = [14, 23];
    maze[start[1]][start[0]] = '.';
    let seen = connectedFrom(start);
    for (let guard = 0; guard < 120; guard++) {
      let target: Dir | null = null, best = Infinity;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
        if (maze[y][x] !== '#' && !seen.has(key(x, y))) {
          const d = Math.abs(x - start[0]) + Math.abs(y - start[1]);
          if (d < best) { best = d; target = [x, y]; }
        }
      if (!target) break;
      let nearest = { x: start[0], y: start[1], d: Infinity };
      for (const cell of seen) {
        const [x, y] = cell.split(',').map(Number);
        const d = Math.abs(x - target[0]) + Math.abs(y - target[1]);
        if (d < nearest.d) nearest = { x, y, d };
      }
      let { x, y } = nearest;
      while (x !== target[0]) { x += Math.sign(target[0] - x); maze[y][x] = '.'; }
      while (y !== target[1]) { y += Math.sign(target[1] - y); maze[y][x] = '.'; }
      seen = connectedFrom(start);
    }
  }

  function randomMaze() {
    const map = Array.from({ length: H }, () => Array(W).fill('#'));
    const stack: Dir[] = [[1, 1]], visited = new Set(['1,1']);
    map[1][1] = '.';
    while (stack.length) {
      const [x, y] = stack[stack.length - 1];
      const options = ([[2, 0], [-2, 0], [0, 2], [0, -2]] as Dir[]).map(([dx, dy]) => [x + dx, y + dy] as Dir)
        .filter(([nx, ny]) => nx > 0 && nx < W - 1 && ny > 0 && ny < H - 1 && !visited.has(key(nx, ny)));
      if (!options.length) { stack.pop(); continue; }
      const [nx, ny] = options[Math.floor(Math.random() * options.length)];
      map[y + (ny - y) / 2][x + (nx - x) / 2] = '.'; map[ny][nx] = '.'; visited.add(key(nx, ny)); stack.push([nx, ny]);
    }
    for (let i = 0; i < 32; i++) {
      const x = 2 + Math.floor(Math.random() * (W - 4)), y = 2 + Math.floor(Math.random() * (H - 4));
      if (map[y][x] === '#' && ((map[y - 1][x] !== '#' && map[y + 1][x] !== '#') || (map[y][x - 1] !== '#' && map[y][x + 1] !== '#'))) map[y][x] = '.';
    }
    for (const [x, y] of [[0, 15], [W - 1, 15], [1, 15], [W - 2, 15], [13, 23], [13, 13], [15, 13], [13, 15], [15, 15]]) map[y][x] = '.';
    const candidates: Dir[] = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (map[y][x] === '.' && Math.abs(x - 14) + Math.abs(y - 15) > 8) candidates.push([x, y]);
    for (let i = 0; i < 4 && candidates.length; i++) { const [x, y] = candidates.splice(Math.floor(Math.random() * candidates.length), 1)[0]; map[y][x] = 'o'; }
    return map;
  }

  function resetRound() {
    player = { x: 13, y: 23, dir: [0, 0], want: [0, 0] };
    ghosts = [
      { x: 13, y: 13, start: [13, 13], dir: [-1, 0], respawn: 0, color: '#ff3b45', mode: 'chase', name: 'Blinky' },
      { x: 15, y: 13, start: [15, 13], dir: [1, 0], respawn: 0, color: '#ff8fe5', mode: 'ambush', name: 'Pinky' },
      { x: 13, y: 15, start: [13, 15], dir: [0, -1], respawn: 0, color: '#55d8ff', mode: 'scatter', name: 'Inky' },
      { x: 15, y: 15, start: [15, 15], dir: [0, -1], respawn: 0, color: '#ffb44c', mode: 'chase', name: 'Clyde' },
    ];
    camera.ready = false;
  }

  function spawnFruit() {
    const spots: { x: number; y: number }[] = [];
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (walk(x, y) && Math.abs(x - player.x) + Math.abs(y - player.y) > 8) spots.push({ x, y });
    if (!spots.length) return;
    fruit = spots[Math.floor(Math.random() * spots.length)];
    pellets.delete(key(fruit.x, fruit.y));
    fruitStage++;
  }

  function newGame(random: boolean) {
    score = 0; lives = 3; mode = 'ready'; frightened = 0; fruit = null; fruitStage = 0; last = 0;
    maze = random ? randomMaze() : CLASSIC.map((r) => [...r]);
    ensureConnectivity();
    pellets = new Set();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (maze[y][x] === '.' || maze[y][x] === 'o') pellets.add(key(x, y));
    fruitThresholds = [Math.floor(pellets.size * 0.66), Math.floor(pellets.size * 0.33)];
    resetRound();
    spawnFruit();
    render();
    opts.onMessage('방향키를 누르면 시작합니다.');
  }

  const coinsLeft = () => [...pellets].filter((k) => { const [x, y] = k.split(',').map(Number); return maze[y][x] === '.'; }).length;

  function movePlayer() {
    const [wx, wy] = player.want;
    if (walk(player.x + wx, player.y + wy)) player.dir = player.want;
    const [dx, dy] = player.dir;
    if (!walk(player.x + dx, player.y + dy)) return;
    player.x = (player.x + dx + W) % W; player.y += dy;
    if (pellets.delete(key(player.x, player.y))) {
      score += 10;
      if (maze[player.y][player.x] === 'o') { frightened = 7000; score += 40; }
    }
    if (fruit && fruit.x === player.x && fruit.y === player.y) { score += 250; fruit = null; }
    if (!fruit && fruitStage < 2 && pellets.size <= fruitThresholds[fruitStage]) spawnFruit();
    if (coinsLeft() === 0) { mode = 'won'; score += 1000; opts.onMessage('라운드 클리어! 방향키를 누르면 새 게임을 시작합니다.'); }
  }

  function ghostTarget(g: Ghost): Dir {
    if (g.mode === 'scatter') return g.name === 'Inky' ? [26, 1] : [1, 29];
    if (g.mode === 'ambush') return [player.x + player.dir[0] * 4, player.y + player.dir[1] * 4];
    if (g.name === 'Clyde' && Math.abs(g.x - player.x) + Math.abs(g.y - player.y) > 12) return [1, 29];
    return [player.x, player.y];
  }

  function moveGhosts() {
    for (const g of ghosts) {
      if (g.respawn > 0) continue;
      const all = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as Dir[]).filter((d) => walk(g.x + d[0], g.y + d[1]));
      let choices = all.filter((d) => d[0] !== -g.dir[0] || d[1] !== -g.dir[1]);
      if (!choices.length) choices = all;
      if (!choices.length) continue;
      let pick = choices[Math.floor(Math.random() * choices.length)];
      if (!frightened) {
        const t = ghostTarget(g);
        const dist = (d: Dir) => Math.abs(g.x + d[0] - t[0]) + Math.abs(g.y + d[1] - t[1]);
        pick = choices.reduce((a, d) => (dist(d) < dist(a) ? d : a), choices[0]);
      }
      g.dir = pick; g.x = (g.x + pick[0] + W) % W; g.y += pick[1];
    }
  }

  function collisions() {
    ghosts.forEach((g, i) => {
      if (g.respawn > 0 || g.x !== player.x || g.y !== player.y) return;
      if (frightened) { score += 200 * (i + 1); g.x = g.start[0]; g.y = g.start[1]; g.dir = [0, 0]; g.respawn = 10000; return; }
      lives--;
      if (lives <= 0) { mode = 'over'; opts.onMessage('게임 오버. 방향키를 누르면 새 게임을 시작합니다.'); }
      else { resetRound(); mode = 'ready'; opts.onMessage(`유령에게 잡혔습니다. 남은 목숨 ${lives}개.`); }
    });
  }

  function tick(t: number) {
    if (!last) last = t;
    const delta = t - last;
    last = t;
    if (mode === 'playing') {
      playerTimer += delta; ghostTimer += delta;
      ghosts.forEach((g) => (g.respawn = Math.max(0, g.respawn - delta)));
      let moved = false;
      if (playerTimer >= PLAYER_MOVE_MS) { movePlayer(); playerTimer = 0; moved = true; mouth = (mouth + 1) % 4; }
      if (ghostTimer >= GHOST_MOVE_MS) { moveGhosts(); ghostTimer = 0; moved = true; }
      collisions();
      const wasFrightened = frightened > 0;
      frightened = Math.max(0, frightened - delta);
      if (moved || wasFrightened !== frightened > 0) render();
    }
    requestAnimationFrame(tick);
  }

  // 게임 화면
  function drawGame() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W * TILE, H * TILE);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (maze[y][x] === '#') {
        ctx.fillStyle = '#172bba'; ctx.fillRect(x * TILE + 2, y * TILE + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#263fff'; ctx.fillRect(x * TILE + 5, y * TILE + 5, TILE - 10, TILE - 10);
      } else if (pellets.has(key(x, y))) {
        ctx.fillStyle = '#fff0a8'; ctx.beginPath();
        ctx.arc(x * TILE + 10, y * TILE + 10, maze[y][x] === 'o' ? 4 : 1.7, 0, Math.PI * 2); ctx.fill();
      }
    }
    if (fruit) {
      const fx = fruit.x * TILE + 10, fy = fruit.y * TILE + 10;
      ctx.fillStyle = '#ed2145'; ctx.beginPath(); ctx.arc(fx - 4, fy + 3, 5, 0, Math.PI * 2); ctx.arc(fx + 4, fy + 3, 5, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#66e06f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, fy - 4); ctx.quadraticCurveTo(fx + 1, fy - 11, fx + 7, fy - 12); ctx.stroke();
    }
    const angle = Math.atan2(player.dir[1], player.dir[0]) || 0, gap = mouth < 2 ? 0.18 : 0.02;
    ctx.fillStyle = '#ffe500'; ctx.beginPath(); ctx.moveTo(player.x * TILE + 10, player.y * TILE + 10);
    ctx.arc(player.x * TILE + 10, player.y * TILE + 10, 8, angle + gap, angle + Math.PI * 2 - gap); ctx.closePath(); ctx.fill();
    for (const g of ghosts) {
      if (g.respawn > 0) continue;
      const x = g.x * TILE + 10, y = g.y * TILE + 10;
      ctx.fillStyle = frightened ? '#243a99' : g.color; ctx.beginPath(); ctx.arc(x, y - 1, 8, Math.PI, 0);
      ctx.lineTo(x + 8, y + 8); ctx.lineTo(x + 4, y + 5); ctx.lineTo(x, y + 8); ctx.lineTo(x - 4, y + 5); ctx.lineTo(x - 8, y + 8); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 3, y - 2, 2.5, 0, 7); ctx.arc(x + 3, y - 2, 2.5, 0, 7); ctx.fill();
    }
  }

  // Dot Pad 핀
  function objects() {
    const list: { x: number; y: number; glyph: readonly string[] }[] = [{ x: player.x, y: player.y, glyph: GLYPHS.pacman }];
    for (const g of ghosts) if (g.respawn === 0) list.push({ x: g.x, y: g.y, glyph: GLYPHS.ghost });
    if (fruit) list.push({ x: fruit.x, y: fruit.y, glyph: GLYPHS.fruit });
    return list;
  }

  function setPin(pins: Uint8Array, x: number, y: number, v = 1) { if (x >= 0 && x < COLS && y >= 0 && y < ROWS) pins[y * COLS + x] = v; }
  function fill(pins: Uint8Array, left: number, top: number, w: number, h: number, v: number) { for (let y = top; y < top + h; y++) for (let x = left; x < left + w; x++) setPin(pins, x, y, v); }
  function glyph(pins: Uint8Array, left: number, top: number, rows: readonly string[]) {
    fill(pins, left, top, rows[0].length, rows.length, 0);
    rows.forEach((row, y) => [...row].forEach((on, x) => on === '1' && setPin(pins, left + x, top + y)));
  }

  // 전체 지도: 미로 28×30을 가운데 37×40 핀으로 줄여 벽을 올리고, 팩맨·유령·과일 위치만 표시
  function overviewPins() {
    const pins = new Uint8Array(COLS * ROWS);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < 37; x++) {
      const sx = Math.min(W - 1, Math.floor((x * W) / 37)), sy = Math.min(H - 1, Math.floor((y * H) / ROWS));
      if (maze[sy][sx] === '#') setPin(pins, x + 11, y);
    }
    for (const o of objects()) {
      const left = 11 + Math.min(36, Math.floor(((o.x + 0.5) * 37) / W)), top = Math.min(39, Math.floor(((o.y + 0.5) * ROWS) / H));
      o.glyph.forEach((row, y) => [...row].forEach((on, x) => on === '1' && setPin(pins, left + x, top + y)));
    }
    return pins;
  }

  // 확대: 게임 15×10칸을 한 칸당 4×4핀으로. 벽은 전부 올리고 길은 내려서 손으로 통로를 따라가게 함
  function focusPins() {
    const pins = new Uint8Array(COLS * ROWS).fill(1);
    for (let vy = 0; vy < 10; vy++) for (let vx = 0; vx < 15; vx++) {
      const sx = camera.x + vx, sy = camera.y + vy, left = vx * 4, top = vy * 4;
      if (!walk(sx, sy)) continue;
      fill(pins, left, top, 4, 4, 0);
      if (pellets.has(key(sx, sy))) maze[sy][sx] === 'o' ? glyph(pins, left + 1, top + 1, GLYPHS.power) : setPin(pins, left + 2, top + 2);
    }
    for (const o of objects()) {
      const vx = o.x - camera.x, vy = o.y - camera.y;
      if (vx >= 0 && vx < 15 && vy >= 0 && vy < 10) glyph(pins, vx * 4 + 1, vy * 4 + 1, o.glyph);
    }
    return pins;
  }

  function setPage(px: number, py: number) {
    camera.pageX = Math.max(0, Math.min(PAGE_X.length - 1, px));
    camera.pageY = Math.max(0, Math.min(PAGE_Y.length - 1, py));
    camera.x = PAGE_X[camera.pageX]; camera.y = PAGE_Y[camera.pageY]; camera.ready = true;
  }

  function updateCamera() {
    const tx = player.x >= 14 ? 1 : 0, ty = Math.min(2, Math.floor(player.y / 10));
    if (!camera.ready || (follow && (camera.pageX !== tx || camera.pageY !== ty))) setPage(tx, ty);
  }

  function drawPad(pins: Uint8Array) {
    const s = opts.pad.width / COLS;
    pctx.fillStyle = '#18181b';
    pctx.fillRect(0, 0, opts.pad.width, opts.pad.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      const up = pins[y * COLS + x];
      pctx.beginPath();
      pctx.arc(x * s + s / 2, y * s + s / 2, up ? s * 0.38 : s * 0.16, 0, Math.PI * 2);
      pctx.fillStyle = up ? '#fafafa' : '#3f3f46';
      pctx.fill();
    }
  }

  function viewLabel() {
    if (view === 'overview') return '전체 지도';
    return `확대, 구역 ${camera.pageY * 2 + camera.pageX + 1}/6 (${camera.x + 1}~${camera.x + 15}열, ${camera.y + 1}~${camera.y + 10}행), ${follow ? '자동 전환' : '직접 이동'}`;
  }

  function render() {
    drawGame();
    updateCamera();
    drawPad(view === 'focus' ? focusPins() : overviewPins());
    opts.onStatus({ score, lives, mode, view: viewLabel() });
  }

  // 길을 따라 잰 거리 (BFS)
  function pathDistance(to: Dir, max = 12) {
    const seen = new Set([key(player.x, player.y)]), queue: [number, number, number][] = [[player.x, player.y, 0]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y, d] = queue[i];
      if (x === to[0] && y === to[1]) return d;
      if (d >= max) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (walk(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); queue.push([nx, ny, d + 1]); }
      }
    }
    return null;
  }

  function describe() {
    const dirName = (dx: number, dy: number) => (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? '왼쪽' : '오른쪽') : dy < 0 ? '위쪽' : '아래쪽');
    let near: { d: number; g: Ghost } | null = null;
    for (const g of ghosts) {
      if (g.respawn > 0) continue;
      const d = pathDistance([g.x, g.y]);
      if (d !== null && (!near || d < near.d)) near = { d, g };
    }
    const ghost = near
      ? `가장 가까운 ${frightened ? '파란 ' : ''}유령은 ${dirName(near.g.x - player.x, near.g.y - player.y)}으로 ${near.d}칸 떨어져 있어요.`
      : '12칸 안에는 유령이 없어요.';
    return `팩맨은 ${player.x + 1}열 ${player.y + 1}행에 있어요. ${ghost} 점수 ${score}점, 목숨 ${lives}개.`;
  }

  function start() {
    if (mode === 'over' || mode === 'won') newGame(false);
    if (mode !== 'playing') { mode = 'playing'; opts.onMessage(''); }
  }

  newGame(false);
  requestAnimationFrame(tick);

  return {
    steer(dir: Dir) { player.want = dir; start(); },
    togglePause() {
      if (mode === 'playing') { mode = 'paused'; opts.onMessage('일시정지. 스페이스를 누르면 계속합니다.'); render(); }
      else if (mode === 'paused') start();
    },
    newGame: (random: boolean) => newGame(random),
    setView(v: View) { view = v; render(); },
    toggleFollow() { follow = !follow; render(); return follow; },
    pan(dx: number, dy: number) { view = 'focus'; follow = false; setPage(camera.pageX + dx, camera.pageY + dy); render(); },
    describe,
    get view() { return view; },
    get follow() { return follow; },
  };
}
