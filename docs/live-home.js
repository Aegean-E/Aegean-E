import { appsFromManifest, versionLabel } from "./live-core.js";

const grid = document.getElementById("live-home-grid");

function card(app) {
  const link = document.createElement("a");
  link.className = "live-home-card";
  link.href = "play.html?app=" + encodeURIComponent(app.slug);
  const name = document.createElement("span");
  name.className = "live-home-name";
  name.textContent = app.title;
  const meta = document.createElement("span");
  meta.className = "live-home-meta";
  meta.textContent = versionLabel(app);
  const description = document.createElement("span");
  description.className = "live-home-description";
  description.textContent = app.description;
  link.append(name, meta, description);
  return link;
}

async function boot() {
  if (!grid) return;
  try {
    const response = await window.fetch(grid.dataset.catalog || "live.json", { cache: "no-cache" });
    if (!response.ok) return;
    const apps = appsFromManifest(await response.json())
      .filter(function (app) {
        return app.available;
      })
      .slice(0, 3);
    if (!apps.length) return;
    grid.replaceChildren();
    apps.forEach(function (app) {
      grid.appendChild(card(app));
    });
  } catch (error) {
    // Keep the static fallback link when the catalog cannot be loaded.
  }
}

boot();
