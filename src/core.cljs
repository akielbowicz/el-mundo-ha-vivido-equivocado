(ns el-mundo-ha-vivido-equivocado.core
  "Entry point — enhancements on top of the semantic HTML shell.")

;; Site is fully server-side rendered via semantic HTML.
;; This module loads after the content is visible, so reader mode
;; and screen readers see the content immediately.

(.info js/console "El mundo ha vivido equivocado — loaded")

;; ── Error Reporting ─────────────────────────

(def ^:const REPORTED_ERRORS (atom #{}))

(defn- should-report-error? [msg url]
  (let [s (str msg)]
    (and
      ;; Skip CORS errors from external resources
      (not (re-find #"cloudflareinsights" s))
      (not (re-find #"net::ERR_FAILED.*cloudflare" (or url "")))
      ;; Skip script load failures from extensions
      (not (re-find #"chrome-extension://" (or url "")))
      ;; Skip ResizeObserver loop (benign and browser-specific)
      (not (re-find #"ResizeObserver" s)))))

(defn- report-error [label msg url line col error]
  (try
    ;; Deduplicate by message to avoid noise
    (when (and msg (should-report-error? msg url))
      (let [key (str msg ":" url)]
        (when-not (@REPORTED_ERRORS key)
          (swap! REPORTED_ERRORS conj key)
          (.warn js/console "[error-report]" label ":" msg
            (when url (str "at " url))
            (when error error)))))
    (catch js/Error _ nil)))

;; Global error handler for uncaught exceptions
(set! (.-onerror js/window)
  (fn [msg url line col error]
    (report-error "uncaught" msg url line col error)))

;; Global handler for unhandled promise rejections
(.addEventListener js/window "unhandledrejection"
  (fn [e]
    (let [reason (.-reason e)]
      (report-error "unhandled-rejection"
        (str (or (and reason (.-message reason)) reason))
        (str (.-location js/window))
        0 0 reason))))

;; Helper: get search module functions from window (set by search.mjs)
(defn search-init [index]
  (let [f (.-__searchInit js/window)]
    (when f (f index))))

(defn search-init-filters []
  (let [f (.-__searchFilters js/window)]
    (when f (f))))

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

;; True while the user is dragging the seek bar — timeupdate must not
;; fight the input while seeking.
(def seeking (atom false))

(defn update-player-ui []
  (when audio-el
    (let [current (.-currentTime audio-el)
          duration (.-duration audio-el)]
      (when (and duration (js/isFinite duration))
        (set! (.-textContent current-el) (format-time current))
        (set! (.-textContent duration-el) (format-time duration))
        ;; Slider maps 0..duration (NOT the HTML default max=100)
        (set! (.-max range-el) duration)
        (when-not @seeking
          (set! (.-value range-el) current)))
      (set! (.-textContent play-btn)
        (if (.-paused audio-el) "▶" "⏸")))))

(defn- save-audio-state []
  (try
    (let [saved (.getItem js/sessionStorage "equivocadxs-audio")]
      (let [data (if saved (js/JSON.parse saved) #js{})]
        (set! (.-currentTime data) (.-currentTime audio-el))
        (set! (.-paused data) (.-paused audio-el))
        (.setItem js/sessionStorage "equivocadxs-audio" (js/JSON.stringify data))))
    (catch js/Error _ nil)))

(defn load-audio [src title author]
  (when (and audio-el player-el)
    (set! (.-src audio-el) src)
    (set! (.-textContent title-el) title)
    (set! (.-textContent author-el) author)
    (set! (.-textContent current-el) "0:00")
    (set! (.-textContent duration-el) "0:00")
    (set! (.-value range-el) 0)
    (reset! seeking false)
    (set! (.-hidden player-el) false)
    ;; Save to sessionStorage for persistence across full page loads
    (try
      (.setItem js/sessionStorage "equivocadxs-audio"
        (js/JSON.stringify #js {:src src :title title :author author :currentTime 0 :paused true}))
      (catch js/Error _ nil))
    (.play audio-el)))

(defn toggle-play []
  (when audio-el
    (if (.-paused audio-el)
      (.play audio-el)
      (.pause audio-el))))

(defn init-player []
  (when (and audio-el play-btn close-btn range-el)
    ;; Restore audio state from sessionStorage (after full page reload)
    (try
      (let [saved (.getItem js/sessionStorage "equivocadxs-audio")]
        (when saved
          (let [data (js/JSON.parse saved)]
            (when (and (.-src data) (.-title data))
              ;; Set preload before src to guarantee loadedmetadata fires
              (set! (.-preload audio-el) "metadata")
              (set! (.-src audio-el) (.-src data))
              (set! (.-textContent title-el) (.-title data))
              (set! (.-textContent author-el) (or (.-author data) ""))
              (set! (.-hidden player-el) false)
              ;; Restore position once metadata is loaded — handle race
              ;; by checking readyState before attaching listener
              (let [restore (fn []
                              (when (.-currentTime data)
                                (set! (.-currentTime audio-el) (.-currentTime data)))
                              (when (.-paused data)
                                (.pause audio-el)))]
                (if (>= (.-readyState audio-el) 1)
                  (restore)
                  (.addEventListener audio-el "loadedmetadata" (fn [_] (restore)))))))))
      (catch js/Error _ nil))
    (.addEventListener play-btn "click" (fn [_] (toggle-play)))
    (.addEventListener close-btn "click"
      (fn [_]
        (.pause audio-el)
        (set! (.-src audio-el) "")
        (set! (.-hidden player-el) true)))
    ;; Seek bar: preview while dragging ("input"), commit on release
    ;; ("change") — avoids seek-storms on the ~100 MB episode files.
    (.addEventListener range-el "input"
      (fn [e]
        (reset! seeking true)
        (let [v (js/parseFloat (.. e -target -value))]
          (when (and (.-duration audio-el) (js/isFinite (.-duration audio-el)))
            (set! (.-textContent current-el) (format-time v))))))
    (.addEventListener range-el "change"
      (fn [e]
        (when (and (.-duration audio-el) (js/isFinite (.-duration audio-el)))
          (set! (.-currentTime audio-el) (js/parseFloat (.. e -target -value))))
        (reset! seeking false)
        (update-player-ui)))
    ;; Throttled timeupdate: update UI + save state every ~5s
    (let [last-save (atom 0)]
      (.addEventListener audio-el "timeupdate"
        (fn [_]
          (update-player-ui)
          (let [now (js/Date.now)]
            (when (> (- now @last-save) 5000)
              (reset! last-save now)
              (save-audio-state))))))
    ;; Save on pause
    (.addEventListener audio-el "pause" (fn [_] (save-audio-state)))
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

;; ── Navigation Loader ──────────────────────

(def nav-loader (atom nil))

(defn init-nav-loader []
  (let [el (js/document.createElement "div")]
    (set! (.-className el) "nav-loader")
    (set! (.-hidden el) true)
    (.appendChild (.-body js/document) el)
    (reset! nav-loader el)))

(defn show-nav-loader []
  (when-let [el @nav-loader]
    (set! (.-hidden el) false)
    ;; Trigger animation on next frame
    (js/requestAnimationFrame
      (fn []
        (set! (.-style.width el) "80%")))))

(defn hide-nav-loader []
  (when-let [el @nav-loader]
    ;; Jump to 100% then hide after transition
    (set! (.-style.width el) "100%")
    (js/setTimeout
      (fn []
        (set! (.-hidden el) true)
        (set! (.-style.width el) "0%"))
      150)))

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
            (search-init cached)
            (catch js/Error e
              (.warn js/console "Search re-init failed:" e))))))
    (try
      (search-init-filters)
      (catch js/Error e
        (.warn js/console "Filter chips re-init failed:" e)))))

(defn swap-content [html]
  (hide-nav-loader)
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
  (show-nav-loader)
  (-> (js/fetch href)
      (.then (fn [res] (.text res)))
      (.then (fn [html]
               ;; Follow canonical redirect if present
               (let [parser (js/DOMParser.)
                     doc (.parseFromString parser html "text/html")
                     canonical (.querySelector doc "link[rel=canonical]")]
                 (if (and canonical (.-href canonical))
                   ;; Canonical redirect — follow it
                   (navigate-to (.-href canonical))
                   ;; Normal page — swap content
                   (swap-content html)))))
      (.catch (fn [err]
                (.warn js/console "Navigation failed:" err)
                (hide-nav-loader)
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
  (when (.querySelector js/document "#search-input")
    (-> (js/fetch "/search-index.json")
        (.then (fn [res] (.json res)))
        (.then (fn [index]
                 (reset! search-index index)
                 (search-init index)))
        (.catch (fn [e] (.warn js/console "Search failed to load:" e))))))

(defn init []
  (init-nav-loader)
  (init-player)
  (init-play-buttons)
  (init-nav)
  (load-search-index)
  ;; Filter chips init
  (try
    (search-init-filters)
    (catch js/Error e
      (.warn js/console "Filter chips failed to load:" e))))

;; Handle browser back/forward
(.addEventListener js/window "popstate"
  (fn [_]
    (show-nav-loader)
    (-> (js/fetch (.-location js/window))
        (.then (fn [res] (.text res)))
        (.then (fn [html]
                 (let [parser (js/DOMParser.)
                       doc (.parseFromString parser html "text/html")
                       canonical (.querySelector doc "link[rel=canonical]")]
                   (if (and canonical (.-href canonical))
                     ;; Follow canonical — update URL and fetch again
                     (do
                       (.replaceState js/window.history #js {} "" (.-href canonical))
                       (-> (js/fetch (.-href canonical))
                           (.then (fn [r] (.text r)))
                           (.then (fn [h] (swap-content h)))))
                     ;; Normal page — swap content
                     (swap-content html)))))
        (.catch (fn [err]
                  (.warn js/console "Popstate navigation failed:" err)
                  (hide-nav-loader)
                  (.reload (.-location js/window)))))))

;; Save audio state before page unload
(.addEventListener js/window "beforeunload" (fn [_] (save-audio-state)))

(init)