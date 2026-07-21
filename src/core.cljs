(ns el-mundo-ha-vivido-equivocado.core
  "Entry point for the site — compiles to vanilla JS via squint.")

(defn init []
  (let [root (.querySelector js/document "#app")]
    (set! (.-innerHTML root) "<h1>El mundo ha vivido equivocado</h1>")))

;; auto-run on module load
(init)
