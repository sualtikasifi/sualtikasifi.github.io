-- Marder Ciftlik Yonetim Sistemi - Faz 1 semasi
-- Bu dosyayi Supabase projenizde SQL Editor'den calistirin.

-- 1. Kullanici profilleri (auth.users tablosuna ek bilgiler)
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  start_date date,
  role text not null default 'calisan' check (role in ('yonetici', 'veteriner', 'calisan')),
  -- Kisiye ozel yetkiler: is_admin her seyi yapabilir ve baskalarina yetki
  -- verebilir; digerleri sadece ilgili modulde olusturma/duzenleme/silme
  -- yapmaya izin verir (goruntuleme herkese acik kalir).
  is_admin boolean not null default false,
  can_manage_animals boolean not null default false,
  can_manage_mastitis boolean not null default false,
  can_manage_tasks boolean not null default false,
  can_manage_bulls_semen boolean not null default false,
  can_manage_inseminations boolean not null default false,
  can_manage_opu boolean not null default false,
  can_manage_calves boolean not null default false,
  can_manage_medicines boolean not null default false,
  can_send_announcements boolean not null default false,
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
  udder_quarters text[] not null default '{}',
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
  image_url text,
  completed_by uuid references profiles (id),
  completed_at timestamptz,
  completion_note text,
  completion_image_url text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_assigned_to_idx on tasks (assigned_to);
create index if not exists tasks_due_date_idx on tasks (due_date);

-- Bir goreve baglanan hayvan kontrol listesi (orn. "bu 20 buzagiya asi yapilacak")
create table if not exists task_animals (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks (id) on delete cascade,
  animal_id uuid not null references animals (id) on delete cascade,
  done boolean not null default false,
  done_by uuid references profiles (id),
  done_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, animal_id)
);

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
  tank_straw_count integer not null default 0 check (tank_straw_count >= 0),
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
  session_time time,
  technician_name text,
  follicle_count_right integer check (follicle_count_right >= 0),
  follicle_count_left integer check (follicle_count_left >= 0),
  oocyte_count integer check (oocyte_count >= 0),
  oocyte_grade_a integer check (oocyte_grade_a >= 0),
  oocyte_grade_b integer check (oocyte_grade_b >= 0),
  oocyte_grade_c integer check (oocyte_grade_c >= 0),
  oocyte_grade_d integer check (oocyte_grade_d >= 0),
  cleaved_count integer check (cleaved_count >= 0),
  fertilization_bull_id uuid references bulls (id),
  fertilization_semen_type text check (fertilization_semen_type in ('konvansiyonel', 'disi')),
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

