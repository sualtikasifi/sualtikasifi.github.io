import { Animal, Bull, Embryo, Insemination, OpuSession, Profile, SemenInventory, Task, Treatment } from "@/lib/types";

export const DEMO_USER_ID = "demo-user-1";

export const seedProfiles: Profile[] = [
  { id: "demo-user-1", full_name: "Ahmet Yilmaz (Yonetici)", role: "yonetici", created_at: new Date().toISOString() },
  { id: "demo-user-2", full_name: "Dr. Ayse Kaya (Veteriner)", role: "veteriner", created_at: new Date().toISOString() },
  { id: "demo-user-3", full_name: "Mehmet Demir (Saha)", role: "calisan", created_at: new Date().toISOString() },
];

const today = new Date();
const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() - n);
  return iso(d);
};
const daysFromNow = (n: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return iso(d);
};

export const seedAnimals: Animal[] = [
  {
    id: "animal-1",
    ear_tag: "TR-1042",
    name: "Sarikiz",
    birth_date: daysAgo(45),
    breed: "Holstein",
    gender: "disi",
    status: "aktif",
    mother_ear_tag: "TR-0891",
    weaned_at: null,
    notes: "Buzagi, gunluk mama takibi yapiliyor.",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(45),
    updated_at: daysAgo(1),
  },
  {
    id: "animal-2",
    ear_tag: "TR-0891",
    name: "Benekli",
    birth_date: daysAgo(900),
    breed: "Holstein",
    gender: "disi",
    status: "aktif",
    mother_ear_tag: null,
    weaned_at: daysAgo(850),
    notes: null,
    created_by: DEMO_USER_ID,
    created_at: daysAgo(900),
    updated_at: daysAgo(5),
  },
  {
    id: "animal-3",
    ear_tag: "TR-0755",
    name: "Boncuk",
    birth_date: daysAgo(1200),
    breed: "Simental",
    gender: "disi",
    status: "aktif",
    mother_ear_tag: null,
    weaned_at: daysAgo(1150),
    notes: "Mastitis gecmisi mevcut, takip ediliyor.",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(1200),
    updated_at: daysAgo(2),
  },
];

export const seedTreatments: Treatment[] = [
  {
    id: "treat-1",
    animal_id: "animal-1",
    treatment_date: daysAgo(2),
    category: "buzagi_beslenme",
    diagnosis: "Rutin mama kontrolu",
    medication: null,
    dose: "2 litre buzagi mamasi",
    udder_quarter: null,
    vet_name: null,
    outcome: "iyilesti",
    notes: "Istahli sekilde icti.",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(2),
  },
  {
    id: "treat-2",
    animal_id: "animal-3",
    treatment_date: daysAgo(1),
    category: "mastitis",
    diagnosis: "Klinik mastitis",
    medication: "Antibiyotik enjeksiyon",
    dose: "1 doz / gun, 3 gun",
    udder_quarter: "arka_sag",
    vet_name: "Dr. Ayse Kaya",
    outcome: "devam_ediyor",
    notes: "Sutu ayri sagiliyor, atilacak.",
    created_by: "demo-user-2",
    created_at: daysAgo(1),
  },
];

export const seedTasks: Task[] = [
  {
    id: "task-1",
    title: "Revirdeki hayvanlarin sabah kontrolu",
    description: "Mastitis tedavisi goren hayvanlarin meme durumunu kontrol et.",
    assigned_to: "demo-user-3",
    assigned_by: "demo-user-1",
    due_date: iso(today),
    due_time: "08:00",
    status: "bekliyor",
    completed_by: null,
    completed_at: null,
    completion_note: null,
    created_at: daysAgo(1),
  },
  {
    id: "task-2",
    title: "Sperma stok sayimi",
    description: "Tanktaki straw sayilarini kontrol edip sisteme gir.",
    assigned_to: "demo-user-1",
    assigned_by: "demo-user-1",
    due_date: daysFromNow(3),
    due_time: "14:00",
    status: "bekliyor",
    completed_by: null,
    completed_at: null,
    completion_note: null,
    created_at: daysAgo(1),
  },
  {
    id: "task-3",
    title: "TR-1042 mama kontrolu",
    description: null,
    assigned_to: "demo-user-3",
    assigned_by: "demo-user-2",
    due_date: daysAgo(1),
    due_time: null,
    status: "yapildi",
    completed_by: "demo-user-3",
    completed_at: daysAgo(1),
    completion_note: "Istahli sekilde icti, sorun yok.",
    created_at: daysAgo(2),
  },
];

