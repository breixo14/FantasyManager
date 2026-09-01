# ⚽ LALIGA Fantasy Manager

Aplicación web para gestión y búsqueda avanzada de jugadores de LALIGA Fantasy.

## 🚀 Características
- Backend desarrollado con **FastAPI** y manejo de ciclo de vida con `lifespan`.
- Frontend nativo con **HTML5, CSS3 moderno (Dark mode y animaciones)** y JavaScript.
- Búsqueda inteligente de jugadores con coincidencia parcial y difusa (*fuzzy matching*).

## 🛠️ Instalación y Uso

1. Instalar dependencias:
```bash
pip install fastapi uvicorn requests
```

2. Configurar el `TOKEN` de la API en `main.py`.

3. Iniciar el servidor de desarrollo:
```bash
uvicorn main:app --reload
```
O ejecutando directamente:
```bash
python main.py
```

4. Abrir en el navegador: `http://127.0.0.1:8000`

