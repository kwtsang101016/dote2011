import type { Person, PersonProfile } from "../../shared/types.ts";
import { EMPTY_PROFILE } from "../../shared/seating.ts";

export type DisplayPerson = Person & {
  displayName: string;
  trueName: string;
  displayCollege: string;
  displayCountry: string;
  displayHobbies: string;
  displayPhoto: string;
  profile: PersonProfile;
};

export function mergePerson(
  person: Person,
  profile: PersonProfile | undefined,
): DisplayPerson {
  const resolved: PersonProfile = {
    ...EMPTY_PROFILE,
    ...(profile ?? {}),
    nickname: profile?.nickname ?? "",
  };
  const nickname = resolved.nickname.trim();
  return {
    ...person,
    profile: resolved,
    trueName: person.name,
    displayName: nickname || person.name,
    displayCollege: resolved.college || person.college || "",
    displayCountry: resolved.country || person.country || "",
    displayHobbies: resolved.hobbies || person.hobbies || "",
    displayPhoto: resolved.photoDataUrl || person.photo || "",
  };
}

export async function compressImageFile(file: File, maxEdge = 360, quality = 0.72): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please choose an image file.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Could not prepare the photo.");
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  if (dataUrl.length > 180_000) {
    return canvas.toDataURL("image/jpeg", 0.55);
  }
  return dataUrl;
}
