import { isDemoMode, supabase } from "./supabaseClient";
import * as mock from "./mock/store";
import {
  Animal,
  Bull,
  CalfFeeding,
  Embryo,
  Insemination,
  MastitisDose,
  MastitisProtocol,
  MastitisTreatment,
  Medicine,
  OpuSession,
  Profile,
  SemenInventory,
  Task,
} from "./types";

export { isDemoMode };

// Supabase/PostgREST caps a single select() at 1000 rows by default. Any list
// that can plausibly grow past that (e.g. a full animal herd) needs to page
// through with .range() instead of silently truncating.
const PAGE_SIZE = 1000;

async function fetchAllPages<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const all: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

// --- Profiles ---

export async function listProfiles(): Promise<Profile[]> {
  if (isDemoMode) return mock.demoListProfiles();
  return fetchAllPages<Profile>((from, to) =>
    supabase!.from("profiles").select("*").range(from, to)
  );
}

export async function updateProfile(id: string, patch: Partial<Profile>): Promise<Profile | undefined> {
  if (isDemoMode) return mock.demoUpdateProfile(id, patch);
  const { data, error } = await supabase!.from("profiles").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Profile;
}

// --- Animals ---

export async function listAnimals(): Promise<Animal[]> {
  if (isDemoMode) return mock.demoListAnimals();
  return fetchAllPages<Animal>((from, to) =>
    supabase!.from("animals").select("*").order("created_at", { ascending: false }).range(from, to)
  );
}

export async function getAnimal(id: string): Promise<Animal | undefined> {
  if (isDemoMode) return mock.demoGetAnimal(id);
  const { data, error } = await supabase!.from("animals").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as Animal;
}

export async function createAnimal(
  input: Omit<Animal, "id" | "created_at" | "updated_at">
): Promise<Animal> {
  if (isDemoMode) return mock.demoCreateAnimal(input);
  const { data, error } = await supabase!.from("animals").insert(input).select().single();
  if (error) throw error;
  return data as Animal;
}

export async function updateAnimal(id: string, patch: Partial<Animal>): Promise<Animal | undefined> {
  if (isDemoMode) return mock.demoUpdateAnimal(id, patch);
  const { data, error } = await supabase!.from("animals").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Animal;
}

// Bulk import: skips ear tags that already exist instead of failing the whole batch.
export async function createAnimalsBulk(
  inputs: Omit<Animal, "id" | "created_at" | "updated_at">[]
): Promise<number> {
  if (isDemoMode) return mock.demoCreateAnimalsBulk(inputs);
  const CHUNK_SIZE = 500;
  let inserted = 0;
  for (let i = 0; i < inputs.length; i += CHUNK_SIZE) {
    const chunk = inputs.slice(i, i + CHUNK_SIZE);
    const { error, count } = await supabase!
      .from("animals")
      .upsert(chunk, { onConflict: "ear_tag", ignoreDuplicates: true, count: "exact" });
    if (error) throw error;
    inserted += count ?? 0;
  }
  return inserted;
}

// --- Mastitis treatments ---

export async function listMastitisTreatments(animalId?: string): Promise<MastitisTreatment[]> {
  if (isDemoMode) return mock.demoListMastitisTreatments(animalId);
  return fetchAllPages<MastitisTreatment>((from, to) => {
    let query = supabase!.from("mastitis_treatments").select("*").order("start_date", { ascending: false });
    if (animalId) query = query.eq("animal_id", animalId);
    return query.range(from, to);
  });
}

export async function getMastitisTreatment(id: string): Promise<MastitisTreatment | undefined> {
  if (isDemoMode) return mock.demoGetMastitisTreatment(id);
  const { data, error } = await supabase!.from("mastitis_treatments").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as MastitisTreatment;
}

export async function createMastitisTreatment(
  input: Omit<
    MastitisTreatment,
    "id" | "created_at" | "ended_at" | "withdrawal_cleared_at" | "withdrawal_cleared_by"
  >
): Promise<MastitisTreatment> {
  if (isDemoMode) return mock.demoCreateMastitisTreatment(input);
  const { data, error } = await supabase!.from("mastitis_treatments").insert(input).select().single();
  if (error) throw error;
  const treatment = data as MastitisTreatment;
  const doses = Array.from({ length: input.protocol_days }, (_, i) => ({
    mastitis_treatment_id: treatment.id,
    day_number: i + 1,
  }));
  const { error: doseError } = await supabase!.from("mastitis_doses").insert(doses);
  if (doseError) throw doseError;
  return treatment;
}

