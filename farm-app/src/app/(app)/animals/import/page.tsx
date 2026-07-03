"use client";

import { useState } from "react";
import ExcelJS from "exceljs";
import { createAnimalsBulk } from "@/lib/data";
import { Animal } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function ImportAnimalsPage() {
  const { profile } = useAuth();
  const [earTags, setEarTags] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [weanStatus, setWeanStatus] = useState<"yetiskin" | "buzagi">("yetiskin");
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setResult(null);
    setEarTags([]);
    setFileName(file.name);
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error("Dosyada sayfa bulunamadi.");
      const tags: string[] = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const cellValue = row.getCell(1).value;
        const text =
          cellValue === null || cellValue === undefined ? "" : String(cellValue).trim();
        if (text) tags.push(text);
      });
      const unique = Array.from(new Set(tags));
      if (unique.length === 0) throw new Error("Ilk sutunda kupe numarasi bulunamadi.");
      setEarTags(unique);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dosya okunamadi.");
    } finally {
      setParsing(false);
    }
  }

  async function handleImport() {
    if (!profile || earTags.length === 0) return;
    setImporting(true);
    setError(null);
    setResult(null);
    try {
      const weanedAt = weanStatus === "yetiskin" ? new Date().toISOString().slice(0, 10) : null;
      const inputs: Omit<Animal, "id" | "created_at" | "updated_at">[] = earTags.map((ear_tag) => ({
        ear_tag,
        name: null,
        birth_date: null,
        breed: null,
        gender: null,
        status: "aktif",
        mother_ear_tag: null,
        weaned_at: weanedAt,
        notes: null,
        created_by: profile.id,
      }));
      const inserted = await createAnimalsBulk(inputs);
      const skipped = earTags.length - inserted;
      setResult(
        `${inserted} yeni hayvan eklendi.` +
          (skipped > 0 ? ` ${skipped} kupe numarasi zaten kayitliydi, atlandi.` : "")
      );
      setEarTags([]);
      setFileName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ice aktarilirken bir hata olustu.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <h1 className="text-lg font-semibold text-neutral-900">Excel&apos;den Hayvan Aktar</h1>
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-neutral-700">Excel dosyasi (.xlsx)</span>
          <input type="file" accept=".xlsx" onChange={handleFile} className="input" />
          <span className="mt-1 block text-xs text-neutral-400">
            Ilk sutun kupe numarasi olarak okunur, ilk satir baslik kabul edilir.
          </span>
        </label>

        {parsing && <p className="text-sm text-neutral-500">Dosya okunuyor...</p>}

        {earTags.length > 0 && (
          <>
            <p className="text-sm text-neutral-700">
              <strong>{fileName}</strong> icinde <strong>{earTags.length}</strong> benzersiz kupe
              numarasi bulundu.
            </p>
            <div className="max-h-32 overflow-y-auto rounded-md border border-neutral-200 p-2 text-xs text-neutral-500">
              {earTags.slice(0, 40).join(", ")}
              {earTags.length > 40 && ` ... ve ${earTags.length - 40} tane daha`}
            </div>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-neutral-700">
                Bu hayvanlar hangi durumda eklensin?
              </span>
              <select
                value={weanStatus}
                onChange={(e) => setWeanStatus(e.target.value as "yetiskin" | "buzagi")}
                className="input"
              >
                <option value="yetiskin">Yetiskin / sutten kesilmis</option>
                <option value="buzagi">Buzagi / sutten kesilmemis</option>
              </select>
            </label>

            <button
              onClick={handleImport}
              disabled={importing}
              className="rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800 disabled:opacity-60"
            >
              {importing ? "Aktariliyor..." : `${earTags.length} hayvani ice aktar`}
            </button>
          </>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && <p className="text-sm text-green-700">{result}</p>}
      </div>
    </div>
  );
}
