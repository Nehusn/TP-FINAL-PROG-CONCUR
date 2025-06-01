"use client"

import { useEffect, useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getTurnosDisponibles, getEspecialidadesActivas } from "@/lib/turnos-actions"
import { Loader2, Lock } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"

type Especialidad = {
  id: string
  nombre: string
}

type Turno = {
  hora: string
  disponible: boolean
}

export function CalendarioTurnos() {
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [especialidad, setEspecialidad] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEspecialidades, setLoadingEspecialidades] = useState(true)
  const [selectedHora, setSelectedHora] = useState<string | null>(null)
  const [calendarDisabled, setCalendarDisabled] = useState(true)
  const [horariosDisabled, setHorariosDisabled] = useState(true)

  // Cargar especialidades al inicio
  useEffect(() => {
    const cargarEspecialidades = async () => {
      setLoadingEspecialidades(true)
      try {
        const data = await getEspecialidadesActivas()
        setEspecialidades(data)
      } catch (error) {
        console.error("Error al cargar especialidades", error)
      } finally {
        setLoadingEspecialidades(false)
      }
    }

    cargarEspecialidades()
  }, [])

  // Efecto para habilitar el calendario cuando se selecciona especialidad
  useEffect(() => {
    if (especialidad) {
      setCalendarDisabled(false)
      // Resetear fecha y horarios cuando cambia la especialidad
      setTurnos([])
      setSelectedHora(null)
      setHorariosDisabled(true)
    } else {
      setCalendarDisabled(true)
    }
  }, [especialidad])

  // Función para cargar los turnos disponibles
  const cargarTurnos = async () => {
    if (!date || !especialidad || calendarDisabled) return

    setLoading(true)
    setHorariosDisabled(false)
    try {
      const turnosData = await getTurnosDisponibles(date.toISOString(), especialidad)
      setTurnos(turnosData)

      // Verificar si el turno seleccionado sigue disponible
      if (selectedHora) {
        const sigueDisponible = turnosData.some((t) => t.hora === selectedHora && t.disponible)
        if (!sigueDisponible) {
          setSelectedHora(null)
          sessionStorage.removeItem("selectedTurno")
        }
      }
    } catch (error) {
      console.error("Error al cargar turnos", error)
    } finally {
      setLoading(false)
    }
  }

  // Efecto para cargar horarios cuando se selecciona fecha
  useEffect(() => {
    cargarTurnos()
  }, [date, especialidad, calendarDisabled])

  // Escuchar evento de turno reservado para actualizar la lista
  useEffect(() => {
    const handleTurnoReservado = (event: CustomEvent) => {
      const { fecha, especialidad: espReservada } = event.detail

      // Solo actualizar si coincide con la fecha y especialidad actual
      if (date && especialidad && date.toISOString().split("T")[0] === fecha && especialidad === espReservada) {
        cargarTurnos()
      }
    }

    window.addEventListener("turnoReservado", handleTurnoReservado as EventListener)

    return () => {
      window.removeEventListener("turnoReservado", handleTurnoReservado as EventListener)
    }
  }, [date, especialidad])

  const handleEspecialidadChange = (value: string) => {
    setEspecialidad(value)
    // Limpiar selecciones previas
    setSelectedHora(null)
    sessionStorage.removeItem("selectedTurno")
  }

  const handleHorarioClick = (turno: Turno) => {
    // Solo permitir seleccionar turnos disponibles
    if (!turno.disponible) return

    // Almacenar en sessionStorage para usar en el formulario
    if (date && especialidad) {
      // Formatear la fecha correctamente para evitar problemas de zona horaria
      const fechaFormateada = format(date, "yyyy-MM-dd")

      const turnoData = {
        fecha: fechaFormateada,
        fechaFormateada: format(date, "dd/MM/yyyy", { locale: es }),
        hora: turno.hora,
        especialidad,
        especialidadNombre: especialidades.find((e) => e.id === especialidad)?.nombre,
      }

      // Guardar en sessionStorage
      sessionStorage.setItem("selectedTurno", JSON.stringify(turnoData))

      // Actualizar estado local
      setSelectedHora(turno.hora)

      // Disparar evento personalizado para notificar a otros componentes
      window.dispatchEvent(
        new CustomEvent("turnoSeleccionado", {
          detail: turnoData,
        }),
      )

      console.log("Turno seleccionado:", turnoData)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">1. Seleccione especialidad:</h3>
          {loadingEspecialidades ? (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Select onValueChange={handleEspecialidadChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar especialidad" />
              </SelectTrigger>
              <SelectContent>
                {especialidades.map((esp) => (
                  <SelectItem key={esp.id} value={esp.id}>
                    {esp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card className={calendarDisabled ? "opacity-60" : ""}>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">2. Seleccione fecha:</h3>
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="mx-auto"
            locale={es}
            disabled={(currentDate) => {
              const now = new Date()
              return calendarDisabled || currentDate < new Date(now.setHours(0, 0, 0, 0))
            }}
          />
        </CardContent>
      </Card>

      <Card className={horariosDisabled ? "opacity-60" : ""}>
        <CardContent className="pt-6">
          <h3 className="font-medium mb-3">3. Seleccione horario:</h3>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : horariosDisabled ? (
            <p className="text-center py-4 text-muted-foreground">Seleccione una especialidad y fecha primero</p>
          ) : turnos.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {turnos.map((turno) => (
                <Button
                  key={turno.hora}
                  variant={selectedHora === turno.hora ? "default" : "outline"}
                  className={`w-full ${!turno.disponible ? "bg-gray-200 text-gray-500 hover:bg-gray-200 cursor-not-allowed" : ""}`}
                  onClick={() => handleHorarioClick(turno)}
                  disabled={!turno.disponible}
                >
                  {turno.disponible ? (
                    turno.hora
                  ) : (
                    <span className="flex items-center justify-center">
                      <Lock className="h-3 w-3 mr-1" />
                      {turno.hora}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          ) : (
            <p className="text-center py-4 text-muted-foreground">
              No hay turnos disponibles para esta fecha y especialidad
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
