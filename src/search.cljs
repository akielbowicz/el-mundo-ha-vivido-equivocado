(ns el-mundo-ha-vivido-equivocado.search
  "Client-side search for episodes — vanilla JS, no dependencies.")

(defn escape-html [s]
  (.. s
    (replace "&" "&amp;")
    (replace "<" "&lt;")
    (replace "\"" "&quot;")))

(defn render-results [results ^js el]
  (set! (.-innerHTML el) "")
  (if (empty? results)
    (let [li (.createElement js/document "li")]
      (set! (.-textContent li) "Sin resultados")
      (set! (.-role li) "option")
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
                (render-results matches results)))))))))