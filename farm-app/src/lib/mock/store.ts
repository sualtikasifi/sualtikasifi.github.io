import {
  Animal,
  Bull,
  CalfBirthRecord,
  CalfFeeding,
  CalfHousingSlot,
  CalfHousingStructure,
  CalfMeal,
  CalfMealHour,
  CalfNote,
  CalfPectolitCourse,
  CalfProtocol,
  CalfProtocolDay,
  CalfTreatment,
  CalfTreatmentCourse,
  CalfTreatmentStatus,
  CourseStatus,
  Embryo,
  Insemination,
  LeaveRequest,
  MastitisDose,
  MastitisProtocol,
  MastitisTreatment,
  Medicine,
  OpuBatch,
  OpuSession,
  PlannedEmbryoTransfer,
  Profile,
  PushSubscriptionRecord,
  SemenInventory,
  ShiftNote,
  Task,
  TaskAnimal,
  VaccinationPlan,
} from "@/lib/types";
import { todayIso } from "../format";
import {
  DEMO_USER_ID,
  seedAnimals,
  seedBulls,
  seedCalfFeedings,
  seedCalfHousingSlots,
  seedCalfProtocolDays,
  seedCalfProtocols,
  seedCalfTreatmentStatuses,
  seedEmbryos,
  seedInseminations,
  seedLeaveRequests,
  seedMastitisDoses,
  seedMastitisProtocols,
  seedMastitisTreatments,
  seedMedicines,
  seedOpuBatches,
  seedOpuSessions,
  seedProfiles,
  seedSemenInventory,
  seedTaskAnimals,
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
  taskAnimals: TaskAnimal[];
  bulls: Bull[];
  semenInventory: SemenInventory[];
  inseminations: Insemination[];
  opuBatches: OpuBatch[];
  opuSessions: OpuSession[];
  embryos: Embryo[];
  plannedEmbryoTransfers: PlannedEmbryoTransfer[];
  calfFeedings: CalfFeeding[];
  medicines: Medicine[];
  shiftNotes: ShiftNote[];
  calfNotes: CalfNote[];
  calfHousingSlots: CalfHousingSlot[];
  calfTreatmentStatuses: CalfTreatmentStatus[];
  calfTreatments: CalfTreatment[];
  calfMeals: CalfMeal[];
  calfProtocols: CalfProtocol[];
  calfProtocolDays: CalfProtocolDay[];
  calfTreatmentCourses: CalfTreatmentCourse[];
  calfBirthRecords: CalfBirthRecord[];
  calfPectolitCourses: CalfPectolitCourse[];
  vaccinationPlans: VaccinationPlan[];
  pushSubscriptions: PushSubscriptionRecord[];
  leaveRequests: LeaveRequest[];
}

