import { Profile } from "./types";

export type PermissionKey =
  | "can_manage_animals"
  | "can_manage_mastitis"
  | "can_manage_tasks"
  | "can_manage_bulls_semen"
  | "can_manage_inseminations"
  | "can_manage_opu"
  | "can_manage_calves"
  | "can_manage_medicines"
  | "can_send_announcements";

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_manage_animals: "Hayvan kayıtları (ekleme, içe aktarma)",
  can_manage_mastitis: "Mastitis kayıtları",
  can_manage_tasks: "Görev oluşturma ve atama",
  can_manage_bulls_semen: "Boğa ve sperma stoğu",
  can_manage_inseminations: "Tohumlama kayıtları",
  can_manage_opu: "OPU/Embriyo kayıtları",
  can_manage_calves: "Buzağı besleme ve not kayıtları",
  can_manage_medicines: "İlaç stoğu",
  can_send_announcements: "Duyuru ve hatırlatma bildirimi gönderme",
};

export const PERMISSION_KEYS = Object.keys(PERMISSION_LABELS) as PermissionKey[];

export function hasPermission(profile: Profile | null, key: PermissionKey): boolean {
  if (!profile) return false;
  return profile.is_admin || !!profile[key];
}
