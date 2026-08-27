# live-banner Specification (delta)

## ADDED Requirements

### Requirement: Banner de emisión en vivo
El sitio SHALL mostrar un banner con enlace a la radio en todas las páginas, con el
horario de emisión (jueves 19:00 UTC-3) visible sin JavaScript.

#### Scenario: Sin JavaScript
- **GIVEN** un visitante con JavaScript deshabilitado
- **WHEN** carga cualquier página
- **THEN** el banner muestra el texto estático con el horario (jueves 19:00, UTC-3)
- **AND** el banner enlaza a https://suipacha.gob.ar/radio/

### Requirement: Hora local del visitante
Con JavaScript, el banner SHALL mostrar la próxima emisión convertida a la zona
horaria local del visitante, sin offsets hardcodeados.

#### Scenario: Zona horaria con DST
- **GIVEN** un visitante en una zona con horario de verano
- **WHEN** el banner calcula la próxima emisión
- **THEN** la hora mostrada refleja el offset DST vigente en la fecha de emisión
  (vía Intl.DateTimeFormat, no aritmética manual)

#### Scenario: Refresco
- **GIVEN** la página abierta por más de un minuto
- **WHEN** cruza el momento de inicio o fin de la ventana en vivo
- **THEN** el banner actualiza su estado sin recargar la página

### Requirement: Estado en vivo
El banner SHALL indicar cuando el programa está al aire (jueves 22:00–23:00 UTC).

#### Scenario: Al aire
- **GIVEN** jueves 22:30 UTC
- **WHEN** se carga la página
- **THEN** el banner muestra estado "en vivo" con enlace directo a la radio

#### Scenario: Fuera de aire
- **GIVEN** cualquier momento fuera de la ventana
- **WHEN** se carga la página
- **THEN** el banner muestra la próxima emisión en hora local del visitante

#### Scenario: Movimiento reducido
- **GIVEN** `prefers-reduced-motion: reduce`
- **THEN** el indicador de "en vivo" no anima
