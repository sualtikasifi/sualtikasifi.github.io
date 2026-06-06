export const GAME_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  width: 100%; height: 100%;
  overflow: hidden;
  background: #130B2E;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
canvas { display: block; position: fixed; top: 0; left: 0; }
</style>
</head>
<body>
<canvas id="gc"></canvas>
<script>
(function () {
'use strict';

// ─── PHYSICS CONSTANTS ───────────────────────────────────────
var CELL         = 18;    // grid cell size px
var BALL_R       = 13;    // ball radius px
var GRAVITY      = 0.48;
var RESTITUTION  = 0.42;  // bounce factor
var FRICTION_AIR = 0.98;  // velocity damping per frame
var FRICTION_GND = 0.80;  // extra x-damping on ground contact
var DIG_R        = 30;    // dig brush radius px
var GOAL_R       = 22;    // goal zone radius px

// ─── COLORS ──────────────────────────────────────────────────
var C_BG        = '#130B2E';
var C_BOARD_OUT = '#3B2585';
var C_BOARD_IN  = '#251660';
var C_SAND_A    = '#0CB4E4';
var C_SAND_B    = '#09A0CB';
var C_OBS_LIGHT = '#E0DFEE';
var C_OBS_MID   = '#B8B7CC';
var C_BALL_HI   = '#FFFFFF';
var C_BALL_MID  = '#8A8A9A';
var C_BALL_LO   = '#35354A';

// ─── CANVAS ──────────────────────────────────────────────────
var canvas = document.getElementById('gc');
var ctx    = canvas.getContext('2d');
var dpr    = window.devicePixelRatio || 1;

var W, H;
var BX, BY, BW, BH;  // board pixel rect
var COLS, ROWS;

function setDimensions() {
  var oldW = W, oldH = H;
  W = window.innerWidth;
  H = window.innerHeight;
  if (W === oldW && H === oldH) return;

  canvas.width  = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  canvas.style.width  = W + 'px';
  canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  var padX = Math.round(W * 0.06);
  var bwRaw = W - padX * 2;
  COLS = Math.floor(bwRaw / CELL);
  BW   = COLS * CELL;
  BX   = Math.round((W - BW) / 2);

  var bhRaw = Math.round(H * 0.73);
  ROWS = Math.floor(bhRaw / CELL);
  BH   = ROWS * CELL;
  BY   = Math.round((H - BH) * 0.44);
}

// ─── GAME STATE ──────────────────────────────────────────────
var sandGrid   = [];   // Uint8Array per row; 1 = sand present
var levelData  = null;
var obstacles  = [];   // processed pixel-coord obstacles
var ball       = { x:0, y:0, vx:0, vy:0 };
var gameState  = 'playing'; // 'playing' | 'won'
var frame      = 0;
var winCooldown = 0;

// ─── LEVEL INIT ──────────────────────────────────────────────
function initLevel(data) {
  levelData  = data;
  gameState  = 'playing';
  winCooldown = 0;
  frame      = 0;

  // Build sand grid (all filled)
  sandGrid = [];
  for (var r = 0; r < ROWS; r++) {
    sandGrid[r] = new Uint8Array(COLS).fill(1);
  }

  // Process obstacles to pixel coords
  obstacles = data.obstacles.map(function(o) {
    var ref = Math.min(BW, BH);
    return {
      type: o.type,
      px:   BX + o.x * BW,
      py:   BY + o.y * BH,
      pw:   (o.w || 0) * BW,
      ph:   (o.h || 0) * BH,
      pr:   (o.r || 0) * ref,
    };
  });

  // Clear obstacle cells from sand
  clearObstacleCells();

  // Ball start
  var bx = BX + data.ball.x * BW;
  var by = BY + data.ball.y * BH;
  ball = { x: bx, y: by, vx: 0, vy: 0 };
  clearSandCircle(bx, by, BALL_R * 2.8);

  // Goal clear
  clearSandCircle(BX + data.goal.x * BW, BY + data.goal.y * BH, GOAL_R * 1.6);
}

function clearObstacleCells() {
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!sandGrid[r][c]) continue;
      var cx = BX + c * CELL + CELL * 0.5;
      var cy = BY + r * CELL + CELL * 0.5;
      for (var i = 0; i < obstacles.length; i++) {
        if (ptInObstacle(cx, cy, obstacles[i])) {
          sandGrid[r][c] = 0;
          break;
        }
      }
    }
  }
}

