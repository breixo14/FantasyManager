from contextlib import asynccontextmanager
from pathlib import Path
import json
import uuid
import difflib
import unicodedata
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
import requests
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_FILE = BASE_DIR / "equipos.json"

BASE_URL = "https://fantasy-api.llt-services.com/api"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept": "application/json",
    "x-lang": "es"
}

# Diccionario oficial de mapeo de IDs de equipos de LaLiga
EQUIPOS_MAP = {
    # LALIGA EA SPORTS (Primera División)
    "2": "Atlético de Madrid",
    "3": "Athletic Club",
    "4": "FC Barcelona",
    "5": "Real Betis",
    "6": "RC Celta",
    "7": "Elche CF",
    "8": "RCD Espanyol",
    "9": "Getafe CF",
    "11": "Levante UD",
    "12": "Málaga CF",
    "13": "CA Osasuna",
    "14": "Rayo Vallecano",
    "15": "Real Madrid",
    "16": "Real Sociedad",
    "17": "Sevilla FC",
    "18": "Valencia CF",
    "20": "Villarreal CF",
    "21": "Deportivo Alavés",
    "26": "RC Deportivo",
    "49": "Racing de Santander",

    # LALIGA HYPERMOTION (Segunda División)
    "1": "UD Almería",
    "10": "Granada CF",
    "19": "Real Valladolid",
    "25": "Córdoba CF",
    "27": "SD Eibar",
    "28": "Girona FC",
    "31": "UD Las Palmas",
    "33": "RCD Mallorca",
    "38": "CD Castellón",
    "39": "Real Sporting",
    "40": "CD Tenerife",
    "47": "SD Huesca",
    "53": "Burgos CF",
    "54": "Real Zaragoza",
    "157": "Real Oviedo",
    "158": "CD Mirandés",
    "162": "Cádiz CF",
    "481": "CD Eldense",
    "482": "Albacete Balompié",
    "833": "FC Cartagena",
    "851": "Racing de Ferrol",
    "962": "CD Leganés",
}

# Diccionario de posiciones
POSICIONES_MAP = {
    "1": "POR",
    "2": "DEF",
    "3": "MED",
    "4": "DEL",
    "5": "ENT"
}

# Cache en memoria de todos los jugadores de LaLiga
jugadores_cache = []

def normalizar_texto(texto):
    if not texto:
        return ""
    return unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8').lower().strip()

def formatear_jugador_raw(p):
    team_id = str(p.get("teamId") or "")
    pos_id = str(p.get("positionId") or "")

    team_name = p.get("teamName") or EQUIPOS_MAP.get(team_id, "Sin Equipo")
    position_name = p.get("position") or POSICIONES_MAP.get(pos_id, "")

    try:
        market_val = float(p.get("marketValue") or 0)
    except (ValueError, TypeError):
        market_val = 0.0

    return {
        **p,
        "teamName": team_name,
        "position": position_name,
        "marketValue": market_val
    }

def cargar_equipos():
    """Carga los equipos desde equipos.json o inicializa el archivo si no existe."""
    if not DATA_FILE.exists():
        datos_iniciales = {"equipos": []}
        guardar_equipos(datos_iniciales)
        return datos_iniciales

    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return {"equipos": data}
            return data
    except Exception as e:
        print("Error leyendo equipos.json:", e)
        return {"equipos": []}

