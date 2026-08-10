-- OPU sayfasinin yeni "gun havuzu" tasarimi icin gerekli tablo/sutun eklemeleri.
-- Supabase Dashboard -> SQL Editor -> New query -> bu dosyanin tamamini
-- yapistirin -> "Run" butonuna basin. Guvenlidir, mevcut verilerinize
-- dokunmaz (IF NOT EXISTS kullanildigi icin birden fazla kez calistirilsa
-- bile hata vermez). Eski OPU kayitlariniz oldugu gibi kalir, sadece yeni
-- girilenler gun havuzuna baglanir.

-- 1) Bir gunde yapilan tum OPU'lari (donorleri) tek havuzda toplayan tablo
create table if not exists opu_batches (
  id uuid primary key default gen_random_uuid(),
  batch_date date not null unique,
  maturation_count integer check (maturation_count >= 0),
  embryo_count integer check (embryo_count >= 0),
  notes text,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) opu_sessions'i havuza baglayan sutun (eski kayitlar icin null kalir)
alter table opu_sessions add column if not exists batch_id uuid references opu_batches (id) on delete cascade;
create index if not exists opu_sessions_batch_idx on opu_sessions (batch_id);

-- 3) Guvenlik (RLS) ayarlari - digerleriyle ayni kural: herkes gorebilir,
-- sadece "OPU/Embriyo" yetkisi olanlar ekleyip degistirebilir/silebilir.
alter table opu_batches enable row level security;

create policy "opu_batches_select" on opu_batches for select to authenticated using (true);
create policy "opu_batches_insert" on opu_batches for insert to authenticated with check (has_perm('opu'));
create policy "opu_batches_update" on opu_batches for update to authenticated using (has_perm('opu'));
create policy "opu_batches_delete" on opu_batches for delete to authenticated using (has_perm('opu'));
