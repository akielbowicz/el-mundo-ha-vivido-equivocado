(ns el-mundo-ha-vivido-equivocado.core
  "Entry point — enhancements on top of the semantic HTML shell.")

(defn init []
  ;; Site is fully server-side rendered via semantic HTML.
  ;; This module loads after the content is visible, so reader mode
  ;; and screen readers see the content immediately.
  ;; Future enhancements: audio player, episode search, etc.
  (.info js/console "El mundo ha vivido equivocado — loaded"))

;; auto-run on module load
(init)
