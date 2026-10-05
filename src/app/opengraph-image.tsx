import {
  SHARE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
  shareCardImage,
} from "@/lib/og/shareCard";

export const alt = "PIN5 — daily location games";
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_CONTENT_TYPE;

export default function Image() {
  return shareCardImage({
    kind: "hub",
    line: "Daily games",
    subtitle: "Five clues. Five pins. One place.",
  });
}
