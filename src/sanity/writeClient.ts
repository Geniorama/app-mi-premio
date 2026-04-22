import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

const token = process.env.SANITY_API_WRITE_TOKEN;

export const sanityWriteClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token,
  useCdn: false,
  perspective: "raw",
});

export function assertWriteClient(): void {
  if (!token) {
    throw new Error("Missing env var: SANITY_API_WRITE_TOKEN");
  }
}
