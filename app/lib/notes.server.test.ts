import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";
import { UserRole } from "~/db/schema";
import { getNote, listNotes, saveNote } from "./notes.server";

type TestDb = ReturnType<typeof createTestDb>;

const NOW = new Date(2026, 9, 6, 12, 0, 0);

function minutesAfter(minutes: number) {
  return new Date(NOW.getTime() + minutes * 60_000);
}

let db: TestDb;
let base: ReturnType<typeof seedBaseData>;
let lessonIds: number[];

beforeEach(() => {
  db = createTestDb();
  base = seedBaseData(db);

  const module = db
    .insert(schema.modules)
    .values({ courseId: base.course.id, title: "Basics", position: 1 })
    .returning()
    .get();

  lessonIds = [1, 2].map(
    (position) =>
      db
        .insert(schema.lessons)
        .values({ moduleId: module.id, title: `Lesson ${position}`, position })
        .returning()
        .get().id
  );
});

describe("saving a Note", () => {
  it("creates a Note on a Lesson with none, body trimmed", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "  # not a heading  ", NOW))
      .toMatchObject({ ok: true });

    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "# not a heading",
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
  });

  it("replaces the body and moves the last-edited time on when saved again", () => {
    saveNote(db, base.user.id, lessonIds[0], "First thought", NOW);
    saveNote(db, base.user.id, lessonIds[0], "Second thought", minutesAfter(5));

    expect(getNote(db, base.user.id, lessonIds[0])).toMatchObject({
      body: "Second thought",
      createdAt: NOW.toISOString(),
      updatedAt: minutesAfter(5).toISOString(),
    });
    expect(listNotes(db, base.user.id)).toHaveLength(1);
  });

  it("accepts a Note of exactly 2,000 characters", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "a".repeat(2000), NOW))
      .toMatchObject({ ok: true });
  });

  it("refuses a Note over 2,000 characters and stores nothing", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "a".repeat(2001), NOW))
      .toEqual({ ok: false, error: "A note must be 2000 characters or fewer." });
    expect(getNote(db, base.user.id, lessonIds[0])).toBeUndefined();
  });

  it("refuses a Note that is only whitespace", () => {
    expect(saveNote(db, base.user.id, lessonIds[0], "   ", NOW)).toMatchObject({
      ok: false,
    });
  });
});

describe("listing Notes", () => {
  it("lists only the Student's own Notes, last edited first, with Lesson and Course", () => {
    const other = db
      .insert(schema.users)
      .values({ name: "Other", email: "other@example.com", role: UserRole.Student })
      .returning()
      .get();
    saveNote(db, base.user.id, lessonIds[0], "Older", NOW);
    saveNote(db, base.user.id, lessonIds[1], "Newer", minutesAfter(5));
    saveNote(db, other.id, lessonIds[0], "Not mine", minutesAfter(10));

    expect(listNotes(db, base.user.id)).toMatchObject([
      {
        body: "Newer",
        lessonId: lessonIds[1],
        lessonTitle: "Lesson 2",
        courseTitle: "Test Course",
        courseSlug: "test-course",
      },
      { body: "Older", lessonId: lessonIds[0] },
    ]);
  });

  it("moves a re-saved Note back to the top", () => {
    saveNote(db, base.user.id, lessonIds[0], "A", NOW);
    saveNote(db, base.user.id, lessonIds[1], "B", minutesAfter(5));
    saveNote(db, base.user.id, lessonIds[0], "A again", minutesAfter(10));

    expect(listNotes(db, base.user.id).map((n) => n.body)).toEqual([
      "A again",
      "B",
    ]);
  });
});
