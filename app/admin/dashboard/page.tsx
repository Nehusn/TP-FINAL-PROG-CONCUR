"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, LogOut, RefreshCw, Plus, Trash2, Clock } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  getTurnosAdmin,
  resetearTurnos,
  getEspecialidades,
  agregarEspecialidad,
  eliminarEspecialidad,
} from "@/lib/admin-actions"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

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
  reservado: boolean
}

type Especialidad = {
  id: string
  nombre: string
  activa: boolean
  horaInicio: number
  horaFin: number
  intervalo: number[]
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [especialidades, setEspecialidades] = useState<Especialidad[]>([])
  const [reseteando, setReseteando] = useState(false)
  const [agregandoEspecialidad, setAgregandoEspecialidad] = useState(false)
  const [eliminandoEspecialidad, setEliminandoEspecialidad] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [nuevaEspecialidad, setNuevaEspecialidad] = useState({
    nombre: "",
    horaInicio: 8,
    horaFin: 17,
    intervalo: [0, 30],
  })
  const [estadisticas, setEstadisticas] = useState({
    totalTurnos: 0,
    turnosReservados: 0,
    turnosDisponibles: 0,
    especialidades: {} as Record<string, number>,
  })
  const router = useRouter()
  const { toast } = useToast()

  // Verificar autenticación
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("adminAuthenticated") === "true"
    if (!isAuthenticated) {
      router.push("/admin/login")
    } else {
      setAuthenticated(true)
      cargarDatos()
    }
  }, [router])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      const [turnosData, especialidadesData] = await Promise.all([getTurnosAdmin(), getEspecialidades()])

      setTurnos(turnosData)
      setEspecialidades(especialidadesData)

      // Calcular estadísticas
      const reservados = turnosData.filter((t) => t.reservado)
      const disponibles = turnosData.filter((t) => !t.reservado)

      // Contar por especialidad
      const especialidadesCount: Record<string, number> = {}
      reservados.forEach((t) => {
        if (!especialidadesCount[t.especialidadNombre]) {
          especialidadesCount[t.especialidadNombre] = 0
        }
        especialidadesCount[t.especialidadNombre]++
      })

      setEstadisticas({
        totalTurnos: turnosData.length,
        turnosReservados: reservados.length,
        turnosDisponibles: disponibles.length,
        especialidades: especialidadesCount,
      })
    } catch (error) {
      console.error("Error al cargar datos administrativos", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos administrativos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("adminAuthenticated")
    router.push("/")
  }

  const handleResetearTurnos = async () => {
    if (window.confirm("¿Está seguro que desea resetear todos los turnos? Esta acción no se puede deshacer.")) {
      setReseteando(true)
      try {
        await resetearTurnos()
        toast({
          title: "Turnos reseteados",
          description: "Todos los turnos han sido reseteados correctamente",
        })
        cargarDatos()
      } catch (error) {
        toast({
          title: "Error",
          description: "No se pudieron resetear los turnos",
          variant: "destructive",
        })
      } finally {
        setReseteando(false)
      }
    }
  }

  const handleAgregarEspecialidad = async () => {
    setAgregandoEspecialidad(true)
    try {
      const result = await agregarEspecialidad(nuevaEspecialidad)
      if (result.success) {
        toast({
          title: "Especialidad agregada",
          description: `La especialidad ${nuevaEspecialidad.nombre} ha sido agregada correctamente`,
        })
        setDialogOpen(false)
        setNuevaEspecialidad({
          nombre: "",
          horaInicio: 8,
          horaFin: 17,
          intervalo: [0, 30],
        })
        cargarDatos()
      } else {
        toast({
          title: "Error",
          description: result.error || "No se pudo agregar la especialidad",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al agregar la especialidad",
        variant: "destructive",
      })
    } finally {
      setAgregandoEspecialidad(false)
    }
  }

  const handleEliminarEspecialidad = async (id: string) => {
    if (window.confirm("¿Está seguro que desea eliminar esta especialidad? Esta acción no se puede deshacer.")) {
      setEliminandoEspecialidad(id)
      try {
        const result = await eliminarEspecialidad(id)
        if (result.success) {
          toast({
            title: "Especialidad eliminada",
            description: "La especialidad ha sido eliminada correctamente",
          })
          cargarDatos()
        } else {
          toast({
            title: "Error",
            description: result.error || "No se pudo eliminar la especialidad",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Ocurrió un error al eliminar la especialidad",
          variant: "destructive",
        })
      } finally {
        setEliminandoEspecialidad(null)
      }
    }
  }

  const handleIntervalChange = (value: number, checked: boolean) => {
    if (checked) {
      setNuevaEspecialidad({
        ...nuevaEspecialidad,
        intervalo: [...nuevaEspecialidad.intervalo, value].sort((a, b) => a - b),
      })
    } else {
      setNuevaEspecialidad({
        ...nuevaEspecialidad,
        intervalo: nuevaEspecialidad.intervalo.filter((i) => i !== value),
      })
    }
  }

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Panel de Administración - Agenda Concurrente</h1>
        <div className="flex gap-4 items-center">
          <ThemeToggle />
          <Button variant="outline" onClick={cargarDatos} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Turnos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{estadisticas.totalTurnos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Turnos Reservados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{estadisticas.turnosReservados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Turnos Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{estadisticas.turnosDisponibles}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="turnos" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="turnos">Gestión de Turnos</TabsTrigger>
          <TabsTrigger value="especialidades">Gestión de Especialidades</TabsTrigger>
        </TabsList>

        <TabsContent value="turnos">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3">
              <Card>
                <CardHeader>
                  <CardTitle>Turnos</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="reservados">
                    <TabsList className="mb-4">
                      <TabsTrigger value="reservados">Turnos Reservados</TabsTrigger>
                      <TabsTrigger value="disponibles">Turnos Disponibles</TabsTrigger>
                    </TabsList>

                    <TabsContent value="reservados">
                      <div className="border rounded-md">
                        <div className="grid grid-cols-6 gap-4 p-4 font-medium border-b bg-muted/50">
                          <div>Fecha</div>
                          <div>Hora</div>
                          <div>Especialidad</div>
                          <div>Paciente</div>
                          <div>Contacto</div>
                          <div>Motivo</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {turnos.filter((t) => t.reservado).length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No hay turnos reservados</div>
                          ) : (
                            turnos
                              .filter((t) => t.reservado)
                              .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
                              .map((turno) => (
                                <div key={turno.id} className="grid grid-cols-6 gap-4 p-4 border-b hover:bg-muted/20">
                                  <div>{new Date(turno.fecha).toLocaleDateString()}</div>
                                  <div>{turno.hora}</div>
                                  <div>{turno.especialidadNombre}</div>
                                  <div>{turno.nombre}</div>
                                  <div className="text-sm">
                                    <div>{turno.email}</div>
                                    <div>{turno.telefono}</div>
                                  </div>
                                  <div className="truncate">{turno.motivo || "-"}</div>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="disponibles">
                      <div className="border rounded-md">
                        <div className="grid grid-cols-4 gap-4 p-4 font-medium border-b bg-muted/50">
                          <div>Fecha</div>
                          <div>Hora</div>
                          <div>Especialidad</div>
                          <div>Estado</div>
                        </div>
                        <div className="max-h-[400px] overflow-y-auto">
                          {turnos.filter((t) => !t.reservado).length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">No hay turnos disponibles</div>
                          ) : (
                            turnos
                              .filter((t) => !t.reservado)
                              .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora.localeCompare(b.hora))
                              .slice(0, 100) // Limitar a 100 para mejor rendimiento
                              .map((turno) => (
                                <div key={turno.id} className="grid grid-cols-4 gap-4 p-4 border-b hover:bg-muted/20">
                                  <div>{new Date(turno.fecha).toLocaleDateString()}</div>
                                  <div>{turno.hora}</div>
                                  <div>{turno.especialidadNombre}</div>
                                  <div>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      Disponible
                                    </span>
                                  </div>
                                </div>
                              ))
                          )}
                          {turnos.filter((t) => !t.reservado).length > 100 && (
                            <div className="p-2 text-center text-sm text-muted-foreground">
                              Mostrando 100 de {turnos.filter((t) => !t.reservado).length} turnos disponibles
                            </div>
                          )}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button
                    variant="destructive"
                    className="w-full flex items-center gap-2"
                    onClick={handleResetearTurnos}
                    disabled={reseteando}
                  >
                    {reseteando ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        Resetear Turnos
                      </>
                    )}
                  </Button>

                  <Link href="/" className="w-full">
                    <Button variant="outline" className="w-full">
                      Ir a la página principal
                    </Button>
                  </Link>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>Reservas por Especialidad</CardTitle>
                </CardHeader>
                <CardContent>
                  {Object.keys(estadisticas.especialidades).length === 0 ? (
                    <div className="text-center text-muted-foreground">No hay datos disponibles</div>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(estadisticas.especialidades).map(([especialidad, cantidad]) => (
                        <div key={especialidad} className="flex justify-between items-center">
                          <span>{especialidad}</span>
                          <span className="font-bold">{cantidad}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="especialidades">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Especialidades</CardTitle>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Agregar Especialidad
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Nueva Especialidad</DialogTitle>
                        <DialogDescription>
                          Complete los datos para agregar una nueva especialidad al sistema.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombre">Nombre de la Especialidad</Label>
                          <Input
                            id="nombre"
                            value={nuevaEspecialidad.nombre}
                            onChange={(e) => setNuevaEspecialidad({ ...nuevaEspecialidad, nombre: e.target.value })}
                            placeholder="Ej: Oftalmología"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="horaInicio">Hora de Inicio</Label>
                            <Select
                              value={nuevaEspecialidad.horaInicio.toString()}
                              onValueChange={(value) =>
                                setNuevaEspecialidad({
                                  ...nuevaEspecialidad,
                                  horaInicio: Number.parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar hora" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 8).map((hora) => (
                                  <SelectItem key={hora} value={hora.toString()}>
                                    {hora}:00
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="horaFin">Hora de Fin</Label>
                            <Select
                              value={nuevaEspecialidad.horaFin.toString()}
                              onValueChange={(value) =>
                                setNuevaEspecialidad({
                                  ...nuevaEspecialidad,
                                  horaFin: Number.parseInt(value),
                                })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar hora" />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 9).map((hora) => (
                                  <SelectItem key={hora} value={hora.toString()}>
                                    {hora}:00
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Intervalos de Tiempo</Label>
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="intervalo0"
                                checked={nuevaEspecialidad.intervalo.includes(0)}
                                onCheckedChange={(checked) => handleIntervalChange(0, checked as boolean)}
                              />
                              <Label htmlFor="intervalo0">En punto (XX:00)</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="intervalo30"
                                checked={nuevaEspecialidad.intervalo.includes(30)}
                                onCheckedChange={(checked) => handleIntervalChange(30, checked as boolean)}
                              />
                              <Label htmlFor="intervalo30">Media hora (XX:30)</Label>
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit" onClick={handleAgregarEspecialidad} disabled={agregandoEspecialidad}>
                          {agregandoEspecialidad ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Agregando...
                            </>
                          ) : (
                            "Agregar Especialidad"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-md">
                    <div className="grid grid-cols-5 gap-4 p-4 font-medium border-b bg-muted/50">
                      <div>Nombre</div>
                      <div>Estado</div>
                      <div>Horario</div>
                      <div>Intervalos</div>
                      <div>Acciones</div>
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {especialidades.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">No hay especialidades disponibles</div>
                      ) : (
                        especialidades.map((esp) => (
                          <div key={esp.id} className="grid grid-cols-5 gap-4 p-4 border-b hover:bg-muted/20">
                            <div className="font-medium">{esp.nombre}</div>
                            <div>
                              {esp.activa ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Activa
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Inactiva
                                </span>
                              )}
                            </div>
                            <div className="flex items-center">
                              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                              {esp.horaInicio}:00 - {esp.horaFin}:00
                            </div>
                            <div>
                              {esp.intervalo.includes(0) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1">
                                  XX:00
                                </span>
                              )}
                              {esp.intervalo.includes(30) && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  XX:30
                                </span>
                              )}
                            </div>
                            <div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleEliminarEspecialidad(esp.id)}
                                disabled={eliminandoEspecialidad === esp.id}
                                className="flex items-center gap-1"
                              >
                                {eliminandoEspecialidad === esp.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Eliminar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Información</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p>
                      <strong>Total de especialidades:</strong> {especialidades.filter((e) => e.activa).length}
                    </p>
                    <p>
                      Al agregar una nueva especialidad, se generarán automáticamente turnos disponibles para los
                      próximos 30 días según la configuración de horarios e intervalos.
                    </p>
                    <p>
                      Al eliminar una especialidad, se eliminarán todos los turnos disponibles asociados a ella. Los
                      turnos ya reservados no se verán afectados.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