function clearSandCircle(wx, wy, radius) {
  var c0 = Math.floor((wx - radius - BX) / CELL);
  var c1 = Math.ceil ((wx + radius - BX) / CELL);
  var r0 = Math.floor((wy - radius - BY) / CELL);
  var r1 = Math.ceil ((wy + radius - BY) / CELL);
  for (var r = r0; r <= r1; r++) {
    if (r < 0 || r >= ROWS) continue;
    for (var c = c0; c <= c1; c++) {
      if (c < 0 || c >= COLS) continue;
      var cx = BX + c * CELL + CELL * 0.5;
      var cy = BY + r * CELL + CELL * 0.5;
      var d  = Math.sqrt((cx-wx)*(cx-wx) + (cy-wy)*(cy-wy));
      if (d <= radius) sandGrid[r][c] = 0;
    }
  }
}

// ─── OBSTACLE HIT-TEST ───────────────────────────────────────
function ptInObstacle(px, py, o) {
  if (o.type === 'circle') {
    var dx = px - o.px, dy = py - o.py;
    return dx*dx + dy*dy <= o.pr * o.pr;
  }
  if (o.type === 'capsule') {
    var vert = o.ph >= o.pw;
    if (vert) {
      var r  = o.pw * 0.5;
      var cy1 = o.py - o.ph * 0.5 + r;
      var cy2 = o.py + o.ph * 0.5 - r;
      if (px >= o.px - r && px <= o.px + r && py >= cy1 && py <= cy2) return true;
      var d1 = Math.sqrt((px-o.px)*(px-o.px) + (py-cy1)*(py-cy1));
      var d2 = Math.sqrt((px-o.px)*(px-o.px) + (py-cy2)*(py-cy2));
      return d1 <= r || d2 <= r;
    } else {
      var r2  = o.ph * 0.5;
      var cx1 = o.px - o.pw * 0.5 + r2;
      var cx2 = o.px + o.pw * 0.5 - r2;
      if (py >= o.py - r2 && py <= o.py + r2 && px >= cx1 && px <= cx2) return true;
      var da = Math.sqrt((px-cx1)*(px-cx1) + (py-o.py)*(py-o.py));
      var db = Math.sqrt((px-cx2)*(px-cx2) + (py-o.py)*(py-o.py));
      return da <= r2 || db <= r2;
    }
  }
  return false;
}

// ─── DIGGING ─────────────────────────────────────────────────
function digAt(wx, wy) {
  if (gameState !== 'playing') return;
  var c0 = Math.floor((wx - DIG_R - BX) / CELL);
  var c1 = Math.ceil ((wx + DIG_R - BX) / CELL);
  var r0 = Math.floor((wy - DIG_R - BY) / CELL);
  var r1 = Math.ceil ((wy + DIG_R - BY) / CELL);
  for (var r = r0; r <= r1; r++) {
    if (r < 0 || r >= ROWS) continue;
    for (var c = c0; c <= c1; c++) {
      if (c < 0 || c >= COLS) continue;
      if (!sandGrid[r][c]) continue;
      var cx = BX + c * CELL + CELL * 0.5;
      var cy = BY + r * CELL + CELL * 0.5;
      var d  = Math.sqrt((cx-wx)*(cx-wx) + (cy-wy)*(cy-wy));
      if (d > DIG_R) continue;
      // Prevent digging obstacle cells
      var inObs = false;
      for (var i = 0; i < obstacles.length; i++) {
        if (ptInObstacle(cx, cy, obstacles[i])) { inObs = true; break; }
      }
      if (!inObs) sandGrid[r][c] = 0;
    }
  }
}