-- 12. Vardiya devir notlari (buzagi bakim ekipleri arasi iletisim)
create table if not exists shift_notes (
  id uuid primary key default gen_random_uuid(),
  note text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- 13. Buzagi gozlem notlari (besleme kaydindan bagimsiz hastalik/gozlem notlari)
create table if not exists calf_notes (
  id uuid primary key default gen_random_uuid(),
  animal_id uuid not null references animals (id) on delete cascade,
  note text not null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists calf_notes_animal_idx on calf_notes (animal_id);

-- 14. Push bildirim abonelikleri (her cihaz/tarayici icin bir kayit)
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx on push_subscriptions (profile_id);

-- Row Level Security: giris yapmis herkes okuyabilir, yazma/silme ise
-- kisiye ozel yetkilere (is_admin veya ilgili can_manage_* alani) bagli.

-- Cagiran kullanicinin yonetici olup olmadigini dondurur.
create or replace function is_admin_user()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- Cagiran kullanicinin belirtilen modulde yazma yetkisi olup olmadigini
-- dondurur (yonetici her zaman true doner).
create or replace function has_perm(p_permission text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_admin_user() or coalesce(
    (select case p_permission
      when 'animals' then can_manage_animals
      when 'mastitis' then can_manage_mastitis
      when 'tasks' then can_manage_tasks
      when 'bulls_semen' then can_manage_bulls_semen
      when 'inseminations' then can_manage_inseminations
      when 'opu' then can_manage_opu
      when 'calves' then can_manage_calves
      when 'medicines' then can_manage_medicines
      when 'announcements' then can_send_announcements
      else false
    end
    from profiles where id = auth.uid()),
    false
  );
$$;

-- Yonetici olmayan bir kullanici kendi profilini guncellerse, yetki
-- alanlarinin (is_admin ve can_manage_*) degismesini engeller; sadece
-- yonetici baskasinin yetkilerini degistirebilir.
create or replace function enforce_profile_permission_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin_user() then
    new.is_admin := old.is_admin;
    new.role := old.role;
    new.can_manage_animals := old.can_manage_animals;
    new.can_manage_mastitis := old.can_manage_mastitis;
    new.can_manage_tasks := old.can_manage_tasks;
    new.can_manage_bulls_semen := old.can_manage_bulls_semen;
    new.can_manage_inseminations := old.can_manage_inseminations;
    new.can_manage_opu := old.can_manage_opu;
    new.can_manage_calves := old.can_manage_calves;
    new.can_manage_medicines := old.can_manage_medicines;
    new.can_send_announcements := old.can_send_announcements;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_update_enforce_permissions on profiles;
create trigger on_profile_update_enforce_permissions
  before update on profiles
  for each row execute function enforce_profile_permission_update();

-- Son yonetici hesabinin yonetici yetkisi yanlislikla/kotu niyetle
-- kaldirilip herkesin kilitli kalmasini engeller.
create or replace function prevent_removing_last_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_admin = true and new.is_admin = false then
    if (select count(*) from profiles where is_admin = true and id <> old.id) = 0 then
      raise exception 'Son yönetici hesabının yönetici yetkisi kaldırılamaz.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_profile_prevent_last_admin_removal on profiles;
create trigger on_profile_prevent_last_admin_removal
  before update on profiles
  for each row execute function prevent_removing_last_admin();

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
alter table shift_notes enable row level security;
alter table calf_notes enable row level security;
alter table task_animals enable row level security;
alter table push_subscriptions enable row level security;

create policy "profiles_select_authenticated" on profiles for select to authenticated using (true);
create policy "profiles_update_own" on profiles for update to authenticated using (auth.uid() = id);
create policy "profiles_update_admin" on profiles for update to authenticated using (is_admin_user());

create policy "animals_select" on animals for select to authenticated using (true);
create policy "animals_insert" on animals for insert to authenticated with check (has_perm('animals'));
create policy "animals_update" on animals for update to authenticated using (has_perm('animals'));
create policy "animals_delete" on animals for delete to authenticated using (has_perm('animals'));

create policy "mastitis_treatments_select" on mastitis_treatments for select to authenticated using (true);
create policy "mastitis_treatments_insert" on mastitis_treatments for insert to authenticated with check (has_perm('mastitis'));
create policy "mastitis_treatments_update" on mastitis_treatments for update to authenticated using (has_perm('mastitis'));
create policy "mastitis_treatments_delete" on mastitis_treatments for delete to authenticated using (has_perm('mastitis'));

create policy "mastitis_doses_select" on mastitis_doses for select to authenticated using (true);
create policy "mastitis_doses_insert" on mastitis_doses for insert to authenticated with check (has_perm('mastitis'));
create policy "mastitis_doses_update" on mastitis_doses for update to authenticated using (has_perm('mastitis'));
create policy "mastitis_doses_delete" on mastitis_doses for delete to authenticated using (has_perm('mastitis'));

create policy "mastitis_protocols_select" on mastitis_protocols for select to authenticated using (true);
create policy "mastitis_protocols_insert" on mastitis_protocols for insert to authenticated with check (has_perm('mastitis'));
create policy "mastitis_protocols_update" on mastitis_protocols for update to authenticated using (has_perm('mastitis'));
create policy "mastitis_protocols_delete" on mastitis_protocols for delete to authenticated using (has_perm('mastitis'));

-- Gorevler: goruntuleme herkese acik. Olusturma/silme can_manage_tasks
-- gerektirir, ama bir gorevi tamamlama/yeniden acma (guncelleme) o goreve
-- atanan kisiye (ya da "Herkes" olarak atanmis gorevlerde herkese) her
-- zaman aciktir - yoksa calisanlar kendilerine atanan gorevleri bile
-- tamamlayamaz.
create policy "tasks_select" on tasks for select to authenticated using (true);
create policy "tasks_insert" on tasks for insert to authenticated with check (has_perm('tasks'));
create policy "tasks_update" on tasks for update to authenticated using (
  has_perm('tasks') or assigned_to = auth.uid() or assigned_to is null
);
create policy "tasks_delete" on tasks for delete to authenticated using (has_perm('tasks'));

create policy "task_animals_select" on task_animals for select to authenticated using (true);
create policy "task_animals_insert" on task_animals for insert to authenticated with check (has_perm('tasks'));
create policy "task_animals_update" on task_animals for update to authenticated using (true);
create policy "task_animals_delete" on task_animals for delete to authenticated using (has_perm('tasks'));

create policy "bulls_select" on bulls for select to authenticated using (true);
create policy "bulls_insert" on bulls for insert to authenticated with check (has_perm('bulls_semen'));
create policy "bulls_update" on bulls for update to authenticated using (has_perm('bulls_semen'));
create policy "bulls_delete" on bulls for delete to authenticated using (has_perm('bulls_semen'));

create policy "semen_inventory_select" on semen_inventory for select to authenticated using (true);
create policy "semen_inventory_insert" on semen_inventory for insert to authenticated with check (has_perm('bulls_semen'));
create policy "semen_inventory_update" on semen_inventory for update to authenticated using (has_perm('bulls_semen'));
create policy "semen_inventory_delete" on semen_inventory for delete to authenticated using (has_perm('bulls_semen'));

create policy "inseminations_select" on inseminations for select to authenticated using (true);
create policy "inseminations_insert" on inseminations for insert to authenticated with check (has_perm('inseminations'));
create policy "inseminations_update" on inseminations for update to authenticated using (has_perm('inseminations'));
create policy "inseminations_delete" on inseminations for delete to authenticated using (has_perm('inseminations'));

create policy "opu_sessions_select" on opu_sessions for select to authenticated using (true);
create policy "opu_sessions_insert" on opu_sessions for insert to authenticated with check (has_perm('opu'));
create policy "opu_sessions_update" on opu_sessions for update to authenticated using (has_perm('opu'));
create policy "opu_sessions_delete" on opu_sessions for delete to authenticated using (has_perm('opu'));

create policy "embryos_select" on embryos for select to authenticated using (true);
create policy "embryos_insert" on embryos for insert to authenticated with check (has_perm('opu'));
create policy "embryos_update" on embryos for update to authenticated using (has_perm('opu'));
create policy "embryos_delete" on embryos for delete to authenticated using (has_perm('opu'));

create policy "calf_feedings_select" on calf_feedings for select to authenticated using (true);
create policy "calf_feedings_insert" on calf_feedings for insert to authenticated with check (has_perm('calves'));
create policy "calf_feedings_update" on calf_feedings for update to authenticated using (has_perm('calves'));
create policy "calf_feedings_delete" on calf_feedings for delete to authenticated using (has_perm('calves'));

create policy "calf_notes_select" on calf_notes for select to authenticated using (true);
create policy "calf_notes_insert" on calf_notes for insert to authenticated with check (has_perm('calves'));
create policy "calf_notes_update" on calf_notes for update to authenticated using (has_perm('calves'));
create policy "calf_notes_delete" on calf_notes for delete to authenticated using (has_perm('calves'));

create policy "shift_notes_select" on shift_notes for select to authenticated using (true);
create policy "shift_notes_insert" on shift_notes for insert to authenticated with check (has_perm('calves'));
create policy "shift_notes_update" on shift_notes for update to authenticated using (has_perm('calves'));
create policy "shift_notes_delete" on shift_notes for delete to authenticated using (has_perm('calves'));

create policy "medicines_select" on medicines for select to authenticated using (true);
create policy "medicines_insert" on medicines for insert to authenticated with check (has_perm('medicines'));
create policy "medicines_update" on medicines for update to authenticated using (has_perm('medicines'));
create policy "medicines_delete" on medicines for delete to authenticated using (has_perm('medicines'));

-- Push abonelikleri: herkes sadece kendi cihazini yonetebilir (gonderim
-- ise Edge Function service-role anahtariyla yapildigi icin bu kisitlama
-- bildirim gonderimini etkilemez).
create policy "push_subscriptions_select" on push_subscriptions for select to authenticated using (profile_id = auth.uid());
create policy "push_subscriptions_insert" on push_subscriptions for insert to authenticated with check (profile_id = auth.uid());
create policy "push_subscriptions_update" on push_subscriptions for update to authenticated using (profile_id = auth.uid());
create policy "push_subscriptions_delete" on push_subscriptions for delete to authenticated using (profile_id = auth.uid());

-- Gorev fotograflari (referans + tamamlama kaniti) icin storage bucket'i.
-- Public bucket: link tahmin edilemez (rastgele dosya adi) oldugu icin yeterli,
-- boylece imzali URL yenileme mantigi gerekmiyor.
insert into storage.buckets (id, name, public)
values ('task-images', 'task-images', true)
on conflict (id) do nothing;

create policy "task_images_insert_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'task-images');

create policy "task_images_select_public" on storage.objects
  for select to public using (bucket_id = 'task-images');
