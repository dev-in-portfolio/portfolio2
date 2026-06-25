import GUI from 'lil-gui';

const PLANET_R = 900.0;
const DEBUG_GL = true;

let __fatalEl: HTMLDivElement | null = null;
function showFatal(msg: string) {
  if (!__fatalEl) {
    __fatalEl = document.createElement('div');
    __fatalEl.style.cssText = `
      position:fixed; left:12px; right:12px; bottom:12px;
      padding:12px 14px; border-radius:12px;
      background:rgba(0,0,0,0.78); color:#fff; z-index:999999;
      font:14px/1.35 system-ui, -apple-system, Segoe UI, Roboto, Arial;
      border:1px solid rgba(255,255,255,0.14);
      pointer-events:none;
      white-space:pre-wrap;`;
    document.body.appendChild(__fatalEl);
  }
  __fatalEl.textContent = msg || '';
  __fatalEl.style.display = msg ? 'block' : 'none';
}

function glErr(gl: WebGL2RenderingContext, where: string) {
  const e = gl.getError();
  if (e !== gl.NO_ERROR) console.error(`[glError @ ${where}]`, e);
  return e;
}

function checkFBO(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer | null, label = 'fbo') {
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  const s = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (s !== gl.FRAMEBUFFER_COMPLETE) {
    console.error(`[${label}] INCOMPLETE: 0x${s.toString(16)}`);
    showFatal(`${label} incomplete: 0x${s.toString(16)}\n(disabling post-FX)`);
    return false;
  }
  return true;
}

let rtW = 0, rtH = 0;
let postTargetsReady = false;

const GLSL_COMMON = `
uniform float seed;
uniform float planetR;

float hash(vec3 p){p+=seed; p=fract(p*0.3183+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y*p.z));}
float noise(vec3 x){
  vec3 i=floor(x),f=fract(x);
  f=f*f*(3.-2.*f);
  return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 x){
  float v=0.,a=0.5;
  for(int i=0;i<4;i++){v+=a*noise(x);x*=2.05;a*=0.5;}
  return v;
}

vec2 hash2(vec2 p) {
  p += seed;
  p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3)));
  return fract(sin(p)*43758.5453);
}
float voronoi(vec2 x) {
  vec2 n = floor(x);
  vec2 f = fract(x);
  float md = 8.0;
  for(int j=-1; j<=1; j++)
  for(int i=-1; i<=1; i++) {
    vec2 g = vec2(float(i),float(j));
    vec2 o = hash2(n + g);
    vec2 r = g + o - f;
    float d = dot(r,r);
    if( d<md ) md=d;
  }
  return sqrt(md);
}

vec3 curlNoise(vec3 p) {
  float e = 0.1;
  float n1 = noise(p + vec3(e, 0, 0));
  float n2 = noise(p - vec3(e, 0, 0));
  float n3 = noise(p + vec3(0, e, 0));
  float n4 = noise(p - vec3(0, e, 0));
  float n5 = noise(p + vec3(0, 0, e));
  float n6 = noise(p - vec3(0, 0, e));
  return vec3(n3 - n4, n5 - n6, n1 - n2);
}

float luma(vec3 c){return dot(c, vec3(0.2126,0.7152,0.0722));}
`;

const GLSL_GEO = `
uniform vec3 ventDir[6];

vec2 rot2(vec2 p, float a){
  float c = cos(a), s = sin(a);
  return vec2(c*p.x - s*p.y, s*p.x + c*p.y);
}

float ringMask(float r, float r0, float w){
  return smoothstep(r0 - w, r0, r) - smoothstep(r0, r0 + w, r);
}

float coneShape(vec2 q, float radius, float height, float k){
  float d = length(q) / max(1e-6, radius);
  float m = clamp(1.0 - pow(d, k), 0.0, 1.0);
  return m*m * height;
}

float domeShape(vec2 q, float radius, float height, float k){
  float d = length(q) / max(1e-6, radius);
  float m = clamp(1.0 - pow(d, k), 0.0, 1.0);
  return m * height;
}

float angDist(vec3 a, vec3 b){
  return acos(clamp(dot(a,b), -1.0, 1.0));
}

int closestVentIndex(vec3 dir){
  float md = 1e9;
  int mi = 0;
  for(int i=0;i<6;i++){
    float d = angDist(dir, ventDir[i]);
    if(d < md){ md = d; mi = i; }
  }
  return mi;
}

void basis(vec3 n, out vec3 b1, out vec3 b2){
  vec3 up = (abs(n.y) < 0.99) ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  b1 = normalize(cross(up, n));
  b2 = normalize(cross(n, b1));
}

vec2 localUV(vec3 dir, vec3 centerDir){
  vec3 b1, b2;
  basis(centerDir, b1, b2);
  return vec2(dot(dir, b1), dot(dir, b2)) * planetR;
}

float getH(vec3 dir, float hs){
  float ground = (fbm(dir * 2.2) - 0.5) * 3.2;

  float r = angDist(dir, ventDir[0]) * planetR;

  float w = 2.6;
  float h = 0.0;

  float s0 = 1.0 - smoothstep(640.0 - w, 640.0 + w, r);
  float s1 = 1.0 - smoothstep(540.0 - w, 540.0 + w, r);
  float s2 = 1.0 - smoothstep(440.0 - w, 440.0 + w, r);
  float s3 = 1.0 - smoothstep(340.0 - w, 340.0 + w, r);
  float s4 = 1.0 - smoothstep(250.0 - w, 250.0 + w, r);
  float s5 = 1.0 - smoothstep(170.0 - w, 170.0 + w, r);
  float s6 = 1.0 - smoothstep(100.0 - w, 100.0 + w, r);
  float s7 = 1.0 - smoothstep(56.0  - w, 56.0  + w, r);

  h += 8.0  * s0;
  h += 12.0 * s1;
  h += 14.0 * s2;
  h += 16.0 * s3;
  h += 18.0 * s4;
  h += 20.0 * s5;
  h += 22.0 * s6;
  h += 24.0 * s7;

  h += exp(-r*r*0.0012) * 2.0;

  float craterR = 12.0;
  float crater = 1.0 - smoothstep(craterR*0.78, craterR, r);
  float bowl = crater * crater;
  h -= bowl * 20.0;

  float rim = smoothstep(craterR-1.0, craterR+1.0, r) - smoothstep(craterR+1.0, craterR+3.5, r);
  h += rim * 6.5;

  float cliff = 0.0;
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-640.0));
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-540.0));
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-440.0));
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-340.0));
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-250.0));
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-170.0));
  cliff += 1.0 - smoothstep(0.0, 7.0, abs(r-100.0));
  cliff = clamp(cliff, 0.0, 1.0);
  float strata = sin(r*0.45 + seed*2.0) + 0.5*sin(r*0.92 + seed*1.3);
  h += strata * 0.55 * cliff;

  h += (fbm(dir*6.0) - 0.5) * 0.9;

  float mesaMask = smoothstep(760.0, 600.0, r);
  float g0 = mix(ground, ground*0.18, mesaMask);
  float height = g0 + (h * mesaMask) * hs;

  {
    vec2 qs = localUV(dir, ventDir[1]);
    float strat = coneShape(qs, 170.0, 92.0, 1.12);
    float rs = length(qs);
    float sBowl = (1.0 - smoothstep(16.0, 26.0, rs));
    strat -= sBowl*sBowl * 12.0;
    strat += ringMask(rs, 24.0, 4.5) * 7.0;
    strat += (fbm(vec3(qs*0.05, 0.0)) - 0.5) * 1.0;
    height += strat * hs;
  }

  {
    vec2 qc = localUV(dir, ventDir[2]);
    float cinder = coneShape(qc, 120.0, 64.0, 1.05);
    float rc = length(qc);
    float crR = 18.0;
    float cBowl = (1.0 - smoothstep(crR*0.72, crR, rc));
    cinder -= cBowl*cBowl * 22.0;
    cinder += ringMask(rc, crR, 3.5) * 9.0;
    cinder += (fbm(vec3(qc*0.06, 0.0)) - 0.5) * 0.9;
    height += cinder * hs;
  }

  {
    vec2 qsh = localUV(dir, ventDir[3]);
    float shield = domeShape(qsh, 290.0, 40.0, 2.4);
    shield += (fbm(vec3(qsh*0.04, 0.0)) - 0.5) * 0.8;
    height += shield * hs;
  }

  {
    vec2 qk = localUV(dir, ventDir[4]);
    float calBase = domeShape(qk, 300.0, 48.0, 2.0);
    float rk = length(qk);
    float calR = 86.0;
    float calBowl = (1.0 - smoothstep(calR*0.78, calR, rk));
    float caldera = calBase - calBowl*calBowl * 34.0;
    caldera += ringMask(rk, calR, 7.0) * 12.0;
    caldera += (fbm(vec3(qk*0.05, 0.0)) - 0.5) * 0.9;
    height += caldera * hs;
  }

  {
    vec2 q = localUV(dir, ventDir[5]);
    vec2 qf = rot2(q, 0.55);
    float along = abs(qf.y);
    float dLine = abs(qf.x);
    float span = smoothstep(320.0, 40.0, along);
    float fissRidge = exp(-dLine*dLine*0.010) * span * 20.0;
    float fissShoulder = exp(-dLine*dLine*0.0025) * span * 12.0;
    float fissCrack = exp(-dLine*dLine*0.18) * span;
    float fissure = fissRidge + fissShoulder - fissCrack * 7.0;
    fissure += (fbm(vec3(q*0.05, 0.0)) - 0.5) * 0.6;
    height += fissure * hs;
  }

  return height;
}

float lavaVentLocal(vec2 q, float t, float fs, float ll, float coreR, float fallR){
  float r = length(q);
  if (r < coreR) return 1.0;
  vec2 dir = normalize(q + vec2(1e-6));
  vec2 flowUV = q * 0.1 - dir * t * fs;
  float n = fbm(vec3(flowUV, 0.0));
  float mask = smoothstep(0.55 - ll, 0.6 + ll, n);
  mask *= smoothstep(fallR, fallR*0.75, r);
  return mask;
}

float getLava(vec3 dir, float t, float fs, float ll) {
  float ll2 = max(ll * 0.65, 0.08);
  float m = 0.0;

  const float SEA_R = 750.0;
  const float FISSURE_SPAN = 520.0;

  m = max(m, lavaVentLocal(localUV(dir, ventDir[0]), t, fs, ll, 10.0, SEA_R));
  m = max(m, lavaVentLocal(localUV(dir, ventDir[1]), t, fs*0.85, ll2, 8.0, SEA_R));

  {
    vec2 qc = localUV(dir, ventDir[2]);
    float mc = lavaVentLocal(qc, t, fs*0.75, ll2, 6.5, SEA_R);
    float rc = length(qc);
    mc = max(mc, ringMask(rc, 18.0, 3.0) * (0.35 + 0.35*ll2));
    m = max(m, mc);
  }

  m = max(m, lavaVentLocal(localUV(dir, ventDir[3]), t, fs*0.65, ll2, 8.0, SEA_R));

  {
    vec2 qk = localUV(dir, ventDir[4]);
    float rk = length(qk);
    float mk = lavaVentLocal(qk, t, fs*0.7, ll2, 7.5, SEA_R);
    mk = max(mk, ringMask(rk, 86.0, 7.0) * (0.30 + 0.40*ll2));
    m = max(m, mk);
  }

  {
    vec2 q = localUV(dir, ventDir[5]);
    vec2 qf = rot2(q, 0.55);
    float along = abs(qf.y);
    float dLine = abs(qf.x);
    float span = smoothstep(FISSURE_SPAN, 60.0, along);
    float fissCore = exp(-dLine*dLine*0.35) * span;
    vec2 flowUV = vec2(qf.y, qf.x) * 0.06 - vec2(t*fs*0.65, 0.0);
    float n = fbm(vec3(flowUV, 0.0));
    float fissMask = smoothstep(0.52 - ll2, 0.6 + ll2, n) * fissCore;
    fissMask = max(fissMask, exp(-dLine*dLine*0.06) * span * 0.22);
    m = max(m, fissMask);
  }

  return clamp(m, 0.0, 1.0);
}

float castShadow(vec3 ro, vec3 rd, float hs) {
  float t = 12.0;
  for(int i=0; i<22; i++) {
    vec3 p = ro + rd * t;
    vec3 d = normalize(p);
    float surf = planetR + getH(d, hs);
    float rad = length(p);
    if (rad < surf + 2.0) return 0.22;
    t += 42.0;
    if (t > 6200.0) break;
  }
  return 1.0;
}
`;

