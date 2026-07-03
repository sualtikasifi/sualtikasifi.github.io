import { Animal, Bull, Embryo, Insemination, OpuSession, Profile, SemenInventory, Task, Treatment } from "@/lib/types";
import {
  DEMO_USER_ID,
  seedAnimals,
  seedBulls,
  seedEmbryos,
  seedInseminations,
  seedOpuSessions,
  seedProfiles,
  seedSemenInventory,
  seedTasks,
  seedTreatments,
} from "./seed";

const STORAGE_KEY = "farm_app_demo_db_v1";
const SESSION_KEY = "farm_app_demo_session_v1";

interface DemoDb {
  profiles: Profile[];
  animals: Animal[];
  treatments: Treatment[];
  tasks: Task[];
  bulls: Bull[];
  semenInventory: SemenInventory[];
  inseminations: Insemination[];
  opuSessions: OpuSession[];
  embryos: Embryo[];
}

function initialDb(): DemoDb {
  return {
    profiles: seedProfiles,
    animals: seedAnimals,
    treatments: seedTreatments,
    tasks: seedTasks,
    bulls: seedBulls,
    semenInventory: seedSemenInventory,
    inseminations: seedInseminations,
    opuSessions: seedOpuSessions,
    embryos: seedEmbryos,
  };
}

function loadDb(): DemoDb {
  if (typeof window === "undefined") {
    return initialDb();
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = initialDb();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  const parsed = JSON.parse(raw) as Partial<DemoDb>;
  return {
    profiles: parsed.profiles ?? seedProfiles,
    animals: parsed.animals ?? seedAnimals,
    treatments: parsed.treatments ?? seedTreatments,
    tasks: parsed.tasks ?? seedTasks,
    bulls: parsed.bulls ?? seedBulls,
    semenInventory: parsed.semenInventory ?? seedSemenInventory,
    inseminations: parsed.inseminations ?? seedInseminations,
    opuSessions: parsed.opuSessions ?? seedOpuSessions,
    embryos: parsed.embryos ?? seedEmbryos,
  };
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

// --- Bulls & semen inventory ---

export function demoListBulls(): Bull[] {
  return loadDb().bulls.sort((a, b) => a.name.localeCompare(b.name));
}

export function demoCreateBull(input: Omit<Bull, "id" | "created_at">): Bull {
  const db = loadDb();
  const bull: Bull = { ...input, id: newId("bull"), created_at: new Date().toISOString() };
  db.bulls.push(bull);
  saveDb(db);
  return bull;
}

export function demoListSemenInventory(): SemenInventory[] {
  return loadDb().semenInventory;
}

export function demoGetSemenInventoryForBull(bullId: string): SemenInventory | undefined {
  return loadDb().semenInventory.find((s) => s.bull_id === bullId);
}

export function demoUpsertSemenInventory(
  bullId: string,
  patch: Partial<Omit<SemenInventory, "id" | "bull_id">>
): SemenInventory {
  const db = loadDb();
  const idx = db.semenInventory.findIndex((s) => s.bull_id === bullId);
  const now = new Date().toISOString();
  if (idx === -1) {
    const created: SemenInventory = {
      id: newId("semen"),
      bull_id: bullId,
      straw_count: 0,
      tank_location: null,
      notes: null,
      ...patch,
      updated_at: now,
    };
    db.semenInventory.push(created);
    saveDb(db);
    return created;
  }
  db.semenInventory[idx] = { ...db.semenInventory[idx], ...patch, updated_at: now };
  saveDb(db);
  return db.semenInventory[idx];
}

export function demoAdjustSemenStock(bullId: string, delta: number): SemenInventory {
  const db = loadDb();
  const idx = db.semenInventory.findIndex((s) => s.bull_id === bullId);
  const now = new Date().toISOString();
  if (idx === -1) {
    const created: SemenInventory = {
      id: newId("semen"),
      bull_id: bullId,
      straw_count: Math.max(0, delta),
      tank_location: null,
      notes: null,
      updated_at: now,
    };
    db.semenInventory.push(created);
    saveDb(db);
    return created;
  }
  db.semenInventory[idx] = {
    ...db.semenInventory[idx],
    straw_count: Math.max(0, db.semenInventory[idx].straw_count + delta),
    updated_at: now,
  };
  saveDb(db);
  return db.semenInventory[idx];
}

// --- Inseminations ---

export function demoListInseminations(animalId?: string): Insemination[] {
  const all = loadDb().inseminations.sort((a, b) => b.insemination_date.localeCompare(a.insemination_date));
  return animalId ? all.filter((i) => i.animal_id === animalId) : all;
}

export function demoCreateInsemination(input: Omit<Insemination, "id" | "created_at">): Insemination {
  const db = loadDb();
  const insemination: Insemination = { ...input, id: newId("insem"), created_at: new Date().toISOString() };
  db.inseminations.push(insemination);
  saveDb(db);
  if (input.bull_id) {
    demoAdjustSemenStock(input.bull_id, -1);
  }
  return insemination;
}

export function demoUpdateInsemination(id: string, patch: Partial<Insemination>): Insemination | undefined {
  const db = loadDb();
  const idx = db.inseminations.findIndex((i) => i.id === id);
  if (idx === -1) return undefined;
  db.inseminations[idx] = { ...db.inseminations[idx], ...patch };
  saveDb(db);
  return db.inseminations[idx];
}

// --- OPU sessions & embryos ---

export function demoListOpuSessions(): OpuSession[] {
  return loadDb().opuSessions.sort((a, b) => b.session_date.localeCompare(a.session_date));
}

export function demoGetOpuSession(id: string): OpuSession | undefined {
  return loadDb().opuSessions.find((s) => s.id === id);
}

export function demoCreateOpuSession(input: Omit<OpuSession, "id" | "created_at">): OpuSession {
  const db = loadDb();
  const session: OpuSession = { ...input, id: newId("opu"), created_at: new Date().toISOString() };
  db.opuSessions.push(session);
  saveDb(db);
  return session;
}

export function demoListEmbryos(opuSessionId?: string): Embryo[] {
  const all = loadDb().embryos.sort((a, b) => a.label.localeCompare(b.label));
  return opuSessionId ? all.filter((e) => e.opu_session_id === opuSessionId) : all;
}

export function demoListEmbryosForRecipient(animalId: string): Embryo[] {
  return loadDb().embryos.filter((e) => e.recipient_animal_id === animalId);
}

export function demoGetEmbryo(id: string): Embryo | undefined {
  return loadDb().embryos.find((e) => e.id === id);
}

export function demoCreateEmbryo(input: Omit<Embryo, "id" | "created_at" | "updated_at">): Embryo {
  const db = loadDb();
  const now = new Date().toISOString();
  const embryo: Embryo = { ...input, id: newId("embryo"), created_at: now, updated_at: now };
  db.embryos.push(embryo);
  saveDb(db);
  return embryo;
}

export function demoUpdateEmbryo(id: string, patch: Partial<Embryo>): Embryo | undefined {
  const db = loadDb();
  const idx = db.embryos.findIndex((e) => e.id === id);
  if (idx === -1) return undefined;
  db.embryos[idx] = { ...db.embryos[idx], ...patch, updated_at: new Date().toISOString() };
  saveDb(db);
  return db.embryos[idx];
}