export const seedBulls: Bull[] = [
  {
    id: "bull-1",
    name: "Alparslan",
    code: "TR-BOGA-001",
    breed: "Holstein",
    notes: "Yuksek sut verimi hatti",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(200),
  },
  {
    id: "bull-2",
    name: "Karayel",
    code: "TR-BOGA-002",
    breed: "Simental",
    notes: null,
    created_by: DEMO_USER_ID,
    created_at: daysAgo(150),
  },
  {
    id: "bull-3",
    name: "Toros",
    code: "TR-BOGA-003",
    breed: "Angus",
    notes: null,
    created_by: DEMO_USER_ID,
    created_at: daysAgo(100),
  },
];

export const seedSemenInventory: SemenInventory[] = [
  {
    id: "semen-1",
    bull_id: "bull-1",
    semen_type: "konvansiyonel",
    straw_count: 24,
    tank_location: "Tank 1 - Kanister 2",
    notes: null,
    updated_at: daysAgo(3),
  },
  {
    id: "semen-2",
    bull_id: "bull-1",
    semen_type: "disi",
    straw_count: 8,
    tank_location: "Tank 1 - Kanister 3",
    notes: null,
    updated_at: daysAgo(3),
  },
  {
    id: "semen-3",
    bull_id: "bull-2",
    semen_type: "konvansiyonel",
    straw_count: 5,
    tank_location: "Tank 1 - Kanister 4",
    notes: "Stok azaliyor, siparis verilecek.",
    updated_at: daysAgo(1),
  },
  {
    id: "semen-3b",
    bull_id: "bull-2",
    semen_type: "disi",
    straw_count: 2,
    tank_location: "Tank 1 - Kanister 5",
    notes: null,
    updated_at: daysAgo(1),
  },
  {
    id: "semen-4",
    bull_id: "bull-3",
    semen_type: "konvansiyonel",
    straw_count: 15,
    tank_location: "Tank 2 - Kanister 1",
    notes: null,
    updated_at: daysAgo(2),
  },
  {
    id: "semen-5",
    bull_id: "bull-3",
    semen_type: "disi",
    straw_count: 3,
    tank_location: "Tank 2 - Kanister 2",
    notes: null,
    updated_at: daysAgo(2),
  },
];

export const seedInseminations: Insemination[] = [
  {
    id: "insem-1",
    animal_id: "animal-2",
    bull_id: "bull-1",
    semen_type: "konvansiyonel",
    insemination_date: daysAgo(20),
    technician_name: "Dr. Ayse Kaya",
    pregnancy_check_date: daysAgo(5),
    pregnancy_result: "gebe",
    notes: null,
    created_by: "demo-user-2",
    created_at: daysAgo(20),
  },
  {
    id: "insem-2",
    animal_id: "animal-3",
    bull_id: "bull-2",
    semen_type: "disi",
    insemination_date: daysAgo(4),
    technician_name: "Dr. Ayse Kaya",
    pregnancy_check_date: null,
    pregnancy_result: "bekleniyor",
    notes: "Kontrol icin 30 gun sonra tekrar bakilacak.",
    created_by: "demo-user-2",
    created_at: daysAgo(4),
  },
];

export const seedOpuSessions: OpuSession[] = [
  {
    id: "opu-1",
    donor_animal_id: "animal-2",
    session_date: daysAgo(10),
    technician_name: "Dr. Ayse Kaya",
    follicle_count_right: 9,
    follicle_count_left: 8,
    oocyte_count: 14,
    cleaved_count: 10,
    embryo_count: 3,
    notes: "Donor hayvan iyi tepki verdi.",
    created_by: "demo-user-2",
    created_at: daysAgo(10),
    updated_at: daysAgo(3),
  },
];

export const seedEmbryos: Embryo[] = [
  {
    id: "embryo-1",
    opu_session_id: "opu-1",
    label: "E1",
    grade: "1",
    stage: "blastosist",
    day_reached: 7,
    status: "dondu",
    recipient_animal_id: null,
    transfer_date: null,
    notes: null,
    created_by: "demo-user-2",
    created_at: daysAgo(3),
    updated_at: daysAgo(3),
  },
  {
    id: "embryo-2",
    opu_session_id: "opu-1",
    label: "E2",
    grade: "2",
    stage: "genisleyen_blastosist",
    day_reached: 7,
    status: "transfer_edildi",
    recipient_animal_id: "animal-3",
    transfer_date: daysAgo(2),
    notes: "Aliciya taze transfer edildi.",
    created_by: "demo-user-2",
    created_at: daysAgo(3),
    updated_at: daysAgo(2),
  },
  {
    id: "embryo-3",
    opu_session_id: "opu-1",
    label: "E3",
    grade: "3",
    stage: "erken_blastosist",
    day_reached: 6,
    status: "gelisiyor",
    recipient_animal_id: null,
    transfer_date: null,
    notes: "Gelisimi izleniyor.",
    created_by: "demo-user-2",
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
];
