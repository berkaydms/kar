import React, { useEffect, useRef, useState } from "react";

/** Kar Küresi — Camı belirgin, ayrık çiçekler, yavaş “Salla” (4.5s)
 * - Cam: kalın çift kontur + parıltı şeritleri
 * - Çiçekler: sabit ve aralıklı (çakışma yok)
 * - “Salla”: karı yavaşlatır; 4.5s sürer, smooth başlar/biter
 * - Tamamen tipli
 */

function useDevicePixelRatio(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
      const parent = canvas.parentElement as HTMLElement;
      const maxCanvas = 560;
      const width = Math.min(parent.clientWidth, maxCanvas);
      const height = Math.max(340, Math.min(560, Math.round(width * 0.9)));
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    window.addEventListener("resize", resize);
    return () => { ro.disconnect(); window.removeEventListener("resize", resize); };
  }, [canvasRef]);
}

type Swirl = { ax: number; ay: number };
type FlowerSpot = { x: number; y: number; s: number; t: "daisy" | "rose" };
type TreeSpot = { x: number; y: number; s: number };
type Mode = "night" | "day";

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
const clamp = (v:number, lo:number, hi:number) => Math.max(lo, Math.min(hi, v));

class Snow {
  x=0; y=0; r=1; vx=0; vy=0; spin=0; phase=0; depth=1;
  constructor(w:number,h:number,dpr:number,prefill=false){ this.reset(w,h,dpr,prefill); }
  reset(w:number,h:number,dpr:number,prefill=false){
    this.depth = random(0.7,1.6);
    this.x = Math.random()*w;
    this.y = prefill ? random(-h*0.1,h*0.8) : -random(0,h*0.4);
    const base = 1/this.depth;
    this.r = random(0.9,2.8)*dpr*base;
    this.vx = random(-0.15,0.15)*dpr*base;
    this.vy = random(0.25,0.7)*dpr*base;
    this.spin = random(-0.02,0.02);
    this.phase = Math.random()*Math.PI*2;
  }
  step(w:number,h:number,wind:number,gravity:number,swirl:Swirl,dpr:number){
    this.phase += this.spin;
    const sway = Math.sin(this.phase)*0.18*dpr*(1/this.depth);
    this.vx += swirl.ax*0.0015*dpr*(1/this.depth);
    this.vy += swirl.ay*0.0015*dpr*(1/this.depth);
    this.x += this.vx + sway + wind*0.55*dpr*(1/this.depth);
    this.vy += gravity*0.025*dpr*(1/this.depth);
    this.y += this.vy;
    if(this.y>h*0.86 + (Math.random()*4-2)*dpr){
      if(Math.random()<0.12) this.reset(w,h,dpr);
      else{ this.vx*=0.45; this.vy*=-0.28; this.y=h*0.86 - Math.random()*5*dpr; }
    }
    if(this.x<-12*dpr) this.x=w+12*dpr;
    if(this.x>w+12*dpr) this.x=-12*dpr;
    if(this.y<-24*dpr) this.y=-24*dpr;
  }
  draw(ctx:CanvasRenderingContext2D){
    const near = this.depth<0.95;
    if(near){
      ctx.save();
      ctx.globalAlpha=0.9;
      ctx.shadowColor="rgba(255,255,255,0.6)";
      ctx.shadowBlur=Math.max(2,this.r*1.2);
      ctx.beginPath(); ctx.arc(this.x,this.y,this.r*1.05,0,Math.PI*2);
      ctx.fillStyle="#fff"; ctx.fill(); ctx.restore();
    }else{
      ctx.beginPath(); ctx.arc(this.x,this.y,this.r,0,Math.PI*2);
      ctx.fillStyle="#fff"; ctx.globalAlpha=0.85; ctx.fill(); ctx.globalAlpha=1;
    }
  }
}

