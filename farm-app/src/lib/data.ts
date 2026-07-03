import { isDemoMode, supabase } from "./supabaseClient";
import * as mock from "./mock/store";
import { Animal, Profile, Task, Treatment } from "./types";

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
