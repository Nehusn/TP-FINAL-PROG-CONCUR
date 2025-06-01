"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getTurnosReservados, cancelarTurno } from "@/lib/turnos-actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Calendar, Clock, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"

type Turno = {
  id: string
  fecha: string
  hora: string
  nombre: string
  email: string
  telefono: string
  motivo?: string
  especialidad: string
  especialidadNombre: string
}

export function TurnosReservados() {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [loading, setLoading] = useState(true)
  const [cancelando, setCancelando] = useState<string | null>(null)
  const { toast } = useToast()

  const cargarTurnos = async () => {
    setLoading(true)
    try {
      // En un sistema real, esto podría identificar al usuario actual
      const email = localStorage.getItem("userEmail") || ""
      const turnosData = await getTurnosReservados(email)
      setTurnos(turnosData)
    } catch (error) {
      console.error("Error al cargar turnos", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los turnos reservados",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarTurnos()
    // Establecer un intervalo para actualizar los turnos cada 30 segundos
    // para reflejar cambios realizados por otros usuarios
    const interval = setInterval(cargarTurnos, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleCancelar = async (id: string) => {
    setCancelando(id)
    try {
      const result = await cancelarTurno(id)
      if (result.success) {
        toast({
          title: "Turno cancelado",
          description: "El turno ha sido cancelado correctamente",
        })
        // Actualizar la lista de turnos
        setTurnos(turnos.filter((t) => t.id !== id))
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo cancelar el turno",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al cancelar el turno",
        variant: "destructive",
      })
    } finally {
      setCancelando(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (turnos.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-8">
          <p className="text-muted-foreground">No tiene turnos reservados</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {turnos.map((turno) => (
        <Card key={turno.id} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{turno.nombre}</h3>
                  <div className="text-sm text-muted-foreground">{turno.email}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleCancelar(turno.id)} disabled={!!cancelando}>
                  {cancelando === turno.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  {format(parseISO(turno.fecha), "dd/MM/yyyy", { locale: es })}
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  {turno.hora}
                </div>
              </div>

              <div className="mt-2 text-sm">
                <span className="font-medium">Especialidad:</span> {turno.especialidadNombre}
              </div>

              {turno.motivo && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">Motivo:</span> {turno.motivo}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
