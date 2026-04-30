import imageUrlBuilder from "@sanity/image-url";
import { dataset, projectId } from "./env";

const builder = imageUrlBuilder({ projectId, dataset });

export function urlFor(source: Parameters<typeof builder.image>[0]) {
  return builder.image(source);
}

export function buildImageSet(
  source: Parameters<typeof builder.image>[0],
  widths: number[]
): { src: string; srcSet: string } {
  const sorted = [...widths].sort((a, b) => a - b);
  const largest = sorted[sorted.length - 1];
  return {
    src: builder.image(source).width(largest).auto("format").url(),
    srcSet: sorted
      .map((w) => `${builder.image(source).width(w).auto("format").url()} ${w}w`)
      .join(", "),
  };
}
