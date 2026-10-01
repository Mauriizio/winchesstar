const messages: Record<string, string> = {
  AUTH_REQUIRED: "Inicia sesión para jugar online.",
  NOT_FOUND: "El código de partida no existe o no tienes acceso a la partida.",
  ROOM_FULL: "La sala ya está completa.",
  ROOM_CLOSED: "Esta sala está cancelada o la partida ya terminó.",
  NOT_PARTICIPANT: "No perteneces a esta partida.",
  NOT_YOUR_TURN: "No es tu turno.",
  NOT_ACTIVE: "La partida no está activa.",
  FINISHED: "La partida terminó.",
  STALE_STATE: "La partida cambió y hemos actualizado el tablero.",
  INVALID_MOVE: "La jugada no es válida.",
  INVALID_CLAIM: "Esta posición no permite reclamar esas tablas.",
  OWN_OFFER: "No puedes aceptar ni rechazar tu propia oferta.",
  NO_OFFER: "No hay una oferta de tablas pendiente.",
  OFFER_UNAVAILABLE: "La oferta requiere una jugada de cada jugador y ninguna oferta pendiente.",
  INVALID_INPUT: "Revisa los datos e inténtalo otra vez.",
  RATE_LIMIT: "Has realizado demasiadas solicitudes. Espera un minuto.",
  USERNAME_TAKEN: "Ese nickname ya existe. Elige otro.",
  INCONSISTENT_STATE: "No se pudo verificar la partida. Vuelve a sincronizar antes de jugar.",
};
export function onlineError(error: unknown): string {
  const code = error instanceof Error ? error.message :
    typeof error === "object" && error && "message" in error ? String(error.message) : "";
  return messages[code] ?? "No se pudo conectar con el servicio online. Comprueba tu conexión y vuelve a intentarlo.";
}
