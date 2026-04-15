"""
Utilidades de cálculo de plazos administrativos.

La regla de negocio es:
    fecha_vencimiento = fecha_inicio + plazo_dias hábiles

Un día se considera HÁBIL si no es:
  - Sábado o domingo
  - Feriado recurrente  (tabla feriados_recurrentes: combinación día/mes)
  - Feriado anual       (tabla feriados_anuales:   fecha exacta)

El conteo comienza en el día siguiente a fecha_inicio (fecha_inicio no se
cuenta como día del plazo, es el día de recepción del expediente).
"""

from datetime import date, timedelta

from django.db.models import Max

from .models import Expediente, FeriadoAnual, FeriadoRecurrente


def _cargar_feriados(fecha_inicio: date, plazo_dias: int) -> tuple[set, set]:
    """
    Devuelve dos conjuntos:
      - feriados_rec:    set de tuplas (dia, mes) de feriados recurrentes
      - feriados_anuales: set de objetos date de feriados anuales en el rango

    El rango de búsqueda se amplía (x3 + 60 días) para cubrir el peor caso
    donde casi todos los días son no hábiles.
    """
    margen = plazo_dias * 3 + 60
    fecha_max = fecha_inicio + timedelta(days=margen)

    feriados_rec: set[tuple[int, int]] = set(
        FeriadoRecurrente.objects.values_list('dia', 'mes')
    )

    feriados_anuales: set[date] = set(
        FeriadoAnual.objects.filter(
            feriado__gte=fecha_inicio,
            feriado__lte=fecha_max,
        ).values_list('feriado', flat=True)
    )

    return feriados_rec, feriados_anuales


def es_dia_habil(
    dia: date,
    feriados_rec: set[tuple[int, int]],
    feriados_anuales: set[date],
) -> bool:
    """Devuelve True si el día es hábil (no fin de semana ni feriado)."""
    if dia.weekday() >= 5:                          # 5 = sábado, 6 = domingo
        return False
    if (dia.day, dia.month) in feriados_rec:
        return False
    if dia in feriados_anuales:
        return False
    return True


def calcular_fecha_vencimiento(fecha_inicio: date, plazo_dias: int) -> date:
    """
    Calcula la fecha de vencimiento contando solo días hábiles.

    Parámetros
    ----------
    fecha_inicio : date
        Fecha de recepción del expediente.  No se cuenta como día del plazo.
    plazo_dias : int
        Número de días hábiles que tiene el plazo.

    Retorna
    -------
    date
        Fecha del último día hábil del plazo (inclusive).

    Ejemplo
    -------
    >>> calcular_fecha_vencimiento(date(2026, 4, 14), 15)
    date(2026, 5, 5)   # resultado aproximado según feriados registrados
    """
    if plazo_dias <= 0:
        raise ValueError('plazo_dias debe ser un entero positivo.')

    feriados_rec, feriados_anuales = _cargar_feriados(fecha_inicio, plazo_dias)

    dias_contados = 0
    fecha_actual = fecha_inicio

    while dias_contados < plazo_dias:
        fecha_actual += timedelta(days=1)
        if es_dia_habil(fecha_actual, feriados_rec, feriados_anuales):
            dias_contados += 1

    return fecha_actual


def calcular_fecha_alerta(fecha_vencimiento: date, dias_alerta: int) -> date:
    """
    Retrocede ``dias_alerta`` días hábiles desde fecha_vencimiento para
    obtener la fecha a partir de la cual se debe alertar al operador.

    Parámetros
    ----------
    fecha_vencimiento : date
        Fecha límite calculada con calcular_fecha_vencimiento().
    dias_alerta : int
        Días hábiles de anticipación para la alerta (valor de
        TipoProcedimientoTupa.dias_alerta_vencimiento).

    Retorna
    -------
    date
        Fecha de inicio de la alerta.
    """
    if dias_alerta <= 0:
        return fecha_vencimiento

    # Cargamos feriados hacia atrás usando la misma ventana
    margen = dias_alerta * 3 + 60
    fecha_min = fecha_vencimiento - timedelta(days=margen)

    feriados_rec: set[tuple[int, int]] = set(
        FeriadoRecurrente.objects.values_list('dia', 'mes')
    )
    feriados_anuales: set[date] = set(
        FeriadoAnual.objects.filter(
            feriado__gte=fecha_min,
            feriado__lte=fecha_vencimiento,
        ).values_list('feriado', flat=True)
    )

    dias_contados = 0
    fecha_actual = fecha_vencimiento

    while dias_contados < dias_alerta:
        fecha_actual -= timedelta(days=1)
        if es_dia_habil(fecha_actual, feriados_rec, feriados_anuales):
            dias_contados += 1

    return fecha_actual


def calcular_plazos_expediente(
    fecha_inicio: date,
    plazo_dias: int,
    dias_alerta: int,
) -> dict[str, date]:
    """
    Calcula en un solo paso fecha_vencimiento y fecha_alerta para un expediente.

    Retorna
    -------
    dict con claves 'fecha_vencimiento' y 'fecha_alerta'.

    Ejemplo de uso
    --------------
    >>> from app_lf_itse.utils import calcular_plazos_expediente
    >>> from datetime import date
    >>> resultado = calcular_plazos_expediente(
    ...     fecha_inicio=date(2026, 4, 14),
    ...     plazo_dias=15,
    ...     dias_alerta=3,
    ... )
    >>> resultado['fecha_vencimiento']
    date(2026, 5, 5)
    >>> resultado['fecha_alerta']
    date(2026, 4, 30)
    """
    fecha_vencimiento = calcular_fecha_vencimiento(fecha_inicio, plazo_dias)
    fecha_alerta = calcular_fecha_alerta(fecha_vencimiento, dias_alerta)
    return {
        'fecha_vencimiento': fecha_vencimiento,
        'fecha_alerta': fecha_alerta,
    }


def siguiente_numero_expediente(fecha: date) -> int:
    """
    Determina el número correlativo siguiente para un expediente del año
    indicado por ``fecha``.

    Lógica
    ------
    1. Extrae el año de ``fecha``.
    2. Busca el máximo ``numero_expediente`` entre todos los expedientes
       cuya ``fecha_recepcion`` corresponde a ese año.
    3. Retorna ese máximo + 1.
       Si no existe ningún expediente en el año, retorna 1.

    Parámetros
    ----------
    fecha : date | datetime
        Fecha de recepción del expediente que se está creando.

    Retorna
    -------
    int
        Número de expediente correlativo siguiente.

    Ejemplo
    -------
    >>> siguiente_numero_expediente(date(2026, 4, 14))
    42   # si el último expediente del 2026 tiene numero_expediente=41
    """
    anio = fecha.year

    resultado = Expediente.objects.filter(
        fecha_recepcion__year=anio,
    ).aggregate(maximo=Max('numero_expediente'))

    maximo = resultado['maximo']
    return (maximo + 1) if maximo is not None else 1
