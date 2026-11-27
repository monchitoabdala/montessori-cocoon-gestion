"use client";

import { Avatar } from "@/components/school/Avatar";
import { GroupedSelect, type GroupedSelectGroup } from "@/components/school/GroupedSelect";
import { useCallback, useEffect, useMemo, useState } from "react";

interface DivisionItem {
  id: string;
  name: string;
  grade: {
    id: string;
    name: string;
    level: { name: string };
  };
}

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
  gradeId: string;
  divisionId: string | null;
}

interface StudentItem {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  photoUrl?: string | null;
}

interface GradeRecordItem {
  studentId: string;
  score: string | number;
  observations: string | null;
}

const TERMS = ["1er Trimestre", "2do Trimestre", "3er Trimestre", "Anual"];

export default function AdminBoletinesPage() {
  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [divisionId, setDivisionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [term, setTerm] = useState(TERMS[0]);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [entries, setEntries] = useState<
    Record<string, { score: string; observations: string }>
  >({});

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    async function loadStructure() {
      const res = await fetch("/api/structure", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        const divs: DivisionItem[] = json.divisions ?? [];
        const subs: SubjectItem[] = json.subjects ?? [];
        setDivisions(divs);
        setSubjects(subs);
        if (divs.length > 0) {
          setDivisionId(divs[0].id);
        }
      }
    }
    void loadStructure();
  }, []);

  const availableSubjects = useMemo(() => {
    const selectedDiv = divisions.find((d) => d.id === divisionId);
    if (!selectedDiv) return subjects;
    return subjects.filter(
      (s) =>
        s.divisionId === selectedDiv.id ||
        (!s.divisionId && s.gradeId === selectedDiv.grade.id),
    );
  }, [divisionId, divisions, subjects]);

  useEffect(() => {
    if (availableSubjects.length === 0) {
      setSubjectId("");
    } else if (!availableSubjects.some((s) => s.id === subjectId)) {
      setSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects, subjectId]);

  const loadGrades = useCallback(async () => {
    if (!divisionId || !subjectId || !term) {
      setStudents([]);
      setEntries({});
      return;
    }
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const [studRes, gradeRes] = await Promise.all([
        fetch(
          `/api/students?divisionId=${encodeURIComponent(divisionId)}&status=ACTIVE`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/grades?divisionId=${encodeURIComponent(divisionId)}&subjectId=${encodeURIComponent(subjectId)}&term=${encodeURIComponent(term)}`,
          { cache: "no-store" },
        ),
      ]);

      const studJson = await studRes.json();
      const gradeJson = await gradeRes.json();
      if (!studRes.ok) {
        throw new Error(studJson.error || "Error al cargar alumnos");
      }
      if (!gradeRes.ok) {
        throw new Error(gradeJson.error || "Error al cargar calificaciones");
      }

      const list: StudentItem[] = studJson.students ?? [];
      const records: GradeRecordItem[] = gradeJson.gradeRecords ?? [];
      const recordMap = new Map(records.map((r) => [r.studentId, r]));

      const nextEntries: Record<
        string,
        { score: string; observations: string }
      > = {};
      for (const st of list) {
        const match = recordMap.get(st.id);
        nextEntries[st.id] = {
          score: match ? String(Number(match.score)) : "",
          observations: match?.observations ?? "",
        };
      }

      setStudents(list);
      setEntries(nextEntries);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar boletines",
      );
    } finally {
      setLoading(false);
    }
  }, [divisionId, subjectId, term]);

  useEffect(() => {
    void loadGrades();
  }, [loadGrades]);

  function updateEntry(
    studentId: string,
    field: "score" | "observations",
    value: string,
  ) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        score: prev[studentId]?.score ?? "",
        observations: prev[studentId]?.observations ?? "",
        [field]: value,
      },
    }));
  }

  async function handleSave() {
    if (!subjectId || !term) return;
    const recordsToSave = students
      .map((st) => {
        const entry = entries[st.id];
        if (!entry || entry.score.trim() === "") return null;
        return {
          studentId: st.id,
          score: Number(entry.score),
          observations: entry.observations.trim() || null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (recordsToSave.length === 0) {
      setError("Ingresá al menos una calificación antes de guardar.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId,
          term,
          records: recordsToSave,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Error al guardar calificaciones");
      }

      setFeedback(
        `Boletín guardado: ${json.updated} calificaciones actualizadas.`,
      );
      await loadGrades();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar calificaciones",
      );
    } finally {
      setSaving(false);
    }
  }

  const divisionGroups = useMemo<GroupedSelectGroup[]>(() => {
    const map = new Map<string, GroupedSelectGroup>();
    for (const d of divisions) {
      const levelName = d.grade.level.name;
      if (!map.has(levelName)) {
        map.set(levelName, { label: levelName, options: [] });
      }
      map.get(levelName)!.options.push({
        value: d.id,
        label: `${d.grade.name} ${d.name}`,
      });
    }
    return Array.from(map.values());
  }, [divisions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || students.length === 0 || !subjectId}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar Boletín"}
        </button>
      </div>

      {feedback ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {feedback}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            División
          </label>
          <GroupedSelect
            value={divisionId}
            onChange={setDivisionId}
            groups={divisionGroups}
            placeholder="Seleccionar división..."
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Materia
          </label>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            {availableSubjects.length === 0 ? (
              <option value="">Sin materias asignadas</option>
            ) : (
              availableSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} {sub.code ? `(${sub.code})` : ""}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Período
          </label>
          <select
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
          >
            {TERMS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/70 text-xs font-medium text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              <tr>
                <th className="px-5 py-3">Legajo</th>
                <th className="px-5 py-3">Alumno</th>
                <th className="px-5 py-3">Nota (0 a 10)</th>
                <th className="px-5 py-3">Observaciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    Cargando calificaciones...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-8 text-center text-sm text-gray-500"
                  >
                    No hay alumnos activos para mostrar.
                  </td>
                </tr>
              ) : (
                students.map((st) => {
                  const entry = entries[st.id] ?? {
                    score: "",
                    observations: "",
                  };
                  return (
                    <tr key={st.id}>
                      <td className="px-5 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {st.legajo}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <Avatar
                            src={st.photoUrl}
                            name={`${st.firstName} ${st.lastName}`}
                            size="sm"
                          />
                          <span>
                            {st.lastName}, {st.firstName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.25"
                          value={entry.score}
                          onChange={(e) =>
                            updateEntry(st.id, "score", e.target.value)
                          }
                          placeholder="0 - 10"
                          className="w-28 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={entry.observations}
                          onChange={(e) =>
                            updateEntry(st.id, "observations", e.target.value)
                          }
                          placeholder="Desempeño o comentarios..."
                          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
