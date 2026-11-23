"use client";
import { useEffect, useRef } from "react";
import { buildScene, render, updateHearts, type Heart } from "@/lib/bouquet";

const FPS = 24;

export default function Bouquet() {
  const box = useRef<HTMLDivElement>(null);
  const pre = useRef<HTMLPreElement>(null);

  useEffect(() => {
    const el = pre.current!, wrap = box.current!;
    const scene = buildScene();
    const hearts: Heart[] = [];

    // measure one monospace cell
    el.textContent = "M".repeat(100);
    const r = el.getBoundingClientRect();
    const cw = r.width / 100, ch = r.height;

    let raf = 0, last = performance.now();
    const t0 = last;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = (now - last) / 1000;
      if (dt < 1 / FPS) return;
      last = now;
      const cols = Math.max(20, Math.floor(wrap.clientWidth / cw) - 1);
      const rows = Math.max(12, Math.floor(wrap.clientHeight / ch) - 1);
      updateHearts(hearts, dt);
      el.innerHTML = render(scene, (now - t0) / 1000, cols, rows, hearts);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={box} style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center" }}>
      <pre
        ref={pre}
        aria-label="A spinning bouquet of flowers with the message: for you"
        style={{
          margin: 0, color: "#fff", whiteSpace: "pre",
          font: "14px/1.15 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
        }}
      />
    </div>
  );
}
