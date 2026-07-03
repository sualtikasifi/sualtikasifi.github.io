-- Marder Ciftlik Yonetim Sistemi - Faz 1 semasi
-- Bu dosyayi Supabase projenizde SQL Editor'den calistirin.

-- 1. Kullanici profilleri (auth.users tablosuna ek bilgiler)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'calisan' check (role in ('yonetici', 'veteriner', 'calisan')),
  created_at timestamptz not null default now()
);

-- Yeni kullanici kaydolunca otomatik profil olustur
-- (profil eklemede beklenmedik bir hata olursa kullanici olusturmayi engellemesin diye
-- exception yakalayip sadece uyari loglar)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'calisan')
  on conflict (id) do nothing;
  return new;
exception when others then
  raise warning 'handle_new_user failed: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 2. Hayvanlar
create table if not exists animals (
  id uuid primary key default gen_random_uuid(),
  ear_tag text not null unique,
  name text,
  birth_date date,
  breed text,
  gender text check (gender in ('disi', 'erkek')),
  status text not null default 'aktif' check (status in ('aktif', 'satildi', 'olu')),
  mother_ear_tag text,
  weaned_at date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists animals_ear_tag_idx on animals (ear_tag);
create index if not exists animals_status_idx on animals (status);

-- 3. Mastitis tedavileri (meme bazli protokollu tedavi + arinma takibi)
-- protocol_days: tedavi protokolunun toplam gun sayisi (varsayilan 4).
-- withdrawal_days: tedavi bittikten sonraki arinma (sut karisimina donmeme) suresi (varsayilan 3 gun).
-- ended_at: tedavi protokolu tamamlaninca (tum gunler yapilinca) otomatik, ya da erken
-- sonlandirildiginda manuel olarak set edilir.
-- withdrawal_cleared_at/by: arinma suresi dolduktan sonra "arinmadan cikti" onayi.
create table if not exists mastitis_treatments (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals (id) on delete cascade,
  udder_quarter text not null check (udder_quarter in ('on_sol', 'on_sag', 'arka_sol', 'arka_sag')),
  diagnosis text,
  medication text,
  vet_name text,
  start_date date not null default current_date,
  protocol_days integer not null default 4 check (protocol_days > 0),
  withdrawal_days integer not null default 3 check (withdrawal_days >= 0),
  ended_at timestamptz,
  withdrawal_cleared_at timestamptz,
  withdrawal_cleared_by uuid references profiles (id),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists mastitis_treatments_animal_idx on mastitis_treatments (animal_id);
create index if not exists mastitis_treatments_start_date_idx on mastitis_treatments (start_date);

-- Protokolun her gununun tedavisi yapildi mi takibi (gorevlerdeki gibi kim/ne zaman kaydi)
create table if not exists mastitis_doses (
  id uuid primary key default gen_random_uuid(),
  mastitis_treatment_id uuid not null references mastitis_treatments (id) on delete cascade,
  day_number integer not null,
  done boolean not null default false,
  done_by uuid references profiles (id),
  done_at timestamptz,
  note text,
  unique (mastitis_treatment_id, day_number)
);

create index if not exists mastitis_doses_treatment_idx on mastitis_doses (mastitis_treatment_id);

-- Daha once girilen tedavi protokolleri (ilac metni), bir sonraki kayitta tek
-- tiklamayla tekrar secilebilsin diye saklanir.
create table if not exists mastitis_protocols (
  id uuid primary key default gen_random_uuid(),
  medication text not null unique,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- 4. Gorevler (calisanlar arasi is atama ve programlama)
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid references profiles (id),
  assigned_by uuid references profiles (id),
  due_date date not null,
  due_time time,
  status text not null default 'bekliyor' check (status in ('bekliyor', 'yapildi', 'iptal')),
  completed_by uuid references profiles (id),
  completed_at timestamptz,
  completion_note text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_assigned_to_idx on tasks (assigned_to);
create index if not exists tasks_due_date_idx on tasks (due_date);

-- 5. Bogalar (tohumlamada kullanilan sperma sahibi bogalar)
create table if not exists bulls (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  breed text,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- 6. Sperma stogu (her boga + sperma turu icin ayri guncel straw adedi)
-- semen_type: konvansiyonel (normal) veya disi (cinsiyeti belirlenmis/sexed semen)
create table if not exists semen_inventory (
  id uuid primary key default gen_random_uuid(),
  bull_id uuid not null references bulls (id) on delete cascade,
  semen_type text not null default 'konvansiyonel' check (semen_type in ('konvansiyonel', 'disi')),
  straw_count integer not null default 0 check (straw_count >= 0),
  tank_location text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (bull_id, semen_type)
);

create index if not exists semen_inventory_bull_idx on semen_inventory (bull_id);

-- 7. Tohumlamalar (OPU/embriyo degil, dogrudan tohumlama kayitlari)
create table if not exists inseminations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals (id) on delete cascade,
  bull_id uuid references bulls (id),
  semen_type text check (semen_type in ('konvansiyonel', 'disi')),
  insemination_date date not null default current_date,
  technician_name text,
  pregnancy_check_date date,
  pregnancy_result text not null default 'bekleniyor' check (pregnancy_result in ('bekleniyor', 'gebe', 'gebe_degil')),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists inseminations_animal_idx on inseminations (animal_id);
create index if not exists inseminations_date_idx on inseminations (insemination_date);

-- 8. OPU (Ovum Pick Up) seanslari
-- Laboratuvar huni takibi birden fazla gunde tamamlanir: OPU gununde folikul/oosit
-- sayilari, birkac gun sonra bolunme (cleavage) sayisi, D5-D8 arasinda embriyo sayisi.
create table if not exists opu_sessions (
  id uuid primary key default gen_random_uuid(),
  donor_animal_id uuid not null references animals (id) on delete cascade,
  session_date date not null default current_date,
  technician_name text,
  follicle_count_right integer check (follicle_count_right >= 0),
  follicle_count_left integer check (follicle_count_left >= 0),
  oocyte_count integer check (oocyte_count >= 0),
  cleaved_count integer check (cleaved_count >= 0),
  embryo_count integer check (embryo_count >= 0),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists opu_sessions_donor_idx on opu_sessions (donor_animal_id);
create index if not exists opu_sessions_date_idx on opu_sessions (session_date);

-- 9. Embriyolar (laboratuvar ortaminda gelisim takibi)
create table if not exists embryos (
  id uuid primary key default gen_random_uuid(),
  opu_session_id uuid not null references opu_sessions (id) on delete cascade,
  label text not null,
  grade text check (grade in ('1', '2', '3', '4')),
  stage text check (stage in ('morula', 'erken_blastosist', 'blastosist', 'genisleyen_blastosist', 'yumurtadan_cikan_blastosist')),
  day_reached integer,
  status text not null default 'gelisiyor' check (status in ('gelisiyor', 'dondu', 'transfer_edildi', 'atildi')),
  recipient_animal_id uuid references animals (id),
  transfer_date date,
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists embryos_session_idx on embryos (opu_session_id);
create index if not exists embryos_recipient_idx on embryos (recipient_animal_id);

-- 10. Buzagi besleme kayitlari (her ogunde ictimi/icmedi mi takibi)
-- Ardarda 2 kez icmezse muayene gerekir; muayene sonucu bu kayda (en son kacirilan
-- ogune) yazilir. Sonuc girilmeden uyari kalkmaz.
create table if not exists calf_feedings (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals (id) on delete cascade,
  fed_at timestamptz not null default now(),
  drank boolean not null,
  notes text,
  exam_result text,
  examined_by uuid references profiles (id),
  examined_at timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists calf_feedings_animal_idx on calf_feedings (animal_id);
create index if not exists calf_feedings_fed_at_idx on calf_feedings (fed_at);

-- 11. Asi/ilac stok takibi (sayim + kullanimda dusum + alimda ekleme)
create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unit text not null default 'adet',
  stock_count integer not null default 0 check (stock_count >= 0),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medicines_name_idx on medicines (name);

-- Row Level Security: giris yapmis herkes (10 kisilik guvenilir ekip) okuyup yazabilir
alter table profiles enable row level security;
alter table animals enable row level security;
alter table mastitis_treatments enable row level security;
alter table mastitis_doses enable row level security;
alter table mastitis_protocols enable row level security;
alter table tasks enable row level security;
alter table bulls enable row level security;
alter table semen_inventory enable row level security;
alter table inseminations enable row level security;
alter table opu_sessions enable row level security;
alter table embryos enable row level security;
alter table calf_feedings enable row level security;
alter table medicines enable row level security;

create policy "profiles_select_authenticated" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated using (auth.uid() = id);

create policy "animals_all_authenticated" on animals for all to authenticated using (true) with check (true);
create policy "mastitis_treatments_all_authenticated" on mastitis_treatments for all to authenticated using (true) with check (true);
create policy "mastitis_doses_all_authenticated" on mastitis_doses for all to authenticated using (true) with check (true);
create policy "mastitis_protocols_all_authenticated" on mastitis_protocols for all to authenticated using (true) with check (true);
create policy "tasks_all_authenticated" on tasks for all to authenticated using (true) with check (true);
create policy "bulls_all_authenticated" on bulls for all to authenticated using (true) with check (true);
create policy "semen_inventory_all_authenticated" on semen_inventory for all to authenticated using (true) with check (true);
create policy "inseminations_all_authenticated" on inseminations for all to authenticated using (true) with check (true);
create policy "opu_sessions_all_authenticated" on opu_sessions for all to authenticated using (true) with check (true);
create policy "embryos_all_authenticated" on embryos for all to authenticated using (true) with check (true);
create policy "calf_feedings_all_authenticated" on calf_feedings for all to authenticated using (true) with check (true);
create policy "medicines_all_authenticated" on medicines for all to authenticated using (true) with check (true);
