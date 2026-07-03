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
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'calisan');
  return new;
end;
$$ language plpgsql security definer;

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

-- 3. Tedavi / sağlık kayıtları (genel + mastitis meme bazlı alan dahil)
create table if not exists treatments (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals (id) on delete cascade,
  treatment_date date not null default current_date,
  category text not null default 'genel' check (category in ('genel', 'mastitis', 'buzagi_beslenme')),
  diagnosis text,
  medication text,
  dose text,
  udder_quarter text check (udder_quarter in ('on_sol', 'on_sag', 'arka_sol', 'arka_sag')),
  vet_name text,
  outcome text not null default 'devam_ediyor' check (outcome in ('devam_ediyor', 'iyilesti', 'olum')),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists treatments_animal_idx on treatments (animal_id);
create index if not exists treatments_date_idx on treatments (treatment_date);

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

-- 6. Sperma stogu (her boga icin guncel straw adedi)
create table if not exists semen_inventory (
  id uuid primary key default gen_random_uuid(),
  bull_id uuid not null references bulls (id) on delete cascade unique,
  straw_count integer not null default 0 check (straw_count >= 0),
  tank_location text,
  notes text,
  updated_at timestamptz not null default now()
);

create index if not exists semen_inventory_bull_idx on semen_inventory (bull_id);

-- 7. Tohumlamalar (OPU/embriyo degil, dogrudan tohumlama kayitlari)
create table if not exists inseminations (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals (id) on delete cascade,
  bull_id uuid references bulls (id),
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
create table if not exists opu_sessions (
  id uuid primary key default gen_random_uuid(),
  donor_animal_id uuid not null references animals (id) on delete cascade,
  session_date date not null default current_date,
  technician_name text,
  oocyte_count integer check (oocyte_count >= 0),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
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

-- Row Level Security: giris yapmis herkes (10 kisilik guvenilir ekip) okuyup yazabilir
alter table profiles enable row level security;
alter table animals enable row level security;
alter table treatments enable row level security;
alter table tasks enable row level security;
alter table bulls enable row level security;
alter table semen_inventory enable row level security;
alter table inseminations enable row level security;
alter table opu_sessions enable row level security;
alter table embryos enable row level security;

create policy "profiles_select_authenticated" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated using (auth.uid() = id);

create policy "animals_all_authenticated" on animals for all to authenticated using (true) with check (true);
create policy "treatments_all_authenticated" on treatments for all to authenticated using (true) with check (true);
create policy "tasks_all_authenticated" on tasks for all to authenticated using (true) with check (true);
create policy "bulls_all_authenticated" on bulls for all to authenticated using (true) with check (true);
create policy "semen_inventory_all_authenticated" on semen_inventory for all to authenticated using (true) with check (true);
create policy "inseminations_all_authenticated" on inseminations for all to authenticated using (true) with check (true);
create policy "opu_sessions_all_authenticated" on opu_sessions for all to authenticated using (true) with check (true);
create policy "embryos_all_authenticated" on embryos for all to authenticated using (true) with check (true);
