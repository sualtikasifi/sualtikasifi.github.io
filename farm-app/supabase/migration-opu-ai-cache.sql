-- AI OPU Asistan cevabini onbelleklemek icin gerekli sutun eklemeleri.
-- Supabase Dashboard -> SQL Editor -> New query -> bu dosyanin tamamini
-- yapistirin -> "Run" butonuna basin. Guvenlidir, mevcut verilerinize
-- dokunmaz (IF NOT EXISTS kullanildigi icin birden fazla kez calistirilsa
-- bile hata vermez).

alter table opu_batches add column if not exists ai_analysis text;
alter table opu_batches add column if not exists ai_analysis_generated_at timestamptz;
