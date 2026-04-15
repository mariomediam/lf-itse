export default function DashboardHeader({ titulo, subtitulo, onActualizar }) {
  return (
    <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{titulo}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{subtitulo}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Exportar reporte — sin funcionalidad por ahora */}
        <button
          type="button"
          className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          title="Exportar reporte"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">Exportar reporte</span>
        </button>

        {/* Actualizar datos */}
        <button
          type="button"
          onClick={onActualizar}
          className="flex items-center gap-1.5 px-2.5 py-2 sm:px-4 bg-primary rounded-lg text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          title="Actualizar datos"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Actualizar datos</span>
        </button>
      </div>
    </div>
  )
}
