import { describe, expect, it } from "vitest";
import { describeNoteDraft } from "../index";
import { MAX_NOTE_LENGTH } from "~/lib/notes";

describe("describeNoteDraft", () => {
  it("counts the characters against the note limit", () => {
    const draft = describeNoteDraft("hello", null);

    expect(draft.length).toBe(5);
    expect(draft.maxLength).toBe(MAX_NOTE_LENGTH);
  });

  it("offers to save new text when there is no note yet", () => {
    expect(describeNoteDraft("first thought", undefined)).toMatchObject({
      unsaved: true,
      canSave: true,
    });
  });

  it("has nothing to save when the text matches the saved note", () => {
    expect(describeNoteDraft("same", "same")).toMatchObject({
      unsaved: false,
      canSave: false,
    });
  });

  it("offers to save an edit to the saved note", () => {
    expect(describeNoteDraft("same, edited", "same")).toMatchObject({
      unsaved: true,
      canSave: true,
    });
  });

  it("treats whitespace around the saved text as already saved", () => {
    expect(describeNoteDraft("  same\n", "same")).toMatchObject({
      unsaved: false,
      canSave: false,
    });
  });

  it("does not offer to save a blank note", () => {
    expect(describeNoteDraft("   ", "old note")).toMatchObject({
      unsaved: true,
      canSave: false,
    });
  });

  it("accepts a note exactly at the limit", () => {
    expect(describeNoteDraft("a".repeat(MAX_NOTE_LENGTH), null)).toMatchObject({
      tooLong: false,
      canSave: true,
    });
  });

  it("refuses a note one character over the limit", () => {
    expect(
      describeNoteDraft("a".repeat(MAX_NOTE_LENGTH + 1), null)
    ).toMatchObject({ tooLong: true, canSave: false });
  });

  it("treats an empty box with no note as nothing to save", () => {
    expect(describeNoteDraft("", null)).toMatchObject({
      length: 0,
      unsaved: false,
      canSave: false,
    });
  });
});
