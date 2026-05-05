import React from 'react';
import type { CSSProperties } from 'react';

interface SignatureProps {
  width?: number;
  height?: number;
  lineColor?: string;
  lineWidth?: number;
  label?: string;
  style?: CSSProperties;
  onSign?: (dataUrl: string) => void;
}

export function Signature({ width = 400, height = 200, lineColor = '#000', lineWidth = 2, label, style, onSign }: SignatureProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = React.useState(false);

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    setDrawing(true);
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function onMouseUp() {
    setDrawing(false);
    if (canvasRef.current) {
      onSign?.(canvasRef.current.toDataURL());
    }
  }

  function clear() {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, width, height);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {label && <label style={{ fontSize: 14 }}>{label}</label>}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{ border: '1px solid #d1d5db', borderRadius: 8, cursor: 'crosshair' }}
      />
      <button type="button" onClick={clear} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>
        Clear
      </button>
    </div>
  );
}
