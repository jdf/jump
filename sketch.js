// bg color
const bg = 0;

// length of dude's side
const side = 30;

// A unitless constant that we apply to velocity while on the ground.
const friction = 0.95;

// A unitless constant that we apply to bearing when not accelerating.
const bearingFriction = 0.8;

// The following constants are pixels per second.
const gravity = 1400.0;
const maxvel = 240.0;
const maxbearing = maxvel * 0.9;
const accel = 900.0;
const airBending = 375.0;
const bearingAccel = 1200.0;
const jumpImpulse = -700.0;

const maxSquishVel = 80.0;

// Max vertical velocity while holding down jump.
const jumpTerminalVelocity = 250.0;
const terminalVelocity = 550.0;

// Blinking.
const blinkCycleSeconds = 0.25;

// Jump state.
const jumpStateIdle = 0;
const jumpStateJumping = 1;
const jumpStateLanded = 2;
let jumpState = jumpStateIdle;

function jumpControlIsEngaged() {
  return keyIsDown(32); // spacebar
}

function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

function sign(x) {
  return x < 0 ? -1 : 1;
}

class Dude {
  constructor(sideLength, fillColor) {
    this.sideLength = sideLength;
    this.fillColor = fillColor;
    // Position of dude's bottom center.
    this.pos = {
      x: 0,
      y: 0
    };
    this.vel = {
      x: 0,
      y: 0
    };
    // The direction the eye is facing.
    this.bearing = 0;

    // Defect in vertical size, pixels.
    // Horizontal gets inverse.
    this.vSquish = 0;
    // per second
    this.vSquishVel = 0;

    this.blinkCumulativeTime = -1;
  }

  setPos(x, y) {
    this.pos = {
      x,
      y
    };
  }

  blink() {
    if (this.blinkCumulativeTime != -1) return;
    this.blinkCumulativeTime = 0;
  }

  drawAt(x, y) {
    rectMode(CENTER);
    fill(this.fillColor);
    noStroke();
    const s = this.sideLength;
    const half = s / 2;
    const xsquish = this.vSquish * 0.8;
    const ysquish = this.vSquish * 1.6;
    rect(x, y - half - ysquish / 2.0,
      s - xsquish, s + ysquish, 3, 3);

    const eyeOffset =
      lerp(0, half - 6, abs(this.bearing / maxvel));
    const pupilOffset =
      lerp(0, half - 3, abs(this.bearing / maxvel));
    fill(255, 255, 255);
    const eyeVCenter = y - s + 8 - this.vSquish;
    ellipse(x + eyeOffset * sign(this.bearing),
      eyeVCenter, 10, 10);
    fill(0);
    ellipse(x + pupilOffset * sign(this.bearing),
      eyeVCenter, 3, 3);

    rectMode(CORNERS);
    if (this.blinkCumulativeTime != -1) {
      const blinkCycle =
        this.blinkCumulativeTime / blinkCycleSeconds;
      fill(this.fillColor);
      const lidTopY = eyeVCenter - 6;
      const lidBottomY =
        lidTopY + 12 * sin(PI * blinkCycle);
      rect(x - half + 3, lidTopY, x + half - 3, lidBottomY);
    }
  }

  draw() {
    const {
      x,
      y
    } = this.pos;
    this.drawAt(x, y);
    const half = this.sideLength / 2;
    if (x < half) {
      this.drawAt(width + x, y);
    } else if (x > width - half) {
      this.drawAt(x - width, y);
    }
  }

  xAccel(a) {
    this.vel.x = clamp(this.vel.x + a, -maxvel, maxvel);
  }

  adjustBearing(a) {
    this.bearing =
      clamp(this.bearing + a, -maxvel, maxvel);
  }

  yAccel(a) {
    this.vel.y = this.vel.y + a;
    const term = jumpControlIsEngaged() ?
      jumpTerminalVelocity : terminalVelocity;
    if (this.vel.y > term) {
      this.vel.y = term;
    }
  }

  jump() {
    this.vel.y = jumpImpulse;
    this.vSquishVel = maxSquishVel;
  }

