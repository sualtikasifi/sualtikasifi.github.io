"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  deleteInsemination,
  listAnimals,
  listBulls,
  listInseminations,
  listProfiles,
  listSemenInventory,
  updateInsemination,
} from "@/lib/data";
import { Animal, Bull, Insemination, PregnancyResult, Profile, SemenInventory, SemenType } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

export default function InseminationsPage() {
  const [inseminations, setInseminations] = useState<Insemination[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [inventory, setInventory] = useState<SemenInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  function loadData() {
    return Promise.all([listInseminations(), listAnimals(), listBulls(), listProfiles(), listSemenInventory()]);
  }

  useEffect(() => {
    loadData().then(([i, a, b, p, inv]) => {
      setInseminations(i);
      setAnimals(a);
      setBulls(b);
      setProfiles(p);
      setInventory(inv);
      setLoading(false);
    });
  }, []);

  async function refresh() {
    const [i, a, b, p, inv] = await loadData();
    setInseminations(i);
    setAnimals(a);
    setBulls(b);
    setProfiles(p);
    setInventory(inv);
  }

  const earTagFor = (animalId: string) => animals.find((a) => a.id === animalId)?.ear_tag ?? "?";
  const bullNameFor = (bullId: string | null) => (bullId ? bulls.find((b) => b.id === bullId)?.name ?? "?" : "-");

  const sortedInseminations = [...inseminations].sort((a, b) => b.created_at.localeCompare(a.created_at));

  async function handleDelete(id: string) {
    await deleteInsemination(id);
    setConfirmingDeleteId(null);
    await refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Tohumlamalar</h1>
        <Link href="/inseminations/new" className="rounded-md bg-green-700 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-green-800">
          Yeni tohumlama
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-500">Yükleniyor...</p>
      ) : inseminations.length === 0 ? (
        <p className="text-sm text-neutral-400">Kayıt yok.</p>
      ) : (
        <div className="card-list">
          {sortedInseminations.map((i) => (
            <div key={i.id} className="border-b border-neutral-100 px-4 py-3 text-sm last:border-b-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{earTagFor(i.animal_id)}</span>
                  <span className="text-neutral-500">{bullNameFor(i.bull_id)}</span>
                  {i.semen_type && <Badge value={i.semen_type} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-neutral-400">{formatDate(i.insemination_date)}</span>
                  {i.pregnancy_result === "gebe" && <Badge value={i.pregnancy_result} />}
                </div>
              </div>
              {i.technician_name && <p className="mt-1 text-neutral-500">Tohumlayıcı: {i.technician_name}</p>}
              {i.pregnancy_check_date && (
                <p className="text-neutral-500">Gebelik kontrol tarihi: {formatDate(i.pregnancy_check_date)}</p>
              )}
              {i.notes && <p className="text-neutral-500">{i.notes}</p>}

              {editingId === i.id ? (
                <EditInseminationForm
                  insemination={i}
                  bulls={bulls}
                  profiles={profiles}
                  inventory={inventory}
                  onCancel={() => setEditingId(null)}
                  onSaved={async () => {
                    setEditingId(null);
                    await refresh();
                  }}
                />
              ) : confirmingDeleteId === i.id ? (
                <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">Bu tohumlama kaydını silmek istediğinize emin misiniz?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleDelete(i.id)}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-red-700"
                    >
                      Evet, sil
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDeleteId(null)}
                      className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50"
                    >
                      Vazgeç
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(i.id)}
                    className="text-xs font-medium text-green-700 hover:underline"
                  >
                    Düzenle
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(i.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    Sil
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditInseminationForm({
  insemination,
  bulls,
  profiles,
  inventory,
  onCancel,
  onSaved,
}: {
  insemination: Insemination;
  bulls: Bull[];
  profiles: Profile[];
  inventory: SemenInventory[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [bullId, setBullId] = useState(insemination.bull_id ?? "");
  const [semenType, setSemenType] = useState<SemenType>(insemination.semen_type ?? "konvansiyonel");
  const [date, setDate] = useState(insemination.insemination_date);
  const [technicianName, setTechnicianName] = useState(insemination.technician_name ?? "");
  const [pregnancyResult, setPregnancyResult] = useState<PregnancyResult>(insemination.pregnancy_result);
  const [pregnancyCheckDate, setPregnancyCheckDate] = useState(insemination.pregnancy_check_date ?? "");
  const [notes, setNotes] = useState(insemination.notes ?? "");
  const [saving, setSaving] = useState(false);

  function stockFor(id: string, type: SemenType) {
    const row = inventory.find((i) => i.bull_id === id && i.semen_type === type);
    return (row?.straw_count ?? 0) + (row?.tank_straw_count ?? 0);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await updateInsemination(insemination.id, {
      bull_id: bullId || null,
      semen_type: bullId ? semenType : null,
      insemination_date: date,
      technician_name: technicianName.trim() || null,
      pregnancy_result: pregnancyResult,
      pregnancy_check_date: pregnancyCheckDate || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    onSaved();
  }

  return (
    <form onSubmit={handleSave} className="mt-3 space-y-3 rounded-md border border-neutral-200 bg-neutral-50 p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Boğa</span>
          <select value={bullId} onChange={(e) => setBullId(e.target.value)} className="input">
            <option value="">Seçilmedi</option>
            {bulls.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Sperma türü</span>
          <select
            value={semenType}
            onChange={(e) => setSemenType(e.target.value as SemenType)}
            disabled={!bullId}
            className="input"
          >
            <option value="konvansiyonel">
              Konvansiyonel {bullId && `(${stockFor(bullId, "konvansiyonel")} straw)`}
            </option>
            <option value="disi">Dişi {bullId && `(${stockFor(bullId, "disi")} straw)`}</option>
          </select>
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Tarih</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
      </label>

      <div>
        <span className="mb-1 block text-xs font-medium text-neutral-600">Tohumlayıcı</span>
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setTechnicianName(p.full_name)}
              className={`chip ${technicianName === p.full_name ? "chip-selected" : "chip-unselected"}`}
            >
              {p.full_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Gebelik durumu</span>
          <select
            value={pregnancyResult}
            onChange={(e) => setPregnancyResult(e.target.value as PregnancyResult)}
            className="input"
          >
            <option value="bekleniyor">Bekleniyor</option>
            <option value="gebe">Gebe</option>
            <option value="gebe_degil">Gebe değil</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Gebelik kontrol tarihi</span>
          <input
            type="date"
            value={pregnancyCheckDate}
            onChange={(e) => setPregnancyCheckDate(e.target.value)}
            className="input"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-600">Notlar</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input" rows={2} />
      </label>

      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary text-xs">
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs transition-colors hover:bg-neutral-50"
        >
          Vazgeç
        </button>
      </div>
    </form>
  );
}