function initialDb(): DemoDb {
  return {
    profiles: seedProfiles,
    animals: seedAnimals,
    mastitisTreatments: seedMastitisTreatments,
    mastitisDoses: seedMastitisDoses,
    mastitisProtocols: seedMastitisProtocols,
    tasks: seedTasks,
    taskAnimals: seedTaskAnimals,
    bulls: seedBulls,
    semenInventory: seedSemenInventory,
    inseminations: seedInseminations,
    opuBatches: seedOpuBatches,
    opuSessions: seedOpuSessions,
    embryos: seedEmbryos,
    plannedEmbryoTransfers: [],
    calfFeedings: seedCalfFeedings,
    medicines: seedMedicines,
    shiftNotes: [],
    calfNotes: [],
    calfHousingSlots: seedCalfHousingSlots,
    calfTreatmentStatuses: seedCalfTreatmentStatuses,
    calfTreatments: [],
    calfMeals: [],
    calfProtocols: seedCalfProtocols,
    calfProtocolDays: seedCalfProtocolDays,
    calfTreatmentCourses: [],
    calfBirthRecords: [],
    calfPectolitCourses: [],
    vaccinationPlans: [],
    pushSubscriptions: [],
    leaveRequests: seedLeaveRequests,
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
    taskAnimals: parsed.taskAnimals ?? seedTaskAnimals,
    bulls: parsed.bulls ?? seedBulls,
    semenInventory: parsed.semenInventory ?? seedSemenInventory,
    inseminations: parsed.inseminations ?? seedInseminations,
    opuBatches: parsed.opuBatches ?? seedOpuBatches,
    opuSessions: parsed.opuSessions ?? seedOpuSessions,
    embryos: parsed.embryos ?? seedEmbryos,
    plannedEmbryoTransfers: parsed.plannedEmbryoTransfers ?? [],
    calfFeedings: parsed.calfFeedings ?? seedCalfFeedings,
    medicines: parsed.medicines ?? seedMedicines,
    shiftNotes: parsed.shiftNotes ?? [],
    calfNotes: parsed.calfNotes ?? [],
    calfHousingSlots: parsed.calfHousingSlots ?? seedCalfHousingSlots,
    calfTreatmentStatuses: parsed.calfTreatmentStatuses ?? seedCalfTreatmentStatuses,
    calfTreatments: parsed.calfTreatments ?? [],
    calfMeals: parsed.calfMeals ?? [],
    calfProtocols: parsed.calfProtocols ?? seedCalfProtocols,
    calfProtocolDays: parsed.calfProtocolDays ?? seedCalfProtocolDays,
    calfTreatmentCourses: parsed.calfTreatmentCourses ?? [],
    calfBirthRecords: parsed.calfBirthRecords ?? [],
    calfPectolitCourses: parsed.calfPectolitCourses ?? [],
    vaccinationPlans: parsed.vaccinationPlans ?? [],
    pushSubscriptions: parsed.pushSubscriptions ?? [],
    leaveRequests: parsed.leaveRequests ?? seedLeaveRequests,
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

export function demoCompleteTask(
  id: string,
  completedBy: string,
  note: string | null,
  completionImageUrl: string | null = null
): Task | undefined {
  const db = loadDb();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return undefined;
  db.tasks[idx] = {
    ...db.tasks[idx],
    status: "yapildi",
    completed_by: completedBy,
    completed_at: new Date().toISOString(),
    completion_note: note,
    completion_image_url: completionImageUrl,
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
    completion_image_url: null,
  };
  saveDb(db);
  return db.tasks[idx];
}

// --- Gorev hayvan kontrol listesi ---

export function demoListTaskAnimals(taskId: string): TaskAnimal[] {
  return loadDb().taskAnimals.filter((ta) => ta.task_id === taskId);
}

export function demoListAllTaskAnimals(): TaskAnimal[] {
  return loadDb().taskAnimals;
}

export function demoCreateTaskAnimals(taskId: string, animalIds: string[]): TaskAnimal[] {
  const db = loadDb();
  const rows: TaskAnimal[] = animalIds.map((animalId) => ({
    id: newId("taskanimal"),
    task_id: taskId,
    animal_id: animalId,
    done: false,
    done_by: null,
    done_at: null,
    created_at: new Date().toISOString(),
  }));
  db.taskAnimals.push(...rows);
  saveDb(db);
  return rows;
}

export function demoToggleTaskAnimal(id: string, done: boolean, doneBy: string | null): TaskAnimal | undefined {
  const db = loadDb();
  const idx = db.taskAnimals.findIndex((ta) => ta.id === id);
  if (idx === -1) return undefined;
  db.taskAnimals[idx] = {
    ...db.taskAnimals[idx],
    done,
    done_by: done ? doneBy : null,
    done_at: done ? new Date().toISOString() : null,
  };
  saveDb(db);
  return db.taskAnimals[idx];
}

// --- Gorsel yukleme (demo modda gercek storage olmadigi icin data URL olarak saklanir) ---

export function demoUploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
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
      tank_straw_count: 0,
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
      tank_straw_count: 0,
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

// --- OPU gun havuzlari (batch) & seanslar & embriyolar ---

export function demoListOpuBatches(): OpuBatch[] {
  return loadDb().opuBatches.sort((a, b) => b.batch_date.localeCompare(a.batch_date));
}

export function demoGetOpuBatch(id: string): OpuBatch | undefined {
  return loadDb().opuBatches.find((b) => b.id === id);
}

export function demoCreateOpuBatch(input: Omit<OpuBatch, "id" | "created_at" | "updated_at">): OpuBatch {
  const db = loadDb();
  const now = new Date().toISOString();
  const batch: OpuBatch = { ...input, id: newId("opu-batch"), created_at: now, updated_at: now };
  db.opuBatches.push(batch);
  saveDb(db);
  return batch;
}

export function demoUpdateOpuBatch(id: string, patch: Partial<OpuBatch>): OpuBatch | undefined {
  const db = loadDb();
  const idx = db.opuBatches.findIndex((b) => b.id === id);
  if (idx === -1) return undefined;
  db.opuBatches[idx] = { ...db.opuBatches[idx], ...patch, updated_at: new Date().toISOString() };
  saveDb(db);
  return db.opuBatches[idx];
}

export function demoDeleteOpuBatch(id: string): void {
  const db = loadDb();
  const sessionIds = db.opuSessions.filter((s) => s.batch_id === id).map((s) => s.id);
  db.opuSessions = db.opuSessions.filter((s) => s.batch_id !== id);
  db.embryos = db.embryos.filter((e) => !sessionIds.includes(e.opu_session_id));
  db.opuBatches = db.opuBatches.filter((b) => b.id !== id);
  saveDb(db);
}

export function demoListOpuSessions(batchId?: string): OpuSession[] {
  const all = loadDb().opuSessions.sort((a, b) => b.session_date.localeCompare(a.session_date));
  return batchId ? all.filter((s) => s.batch_id === batchId) : all;
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

export function demoDeleteOpuSession(id: string): void {
  const db = loadDb();
  db.opuSessions = db.opuSessions.filter((s) => s.id !== id);
  db.embryos = db.embryos.filter((e) => e.opu_session_id !== id);
  saveDb(db);
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

export function demoListPlannedEmbryoTransfers(): PlannedEmbryoTransfer[] {
  return loadDb().plannedEmbryoTransfers.sort((a, b) => a.planned_date.localeCompare(b.planned_date));
}

export function demoCreatePlannedEmbryoTransfer(
  input: Omit<PlannedEmbryoTransfer, "id" | "created_at">
): PlannedEmbryoTransfer {
  const db = loadDb();
  const planned: PlannedEmbryoTransfer = { ...input, id: newId("planned-transfer"), created_at: new Date().toISOString() };
  db.plannedEmbryoTransfers.push(planned);
  saveDb(db);
  return planned;
}

export function demoDeletePlannedEmbryoTransfer(id: string): void {
  const db = loadDb();
  db.plannedEmbryoTransfers = db.plannedEmbryoTransfers.filter((p) => p.id !== id);
  saveDb(db);
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

export function demoUpdateCalfFeeding(
  id: string,
  patch: Partial<Pick<CalfFeeding, "drank" | "notes">>
): CalfFeeding | undefined {
  const db = loadDb();
  const idx = db.calfFeedings.findIndex((f) => f.id === id);
  if (idx === -1) return undefined;
  db.calfFeedings[idx] = { ...db.calfFeedings[idx], ...patch };
  saveDb(db);
  return db.calfFeedings[idx];
}

export function demoDeleteCalfFeeding(id: string): void {
  const db = loadDb();
  db.calfFeedings = db.calfFeedings.filter((f) => f.id !== id);
  saveDb(db);
}

// --- Vardiya devir notlari (demo) ---

export function demoListShiftNotes(): ShiftNote[] {
  const db = loadDb();
  const cutoff = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const kept = db.shiftNotes.filter((n) => new Date(n.created_at).getTime() >= cutoff);
  if (kept.length !== db.shiftNotes.length) {
    db.shiftNotes = kept;
    saveDb(db);
  }
  return kept.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoCreateShiftNote(note: string, createdBy: string | null): ShiftNote {
  const db = loadDb();
  const shiftNote: ShiftNote = {
    id: newId("shiftnote"),
    note,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  db.shiftNotes.push(shiftNote);
  saveDb(db);
  return shiftNote;
}

// --- Buzagi gozlem notlari (demo) ---

export function demoListCalfNotes(animalId?: string): CalfNote[] {
  const all = loadDb().calfNotes.sort((a, b) => b.created_at.localeCompare(a.created_at));
  return animalId ? all.filter((n) => n.animal_id === animalId) : all;
}

export function demoCreateCalfNote(
  animalId: string,
  note: string,
  createdBy: string | null,
  visibleUntil: string | null = null
): CalfNote {
  const db = loadDb();
  const calfNote: CalfNote = {
    id: newId("calfnote"),
    animal_id: animalId,
    note,
    visible_until: visibleUntil,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  db.calfNotes.push(calfNote);
  saveDb(db);
  return calfNote;
}

export function demoDeleteCalfNote(id: string): void {
  const db = loadDb();
  db.calfNotes = db.calfNotes.filter((n) => n.id !== id);
  saveDb(db);
}

// --- Buzagi barinma yerlesimi (demo) ---

export function demoListCalfHousingSlots(structure: CalfHousingStructure): CalfHousingSlot[] {
  return loadDb()
    .calfHousingSlots.filter((s) => s.structure === structure)
    .sort((a, b) => a.group_index - b.group_index || a.slot_index - b.slot_index);
}

export function demoAssignCalfToSlot(slotId: string, animalId: string | null): CalfHousingSlot | undefined {
  const db = loadDb();
  const idx = db.calfHousingSlots.findIndex((s) => s.id === slotId);
  if (idx === -1) return undefined;
  db.calfHousingSlots[idx] = { ...db.calfHousingSlots[idx], animal_id: animalId };
  saveDb(db);
  return db.calfHousingSlots[idx];
}

export function demoListCalfTreatmentStatuses(): CalfTreatmentStatus[] {
  return loadDb().calfTreatmentStatuses;
}

export function demoSetCalfTreatmentStatus(
  animalId: string,
  underTreatment: boolean,
  note: string | null,
  updatedBy: string | null
): CalfTreatmentStatus {
  const db = loadDb();
  const status: CalfTreatmentStatus = {
    animal_id: animalId,
    under_treatment: underTreatment,
    note,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  const idx = db.calfTreatmentStatuses.findIndex((s) => s.animal_id === animalId);
  if (idx === -1) db.calfTreatmentStatuses.push(status);
  else db.calfTreatmentStatuses[idx] = status;
  saveDb(db);
  return status;
}

export function demoListCalfTreatments(animalId?: string): CalfTreatment[] {
  const all = loadDb().calfTreatments.sort((a, b) => b.treatment_date.localeCompare(a.treatment_date));
  return animalId ? all.filter((t) => t.animal_id === animalId) : all;
}

export function demoCreateCalfTreatment(input: Omit<CalfTreatment, "id" | "created_at">): CalfTreatment {
  const db = loadDb();
  const treatment: CalfTreatment = { ...input, id: newId("calftreatment"), created_at: new Date().toISOString() };
  db.calfTreatments.push(treatment);
  saveDb(db);
  return treatment;
}

export function demoDeleteCalfTreatment(id: string): void {
  const db = loadDb();
  db.calfTreatments = db.calfTreatments.filter((t) => t.id !== id);
  saveDb(db);
}

// --- Buzagi mama ogunleri ---

export function demoListCalfMeals(sinceDate?: string): CalfMeal[] {
  const all = loadDb().calfMeals.sort((a, b) => b.meal_date.localeCompare(a.meal_date));
  return sinceDate ? all.filter((m) => m.meal_date >= sinceDate) : all;
}

export function demoUpsertCalfMeal(input: {
  animal_id: string;
  meal_date: string;
  meal_hour: CalfMealHour;
  drank: boolean;
  pectolit: boolean;
  created_by: string | null;
}): CalfMeal {
  const db = loadDb();
  const idx = db.calfMeals.findIndex(
    (m) => m.animal_id === input.animal_id && m.meal_date === input.meal_date && m.meal_hour === input.meal_hour
  );
  if (idx >= 0) {
    db.calfMeals[idx] = { ...db.calfMeals[idx], ...input };
    saveDb(db);
    return db.calfMeals[idx];
  }
  const meal: CalfMeal = {
    ...input,
    id: newId("calfmeal"),
    exam_result: null,
    examined_by: null,
    examined_at: null,
    created_at: new Date().toISOString(),
  };
  db.calfMeals.push(meal);
  saveDb(db);
  return meal;
}

export function demoSetCalfMealExam(id: string, examResult: string, examinedBy: string | null): CalfMeal | undefined {
  const db = loadDb();
  const idx = db.calfMeals.findIndex((m) => m.id === id);
  if (idx === -1) return undefined;
  db.calfMeals[idx] = {
    ...db.calfMeals[idx],
    exam_result: examResult,
    examined_by: examinedBy,
    examined_at: new Date().toISOString(),
  };
  saveDb(db);
  return db.calfMeals[idx];
}

// --- Buzagi tedavi protokolleri ve kurleri ---

export function demoListCalfProtocols(): CalfProtocol[] {
  return loadDb().calfProtocols.sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export function demoListCalfProtocolDays(): CalfProtocolDay[] {
  return loadDb().calfProtocolDays.sort((a, b) => a.day_number - b.day_number);
}

export function demoCreateCalfProtocol(name: string, createdBy: string | null): CalfProtocol {
  const db = loadDb();
  const protocol: CalfProtocol = { id: newId("protocol"), name, created_by: createdBy, created_at: new Date().toISOString() };
  db.calfProtocols.push(protocol);
  saveDb(db);
  return protocol;
}

export function demoUpdateCalfProtocolName(id: string, name: string): CalfProtocol | undefined {
  const db = loadDb();
  const idx = db.calfProtocols.findIndex((p) => p.id === id);
  if (idx === -1) return undefined;
  db.calfProtocols[idx] = { ...db.calfProtocols[idx], name };
  saveDb(db);
  return db.calfProtocols[idx];
}

export function demoReplaceCalfProtocolDays(protocolId: string, days: { day_number: number; medicines: string }[]): void {
  const db = loadDb();
  db.calfProtocolDays = db.calfProtocolDays.filter((d) => d.protocol_id !== protocolId);
  for (const d of days) {
    db.calfProtocolDays.push({ id: newId("protoday"), protocol_id: protocolId, ...d });
  }
  saveDb(db);
}

export function demoListCalfTreatmentCourses(): CalfTreatmentCourse[] {
  return loadDb().calfTreatmentCourses.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoCreateCalfTreatmentCourse(input: {
  animal_id: string;
  protocol_id: string;
  start_date: string;
  created_by: string | null;
}): CalfTreatmentCourse {
  const db = loadDb();
  const course: CalfTreatmentCourse = {
    ...input,
    id: newId("course"),
    status: "aktif",
    created_at: new Date().toISOString(),
  };
  db.calfTreatmentCourses.push(course);
  saveDb(db);
  return course;
}

export function demoSetCalfTreatmentCourseStatus(id: string, status: CourseStatus): CalfTreatmentCourse | undefined {
  const db = loadDb();
  const idx = db.calfTreatmentCourses.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.calfTreatmentCourses[idx] = { ...db.calfTreatmentCourses[idx], status };
  saveDb(db);
  return db.calfTreatmentCourses[idx];
}

// --- Dogum kayitlari ---

export function demoListCalfBirthRecords(): CalfBirthRecord[] {
  return loadDb().calfBirthRecords;
}

export function demoUpsertCalfBirthRecord(
  animalId: string,
  patch: Partial<Omit<CalfBirthRecord, "animal_id" | "updated_at" | "updated_by">>,
  updatedBy: string | null
): CalfBirthRecord {
  const db = loadDb();
  const idx = db.calfBirthRecords.findIndex((r) => r.animal_id === animalId);
  const base: CalfBirthRecord =
    idx >= 0
      ? db.calfBirthRecords[idx]
      : {
          animal_id: animalId,
          born_at: null,
          blood_brix: null,
          blood_brix_at: null,
          colostrum1_liters: null,
          colostrum1_brix: null,
          colostrum2_liters: null,
          colostrum2_brix: null,
          updated_at: new Date().toISOString(),
          updated_by: updatedBy,
        };
  const next: CalfBirthRecord = { ...base, ...patch, updated_at: new Date().toISOString(), updated_by: updatedBy };
  if (idx >= 0) db.calfBirthRecords[idx] = next;
  else db.calfBirthRecords.push(next);
  saveDb(db);
  return next;
}

// --- Pectolit kurleri ---

export function demoListCalfPectolitCourses(): CalfPectolitCourse[] {
  return loadDb().calfPectolitCourses.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export function demoCreateCalfPectolitCourse(animalId: string, createdBy: string | null): CalfPectolitCourse {
  const db = loadDb();
  const course: CalfPectolitCourse = {
    id: newId("pectolit"),
    animal_id: animalId,
    start_date: todayIso(),
    total_days: 3,
    status: "aktif",
    antibiotic_warning: false,
    created_by: createdBy,
    created_at: new Date().toISOString(),
  };
  db.calfPectolitCourses.push(course);
  saveDb(db);
  return course;
}

export function demoUpdateCalfPectolitCourse(
  id: string,
  patch: Partial<Pick<CalfPectolitCourse, "total_days" | "status" | "antibiotic_warning">>
): CalfPectolitCourse | undefined {
  const db = loadDb();
  const idx = db.calfPectolitCourses.findIndex((c) => c.id === id);
  if (idx === -1) return undefined;
  db.calfPectolitCourses[idx] = { ...db.calfPectolitCourses[idx], ...patch };
  saveDb(db);
  return db.calfPectolitCourses[idx];
}

// --- Asi planlari ---

export function demoListVaccinationPlans(): VaccinationPlan[] {
  return loadDb().vaccinationPlans.sort((a, b) => b.planned_date.localeCompare(a.planned_date));
}

export function demoCreateVaccinationPlan(input: {
  vaccine_name: string;
  target: string | null;
  planned_date: string;
  notes: string | null;
  created_by: string | null;
}): VaccinationPlan {
  const db = loadDb();
  const plan: VaccinationPlan = {
    ...input,
    id: newId("vaccine"),
    done: false,
    done_by: null,
    done_at: null,
    created_at: new Date().toISOString(),
  };
  db.vaccinationPlans.push(plan);
  saveDb(db);
  return plan;
}

export function demoSetVaccinationPlanDone(id: string, done: boolean, doneBy: string | null): VaccinationPlan | undefined {
  const db = loadDb();
  const idx = db.vaccinationPlans.findIndex((v) => v.id === id);
  if (idx === -1) return undefined;
  db.vaccinationPlans[idx] = {
    ...db.vaccinationPlans[idx],
    done,
    done_by: done ? doneBy : null,
    done_at: done ? new Date().toISOString() : null,
  };
  saveDb(db);
  return db.vaccinationPlans[idx];
}

export function demoDeleteVaccinationPlan(id: string): void {
  const db = loadDb();
  db.vaccinationPlans = db.vaccinationPlans.filter((v) => v.id !== id);
  saveDb(db);
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

// --- Push bildirim abonelikleri ---

export function demoListPushSubscriptionsForProfile(profileId: string): PushSubscriptionRecord[] {
  return loadDb().pushSubscriptions.filter((p) => p.profile_id === profileId);
}

export function demoCreatePushSubscription(
  profileId: string,
  endpoint: string,
  p256dh: string,
  auth: string
): PushSubscriptionRecord {
  const db = loadDb();
  const existingIdx = db.pushSubscriptions.findIndex((p) => p.endpoint === endpoint);
  const record: PushSubscriptionRecord = {
    id: existingIdx !== -1 ? db.pushSubscriptions[existingIdx].id : newId("push"),
    profile_id: profileId,
    endpoint,
    p256dh,
    auth,
    created_at: existingIdx !== -1 ? db.pushSubscriptions[existingIdx].created_at : new Date().toISOString(),
  };
  if (existingIdx !== -1) db.pushSubscriptions[existingIdx] = record;
  else db.pushSubscriptions.push(record);
  saveDb(db);
  return record;
}

export function demoDeletePushSubscriptionByEndpoint(endpoint: string): void {
  const db = loadDb();
  db.pushSubscriptions = db.pushSubscriptions.filter((p) => p.endpoint !== endpoint);
  saveDb(db);
}

// Demo modda gercek bir push sunucusu olmadigi icin bildirim,
// ayni tarayicida dogrudan Notification API ile tetiklenir.
export function demoSendPushNotification(title: string, body: string): void {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  new Notification(title, { body, icon: "/icons/icon-192.png" });
}

// --- Leave requests (demo) ---

export function demoListLeaveRequests(): LeaveRequest[] {
  return loadDb().leaveRequests.sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export function demoCreateLeaveRequest(
  input: Omit<LeaveRequest, "id" | "status" | "reviewed_by" | "reviewed_at" | "created_at">
): LeaveRequest {
  const db = loadDb();
  const request: LeaveRequest = {
    ...input,
    id: newId("leave"),
    status: "bekliyor",
    reviewed_by: null,
    reviewed_at: null,
    created_at: new Date().toISOString(),
  };
  db.leaveRequests.push(request);
  saveDb(db);
  return request;
}

export function demoUpdateLeaveRequest(id: string, patch: Partial<LeaveRequest>): LeaveRequest | undefined {
  const db = loadDb();
  const idx = db.leaveRequests.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  db.leaveRequests[idx] = { ...db.leaveRequests[idx], ...patch };
  saveDb(db);
  return db.leaveRequests[idx];
}

export function demoDeleteLeaveRequest(id: string): void {
  const db = loadDb();
  db.leaveRequests = db.leaveRequests.filter((r) => r.id !== id);
  saveDb(db);
}