  applyFriction() {
    this.vel.x *= friction;
  }

  applyBearingFriction() {
    this.bearing *= bearingFriction;
  }

  move(dt) {
    if (this.blinkCumulativeTime != -1) {
      this.blinkCumulativeTime += dt;
    }
    if (this.blinkCumulativeTime >= blinkCycleSeconds) {
      this.blinkCumulativeTime = -1;
    }
    const s = this.sideLength;
    this.pos.x += this.vel.x * dt;
    if (this.pos.x > width) {
      this.pos.x = 0;
    } else if (this.pos.x < 0) {
      this.pos.x = width;
    }
    this.pos.y += this.vel.y * dt;
    if (this.pos.y >= height &&
      jumpState == jumpStateJumping) {
      if (!jumpControlIsEngaged()) this.blink();  // blink on hard landing
      this.vSquishVel = -this.vel.y / 5.0;
      this.pos.y = height;
      this.vel.y = 0;
      jumpState = jumpStateLanded;
    }

    if (abs(this.vSquishVel + this.vSquish) < 0.2) {
      this.vSquishVel = this.vSquish = 0;
    } else {
      // squish stiffness
      const k = 200.0;
      const damping = 8.5;

      const squishForce = -k * this.vSquish;
      const dampingForce = damping * this.vSquishVel;
      this.vSquishVel +=
        (squishForce - dampingForce) * dt;
      this.vSquishVel = clamp(
        this.vSquishVel, -maxSquishVel, maxSquishVel);
      this.vSquish += this.vSquishVel * dt;
    }
  }

  isInContactWithGround() {
    return this.pos.y == height;
  }
}

let dude;
let previousFrameMillis;

function setup() {
  createCanvas(400, 400);
  dude = new Dude(side, color(255, 119, 0)); //color(151, 84, 240)
  dude.setPos(width / 2, height);
  previousFrameMillis = millis();
}

function keyPressed() {
  if (key == ' ') {
    if (dude.isInContactWithGround()) {
      jumpState = jumpStateJumping;
    }
  }
}

function keyReleased() {
  if (key == ' ') {
    if (dude.isInContactWithGround()) {
      jumpState = jumpStateIdle;
    }
  }
}

const blinkOdds = 1 / 250.0;

let instructionFadeStart = -1;
let instructionsShowing = true;

function draw() {
  background(bg);

  if (random() < blinkOdds) {
    dude.blink();
  }

  const lefting = keyIsDown(LEFT_ARROW);
  const righting = keyIsDown(RIGHT_ARROW);

  if (instructionsShowing && instructionFadeStart == -1 &&
    (lefting || righting ||
      jumpState == jumpStateJumping)) {
    instructionFadeStart = millis();
  }

  const t = millis();
  const dt = (t - previousFrameMillis) / 1000.0;
  previousFrameMillis = t;

  const whichAccel = dude.isInContactWithGround() ? accel : airBending;
  if (lefting) {
    dude.adjustBearing(-bearingAccel * dt);
    dude.xAccel(-whichAccel * dt);
  } else if (righting) {
    dude.adjustBearing(bearingAccel * dt);
    dude.xAccel(whichAccel * dt);
  } else {
    dude.applyBearingFriction();
  }

  if (dude.isInContactWithGround()) {
    if (jumpState == jumpStateJumping) {
      dude.jump();
    }
    if (!(lefting || righting)) {
      dude.applyFriction();
    }
  } else {
    dude.yAccel(gravity * dt);
  }
  dude.move(dt);
  dude.draw();

  if (instructionsShowing) {
    let textColor = 200;
    if (instructionFadeStart != -1) {
      const elapsed = millis() - instructionFadeStart;
      if (elapsed > 1000) {
        textColor = 200 * (1 - (elapsed - 1000) / 1000.0);
      }
      if (elapsed >= 2000) {
        instructionsShowing = false;
      }
    }
    fill(textColor);
    text("left/right arrows to move", 10, 20);
    text("spacebar to jump", 10, 36);
  }
}