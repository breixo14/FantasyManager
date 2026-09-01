from contextlib import asynccontextmanager
from pathlib import Path
import json
import difflib
import unicodedata
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DATA_FILE = BASE_DIR / "mi_equipo.json"

BASE_URL = "https://fantasy-api.llt-services.com/api"
TOKEN = ""  # Pendiente de configurar por el usuario

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "x-lang": "es"
}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

# Cache en memoria de los jugadores de la API
jugadores_cache = []

def normalizar_texto(texto):
    if not texto:
        return ""
    return unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8').lower().strip()

def cargar_equipo():
    """Lee mi_equipo.json o lo inicializa con estructura por defecto."""
    if not DATA_FILE.exists():
        datos_iniciales = {
            "presupuesto": 50000000,
            "jugadores": []
        }
        guardar_equipo(datos_iniciales)
        return datos_iniciales
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print("Error leyendo mi_equipo.json:", e)
        return {"presupuesto": 0, "jugadores": []}

def guardar_equipo(datos):
    """Guarda los datos en mi_equipo.json."""
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(datos, f, indent=2, ensure_ascii=False)

def descargar_jugadores():
    """Descarga el listado de jugadores en caché al iniciar."""
    global jugadores_cache
    try:
        response = requests.get(f"{BASE_URL}/v1/competition/1/players", headers=HEADERS)
        if response.status_code == 200:
            jugadores_cache = response.json()
            print(f"Caché cargada: {len(jugadores_cache)} jugadores.")
    except Exception as e:
        print("Error descargando jugadores:", e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    cargar_equipo()
    descargar_jugadores()
    yield

app = FastAPI(lifespan=lifespan)

# Servir archivos estáticos
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Modelos Pydantic
class JugadorCompra(BaseModel):
    id: str | int
    nombre: str
    precio_compra: float

class PresupuestoUpdate(BaseModel):
    presupuesto: float

@app.get("/")
def leer_inicio():
    return FileResponse(STATIC_DIR / "index.html")

@app.get("/api/buscar")
def buscar_jugador(q: str):
    busqueda_norm = normalizar_texto(q)
    if not busqueda_norm or not jugadores_cache:
        return {"resultados": []}

    diccionario_jugadores = {}
    for j in jugadores_cache:
        nombre = j.get('nickname') or j.get('name') or ""
        diccionario_jugadores[normalizar_texto(nombre)] = j

    # Búsqueda parcial
    resultados = [j for clave, j in diccionario_jugadores.items() if busqueda_norm in clave]
    if resultados:
        return {"resultados": resultados}

    # Búsqueda difusa
    sugerencias = difflib.get_close_matches(busqueda_norm, list(diccionario_jugadores.keys()), n=5, cutoff=0.5)
    return {"resultados": [diccionario_jugadores[s] for s in sugerencias]}

@app.get("/api/equipo")
def obtener_equipo():
    """Devuelve los datos de mi_equipo.json cruzados con la caché actual del mercado."""
    datos = cargar_equipo()
    
    # Mapeo rápido para cruzar datos
    mapa_por_id = {str(j.get('id')): j for j in jugadores_cache}
    mapa_por_nombre = {normalizar_texto(j.get('nickname') or j.get('name')): j for j in jugadores_cache}

    jugadores_enriquecidos = []
    for j_guardado in datos.get("jugadores", []):
        j_id = str(j_guardado.get("id"))
        j_nombre_norm = normalizar_texto(j_guardado.get("nombre"))
        
        info_mercado = mapa_por_id.get(j_id) or mapa_por_nombre.get(j_nombre_norm) or {}
        
        valor_actual = info_mercado.get("marketValue")
        if valor_actual is None:
            valor_actual = j_guardado.get("precio_compra", 0)

        equipo = info_mercado.get("teamName") or "Sin Equipo"
        puntos = info_mercado.get("points", 0)
        posicion = info_mercado.get("position", "")
        imagen = info_mercado.get("image", "")

        jugadores_enriquecidos.append({
            "id": j_guardado.get("id"),
            "nombre": j_guardado.get("nombre"),
            "precio_compra": float(j_guardado.get("precio_compra", 0)),
            "valor_actual": float(valor_actual),
            "equipo": equipo,
            "puntos": puntos,
            "posicion": posicion,
            "image": imagen
        })

    return {
        "presupuesto": float(datos.get("presupuesto", 0)),
        "jugadores": jugadores_enriquecidos
    }

@app.post("/api/equipo/jugador")
def agregar_jugador(jugador: JugadorCompra):
    """Añade o actualiza un jugador en la plantilla."""
    datos = cargar_equipo()
    jugadores = datos.setdefault("jugadores", [])
    
    # Si ya existe, actualizamos su precio y nombre
    encontrado = False
    for j in jugadores:
        if str(j.get("id")) == str(jugador.id):
            j["precio_compra"] = jugador.precio_compra
            j["nombre"] = jugador.nombre
            encontrado = True
            break
            
    if not encontrado:
        jugadores.append({
            "id": str(jugador.id),
            "nombre": jugador.nombre,
            "precio_compra": jugador.precio_compra
        })

    guardar_equipo(datos)
    return {"mensaje": "Jugador guardado en la plantilla", "equipo": datos}

@app.delete("/api/equipo/jugador/{jugador_id}")
def eliminar_jugador(jugador_id: str):
    """Elimina un jugador de la plantilla."""
    datos = cargar_equipo()
    jugadores = datos.get("jugadores", [])
    datos["jugadores"] = [j for j in jugadores if str(j.get("id")) != str(jugador_id)]
    guardar_equipo(datos)
    return {"mensaje": "Jugador eliminado", "equipo": datos}

@app.put("/api/equipo/presupuesto")
def actualizar_presupuesto(body: PresupuestoUpdate):
    """Actualiza el presupuesto disponible en mi_equipo.json."""
    datos = cargar_equipo()
    datos["presupuesto"] = body.presupuesto
    guardar_equipo(datos)
    return {"mensaje": "Presupuesto actualizado", "presupuesto": datos["presupuesto"]}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
