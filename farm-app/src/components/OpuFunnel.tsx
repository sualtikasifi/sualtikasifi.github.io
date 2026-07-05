import { OpuSession } from "@/lib/types";

function rate(part: number | null, whole: number | null): string {
  if (part === null || whole === null || whole === 0) return "-";
  return `%${Math.round((part / whole) * 100)}`;
}

export function OpuFunnel({ session }: { session: OpuSession }) {
  const totalFollicles =
    session.follicle_count_right !== null || session.follicle_count_left !== null
      ? (session.follicle_count_right ?? 0) + (session.follicle_count_left ?? 0)
      : null;

  const stages = [
    {
      label: "Folikül",
      value: totalFollicles,
      sub:
        session.follicle_count_right !== null || session.follicle_count_left !== null
          ? `Sol ${session.follicle_count_left ?? 0} / Sağ ${session.follicle_count_right ?? 0}`
          : undefined,
    },
    {
      label: "Oosit",
      value: session.oocyte_count,
      rateOf: totalFollicles,
      sub:
        session.oocyte_grade_a !== null ||
        session.oocyte_grade_b !== null ||
        session.oocyte_grade_c !== null ||
        session.oocyte_grade_d !== null
          ? `A ${session.oocyte_grade_a ?? 0} · B ${session.oocyte_grade_b ?? 0} · C ${session.oocyte_grade_c ?? 0} · D ${session.oocyte_grade_d ?? 0}`
          : undefined,
    },
    { label: "Bölünen", value: session.cleaved_count, rateOf: session.oocyte_count },
    { label: "Embriyo", value: session.embryo_count, rateOf: session.cleaved_count },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stages.map((s) => (
        <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
          <p className="text-2xl font-semibold text-neutral-900">{s.value ?? "-"}</p>
          <p className="text-xs text-neutral-500">{s.label}</p>
          {s.sub && <p className="mt-1 text-xs text-neutral-400">{s.sub}</p>}
          {"rateOf" in s && s.rateOf !== undefined && (
            <p className="mt-1 text-xs text-neutral-400">Verim: {rate(s.value, s.rateOf)}</p>
          )}
        </div>
      ))}
    </div>
  );
}
