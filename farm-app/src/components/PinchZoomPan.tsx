"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  maxZoom?: number;
}

interface Transform {
  zoom: number; // 1..maxZoom, ustune uygulanan ek buyutme (fitScale'e gore)
  x: number;
  y: number;
}

// Buzagilik Odasi gibi genis izgaralar mobilde ekrana sigmadigi icin: alan
// varsayilan olarak konteynera sigacak sekilde kucultulur (fitScale), iki
// parmakla yakinlastirilip (pinch) ve tek parmakla kaydirilip (pan) buyuk
// haliyle incelenebilir. Ust menu/sayfa bundan etkilenmez, sadece bu alan
// buyur/kucculur.
export function PinchZoomPan({ children, className, maxZoom = 3 }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [transform, setTransform] = useState<Transform>({ zoom: 1, x: 0, y: 0 });

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  // contentAnchor: pinch baslarken parmaklarin ortasindaki noktanin,
  // icerigin kendi (olceklenmemis) merkezine gore konumu - pinch boyunca
  // bu nokta HEP parmaklarin altinda kalacak sekilde pan hesaplanir.
  // outerCenter: konteynerin ekran uzerindeki merkezi, jest basinda bir
  // kez olculur (jest sirasinda sayfa kaymadigi icin sabit kabul edilir).
  const pinchStart = useRef<{
    dist: number;
    zoom: number;
    contentAnchor: { x: number; y: number };
    outerCenter: { x: number; y: number };
  } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  const rafId = useRef<number | null>(null);
  const pendingTransform = useRef<Transform | null>(null);

  // Gercek dokunma girisi ekran yenileme hizindan (60-120Hz) cok daha sik
  // pointermove uretebilir; her birinde dogrudan setTransform cagirmak
  // yavas/dusuk guclu cihazlarda render yiginlanmasina yol acabiliyordu.
  // Bunun yerine sadece en son degeri saklayip animasyon karesi basina en
  // fazla bir kez state guncelliyoruz.
  function scheduleTransform(next: Transform) {
    pendingTransform.current = next;
    if (rafId.current != null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (pendingTransform.current) {
        setTransform(pendingTransform.current);
        pendingTransform.current = null;
      }
    });
  }

  useEffect(() => {
    return () => {
      if (rafId.current != null) cancelAnimationFrame(rafId.current);
    };
  }, []);

  useLayoutEffect(() => {
    function measure() {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const containerWidth = outer.clientWidth;
      const w = inner.scrollWidth;
      const h = inner.scrollHeight;
      if (w === 0) return;
      // Ayni sayisal degerse ayni referansi dondurup gereksiz render'i
      // engelle: aksi halde yeni bir nesne her zaman "degisti" sayilir.
      setNatural((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
      setFitScale((prev) => {
        const next = Math.min(1, containerWidth / w);
        return prev === next ? prev : next;
      });
    }
    measure();
    // DIKKAT: outer'in kendi boyutu (yukseklik) zoom durumuna gore bizim
    // tarafimizdan ayarlaniyor; onu ResizeObserver ile izlemek kendi
    // degisikligimizi tekrar tetikleyip surekli pinch sirasinda render
    // yiginlanmasina (ve gercek cihazda donmaya/cokmeye) yol acabiliyor.
    // Sadece dogal (transform'dan etkilenmeyen) inner icerigi izle;
    // konteyner genisligi icin de pencere yeniden boyutlandirmasini
    // dinlemek yeterli.
    const ro = new ResizeObserver(measure);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const totalScale = fitScale * transform.zoom;

  function clamp(next: Transform): Transform {
    const zoom = Math.min(maxZoom, Math.max(1, next.zoom));
    const scale = fitScale * zoom;
    const outer = outerRef.current;
    const containerWidth = outer?.clientWidth ?? natural.width;
    const containerHeight = outer?.clientHeight ?? natural.height;
    const scaledW = natural.width * scale;
    const scaledH = natural.height * scale;
    const maxX = Math.max(0, (scaledW - containerWidth) / 2);
    const maxY = Math.max(0, (scaledH - containerHeight) / 2);
    return {
      zoom,
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function resetZoom() {
    setTransform({ zoom: 1, x: 0, y: 0 });
  }

  function onPointerDown(e: React.PointerEvent) {
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {
      // Baglanti kesilmis/gecersiz pointer gibi durumlarda capture basarisiz
      // olabilir; jest/test ortaminda da olur. Yakalamayi engellemesin.
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const outerRect = outerRef.current?.getBoundingClientRect();
      const outerCenter = outerRect
        ? { x: outerRect.left + outerRect.width / 2, y: outerRect.top + outerRect.height / 2 }
        : mid;
      const scaleNow = fitScale * transform.zoom;
      const midRelative = { x: mid.x - outerCenter.x, y: mid.y - outerCenter.y };
      // Su an parmaklarin oldugu ekran noktasinin altinda hangi icerik
      // noktasi var, onu sabitliyoruz.
      const contentAnchor = {
        x: scaleNow !== 0 ? (midRelative.x - transform.x) / scaleNow : 0,
        y: scaleNow !== 0 ? (midRelative.y - transform.y) / scaleNow : 0,
      };
      pinchStart.current = { dist, zoom: transform.zoom, contentAnchor, outerCenter };
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      const now = Date.now();
      const prevTap = lastTap.current;
      const closeEnough = !!prevTap && Math.hypot(e.clientX - prevTap.x, e.clientY - prevTap.y) < 24;
      if (prevTap && now - prevTap.time < 300 && closeEnough) {
        setTransform((prev) => (prev.zoom > 1 ? { zoom: 1, x: 0, y: 0 } : clamp({ zoom: 2, x: prev.x, y: prev.y })));
        lastTap.current = null;
      } else {
        lastTap.current = { time: now, x: e.clientX, y: e.clientY };
      }
      panStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      e.preventDefault();
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      // Once zoom'u kirpiyoruz: aksi halde parmaklar maksimum zoom'u
      // asacak sekilde acilmaya devam ettiginde (zoom sabitlenmis olsa
      // bile) pan hesabi kirpilmamis, hep buyuyen bir "hayali" scale
      // kullanmaya devam edip iceriği kaydirmaya devam ediyordu.
      const rawZoom = (dist / pinchStart.current.dist) * pinchStart.current.zoom;
      const zoom = Math.min(maxZoom, Math.max(1, rawZoom));
      const scaleNew = fitScale * zoom;
      const midRelative = {
        x: mid.x - pinchStart.current.outerCenter.x,
        y: mid.y - pinchStart.current.outerCenter.y,
      };
      // contentAnchor'i su anki parmak konumunun (mid) altinda tutacak pan.
      const nextX = midRelative.x - pinchStart.current.contentAnchor.x * scaleNew;
      const nextY = midRelative.y - pinchStart.current.contentAnchor.y * scaleNew;
      scheduleTransform(clamp({ zoom, x: nextX, y: nextY }));
    } else if (pointers.current.size === 1 && panStart.current && transform.zoom > 1) {
      e.preventDefault();
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      scheduleTransform(clamp({ zoom: transform.zoom, x: panStart.current.tx + dx, y: panStart.current.ty + dy }));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    pinchStart.current = null;
    if (pointers.current.size === 1) {
      const [[, p]] = pointers.current;
      panStart.current = { x: p.x, y: p.y, tx: transform.x, ty: transform.y };
    } else {
      panStart.current = null;
    }
  }

  return (
    <div
      ref={outerRef}
      className={`relative overflow-hidden ${className ?? ""}`}
      style={{
        // DIKKAT: yukseklik sadece fitScale'e gore sabit - zoom'a gore
        // BUYUMEMELI. Buyurse konteynerin kendi merkezi (top:50%) jest
        // sirasinda kayar ve pinch'in "parmaklarin oldugu yere degil,
        // yukari dogru" yakinlasmasina yol acar (anchor hesaplari sabit
        // bir merkez varsayiyor). Konteyner sabit boyutlu bir "pencere",
        // icerik onun icinde zoom'lanip kayiyor.
        height: Math.round(natural.height * fitScale) || undefined,
        // Zoom yapilmadigi surece tek parmakla dikey sayfa kaydirmasi
        // normal calissin (JS tarafi zaten o durumda hicbir sey yapmiyor);
        // sadece zoom yapildiginda (parmakla kaydirma bizim islemimiz
        // oldugunda) tarayicinin varsayilan davranisini tamamen kapatiyoruz.
        touchAction: transform.zoom > 1 ? "none" : "pan-y",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        ref={innerRef}
        className="absolute left-1/2 top-1/2"
        style={{
          transform: `translate(-50%, -50%) translate(${transform.x}px, ${transform.y}px) scale(${totalScale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
      {transform.zoom > 1 && (
        <button
          type="button"
          onClick={resetZoom}
          className="btn-secondary absolute bottom-2 right-2 z-10 px-2.5 py-1 text-xs shadow"
        >
          Sıfırla
        </button>
      )}
    </div>
  );
}
