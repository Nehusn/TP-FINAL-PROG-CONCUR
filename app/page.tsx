import { Suspense } from "react"
import { CalendarioTurnos } from "@/components/calendario-turnos"
import { ReservaForm } from "@/components/reserva-form"
import { TurnosReservados } from "@/components/turnos-reservados"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import Link from "next/link"
import { LockKeyhole } from "lucide-react"
import { CardFooter } from "@/components/ui/card"

export default function Home() {
  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-center">Agenda Concurrente</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/admin/login">
            <Button variant="outline" className="flex items-center gap-2">
              <LockKeyhole className="h-4 w-4" />
              Administración
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Turnos Disponibles</h2>
          <Suspense fallback={<Skeleton className="h-[400px] w-full" />}>
            <CalendarioTurnos />
          </Suspense>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold mb-4">Reservar Turno</h2>
            <ReservaForm />
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Mis Turnos Reservados</h2>
            <Suspense fallback={<Skeleton className="h-[200px] w-full" />}>
              <TurnosReservados />
            </Suspense>
          </div>
        </div>
      </div>
      <footer className="mt-12 text-center text-sm text-gray-500">
        <CardFooter className="justify-center">
          Desarrollado por{" "}
          <Link href="https://github.com/Nehusn" target="_blank">
            Red Crossbones
          </Link>
          {" | "}
        </CardFooter>
      </footer>
    </main>
  )
}
