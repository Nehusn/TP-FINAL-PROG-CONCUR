"use server"

import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Simulación de una base de datos en memoria
// En un sistema real, esto sería una base de datos con bloqueos adecuados
const turnos: {
  id: string
  fecha: string
  hora: string
  nombre: string
  email: string
  telefono: string
  motivo?: string
  especialidad: string
  especialidadNombre: string
  reservado: boolean
  version: number // Para control de concurrencia optimista
}[] = []

// Estructura para almacenar las especialidades
const especialidades: {
  id: string
  nombre: string
  activa: boolean
  horaInicio: number
  horaFin: number
  intervalo: number[] // minutos [0, 30] significa cada 30 min
}[] = [
  { id: "medicina-general", nombre: "Medicina General", activa: true, horaInicio: 8, horaFin: 18, intervalo: [0, 30] },
  { id: "cardiologia", nombre: "Cardiología", activa: true, horaInicio: 9, horaFin: 14, intervalo: [0, 30] },
  { id: "dermatologia", nombre: "Dermatología", activa: true, horaInicio: 10, horaFin: 15, intervalo: [0, 30] },
  { id: "pediatria", nombre: "Pediatría", activa: true, horaInicio: 9, horaFin: 16, intervalo: [0, 30] },
  { id: "traumatologia", nombre: "Traumatología", activa: true, horaInicio: 8, horaFin: 16, intervalo: [0] },
]

// Mutex para operaciones críticas
const mutex = new Map<string, boolean>()

// Función para adquirir un bloqueo
async function adquirirBloqueo(recursoId: string): Promise<boolean> {
  if (mutex.get(recursoId)) {
    // El recurso está bloqueado, esperar un tiempo aleatorio y reintentar
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 100))
    return adquirirBloqueo(recursoId)
  }

  // Adquirir el bloqueo
  mutex.set(recursoId, true)
  return true
}

// Función para liberar un bloqueo
function liberarBloqueo(recursoId: string): void {
  mutex.delete(recursoId)
}

