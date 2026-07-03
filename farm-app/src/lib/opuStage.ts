import { OpuSession } from "./types";

export type OpuStage = "oocyte" | "cleaved" | "embryo" | "done";

export function opuStageFor(session: OpuSession): OpuStage {
  if (session.oocyte_count === null) return "oocyte";
  if (session.cleaved_count === null) return "cleaved";
  if (session.embryo_count === null) return "embryo";
  return "done";
}

export const OPU_STAGE_INFO: Record<
  Exclude<OpuStage, "done">,
  { title: string; question: string; field: "oocyte_count" | "cleaved_count" | "embryo_count" }
> = {
  oocyte: {
    title: "Laboratuvar sonucu bekleniyor",
    question: "Foliküllerden kaç oosit çıktı?",
    field: "oocyte_count",
  },
  cleaved: {
    title: "Bölünme (cleavage) kontrolü",
    question: "Oositlerden kaçı bölündü?",
    field: "cleaved_count",
  },
  embryo: {
    title: "Embriyo sayımı",
    question: "Bölünenlerden kaçı embriyoya dönüştü?",
    field: "embryo_count",
  },
};