// ─── PHYSICS ─────────────────────────────────────────────────
function updatePhysics() {
  if (gameState !== 'playing') {
    if (winCooldown > 0) winCooldown--;
    return;
  }

  // Gravity
  ball.vy += GRAVITY;

  // Integrate
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Air friction
  ball.vx *= FRICTION_AIR;

  // Board wall collisions
  if (ball.x - BALL_R < BX) {
    ball.x = BX + BALL_R;
    ball.vx = Math.abs(ball.vx) * RESTITUTION;
  }
  if (ball.x + BALL_R > BX + BW) {
    ball.x = BX + BW - BALL_R;
    ball.vx = -Math.abs(ball.vx) * RESTITUTION;
  }
  if (ball.y - BALL_R < BY) {
    ball.y = BY + BALL_R;
    ball.vy = Math.abs(ball.vy) * RESTITUTION;
  }
  if (ball.y + BALL_R > BY + BH) {
    ball.y = BY + BH - BALL_R;
    ball.vy = -Math.abs(ball.vy) * RESTITUTION;
    ball.vx *= FRICTION_GND;
  }

  // Sand collision
  resolveSandCollisions();

  // Obstacle collisions
  for (var i = 0; i < obstacles.length; i++) {
    resolveObstacleCollision(obstacles[i]);
  }

  // Goal detection
  if (levelData) {
    var gx = BX + levelData.goal.x * BW;
    var gy = BY + levelData.goal.y * BH;
    var dist = Math.sqrt((ball.x-gx)*(ball.x-gx) + (ball.y-gy)*(ball.y-gy));
    if (dist < BALL_R + GOAL_R) {
      gameState  = 'won';
      winCooldown = 60;
      rn_postMessage('LEVEL_COMPLETE');
    }
  }
}

function resolveSandCollisions() {
  var r0 = Math.floor((ball.y - BALL_R - BY) / CELL) - 1;
  var r1 = Math.ceil ((ball.y + BALL_R - BY) / CELL) + 1;
  var c0 = Math.floor((ball.x - BALL_R - BX) / CELL) - 1;
  var c1 = Math.ceil ((ball.x + BALL_R - BX) / CELL) + 1;

  for (var r = r0; r <= r1; r++) {
    if (r < 0 || r >= ROWS) continue;
    for (var c = c0; c <= c1; c++) {
      if (c < 0 || c >= COLS) continue;
      if (!sandGrid[r][c]) continue;

      var cellL = BX + c * CELL;
      var cellT = BY + r * CELL;
      var cellR = cellL + CELL;
      var cellB = cellT + CELL;

      // Nearest point on AABB to ball center
      var nearX = ball.x < cellL ? cellL : (ball.x > cellR ? cellR : ball.x);
      var nearY = ball.y < cellT ? cellT : (ball.y > cellB ? cellB : ball.y);

      var dx = ball.x - nearX;
      var dy = ball.y - nearY;
      var dist = Math.sqrt(dx*dx + dy*dy);

      if (dist < BALL_R) {
        var overlap = BALL_R - dist;
        var nx, ny;
        if (dist < 0.001) { nx = 0; ny = -1; }
        else { nx = dx / dist; ny = dy / dist; }

        ball.x += nx * (overlap + 0.1);
        ball.y += ny * (overlap + 0.1);

        var dot = ball.vx * nx + ball.vy * ny;
        if (dot < 0) {
          ball.vx -= (1 + RESTITUTION) * dot * nx;
          ball.vy -= (1 + RESTITUTION) * dot * ny;
          if (Math.abs(ny) > 0.6) {
            ball.vx *= FRICTION_GND;
          }
        }
      }
    }
  }
}

function resolveObstacleCollision(o) {
  var nx, ny, dist, overlap;

  if (o.type === 'circle') {
    var dx = ball.x - o.px;
    var dy = ball.y - o.py;
    dist   = Math.sqrt(dx*dx + dy*dy);
    overlap = BALL_R + o.pr - dist;
    if (overlap > 0 && dist > 0.001) {
      nx = dx / dist; ny = dy / dist;
      applyCollisionResponse(nx, ny, overlap);
    }
    return;
  }

  if (o.type === 'capsule') {
    var vert = o.ph >= o.pw;
    var ax, ay, bx, by, capR;
    if (vert) {
      capR = o.pw * 0.5;
      ax = o.px; ay = o.py - o.ph * 0.5 + capR;
      bx = o.px; by = o.py + o.ph * 0.5 - capR;
    } else {
      capR = o.ph * 0.5;
      ax = o.px - o.pw * 0.5 + capR; ay = o.py;
      bx = o.px + o.pw * 0.5 - capR; by = o.py;
    }
    var cp = closestPtOnSeg(ax, ay, bx, by, ball.x, ball.y);
    var ddx = ball.x - cp.x;
    var ddy = ball.y - cp.y;
    dist = Math.sqrt(ddx*ddx + ddy*ddy);
    overlap = BALL_R + capR - dist;
    if (overlap > 0 && dist > 0.001) {
      nx = ddx / dist; ny = ddy / dist;
      applyCollisionResponse(nx, ny, overlap);
    }
  }
}

