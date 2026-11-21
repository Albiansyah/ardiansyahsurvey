export function BarChart({ data, ariaLabel }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 400, h = 170, padX = 8, padTop = 16, padBottom = 28;
  const chartH = h - padTop - padBottom;
  const gap = 8;
  const barW = data.length > 0 ? (w - padX * 2 - gap * (data.length - 1)) / data.length : 0;

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">Belum ada data</p>;
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
      {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
        <line
          key={i}
          x1={padX}
          x2={w - padX}
          y1={padTop + chartH * (1 - t)}
          y2={padTop + chartH * (1 - t)}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * chartH, d.value > 0 ? 3 : 0);
        const x = padX + i * (barW + gap);
        const y = padTop + chartH - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill="#1e40af" rx="2" />
            {d.value > 0 && (
              <text
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#0f172a"
              >
                {d.value}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={h - 8}
              textAnchor="middle"
              fontSize="9"
              fill="#475569"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function LineChart({ data, ariaLabel }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const w = 400, h = 170, padX = 16, padTop = 14, padBottom = 28;
  const chartH = h - padTop - padBottom;
  const chartW = w - padX * 2;
  const stepX = data.length > 1 ? chartW / (data.length - 1) : 0;

  if (data.length === 0) {
    return <p className="text-sm text-slate-500 text-center py-8">Belum ada data</p>;
  }

  const points = data.map((d, i) => ({
    x: padX + i * stepX,
    y: padTop + chartH - (d.value / max) * chartH,
    value: d.value,
    label: d.label
  }));

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label={ariaLabel}>
      {[0, 0.5, 1].map((t, i) => (
        <line
          key={i}
          x1={padX}
          x2={w - padX}
          y1={padTop + chartH * (1 - t)}
          y2={padTop + chartH * (1 - t)}
          stroke="#e2e8f0"
          strokeWidth="1"
        />
      ))}
      <path
        d={pathD}
        fill="none"
        stroke="#1e40af"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="white" stroke="#1e40af" strokeWidth="2" />
          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="9" fontWeight="600" fill="#0f172a">
            {p.value}
          </text>
          <text x={p.x} y={h - 8} textAnchor="middle" fontSize="8" fill="#475569">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
