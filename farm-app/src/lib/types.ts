export type UserRole = "yonetici" | "veteriner" | "calisan";

export type AnimalStatus = "aktif" | "satildi" | "olu";
export type AnimalGender = "disi" | "erkek";

export type UdderQuarter = "on_sol" | "on_sag" | "arka_sol" | "arka_sag";

export type TaskStatus = "bekliyor" | "yapildi" | "iptal";

export type PregnancyResult = "bekleniyor" | "gebe" | "gebe_degil";

export type EmbryoGrade = "1" | "2" | "3" | "4";
export type EmbryoStage =
  | "morula"
  | "erken_blastosist"
  | "blastosist"
  | "genisleyen_blastosist"
  | "yumurtadan_cikan_blastosist";
export type EmbryoStatus = "gelisiyor" | "dondu" | "transfer_edildi" | "atildi";

export interface Profile {
  id: string;
  full_name: string;
  start_date: string | null;
  role: UserRole;
  is_admin: boolean;
  can_manage_animals: boolean;
  can_manage_mastitis: boolean;
  can_manage_tasks: boolean;
  can_manage_bulls_semen: boolean;
  can_manage_inseminations: boolean;
  can_manage_opu: boolean;
  can_manage_calves: boolean;
  can_manage_medicines: boolean;
  can_send_announcements: boolean;
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

export interface MastitisTreatment {
  id: string;
  animal_id: string;
  udder_quarters: UdderQuarter[];
  diagnosis: string | null;
  medication: string | null;
  vet_name: string | null;
  start_date: string;
  protocol_days: number;
  withdrawal_days: number;
  ended_at: string | null;
  withdrawal_cleared_at: string | null;
  withdrawal_cleared_by: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface MastitisDose {
  id: string;
  mastitis_treatment_id: string;
  day_number: number;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
  note: string | null;
}

export interface MastitisProtocol {
  id: string;
  medication: string;
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
  image_url: string | null;
  completed_by: string | null;
  completed_at: string | null;
  completion_note: string | null;
  completion_image_url: string | null;
  created_at: string;
}

export interface TaskAnimal {
  id: string;
  task_id: string;
  animal_id: string;
  done: boolean;
  done_by: string | null;
  done_at: string | null;
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

export type SemenType = "konvansiyonel" | "disi";

export interface SemenInventory {
  id: string;
  bull_id: string;
  semen_type: SemenType;
  straw_count: number;
  tank_straw_count: number;
  tank_location: string | null;
  notes: string | null;
  updated_at: string;
}

export interface Insemination {
  id: string;
  animal_id: string;
  bull_id: string | null;
  semen_type: SemenType | null;
  insemination_date: string;
  technician_name: string | null;
  pregnancy_check_date: string | null;
  pregnancy_result: PregnancyResult;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface OpuSession {
  id: string;
  donor_animal_id: string;
  session_date: string;
  session_time: string | null;
  technician_name: string | null;
  follicle_count_right: number | null;
  follicle_count_left: number | null;
  oocyte_count: number | null;
  oocyte_grade_a: number | null;
  oocyte_grade_b: number | null;
  oocyte_grade_c: number | null;
  oocyte_grade_d: number | null;
  cleaved_count: number | null;
  fertilization_bull_id: string | null;
  fertilization_semen_type: SemenType | null;
  embryo_count: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Embryo {
  id: string;
  opu_session_id: string;
  label: string;
  grade: EmbryoGrade | null;
  stage: EmbryoStage | null;
  day_reached: number | null;
  status: EmbryoStatus;
  recipient_animal_id: string | null;
  transfer_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalfFeeding {
  id: string;
  animal_id: string;
  fed_at: string;
  drank: boolean;
  notes: string | null;
  exam_result: string | null;
  examined_by: string | null;
  examined_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ShiftNote {
  id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface CalfNote {
  id: string;
  animal_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
}

export interface Medicine {
  id: string;
  name: string;
  unit: string;
  stock_count: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  profile_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