const vsTer = `#version 300 es
precision highp float;
layout(location=0)in vec3 a;
uniform mat4 vp;
uniform float t, hs, fs, ll;
out vec3 vPos;
out vec3 vDir;
out vec2 vUv;
${GLSL_COMMON}
${GLSL_GEO}
void main(){
  vec3 dir = normalize(a);

  float h = getH(dir, hs);
  h += fbm(dir * 6.0) * 1.2;

  float lava = getLava(dir, t, fs, ll);
  if(lava > 0.01) {
    int vi = closestVentIndex(dir);
    vec2 luv = localUV(dir, ventDir[vi]);
    vec2 flowDir = normalize(luv + vec2(1e-6));
    vec2 uv = luv * 0.3 - flowDir * t * fs * 0.5;
    float v = voronoi(uv);
    float crust = smoothstep(0.0, 0.2, v);
    h += crust * 2.5 * lava;
  }

  float r = max(planetR * 0.55, planetR + h);
  vec3 pos = dir * r;

  vPos = pos;
  vDir = dir;

  float u = atan(dir.z, dir.x) * 0.15915494309 + 0.5;
  float v = asin(clamp(dir.y, -1.0, 1.0)) * 0.31830988618 + 0.5;
  vUv = vec2(u, v);

  gl_Position = vp * vec4(pos, 1.0);
}`;

const vsPart = `#version 300 es
precision highp float;
layout(location=0)in float id;
uniform mat4 vp;
uniform float t, hs, ws, wd, ps, es, spread, plumeScale, plumeBillow, plumeCap, dpi;
uniform float smokeAmt, ashAmt;
out float vLife;
out float vTemp;
out float vKind;
${GLSL_COMMON}
${GLSL_GEO}
void main(){
  float r1 = hash(vec3(id, 1., 1.));
  float r2 = hash(vec3(id, 2., 5.));
  float r3 = hash(vec3(id, 7.1, 3.2));

  float life = mod(t*0.25 + r1*12.0, 1.0);
  vLife = life;
  vTemp = 1.0 - life;

  float kpick = hash(vec3(id, 13.7, 9.1));
  float isAsh = step(0.62, kpick);
  vKind = isAsh;

  float activeAmount = mix(smokeAmt, ashAmt, isAsh);
  if (activeAmount <= 0.0001 || es <= 0.0001) {
    gl_Position = vec4(2.0,2.0,2.0,1.0);
    gl_PointSize = 0.0;
    return;
  }

  float pick = hash(vec3(id, 9.7, 2.1));
  int vi = int(floor(pick * 6.0));
  vi = clamp(vi, 0, 5);

  vec3 vD = ventDir[vi];
  vec3 b1, b2;
  basis(vD, b1, b2);

  float angle = r2 * 6.28318;
  float rad = r3 * 22.0 * spread * (1.0 + 0.8*isAsh);
  vec3 offset = b1 * (cos(angle)*rad) + b2 * (sin(angle)*rad);

  if (vi == 5) {
    float along = (hash(vec3(id, 4.2, 7.1)) * 2.0 - 1.0) * 190.0;
    float side  = (hash(vec3(id, 6.6, 1.3)) * 2.0 - 1.0) * 16.0;
    vec2 q = rot2(vec2(side, along), 0.55);
    offset = b1 * q.x + b2 * q.y;
  }

  float baseH = getH(vD, hs);
  vec3 basePos = vD * (planetR + baseH);

  float pulse = 0.7 + 0.3*sin((t + r1*6.0) * 2.2);
  vec3 pos = basePos + vD * (18.0*hs) + offset * (0.65 + 0.35*pulse);

  float ventBoost = 1.0;
  if (vi == 1) ventBoost = 1.2;
  if (vi == 2) ventBoost = 1.05;
  if (vi == 3) ventBoost = 0.95;
  if (vi == 4) ventBoost = 1.10;

  float rise = mix(1.0, 0.72, isAsh);
  float lift = (60.0 * es * plumeScale * ventBoost) * rise;

  float upT = pow(life, 0.55);
  vec3 vel = vD * (lift * upT);

  float wr = radians(wd);
  vec3 wind = vec3(cos(wr), 0.15, sin(wr)) * ws;

  vec3 currPos = pos + vel + wind * (life*life) * 5.5;

  float cap = smoothstep(0.58, 1.0, life) * plumeCap;
  float capR = (140.0 + 220.0*r2) * plumeScale * cap * (1.0 + 0.6*isAsh);
  vec3 capOff = (b1 * cos(angle) + b2 * sin(angle)) * capR * cap;
  currPos += capOff;

  vec3 turb = curlNoise(currPos * 0.045 - vec3(0, t*0.55, 0))
            * (18.0 * plumeBillow) * (0.2 + 0.8*life) * (1.0 + 0.7*isAsh);
  currPos += turb;

  float size = (14.0 * ps * dpi) * (1.0 + life * 5.0) * (1.0 + 0.25*plumeScale);
  size *= mix(1.0, 0.85, isAsh);
  gl_PointSize = clamp(size, 1.0, 180.0);

  gl_Position = vp * vec4(currPos, 1.0);
}`;

const vsBolt = `#version 300 es
precision highp float;
layout(location=0)in vec3 pos;
uniform mat4 vp;
void main(){
  gl_Position = vp * vec4(pos, 1.0);
}`;

const vsQuad = `#version 300 es
precision highp float;
layout(location=0)in vec2 p;
out vec2 vUv;
void main(){
  vUv = p*0.5+0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const fsTer = `#version 300 es
precision highp float;
in vec3 vPos;
in vec3 vDir;
in vec2 vUv;
uniform vec3 eye, skyTop, skyBot, lavaHot, lavaCool;
uniform float t, hs, fs, glow, ll, day, wd, lightning;
uniform vec2 sunPos;
uniform vec3 lavaHotPartyShifted[6];
uniform float partyMode;
out vec4 c;
${GLSL_COMMON}
${GLSL_GEO}

vec3 displacedPos(vec3 dir){
  float h = getH(dir, hs) + fbm(dir*6.0)*1.2;
  float r = max(planetR * 0.55, planetR + h);
  return dir * r;
}

