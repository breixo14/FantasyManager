from contextlib import asynccontextmanager
from pathlib import Path
import difflib
import unicodedata
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import requests
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

BASE_URL = "https://fantasy-api.llt-services.com/api"
TOKEN = ""  # Pendiente de configurar por el usuario

HEADERS = {
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
    "x-lang": "es"
}
if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

# Cache en memoria para no descargar los 800 jugadores constantemente
jugadores_cache = []

def normalizar_texto(texto):
    if not texto:
        return ""
    return unicodedata.normalize('NFKD', str(texto)).encode('ASCII', 'ignore').decode('utf-8').lower().strip()

def descargar_jugadores():
    global jugadores_cache
    try:
        response = requests.get(f"{BASE_URL}/v1/competition/1/players", headers=HEADERS)
        if response.status_code == 200:
            jugadores_cache = response.json()
    except Exception as e:
        print("Error descargando jugadores:", e)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Evento de inicio (Startup)
    descargar_jugadores()
    yield
    # Evento de apagado (Shutdown) si fuera necesario

app = FastAPI(lifespan=lifespan)

# Configuramos la carpeta 'static' para servir el HTML, CSS y JS
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

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
    sugerencias = difflib.get_close_matches(busqueda_norm, list(diccionario_jugadores.keys()), n=3, cutoff=0.6)
    return {"resultados": [diccionario_jugadores[s] for s in sugerencias]}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

