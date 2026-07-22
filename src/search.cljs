(ns el-mundo-ha-vivido-equivocado.search
  "Client-side search and filter chips for episodes — vanilla JS, no dependencies.")

;; ── Search helpers ─────────────────────────────

(defn escape-html [s]
  (.. s
    (replace "&" "&amp;")
    (replace "<" "&lt;")
    (replace "\"" "&quot;")))

(defn render-results [results ^js el ^js index]
  (set! (.-innerHTML el) "")
  (if (empty? results)
    ;; Rich empty state with suggestions
    (let [li (.createElement js/document "li")
          msg (.createElement js/document "p")
          suggestions (.createElement js/document "ul")]
      (set! (.-role li) "option")
      (set! (.-textContent msg) "No encontramos episodios con ese término. Probá con:")
      (set! (.-className msg) "search-empty-msg")
      (.appendChild li msg)
      ;; Show top 3 episodes as suggestions
      (set! (.-className suggestions) "search-suggestions")
      (doseq [ep (take 3 index)]
        (let [sug-li (.createElement js/document "li")
              sug-a (.createElement js/document "a")]
          (set! (.-href sug-a) (str "/episodios/" (.-slug ep) "/"))
          (set! (.-textContent sug-a) (escape-html (.-title ep)))
          (.appendChild sug-li sug-a)
          (.appendChild suggestions sug-li)))
      (.appendChild li suggestions)
      (.appendChild el li))
    (doseq [ep results]
      (let [li (.createElement js/document "li")
            a (.createElement js/document "a")
            small (.createElement js/document "small")]
        (set! (.-role li) "option")
        (set! (.-href a) (str "/episodios/" (.-slug ep) "/"))
        (set! (.-textContent a) (escape-html (.-title ep)))
        (set! (.-textContent small) (.-date ep))
        (.appendChild li a)
        (.appendChild li small)
        (.appendChild el li)))))

;; ── Filter chips helpers ────────────────────────

(defn- get-active-tags [^js chips]
  "Get set of active tag values (excluding 'all')."
  (into #{}
    (comp
      (filter (fn [^js b] (.-ariaPressed b)))
      (remove (fn [^js b] (= (.-value (.-dataset b)) "all")))
      (map (fn [^js b] (.-value (.-dataset b)))))
    (array-seq chips)))

(defn- update-filter-empty-state [^js container ^js empty-el]
  (let [items (.querySelectorAll container "li")
        visible-count (count (filter (fn [^js li] (not= (.-display (.-style li)) "none"))
                                (array-seq items)))]
    (if (and (> (.-length items) 0) (= visible-count 0))
      (set! (.-display (.-style empty-el)) "")
      (set! (.-display (.-style empty-el)) "none"))))

(defn- apply-filter [^js chips ^js container ^js empty-el]
  (let [active-tags (get-active-tags chips)
        items (.querySelectorAll container "li")]
    (if (empty? active-tags)
      ;; "Todos" selected — show all
      (doseq [^js li (array-seq items)]
        (set! (.-display (.-style li)) ""))
      ;; AND filter: item must have all active tags
      (doseq [^js li (array-seq items)]
        (let [item-tags (set (.. li -dataset -tags (split " ")))
              matches (every? (fn [t] (contains? item-tags t)) active-tags)]
          (set! (.-display (.-style li)) (if matches "" "none")))))
    (update-filter-empty-state container empty-el)))

(defn- toggle-chip [^js chip ^js chips ^js container ^js empty-el]
  (let [tag (.-value (.-dataset chip))]
    (if (= tag "all")
      ;; "Todos" — deactivate all others, activate "Todos"
      (doseq [^js b (array-seq chips)]
        (let [btag (.-value (.-dataset b))]
          (set! (.-ariaPressed b) (= btag "all"))
          (if (= btag "all")
            (-> (.-classList b) (.add "chip-active"))
            (-> (.-classList b) (.remove "chip-active")))))
      ;; Toggle this chip, then maybe reactivate "Todos"
      (let [new-pressed (not (.-ariaPressed chip))]
        (set! (.-ariaPressed chip) new-pressed)
        (if new-pressed
          (-> (.-classList chip) (.add "chip-active"))
          (-> (.-classList chip) (.remove "chip-active")))
        ;; If no non-all chips active, reactivate "Todos"
        (let [active (get-active-tags chips)]
          (when (empty? active)
            (doseq [^js b (array-seq chips)]
              (when (= (.-value (.-dataset b)) "all")
                (set! (.-ariaPressed b) true)
                (-> (.-classList b) (.add "chip-active")))))))))
  (apply-filter chips container empty-el))

(defn- clear-filters [^js chips ^js container ^js empty-el]
  (doseq [^js b (array-seq chips)]
    (let [btag (.-value (.-dataset b))]
      (set! (.-ariaPressed b) (= btag "all"))
      (if (= btag "all")
        (-> (.-classList b) (.add "chip-active"))
        (-> (.-classList b) (.remove "chip-active")))))
  (apply-filter chips container empty-el))

(defn init-filters []
  (let [chips (.querySelectorAll js/document ".filter-chips .chip")
        container (.querySelector js/document "[data-filter-container]")
        empty-el (.querySelector js/document "[data-filter-empty]")
        clear-btn (.querySelector js/document "#clear-filters")]
    (when (and chips container (> (.-length chips) 0))
      (doseq [^js chip (array-seq chips)]
        (.addEventListener chip "click"
          (fn [_] (toggle-chip chip chips container empty-el)))))
    (when clear-btn
      (.addEventListener clear-btn "click"
        (fn [_] (clear-filters chips container empty-el))))))

;; ── Search init ─────────────────────────────────

(defn init [^js index]
  (let [input (.querySelector js/document "#search-input")
        results (.querySelector js/document "#search-results")]
    (when-not (and input results)
      (.info js/console "Search UI elements not found — skipping"))
    (when input
      (set! (.-hidden results) true)
      (.addEventListener input "input"
        (fn [e]
          (let [q (.. e -target -value)]
            (if (< (.-length q) 2)
              (set! (.-hidden results) true)
              (let [matches (->> (js->clj index :keywordize-keys true)
                              (filter
                                (fn [ep]
                                  (let [lc (.toLowerCase q)]
                                    (or (.includes (.toLowerCase (:title ep "")) lc)
                                        (.includes (.toLowerCase (:description ep "")) lc)
                                        (.includes (.toLowerCase (:authors ep "")) lc)
                                        (.includes (.toLowerCase (str (:tags ep ""))) lc)))))
                              (take 10))]
                (set! (.-hidden results) false)
                (render-results matches results index)))))))))