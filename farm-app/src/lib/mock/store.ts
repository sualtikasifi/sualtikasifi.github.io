import { Animal, Profile, Task, Treatment } from "@/lib/types";
import { DEMO_USER_ID, seedAnimals, seedProfiles, seedTasks, seedTreatments } from "./seed";

const STORAGE_KEY = "farm_app_demo_db_v1";
const SESSION_KEY = "farm_app_demo_session_v1";

interface DemoDb {
  profiles: Profile[];
  animals: Animal[];
  treatments: Treatment[];
  tasks: Task[];
}

function loadDb(): DemoDb {
  if (typeof window === "undefined") {
    return { profiles: seedProfiles, animals: seedAnimals, treatments: seedTreatments, tasks: seedTasks };
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial: DemoDb = {
      profiles: seedProfiles,
      animals: seedAnimals,
      treatments: seedTreatments,
      tasks: seedTasks,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  return JSON.parse(raw) as DemoDb;
}

function saveDb(db: DemoDb) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function newId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

// --- Auth (demo) ---

export function demoSignIn(): Profile {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SESSION_KEY, DEMO_USER_ID);
  }
  return loadDb().profiles.find((p) => p.id === DEMO_USER_ID)!;
}

export function demoSignOut() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(SESSION_KEY);
  }
}

export function demoCurrentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SESSION_KEY);
}

// --- Profiles ---

export function demoListProfiles(): Profile[] {
  return loadDb().profiles;
}

// --- Animals ---

export function demoListAnimals(): Animal[] {
  return loadDb().animals.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoGetAnimal(id: string): Animal | undefined {
  return loadDb().animals.find((a) => a.id === id);
}

export function demoCreateAnimal(input: Omit<Animal, "id" | "created_at" | "updated_at">): Animal {
  const db = loadDb();
  const now = new Date().toISOString();
  const animal: Animal = { ...input, id: newId("animal"), created_at: now, updated_at: now };
  db.animals.push(animal);
  saveDb(db);
  return animal;
}

export function demoUpdateAnimal(id: string, patch: Partial<Animal>): Animal | undefined {
  const db = loadDb();
  const idx = db.animals.findIndex((a) => a.id === id);
  if (idx === -1) return undefined;
  db.animals[idx] = { ...db.animals[idx], ...patch, updated_at: new Date().toISOString() };
  saveDb(db);
  return db.animals[idx];
}

// --- Treatments ---

export function demoListTreatments(animalId?: string): Treatment[] {
  const all = loadDb().treatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  return animalId ? all.filter((t) => t.animal_id === animalId) : all;
}

export function demoCreateTreatment(input: Omit<Treatment, "id" | "created_at">): Treatment {
  const db = loadDb();
  const treatment: Treatment = { ...input, id: newId("treat"), created_at: new Date().toISOString() };
  db.treatments.push(treatment);
  saveDb(db);
  return treatment;
}

// --- Tasks ---

export function demoListTasks(): Task[] {
  return loadDb().tasks.sort((a, b) => a.due_date.localeCompare(b.due_date));
}

export function demoCreateTask(input: Omit<Task, "id" | "created_at">): Task {
  const db = loadDb();
  const task: Task = { ...input, id: newId("task"), created_at: new Date().toISOString() };
  db.tasks.push(task);
  saveDb(db);
  return task;
}

export function demoUpdateTaskStatus(id: string, status: Task["status"]): Task | undefined {
  const db = loadDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.tasks[idx] = { ...db.tasks[idx], status };
  saveDb(db);
  return db.tasks[idx];
}