function applyCollisionResponse(nx, ny, overlap) {
  ball.x += nx * (overlap + 0.1);
  ball.y += ny * (overlap + 0.1);
  var dot = ball.vx * nx + ball.vy * ny;
  if (dot < 0) {
    ball.vx -= (1 + RESTITUTION) * dot * nx;
    ball.vy -= (1 + RESTITUTION) * dot * ny;
    if (Math.abs(ny) > 0.6) ball.vx *= FRICTION_GND;
  }
}

function closestPtOnSeg(ax, ay, bx, by, px, py) {
  var dx = bx - ax, dy = by - ay;
  var len2 = dx*dx + dy*dy;
  if (len2 < 0.001) return { x: ax, y: ay };
  var t = ((px-ax)*dx + (py-ay)*dy) / len2;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return { x: ax + t*dx, y: ay + t*dy };
}

// ─── RENDERING ───────────────────────────────────────────────
function render() {
  frame++;
  ctx.clearRect(0, 0, W, H);

  // Background
  ctx.fillStyle = C_BG;
  ctx.fillRect(0, 0, W, H);

  // Board outer shadow + border
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur   = 22;
  ctx.shadowOffsetY = 8;
  rrFill(BX-10, BY-10, BW+20, BH+20, 18, C_BOARD_OUT);
  ctx.restore();

  // Board inner background (dark, empty areas)
  ctx.save();
  rrClip(BX, BY, BW, BH, 12);
  ctx.fillStyle = C_BOARD_IN;
  ctx.fillRect(BX, BY, BW, BH);

  // Sand cells
  for (var r = 0; r < ROWS; r++) {
    for (var c = 0; c < COLS; c++) {
      if (!sandGrid[r][c]) continue;
      ctx.fillStyle = (r + c) % 2 === 0 ? C_SAND_A : C_SAND_B;
      ctx.fillRect(BX + c*CELL, BY + r*CELL, CELL, CELL);
    }
  }
  ctx.restore();

  // Obstacles (drawn outside clip so shadow is visible)
  for (var i = 0; i < obstacles.length; i++) drawObstacle(obstacles[i]);

  // Goal zone
  drawGoal();

  // Ball
  drawBall();

  // Win overlay fade-in
  if (gameState === 'won' && winCooldown > 0) {
    var alpha = Math.min(0.45, (60 - winCooldown) / 60 * 0.45);
    ctx.fillStyle = 'rgba(0,0,0,' + alpha + ')';
    ctx.fillRect(0, 0, W, H);
  }
}

