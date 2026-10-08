import {
  SHARE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
  shareCardImage,
} from "@/lib/og/shareCard";

export const alt = "PIN5 UK Railway Stations · National Rail";
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_CONTENT_TYPE;

export default function Image() {
  return shareCardImage({
    kind: "uk-stations",
    line: "UK Railway Stations",
    subtitle: "National Rail",
    accent: "#0f3d6e",
  });
}
