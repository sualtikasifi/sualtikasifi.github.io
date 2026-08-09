-- Embriyo Transferleri sayfasi icin gerekli tablo/sutun eklemeleri.
-- Supabase Dashboard -> SQL Editor -> New query -> bu dosyanin tamamini
-- yapistirin -> "Run" butonuna basin. Guvenlidir, mevcut verilerinize
-- dokunmaz (IF NOT EXISTS kullanildigi icin birden fazla kez calistirilsa
-- bile hata vermez).

-- 1) embryos tablosuna 3 yeni sutun: transferi yapan kisi + gebelik teshisi
alter table embryos add column if not exists transfer_technician_name text;
alter table embryos add column if not exists pregnancy_check_date date;
alter table embryos add column if not exists pregnancy_result text not null default 'bekleniyor' check (pregnancy_result in ('bekleniyor', 'gebe', 'gebe_degil'));

-- 2) Ileri tarihli transfer planlari icin yeni tablo
create table if not exists planned_embryo_transfers (
  id uuid primary key default gen_random_uuid(),
  recipient_animal_id uuid not null references animals (id) on delete cascade,
  planned_date date not null,
  notes text,
  task_id uuid references tasks (id) on delete set null,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index if not exists planned_embryo_transfers_recipient_idx on planned_embryo_transfers (recipient_animal_id);
create index if not exists planned_embryo_transfers_date_idx on planned_embryo_transfers (planned_date);

-- 3) Guvenlik (RLS) ayarlari - digerleriyle ayni kural: herkes gorebilir,
-- sadece "OPU/Embriyo" yetkisi olanlar ekleyip degistirebilir/silebilir.
alter table planned_embryo_transfers enable row level security;

create policy "planned_embryo_transfers_select" on planned_embryo_transfers for select to authenticated using (true);
create policy "planned_embryo_transfers_insert" on planned_embryo_transfers for insert to authenticated with check (has_perm('opu'));
create policy "planned_embryo_transfers_update" on planned_embryo_transfers for update to authenticated using (has_perm('opu'));
create policy "planned_embryo_transfers_delete" on planned_embryo_transfers for delete to authenticated using (has_perm('opu'));
