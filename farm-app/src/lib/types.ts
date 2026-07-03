export type UserRole = "yonetici" | "veteriner" | "calisan";

export type AnimalStatus = "aktif" | "satildi" | "olu";
export type AnimalGender = "disi" | "erkek";

export type TreatmentCategory = "genel" | "mastitis" | "buzagi_beslenme";
export type TreatmentOutcome = "devam_ediyor" | "iyilesti" | "olum";
export type UdderQuarter = "on_sol" | "on_sag" | "arka_sol" | "arka_sag";

export type TaskStatus = "bekliyor" | "yapildi" | "iptal";

export type PregnancyResult = "bekleniyor" | "gebe" | "gebe_degil";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Animal {
  id: string;
  ear_tag: string;
  name: string | null;
  birth_date: string | null;
  breed: string | null;
  gender: AnimalGender | null;
  status: AnimalStatus;
  mother_ear_tag: string | null;
  weaned_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  animal_id: string;
  treatment_date: string;
  category: TreatmentCategory;
  diagnosis: string | null;
  medication: string | null;
  dose: string | null;
  udder_quarter: UdderQuarter | null;
  vet_name: string | null;
  outcome: TreatmentOutcome;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string | null;
  due_date: string;
  due_time: string | null;
  status: TaskStatus;
  created_at: string;
}

export interface Bull {
  id: string;
  name: string;
  code: string | null;
  breed: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SemenInventory {
  id: string;
  bull_id: string;
  straw_count: number;
  tank_location: string | null;
  notes: string | null;
  updated_at: string;
}

export interface Insemination {
  id: string;
  animal_id: string;
  bull_id: string | null;
  insemination_date: string;
  technician_name: string | null;
  pregnancy_check_date: string | null;
  pregnancy_result: PregnancyResult;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}
