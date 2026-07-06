import type { NextConfig } from "next";
import path from "path";

// Fijamos explícitamente la raíz del proyecto para evitar que Next infiera mal
// el workspace root (la carpeta padre "Proyectos web" con espacio en el nombre),
// lo que rompía la resolución de módulos como `tailwindcss`.
const projectRoot = path.resolve(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  outputFileTracingRoot: projectRoot,
};

export default nextConfig;
