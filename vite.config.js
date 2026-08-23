import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/

export default defineConfig({
  plugins: [
    react(),

    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "mask-back-icon.svg",
      ],

      manifest: {
        name: "Cultivapp SaaS",
        short_name: "Cultivapp",
        description:
          "Plataforma de gestión de mercaderistas y puntos de venta",
        theme_color: "#87be00",

        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },

      workbox: {
        /*
         * El bundle principal actualmente supera los 5 MB.
         * Workbox utiliza 2 MB por defecto.
         *
         * Dejamos 8 MB para permitir el precache actual
         * y tener margen ante pequeños incrementos futuros.
         */
        maximumFileSizeToCacheInBytes:
          8 * 1024 * 1024,

        /*
         * Nunca utilizar el fallback de la PWA
         * para endpoints de API.
         */
        navigateFallbackDenylist: [
          /^\/api/,
        ],

        /*
         * Las llamadas al backend siempre deben
         * llegar a la red y no quedar almacenadas
         * por el Service Worker.
         */
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.pathname.startsWith(
                "/api",
              ),

            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
});