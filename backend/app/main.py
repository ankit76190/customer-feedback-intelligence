from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.routes_feedback import router as feedback_router
from app.api.routes_datasets import router as datasets_router
from app.api.routes_analysis import router as analysis_router
from app.api.routes_analytics import router as analytics_router
from app.api.routes_export import router as export_router
from app.api.routes_system import router as system_router
from app.api.routes_insights import router as insights_router

app = FastAPI(
    title="Customer Feedback Intelligence API",
    description="Enterprise API for AI-powered customer feedback analysis using Google Gemini and FastAPI",
    version="1.0.0"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def unhandled_exception_handler(request, exc: Exception):
    import logging
    logger = logging.getLogger("feedback_intelligence")
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected internal server error occurred. Please check backend logs."}
    )

# Register Sub-routers
app.include_router(system_router)
app.include_router(datasets_router)
app.include_router(analysis_router)
app.include_router(feedback_router)
app.include_router(analytics_router)
app.include_router(insights_router)
app.include_router(export_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Customer Feedback Intelligence Backend",
        "model": settings.GEMINI_MODEL,
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
