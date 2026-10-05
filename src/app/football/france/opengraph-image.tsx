import {
  SHARE_CONTENT_TYPE,
  SHARE_IMAGE_SIZE,
  shareCardImage,
} from "@/lib/og/shareCard";

export const alt = "PIN5 Football · France";
export const size = SHARE_IMAGE_SIZE;
export const contentType = SHARE_CONTENT_TYPE;

export default function Image() {
  return shareCardImage({
    kind: "football",
    line: "Football",
    subtitle: "France",
    flag: "FRA",
  });
}
