import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Torquest",
    short_name: "Torquest",
    description: "Spot cars in the wild. Build your collection.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c0f",
    theme_color: "#0b0c0f",
  };
}
