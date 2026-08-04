import { createClient } from "next-sanity";
import { apiVersion, dataset, projectId } from "./env";

export const sanityClient = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: "published",
});

/**
 * Cliente sin CDN para lecturas que no toleran caché: control de acceso
 * del panel administrativo e informes. Sigue siendo `published`, así que un
 * documento en borrador NO otorga acceso.
 */
export const sanityFreshClient = createClient({
  projectId,
  dataset,
  apiVersion,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
  perspective: "published",
});
