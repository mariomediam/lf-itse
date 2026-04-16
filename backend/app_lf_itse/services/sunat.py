"""
Servicio de consulta a SUNAT a través de la plataforma PIDE.

Documentación PIDE:
    https://www.gob.pe/pide
Endpoint:
    https://ws3.pide.gob.pe/Rest/Sunat/DatosPrincipales
"""

import requests


_URL_SUNAT = 'https://ws3.pide.gob.pe/Rest/Sunat/DatosPrincipales?numruc={ruc}&out=json'

_TIMEOUT = 10


class SunatError(Exception):
    """Error devuelto por el servicio SUNAT / PIDE."""


def consultar_por_ruc(ruc: str) -> dict:
    """
    Consulta los datos principales de un contribuyente en SUNAT a través
    de la plataforma PIDE.

    Parámetros
    ----------
    ruc : str
        Número de RUC a consultar (11 dígitos numéricos).

    Retorna
    -------
    dict
        Respuesta JSON de PIDE tal como la devuelve el servicio.

    Lanza
    -----
    ValueError
        Si el RUC no tiene exactamente 11 dígitos numéricos.
    SunatError
        Si el servicio externo no responde o devuelve un error HTTP.
    """
    ruc = ruc.strip()
    if not ruc.isdigit() or len(ruc) != 11:
        raise ValueError('El RUC debe tener exactamente 11 dígitos numéricos.')

    url = _URL_SUNAT.format(ruc=ruc)

    try:
        response = requests.get(url, timeout=_TIMEOUT)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        raise SunatError('El servicio SUNAT no respondió en el tiempo esperado.')
    except requests.exceptions.ConnectionError:
        raise SunatError('No se pudo conectar con el servicio SUNAT.')
    except requests.exceptions.HTTPError as e:
        raise SunatError(f'Error HTTP del servicio SUNAT: {e}')
    except Exception as e:
        raise SunatError(f'Error inesperado al consultar SUNAT: {e}')
