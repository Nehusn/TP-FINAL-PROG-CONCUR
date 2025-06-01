"use server"

import { revalidatePath } from "next/cache"
import { v4 as uuidv4 } from "uuid"

// Simulación de una base de datos en memoria
// Esta es una copia de la estructura en turnos-actions.ts
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
  version: number
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

// Obtener todos los turnos para administración
export async function getTurnosAdmin(): Promise<any[]> {
  // Simular latencia de red/base de datos
  await new Promise((resolve) => setTimeout(resolve, 800))

  // En un sistema real, aquí verificaríamos permisos de administrador
  return turnos.map(
    ({ id, fecha, hora, nombre, email, telefono, motivo, especialidad, especialidadNombre, reservado }) => ({
      id,
      fecha,
      hora,
      nombre,
      email,
      telefono,
      motivo,
      especialidad,
      especialidadNombre,
      reservado,
    }),
  )
}

// Obtener todas las especialidades
export async function getEspecialidades(): Promise<any[]> {
  // Simular latencia de red/base de datos
  await new Promise((resolve) => setTimeout(resolve, 500))

  return especialidades.map(({ id, nombre, activa, horaInicio, horaFin, intervalo }) => ({
    id,
    nombre,
    activa,
    horaInicio,
    horaFin,
    intervalo,
  }))
}

// Agregar una nueva especialidad
export async function agregarEspecialidad(datos: {
  nombre: string
  horaInicio: number
  horaFin: number
  intervalo: number[]
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    // Adquirir bloqueo para esta operación crítica
    await adquirirBloqueo("ESPECIALIDADES")

    // Simular latencia de red/base de datos
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Validar datos
    if (!datos.nombre || datos.nombre.trim() === "") {
      return { success: false, error: "El nombre de la especialidad es requerido" }
    }

    if (datos.horaInicio >= datos.horaFin) {
      return { success: false, error: "La hora de inicio debe ser menor que la hora de fin" }
    }

    if (datos.intervalo.length === 0) {
      return { success: false, error: "Debe seleccionar al menos un intervalo de tiempo" }
    }

    // Generar ID único basado en el nombre (slug)
    const id = datos.nombre
      .toLowerCase()
      .replace(/[^\w\s]/gi, "")
      .replace(/\s+/g, "-")
      .concat("-", Math.floor(Math.random() * 1000).toString())

    // Verificar si ya existe una especialidad con el mismo nombre
    if (especialidades.some((e) => e.nombre.toLowerCase() === datos.nombre.toLowerCase())) {
      return { success: false, error: "Ya existe una especialidad con ese nombre" }
    }

    // Agregar la nueva especialidad
    const nuevaEspecialidad = {
      id,
      nombre: datos.nombre,
      activa: true,
      horaInicio: datos.horaInicio,
      horaFin: datos.horaFin,
      intervalo: datos.intervalo,
    }

    especialidades.push(nuevaEspecialidad)

    // Generar nuevos turnos para esta especialidad
    const ahora = new Date()
    for (let i = 0; i < 30; i++) {
      const fecha = new Date(ahora)
      fecha.setDate(ahora.getDate() + i)
      const fechaStr = fecha.toISOString().split("T")[0]

      for (let hora = datos.horaInicio; hora < datos.horaFin; hora++) {
        for (const minuto of datos.intervalo) {
          const horaStr = `${hora.toString().padStart(2, "0")}:${minuto.toString().padStart(2, "0")}`
          turnos.push({
            id: uuidv4(),
            fecha: fechaStr,
            hora: horaStr,
            nombre: "",
            email: "",
            telefono: "",
            especialidad: id,
            especialidadNombre: datos.nombre,
            reservado: false,
            version: 1,
          })
        }
      }
    }

    // Revalidar la página para actualizar los datos
    revalidatePath("/")
    revalidatePath("/admin/dashboard")

    return { success: true, id }
  } catch (error) {
    console.error("Error al agregar especialidad:", error)
    return {
      success: false,
      error: "Ocurrió un error al agregar la especialidad. Intente nuevamente.",
    }
  } finally {
    // Liberar el bloqueo
    liberarBloqueo("ESPECIALIDADES")
  }
}

// Eliminar una especialidad
export async function eliminarEspecialidad(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Adquirir bloqueo para esta operación crítica
    await adquirirBloqueo("ESPECIALIDADES")

    // Simular latencia de red/base de datos
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Verificar si la especialidad existe
    const especialidadIndex = especialidades.findIndex((e) => e.id === id)
    if (especialidadIndex === -1) {
      return { success: false, error: "La especialidad no existe" }
    }

    // Verificar si hay turnos reservados para esta especialidad
    const turnosReservados = turnos.some((t) => t.especialidad === id && t.reservado)
    if (turnosReservados) {
      return {
        success: false,
        error: "No se puede eliminar la especialidad porque tiene turnos reservados",
      }
    }

    // Eliminar la especialidad (marcarla como inactiva)
    especialidades[especialidadIndex].activa = false

    // Eliminar los turnos no reservados de esta especialidad
    const turnosAEliminar = turnos.filter((t) => t.especialidad === id && !t.reservado)
    for (const turno of turnosAEliminar) {
      const index = turnos.findIndex((t) => t.id === turno.id)
      if (index !== -1) {
        turnos.splice(index, 1)
      }
    }

    // Revalidar la página para actualizar los datos
    revalidatePath("/")
    revalidatePath("/admin/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error al eliminar especialidad:", error)
    return {
      success: false,
      error: "Ocurrió un error al eliminar la especialidad. Intente nuevamente.",
    }
  } finally {
    // Liberar el bloqueo
    liberarBloqueo("ESPECIALIDADES")
  }
}

// Resetear todos los turnos (liberar los reservados)
export async function resetearTurnos(): Promise<{ success: boolean; error?: string }> {
  try {
    // Adquirir bloqueo global para esta operación crítica
    await adquirirBloqueo("RESET_GLOBAL")

    // Simular latencia de red/base de datos
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Resetear todos los turnos reservados
    for (let i = 0; i < turnos.length; i++) {
      if (turnos[i].reservado) {
        turnos[i] = {
          ...turnos[i],
          nombre: "",
          email: "",
          telefono: "",
          motivo: "",
          reservado: false,
          version: turnos[i].version + 1,
        }
      }
    }

    // Revalidar la página para actualizar los datos
    revalidatePath("/")
    revalidatePath("/admin/dashboard")

    return { success: true }
  } catch (error) {
    console.error("Error al resetear turnos:", error)
    return {
      success: false,
      error: "Ocurrió un error al resetear los turnos. Intente nuevamente.",
    }
  } finally {
    // Liberar el bloqueo global
    liberarBloqueo("RESET_GLOBAL")
  }
}