void main(){
  vec3 up = (abs(vDir.y) < 0.99) ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 t1 = normalize(cross(up, vDir));
  vec3 t2 = normalize(cross(vDir, t1));

  float e = 0.0018;
  vec3 d1 = normalize(vDir * cos(e) + t1 * sin(e));
  vec3 d2 = normalize(vDir * cos(e) + t2 * sin(e));

  vec3 p0 = vPos;
  vec3 p1 = displacedPos(d1);
  vec3 p2 = displacedPos(d2);
  vec3 n = normalize(cross(p1 - p0, p2 - p0));

  vec3 sunDir = normalize(vec3(sunPos.x, sunPos.y + 0.5, 0.5));
  float diff = max(dot(n, sunDir), 0.0);

  float sh = castShadow(p0 + n*1.5, sunDir, hs);

  vec3 viewDir = normalize(eye - p0);
  vec3 halfDir = normalize(sunDir + viewDir);

  float slope = clamp(1.0 - abs(dot(n, vDir)), 0.0, 1.0);
  float alN = fbm(vec3(vDir*8.0));
  vec3 basalt = vec3(0.06, 0.055, 0.06);
  vec3 ash    = vec3(0.045, 0.045, 0.05);
  vec3 rock   = mix(basalt, ash, smoothstep(0.10, 0.85, slope));
  rock *= 0.85 + 0.35*alN;

  float occ = 0.0;
  float s = 0.004;
  vec3 dn1 = normalize(vDir * cos(s) + t1 * sin(s));
  vec3 dn2 = normalize(vDir * cos(s) - t1 * sin(s));
  vec3 dn3 = normalize(vDir * cos(s) + t2 * sin(s));
  vec3 dn4 = normalize(vDir * cos(s) - t2 * sin(s));
  float h0 = getH(vDir, hs);
  occ += max(0.0, getH(dn1, hs) - h0);
  occ += max(0.0, getH(dn2, hs) - h0);
  occ += max(0.0, getH(dn3, hs) - h0);
  occ += max(0.0, getH(dn4, hs) - h0);
  float ao = clamp(exp(-occ * 0.16), 0.35, 1.0);

  vec3 amb = mix(skyBot, skyTop, n.y*0.5+0.5) * (0.18 + 0.08*day);
  vec3 dirL = vec3(1.0, 0.92, 0.78) * diff * 1.6 * sh;

  float lava = getLava(vDir, t, fs, ll);
  float specPow = mix(48.0, 96.0, lava);
  float spec = pow(max(dot(n, halfDir), 0.0), specPow) * (0.04 + 0.25*lava) * sh;

  float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

  vec3 col = rock;
  col *= (amb + dirL);
  col *= ao;
  col += vec3(0.35, 0.32, 0.28) * rim * (0.08 + 0.08*day);
  col += vec3(1.0, 0.95, 0.9) * spec;

  col += vec3(0.25, 0.3, 0.45) * lightning * 0.55;
  col += vec3(0.8, 0.9, 1.0) * spec * lightning * 1.2;

  if(lava > 0.01) {
    int ventIdx = closestVentIndex(vDir);

    vec3 currentLavaHot = lavaHot;
    if (partyMode > 0.5) currentLavaHot = lavaHotPartyShifted[ventIdx];

    vec2 luv = localUV(vDir, ventDir[ventIdx]);
    vec2 flowDir = normalize(luv + vec2(1e-6));
    vec2 uv = luv * 0.3 - flowDir * t * fs * 0.5;

    float v = voronoi(uv);
    float cracks = 1.0 - smoothstep(0.0, 0.1, v);
    float heat = fbm(vec3(vDir*10.0 - t*0.12));
    float finalHeat = mix(heat*0.5, 1.0, cracks) * lava;

    vec3 emit = mix(lavaCool, currentLavaHot * 2.8, finalHeat);
    col = mix(col, emit, lava);
    col += emit * glow * 0.45;
  }

  float dist = length(p0 - eye);
  vec3 fogCol = mix(skyBot, skyTop, 0.35);
  col = mix(col, fogCol, 1.0 - exp(-dist * 0.00055));

  c = vec4(col, 1.0);
}`;

const fsPart = `#version 300 es
precision mediump float;
in float vLife, vTemp;
in float vKind;
uniform vec3 lavaHot;
uniform float lightning;
uniform highp float smokeAmt, ashAmt;
out vec4 c;

void main(){
  vec2 coord = gl_PointCoord - 0.5;
  float r = length(coord);
  if(r > 0.5) discard;

  float amt = mix(smokeAmt, ashAmt, vKind);

  float soft = smoothstep(0.5, 0.0, r);
  float core = smoothstep(0.22, 0.0, r);
  float alpha = soft * (0.35 + 0.65*core);
  alpha *= smoothstep(0.0, 0.10, vLife) * smoothstep(1.0, 0.55, vLife);
  alpha *= amt;

  vec3 smokeCol = vec3(0.10, 0.11, 0.13);
  vec3 ashCol   = vec3(0.18, 0.14, 0.10);

  float heat = smoothstep(0.95, 0.55, vTemp) * smoothstep(0.0, 0.18, vLife);
  vec3 hot = lavaHot * (0.9 + 0.6*heat);

  vec3 col = mix(smokeCol, ashCol, vKind);
  col = mix(col, hot, heat * (1.0 - vKind*0.35));

  col += vec3(0.8, 0.9, 1.0) * lightning * 0.45;

  c = vec4(col, alpha * 0.80);
}`;

const fsBolt = `#version 300 es
precision mediump float;
out vec4 c;
void main(){
  c = vec4(0.85, 0.92, 1.0, 1.0);
}`;

const fsSky = `#version 300 es
precision mediump float;
in vec2 vUv;
uniform vec3 skyTop, skyBot;
uniform float t, lightning;
uniform vec2 sunPos;
uniform float day;
out vec4 c;
${GLSL_COMMON}
void main(){
  vec3 col = mix(skyBot, skyTop, vUv.y);

  vec2 sunUV = vec2(0.5, 0.58) + vec2(sunPos.x, sunPos.y) * 0.22;
  float sd = length(vUv - sunUV);
  float sun = smoothstep(0.045, 0.0, sd);
  float glow = smoothstep(0.28, 0.0, sd);
  col += vec3(1.1, 0.85, 0.6) * sun * (0.65 + 0.55*day);
  col += vec3(1.0, 0.55, 0.25) * glow * (0.09 + 0.16*day);

  vec2 center = sunUV;
  vec2 p = vUv - center;
  float angle = atan(p.y, p.x);
  float rays = fbm(vec3(angle * 6.0, t * 0.05, 0.0));
  float mask = smoothstep(0.0, 0.5, length(p));
  float beam = rays * (1.0 - mask) * 0.12 * (0.2 + 0.8*day);
  col += vec3(1.0, 0.6, 0.3) * beam;

  float night = smoothstep(0.35, 0.05, day);
  vec2 suv = vUv * vec2(900.0, 450.0);
  vec2 cell = floor(suv);
  float star = step(0.996, hash(vec3(cell, 12.3)));
  float tw = 0.6 + 0.4*sin(t*2.0 + hash(vec3(cell, 8.1))*6.28318);
  col += vec3(0.9, 0.95, 1.0) * star * tw * night * 0.65;

  float v = smoothstep(1.25, 0.65, length(vUv - 0.5));
  col *= mix(0.78, 1.0, v);

  col += vec3(0.5, 0.62, 0.85) * lightning * 0.35;

  c = vec4(col, 1.0);
}`;

const fsPost = `#version 300 es
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
uniform vec2 res;
uniform float t;
uniform float exposure;
uniform float bloomStrength;
uniform float bloomThreshold;
uniform float vignette;
uniform float grain;
uniform float chromAb;
uniform float sharpen;
uniform float gamma;
uniform vec2 sunNdc;
uniform float lensFlare;
out vec4 c;
${GLSL_COMMON}

vec3 aces(vec3 x){
  float a = 2.51;
  float b = 0.03;
  float cc = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x*(a*x+b))/(x*(cc*x+d)+e), 0.0, 1.0);
}

