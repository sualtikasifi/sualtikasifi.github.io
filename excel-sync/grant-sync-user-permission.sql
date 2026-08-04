-- Excel senkronizasyon kullanicisina buzagi tedavilerini ekleyip
-- silebilme (can_manage_calves) yetkisi verir.
--
-- Once Supabase Dashboard > Authentication > Users > "Add user" ile
-- 'excel-sync@marder-ciftlik.local' (ya da kendi sectiginiz baska bir
-- e-posta) icin bir kullanici olusturun, guclu bir sifre verin ve
-- "Auto Confirm User" kutusunu isaretleyin. Sonra asagidaki sorguda
-- e-postayi kendi girdiginizle degistirip Supabase SQL Editor'de bir
-- kez calistirin.

update profiles
set can_manage_calves = true,
    full_name = coalesce(full_name, 'Excel Senkron')
where id = (select id from auth.users where email = 'excel-sync@marder-ciftlik.local');

-- Kontrol: 1 satir donmeli ve can_manage_calves=true olmali.
select id, full_name, can_manage_calves
from profiles
where id = (select id from auth.users where email = 'excel-sync@marder-ciftlik.local');
