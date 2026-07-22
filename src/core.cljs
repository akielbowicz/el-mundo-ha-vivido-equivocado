(ns el-mundo-ha-vivido-equivocado.core
  "Entry point — enhancements on top of the semantic HTML shell.")

;; Site is fully server-side rendered via semantic HTML.
;; This module loads after the content is visible, so reader mode
;; and screen readers see the content immediately.

(.info js/console "El mundo ha vivido equivocado — loaded")

;; ── Cached search index ─────────────────────

(def search-index (atom nil))

;; ── Global Audio Player ────────────────────

(def audio-el (.querySelector js/document "#global-audio"))
(def player-el (.querySelector js/document "#global-player"))
(def play-btn (.querySelector js/document "#global-play-btn"))
(def close-btn (.querySelector js/document "#global-close"))
(def title-el (.querySelector js/document "#global-title"))
(def author-el (.querySelector js/document "#global-author"))
(def current-el (.querySelector js/document "#global-current"))
(def duration-el (.querySelector js/document "#global-duration"))
(def range-el (.querySelector js/document "#global-range"))

(defn format-time [s]
  (let [m (js/Math.floor (/ s 60))
        s (js/Math.floor (mod s 60))]
    (str m ":" (if (< s 10) "0" "") s)))

(defn update-player-ui []
  (when audio-el
    (let [current (.-currentTime audio-el)
          duration (.-duration audio-el)]
      (when (and duration (js/isFinite duration))
        (set! (.-textContent current-el) (format-time current))
        (set! (.-textContent duration-el) (format-time duration))
        (set! (.-value (.-max range-el)) duration)
        (set! (.-value range-el) current))
      (set! (.-textContent play-btn)
        (if (.-paused audio-el) "▶" "⏸")))))

(defn load-audio [src title author]
  (when (and audio-el player-el)
    (set! (.-src audio-el) src)
    (set! (.-textContent title-el) title)
    (set! (.-textContent author-el) author)
    (set! (.-textContent current-el) "0:00")
    (set! (.-textContent duration-el) "0:00")
    (set! (.-value range-el) 0)
    (set! (.-hidden player-el) false)
    (.play audio-el)))

(defn toggle-play []
  (when audio-el
    (if (.-paused audio-el)
      (.play audio-el)
      (.pause audio-el))))

(defn init-player []
  (when (and audio-el play-btn close-btn range-el)
    (.addEventListener play-btn "click" (fn [_] (toggle-play)))
    (.addEventListener close-btn "click"
      (fn [_]
        (.pause audio-el)
        (set! (.-src audio-el) "")
        (set! (.-hidden player-el) true)))
    (.addEventListener range-el "input"
      (fn [e]
        (when (.-duration audio-el)
          (set! (.-currentTime audio-el) (js/parseFloat (.. e -target -value))))))
    (.addEventListener audio-el "timeupdate" (fn [_] (update-player-ui)))
    (.addEventListener audio-el "ended"
      (fn [_]
        (set! (.-textContent play-btn) "▶")
        (set! (.-value range-el) 0)))
    (.addEventListener audio-el "loadedmetadata" (fn [_] (update-player-ui)))))

;; ── Play button delegation ─────────────────

(defn init-play-buttons []
  (.addEventListener js/document "click"
    (fn [e]
      (let [btn (.. e -target (closest "[data-play-audio]"))]
        (when btn
          (.preventDefault e)
          (load-audio
            (.. btn -dataset -playAudio)
            (.. btn -dataset -episodeTitle)
            (or (.. btn -dataset -episodeAuthor) "")))))))

;; ── SPA Navigation ──────────────────────────

(defn is-internal-link [^js a]
  (and (.-origin a) (= (.-origin a) (.-origin js/location))
       (not (.-download a))
       (not= (.-protocol a) "mailto:")))

(defn init-search-on-content []
  (let [cached @search-index]
    (when cached
      (let [input (.querySelector js/document "#search-input")]
        (when input
          (try
            (-> (import "./search.mjs")
                (.then (fn [mod] (.init mod cached))))
            (catch js/Error e
              (.warn js/console "Search re-init failed:" e))))))
    (try
      (-> (import "./search.mjs")
          (.then (fn [mod] (.init-filters mod))))
      (catch js/Error e
        (.warn js/console "Filter chips re-init failed:" e)))))

(defn swap-content [html]
  (let [parser (js/DOMParser.)
        doc (.parseFromString parser html "text/html")
        new-main (.querySelector doc "#main-content")
        new-title (.-textContent (.querySelector doc "title"))
        current-main (.querySelector js/document "#main-content")]
    (when (and new-main current-main)
      (set! (.-outerHTML current-main) (.-outerHTML new-main))
      (set! (.-title js/document) new-title)
      (init-search-on-content))))

(defn navigate-to [href]
  (.pushState js/window.history #js {} "" href)
  (-> (js/fetch href)
      (.then (fn [res] (.text res)))
      (.then (fn [html] (swap-content html)))
      (.catch (fn [err]
                (.warn js/console "Navigation failed:" err)
                (set! (.-location js/window) href)))))

(defn init-nav []
  (.addEventListener js/document "click"
    (fn [e]
      (let [a (.. e -target (closest "a[href]"))]
        (when (and a (is-internal-link a) (not (.. e -metaKey)) (not (.. e -ctrlKey)))
          (.preventDefault e)
          (navigate-to (.-href a)))))))

;; ── Init ─────────────────────────────────────

(defn load-search-index []
  (-> (js/fetch "/search-index.json")
      (.then (fn [res] (.json res)))
      (.then (fn [index]
               (reset! search-index index)
               (-> (import "./search.mjs")
                   (.then (fn [mod] (.init mod index))))))
      (.catch (fn [e] (.warn js/console "Search failed to load:" e)))))

(defn init []
  (init-player)
  (init-play-buttons)
  (init-nav)
  (load-search-index)
  ;; Filter chips init (needs search.mjs loaded)
  (try
    (-> (import "./search.mjs")
        (.then (fn [mod] (.init-filters mod))))
    (catch js/Error e
      (.warn js/console "Filter chips failed to load:" e))))

;; Handle browser back/forward
(.addEventListener js/window "popstate"
  (fn [_]
    (-> (js/fetch (.-location js/window))
        (.then (fn [res] (.text res)))
        (.then (fn [html] (swap-content html)))
        (.catch (fn [err]
                  (.warn js/console "Popstate navigation failed:" err)
                  (.reload (.-location js/window)))))))

(init)