export async function listMastitisDoses(treatmentId: string): Promise<MastitisDose[]> {
  if (isDemoMode) return mock.demoListMastitisDoses(treatmentId);
  return fetchAllPages<MastitisDose>((from, to) =>
    supabase!
      .from("mastitis_doses")
      .select("*")
      .eq("mastitis_treatment_id", treatmentId)
      .order("day_number", { ascending: true })
      .range(from, to)
  );
}

export async function completeMastitisDose(
  id: string,
  doneBy: string,
  note: string | null
): Promise<MastitisDose | undefined> {
  if (isDemoMode) return mock.demoCompleteMastitisDose(id, doneBy, note);
  const { data, error } = await supabase!
    .from("mastitis_doses")
    .update({ done: true, done_by: doneBy, done_at: new Date().toISOString(), note })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  const dose = data as MastitisDose;
  const { data: doses } = await supabase!
    .from("mastitis_doses")
    .select("*")
    .eq("mastitis_treatment_id", dose.mastitis_treatment_id);
  if (doses && (doses as MastitisDose[]).every((d) => d.done)) {
    await supabase!
      .from("mastitis_treatments")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", dose.mastitis_treatment_id)
      .is("ended_at", null);
  }
  return dose;
}

export async function reopenMastitisDose(id: string): Promise<MastitisDose | undefined> {
  if (isDemoMode) return mock.demoReopenMastitisDose(id);
  const { data, error } = await supabase!
    .from("mastitis_doses")
    .update({ done: false, done_by: null, done_at: null, note: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MastitisDose;
}

export async function endMastitisTreatment(id: string): Promise<MastitisTreatment | undefined> {
  if (isDemoMode) return mock.demoEndMastitisTreatment(id);
  const { data, error } = await supabase!
    .from("mastitis_treatments")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MastitisTreatment;
}

export async function clearMastitisWithdrawal(
  id: string,
  clearedBy: string
): Promise<MastitisTreatment | undefined> {
  if (isDemoMode) return mock.demoClearMastitisWithdrawal(id, clearedBy);
  const { data, error } = await supabase!
    .from("mastitis_treatments")
    .update({ withdrawal_cleared_at: new Date().toISOString(), withdrawal_cleared_by: clearedBy })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as MastitisTreatment;
}

export async function listMastitisProtocols(): Promise<MastitisProtocol[]> {
  if (isDemoMode) return mock.demoListMastitisProtocols();
  return fetchAllPages<MastitisProtocol>((from, to) =>
    supabase!.from("mastitis_protocols").select("*").order("created_at", { ascending: false }).range(from, to)
  );
}

export async function saveMastitisProtocolIfNew(
  medication: string,
  createdBy: string | null
): Promise<void> {
  if (isDemoMode) return mock.demoSaveMastitisProtocolIfNew(medication, createdBy);
  const { error } = await supabase!
    .from("mastitis_protocols")
    .upsert({ medication, created_by: createdBy }, { onConflict: "medication", ignoreDuplicates: true });
  if (error) throw error;
}

// --- Tasks ---

export async function listTasks(): Promise<Task[]> {
  if (isDemoMode) return mock.demoListTasks();
  return fetchAllPages<Task>((from, to) =>
    supabase!.from("tasks").select("*").order("due_date", { ascending: true }).range(from, to)
  );
}

export async function createTask(input: Omit<Task, "id" | "created_at">): Promise<Task> {
  if (isDemoMode) return mock.demoCreateTask(input);
  const { data, error } = await supabase!.from("tasks").insert(input).select().single();
  if (error) throw error;
  return data as Task;
}

export async function updateTaskStatus(id: string, status: Task["status"]): Promise<Task | undefined> {
  if (isDemoMode) return mock.demoUpdateTaskStatus(id, status);
  const { data, error } = await supabase!.from("tasks").update({ status }).eq("id", id).select().single();
  if (error) throw error;
  return data as Task;
}

export async function completeTask(
  id: string,
  completedBy: string,
  note: string | null
): Promise<Task | undefined> {
  if (isDemoMode) return mock.demoCompleteTask(id, completedBy, note);
  const { data, error } = await supabase!
    .from("tasks")
    .update({
      status: "yapildi",
      completed_by: completedBy,
      completed_at: new Date().toISOString(),
      completion_note: note,
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

export async function reopenTask(id: string): Promise<Task | undefined> {
  if (isDemoMode) return mock.demoReopenTask(id);
  const { data, error } = await supabase!
    .from("tasks")
    .update({ status: "bekliyor", completed_by: null, completed_at: null, completion_note: null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Task;
}

// --- Bulls & semen inventory ---

export async function listBulls(): Promise<Bull[]> {
  if (isDemoMode) return mock.demoListBulls();
  return fetchAllPages<Bull>((from, to) =>
    supabase!.from("bulls").select("*").order("name", { ascending: true }).range(from, to)
  );
}

export async function createBull(input: Omit<Bull, "id" | "created_at">): Promise<Bull> {
  if (isDemoMode) return mock.demoCreateBull(input);
  const { data, error } = await supabase!.from("bulls").insert(input).select().single();
  if (error) throw error;
  return data as Bull;
}

export async function listSemenInventory(): Promise<SemenInventory[]> {
  if (isDemoMode) return mock.demoListSemenInventory();
  return fetchAllPages<SemenInventory>((from, to) =>
    supabase!.from("semen_inventory").select("*").range(from, to)
  );
}

export async function setSemenStock(
  bullId: string,
  semenType: SemenInventory["semen_type"],
  patch: Partial<Omit<SemenInventory, "id" | "bull_id" | "semen_type">>
): Promise<SemenInventory> {
  if (isDemoMode) return mock.demoUpsertSemenInventory(bullId, semenType, patch);
  const { data, error } = await supabase!
    .from("semen_inventory")
    .upsert(
      { bull_id: bullId, semen_type: semenType, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "bull_id,semen_type" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as SemenInventory;
}

async function adjustSemenStock(
  bullId: string,
  semenType: SemenInventory["semen_type"],
  delta: number
): Promise<void> {
  if (isDemoMode) {
    mock.demoAdjustSemenStock(bullId, semenType, delta);
    return;
  }
  const { data: existing } = await supabase!
    .from("semen_inventory")
    .select("*")
    .eq("bull_id", bullId)
    .eq("semen_type", semenType)
    .maybeSingle();
  const nextCount = Math.max(0, (existing?.straw_count ?? 0) + delta);
  await supabase!
    .from("semen_inventory")
    .upsert(
      { bull_id: bullId, semen_type: semenType, straw_count: nextCount, updated_at: new Date().toISOString() },
      { onConflict: "bull_id,semen_type" }
    );
}

// --- Inseminations ---

export async function listInseminations(animalId?: string): Promise<Insemination[]> {
  if (isDemoMode) return mock.demoListInseminations(animalId);
  return fetchAllPages<Insemination>((from, to) => {
    let query = supabase!.from("inseminations").select("*").order("insemination_date", { ascending: false });
    if (animalId) query = query.eq("animal_id", animalId);
    return query.range(from, to);
  });
}

export async function createInsemination(
  input: Omit<Insemination, "id" | "created_at">
): Promise<Insemination> {
  if (isDemoMode) return mock.demoCreateInsemination(input);
  const { data, error } = await supabase!.from("inseminations").insert(input).select().single();
  if (error) throw error;
  if (input.bull_id && input.semen_type) {
    await adjustSemenStock(input.bull_id, input.semen_type, -1);
  }
  return data as Insemination;
}

export async function updateInsemination(
  id: string,
  patch: Partial<Insemination>
): Promise<Insemination | undefined> {
  if (isDemoMode) return mock.demoUpdateInsemination(id, patch);
  const { data, error } = await supabase!.from("inseminations").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Insemination;
}

// --- OPU sessions & embryos ---

export async function listOpuSessions(): Promise<OpuSession[]> {
  if (isDemoMode) return mock.demoListOpuSessions();
  return fetchAllPages<OpuSession>((from, to) =>
    supabase!.from("opu_sessions").select("*").order("session_date", { ascending: false }).range(from, to)
  );
}

export async function getOpuSession(id: string): Promise<OpuSession | undefined> {
  if (isDemoMode) return mock.demoGetOpuSession(id);
  const { data, error } = await supabase!.from("opu_sessions").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as OpuSession;
}

export async function createOpuSession(
  input: Omit<OpuSession, "id" | "created_at" | "updated_at">
): Promise<OpuSession> {
  if (isDemoMode) return mock.demoCreateOpuSession(input);
  const { data, error } = await supabase!.from("opu_sessions").insert(input).select().single();
  if (error) throw error;
  return data as OpuSession;
}

export async function updateOpuSession(
  id: string,
  patch: Partial<OpuSession>
): Promise<OpuSession | undefined> {
  if (isDemoMode) return mock.demoUpdateOpuSession(id, patch);
  const { data, error } = await supabase!.from("opu_sessions").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as OpuSession;
}

export async function listEmbryos(opuSessionId?: string): Promise<Embryo[]> {
  if (isDemoMode) return mock.demoListEmbryos(opuSessionId);
  return fetchAllPages<Embryo>((from, to) => {
    let query = supabase!.from("embryos").select("*").order("label", { ascending: true });
    if (opuSessionId) query = query.eq("opu_session_id", opuSessionId);
    return query.range(from, to);
  });
}

export async function listEmbryosForRecipient(animalId: string): Promise<Embryo[]> {
  if (isDemoMode) return mock.demoListEmbryosForRecipient(animalId);
  return fetchAllPages<Embryo>((from, to) =>
    supabase!.from("embryos").select("*").eq("recipient_animal_id", animalId).range(from, to)
  );
}

export async function getEmbryo(id: string): Promise<Embryo | undefined> {
  if (isDemoMode) return mock.demoGetEmbryo(id);
  const { data, error } = await supabase!.from("embryos").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as Embryo;
}

export async function createEmbryo(
  input: Omit<Embryo, "id" | "created_at" | "updated_at">
): Promise<Embryo> {
  if (isDemoMode) return mock.demoCreateEmbryo(input);
  const { data, error } = await supabase!.from("embryos").insert(input).select().single();
  if (error) throw error;
  return data as Embryo;
}

export async function updateEmbryo(id: string, patch: Partial<Embryo>): Promise<Embryo | undefined> {
  if (isDemoMode) return mock.demoUpdateEmbryo(id, patch);
  const { data, error } = await supabase!.from("embryos").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data as Embryo;
}

// --- Calf feedings ---

export async function listCalfFeedings(animalId?: string): Promise<CalfFeeding[]> {
  if (isDemoMode) return mock.demoListCalfFeedings(animalId);
  return fetchAllPages<CalfFeeding>((from, to) => {
    let query = supabase!.from("calf_feedings").select("*").order("fed_at", { ascending: false });
    if (animalId) query = query.eq("animal_id", animalId);
    return query.range(from, to);
  });
}

export async function createCalfFeeding(
  input: Omit<CalfFeeding, "id" | "created_at" | "exam_result" | "examined_by" | "examined_at">
): Promise<CalfFeeding> {
  if (isDemoMode) return mock.demoCreateCalfFeeding(input);
  const { data, error } = await supabase!.from("calf_feedings").insert(input).select().single();
  if (error) throw error;
  return data as CalfFeeding;
}

export async function setCalfFeedingExam(
  id: string,
  examResult: string,
  examinedBy: string
): Promise<CalfFeeding | undefined> {
  if (isDemoMode) return mock.demoSetCalfFeedingExam(id, examResult, examinedBy);
  const { data, error } = await supabase!
    .from("calf_feedings")
    .update({ exam_result: examResult, examined_by: examinedBy, examined_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as CalfFeeding;
}

// --- Medicines (asi/ilac stok takibi) ---

export async function listMedicines(): Promise<Medicine[]> {
  if (isDemoMode) return mock.demoListMedicines();
  return fetchAllPages<Medicine>((from, to) =>
    supabase!.from("medicines").select("*").order("name", { ascending: true }).range(from, to)
  );
}

export async function createMedicine(
  input: Omit<Medicine, "id" | "created_at" | "updated_at">
): Promise<Medicine> {
  if (isDemoMode) return mock.demoCreateMedicine(input);
  const { data, error } = await supabase!.from("medicines").insert(input).select().single();
  if (error) throw error;
  return data as Medicine;
}

export async function setMedicineStock(
  id: string,
  patch: Partial<Omit<Medicine, "id" | "created_at">>
): Promise<Medicine | undefined> {
  if (isDemoMode) return mock.demoUpdateMedicine(id, patch);
  const { data, error } = await supabase!
    .from("medicines")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Medicine;
}

export async function adjustMedicineStock(id: string, delta: number): Promise<Medicine | undefined> {
  if (isDemoMode) return mock.demoAdjustMedicineStock(id, delta);
  const { data: existing } = await supabase!.from("medicines").select("*").eq("id", id).maybeSingle();
  const nextCount = Math.max(0, (existing?.stock_count ?? 0) + delta);
  const { data, error } = await supabase!
    .from("medicines")
    .update({ stock_count: nextCount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Medicine;
}