function drawObstacle(o) {
  ctx.save();
  ctx.shadowColor  = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur   = 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;

  if (o.type === 'circle') {
    var g = ctx.createRadialGradient(
      o.px - o.pr*0.32, o.py - o.pr*0.32, o.pr*0.08,
      o.px, o.py, o.pr
    );
    g.addColorStop(0, C_OBS_LIGHT);
    g.addColorStop(1, C_OBS_MID);
    ctx.beginPath();
    ctx.arc(o.px, o.py, o.pr, 0, Math.PI*2);
    ctx.fillStyle = g;
    ctx.fill();
  } else if (o.type === 'capsule') {
    ctx.fillStyle = C_OBS_MID;
    var vert2 = o.ph >= o.pw;
    if (vert2) {
      var r3 = o.pw * 0.5;
      var topY = o.py - o.ph*0.5;
      var botY = o.py + o.ph*0.5;
      ctx.beginPath();
      ctx.arc(o.px, topY + r3, r3, Math.PI, 0);
      ctx.arc(o.px, botY - r3, r3, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      // highlight
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = C_OBS_LIGHT;
      var hr = r3 * 0.55;
      ctx.beginPath();
      ctx.arc(o.px - r3*0.2, topY + r3 + hr, hr, Math.PI, 0);
      ctx.arc(o.px - r3*0.2, botY - r3 - hr, hr, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    } else {
      var r4 = o.ph * 0.5;
      var lX = o.px - o.pw*0.5;
      var rX = o.px + o.pw*0.5;
      ctx.beginPath();
      ctx.arc(lX + r4, o.py, r4, Math.PI*0.5, -Math.PI*0.5, true);
      ctx.arc(rX - r4, o.py, r4, -Math.PI*0.5, Math.PI*0.5, true);
      ctx.closePath();
      ctx.fill();
      // highlight
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = C_OBS_LIGHT;
      var hr2 = r4 * 0.55;
      ctx.beginPath();
      ctx.arc(lX + r4, o.py - r4*0.2, hr2, Math.PI*0.5, -Math.PI*0.5, true);
      ctx.arc(rX - r4, o.py - r4*0.2, hr2, -Math.PI*0.5, Math.PI*0.5, true);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawGoal() {
  if (!levelData) return;
  var gx = BX + levelData.goal.x * BW;
  var gy = BY + levelData.goal.y * BH;
  var pulse = 0.84 + 0.16 * Math.sin(frame * 0.07);
  var pulseR = GOAL_R * pulse;

  // Outer glow
  var grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, pulseR * 2.2);
  grad.addColorStop(0,   'rgba(255,210,0,0.70)');
  grad.addColorStop(0.45,'rgba(255,120,0,0.35)');
  grad.addColorStop(1,   'rgba(255,60,0,0)');
  ctx.beginPath();
  ctx.arc(gx, gy, pulseR * 2.2, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Inner disc
  ctx.beginPath();
  ctx.arc(gx, gy, pulseR, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,200,0,0.85)';
  ctx.fill();

  // Ring
  ctx.beginPath();
  ctx.arc(gx, gy, pulseR, 0, Math.PI*2);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth   = 2.5;
  ctx.stroke();
}

function drawBall() {
  var hx = ball.x - BALL_R * 0.38;
  var hy = ball.y - BALL_R * 0.38;
  var grad = ctx.createRadialGradient(hx, hy, BALL_R*0.04, ball.x, ball.y, BALL_R);
  grad.addColorStop(0,    C_BALL_HI);
  grad.addColorStop(0.30, C_BALL_MID);
  grad.addColorStop(1,    C_BALL_LO);

  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur    = 14;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 5;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
}

// ─── CANVAS HELPERS ──────────────────────────────────────────
function rrPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y);
  ctx.arcTo(x+w, y,   x+w, y+r,   r);
  ctx.lineTo(x+w, y+h-r);
  ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
  ctx.lineTo(x+r, y+h);
  ctx.arcTo(x,   y+h, x, y+h-r,   r);
  ctx.lineTo(x,   y+r);
  ctx.arcTo(x,   y,   x+r, y,     r);
  ctx.closePath();
}

function rrFill(x, y, w, h, r, color) {
  rrPath(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function rrClip(x, y, w, h, r) {
  rrPath(x, y, w, h, r);
  ctx.clip();
}

// ─── TOUCH / MOUSE INPUT ─────────────────────────────────────
var pointers = {};  // track active touch points

canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t = e.changedTouches[i];
    pointers[t.identifier] = true;
    digAt(t.clientX, t.clientY);
  }
}, { passive: false });

canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  for (var i = 0; i < e.changedTouches.length; i++) {
    var t2 = e.changedTouches[i];
    if (pointers[t2.identifier]) digAt(t2.clientX, t2.clientY);
  }
}, { passive: false });

canvas.addEventListener('touchend', function(e) {
  for (var i = 0; i < e.changedTouches.length; i++) {
    delete pointers[e.changedTouches[i].identifier];
  }
});

// Desktop / browser testing
var mouseDown = false;
canvas.addEventListener('mousedown', function(e) { mouseDown = true; digAt(e.clientX, e.clientY); });
canvas.addEventListener('mousemove', function(e) { if (mouseDown) digAt(e.clientX, e.clientY); });
canvas.addEventListener('mouseup',   function()  { mouseDown = false; });

// ─── RN BRIDGE ───────────────────────────────────────────────
function rn_postMessage(type, extra) {
  try {
    var payload = Object.assign({ type: type }, extra || {});
    var msg = JSON.stringify(payload);
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(msg);
    } else {
      console.log('[GAME]', msg);
    }
  } catch(err) {}
}

window.loadLevel = function(data) {
  setDimensions();
  initLevel(data);
};

window.restartLevel = function() {
  if (levelData) {
    setDimensions();
    initLevel(levelData);
  }
};

// ─── GAME LOOP ───────────────────────────────────────────────
function loop() {
  updatePhysics();
  render();
  requestAnimationFrame(loop);
}

// ─── STARTUP ─────────────────────────────────────────────────
setDimensions();
rn_postMessage('READY');
requestAnimationFrame(loop);

window.addEventListener('resize', function() {
  setDimensions();
  if (levelData) initLevel(levelData);
});

})();
<\/script>
</body>
</html>`;