/* —— Görsel yardımcılar —— */
function drawGlass(ctx:CanvasRenderingContext2D,w:number,h:number){
  const cx=w/2, cy=h*0.52, rx=w*0.36, ry=h*0.36;

  // İç glow
  const glow = ctx.createRadialGradient(cx-rx*0.28, cy-ry*0.52, rx*0.2, cx, cy, rx);
  glow.addColorStop(0,"rgba(255,255,255,0.18)");
  glow.addColorStop(0.6,"rgba(255,255,255,0.08)");
  glow.addColorStop(1,"rgba(255,255,255,0.03)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.fill();

  // Kalın dış çerçeve
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = Math.max(2, w*0.012); // daha kalın
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.stroke();

  // İç ince çerçeve
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = Math.max(1, w*0.006);
  ctx.beginPath(); ctx.ellipse(cx,cy,rx*0.985,ry*0.985,0,0,Math.PI*2); ctx.stroke();

  // Parıltı şeritleri
  ctx.strokeStyle = "rgba(255,255,255,0.65)";
  ctx.lineWidth = Math.max(1, w*0.004);
  ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,-Math.PI*0.95,-Math.PI*0.75); ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath(); ctx.ellipse(cx,cy,rx*0.92,ry*0.92,0,Math.PI*0.10,Math.PI*0.28); ctx.stroke();

  ctx.restore();
}

function drawBase(ctx:CanvasRenderingContext2D,w:number,h:number){
  const baseTop=h*0.78, baseHeight=h*0.14, baseWidth=w*0.48, cx=w/2;
  const shadow = ctx.createRadialGradient(cx,h*0.9,w*0.05,cx,h*0.9,w*0.28);
  shadow.addColorStop(0,"rgba(0,0,0,0.28)");
  shadow.addColorStop(1,"rgba(0,0,0,0)");
  ctx.fillStyle = shadow; ctx.beginPath();
  ctx.ellipse(cx,h*0.9,w*0.28,h*0.05,0,0,Math.PI*2); ctx.fill();

  const grad = ctx.createLinearGradient(0,baseTop,0,baseTop+baseHeight);
  grad.addColorStop(0,"#374151"); grad.addColorStop(1,"#0f172a");
  ctx.fillStyle = grad; ctx.strokeStyle="#0b1220"; ctx.lineWidth=Math.max(1,w*0.003);
  (ctx as any).beginPath();
  (ctx as any).roundRect(cx-baseWidth/2, baseTop, baseWidth, baseHeight, Math.max(6,w*0.02));
  ctx.fill(); ctx.stroke();

  const plateW=baseWidth*0.46, plateH=baseHeight*0.32;
  const grad2 = ctx.createLinearGradient(0,baseTop+plateH,0,baseTop+plateH*2);
  grad2.addColorStop(0,"#c7d2fe"); grad2.addColorStop(1,"#93c5fd");
  ctx.fillStyle=grad2; (ctx as any).beginPath();
  (ctx as any).roundRect(cx-plateW/2, baseTop+baseHeight*0.35, plateW, plateH, Math.max(4,w*0.01));
  ctx.fill();
}

