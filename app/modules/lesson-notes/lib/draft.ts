import { MAX_NOTE_LENGTH } from "~/lib/notes";

export type NoteDraft = {
  length: number;
  maxLength: number;
  tooLong: boolean;
  unsaved: boolean;
  canSave: boolean;
};

export function describeDraft(draft: string, savedBody: string): NoteDraft {
  const tooLong = draft.length > MAX_NOTE_LENGTH;
  // The server trims a note before it stores it, so trailing whitespace is
  // already saved as far as the stored body is concerned.
  const trimmed = draft.trim();
  const unsaved = trimmed !== savedBody;
  // The save action rejects a blank note, so there is no point offering it.
  const blank = trimmed.length === 0;

  return {
    length: draft.length,
    maxLength: MAX_NOTE_LENGTH,
    tooLong,
    unsaved,
    canSave: unsaved && !tooLong && !blank,
  };
}
