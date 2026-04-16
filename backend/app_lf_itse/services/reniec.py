"""
Servicio de consulta a RENIEC a través de la plataforma PIDE.

Documentación PIDE:
    https://www.gob.pe/pide
Endpoint:
    https://ws2.pide.gob.pe/Rest/RENIEC/Consultar
"""

import requests
from django.conf import settings


_URL_RENIEC = (
    'https://ws2.pide.gob.pe/Rest/RENIEC/Consultar'
    '?nuDniConsulta={dni}'
    '&nuDniUsuario={dni_usuario}'
    '&nuRucUsuario={ruc_usuario}'
    '&password={password}'
    '&out=json'
)


class ReniecError(Exception):
    """Error devuelto por el servicio RENIEC / PIDE."""


def consultar_por_dni(dni: str) -> dict:
    """
    Consulta los datos de una persona en RENIEC a través de PIDE.

    Parámetros
    ----------
    dni : str
        Número de DNI a consultar (8 dígitos).

    Retorna
    -------
    dict
        Respuesta JSON de PIDE tal como la devuelve el servicio.

    Lanza
    -----
    ValueError
        Si el DNI no tiene exactamente 8 dígitos numéricos.
    ReniecError
        Si las credenciales RENIEC no están configuradas, si el servicio
        externo no responde o si devuelve un error HTTP.
    """
    dni = dni.strip()
    if not dni.isdigit() or len(dni) != 8:
        raise ValueError('El DNI debe tener exactamente 8 dígitos numéricos.')

    dni_usuario = settings.RENIEC_NUDNIUSUARIO
    ruc_usuario = settings.RENIEC_NURUCUSUARIO
    password    = settings.RENIEC_PASSWORD
    timeout     = settings.RENIEC_TIMEOUT

    if not dni_usuario or not ruc_usuario or not password:
        raise ReniecError(
            'Las credenciales RENIEC no están configuradas '
            '(RENIEC_NUDNIUSUARIO, RENIEC_NURUCUSUARIO, RENIEC_PASSWORD).'
        )

    url = _URL_RENIEC.format(
        dni=dni,
        dni_usuario=dni_usuario,
        ruc_usuario=ruc_usuario,
        password=password,
    )

    try:
        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.Timeout:
        raise ReniecError('El servicio RENIEC no respondió en el tiempo esperado.')
    except requests.exceptions.ConnectionError:
        raise ReniecError('No se pudo conectar con el servicio RENIEC.')
    except requests.exceptions.HTTPError as e:
        raise ReniecError(f'Error HTTP del servicio RENIEC: {e}')
    except Exception as e:
        raise ReniecError(f'Error inesperado al consultar RENIEC: {e}')