void main(){
  vec2 px = 1.0 / max(res, vec2(1.0));
  vec2 uv = vUv;

  vec2 ca = (uv - 0.5) * (chromAb * 0.002);
  float r = texture(uTex, uv + ca).r;
  float g = texture(uTex, uv).g;
  float b = texture(uTex, uv - ca).b;
  vec3 col = vec3(r,g,b);

  vec3 sum = vec3(0.0);
  float w0 = 0.227027;
  float w1 = 0.1945946;
  float w2 = 0.1216216;
  float w3 = 0.054054;
  vec2 o1 = vec2(1.0, 0.0);
  vec2 o2 = vec2(2.0, 0.0);
  vec2 o3 = vec2(3.0, 0.0);
  vec2 p1 = vec2(0.0, 1.0);
  vec2 p2 = vec2(0.0, 2.0);
  vec2 p3 = vec2(0.0, 3.0);

  vec3 c0 = texture(uTex, uv).rgb;
  float l0 = luma(c0);
  vec3 b0 = c0 * smoothstep(bloomThreshold, 1.2, l0);
  sum += b0 * w0;

  vec3 cx1 = texture(uTex, uv + o1*px).rgb;
  vec3 cx2 = texture(uTex, uv - o1*px).rgb;
  sum += (cx1*smoothstep(bloomThreshold, 1.2, luma(cx1)) + cx2*smoothstep(bloomThreshold, 1.2, luma(cx2))) * w1;

  vec3 cx3 = texture(uTex, uv + o2*px).rgb;
  vec3 cx4 = texture(uTex, uv - o2*px).rgb;
  sum += (cx3*smoothstep(bloomThreshold, 1.2, luma(cx3)) + cx4*smoothstep(bloomThreshold, 1.2, luma(cx4))) * w2;

  vec3 cx5 = texture(uTex, uv + o3*px).rgb;
  vec3 cx6 = texture(uTex, uv - o3*px).rgb;
  sum += (cx5*smoothstep(bloomThreshold, 1.2, luma(cx5)) + cx6*smoothstep(bloomThreshold, 1.2, luma(cx6))) * w3;

  vec3 cy1 = texture(uTex, uv + p1*px).rgb;
  vec3 cy2 = texture(uTex, uv - p1*px).rgb;
  sum += (cy1*smoothstep(bloomThreshold, 1.2, luma(cy1)) + cy2*smoothstep(bloomThreshold, 1.2, luma(cy2))) * w1;

  vec3 cy3 = texture(uTex, uv + p2*px).rgb;
  vec3 cy4 = texture(uTex, uv - p2*px).rgb;
  sum += (cy3*smoothstep(bloomThreshold, 1.2, luma(cy3)) + cy4*smoothstep(bloomThreshold, 1.2, luma(cy4))) * w2;

  vec3 cy5 = texture(uTex, uv + p3*px).rgb;
  vec3 cy6 = texture(uTex, uv - p3*px).rgb;
  sum += (cy5*smoothstep(bloomThreshold, 1.2, luma(cy5)) + cy6*smoothstep(bloomThreshold, 1.2, luma(cy6))) * w3;

  vec3 blur = (texture(uTex, uv + vec2(px.x,0.0)).rgb + texture(uTex, uv - vec2(px.x,0.0)).rgb + texture(uTex, uv + vec2(0.0,px.y)).rgb + texture(uTex, uv - vec2(0.0,px.y)).rgb) * 0.25;
  col = col + (col - blur) * sharpen;

  col += sum * bloomStrength;

  vec2 sunUV = sunNdc * 0.5 + 0.5;
  float inBounds = step(0.0, sunUV.x)*step(0.0, sunUV.y)*step(sunUV.x,1.0)*step(sunUV.y,1.0);
  vec2 d = uv - sunUV;
  float dd = dot(d,d);
  float g1 = exp(-dd * 18.0);
  float g2 = exp(-dd * 3.0);
  float streak = exp(-abs(d.x) * 28.0) * exp(-dd * 4.0);
  col += (vec3(1.0, 0.7, 0.4) * (g1*0.22 + g2*0.05) + vec3(1.0, 0.85, 0.6) * streak * 0.06) * lensFlare * inBounds;

  col *= exposure;
  col = aces(col);

  float vig = smoothstep(0.95, 0.35, length(uv - 0.5));
  col *= mix(1.0, vig, vignette);

  float n = hash(vec3(uv*vec2(1920.0,1080.0), t*60.0));
  col += (n - 0.5) * grain;

  col = pow(max(col, 0.0), vec3(1.0 / max(0.0001, gamma)));

  c = vec4(col, 1.0);
}`;

const clamp2 = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const HOME_YAW = 0.65;
const HOME_PITCH = 0.52;
const HOME_DIST = 2400;
const HOME_ROLL = 0.0;
const MIN_DIST = 900;

const params: Record<string, any> = {
  skyTop: '#101520', skyBot: '#000000',
  lavaHot: '#ffaa00', lavaCool: '#4a0000',

  heightScale: 1.0,

  windSpeed: 2.0, windDir: 90,
  lavaLevel: 0.0,
  flowSpeed: 0.5,

  smoke: 0.0,
  ash: 0.0,
  plumeScale: 1.35,
  plumeBillow: 1.0,
  plumeCap: 1.0,

  partSize: 1.5,
  eject: 1.0,
  spread: 1.0,

  seed: Math.random() * 1000,

  autoSun: true,
  autoSky: true,
  timeOfDay: 19.5,
  daySpeed: 0.25,

  quality: 1.25,
  dragQuality: 0.55,
  fpsCap: 60,
  autoQuality: true,
  particleDensity: 1.0,
  maxDist: 9000,

  thunder: true,
  thunderVolume: 0.25,

  postFX: false,
  exposure: 1.15,
  gamma: 2.2,
  bloomStrength: 0.55,
  bloomThreshold: 0.65,
  vignette: 0.35,
  grain: 0.06,
  chromAb: 0.15,
  sharpen: 0.15,
  lensFlare: 0.35,

  partyMode: false,
  lavaColor1: '#ff0000',
  lavaColor2: '#00ff00',
  lavaColor3: '#0000ff',
  lavaColor4: '#ffff00',
  lavaColor5: '#ff00ff',
  lavaColor6: '#00ffff',
  colorShiftSpeed: 0.5,

  regenerate: () => {}
};

// Nexus performance hook
try {
  const qp = (window as any).NexusPrefs?.qualityProfile?.();
  const p = (window as any).NexusPrefs?.get?.();
  if (qp && params) {
    params.quality = Math.max(0.4, Math.min(1.35, Number(qp.renderScale) || 1.0));
    if (p?.perf && p.perf !== 'auto') params.autoQuality = false;
  }
} catch (_) {}

const cam: {
  current: { yaw: number; pitch: number; dist: number; roll: number };
  target: { yaw: number; pitch: number; dist: number; roll: number };
} = {
  current: { yaw: HOME_YAW, pitch: HOME_PITCH, dist: HOME_DIST, roll: HOME_ROLL },
  target:  { yaw: HOME_YAW, pitch: HOME_PITCH, dist: HOME_DIST, roll: HOME_ROLL }
};
const clampCamDist = () => { cam.target.dist = clamp2(cam.target.dist, MIN_DIST, params.maxDist); };

function resetCameraToHome() {
  velYaw = velPitch = velRoll = 0;
  cam.target.yaw = HOME_YAW;
  cam.target.pitch = HOME_PITCH;
  cam.target.dist = HOME_DIST;
  cam.target.roll = HOME_ROLL;
  clampCamDist();
}

let lightningTimer = 0;
let lightningIntensity = 0;
let boltVerts = new Float32Array(60);
let showBolt = false;

function resetLightningSchedule(hard = false) {
  const base = 2.0, varr = 4.0;
  lightningTimer = base + Math.random() * varr;
  if (hard) {
    lightningIntensity = 0;
    showBolt = false;
  }
}

let paused = false;
let simTime = 0;

let gl: WebGL2RenderingContext | null = null;
let progTer: WebGLProgram | null = null;
let progSky: WebGLProgram | null = null;
let progPart: WebGLProgram | null = null;
let progBolt: WebGLProgram | null = null;
let progPost: WebGLProgram | null = null;
let vaoTer: WebGLVertexArrayObject | null = null;
let vaoQuad: WebGLVertexArrayObject | null = null;
let vaoPart: WebGLVertexArrayObject | null = null;
let vaoBolt: WebGLVertexArrayObject | null = null;
const countPart = 5000;

let fbo: WebGLFramebuffer | null = null;
let sceneTex: WebGLTexture | null = null;
let depthRb: WebGLRenderbuffer | null = null;
let hdr = false;
let floatLinear = false;
let idxArr: Uint32Array;
let bufBolt: WebGLBuffer | null = null;

let gui: GUI | null = null;
let ctrlTime: any = null;
let ctrlQuality: any = null;
let ctrlPost: any = null;

let ventDirs = new Float32Array(18);
const lavaPartyHexNames = ['lavaColor1', 'lavaColor2', 'lavaColor3', 'lavaColor4', 'lavaColor5', 'lavaColor6'];
const lavaHotPartyShifted = new Float32Array(18);

const normalize3 = (v: number[]) => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross3 = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mul3s = (a: number[], s: number) => [a[0] * s, a[1] * s, a[2] * s];
const add3 = (a: number[], b: number[]) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

function seededRng(seedFloat: number) {
  let s = (Math.floor(seedFloat * 1e6) >>> 0) || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function basisFromN(n: number[]) {
  const up = Math.abs(n[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
  const b1 = normalize3(cross3(up, n));
  const b2 = normalize3(cross3(n, b1));
  return { b1, b2 };
}

function rebuildVents() {
  const eyeDir = normalize3([
    Math.cos(cam.current.yaw) * Math.cos(cam.current.pitch),
    Math.sin(cam.current.pitch),
    Math.sin(cam.current.yaw) * Math.cos(cam.current.pitch)
  ]);
  const mesa = normalize3([-eyeDir[0], -eyeDir[1], -eyeDir[2]]);

  const rng = seededRng(params.seed);
  const spin = rng() * Math.PI * 2;
  const golden = Math.PI * (3 - Math.sqrt(5));

  const { b1, b2 } = basisFromN(mesa);

  ventDirs.set(mesa, 0);

  const n = 5;
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 1);
    const w = 1 - 2 * t;
    const phi = i * golden + spin;
    const r = Math.sqrt(Math.max(0, 1 - w * w));

    const around = add3(mul3s(b1, Math.cos(phi) * r), mul3s(b2, Math.sin(phi) * r));
    const dir = normalize3(add3(mul3s(mesa, w), around));
    ventDirs.set(dir, (i + 1) * 3);
  }
}

function yawPitchFromDir(dir: number[]) {
  const d = normalize3(dir);
  const yaw = Math.atan2(d[2], d[0]);
  const pitch = Math.asin(clamp2(d[1], -1, 1));
  return { yaw, pitch };
}

function focusVent(idx: number) {
  if (idx < 0) {
    resetCameraToHome();
    return;
  }
  idx = clamp2(idx | 0, 0, 5);
  const dir = [ventDirs[idx * 3], ventDirs[idx * 3 + 1], ventDirs[idx * 3 + 2]];
  const { yaw, pitch } = yawPitchFromDir([-dir[0], -dir[1], -dir[2]]);
  cam.target.yaw = yaw;
  cam.target.pitch = pitch * 0.85;
  cam.target.dist = 1600;
  clampCamDist();
}

let audio: AudioContext | null = null;
const ensureAudio = async () => {
  if (audio) return audio;
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  audio = new AC();
  if (audio!.state === 'suspended') { try { await audio!.resume(); } catch (_) {} }
  return audio;
};

function playThunder() {
  if (!params.thunder) return;
  ensureAudio().then(ctx => {
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(45, now);
    osc.frequency.exponentialRampToValueAtTime(18, now + 0.8);

    const noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.2), ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(120, now);

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, params.thunderVolume), now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(lp as any);
    noise.connect(hp as any);
    hp.connect(lp as any);
    lp.connect(gain as any);
    gain.connect(ctx.destination);

    osc.start(now);
    noise.start(now);
    osc.stop(now + 1.25);
    noise.stop(now + 1.25);
  }).catch(err => {
    console.warn('Thunder audio failed:', err);
  });
}

const canvas = document.getElementById('c') as HTMLCanvasElement;

  function _getGL2(): WebGL2RenderingContext | null {
    const tries = [
      { alpha: false, antialias: true,  premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' as WebGLPowerPreference },
      { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' as WebGLPowerPreference },
      { alpha: false, antialias: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'low-power' as WebGLPowerPreference }
    ];
    for (const opts of tries) {
      try {
        const g = canvas.getContext('webgl2', opts) as WebGL2RenderingContext | null;
        if (g) return g;
      } catch (_e) { }
    }
    return null;
  }

gl = _getGL2();
if (!gl) {
  document.getElementById('fallback')!.classList.add('show');
  throw new Error('WebGL2 not available');
}

canvas.addEventListener('webglcontextlost', (e) => {
  e.preventDefault();
  postTargetsReady = false;
  showFatal('WebGL context lost (mobile memory).\nTap Regenerate (or reload).');
}, false);

canvas.addEventListener('webglcontextrestored', () => {
  showFatal('');
  location.reload();
}, false);

const floatExt = gl.getExtension('EXT_color_buffer_float');
const halfFloatExt = gl.getExtension('EXT_color_buffer_half_float');
hdr = !!(floatExt && halfFloatExt);
floatLinear = !!gl.getExtension('OES_texture_float_linear');

function createProg(vs: string, fs: string): WebGLProgram | null {
  const p = gl!.createProgram()!;
  const add = (src: string, type: number): boolean => {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      const log = gl!.getShaderInfoLog(s) || '(no shader log)';
      console.error(log);
      console.error('---- shader source ----\n' + src);
      showFatal(`Shader compile failed:\n${log}`);
      gl!.deleteShader(s);
      return false;
    }
    gl!.attachShader(p, s);
    gl!.deleteShader(s);
    return true;
  };
  if (!add(vs, gl!.VERTEX_SHADER) || !add(fs, gl!.FRAGMENT_SHADER)) {
    gl!.deleteProgram(p);
    return null;
  }
  gl!.linkProgram(p);
  if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) {
    const log = gl!.getProgramInfoLog(p) || '(no program log)';
    console.error(log);
    showFatal(`Program link failed:\n${log}`);
    gl!.deleteProgram(p);
    return null;
  }
  return p;
}

progTer = createProg(vsTer, fsTer);
progSky = createProg(vsQuad, fsSky);
progPart = createProg(vsPart, fsPart);
progBolt = createProg(vsBolt, fsBolt);
progPost = createProg(vsQuad, fsPost);

if (!progTer || !progSky || !progPart || !progBolt || !progPost) {
  showFatal('Program creation failed. Check console for GLSL errors.');
  throw new Error('Program creation failed');
}

// Quad VAO
vaoQuad = gl.createVertexArray();
gl.bindVertexArray(vaoQuad);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// Sphere mesh
const verts: number[] = [];
const idx: number[] = [];
const LAT = 180;
const LON = 240;

for (let y = 0; y <= LAT; y++) {
  const v = y / LAT;
  const theta = v * Math.PI;
  const st = Math.sin(theta);
  const ct = Math.cos(theta);
  for (let x = 0; x <= LON; x++) {
    const u = x / LON;
    const phi = u * Math.PI * 2;
    const sp = Math.sin(phi);
    const cp = Math.cos(phi);
    verts.push(cp * st, ct, sp * st);
  }
}

const stride = LON + 1;
for (let y = 0; y < LAT; y++) {
  for (let x = 0; x < LON; x++) {
    const i0 = y * stride + x;
    const i1 = i0 + 1;
    const i2 = i0 + stride;
    const i3 = i2 + 1;
    idx.push(i0, i2, i1);
    idx.push(i1, i2, i3);
  }
}

idxArr = new Uint32Array(idx);
const idxType = gl.UNSIGNED_INT;

vaoTer = gl.createVertexArray();
gl.bindVertexArray(vaoTer);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idxArr, gl.STATIC_DRAW);

// Particles IDs
const pIds = new Float32Array(countPart);
for (let i = 0; i < countPart; i++) pIds[i] = i;

vaoPart = gl.createVertexArray();
gl.bindVertexArray(vaoPart);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, pIds, gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);

// Bolt
vaoBolt = gl.createVertexArray();
gl.bindVertexArray(vaoBolt);
bufBolt = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, bufBolt);
gl.bufferData(gl.ARRAY_BUFFER, boltVerts, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

function hex(s: string): number[] {
  let c = parseInt(s.substring(1), 16);
  return [(c >> 16 & 255) / 255, (c >> 8 & 255) / 255, (c & 255) / 255];
}

function skyFromDay(d: number) {
  const nightTop: number[] = [0.03, 0.05, 0.10];
  const nightBot: number[] = [0.00, 0.00, 0.02];
  const duskTop: number[] = [0.35, 0.16, 0.12];
  const duskBot: number[] = [0.05, 0.01, 0.02];
  const dayTop: number[] = [0.10, 0.20, 0.35];
  const dayBot: number[] = [0.02, 0.03, 0.06];

  const edge = Math.abs(d - 0.5) * 2.0;
  const dusk = Math.exp(-Math.pow((d - 0.75) * 6.0, 2.0)) + Math.exp(-Math.pow((d - 0.25) * 6.0, 2.0));

  const lerp3 = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  let top = lerp3(nightTop, dayTop, 1.0 - edge);
  let bot = lerp3(nightBot, dayBot, 1.0 - edge);
  top = lerp3(top, duskTop, clamp2(dusk, 0, 1) * 0.7);
  bot = lerp3(bot, duskBot, clamp2(dusk, 0, 1) * 0.7);
  return { top, bot };
}

function sunFromTimeHours(h: number) {
  const ang = (h / 24) * Math.PI * 2 - Math.PI / 2;
  return [Math.cos(ang), Math.sin(ang)];
}

const sub = (a: number[], b: number[]) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const normalize = (v: number[]) => { let l = Math.hypot(v[0], v[1], v[2]); return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0]; };
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const m4 = {
  persp: (fov: number, asp: number, n: number, f: number) => {
    let t = Math.tan(Math.PI * 0.5 - 0.5 * fov), a = 1 / t;
    return [
      a / asp, 0, 0, 0,
      0, a, 0, 0,
      0, 0, (f + n) / (n - f), -1,
      0, 0, (2 * f * n) / (n - f), 0
    ];
  },
  lookAtRoll: (eye: number[], tar: number[], roll: number) => {
    let f = normalize(sub(tar, eye));
    let up: number[] = [0, 1, 0];
    if (Math.abs(f[1]) > 0.98) up = [1, 0, 0];

    let r = normalize(cross(f, up));
    let u = cross(r, f);

    const cr = Math.cos(roll), sr = Math.sin(roll);
    const r2: number[] = [r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr];
    const u2: number[] = [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr];

    return [
      r2[0], r2[1], r2[2], 0,
      u2[0], u2[1], u2[2], 0,
      -f[0], -f[1], -f[2], 0,
      -dot(r2, eye), -dot(u2, eye), dot(f, eye), 1
    ];
  },
  mul: (a: number[], b: number[]) => {
    const o = new Array(16);
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 4; r++) {
        o[c * 4 + r] =
          a[0 * 4 + r] * b[c * 4 + 0] +
          a[1 * 4 + r] * b[c * 4 + 1] +
          a[2 * 4 + r] * b[c * 4 + 2] +
          a[3 * 4 + r] * b[c * 4 + 3];
      }
    }
    return o;
  }
};

function projectNDC(vp: number[], p3: number[]) {
  const x = p3[0], y = p3[1], z = p3[2];
  const m = vp;
  const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
  const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
  const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
  if (Math.abs(cw) < 1e-6) return [2, 2];
  return [cx / cw, cy / cw];
}

const _uLoc = new WeakMap<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
function uLoc(prog: WebGLProgram | null, name: string): WebGLUniformLocation | null {
  if (!prog) return null;
  let m = _uLoc.get(prog);
  if (!m) { m = new Map(); _uLoc.set(prog, m); }
  if (m.has(name)) return m.get(name) || null;
  const loc = gl!.getUniformLocation(prog, name);
  m.set(name, loc);
  return loc;
}
function setU(p: WebGLProgram | null, name: string, v: any) {
  const loc = uLoc(p, name);
  if (loc === null) return;
  if (typeof v === 'number') { gl!.uniform1f(loc, v); return; }
  if (Array.isArray(v) || (v && typeof v.length === 'number')) {
    if (v.length === 2) gl!.uniform2fv(loc, v);
    else if (v.length === 3) gl!.uniform3fv(loc, v);
    else if (v.length === 16) gl!.uniformMatrix4fv(loc, false, v);
  }
}
function setI(p: WebGLProgram | null, name: string, i: number) {
  const loc = uLoc(p, name);
  if (loc === null) return;
  gl!.uniform1i(loc, i | 0);
}
function setU3Array(p: WebGLProgram | null, name: string, arr18: Float32Array) {
  const loc = uLoc(p, name + '[0]');
  if (loc === null) return;
  gl!.uniform3fv(loc, arr18);
}

function destroyPost() {
  if (depthRb) gl!.deleteRenderbuffer(depthRb);
  if (sceneTex) gl!.deleteTexture(sceneTex);
  if (fbo) gl!.deleteFramebuffer(fbo);
  depthRb = null; sceneTex = null; fbo = null;
  postTargetsReady = false;
  rtW = rtH = 0;
}

function ensurePostTargets(w: number, h: number) {
  if (!params.postFX) { destroyPost(); return; }

  const nw = w | 0, nh = h | 0;
  if (postTargetsReady && fbo && sceneTex && depthRb && rtW === nw && rtH === nh) return;

  if (!fbo) {
    fbo = gl!.createFramebuffer();
    sceneTex = gl!.createTexture();
    depthRb = gl!.createRenderbuffer();
  }

  rtW = nw;
  rtH = nh;

  gl!.bindTexture(gl!.TEXTURE_2D, sceneTex);

  const filter = (hdr && !floatLinear) ? gl!.NEAREST : gl!.LINEAR;
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, filter);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, filter);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
  gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);

  if (hdr) gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA16F, rtW, rtH, 0, gl!.RGBA, gl!.HALF_FLOAT, null);
  else     gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, rtW, rtH, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);

  gl!.bindRenderbuffer(gl!.RENDERBUFFER, depthRb);
  gl!.renderbufferStorage(gl!.RENDERBUFFER, gl!.DEPTH_COMPONENT16, rtW, rtH);

  gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
  gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, sceneTex, 0);
  gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.DEPTH_ATTACHMENT, gl!.RENDERBUFFER, depthRb);

  postTargetsReady = checkFBO(gl!, fbo, 'postFBO');
  if (!postTargetsReady) {
    params.postFX = false;
    if (ctrlPost) ctrlPost.updateDisplay();
    destroyPost();
  }
  gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);

  if (DEBUG_GL) glErr(gl!, 'ensurePostTargets');
}

function takeScreenshotNow() {
  showFatal('Screenshot: use your browser screenshot / OS screenshot.\n(If you want GPU readback again, say so and I\'ll wire the FBO capture back in.)');
  setTimeout(() => showFatal(''), 2200);
}

// Input handling
const zone = canvas;
let primaryPointer: number | null = null;
let lastX = 0, lastY = 0;
let lastMoveTs = 0;

let initialPinchDist = 0;
let initialZoom = 0;

let initialTwist = 0;
let lastTwist = 0;
let startRoll = 0;

let interacting = false;

let dragBoostActive = false;
let postFXBeforeDrag: boolean | null = null;
function setDragBoost(on: boolean) {
  if (on === dragBoostActive) return;
  dragBoostActive = on;

  if (on) {
    if (params && params.postFX) {
      postFXBeforeDrag = true;
      params.postFX = false;
      if (ctrlPost) ctrlPost.updateDisplay();
    } else {
      postFXBeforeDrag = null;
    }
    requestAnimationFrame(resize);
  } else {
    if (postFXBeforeDrag) {
      params.postFX = true;
      postFXBeforeDrag = null;
      if (ctrlPost) ctrlPost.updateDisplay();
    }
    requestAnimationFrame(resize);
  }
}
let velYaw = 0, velPitch = 0, velRoll = 0;

function getPinchDist(cache: Map<number, { x: number; y: number }>) {
  const pts = Array.from(cache.values());
  if (pts.length < 2) return 0;
  return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
}
function getTwist(cache: Map<number, { x: number; y: number }>) {
  const pts = Array.from(cache.values());
  if (pts.length < 2) return 0;
  return Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
}

const evCache = new Map<number, { x: number; y: number }>();

function isUIHit(target: EventTarget | null) {
  return !!(target as Element).closest?.('#hud') || !!(target as Element).closest?.('#help') || !!(target as Element).closest?.('.lil-gui') || !!(target as Element).closest?.('#sidebar');
}

zone.addEventListener('pointerdown', e => {
  if (isUIHit(e.target)) return;

  const wasInteracting = interacting;

  evCache.set(e.pointerId, { x: e.clientX, y: e.clientY });
  zone.setPointerCapture(e.pointerId);

  interacting = true;
  if (!wasInteracting) setDragBoost(true);
  lastMoveTs = performance.now();

  if (evCache.size === 1) {
    primaryPointer = e.pointerId;
    lastX = e.clientX; lastY = e.clientY;
  }

  if (evCache.size === 2) {
    initialPinchDist = getPinchDist(evCache);
    initialZoom = cam.target.dist;

    initialTwist = getTwist(evCache);
    lastTwist = initialTwist;
    startRoll = cam.target.roll;

    primaryPointer = null;
  }
});

zone.addEventListener('pointermove', e => {
  if (!evCache.has(e.pointerId)) return;

  const now = performance.now();
  const dtp = Math.max(1e-3, (now - lastMoveTs) / 1000);
  lastMoveTs = now;

  evCache.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (evCache.size === 2) {
    const dist = getPinchDist(evCache);
    if (initialPinchDist > 0) {
      const scale = initialPinchDist / Math.max(1e-6, dist);
      cam.target.dist = initialZoom * scale;
      clampCamDist();
    }

    const tw = getTwist(evCache);
    const dTw = tw - lastTwist;
    lastTwist = tw;

    cam.target.roll = startRoll + (tw - initialTwist);
    velRoll = dTw / dtp;
    return;
  }

  if (evCache.size === 1 && e.pointerId === primaryPointer) {
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;

    cam.target.yaw -= dx * 0.005;
    cam.target.pitch += dy * 0.005;
    cam.target.pitch = clamp2(cam.target.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);

    velYaw = (-dx * 0.005) / dtp;
    velPitch = (dy * 0.005) / dtp;

    const dRoll = dx * 0.0005;
    cam.target.roll += dRoll;
    velRoll = dRoll / dtp;
  }
});

function removePointer(e: PointerEvent | null) {
  if (e && typeof e.pointerId === 'number') evCache.delete(e.pointerId);
  if (evCache.size < 2) initialPinchDist = 0;

  if (evCache.size === 0) {
    primaryPointer = null;
    interacting = false;
    setDragBoost(false);
  }

  if (evCache.size === 1) {
    const p = evCache.values().next().value!;
    primaryPointer = evCache.keys().next().value ?? null;
    lastX = p.x; lastY = p.y;
  }

  if (evCache.size === 2) {
    initialPinchDist = getPinchDist(evCache);
    initialZoom = cam.target.dist;
    initialTwist = getTwist(evCache);
    lastTwist = initialTwist;
    startRoll = cam.target.roll;
  }
}

zone.addEventListener('pointerup', removePointer);
zone.addEventListener('pointercancel', removePointer);
zone.addEventListener('lostpointercapture', removePointer);

zone.addEventListener('wheel', e => {
  e.preventDefault();
  cam.target.dist += e.deltaY * 0.9;
  clampCamDist();
}, { passive: false });

// Lightning
function strikeNow() { lightningTimer = -1; }

function updateLightning(dtSim: number) {
  lightningTimer -= dtSim;

  if (lightningTimer < 0) {
    resetLightningSchedule(false);
    lightningIntensity = 1.0;

    const u = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const rr = Math.sqrt(Math.max(0, 1 - u * u));
    const strikeDir: number[] = [Math.cos(a) * rr, u, Math.sin(a) * rr];

    const up: number[] = Math.abs(strikeDir[1]) < 0.99 ? [0, 1, 0] : [1, 0, 0];
    let b1 = normalize(cross(up, strikeDir));
    let b2 = normalize(cross(strikeDir, b1));

    const start: number[] = [strikeDir[0] * (PLANET_R + 1600), strikeDir[1] * (PLANET_R + 1600), strikeDir[2] * (PLANET_R + 1600)];
    const end: number[] = [strikeDir[0] * (PLANET_R + 40), strikeDir[1] * (PLANET_R + 40), strikeDir[2] * (PLANET_R + 40)];

    for (let i = 0; i < 20; i++) {
      const tt = i / 19;
      let x = start[0] + (end[0] - start[0]) * tt;
      let y = start[1] + (end[1] - start[1]) * tt;
      let z = start[2] + (end[2] - start[2]) * tt;

      const j = (1.0 - Math.abs(tt - 0.5) * 2.0);
      const jA = (Math.random() - 0.5) * 120.0 * j;
      const jB = (Math.random() - 0.5) * 120.0 * j;
      x += b1[0] * jA + b2[0] * jB;
      y += b1[1] * jA + b2[1] * jB;
      z += b1[2] * jA + b2[2] * jB;

      boltVerts[i * 3] = x;
      boltVerts[i * 3 + 1] = y;
      boltVerts[i * 3 + 2] = z;
    }

    gl!.bindBuffer(gl!.ARRAY_BUFFER, bufBolt);
    gl!.bufferSubData(gl!.ARRAY_BUFFER, 0, boltVerts);

    setTimeout(() => playThunder(), 120 + Math.random() * 180);
  }

  lightningIntensity = Math.max(0, lightningIntensity - dtSim * 4.0);
  showBolt = lightningIntensity > 0.08;
}

// Resize / DPI
function resize() {
  const dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
  const w = Math.max(1, canvas.clientWidth | 0);
  const h = Math.max(1, canvas.clientHeight | 0);
  const scaleBase = params.quality;
  const dragQ = (typeof params.dragQuality === 'number') ? params.dragQuality : scaleBase;
  const scale = (interacting ? Math.min(scaleBase, dragQ) : scaleBase);

  const cw = Math.max(1, (w * dpr * scale) | 0);
  const ch = Math.max(1, (h * dpr * scale) | 0);

  if (canvas.width !== cw || canvas.height !== ch) {
    canvas.width = cw;
    canvas.height = ch;
  }
  ensurePostTargets(canvas.width, canvas.height);
}
window.addEventListener('resize', resize);

// GUI
function initGUI() {
  gui = new GUI({ title: 'MAGMA Controls' });
  gui.domElement.style.zIndex = '70';

  gui.add(params, 'heightScale', 0.4, 2.0, 0.01).name('Height Scale');
  gui.add(params, 'flowSpeed', 0.0, 2.0, 0.01).name('Flow Speed');
  gui.add(params, 'lavaLevel', 0.0, 1.0, 0.01).name('Lava Level');
  gui.add(params, 'windSpeed', 0.0, 12.0, 0.01).name('Wind Speed');
  gui.add(params, 'windDir', 0, 360, 1).name('Wind Dir');
  gui.add(params, 'smoke', 0.0, 1.0, 0.01).name('Smoke');
  gui.add(params, 'ash', 0.0, 1.0, 0.01).name('Ash');
  gui.add(params, 'plumeScale', 0.2, 2.5, 0.01).name('Plume Scale');
  gui.add(params, 'plumeBillow', 0.0, 2.0, 0.01).name('Plume Billow');
  gui.add(params, 'plumeCap', 0.0, 2.0, 0.01).name('Plume Cap');
  gui.add(params, 'partSize', 0.3, 3.0, 0.01).name('Particle Size');
  gui.add(params, 'spread', 0.2, 2.0, 0.01).name('Spread');
  gui.add(params, 'eject', 0.0, 2.0, 0.01).name('Eject');

  ctrlTime = gui.add(params, 'timeOfDay', 0, 24, 0.01).name('Time of Day');
  gui.add(params, 'autoSun').name('Auto Sun');
  gui.add(params, 'daySpeed', 0.0, 2.0, 0.01).name('Day Speed');

  ctrlQuality = gui.add(params, 'quality', 0.4, 2.0, 0.01).name('Quality').onChange(resize);
  gui.add(params, 'autoQuality').name('Auto Quality');

  gui.add(params, 'dragQuality', 0.25, 1.25, 0.01).name('Drag Quality');
  gui.add(params, 'fpsCap', { 'Unlimited': 0, '60': 60, '45': 45, '30': 30 } as any).name('FPS Cap');
  ctrlPost = gui.add(params, 'postFX').name('Post FX').onChange(() => ensurePostTargets(canvas.width, canvas.height));
  gui.add(params, 'exposure', 0.5, 2.0, 0.01).name('Exposure');
  gui.add(params, 'gamma', 1.2, 3.0, 0.01).name('Gamma');
  gui.add(params, 'bloomStrength', 0.0, 1.5, 0.01).name('Bloom');
  gui.add(params, 'bloomThreshold', 0.0, 1.5, 0.01).name('Bloom Thresh');
  gui.add(params, 'vignette', 0.0, 1.0, 0.01).name('Vignette');
  gui.add(params, 'grain', 0.0, 0.2, 0.001).name('Grain');
  gui.add(params, 'chromAb', 0.0, 1.0, 0.01).name('Chrom Ab');
  gui.add(params, 'sharpen', 0.0, 0.5, 0.01).name('Sharpen');
  gui.add(params, 'lensFlare', 0.0, 1.0, 0.01).name('Lens Flare');

  gui.add(params, 'partyMode').name('Party Mode');
  gui.addColor(params, 'lavaColor1').name('Lava C1');
  gui.addColor(params, 'lavaColor2').name('Lava C2');
  gui.addColor(params, 'lavaColor3').name('Lava C3');
  gui.addColor(params, 'lavaColor4').name('Lava C4');
  gui.addColor(params, 'lavaColor5').name('Lava C5');
  gui.addColor(params, 'lavaColor6').name('Lava C6');
  gui.add(params, 'colorShiftSpeed', 0.1, 2.0, 0.01).name('Shift Speed');

  gui.add(params, 'thunder').name('Thunder');
  gui.add(params, 'thunderVolume', 0.0, 1.0, 0.01).name('Thunder Vol');

  gui.add({ FocusMesa: () => focusVent(0), Focus1: () => focusVent(1), Focus2: () => focusVent(2), Focus3: () => focusVent(3), Focus4: () => focusVent(4), Focus5: () => focusVent(5) } as any, 'FocusMesa');
  gui.add({ Strike: strikeNow } as any, 'Strike');
  gui.add({ Home: resetCameraToHome } as any, 'Home');
}

// Render loop
function clearFrame() {
  gl!.clearColor(0.03, 0.03, 0.05, 1.0);
  gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
}

  function bindCommon(prog: WebGLProgram | null) {
    if (!prog) return;
    setU(prog, 'seed', params.seed);
    setU(prog, 'planetR', PLANET_R);
    setU3Array(prog, 'ventDir', ventDirs);
  }

// FPS
const hudFpsEl = document.getElementById('hudFps')!;
const sbFpsEl = document.getElementById('sbFps')!;
let fpsAcc = 0;
let fpsFrames = 0;
let fpsLast = performance.now();
let qualityCooldown = 0;

let lastFrameT = performance.now();
let lastRenderT = lastFrameT;
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function loop(now: number) {
  now = (typeof now === 'number') ? now : performance.now();

  const cap = Number(params.fpsCap) || 0;
  const minInterval = cap > 0 ? (1000 / cap) : 0;
  if (minInterval && (now - lastRenderT) < (minInterval - 0.5)) {
    requestAnimationFrame(loop);
    return;
  }

  const dt = (now - lastFrameT) / 1000.0;
  lastFrameT = now;
  lastRenderT = now;
  fpsAcc += dt;
  fpsFrames++;
  if (now - fpsLast > 400) {
    const fps = Math.round(fpsFrames / Math.max(1e-6, fpsAcc));
    hudFpsEl.textContent = String(fps);
    sbFpsEl.textContent = String(fps);
    fpsAcc = 0;
    fpsFrames = 0;
    fpsLast = now;

    if (params.autoQuality) {
      qualityCooldown -= dt;
      if (qualityCooldown <= 0) {
        let q = params.quality;
        if (fps < 42) q = Math.max(0.4, q - 0.08);
        else if (fps > 58) q = Math.min(2.0, q + 0.04);
        if (Math.abs(q - params.quality) > 1e-6) {
          params.quality = q;
          resize();
          if (ctrlQuality) ctrlQuality.updateDisplay();
        }
        qualityCooldown = 1.2;
      }
    }
  }

  const dtSim = paused ? 0 : dt;
  simTime += dtSim;

  if (!interacting && dtSim > 0) {
    cam.target.yaw += velYaw * dtSim;
    cam.target.pitch += velPitch * dtSim;
    cam.target.roll += velRoll * dtSim;

    cam.target.pitch = clamp2(cam.target.pitch, -Math.PI / 2 + 0.01, Math.PI / 2 - 0.01);

    const decay = Math.exp(-3.5 * dtSim);
    velYaw *= decay;
    velPitch *= decay;
    velRoll *= Math.exp(-6.0 * dtSim);
  }

  if (!paused && params.autoSun) {
    params.timeOfDay = (params.timeOfDay + params.daySpeed * dtSim) % 24;
    if (ctrlTime) ctrlTime.updateDisplay();
  }

  updateLightning(dtSim);

  const damper = 1.0 - Math.exp(-8.0 * dt);
  cam.current.yaw = lerp(cam.current.yaw, cam.target.yaw, damper);
  cam.current.pitch = lerp(cam.current.pitch, cam.target.pitch, damper);
  cam.current.dist = lerp(cam.current.dist, cam.target.dist, damper);
  cam.current.roll = lerp(cam.current.roll, cam.target.roll, damper);

  const eye: number[] = [
    Math.cos(cam.current.yaw) * Math.cos(cam.current.pitch) * cam.current.dist,
    Math.sin(cam.current.pitch) * cam.current.dist,
    Math.sin(cam.current.yaw) * Math.cos(cam.current.pitch) * cam.current.dist
  ];

  const target = [0, 0, 0];
  const vp = m4.mul(
    m4.persp(0.8, canvas.width / canvas.height, 3, 14000),
    m4.lookAtRoll(eye, target, cam.current.roll)
  );

  const sun = sunFromTimeHours(params.timeOfDay);
  const day01 = clamp2((sun[1] * 0.5 + 0.5), 0, 1);
  const sky = params.autoSky ? skyFromDay(day01) : { top: hex(params.skyTop), bot: hex(params.skyBot) };

  const sunDir = normalize([sun[0], sun[1] + 0.5, 0.5]);
  const sunWorld = [target[0] + sunDir[0] * 1400, target[1] + sunDir[1] * 1400, target[2] + sunDir[2] * 1400];
  const sunNdc = projectNDC(vp, sunWorld);

  const canPost = !!(params.postFX && !dragBoostActive && fbo && sceneTex && postTargetsReady && rtW > 0 && rtH > 0);

  gl!.enable(gl!.DEPTH_TEST);
  gl!.enable(gl!.CULL_FACE);
  gl!.cullFace(gl!.BACK);

  gl!.bindFramebuffer(gl!.FRAMEBUFFER, canPost ? fbo : null);
  gl!.viewport(0, 0, canPost ? rtW : canvas.width, canPost ? rtH : canvas.height);
  clearFrame();

  // PARTY MODE SHIFT
  if (params.partyMode) {
    const timeShift = Math.floor(simTime * params.colorShiftSpeed) % 6;
    for (let i = 0; i < 6; i++) {
      const sourceIndex = (i + timeShift) % 6;
      const color = hex(params[lavaPartyHexNames[sourceIndex]]);
      lavaHotPartyShifted.set(color, i * 3);
    }
  }

  // SKY
  gl!.disable(gl!.DEPTH_TEST);
  gl!.useProgram(progSky);
  gl!.bindVertexArray(vaoQuad);
  bindCommon(progSky);
  setU(progSky, 'skyTop', sky.top);
  setU(progSky, 'skyBot', sky.bot);
  setU(progSky, 't', simTime);
  setU(progSky, 'sunPos', sun);
  setU(progSky, 'day', day01);
  setU(progSky, 'lightning', lightningIntensity);
  gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);

  // TERRAIN
  gl!.enable(gl!.DEPTH_TEST);
  gl!.useProgram(progTer);
  gl!.bindVertexArray(vaoTer);
  bindCommon(progTer);

  setU(progTer, 'vp', vp);
  setU(progTer, 't', simTime);
  setU(progTer, 'hs', params.heightScale);
  setU(progTer, 'fs', params.flowSpeed);
  setU(progTer, 'll', params.lavaLevel);
  setU(progTer, 'glow', 1.0);
  setU(progTer, 'day', day01);
  setU(progTer, 'wd', params.windDir);
  setU(progTer, 'lightning', lightningIntensity);

  setU(progTer, 'eye', eye);
  setU(progTer, 'skyTop', sky.top);
  setU(progTer, 'skyBot', sky.bot);
  setU(progTer, 'lavaHot', hex(params.lavaHot));
  setU(progTer, 'lavaCool', hex(params.lavaCool));
  setU(progTer, 'sunPos', sun);

  setU(progTer, 'partyMode', params.partyMode ? 1.0 : 0.0);
  setU3Array(progTer, 'lavaHotPartyShifted', lavaHotPartyShifted);

  gl!.drawElements(gl!.TRIANGLES, idxArr.length, idxType, 0);

  // PARTICLES
  gl!.enable(gl!.BLEND);
  gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);
  gl!.depthMask(false);

  gl!.useProgram(progPart);
  gl!.bindVertexArray(vaoPart);
  bindCommon(progPart);

  setU(progPart, 'vp', vp);
  setU(progPart, 't', simTime);
  setU(progPart, 'hs', params.heightScale);
  setU(progPart, 'ws', params.windSpeed);
  setU(progPart, 'wd', params.windDir);
  setU(progPart, 'ps', params.partSize);
  setU(progPart, 'es', params.eject);
  setU(progPart, 'spread', params.spread);
  setU(progPart, 'plumeScale', params.plumeScale);
  setU(progPart, 'plumeBillow', params.plumeBillow);
  setU(progPart, 'plumeCap', params.plumeCap);
  setU(progPart, 'dpi', Math.max(1, window.devicePixelRatio || 1));
  setU(progPart, 'smokeAmt', params.smoke);
  setU(progPart, 'ashAmt', params.ash);
  setU(progPart, 'seed', params.seed);
  setU(progPart, 'planetR', PLANET_R);

  setU(progPart, 'lavaHot', hex(params.lavaHot));
  setU(progPart, 'lightning', lightningIntensity);

  const partCount = Math.max(0, Math.min(countPart, Math.floor(countPart * params.particleDensity)));
  gl!.drawArrays(gl!.POINTS, 0, partCount);

  gl!.depthMask(true);
  gl!.disable(gl!.BLEND);

  // BOLT
  if (showBolt) {
    gl!.useProgram(progBolt);
    gl!.bindVertexArray(vaoBolt);
    setU(progBolt, 'vp', vp);
    gl!.drawArrays(gl!.LINE_STRIP, 0, 20);
  }

  // POST
  if (canPost) {
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    gl!.viewport(0, 0, canvas.width, canvas.height);
    gl!.disable(gl!.DEPTH_TEST);

    gl!.useProgram(progPost);
    gl!.bindVertexArray(vaoQuad);
    bindCommon(progPost);

    gl!.activeTexture(gl!.TEXTURE0);
    gl!.bindTexture(gl!.TEXTURE_2D, sceneTex);
    setI(progPost, 'uTex', 0);

    setU(progPost, 'res', [rtW, rtH]);
    setU(progPost, 't', simTime);
    setU(progPost, 'exposure', params.exposure);
    setU(progPost, 'bloomStrength', params.bloomStrength);
    setU(progPost, 'bloomThreshold', params.bloomThreshold);
    setU(progPost, 'vignette', params.vignette);
    setU(progPost, 'grain', params.grain);
    setU(progPost, 'chromAb', params.chromAb);
    setU(progPost, 'sharpen', params.sharpen);
    setU(progPost, 'gamma', params.gamma);
    setU(progPost, 'sunNdc', sunNdc);
    setU(progPost, 'lensFlare', params.lensFlare);

    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  // HUD metrics
  const hudFlow = document.getElementById('hud_flow');
  const hudAsh = document.getElementById('hud_ash');
  const hudWind = document.getElementById('hud_wind');
  const hudTime = document.getElementById('hud_time');
  const hudVei = document.getElementById('hud_vei');
  const hudEruption = document.getElementById('hud_eruption');
  if (hudFlow) hudFlow.textContent = params.flowSpeed.toFixed(2);
  if (hudAsh) hudAsh.textContent = params.ash.toFixed(2);
  if (hudWind) hudWind.textContent = `${params.windSpeed.toFixed(1)} @ ${Math.round(params.windDir)}°`;
  if (hudTime) hudTime.textContent = params.timeOfDay.toFixed(2);
  if (hudVei) hudVei.textContent = (Math.round(params.lavaLevel * 8)).toString();
  if (hudEruption) hudEruption.textContent = (params.lavaLevel > 0.1 ? 'Active' : 'Dormant');

  requestAnimationFrame(loop);
}

// Regenerate hook
params.regenerate = () => {
  simTime = 0;
  params.lavaLevel = 0.0;
  params.smoke = 0.0;
  params.ash = 0.0;
  params.seed = Math.random() * 1000;

  resetLightningSchedule(true);
  rebuildVents();
  focusVent(0);

  if (gui && typeof (gui as any).controllersRecursive === 'function') {
    (gui as any).controllersRecursive().forEach((c: any) => c.updateDisplay());
  }
};

// UI Toggles
const sidebar = document.getElementById('sidebar')!;
const sidebarOpenBtn = document.getElementById('sidebarOpenBtn')!;
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn')!;

const hud = document.getElementById('hud')!;
const hudOpenBtn = document.getElementById('hudOpenBtn')!;
const hudCloseBtn = document.getElementById('hudCloseBtn')!;

function setSidebarClosed(closed: boolean) {
  sidebar.classList.toggle('closed', !!closed);
  sidebarOpenBtn.classList.toggle('show', !!closed);
}
function setHudClosed(closed: boolean) {
  hud.classList.toggle('closed', !!closed);
  hudOpenBtn.classList.toggle('show', !!closed);
}

sidebarCloseBtn.addEventListener('click', () => setSidebarClosed(true));
sidebarOpenBtn.addEventListener('click', () => setSidebarClosed(false));
hudCloseBtn.addEventListener('click', () => setHudClosed(true));
hudOpenBtn.addEventListener('click', () => setHudClosed(false));

setSidebarClosed(true);
setHudClosed(true);

// Help overlay
const help = document.getElementById('help')!;
const btnHelp = document.getElementById('btnHelp')!;
const btnCloseHelp = document.getElementById('btnCloseHelp')!;
function toggleHelp(force?: boolean) {
  const on = (typeof force === 'boolean') ? force : !help.classList.contains('show');
  help.classList.toggle('show', on);
}
btnHelp.addEventListener('click', () => toggleHelp());
btnCloseHelp.addEventListener('click', () => toggleHelp(false));
help.addEventListener('click', (e) => { if (e.target === help) toggleHelp(false); });

// HUD buttons
const btnRegenerate = document.getElementById('btnRegenerate')!;
const btnLightning = document.getElementById('btnLightning')!;
const btnPause = document.getElementById('btnPause')!;
const btnScreenshot = document.getElementById('btnScreenshot')!;
const btnToggleGUI = document.getElementById('btnToggleGUI')!;
const btnCameraHome = document.getElementById('btnCameraHome')!;
const btnFocus = document.getElementById('btnFocus')!;
const focusSelect = document.getElementById('focusSelect') as HTMLSelectElement;

btnRegenerate.addEventListener('click', () => params.regenerate());
btnLightning.addEventListener('click', () => strikeNow());
btnPause.addEventListener('click', () => { paused = !paused; btnPause.textContent = paused ? 'Resume' : 'Pause'; });
btnScreenshot.addEventListener('click', () => takeScreenshotNow());
btnCameraHome.addEventListener('click', () => resetCameraToHome());
btnFocus.addEventListener('click', () => focusVent(parseInt(focusSelect.value, 10)));

btnToggleGUI.addEventListener('click', () => {
  if (!gui) return;
  const el = gui.domElement;
  el.style.display = (el.style.display === 'none') ? '' : 'none';
});

// Keyboard shortcuts
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') params.regenerate();
  if (e.code === 'Space') { e.preventDefault(); strikeNow(); }
  if (e.key === 'p' || e.key === 'P') { paused = !paused; btnPause.textContent = paused ? 'Resume' : 'Pause'; }
  if (e.key === 'h' || e.key === 'H') toggleHelp();
  if (e.key === 'f' || e.key === 'F') { params.postFX = !params.postFX; if (ctrlPost) ctrlPost.updateDisplay(); ensurePostTargets(canvas.width, canvas.height); }
  if (e.key === 'Escape') { toggleHelp(false); }
}, { passive: false } as any);

// Splash
const splash = document.getElementById('splash')!;
const btnEnter = document.getElementById('btnEnter')!;
const btnSplashTest = document.getElementById('btnSplashTest')!;

btnSplashTest.addEventListener('click', () => {
  document.getElementById('aiSplashCoach')!.textContent = 'Test button works. Overlay is not intercepting clicks.';
  document.getElementById('aiSplashAnalyst')!.textContent = 'JS handlers are live. Proceed to Enter.';
  document.getElementById('aiSplashRisk')!.textContent = 'Containment: green. No stuck overlays detected.';
});

btnEnter.addEventListener('click', async () => {
  splash.style.display = 'none';
  document.getElementById('hudMode')!.textContent = 'LIVE';
  const aiCoachEl = document.getElementById('aiCoach');
  const aiAnalystEl = document.getElementById('aiAnalyst');
  const aiRiskEl = document.getElementById('aiRisk');
  if (aiCoachEl) aiCoachEl.textContent = 'Orbit slowly, confirm you can close/open panels. Then regen.';
  if (aiAnalystEl) aiAnalystEl.textContent = 'If FPS dips, lower Quality or enable Auto Quality.';
  if (aiRiskEl) aiRiskEl.textContent = 'If a panel ever blocks input: close it, or hit Regenerate.';
  try { await ensureAudio(); } catch (_) { }
});

// Final init + boot
rebuildVents();
resetLightningSchedule(true);
initGUI();
resize();
params.regenerate();

requestAnimationFrame(loop);
