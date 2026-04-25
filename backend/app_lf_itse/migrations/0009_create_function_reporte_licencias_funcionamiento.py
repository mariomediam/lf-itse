from django.db import migrations

FUNCTION_SQL = """
DROP FUNCTION IF EXISTS reporte_licencias_funcionamiento;

CREATE OR REPLACE FUNCTION reporte_licencias_funcionamiento(
    p_numero_licencia            INTEGER DEFAULT NULL,
    p_numero_expediente          INTEGER DEFAULT NULL,
    p_anio_expediente            INTEGER DEFAULT NULL,
    p_emision_desde              DATE    DEFAULT NULL,
    p_emision_hasta              DATE    DEFAULT NULL,
    p_titular_nombre             TEXT    DEFAULT NULL,
    p_titular_numero_documento   TEXT    DEFAULT NULL,
    p_conductor_nombre           TEXT    DEFAULT NULL,
    p_conductor_numero_documento TEXT    DEFAULT NULL,
    p_nombre_comercial           TEXT    DEFAULT NULL,
    p_vigencia_desde             DATE    DEFAULT NULL,
    p_vigencia_hasta             DATE    DEFAULT NULL,
    p_nivel_riesgo_id            INTEGER DEFAULT NULL,
    p_direccion                  TEXT    DEFAULT NULL,
    p_zonificacion_id            INTEGER DEFAULT NULL,
    p_numero_recibo_pago         TEXT    DEFAULT NULL,
    p_fecha_notificacion_desde   DATE    DEFAULT NULL,
    p_fecha_notificacion_hasta   DATE    DEFAULT NULL,
    p_esta_activo                BOOLEAN DEFAULT NULL,
    p_giro_nombre                TEXT    DEFAULT NULL
)
RETURNS TABLE (
    id                                BIGINT,
    expediente_id                     BIGINT,
    tipo_licencia_id                  BIGINT,
    numero_licencia                   INTEGER,
    fecha_emision                     DATE,
    titular_id                        BIGINT,
    conductor_id                      BIGINT,
    licencia_principal_id             BIGINT,
    nombre_comercial                  TEXT,
    es_vigencia_indeterminada         BOOLEAN,
    fecha_inicio_vigencia             DATE,
    fecha_fin_vigencia                DATE,
    nivel_riesgo_id                   BIGINT,
    actividad                         TEXT,
    direccion                         TEXT,
    hora_desde                        INTEGER,
    hora_hasta                        INTEGER,
    resolucion_numero                 TEXT,
    zonificacion_id                   BIGINT,
    area                              NUMERIC,
    numero_recibo_pago                TEXT,
    observaciones                     TEXT,
    se_puede_publicar                 BOOLEAN,
    fecha_notificacion                TIMESTAMPTZ,
    usuario_id                        INTEGER,
    fecha_digitacion                  TIMESTAMPTZ,
    titular_documentos_concatenados   TEXT,
    conductor_documentos_concatenados TEXT,
    giro_concatenado                  TEXT,
    numero_expediente                 INTEGER,
    fecha_recepcion                   TIMESTAMPTZ,
    tipos_procedimiento_tupa_nombre   TEXT,
    titular_nombre                    TEXT,
    titular_direccion                 TEXT,
    titular_distrito                  TEXT,
    titular_provincia                 TEXT,
    titular_departamento              TEXT,
    titular_telefono                  TEXT,
    titular_correo_electronico        TEXT,
    conductor_nombre                  TEXT,
    conductor_direccion               TEXT,
    conductor_distrito                TEXT,
    conductor_provincia               TEXT,
    conductor_departamento            TEXT,
    conductor_telefono                TEXT,
    conductor_correo_electronico      TEXT,
    esta_activo                       BOOLEAN
)
LANGUAGE plpgsql
AS $func$
DECLARE
    v_sql    TEXT;
    v_filter TEXT := '';
BEGIN
    -- Tablas temporales (se eliminan al hacer commit de la transacción)
    CREATE TEMP TABLE tmp_lf_filtradas
        (licencia_id BIGINT) ON COMMIT DROP;
    CREATE TEMP TABLE tmp_lf_titular_filas
        (licencia_id BIGINT, documento TEXT) ON COMMIT DROP;
    CREATE TEMP TABLE tmp_lf_titular_concat
        (licencia_id BIGINT, titular_documentos_concatenados TEXT) ON COMMIT DROP;
    CREATE TEMP TABLE tmp_lf_conductor_filas
        (licencia_id BIGINT, documento TEXT) ON COMMIT DROP;
    CREATE TEMP TABLE tmp_lf_conductor_concat
        (licencia_id BIGINT, conductor_documentos_concatenados TEXT) ON COMMIT DROP;
    CREATE TEMP TABLE tmp_lf_giro_filas
        (licencia_id BIGINT, giro TEXT) ON COMMIT DROP;
    CREATE TEMP TABLE tmp_lf_giro_concat
        (licencia_id BIGINT, giro_concatenado TEXT) ON COMMIT DROP;

    -- ── Paso 1: query dinámica de filtrado (equivale al sp_executesql) ────────
    v_sql :=
        'SELECT DISTINCT licencias_funcionamiento.id '
        'FROM licencias_funcionamiento '
        'LEFT JOIN personas AS TTitular '
        '    ON licencias_funcionamiento.titular_id = TTitular.id '
        'LEFT JOIN expedientes '
        '    ON licencias_funcionamiento.expediente_id = expedientes.id '
        'LEFT JOIN personas_documentos AS titular_documentos '
        '    ON licencias_funcionamiento.titular_id = titular_documentos.persona_id '
        'LEFT JOIN personas AS TConductor '
        '    ON licencias_funcionamiento.conductor_id = TConductor.id '
        'LEFT JOIN personas_documentos AS conductor_documentos '
        '    ON licencias_funcionamiento.conductor_id = conductor_documentos.persona_id '
        'LEFT JOIN ('
        '    SELECT DISTINCT licencias_funcionamiento_estados.licencia_funcionamiento_id '
        '    FROM licencias_funcionamiento_estados '
        '    INNER JOIN estados '
        '        ON licencias_funcionamiento_estados.estado_id = estados.id '
        '    WHERE estados.esta_activo = FALSE'
        ') AS TLicenciasInactivas '
        '    ON licencias_funcionamiento.id = TLicenciasInactivas.licencia_funcionamiento_id '
        'LEFT JOIN licencias_funcionamiento_giros '
        '    ON licencias_funcionamiento.id = licencias_funcionamiento_giros.licencia_funcionamiento_id '
        'LEFT JOIN giros '
        '    ON licencias_funcionamiento_giros.giro_id = giros.id';

    -- Construcción dinámica del WHERE (igual que el bloque de IFs del procedimiento original)
    IF p_numero_licencia IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'licencias_funcionamiento.numero_licencia = ' || p_numero_licencia;
    END IF;

    IF p_numero_expediente IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'expedientes.numero_expediente = ' || p_numero_expediente;
    END IF;

    IF p_anio_expediente IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'EXTRACT(YEAR FROM expedientes.fecha_recepcion) = ' || p_anio_expediente;
    END IF;

    IF p_emision_desde IS NOT NULL AND p_emision_hasta IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'licencias_funcionamiento.fecha_emision BETWEEN '
            || quote_literal(p_emision_desde) || ' AND ' || quote_literal(p_emision_hasta);
    END IF;

    IF p_titular_nombre IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'TRIM(COALESCE(TTitular.apellido_paterno, '''') || '' '' || COALESCE(TTitular.apellido_materno, '''') || '' '' || COALESCE(TTitular.nombres, '''')) ILIKE '
            || quote_literal('%' || REPLACE(p_titular_nombre, ' ', '%'));
    END IF;

    IF p_titular_numero_documento IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'titular_documentos.numero_documento = '
            || quote_literal(p_titular_numero_documento);
    END IF;

    IF p_conductor_nombre IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'TRIM(COALESCE(TConductor.apellido_paterno, '''') || '' '' || COALESCE(TConductor.apellido_materno, '''') || '' '' || COALESCE(TConductor.nombres, '''')) ILIKE '
            || quote_literal('%' || REPLACE(p_conductor_nombre, ' ', '%'));
    END IF;

    IF p_conductor_numero_documento IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'conductor_documentos.numero_documento = '
            || quote_literal(p_conductor_numero_documento);
    END IF;

    IF p_nombre_comercial IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'TRIM(licencias_funcionamiento.nombre_comercial) ILIKE '
            || quote_literal('%' || REPLACE(p_nombre_comercial, ' ', '%'));
    END IF;

    IF p_vigencia_desde IS NOT NULL AND p_vigencia_hasta IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || '('
            ||   '(licencias_funcionamiento.es_vigencia_indeterminada = TRUE'
            ||   ' AND licencias_funcionamiento.fecha_emision <= ' || quote_literal(p_vigencia_desde) || ')'
            ||   ' OR (licencias_funcionamiento.fecha_emision BETWEEN '
            ||   quote_literal(p_vigencia_desde) || ' AND ' || quote_literal(p_vigencia_hasta) || ')'
            || ')';
    END IF;

    IF p_nivel_riesgo_id IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'licencias_funcionamiento.nivel_riesgo_id = ' || p_nivel_riesgo_id;
    END IF;

    IF p_direccion IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'TRIM(licencias_funcionamiento.direccion) ILIKE '
            || quote_literal('%' || REPLACE(p_direccion, ' ', '%'));
    END IF;

    IF p_zonificacion_id IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'licencias_funcionamiento.zonificacion_id = ' || p_zonificacion_id;
    END IF;

    IF p_numero_recibo_pago IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'licencias_funcionamiento.numero_recibo_pago = '
            || quote_literal(p_numero_recibo_pago);
    END IF;

    IF p_fecha_notificacion_desde IS NOT NULL AND p_fecha_notificacion_hasta IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'licencias_funcionamiento.fecha_notificacion BETWEEN '
            || quote_literal(p_fecha_notificacion_desde)
            || ' AND ' || quote_literal(p_fecha_notificacion_hasta);
    END IF;

    IF p_esta_activo IS NOT NULL THEN
        IF p_esta_activo THEN
            v_filter := v_filter
                || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
                || 'TLicenciasInactivas.licencia_funcionamiento_id IS NULL';
        ELSE
            v_filter := v_filter
                || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
                || 'TLicenciasInactivas.licencia_funcionamiento_id IS NOT NULL';
        END IF;
    END IF;

    IF p_giro_nombre IS NOT NULL THEN
        v_filter := v_filter
            || CASE WHEN v_filter = '' THEN '' ELSE ' AND ' END
            || 'TRIM(giros.nombre) ILIKE '
            || quote_literal('%' || REPLACE(p_giro_nombre, ' ', '%'));
    END IF;

    IF v_filter <> '' THEN
        v_sql := v_sql || ' WHERE ' || v_filter;
    END IF;

    EXECUTE 'INSERT INTO tmp_lf_filtradas ' || v_sql;

    -- ── Paso 2: documentos del titular concatenados ───────────────────────────
    INSERT INTO tmp_lf_titular_filas
    SELECT lf.licencia_id,
           tdi.nombre || ' ' || pd.numero_documento
    FROM tmp_lf_filtradas lf
    INNER JOIN licencias_funcionamiento lic ON lf.licencia_id = lic.id
    LEFT  JOIN personas_documentos pd       ON lic.titular_id = pd.persona_id
    LEFT  JOIN tipos_documento_identidad tdi ON pd.tipo_documento_identidad_id = tdi.id;

    INSERT INTO tmp_lf_titular_concat
    SELECT licencia_id,
           STRING_AGG(documento, ', ' ORDER BY documento)
    FROM tmp_lf_titular_filas
    WHERE documento IS NOT NULL
    GROUP BY licencia_id;

    -- ── Paso 3: documentos del conductor concatenados ─────────────────────────
    INSERT INTO tmp_lf_conductor_filas
    SELECT lf.licencia_id,
           tdi.nombre || ' ' || pd.numero_documento
    FROM tmp_lf_filtradas lf
    INNER JOIN licencias_funcionamiento lic ON lf.licencia_id = lic.id
    LEFT  JOIN personas_documentos pd       ON lic.conductor_id = pd.id
    LEFT  JOIN tipos_documento_identidad tdi ON pd.tipo_documento_identidad_id = tdi.id;

    INSERT INTO tmp_lf_conductor_concat
    SELECT licencia_id,
           STRING_AGG(documento, ', ' ORDER BY documento)
    FROM tmp_lf_conductor_filas
    WHERE documento IS NOT NULL
    GROUP BY licencia_id;

    -- ── Paso 4: giros concatenados ────────────────────────────────────────────
    INSERT INTO tmp_lf_giro_filas
    SELECT lf.licencia_id,
           LPAD(CAST(g.ciiu_id AS TEXT), 4, '0') || ' ' || TRIM(g.nombre)
    FROM tmp_lf_filtradas lf
    LEFT JOIN licencias_funcionamiento_giros lfg ON lf.licencia_id = lfg.licencia_funcionamiento_id
    LEFT JOIN giros g                             ON lfg.giro_id = g.id;

    INSERT INTO tmp_lf_giro_concat
    SELECT licencia_id,
           COALESCE(STRING_AGG(giro, ', ' ORDER BY giro), '')
    FROM tmp_lf_giro_filas
    WHERE giro IS NOT NULL
    GROUP BY licencia_id;

    -- ── Paso 5: SELECT final ──────────────────────────────────────────────────
    RETURN QUERY
    SELECT
        lic.id,
        lic.expediente_id,
        lic.tipo_licencia_id,
        lic.numero_licencia,
        lic.fecha_emision,
        lic.titular_id,
        lic.conductor_id,
        lic.licencia_principal_id,
        lic.nombre_comercial::TEXT,
        lic.es_vigencia_indeterminada,
        lic.fecha_inicio_vigencia,
        lic.fecha_fin_vigencia,
        lic.nivel_riesgo_id,
        lic.actividad::TEXT,
        lic.direccion::TEXT,
        lic.hora_desde,
        lic.hora_hasta,
        lic.resolucion_numero::TEXT,
        lic.zonificacion_id,
        lic.area,
        lic.numero_recibo_pago::TEXT,
        lic.observaciones::TEXT,
        lic.se_puede_publicar,
        lic.fecha_notificacion,
        lic.usuario_id,
        lic.fecha_digitacion,
        tdc.titular_documentos_concatenados,
        cdc.conductor_documentos_concatenados,
        COALESCE(gc.giro_concatenado, ''),
        exp.numero_expediente,
        exp.fecha_recepcion,
        tpt.nombre::TEXT,
        TRIM(
            COALESCE(tt.apellido_paterno, '') || ' ' ||
            COALESCE(tt.apellido_materno, '') || ' ' ||
            COALESCE(tt.nombres, '')
        )::TEXT,
        tt.direccion::TEXT,
        tt.distrito::TEXT,
        tt.provincia::TEXT,
        tt.departamento::TEXT,
        tt.telefono::TEXT,
        tt.correo_electronico::TEXT,
        TRIM(
            COALESCE(tc.apellido_paterno, '') || ' ' ||
            COALESCE(tc.apellido_materno, '') || ' ' ||
            COALESCE(tc.nombres, '')
        )::TEXT,
        tc.direccion::TEXT,
        tc.distrito::TEXT,
        tc.provincia::TEXT,
        tc.departamento::TEXT,
        tc.telefono::TEXT,
        tc.correo_electronico::TEXT,
        CASE
            WHEN tli.licencia_funcionamiento_id IS NULL THEN TRUE
            ELSE FALSE
        END
    FROM tmp_lf_filtradas tlf
    INNER JOIN licencias_funcionamiento lic ON tlf.licencia_id = lic.id
    LEFT JOIN tmp_lf_titular_concat   tdc ON tlf.licencia_id = tdc.licencia_id
    LEFT JOIN tmp_lf_conductor_concat cdc ON tlf.licencia_id = cdc.licencia_id
    LEFT JOIN tmp_lf_giro_concat       gc ON tlf.licencia_id = gc.licencia_id
    LEFT JOIN expedientes              exp ON lic.expediente_id = exp.id
    LEFT JOIN tipos_procedimiento_tupa tpt ON exp.tipo_procedimiento_tupa_id = tpt.id
    LEFT JOIN personas                  tt ON lic.titular_id = tt.id
    LEFT JOIN personas                  tc ON lic.conductor_id = tc.id
    LEFT JOIN (
        SELECT DISTINCT lfe.licencia_funcionamiento_id
        FROM licencias_funcionamiento_estados lfe
        INNER JOIN estados e ON lfe.estado_id = e.id
        WHERE e.esta_activo = FALSE
    ) AS tli ON lic.id = tli.licencia_funcionamiento_id
    ORDER BY lic.fecha_emision;

END;
$func$;
"""

DROP_FUNCTION_SQL = "DROP FUNCTION IF EXISTS reporte_licencias_funcionamiento;"


class Migration(migrations.Migration):

    dependencies = [
        ('app_lf_itse', '0008_persona_apellidos_nullable'),
    ]

    operations = [
        migrations.RunSQL(
            sql=FUNCTION_SQL,
            reverse_sql=DROP_FUNCTION_SQL,
        ),
    ]
