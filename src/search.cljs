(ns el-mundo-ha-vivido-equivocado.search
  "Client-side search for episodes — vanilla JS, no dependencies.")

(defn fetch-index []
  (try
    (js/fetch "/search-index.json")
    (.then % (fn [res] (.json res)))
    (catch js/Error _
      (.warn js/console "Search index not available")
      nil)))

(defn render-results [results ^js el]
  (if (empty? results)
    (set! (.-innerHTML el) "<li role=\"option\">Sin resultados</li>")
    (set! (.-innerHTML el)
      (apply str
        (map
          (fn [ep]
            (str "<li role=\"option\">"
              "<a href=\"/episodios/" (.-slug ep) "/\">"
              (.-title ep)
              "</a>"
              " <small>" (.-date ep) "</small>"
              "</li>"))
          results)))))

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