def guardar_equipos(datos):
    """Guarda los datos en equipos.json."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

def descargar_jugadores():
    """Descarga los jugadores de Primera y Segunda División para la caché."""
    global jugadores_cache
    todos_los_jugadores = []

    for comp_id in [1, 2]:
        try:
            response = requests.get(f"{BASE_URL}/v1/competition/{comp_id}/players", headers=HEADERS, timeout=10)
            if response.status_code == 200:
                raw_list = response.json()
                for p in raw_list:
                    todos_los_jugadores.append(formatear_jugador_raw(p))
        except Exception as e:
            print(f"Error descargando jugadores comp {comp_id}:", e)

    if todos_los_jugadores:
        jugadores_cache = todos_los_jugadores
        print(f"Caché cargada: {len(jugadores_cache)} jugadores disponibles.")

def enriquecer_jugador(j_guardado, mapa_id, mapa_nombre):
    """Cruza los datos del jugador guardado con los valores actuales del mercado."""
    j_id = str(j_guardado.get("id"))
    j_nombre_norm = normalizar_texto(j_guardado.get("nombre"))
    
    info_mercado = mapa_id.get(j_id) or mapa_nombre.get(j_nombre_norm) or {}
    
    valor_actual = info_mercado.get("marketValue")
    if valor_actual is None:
        valor_actual = j_guardado.get("precio_compra", 0)

    team_id = str(info_mercado.get("teamId") or "")
    equipo = info_mercado.get("teamName") or EQUIPOS_MAP.get(team_id, "Sin Equipo")
    posicion = info_mercado.get("position") or POSICIONES_MAP.get(str(info_mercado.get("positionId") or ""), "")

    return {
        "id": j_guardado.get("id"),
        "nombre": j_guardado.get("nombre"),
        "precio_compra": float(j_guardado.get("precio_compra", 0)),
        "valor_actual": float(valor_actual),
        "equipo": equipo,
        "puntos": info_mercado.get("points", 0),
        "posicion": posicion,
        "image": info_mercado.get("image", "")
    }

@asynccontextmanager
async def lifespan(app: FastAPI):
    cargar_equipos()
    descargar_jugadores()
    yield

app = FastAPI(lifespan=lifespan)
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Modelos Pydantic
class JugadorEntrada(BaseModel):
    id: str | int
    nombre: str
    precio_compra: float = 0.0

class CrearEquipoRequest(BaseModel):
    nombre: str
    presupuesto: float = 20000000.0
    jugadores: list[JugadorEntrada] = Field(default_factory=list)

class PresupuestoRequest(BaseModel):
    presupuesto: float

@app.get("/")
def leer_inicio():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/api/buscar")
def buscar_jugador(q: str):
    """Busca jugadores en el mercado por coincidencia parcial o difusa."""
    busqueda_norm = normalizar_texto(q)
    if not busqueda_norm or not jugadores_cache:
        return {"resultados": []}

    diccionario_jugadores = {}
    for j in jugadores_cache:
        nombre = j.get('nickname') or j.get('name') or ""
        diccionario_jugadores[normalizar_texto(nombre)] = j

    resultados = [j for clave, j in diccionario_jugadores.items() if busqueda_norm in clave]
    if resultados:
        return {"resultados": resultados}

    sugerencias = difflib.get_close_matches(busqueda_norm, list(diccionario_jugadores.keys()), n=5, cutoff=0.5)
    return {"resultados": [diccionario_jugadores[s] for s in sugerencias]}

# ==========================================
# ENDPOINTS DE GESTIÓN MULTI-EQUIPO
# ==========================================

@app.get("/api/equipos")
def listar_equipos():
    """Devuelve el listado de equipos creados."""
    datos = cargar_equipos()
    lista_resumen = []
    for eq in datos.get("equipos", []):
        lista_resumen.append({
            "id": eq["id"],
            "nombre": eq["nombre"],
            "presupuesto": float(eq.get("presupuesto", 0)),
            "num_jugadores": len(eq.get("jugadores", []))
        })
    return {"equipos": lista_resumen}

@app.post("/api/equipos")
def crear_equipo(body: CrearEquipoRequest):
    """Crea un nuevo equipo con nombre, presupuesto y jugadores iniciales."""
    datos = cargar_equipos()
    nuevo_id = uuid.uuid4().hex[:8]

    jugadores_limpios = [
        {"id": str(j.id), "nombre": j.nombre, "precio_compra": float(j.precio_compra)}
        for j in body.jugadores
    ]

    nuevo_equipo = {
        "id": nuevo_id,
        "nombre": body.nombre.strip() or f"Equipo {nuevo_id}",
        "presupuesto": float(body.presupuesto),
        "jugadores": jugadores_limpios
    }

    datos.setdefault("equipos", []).append(nuevo_equipo)
    guardar_equipos(datos)
    return {"mensaje": "Equipo creado con éxito", "equipo": nuevo_equipo}

@app.get("/api/equipos/{equipo_id}")
def obtener_equipo(equipo_id: str):
    """Carga los datos de un equipo con jugadores enriquecidos."""
    datos = cargar_equipos()
    equipo = next((e for e in datos.get("equipos", []) if e["id"] == equipo_id), None)
    
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    mapa_id = {str(j.get('id')): j for j in jugadores_cache}
    mapa_nombre = {normalizar_texto(j.get('nickname') or j.get('name')): j for j in jugadores_cache}

    jugadores_enriquecidos = [
        enriquecer_jugador(j, mapa_id, mapa_nombre)
        for j in equipo.get("jugadores", [])
    ]

    return {
        "id": equipo["id"],
        "nombre": equipo["nombre"],
        "presupuesto": float(equipo.get("presupuesto", 0)),
        "jugadores": jugadores_enriquecidos
    }

@app.delete("/api/equipos/{equipo_id}")
def eliminar_equipo(equipo_id: str):
    """Elimina un equipo por completo."""
    datos = cargar_equipos()
    equipos = datos.get("equipos", [])
    datos["equipos"] = [e for e in equipos if e["id"] != equipo_id]
    guardar_equipos(datos)
    return {"mensaje": "Equipo eliminado con éxito"}

@app.post("/api/equipos/{equipo_id}/jugadores")
@app.post("/api/equipos/{equipo_id}/jugador")
def agregar_jugador(equipo_id: str, jugador: JugadorEntrada):
    """Añade o actualiza un jugador en la plantilla."""
    datos = cargar_equipos()
    equipo = next((e for e in datos.get("equipos", []) if e["id"] == equipo_id), None)
    
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    jugadores = equipo.setdefault("jugadores", [])
    encontrado = False
    for j in jugadores:
        if str(j.get("id")) == str(jugador.id):
            j["precio_compra"] = float(jugador.precio_compra)
            j["nombre"] = jugador.nombre
            encontrado = True
            break

    if not encontrado:
        jugadores.append({
            "id": str(jugador.id),
            "nombre": jugador.nombre,
            "precio_compra": float(jugador.precio_compra)
        })

    guardar_equipos(datos)
    return {"mensaje": "Jugador añadido a la plantilla", "equipo": equipo}

@app.delete("/api/equipos/{equipo_id}/jugadores/{jugador_id}")
@app.delete("/api/equipos/{equipo_id}/jugador/{jugador_id}")
def eliminar_jugador(equipo_id: str, jugador_id: str):
    """Elimina o vende un jugador de la plantilla."""
    datos = cargar_equipos()
    equipo = next((e for e in datos.get("equipos", []) if e["id"] == equipo_id), None)
    
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    equipo["jugadores"] = [j for j in equipo.get("jugadores", []) if str(j.get("id")) != str(jugador_id)]
    guardar_equipos(datos)
    return {"mensaje": "Jugador eliminado", "equipo": equipo}

@app.put("/api/equipos/{equipo_id}/presupuesto")
def actualizar_presupuesto(equipo_id: str, body: PresupuestoRequest):
    """Actualiza el presupuesto disponible del equipo."""
    datos = cargar_equipos()
    equipo = next((e for e in datos.get("equipos", []) if e["id"] == equipo_id), None)
    
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    equipo["presupuesto"] = float(body.presupuesto)
    guardar_equipos(datos)
    return {"mensaje": "Presupuesto actualizado", "presupuesto": equipo["presupuesto"]}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
