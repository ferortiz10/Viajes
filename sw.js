// Viaje · Estoy acá — service worker: funciona sin señal y recibe lo que se comparte desde Maps o la galería
const V = "estoyaca-v1";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== "compartido").map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const aDataURL = f => f.arrayBuffer().then(b => { let s = ""; const u = new Uint8Array(b); for(let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return `data:${f.type || "image/jpeg"};base64,${btoa(s)}`; });
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if(e.request.method === "POST" && url.pathname.endsWith("/compartir")){
    e.respondWith((async () => {
      const fd = await e.request.formData();
      const fotos = await Promise.all(fd.getAll("fotos").filter(f => f && f.size).slice(0, 10).map(aDataURL));
      const data = {title: fd.get("title") || "", text: fd.get("text") || "", url: fd.get("url") || "", fotos};
      const c = await caches.open("compartido"); await c.put("ultimo", new Response(JSON.stringify(data), {headers: {"Content-Type": "application/json"}}));
      return Response.redirect(new URL("./?share=1", self.registration.scope).href, 303);
    })());
    return;
  }
  if(e.request.method !== "GET" || url.origin !== location.origin) return;
  // la app: primero la red (para tener la última versión), si no hay señal, la copia guardada
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(V).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, {ignoreSearch: true}).then(r => r || caches.match("./"))));
});
