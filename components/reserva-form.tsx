"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { reservarTurno } from "@/lib/turnos-actions"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  nombre: z.string().min(2, { message: "El nombre es requerido" }),
  email: z.string().email({ message: "Email inválido" }),
  telefono: z.string().min(8, { message: "Teléfono inválido" }),
  motivo: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

export function ReservaForm() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [selectedTurno, setSelectedTurno] = useState<{
    fecha: string
    fechaFormateada: string
    hora: string
    especialidadNombre: string
    especialidad: string
  } | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: "",
      email: "",
      telefono: "",
      motivo: "",
    },
  })

  // Función para actualizar el turno seleccionado desde sessionStorage
  const updateSelectedTurno = () => {
    const turnoStr = sessionStorage.getItem("selectedTurno")
    if (turnoStr) {
      try {
        const turnoData = JSON.parse(turnoStr)
        setSelectedTurno(turnoData)
      } catch (e) {
        console.error("Error parsing selectedTurno", e)
      }
    } else {
      setSelectedTurno(null)
    }
  }

  // Actualizar al montar el componente
  useEffect(() => {
    updateSelectedTurno()

    // Escuchar el evento personalizado de selección de turno
    const handleTurnoSeleccionado = (event: CustomEvent) => {
      setSelectedTurno(event.detail)
    }

    window.addEventListener("turnoSeleccionado", handleTurnoSeleccionado as EventListener)

    // También escuchar cambios en sessionStorage
    window.addEventListener("storage", updateSelectedTurno)

    return () => {
      window.removeEventListener("turnoSeleccionado", handleTurnoSeleccionado as EventListener)
      window.removeEventListener("storage", updateSelectedTurno)
    }
  }, [])

  async function onSubmit(data: FormValues) {
    if (!selectedTurno) {
      toast({
        title: "Error",
        description: "Debe seleccionar un turno primero",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      // Guardar los datos del turno antes de la reserva
      const turnoAReservar = { ...selectedTurno }

      const result = await reservarTurno({
        ...data,
        fecha: selectedTurno.fecha,
        hora: selectedTurno.hora,
        especialidad: selectedTurno.especialidad,
      })

      if (result.success) {
        toast({
          title: "Turno reservado",
          description: `Su turno de ${selectedTurno.especialidadNombre} para el ${selectedTurno.fechaFormateada} a las ${selectedTurno.hora} ha sido reservado correctamente.`,
        })
        form.reset()
        sessionStorage.removeItem("selectedTurno")
        setSelectedTurno(null)

        // Disparar evento con los datos del turno que se reservó
        window.dispatchEvent(
          new CustomEvent("turnoReservado", {
            detail: {
              fecha: turnoAReservar.fecha,
              hora: turnoAReservar.hora,
              especialidad: turnoAReservar.especialidad,
            },
          }),
        )
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo reservar el turno. Intente nuevamente.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al procesar su solicitud",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        {selectedTurno ? (
          <div className="mb-4 p-3 bg-muted rounded-md">
            <p className="font-medium">Turno seleccionado:</p>
            <p>Especialidad: {selectedTurno.especialidadNombre}</p>
            <p>Fecha: {selectedTurno.fechaFormateada}</p>
            <p>Hora: {selectedTurno.hora}</p>
          </div>
        ) : (
          <div className="mb-4 p-3 bg-amber-50 text-amber-800 rounded-md">
            <p>Seleccione un turno disponible en el calendario</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nombre"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese su nombre" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="ejemplo@correo.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefono"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input placeholder="Ingrese su teléfono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="motivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo de la consulta (opcional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describa brevemente el motivo de su consulta" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading || !selectedTurno}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                "Reservar Turno"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
