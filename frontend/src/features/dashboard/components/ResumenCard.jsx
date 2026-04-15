// Icono para licencias de funcionamiento
const IconoLicencia = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

// Icono para ITSE
const IconoItse = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

/**
 * Tarjeta de resumen para el dashboard.
 *
 * Props
 * -----
 * titulo   : string   — texto del indicador
 * total    : number   — valor numérico a mostrar
 * esAlerta : boolean  — true → estilo rojo; false → estilo azul
 * tipo     : 'licencia' | 'itse'  — determina el icono
 */
export default function ResumenCard({ titulo, total, esAlerta = false, tipo }) {
  const Icono = tipo === 'licencia' ? IconoLicencia : IconoItse

  return (
    <div className={[
      'bg-white rounded-lg p-5 border-l-4 shadow-sm flex items-center justify-between gap-4',
      esAlerta ? 'border-danger' : 'border-primary',
    ].join(' ')}>
      <div>
        <p className={`text-sm font-medium leading-tight ${esAlerta ? 'text-danger' : 'text-gray-600'}`}>
          {titulo}
        </p>
        <p className={`text-4xl font-bold mt-2 ${esAlerta ? 'text-danger' : 'text-gray-900'}`}>
          {total}
        </p>
      </div>

      <div className={`p-3 rounded-full shrink-0 ${esAlerta ? 'bg-red-100' : 'bg-blue-50'}`}>
        <Icono className={`w-7 h-7 ${esAlerta ? 'text-danger' : 'text-primary'}`} />
      </div>
    </div>
  )
}