function drawDaisy(ctx:CanvasRenderingContext2D,x:number,y:number,s:number){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  for(let i=0;i<12;i++){ ctx.rotate((Math.PI*2)/12); ctx.beginPath(); ctx.fillStyle="#fff"; ctx.ellipse(0,-10,5,12,0,0,Math.PI*2); ctx.fill(); }
  ctx.beginPath(); ctx.fillStyle="#facc15"; ctx.arc(0,0,6,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawWhiteRose(ctx:CanvasRenderingContext2D,x:number,y:number,s:number){
  ctx.save(); ctx.translate(x,y); ctx.scale(s,s);
  for(let r=10;r>=4;r-=2){ ctx.beginPath(); ctx.fillStyle="#fff"; ctx.globalAlpha=0.96-(10-r)*0.05; ctx.ellipse(0,0,r+2,r,0,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1; ctx.strokeStyle="rgba(0,0,0,0.12)"; ctx.lineWidth=1;
  ctx.beginPath(); ctx.arc(0,0,11,0,Math.PI*2); ctx.stroke(); ctx.restore();
}

/* —— Sahne —— */
function drawScene(
  ctx:CanvasRenderingContext2D,
  w:number, h:number,
  tiltX:number, tiltY:number,
  mode:Mode,
  trees:TreeSpot[], flowers:FlowerSpot[]
){
  // dış arka plan
  if(mode==="night"){
    ctx.fillStyle="#000"; ctx.fillRect(0,0,w,h);
    // yıldızlar hafif
    const stars = Math.floor(w*h*0.00003);
    ctx.save(); ctx.globalAlpha=0.4;
    for(let i=0;i<stars;i++){ const sx=Math.random()*w, sy=Math.random()*h*0.45, sr=Math.random()*1.1;
      ctx.beginPath(); ctx.arc(sx,sy,sr,0,Math.PI*2); ctx.fillStyle="#cbd5e1"; ctx.fill();
    } ctx.restore();
    // ay
    const moonX=w*0.82, moonY=h*0.18, moonR=Math.max(6,w*0.02);
    ctx.beginPath(); ctx.arc(moonX,moonY,moonR,0,Math.PI*2); ctx.fillStyle="#e5e7eb"; ctx.fill();
  }else{
    const grad=ctx.createLinearGradient(0,0,0,h);
    grad.addColorStop(0,"#93c5fd"); grad.addColorStop(1,"#e0f2fe");
    ctx.fillStyle=grad; ctx.fillRect(0,0,w,h);
    const sunX=w*0.82, sunY=h*0.18, sunR=Math.max(8,w*0.025);
    ctx.beginPath(); ctx.arc(sunX,sunY,sunR,0,Math.PI*2); ctx.fillStyle="#fde047"; ctx.fill();
  }

  const cx=w/2, cy=h*0.52, rx=w*0.36, ry=h*0.36;
  const shiftX=tiltX*rx*0.02, shiftY=tiltY*ry*0.02;

  ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.clip();

  // iç arka plan
  const inner=ctx.createLinearGradient(0,cy-ry,0,cy+ry);
  if(mode==="night"){ inner.addColorStop(0,"#07090d"); inner.addColorStop(1,"#0b1410"); }
  else{ inner.addColorStop(0,"#bfe3ff"); inner.addColorStop(1,"#eaf6ff"); }
  ctx.fillStyle=inner; ctx.fillRect(cx-rx,cy-ry,rx*2,ry*2);

  // zemin
  const grass=ctx.createLinearGradient(0,cy+ry*0.2,0,cy+ry);
  if(mode==="night"){ grass.addColorStop(0,"#22c55e"); grass.addColorStop(1,"#166534"); }
  else{ grass.addColorStop(0,"#86efac"); grass.addColorStop(1,"#16a34a"); }
  ctx.fillStyle=grass; ctx.beginPath();
  ctx.ellipse(cx+shiftX*1.2, cy+ry*0.55+shiftY*1.2, rx*0.9, ry*0.35, 0,0,Math.PI*2); ctx.fill();

  // ağaçlar (zemin üstünde, çiçek arkasında)
  ctx.fillStyle = mode==="night" ? "#064e3b" : "#15803d";
  for(const t of trees){
    const ax=t.x+shiftX*1.0, ay=t.y+shiftY*1.0, s=t.s;
    ctx.beginPath(); ctx.moveTo(ax, ay - s*2.2); ctx.lineTo(ax - s, ay + s); ctx.lineTo(ax + s, ay + s); ctx.closePath(); ctx.fill();
  }

  // çiçekler (ayrık)
  for(const f of flowers){
    const fx=f.x+shiftX*1.15, fy=f.y+shiftY*1.15;
    if(f.t==="daisy") drawDaisy(ctx, fx, fy-8, f.s);
    else drawWhiteRose(ctx, fx, fy-8, f.s);
  }

  ctx.restore();
}

/* —— Ana Bileşen —— */
export default function SnowGlobeApp(){
  const canvasRef = useRef<HTMLCanvasElement|null>(null);
  useDevicePixelRatio(canvasRef);

  const [mode, setMode] = useState<Mode>("night");
  const [tilt, setTilt] = useState<{x:number;y:number}>({x:0,y:0});
  const [swirl, setSwirl] = useState<Swirl>({ax:0, ay:0});

  // Salla efekti: 4.5s toplam (0.6s yüksel, 3.9s sön)
  const shakeStartRef = useRef<number>(-1);
  const [shakeBlend, setShakeBlend] = useState<number>(0); // 0..1

  const triggerShake = () => { shakeStartRef.current = performance.now(); };

  // Fare ile tilt & swirl, shake’e katkı
  useEffect(()=>{
    const el = canvasRef.current; if(!el) return;
    let dragging=false; let last={x:0,y:0};
    const norm=(e:PointerEvent)=>{
      const rect=el.getBoundingClientRect();
      const x=(e.clientX-rect.left)/rect.width, y=(e.clientY-rect.top)/rect.height;
      return {x:x*2-1, y:y*2-1};
    };
    const down=(e:PointerEvent)=>{ dragging=true; last=norm(e); };
    const move=(e:PointerEvent)=>{
      if(!dragging) return;
      const n=norm(e);
      setTilt({x:n.x*0.6, y:n.y*0.6});
      setSwirl({ax:(n.x-last.x)*60, ay:(n.y-last.y)*60});
      // sürüklemede de shake başlasın (yumuşak), tekrar tekrar tetiklenebilir
      if(shakeStartRef.current<0) shakeStartRef.current = performance.now();
      last=n;
    };
    const up=()=>{ dragging=false; };
    el.addEventListener("pointerdown",down);
    window.addEventListener("pointermove",move);
    window.addEventListener("pointerup",up);
    return ()=>{ el.removeEventListener("pointerdown",down); window.removeEventListener("pointermove",move); window.removeEventListener("pointerup",up); };
  },[]);

  // Shake zamanlayıcı (hedef eğrisi): 0→1 (0-0.6s), sonra 1→0 (0.6-4.5s)
  useEffect(()=>{
    let raf=0;
    const tick=()=>{
      const start = shakeStartRef.current;
      let target=0;
      if(start>=0){
        const t = performance.now()-start;
        const up=600, total=4500;
        if(t<=0) target=0;
        else if(t<up){ // ease-out yükseliş
          const k = t/up; const ease = 1- Math.pow(1-k,3);
          target = ease;
        } else if(t<total){ // ease-in sönüş
          const k = (t-up)/(total-up); const ease = 1- Math.pow(k,3);
          target = clamp(ease,0,1);
        } else {
          target=0; shakeStartRef.current = -1; // bitti
        }
      }
      // exponential smoothing ile shakeBlend'e uygula
      const dt = 16; // kabaca
      const alpha = 1 - Math.exp(-dt/180);
      setShakeBlend((v)=> v + (target - v)*alpha);
      raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
    return ()=> cancelAnimationFrame(raf);
  },[]);

  // Layout veri depoları (sabit kalması için)
  const treesRef = useRef<TreeSpot[]>([]);
  const flowersRef = useRef<FlowerSpot[]>([]);
  const layoutDirtyRef = useRef<boolean>(true);

  // Boyut değişiminde layout’u yenile
  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    let w=canvas.width, h=canvas.height;
    const ro = new ResizeObserver(()=>{ if(!canvas) return;
      if(canvas.width!==w || canvas.height!==h){ w=canvas.width; h=canvas.height; layoutDirtyRef.current=true; }
    });
    if(canvas.parentElement) ro.observe(canvas.parentElement);
    return ()=> ro.disconnect();
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d"); if(!ctx) return;

    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio||1));
    let w=canvas.width, h=canvas.height;

    // Kar parçacıkları
    let flakes: Snow[] = [];
    const BASE_DENSITY = 1100;
    const ensureDensity=(n:number,prefill=false)=>{
      if(flakes.length<n){ for(let i=flakes.length;i<n;i++) flakes.push(new Snow(w,h,dpr,prefill)); }
      else if(flakes.length>n){ flakes.length=n; }
    };
    ensureDensity(BASE_DENSITY,true);

    // Yoğunluk smoothing
    let densityCurrent = BASE_DENSITY;
    let prev = performance.now();
    let raf=0;

    const recomputeLayout=()=>{
      const cx=w/2, cy=h*0.52, rx=w*0.36, ry=h*0.36;
      const baseY = cy + ry*0.35;

      // Ağaçlar: iki sıra, eşit aralıklı (sabit)
      const trees: TreeSpot[] = [];
      const rows=2, perRow=11;
      for(let r=0;r<rows;r++){
        for(let i=0;i<perRow;i++){
          const ratio=i/(perRow-1);
          const x = cx - rx*0.9 + ratio*(rx*1.8);
          const y = cy + ry*(0.26 + 0.05*r) + r*8;
          const s = 9 + ((i + r)%3)*5;
          trees.push({x,y,s});
        }
      }
      treesRef.current = trees;

      // Çiçekler: iki sıra, geniş aralık — sabit ve ayrık
      const flowers: FlowerSpot[] = [];
      const backCount=8; // arka sıra
      for(let i=0;i<backCount;i++){
        const ratio=i/(backCount-1);
        const x = cx - rx*0.36 + ratio*(rx*0.72);
        const y = baseY + ((i%2===0)?2:0);
        const s = 1.0 + ((i%3)*0.08);
        flowers.push({x,y,s,t:(i%2===0?"daisy":"rose")});
      }
      const frontCount=6; // ön sıra
      for(let i=0;i<frontCount;i++){
        const ratio=i/(frontCount-1);
        const x = cx - rx*0.32 + ratio*(rx*0.64);
        const y = baseY + 6 + ((i%2===0)?2:0);
        const s = 1.12 + ((i%2)*0.1);
        // Ön sırayı yarım hücre kaydırarak çakışmayı önle
        const shift = (rx*0.64)/(frontCount-1)/2;
        flowers.push({x:x+shift, y, s, t:(i%2===0?"rose":"daisy")});
      }
      flowersRef.current = flowers;
    };
    recomputeLayout();

    const render=()=>{
      const now=performance.now();
      const dt=Math.min(100, now-prev); prev=now;

      // Boyut değiştiyse
      if(canvas.width!==w || canvas.height!==h){ w=canvas.width; h=canvas.height; ensureDensity(Math.round(densityCurrent), true); layoutDirtyRef.current=true; }
      if(layoutDirtyRef.current){ recomputeLayout(); layoutDirtyRef.current=false; }

      // Hedef yoğunluk: shake sırasında bir miktar **AZALTMAYALIM** (doluluk kalsın) ama fizik yavaşlasın.
      // İstenene göre kar “yavaş” görünsün → yoğunluğu sabit tutup gravity/wind düşürüyoruz.
      const densityTarget = BASE_DENSITY;
      const densAlpha = 1 - Math.exp(-dt/500);
      densityCurrent = densityCurrent + (densityTarget - densityCurrent)*densAlpha;
      ensureDensity(Math.round(densityCurrent));

      // Arka plan + sahne
      ctx.clearRect(0,0,w,h);
      drawScene(ctx, w, h, tilt.x, tilt.y, mode, treesRef.current, flowersRef.current);

      // Küre clip
      const cx=w/2, cy=h*0.52, rx=w*0.36, ry=h*0.36;
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2); ctx.clip();

      ctx.globalAlpha=0.92; ctx.fillStyle="#fff";

      // “Salla” etkisi: yavaş kar → gravity daha küçük, rüzgâr hafif
      const gravityBase=1, windBase=0;
      const slowFactor = 1 - 0.6*shakeBlend; // 1→0.4
      const gravity = gravityBase * slowFactor;
      const wind = windBase + 0.25*shakeBlend; // çok hafif rüzgâr

      for(let i=0;i<flakes.length;i++){
        const f=flakes[i];
        f.step(w,h,wind,gravity,swirl,dpr);
        f.draw(ctx);
      }
      ctx.restore();

      drawGlass(ctx,w,h);
      drawBase(ctx,w,h);

      raf=requestAnimationFrame(render);
    };

    raf=requestAnimationFrame(render);
    return ()=> cancelAnimationFrame(raf);
  },[mode, tilt, swirl, shakeBlend]);

  return (
    <div className="min-h-screen w-full bg-black text-slate-100 flex flex-col items-center p-8">
      <div className="w-full max-w-3xl mx-auto">
        <header className="mb-6 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Üşengeç Sülüfat'ın Kar Küresi</h1>
          <p className="mt-2 text-slate-400"></p>
        </header>

        <div className="bg-white/10 backdrop-blur rounded-2xl shadow-lg p-3 border border-white/10 mx-auto max-w-[600px]">
          <div className="relative rounded-2xl overflow-hidden border border-white/10 mx-auto">
            <canvas ref={canvasRef} className="block mx-auto cursor-grab active:cursor-grabbing select-none" />
          </div>
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            <button
              onClick={()=>setMode(m=>m==="night"?"day":"night")}
              className="px-4 py-2 rounded-xl shadow hover:shadow-md bg-indigo-500 text-white"
              title="Gece/Gündüz modu"
            >
              {mode==="night" ? "Gündüz Modu" : "Gece Modu"}
            </button>
          </div>
        </div>

        <footer className="mt-8 text-center text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} </p>
        </footer>
      </div>
    </div>
  );
}
