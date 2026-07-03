import { isDemoMode, supabase } from "./supabaseClient";
import * as mock from "./mock/store";
import { Animal, Bull, Embryo, Insemination, OpuSession, Profile, SemenInventory, Task, Treatment } from "./types";

export { isDemoMode };

// --- Profiles ---

export async function listProfiles(): Promise<Profile[]> {
  if (isDemoMode) return mock.demoListProfiles();
  const { data, error } = await supabase!.from("profiles").select("*");
  if (error) throw error;
  return data as Profile[];
}

// --- Animals ---

export async function listAnimals(): Promise<Animal[]> {
  if (isDemoMode) return mock.demoListAnimals();
  const { data, error } = await supabase!
    .from("animals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Animal[];
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

// --- Treatments ---

export async function listTreatments(animalId?: string): Promise<Treatment[]> {
  if (isDemoMode) return mock.demoListTreatments(animalId);
  let query = supabase!.from("treatments").select("*").order("treatment_date", { ascending: false });
  if (animalId) query = query.eq("animal_id", animalId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Treatment[];
}

export async function createTreatment(input: Omit<Treatment, "id" | "created_at">): Promise<Treatment> {
  if (isDemoMode) return mock.demoCreateTreatment(input);
  const { data, error } = await supabase!.from("treatments").insert(input).select().single();
  if (error) throw error;
  return data as Treatment;
}

// --- Tasks ---

export async function listTasks(): Promise<Task[]> {
  if (isDemoMode) return mock.demoListTasks();
  const { data, error } = await supabase!.from("tasks").select("*").order("due_date", { ascending: true });
  if (error) throw error;
  return data as Task[];
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

// --- Bulls & semen inventory ---

export async function listBulls(): Promise<Bull[]> {
  if (isDemoMode) return mock.demoListBulls();
  const { data, error } = await supabase!.from("bulls").select("*").order("name", { ascending: true });
  if (error) throw error;
  return data as Bull[];
}

export async function createBull(input: Omit<Bull, "id" | "created_at">): Promise<Bull> {
  if (isDemoMode) return mock.demoCreateBull(input);
  const { data, error } = await supabase!.from("bulls").insert(input).select().single();
  if (error) throw error;
  return data as Bull;
}

export async function listSemenInventory(): Promise<SemenInventory[]> {
  if (isDemoMode) return mock.demoListSemenInventory();
  const { data, error } = await supabase!.from("semen_inventory").select("*");
  if (error) throw error;
  return data as SemenInventory[];
}

export async function setSemenStock(
  bullId: string,
  patch: Partial<Omit<SemenInventory, "id" | "bull_id">>
): Promise<SemenInventory> {
  if (isDemoMode) return mock.demoUpsertSemenInventory(bullId, patch);
  const { data, error } = await supabase!
    .from("semen_inventory")
    .upsert({ bull_id: bullId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "bull_id" })
    .select()
    .single();
  if (error) throw error;
  return data as SemenInventory;
}

async function adjustSemenStock(bullId: string, delta: number): Promise<void> {
  if (isDemoMode) {
    mock.demoAdjustSemenStock(bullId, delta);
    return;
  }
  const { data: existing } = await supabase!
    .from("semen_inventory")
    .select("*")
    .eq("bull_id", bullId)
    .maybeSingle();
  const nextCount = Math.max(0, (existing?.straw_count ?? 0) + delta);
  await supabase!
    .from("semen_inventory")
    .upsert(
      { bull_id: bullId, straw_count: nextCount, updated_at: new Date().toISOString() },
      { onConflict: "bull_id" }
    );
}

// --- Inseminations ---

export async function listInseminations(animalId?: string): Promise<Insemination[]> {
  if (isDemoMode) return mock.demoListInseminations(animalId);
  let query = supabase!.from("inseminations").select("*").order("insemination_date", { ascending: false });
  if (animalId) query = query.eq("animal_id", animalId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Insemination[];
}

export async function createInsemination(
  input: Omit<Insemination, "id" | "created_at">
): Promise<Insemination> {
  if (isDemoMode) return mock.demoCreateInsemination(input);
  const { data, error } = await supabase!.from("inseminations").insert(input).select().single();
  if (error) throw error;
  if (input.bull_id) {
    await adjustSemenStock(input.bull_id, -1);
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
  const { data, error } = await supabase!
    .from("opu_sessions")
    .select("*")
    .order("session_date", { ascending: false });
  if (error) throw error;
  return data as OpuSession[];
}

export async function getOpuSession(id: string): Promise<OpuSession | undefined> {
  if (isDemoMode) return mock.demoGetOpuSession(id);
  const { data, error } = await supabase!.from("opu_sessions").select("*").eq("id", id).single();
  if (error) return undefined;
  return data as OpuSession;
}

export async function createOpuSession(
  input: Omit<OpuSession, "id" | "created_at">
): Promise<OpuSession> {
  if (isDemoMode) return mock.demoCreateOpuSession(input);
  const { data, error } = await supabase!.from("opu_sessions").insert(input).select().single();
  if (error) throw error;
  return data as OpuSession;
}

export async function listEmbryos(opuSessionId?: string): Promise<Embryo[]> {
  if (isDemoMode) return mock.demoListEmbryos(opuSessionId);
  let query = supabase!.from("embryos").select("*").order("label", { ascending: true });
  if (opuSessionId) query = query.eq("opu_session_id", opuSessionId);
  const { data, error } = await query;
  if (error) throw error;
  return data as Embryo[];
}

export async function listEmbryosForRecipient(animalId: string): Promise<Embryo[]> {
  if (isDemoMode) return mock.demoListEmbryosForRecipient(animalId);
  const { data, error } = await supabase!.from("embryos").select("*").eq("recipient_animal_id", animalId);
  if (error) throw error;
  return data as Embryo[];
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
