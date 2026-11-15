import { and, desc, eq } from "drizzle-orm";
import { courses, lessons, modules, notes } from "~/db/schema";
import type { Db } from "~/lib/comments.server";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

// ─── Notes ───
// A Student's own plain-text writing about a Lesson, private to them. One per
// Student per Lesson, enforced by the `notes_user_lesson_unique` index. See
// GLOSSARY.md.
//
// Only the owning Student's Lesson page and Saved page may read Note bodies —
// never an Instructor or Platform Admin view. Every function takes the
// database first, so tests can hand in an in-memory one. Callers check content
// access before calling.

type Note = typeof notes.$inferSelect;

export type SaveNoteResult =
  | { ok: true; note: Note }
  | { ok: false; error: string };

/** The Student's own Note on a Lesson, if they have written one. */
export function getNote(db: Db, userId: number, lessonId: number) {
  return db
    .select()
    .from(notes)
    .where(and(eq(notes.userId, userId), eq(notes.lessonId, lessonId)))
    .get();
}

/**
 * Creates the Student's Note on a Lesson, or replaces its body and moves
 * `updatedAt` on. `createdAt` stays put on a re-save. The body is trimmed, and
 * an empty or over-long body is refused rather than truncated.
 */
export function saveNote(
  db: Db,
  userId: number,
  lessonId: number,
  body: string,
  now: Date
): SaveNoteResult {
  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Write something before saving your note." };
  }
  if (trimmed.length > MAX_NOTE_LENGTH) {
    return {
      ok: false,
      error: `A note must be ${MAX_NOTE_LENGTH} characters or fewer.`,
    };
  }

  const at = now.toISOString();
  const note = db
    .insert(notes)
    .values({ userId, lessonId, body: trimmed, createdAt: at, updatedAt: at })
    .onConflictDoUpdate({
      target: [notes.userId, notes.lessonId],
      set: { body: trimmed, updatedAt: at },
    })
    .returning()
    .get();

  return { ok: true, note };
}

/** The Student's own Notes, last edited first, each with its Lesson and Course. */
export function listNotes(db: Db, userId: number) {
  return db
    .select({
      id: notes.id,
      body: notes.body,
      updatedAt: notes.updatedAt,
      lessonId: lessons.id,
      lessonTitle: lessons.title,
      courseTitle: courses.title,
      courseSlug: courses.slug,
    })
    .from(notes)
    .innerJoin(lessons, eq(lessons.id, notes.lessonId))
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(courses, eq(courses.id, modules.courseId))
    .where(eq(notes.userId, userId))
    .orderBy(desc(notes.updatedAt), desc(notes.id))
    .all();
}
