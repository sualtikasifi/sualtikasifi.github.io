-- Izin Takvimi sayfasi icin gerekli tablo/sutun eklemeleri.
-- Supabase Dashboard -> SQL Editor -> New query -> bu dosyanin tamamini
-- yapistirin -> "Run" butonuna basin. Guvenlidir, mevcut verilerinize
-- dokunmaz (IF NOT EXISTS kullanildigi icin birden fazla kez calistirilsa
-- bile hata vermez).

-- 1) Izin taleplerini onaylama/reddetme yetkisi (varsayilan kapali - "Ekip
-- ve Yetkiler" sayfasindan istediginiz kisiye acabilirsiniz; yoneticiler
-- zaten her zaman onaylayabilir).
alter table profiles add column if not exists can_approve_leave boolean not null default false;

-- 2) Izin talepleri tablosu
create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  status text not null default 'bekliyor' check (status in ('bekliyor', 'onaylandi', 'reddedildi')),
  note text,
  reviewed_by uuid references profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists leave_requests_user_idx on leave_requests (user_id);
create index if not exists leave_requests_date_idx on leave_requests (start_date, end_date);

-- 3) has_perm('approve_leave') destegi - RLS politikalarinda kullanilir.
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
      when 'approve_leave' then can_approve_leave
      else false
    end
    from profiles where id = auth.uid()),
    false
  );
$$;

-- 4) Yonetici olmayan bir kullanicinin kendi profilindeki yetki alanlarini
-- (can_approve_leave dahil) degistirmesini engelleyen fonksiyonu gunceller.
create or replace function enforce_profile_permission_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is not null and not is_admin_user() then
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
    new.can_approve_leave := old.can_approve_leave;
  end if;
  return new;
end;
$$;

-- 5) Guvenlik (RLS) ayarlari - herkes tum talepleri gorebilir (takvimde
-- isim gorunmesi icin), kendi talebini olusturabilir/silebilir, onaylama
-- yetkisi olanlar (veya yoneticiler) herhangi bir talebi guncelleyip
-- silebilir.
alter table leave_requests enable row level security;

create policy "leave_requests_select" on leave_requests for select to authenticated using (true);
create policy "leave_requests_insert" on leave_requests for insert to authenticated with check (user_id = auth.uid());
create policy "leave_requests_update" on leave_requests for update to authenticated using (user_id = auth.uid() or has_perm('approve_leave'));
create policy "leave_requests_delete" on leave_requests for delete to authenticated using (user_id = auth.uid() or has_perm('approve_leave'));
