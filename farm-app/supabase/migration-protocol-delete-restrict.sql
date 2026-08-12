-- Buzagi tedavi protokolleri icin "protokol silme" ozelligi.
-- Bir protokol daha once bir tedavi kurunde kullanildiysa silinememeli
-- (gecmis tedavi verisi kaybolmasin diye). Bu yuzden
-- calf_treatment_courses.protocol_id icin "on delete cascade" yerine
-- "on delete restrict" kullaniyoruz. calf_protocol_days ("protokol gunleri",
-- yani protokolun icerigi) icin cascade davranisi degismiyor - protokol
-- silindiginde kendi gunleri de silinir, bu zararsizdir.
alter table calf_treatment_courses drop constraint if exists calf_treatment_courses_protocol_id_fkey;
alter table calf_treatment_courses add constraint calf_treatment_courses_protocol_id_fkey
  foreign key (protocol_id) references calf_protocols (id) on delete restrict;
