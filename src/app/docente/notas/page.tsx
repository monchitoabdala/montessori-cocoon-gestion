"use client";

import { KpiCard } from "@/components/school/KpiCard";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

function IconSave({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7M7 3v4a1 1 0 0 0 1 1h7" />
    </svg>
  );
}
function IconUsers({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconBook({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
function IconAward({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="6" />
      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
    </svg>
  );
}

interface DivisionItem {
  id: string;
  name: string;
  grade: {
    id: string;
    name: string;
    level: { id: string; name: string };
  };
  subjects: Array<{
    id: string;
    name: string;
    code: string | null;
  }>;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string | null;
  division: { id: string; name: string } | null;
}

interface StudentItem {
  id: string;
  legajo: string;
  firstName: string;
  lastName: string;
  dni: string;
}

interface GradeRecordItem {
  studentId: string;
  score: number | string;
  observations: string | null;
}

const TERMS = ["1er Trimestre", "2do Trimestre", "3er Trimestre"];

function NotasContent() {
  const searchParams = useSearchParams();
  const initialDivisionId = searchParams.get("divisionId") ?? "";
  const initialSubjectId = searchParams.get("subjectId") ?? "";

  const [divisions, setDivisions] = useState<DivisionItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);

  const [selectedDivisionId, setSelectedDivisionId] = useState(initialDivisionId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [selectedTerm, setSelectedTerm] = useState(TERMS[0]);

  const [students, setStudents] = useState<StudentItem[]>([]);
  const [scoreMap, setScoreMap] = useState<Record<string, string>>({});
  const [obsMap, setObsMap] = useState<Record<string, string>>({});

  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadStructure() {
      setLoadingInit(true);
      try {
        const res = await fetch("/api/structure?mine=true", {
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Error al cargar materias asignadas");
        }
        if (!active) return;

        const divs: DivisionItem[] = json.divisions ?? [];
        const subjs: SubjectItem[] = json.subjects ?? [];
        setDivisions(divs);
        setSubjects(subjs);

        const defaultDiv =
          initialDivisionId && divs.some((d) => d.id === initialDivisionId)
            ? initialDivisionId
            : (divs[0]?.id ?? "");
        setSelectedDivisionId(defaultDiv);

        const matchingSubjects = subjs.filter(
          (s) => s.division?.id === defaultDiv,
        );
        const defaultSubj =
          initialSubjectId && subjs.some((s) => s.id === initialSubjectId)
            ? initialSubjectId
            : (matchingSubjects[0]?.id ?? subjs[0]?.id ?? "");
        setSelectedSubjectId(defaultSubj);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Error al cargar estructura",
          );
        }
      } finally {
        if (active) setLoadingInit(false);
      }
    }
    void loadStructure();
    return () => {
      active = false;
    };
  }, [initialDivisionId, initialSubjectId]);

  const availableSubjects = useMemo(() => {
    if (!selectedDivisionId) return subjects;
    const filtered = subjects.filter(
      (s) => s.division?.id === selectedDivisionId,
    );
    return filtered.length > 0 ? filtered : subjects;
  }, [subjects, selectedDivisionId]);

  useEffect(() => {
    if (
      availableSubjects.length > 0 &&
      !availableSubjects.some((s) => s.id === selectedSubjectId)
    ) {
      setSelectedSubjectId(availableSubjects[0].id);
    }
  }, [availableSubjects, selectedSubjectId]);

  const loadStudentsAndGrades = useCallback(async () => {
    if (!selectedDivisionId || !selectedSubjectId || !selectedTerm) {
      setStudents([]);
      return;
    }
    setLoadingData(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const [studentsRes, gradesRes] = await Promise.all([
        fetch(
          `/api/students?divisionId=${encodeURIComponent(selectedDivisionId)}&status=ACTIVE`,
          { cache: "no-store" },
        ),
        fetch(
          `/api/grades?divisionId=${encodeURIComponent(selectedDivisionId)}&subjectId=${encodeURIComponent(selectedSubjectId)}&term=${encodeURIComponent(selectedTerm)}`,
          { cache: "no-store" },
        ),
      ]);

      const studentsJson = await studentsRes.json();
      const gradesJson = await gradesRes.json();

      if (!studentsRes.ok) {
        throw new Error(studentsJson?.error || "Error al cargar alumnos");
      }
      if (!gradesRes.ok) {
        throw new Error(gradesJson?.error || "Error al cargar notas");
      }

      const studentList: StudentItem[] = studentsJson.students ?? [];
      const gradeList: GradeRecordItem[] = gradesJson.gradeRecords ?? [];

      const byStudent = new Map<string, GradeRecordItem>();
      for (const g of gradeList) {
        byStudent.set(g.studentId, g);
      }

      const nextScores: Record<string, string> = {};
      const nextObs: Record<string, string> = {};
      for (const st of studentList) {
        const rec = byStudent.get(st.id);
        nextScores[st.id] =
          rec && rec.score !== undefined && rec.score !== null
            ? String(Number(rec.score))
            : "";
        nextObs[st.id] = rec?.observations ?? "";
      }

      setStudents(studentList);
      setScoreMap(nextScores);
      setObsMap(nextObs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al cargar calificaciones",
      );
    } finally {
      setLoadingData(false);
    }
  }, [selectedDivisionId, selectedSubjectId, selectedTerm]);

  useEffect(() => {
    if (!loadingInit && selectedDivisionId && selectedSubjectId) {
      void loadStudentsAndGrades();
    }
  }, [loadingInit, selectedDivisionId, selectedSubjectId, selectedTerm, loadStudentsAndGrades]);

  const stats = useMemo(() => {
    const validScores: number[] = [];
    for (const st of students) {
      const raw = scoreMap[st.id]?.trim();
      if (!raw) continue;
      const num = Number(raw);
      if (Number.isFinite(num) && num >= 0 && num <= 10) {
        validScores.push(num);
      }
    }
    const avg =
      validScores.length > 0
        ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(2)
        : "0.00";
    return {
      total: students.length,
      loaded: validScores.length,
      average: avg,
    };
  }, [students, scoreMap]);

  async function handleSave() {
    if (!selectedSubjectId || !selectedTerm) return;
    setError(null);
    setSuccessMsg(null);

    const records: Array<{
      studentId: string;
      score: number;
      observations: string | null;
    }> = [];

    for (const st of students) {
      const raw = scoreMap[st.id]?.trim();
      if (!raw) continue;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) {
        setError(
          `Nota invalida para ${st.lastName}, ${st.firstName}. Debe estar entre 0 y 10.`,
        );
        return;
      }
      records.push({
        studentId: st.id,
        score: parsed,
        observations: obsMap[st.id]?.trim() || null,
      });
    }

    if (records.length === 0) {
      setError("Ingresa al menos una nota valida antes de guardar.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: selectedSubjectId,
          term: selectedTerm,
          records,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "No se pudieron guardar las notas");
      }
      setSuccessMsg(
        `Boletin guardado: ${json.updated ?? records.length} calificaciones actualizadas para ${selectedTerm}.`,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al guardar calificaciones",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || loadingData || students.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-brand-600 bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <IconSave className="size-4" />
          {saving ? "Guardando..." : "Guardar boletin"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-3 dark:border-gray-800 dark:bg-white/[0.03]">
        <div>
          <label
            htmlFor="grades-division"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Division
          </label>
          <select
            id="grades-division"
            value={selectedDivisionId}
            onChange={(e) => setSelectedDivisionId(e.target.value)}
            disabled={loadingInit}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {divisions.length === 0 ? (
              <option value="">Sin divisiones</option>
            ) : null}
            {divisions.map((div) => (
              <option key={div.id} value={div.id}>
                {div.grade.level.name} · {div.grade.name} {div.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="grades-subject"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Materia
          </label>
          <select
            id="grades-subject"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            disabled={loadingInit}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {availableSubjects.length === 0 ? (
              <option value="">Sin materias asignadas</option>
            ) : null}
            {availableSubjects.map((subj) => (
              <option key={subj.id} value={subj.id}>
                {subj.name} {subj.code ? `(${subj.code})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="grades-term"
            className="block text-xs font-medium text-gray-600 dark:text-gray-400"
          >
            Periodo
          </label>
          <select
            id="grades-term"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {TERMS.map((term) => (
              <option key={term} value={term}>
                {term}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {successMsg ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          {successMsg}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          title="Alumnos en curso"
          value={stats.total}
          icon={<IconUsers className="size-4" />}
        />
        <KpiCard
          title="Notas cargadas"
          value={`${stats.loaded} / ${stats.total}`}
          icon={<IconBook className="size-4" />}
        />
        <KpiCard
          title="Promedio del curso"
          value={stats.average}
          subtitle="Sobre notas cargadas (0 a 10)"
          icon={<IconAward className="size-4" />}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        {loadingData ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Cargando planilla de calificaciones...
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay alumnos activos para la combinacion seleccionada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Legajo</th>
                  <th className="px-4 py-3 font-medium">Alumno</th>
                  <th className="px-4 py-3 font-medium">Nota (0 a 10)</th>
                  <th className="px-4 py-3 font-medium">Condicion</th>
                  <th className="px-4 py-3 font-medium">Observaciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((st) => {
                  const rawScore = scoreMap[st.id] ?? "";
                  const numScore = rawScore.trim() ? Number(rawScore) : null;
                  const isValid =
                    numScore !== null &&
                    Number.isFinite(numScore) &&
                    numScore >= 0 &&
                    numScore <= 10;

                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-gray-50/70 dark:hover:bg-white/[0.02]"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-500 dark:text-gray-400">
                        {st.legajo}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {st.lastName}, {st.firstName}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min={0}
                          max={10}
                          step={0.5}
                          value={rawScore}
                          onChange={(e) => {
                            const val = e.target.value;
                            setScoreMap((prev) => ({ ...prev, [st.id]: val }));
                            setSuccessMsg(null);
                          }}
                          placeholder="0 a 10"
                          className="w-28 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        {!isValid ? (
                          <span className="inline-flex items-center rounded-md border border-gray-200 bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
                            Sin cargar
                          </span>
                        ) : numScore >= 6 ? (
                          <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
                            Aprobado
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                            En proceso
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={obsMap[st.id] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setObsMap((prev) => ({ ...prev, [st.id]: val }));
                            setSuccessMsg(null);
                          }}
                          placeholder="Observacion para el boletin..."
                          className="w-full min-w-[200px] rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DocenteNotasPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
          Cargando modulo de notas...
        </div>
      }
    >
      <NotasContent />
    </Suspense>
  );
}
