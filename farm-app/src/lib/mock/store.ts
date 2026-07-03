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
} from "@/lib/types";
import {
  DEMO_USER_ID,
  seedAnimals,
  seedBulls,
  seedCalfFeedings,
  seedEmbryos,
  seedInseminations,
  seedMastitisDoses,
  seedMastitisProtocols,
  seedMastitisTreatments,
  seedMedicines,
  seedOpuSessions,
  seedProfiles,
  seedSemenInventory,
  seedTasks,
} from "./seed";

const STORAGE_KEY = "farm_app_demo_db_v1";
const SESSION_KEY = "farm_app_demo_session_v1";

interface DemoDb {
  profiles: Profile[];
  animals: Animal[];
  mastitisTreatments: MastitisTreatment[];
  mastitisDoses: MastitisDose[];
  mastitisProtocols: MastitisProtocol[];
  tasks: Task[];
  bulls: Bull[];
  semenInventory: SemenInventory[];
  inseminations: Insemination[];
  opuSessions: OpuSession[];
  embryos: Embryo[];
  calfFeedings: CalfFeeding[];
  medicines: Medicine[];
}

function initialDb(): DemoDb {
  return {
    profiles: seedProfiles,
    animals: seedAnimals,
    mastitisTreatments: seedMastitisTreatments,
    mastitisDoses: seedMastitisDoses,
    mastitisProtocols: seedMastitisProtocols,
    tasks: seedTasks,
    bulls: seedBulls,
    semenInventory: seedSemenInventory,
    inseminations: seedInseminations,
    opuSessions: seedOpuSessions,
    embryos: seedEmbryos,
    calfFeedings: seedCalfFeedings,
    medicines: seedMedicines,
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
    mastitisTreatments: parsed.mastitisTreatments ?? seedMastitisTreatments,
    mastitisDoses: parsed.mastitisDoses ?? seedMastitisDoses,
    mastitisProtocols: parsed.mastitisProtocols ?? seedMastitisProtocols,
    tasks: parsed.tasks ?? seedTasks,
    bulls: parsed.bulls ?? seedBulls,
    semenInventory: parsed.semenInventory ?? seedSemenInventory,
    inseminations: parsed.inseminations ?? seedInseminations,
    opuSessions: parsed.opuSessions ?? seedOpuSessions,
    embryos: parsed.embryos ?? seedEmbryos,
    calfFeedings: parsed.calfFeedings ?? seedCalfFeedings,
    medicines: parsed.medicines ?? seedMedicines,
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

export function demoUpdateProfile(id: string, patch: Partial<Profile>): Profile | undefined {
  const db = loadDb();
  const idx = db.profiles.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  db.profiles[idx] = { ...db.profiles[idx], ...patch };
  saveDb(db);
  return db.profiles[idx];
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

export function demoCreateAnimalsBulk(inputs: Omit<Animal, "id" | "created_at" | "updated_at">[]): number {
  const db = loadDb();
  const existingTags = new Set(db.animals.map((a) => a.ear_tag));
  let inserted = 0;
  for (const input of inputs) {
    if (existingTags.has(input.ear_tag)) continue;
    const now = new Date().toISOString();
    db.animals.push({ ...input, id: newId("animal"), created_at: now, updated_at: now });
    existingTags.add(input.ear_tag);
    inserted++;
  }
  saveDb(db);
  return inserted;
}

// --- Mastitis treatments ---

export function demoListMastitisTreatments(animalId?: string): MastitisTreatment[] {
  const all = loadDb().mastitisTreatments.sort((a, b) => b.start_date.localeCompare(a.start_date));
  return animalId ? all.filter((t) => t.animal_id === animalId) : all;
}

export function demoGetMastitisTreatment(id: string): MastitisTreatment | undefined {
  return loadDb().mastitisTreatments.find((t) => t.id === id);
}

export function demoCreateMastitisTreatment(
  input: Omit<
    MastitisTreatment,
    "id" | "created_at" | "ended_at" | "withdrawal_cleared_at" | "withdrawal_cleared_by"
  >
): MastitisTreatment {
  const db = loadDb();
  const treatment: MastitisTreatment = {
    ...input,
    id: newId("mastitis"),
    ended_at: null,
    withdrawal_cleared_at: null,
    withdrawal_cleared_by: null,
    created_at: new Date().toISOString(),
  };
  db.mastitisTreatments.push(treatment);
  for (let day = 1; day <= input.protocol_days; day++) {
    db.mastitisDoses.push({
      id: newId("dose"),
      mastitis_treatment_id: treatment.id,
      day_number: day,
      done: false,
      done_by: null,
      done_at: null,
      note: null,
    });
  }
  saveDb(db);
  return treatment;
}

export function demoUpdateMastitisTreatment(
  id: string,
  patch: Partial<Omit<MastitisTreatment, "id" | "created_at">>
): MastitisTreatment | undefined {
  const db = loadDb();
  const idx = db.mastitisTreatments.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.mastitisTreatments[idx] = { ...db.mastitisTreatments[idx], ...patch };
  saveDb(db);
  return db.mastitisTreatments[idx];
}

export function demoDeleteMastitisTreatment(id: string): void {
  const db = loadDb();
  db.mastitisTreatments = db.mastitisTreatments.filter((t) => t.id !== id);
  db.mastitisDoses = db.mastitisDoses.filter((d) => d.mastitis_treatment_id !== id);
  saveDb(db);
}

export function demoListMastitisDoses(treatmentId: string): MastitisDose[] {
  return loadDb()
    .mastitisDoses.filter((d) => d.mastitis_treatment_id === treatmentId)
    .sort((a, b) => a.day_number - b.day_number);
}

export function demoListAllMastitisDoses(): MastitisDose[] {
  return loadDb().mastitisDoses;
}

export function demoCompleteMastitisDose(
  doseId: string,
  doneBy: string,
  note: string | null
): MastitisDose | undefined {
  const db = loadDb();
  const idx = db.mastitisDoses.findIndex((d) => d.id === doseId);
  if (idx === -1) return undefined;
  db.mastitisDoses[idx] = {
    ...db.mastitisDoses[idx],
    done: true,
    done_by: doneBy,
    done_at: new Date().toISOString(),
    note,
  };
  const treatmentIdx = db.mastitisTreatments.findIndex(
    (t) => t.id === db.mastitisDoses[idx].mastitis_treatment_id
  );
  if (treatmentIdx !== -1 && !db.mastitisTreatments[treatmentIdx].ended_at) {
    const doses = db.mastitisDoses.filter(
      (d) => d.mastitis_treatment_id === db.mastitisTreatments[treatmentIdx].id
    );
    if (doses.every((d) => d.done)) {
      db.mastitisTreatments[treatmentIdx] = {
        ...db.mastitisTreatments[treatmentIdx],
        ended_at: new Date().toISOString(),
      };
    }
  }
  saveDb(db);
  return db.mastitisDoses[idx];
}

export function demoReopenMastitisDose(doseId: string): MastitisDose | undefined {
  const db = loadDb();
  const idx = db.mastitisDoses.findIndex((d) => d.id === doseId);
  if (idx === -1) return undefined;
  db.mastitisDoses[idx] = { ...db.mastitisDoses[idx], done: false, done_by: null, done_at: null, note: null };
  saveDb(db);
  return db.mastitisDoses[idx];
}

export function demoEndMastitisTreatment(id: string): MastitisTreatment | undefined {
  const db = loadDb();
  const idx = db.mastitisTreatments.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.mastitisTreatments[idx] = { ...db.mastitisTreatments[idx], ended_at: new Date().toISOString() };
  saveDb(db);
  return db.mastitisTreatments[idx];
}

export function demoClearMastitisWithdrawal(id: string, clearedBy: string): MastitisTreatment | undefined {
  const db = loadDb();
  const idx = db.mastitisTreatments.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.mastitisTreatments[idx] = {
    ...db.mastitisTreatments[idx],
    withdrawal_cleared_at: new Date().toISOString(),
    withdrawal_cleared_by: clearedBy,
  };
  saveDb(db);
  return db.mastitisTreatments[idx];
}

export function demoListMastitisProtocols(): MastitisProtocol[] {
  return loadDb().mastitisProtocols.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoSaveMastitisProtocolIfNew(medication: string, createdBy: string | null): void {
  const db = loadDb();
  const exists = db.mastitisProtocols.some(
    (p) => p.medication.trim().toLowerCase() === medication.trim().toLowerCase()
  );
  if (exists) return;
  db.mastitisProtocols.push({
    id: newId("protocol"),
    medication,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  });
  saveDb(db);
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

export function demoCompleteTask(id: string, completedBy: string, note: string | null): Task | undefined {
  const db = loadDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.tasks[idx] = {
    ...db.tasks[idx],
    status: "yapildi",
    completed_by: completedBy,
    completed_at: new Date().toISOString(),
    completion_note: note,
  };
  saveDb(db);
  return db.tasks[idx];
}

export function demoReopenTask(id: string): Task | undefined {
  const db = loadDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.tasks[idx] = {
    ...db.tasks[idx],
    status: "bekliyor",
    completed_by: null,
    completed_at: null,
    completion_note: null,
  };
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

export function demoListSemenInventoryForBull(bullId: string): SemenInventory[] {
  return loadDb().semenInventory.filter((s) => s.bull_id === bullId);
}

export function demoUpsertSemenInventory(
  bullId: string,
  semenType: SemenInventory["semen_type"],
  patch: Partial<Omit<SemenInventory, "id" | "bull_id" | "semen_type">>
): SemenInventory {
  const db = loadDb();
  const idx = db.semenInventory.findIndex((s) => s.bull_id === bullId && s.semen_type === semenType);
  const now = new Date().toISOString();
  if (idx === -1) {
    const created: SemenInventory = {
      id: newId("semen"),
      bull_id: bullId,
      semen_type: semenType,
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

export function demoAdjustSemenStock(
  bullId: string,
  semenType: SemenInventory["semen_type"],
  delta: number
): SemenInventory {
  const db = loadDb();
  const idx = db.semenInventory.findIndex((s) => s.bull_id === bullId && s.semen_type === semenType);
  const now = new Date().toISOString();
  if (idx === -1) {
    const created: SemenInventory = {
      id: newId("semen"),
      bull_id: bullId,
      semen_type: semenType,
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
  if (input.bull_id && input.semen_type) {
    demoAdjustSemenStock(input.bull_id, input.semen_type, -1);
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

export function demoDeleteInsemination(id: string): void {
  const db = loadDb();
  db.inseminations = db.inseminations.filter((i) => i.id !== id);
  saveDb(db);
}

// --- OPU sessions & embryos ---

export function demoListOpuSessions(): OpuSession[] {
  return loadDb().opuSessions.sort((a, b) => b.session_date.localeCompare(a.session_date));
}

export function demoGetOpuSession(id: string): OpuSession | undefined {
  return loadDb().opuSessions.find((s) => s.id === id);
}

export function demoCreateOpuSession(
  input: Omit<OpuSession, "id" | "created_at" | "updated_at">
): OpuSession {
  const db = loadDb();
  const now = new Date().toISOString();
  const session: OpuSession = { ...input, id: newId("opu"), created_at: now, updated_at: now };
  db.opuSessions.push(session);
  saveDb(db);
  return session;
}

export function demoUpdateOpuSession(id: string, patch: Partial<OpuSession>): OpuSession | undefined {
  const db = loadDb();
  const idx = db.opuSessions.findIndex((s) => s.id === id);
  if (idx === -1) return undefined;
  db.opuSessions[idx] = { ...db.opuSessions[idx], ...patch, updated_at: new Date().toISOString() };
  saveDb(db);
  return db.opuSessions[idx];
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

// --- Calf feedings ---

export function demoListCalfFeedings(animalId?: string): CalfFeeding[] {
  const all = loadDb().calfFeedings.sort((a, b) => b.fed_at.localeCompare(a.fed_at));
  return animalId ? all.filter((f) => f.animal_id === animalId) : all;
}

export function demoCreateCalfFeeding(
  input: Omit<CalfFeeding, "id" | "created_at" | "exam_result" | "examined_by" | "examined_at">
): CalfFeeding {
  const db = loadDb();
  const feeding: CalfFeeding = {
    ...input,
    id: newId("feed"),
    exam_result: null,
    examined_by: null,
    examined_at: null,
    created_at: new Date().toISOString(),
  };
  db.calfFeedings.push(feeding);
  saveDb(db);
  return feeding;
}

export function demoSetCalfFeedingExam(
  id: string,
  examResult: string,
  examinedBy: string
): CalfFeeding | undefined {
  const db = loadDb();
  const idx = db.calfFeedings.findIndex((f) => f.id === id);
  if (idx === -1) return undefined;
  db.calfFeedings[idx] = {
    ...db.calfFeedings[idx],
    exam_result: examResult,
    examined_by: examinedBy,
    examined_at: new Date().toISOString(),
  };
  saveDb(db);
  return db.calfFeedings[idx];
}

// --- Medicines (asi/ilac stok takibi) ---

export function demoListMedicines(): Medicine[] {
  return loadDb().medicines.sort((a, b) => a.name.localeCompare(b.name));
}

export function demoCreateMedicine(input: Omit<Medicine, "id" | "created_at" | "updated_at">): Medicine {
  const db = loadDb();
  const now = new Date().toISOString();
  const medicine: Medicine = { ...input, id: newId("medicine"), created_at: now, updated_at: now };
  db.medicines.push(medicine);
  saveDb(db);
  return medicine;
}

export function demoUpdateMedicine(id: string, patch: Partial<Medicine>): Medicine | undefined {
  const db = loadDb();
  const idx = db.medicines.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  db.medicines[idx] = { ...db.medicines[idx], ...patch, updated_at: new Date().toISOString() };
  saveDb(db);
  return db.medicines[idx];
}

export function demoAdjustMedicineStock(id: string, delta: number): Medicine | undefined {
  const db = loadDb();
  const idx = db.medicines.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  db.medicines[idx] = {
    ...db.medicines[idx],
    stock_count: Math.max(0, db.medicines[idx].stock_count + delta),
    updated_at: new Date().toISOString(),
  };
  saveDb(db);
  return db.medicines[idx];
}
