import { Animal, Bull, CalfFeeding, Embryo, Insemination, MastitisDose, MastitisProtocol, MastitisTreatment, Medicine, OpuSession, Profile, SemenInventory, Task, TaskAnimal } from "@/lib/types";

export const DEMO_USER_ID = "demo-user-1";

export const seedProfiles: Profile[] = [
  {
    id: "demo-user-1",
    full_name: "Ahmet Yılmaz (Yönetici)",
    start_date: "2020-03-01",
    role: "yonetici",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-user-2",
    full_name: "Dr. Ayşe Kaya (Veteriner)",
    start_date: "2021-06-15",
    role: "veteriner",
    created_at: new Date().toISOString(),
  },
  {
    id: "demo-user-3",
    full_name: "Mehmet Demir (Saha)",
    start_date: "2022-09-10",
    role: "calisan",
    created_at: new Date().toISOString(),
  },
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
const hoursAgo = (n: number) => {
  const d = new Date(today);
  d.setHours(d.getHours() - n);
  return d.toISOString();
};

export const seedAnimals: Animal[] = [
  {
    id: "animal-1",
    ear_tag: "TR-1042",
    name: "Sarıkız",
    birth_date: daysAgo(45),
    breed: "Holstein",
    gender: "disi",
    status: "aktif",
    mother_ear_tag: "TR-0891",
    weaned_at: null,
    notes: "Buzağı, günlük mama takibi yapılıyor.",
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
    notes: "Mastitis geçmişi mevcut, takip ediliyor.",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(1200),
    updated_at: daysAgo(2),
  },
];

// mastitis-1: Boncuk (animal-3), devam eden 4 günlük protokol, 2 gün yapıldı, 2 gün kaldı.
// mastitis-2: Benekli (animal-2), protokol tamamlandı, arınma süresi de tamamlanıp onaylandı.
export const seedMastitisTreatments: MastitisTreatment[] = [
  {
    id: "mastitis-1",
    animal_id: "animal-3",
    udder_quarters: ["arka_sag", "arka_sol"],
    diagnosis: "Klinik mastitis",
    medication: "Antibiyotik enjeksiyon",
    vet_name: "Dr. Ayşe Kaya",
    start_date: daysAgo(2),
    protocol_days: 4,
    withdrawal_days: 3,
    ended_at: null,
    withdrawal_cleared_at: null,
    withdrawal_cleared_by: null,
    notes: "Sütü ayrı sağılıyor, atılacak.",
    created_by: "demo-user-2",
    created_at: daysAgo(2),
  },
  {
    id: "mastitis-2",
    animal_id: "animal-2",
    udder_quarters: ["on_sol"],
    diagnosis: "Subklinik mastitis",
    medication: "İntramamer antibiyotik tüp",
    vet_name: "Dr. Ayşe Kaya",
    start_date: daysAgo(10),
    protocol_days: 4,
    withdrawal_days: 3,
    ended_at: daysAgo(6),
    withdrawal_cleared_at: daysAgo(2),
    withdrawal_cleared_by: "demo-user-2",
    notes: null,
    created_by: "demo-user-2",
    created_at: daysAgo(10),
  },
];

export const seedMastitisDoses: MastitisDose[] = [
  {
    id: "dose-1",
    mastitis_treatment_id: "mastitis-1",
    day_number: 1,
    done: true,
    done_by: "demo-user-2",
    done_at: daysAgo(2),
    note: null,
  },
  {
    id: "dose-2",
    mastitis_treatment_id: "mastitis-1",
    day_number: 2,
    done: true,
    done_by: "demo-user-3",
    done_at: daysAgo(1),
    note: "Hafif iyileşme var.",
  },
  { id: "dose-3", mastitis_treatment_id: "mastitis-1", day_number: 3, done: false, done_by: null, done_at: null, note: null },
  { id: "dose-4", mastitis_treatment_id: "mastitis-1", day_number: 4, done: false, done_by: null, done_at: null, note: null },
  {
    id: "dose-5",
    mastitis_treatment_id: "mastitis-2",
    day_number: 1,
    done: true,
    done_by: "demo-user-2",
    done_at: daysAgo(9),
    note: null,
  },
  {
    id: "dose-6",
    mastitis_treatment_id: "mastitis-2",
    day_number: 2,
    done: true,
    done_by: "demo-user-3",
    done_at: daysAgo(8),
    note: null,
  },
  {
    id: "dose-7",
    mastitis_treatment_id: "mastitis-2",
    day_number: 3,
    done: true,
    done_by: "demo-user-3",
    done_at: daysAgo(7),
    note: null,
  },
  {
    id: "dose-8",
    mastitis_treatment_id: "mastitis-2",
    day_number: 4,
    done: true,
    done_by: "demo-user-2",
    done_at: daysAgo(6),
    note: "Protokol tamamlandı.",
  },
];

export const seedMastitisProtocols: MastitisProtocol[] = [
  {
    id: "protocol-1",
    medication: "Gün 1-4: İntramamer antibiyotik tüp, günde 1 kez, sağımdan sonra uygulanır.",
    created_by: "demo-user-2",
    created_at: daysAgo(10),
  },
  {
    id: "protocol-2",
    medication: "Gün 1-3: Sistemik antibiyotik enjeksiyon (IM), günde 1 doz.",
    created_by: "demo-user-2",
    created_at: daysAgo(9),
  },
];

export const seedTasks: Task[] = [
  {
    id: "task-1",
    title: "Revirdeki hayvanların sabah kontrolü",
    description: "Mastitis tedavisi gören hayvanların meme durumunu kontrol et.",
    assigned_to: "demo-user-3",
    assigned_by: "demo-user-1",
    due_date: iso(today),
    due_time: "08:00",
    status: "bekliyor",
    image_url: null,
    completed_by: null,
    completed_at: null,
    completion_note: null,
    completion_image_url: null,
    created_at: daysAgo(1),
  },
  {
    id: "task-2",
    title: "Sperma stok sayımı",
    description: "Tanktaki straw sayılarını kontrol edip sisteme gir.",
    assigned_to: "demo-user-1",
    assigned_by: "demo-user-1",
    due_date: daysFromNow(3),
    due_time: "14:00",
    status: "bekliyor",
    image_url: null,
    completed_by: null,
    completed_at: null,
    completion_note: null,
    completion_image_url: null,
    created_at: daysAgo(1),
  },
  {
    id: "task-3",
    title: "TR-1042 mama kontrolü",
    description: null,
    assigned_to: "demo-user-3",
    assigned_by: "demo-user-2",
    due_date: daysAgo(1),
    due_time: null,
    status: "yapildi",
    image_url: null,
    completed_by: "demo-user-3",
    completed_at: daysAgo(1),
    completion_note: "İştahlı şekilde içti, sorun yok.",
    completion_image_url: null,
    created_at: daysAgo(2),
  },
];

export const seedTaskAnimals: TaskAnimal[] = [];

export const seedBulls: Bull[] = [
  {
    id: "bull-1",
    name: "Alparslan",
    code: "TR-BOGA-001",
    breed: "Holstein",
    notes: "Yüksek süt verimi hattı",
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
    straw_count: 20,
    tank_straw_count: 4,
    tank_location: "Tank 1 - Kanister 2",
    notes: null,
    updated_at: daysAgo(3),
  },
  {
    id: "semen-2",
    bull_id: "bull-1",
    semen_type: "disi",
    straw_count: 8,
    tank_straw_count: 0,
    tank_location: "Tank 1 - Kanister 3",
    notes: null,
    updated_at: daysAgo(3),
  },
  {
    id: "semen-3",
    bull_id: "bull-2",
    semen_type: "konvansiyonel",
    straw_count: 5,
    tank_straw_count: 0,
    tank_location: "Tank 1 - Kanister 4",
    notes: "Stok azalıyor, sipariş verilecek.",
    updated_at: daysAgo(1),
  },
  {
    id: "semen-3b",
    bull_id: "bull-2",
    semen_type: "disi",
    straw_count: 2,
    tank_straw_count: 0,
    tank_location: "Tank 1 - Kanister 5",
    notes: null,
    updated_at: daysAgo(1),
  },
  {
    id: "semen-4",
    bull_id: "bull-3",
    semen_type: "konvansiyonel",
    straw_count: 15,
    tank_straw_count: 0,
    tank_location: "Tank 2 - Kanister 1",
    notes: null,
    updated_at: daysAgo(2),
  },
  {
    id: "semen-5",
    bull_id: "bull-3",
    semen_type: "disi",
    straw_count: 3,
    tank_straw_count: 0,
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
    technician_name: "Dr. Ayşe Kaya",
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
    technician_name: "Dr. Ayşe Kaya",
    pregnancy_check_date: null,
    pregnancy_result: "bekleniyor",
    notes: "Kontrol için 30 gün sonra tekrar bakılacak.",
    created_by: "demo-user-2",
    created_at: daysAgo(4),
  },
];

export const seedOpuSessions: OpuSession[] = [
  {
    id: "opu-1",
    donor_animal_id: "animal-2",
    session_date: daysAgo(10),
    technician_name: "Dr. Ayşe Kaya",
    follicle_count_right: 9,
    follicle_count_left: 8,
    oocyte_count: 14,
    oocyte_grade_a: 8,
    oocyte_grade_b: 4,
    oocyte_grade_c: 2,
    oocyte_grade_d: 0,
    cleaved_count: 10,
    fertilization_bull_id: "bull-1",
    fertilization_semen_type: "konvansiyonel",
    embryo_count: 3,
    notes: "Donör hayvan iyi tepki verdi.",
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
    notes: "Alıcıya taze transfer edildi.",
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
    notes: "Gelişimi izleniyor.",
    created_by: "demo-user-2",
    created_at: daysAgo(3),
    updated_at: daysAgo(1),
  },
];

// Sarıkız (animal-1) için: ilk öğün içti, sonraki iki öğünü art arda içmedi
// (streak = 2 -> "Uyarı" durumu, muayene sonucu henüz girilmedi).
export const seedCalfFeedings: CalfFeeding[] = [
  {
    id: "feed-1",
    animal_id: "animal-1",
    fed_at: hoursAgo(16),
    drank: true,
    notes: null,
    exam_result: null,
    examined_by: null,
    examined_at: null,
    created_by: "demo-user-3",
    created_at: hoursAgo(16),
  },
  {
    id: "feed-2",
    animal_id: "animal-1",
    fed_at: hoursAgo(10),
    drank: false,
    notes: "İsteksizdi, biberonu itti.",
    exam_result: null,
    examined_by: null,
    examined_at: null,
    created_by: "demo-user-3",
    created_at: hoursAgo(10),
  },
  {
    id: "feed-3",
    animal_id: "animal-1",
    fed_at: hoursAgo(4),
    drank: false,
    notes: null,
    exam_result: null,
    examined_by: null,
    examined_at: null,
    created_by: "demo-user-3",
    created_at: hoursAgo(4),
  },
];

export const seedMedicines: Medicine[] = [
  {
    id: "medicine-1",
    name: "Şap Aşısı",
    unit: "doz",
    stock_count: 40,
    notes: "Soğuk zincirde, buzdolabında saklanır.",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(60),
    updated_at: daysAgo(5),
  },
  {
    id: "medicine-2",
    name: "Oksitetrasiklin (antibiyotik)",
    unit: "şişe",
    stock_count: 6,
    notes: null,
    created_by: DEMO_USER_ID,
    created_at: daysAgo(30),
    updated_at: daysAgo(2),
  },
  {
    id: "medicine-3",
    name: "Vitamin AD3E",
    unit: "şişe",
    stock_count: 3,
    notes: "Stok azalıyor, sipariş verilecek.",
    created_by: DEMO_USER_ID,
    created_at: daysAgo(45),
    updated_at: daysAgo(1),
  },
];
