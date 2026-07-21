(ns el-mundo-ha-vivido-equivocado.core
  "Entry point — enhancements on top of the semantic HTML shell.")

;; Site is fully server-side rendered via semantic HTML.
;; This module loads after the content is visible, so reader mode
;; and screen readers see the content immediately.

;; Future enhancements: audio player progress persistence, etc.

(.info js/console "El mundo ha vivido equivocado — loaded")

;; ── Search initialization ────────────────

(let [input (.querySelector js/document "#search-input")]
  (when input
    (try
      (-> (js/fetch "/search-index.json")
          (.then (fn [res] (.json res)))
          (.then (fn [index]
                   ;; load and init search module
                   (-> (import "./search.mjs")
                       (.then (fn [mod] (.init mod index)))))))
      (catch js/Error e
        (.warn js/console "Search failed to load:" e)))))