// Generar turnos disponibles para los próximos 30 días
function inicializarTurnos() {
  if (turnos.length > 0) return // Ya inicializado

  const ahora = new Date()
  for (let i = 0; i < 30; i++) {
    const fecha = new Date(ahora)
    fecha.setDate(ahora.getDate() + i)
    const fechaStr = fecha.toISOString().split("T")[0]

    // Para cada especialidad
    for (const esp of especialidades.filter((e) => e.activa)) {
      // Horarios según configuración de la especialidad
      for (let hora = esp.horaInicio; hora < esp.horaFin; hora++) {
        for (const minuto of esp.intervalo) {
          const horaStr = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`
          turnos.push({
            id: uuidv4(),
            fecha: fechaStr,
            hora: horaStr,
            nombre: "",
            email: "",
            telefono: "",
            especialidad: esp.id,
            especialidadNombre: esp.nombre,
            reservado: false,
            version: 1,
          })
        }
      }
    }
  }
}

// Inicializar turnos
inicializarTurnos()

// Obtener especialidades activas
export async function getEspecialidadesActivas(): Promise<any[]> {
  // Simular latencia de red/base de datos
  await new Promise((resolve) => setTimeout(resolve, 500))

  return especialidades
    .filter((e) => e.activa)
    .map(({ id, nombre }) => ({
      id,
      nombre,
    }))
}

// Obtener turnos disponibles y reservados para una fecha y especialidad
export async function getTurnosDisponibles(
  fechaISO: string,
  especialidad: string,
): Promise<{ hora: string; disponible: boolean }[]> {
  // Extraer solo la parte de la fecha
  const fecha = fechaISO.split("T")[0]

  // Simular latencia de red/base de datos
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Obtener todos los turnos para esa fecha y especialidad
  const turnosFecha = turnos
    .filter((t) => t.fecha === fecha && t.especialidad === especialidad)
    .map((t) => ({
      hora: t.hora,
      disponible: !t.reservado,
    }))
    .sort((a, b) => a.hora.localeCompare(b.hora))

  return turnosFecha
}

// Reservar un turno
export async function reservarTurno(datos: {
  fecha: string
  hora: string
  nombre: string
  email: string
  telefono: string
  especialidad: string
  motivo?: string
}): Promise<{ success: boolean; error?: string }> {
  const { fecha, hora, nombre, email, telefono, especialidad, motivo } = datos

  // Log para depuración
  console.log("Datos recibidos en reservarTurno:", datos)

  // Identificador único para el turno (fecha + hora + especialidad)
  const turnoId = `${fecha}-${hora}-${especialidad}`

  try {
    // Adquirir bloqueo para este turno específico
    await adquirirBloqueo(turnoId)

    // Simular latencia de red/base de datos
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Buscar el turno
    const turnoIndex = turnos.findIndex(
      (t) => t.fecha === fecha && t.hora === hora && t.especialidad === especialidad && !t.reservado,
    )

    if (turnoIndex === -1) {
      return {
        success: false,
        error: "El turno ya no está disponible. Otro usuario lo ha reservado.",
      }
    }

    // Reservar el turno
    turnos[turnoIndex] = {
      ...turnos[turnoIndex],
      nombre,
      email,
      telefono,
      motivo,
      reservado: true,
      version: turnos[turnoIndex].version + 1,
    }

    // Revalidar la página para actualizar los datos
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error al reservar turno:", error)
    // Capturar más detalles del error
    const errorMessage = error instanceof Error ? error.message : "Error desconocido"
    return {
      success: false,
      error: `Ocurrió un error al procesar la reserva: ${errorMessage}. Intente nuevamente.`,
    }
  } finally {
    // Liberar el bloqueo
    liberarBloqueo(turnoId)
  }
}

// Asegurarse de que los turnos reservados devuelvan la fecha en formato ISO correcto
// Modificar la función getTurnosReservados para garantizar que las fechas se manejen correctamente

export async function getTurnosReservados(email: string): Promise<any[]> {
  // Simular latencia de red/base de datos
  await new Promise((resolve) => setTimeout(resolve, 800))

  // En un sistema real, esto filtraría por el usuario autenticado
  // Para simplificar, si no hay email, mostramos algunos turnos de ejemplo
  if (!email) {
    return turnos
      .filter((t) => t.reservado)
      .slice(0, 3)
      .map(({ id, fecha, hora, nombre, email, telefono, motivo, especialidad, especialidadNombre }) => ({
        id,
        fecha,
        hora,
        nombre,
        email,
        telefono,
        motivo,
        especialidad,
        especialidadNombre,
      }))
  }

  return turnos
    .filter((t) => t.reservado && t.email === email)
    .map(({ id, fecha, hora, nombre, email, telefono, motivo, especialidad, especialidadNombre }) => ({
      id,
      fecha, // Mantenemos el formato ISO YYYY-MM-DD para consistencia
      hora,
      nombre,
      email,
      telefono,
      motivo,
      especialidad,
      especialidadNombre,
    }))
}

// Cancelar un turno
export async function cancelarTurno(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Adquirir bloqueo para este turno específico
    await adquirirBloqueo(id)

    // Simular latencia de red/base de datos
    await new Promise((resolve) => setTimeout(resolve, 700))

    // Buscar el turno
    const turnoIndex = turnos.findIndex((t) => t.id === id && t.reservado)

    if (turnoIndex === -1) {
      return {
        success: false,
        error: "El turno no existe o ya ha sido cancelado",
      }
    }

    // Implementar control de concurrencia optimista
    const versionActual = turnos[turnoIndex].version

    // Verificar si otro proceso ha modificado el turno mientras tanto
    if (versionActual !== turnos[turnoIndex].version) {
      return {
        success: false,
        error: "El turno ha sido modificado por otro proceso. Intente nuevamente.",
      }
    }

    // Cancelar el turno (liberar)
    turnos[turnoIndex] = {
      ...turnos[turnoIndex],
      nombre: "",
      email: "",
      telefono: "",
      motivo: "",
      reservado: false,
      version: versionActual + 1,
    }

    // Revalidar la página para actualizar los datos
    revalidatePath("/")

    return { success: true }
  } catch (error) {
    console.error("Error al cancelar turno:", error)
    return {
      success: false,
      error: "Ocurrió un error al cancelar el turno. Intente nuevamente.",
    }
  } finally {
    // Liberar el bloqueo
    liberarBloqueo(id)
  }
}
