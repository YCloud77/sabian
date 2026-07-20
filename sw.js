/* sw.js — ネットワーク優先のサービスワーカー
 * ★v12〜: 「毎回まずネットから最新を取りに行き、取れたらキャッシュも更新。オフライン時だけキャッシュを使う」方式。
 *   これで、デプロイした修正が"古いキャッシュに阻まれて届かない"問題が根絶される（ユーザーのCmd+Shift+R不要）。 */
const CACHE = "sabian-mirror-v12";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./chart.js",
  "./interpret.js",
  "./sabian.js",
  "./places.js",
  "./astronomy.browser.js",
  "./manifest.json",
  "./reading-spec.txt",
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  // 外部（Nominatim等）はそのまま
  if (new URL(e.request.url).origin !== location.origin) return;
  // ★ネットワーク優先: まずネットから最新を取得し、成功したらキャッシュも更新。
  //   失敗（オフライン等）したときだけキャッシュを返す。
  e.respondWith(
    fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
