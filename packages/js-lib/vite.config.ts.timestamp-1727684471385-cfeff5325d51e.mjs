// vite.config.ts
import path from "node:path";
import { defineConfig } from "file:///Users/stefcoenen/Projects/odin/odin-js/node_modules/vite/dist/node/index.js";
import dts from "file:///Users/stefcoenen/Projects/odin/odin-js/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/stefcoenen/Projects/odin/odin-js/packages/js-lib";
var vite_config_default = defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      entryRoot: "./src"
    })
  ],
  build: {
    lib: {
      entry: {
        core: path.resolve(__vite_injected_original_dirname, "src/core/core.ts"),
        media: path.resolve(__vite_injected_original_dirname, "src/media/media.ts"),
        helpers: path.resolve(__vite_injected_original_dirname, "src/helpers/helpers.ts"),
        network: path.resolve(__vite_injected_original_dirname, "src/network/network.ts"),
        profile: path.resolve(__vite_injected_original_dirname, "src/profile/profile.ts"),
        public: path.resolve(__vite_injected_original_dirname, "src/public/public.ts"),
        peer: path.resolve(__vite_injected_original_dirname, "src/peer/peer.ts"),
        auth: path.resolve(__vite_injected_original_dirname, "src/auth/auth.ts")
      }
      // formats: ['es', 'cjs'], // Output formats are inferred automatically when building with outputs
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ["mp4box", "@homebase-id/ffmpeg"],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          mp4box: "Mp4box",
          "@homebase-id/ffmpeg": "@homebase-id/ffmpeg"
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvc3RlZmNvZW5lbi9Qcm9qZWN0cy9vZGluL29kaW4tanMvcGFja2FnZXMvanMtbGliXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvc3RlZmNvZW5lbi9Qcm9qZWN0cy9vZGluL29kaW4tanMvcGFja2FnZXMvanMtbGliL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9zdGVmY29lbmVuL1Byb2plY3RzL29kaW4vb2Rpbi1qcy9wYWNrYWdlcy9qcy1saWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICBkdHMoe1xuICAgICAgaW5zZXJ0VHlwZXNFbnRyeTogdHJ1ZSxcbiAgICAgIGVudHJ5Um9vdDogJy4vc3JjJyxcbiAgICB9KSxcbiAgXSxcbiAgYnVpbGQ6IHtcbiAgICBsaWI6IHtcbiAgICAgIGVudHJ5OiB7XG4gICAgICAgIGNvcmU6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvY29yZS9jb3JlLnRzJyksXG4gICAgICAgIG1lZGlhOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL21lZGlhL21lZGlhLnRzJyksXG4gICAgICAgIGhlbHBlcnM6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaGVscGVycy9oZWxwZXJzLnRzJyksXG4gICAgICAgIG5ldHdvcms6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvbmV0d29yay9uZXR3b3JrLnRzJyksXG4gICAgICAgIHByb2ZpbGU6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvcHJvZmlsZS9wcm9maWxlLnRzJyksXG4gICAgICAgIHB1YmxpYzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9wdWJsaWMvcHVibGljLnRzJyksXG4gICAgICAgIHBlZXI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvcGVlci9wZWVyLnRzJyksXG5cbiAgICAgICAgYXV0aDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9hdXRoL2F1dGgudHMnKSxcbiAgICAgIH0sXG4gICAgICAvLyBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddLCAvLyBPdXRwdXQgZm9ybWF0cyBhcmUgaW5mZXJyZWQgYXV0b21hdGljYWxseSB3aGVuIGJ1aWxkaW5nIHdpdGggb3V0cHV0c1xuICAgIH0sXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgLy8gbWFrZSBzdXJlIHRvIGV4dGVybmFsaXplIGRlcHMgdGhhdCBzaG91bGRuJ3QgYmUgYnVuZGxlZFxuICAgICAgLy8gaW50byB5b3VyIGxpYnJhcnlcbiAgICAgIGV4dGVybmFsOiBbJ21wNGJveCcsICdAaG9tZWJhc2UtaWQvZmZtcGVnJ10sXG4gICAgICBvdXRwdXQ6IHtcbiAgICAgICAgLy8gUHJvdmlkZSBnbG9iYWwgdmFyaWFibGVzIHRvIHVzZSBpbiB0aGUgVU1EIGJ1aWxkXG4gICAgICAgIC8vIGZvciBleHRlcm5hbGl6ZWQgZGVwc1xuICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgbXA0Ym94OiAnTXA0Ym94JyxcbiAgICAgICAgICAnQGhvbWViYXNlLWlkL2ZmbXBlZyc6ICdAaG9tZWJhc2UtaWQvZmZtcGVnJyxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUF1VixPQUFPLFVBQVU7QUFDeFcsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBRmhCLElBQU0sbUNBQW1DO0FBSXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLElBQUk7QUFBQSxNQUNGLGtCQUFrQjtBQUFBLE1BQ2xCLFdBQVc7QUFBQSxJQUNiLENBQUM7QUFBQSxFQUNIO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxLQUFLO0FBQUEsTUFDSCxPQUFPO0FBQUEsUUFDTCxNQUFNLEtBQUssUUFBUSxrQ0FBVyxrQkFBa0I7QUFBQSxRQUNoRCxPQUFPLEtBQUssUUFBUSxrQ0FBVyxvQkFBb0I7QUFBQSxRQUNuRCxTQUFTLEtBQUssUUFBUSxrQ0FBVyx3QkFBd0I7QUFBQSxRQUN6RCxTQUFTLEtBQUssUUFBUSxrQ0FBVyx3QkFBd0I7QUFBQSxRQUN6RCxTQUFTLEtBQUssUUFBUSxrQ0FBVyx3QkFBd0I7QUFBQSxRQUN6RCxRQUFRLEtBQUssUUFBUSxrQ0FBVyxzQkFBc0I7QUFBQSxRQUN0RCxNQUFNLEtBQUssUUFBUSxrQ0FBVyxrQkFBa0I7QUFBQSxRQUVoRCxNQUFNLEtBQUssUUFBUSxrQ0FBVyxrQkFBa0I7QUFBQSxNQUNsRDtBQUFBO0FBQUEsSUFFRjtBQUFBLElBQ0EsZUFBZTtBQUFBO0FBQUE7QUFBQSxNQUdiLFVBQVUsQ0FBQyxVQUFVLHFCQUFxQjtBQUFBLE1BQzFDLFFBQVE7QUFBQTtBQUFBO0FBQUEsUUFHTixTQUFTO0FBQUEsVUFDUCxRQUFRO0FBQUEsVUFDUix1QkFBdUI7QUFBQSxRQUN6QjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
