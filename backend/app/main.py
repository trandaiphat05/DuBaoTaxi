"""Main FastAPI application for NYC Taxi Trip Duration & Route Optimization."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.api.endpoints import router as api_router
from backend.app.services.ml_service import ml_service
from backend.app.services.routing_service import routing_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler to load ML pipeline and Manhattan graph on startup."""
    print("Khởi động hệ thống: Đang tải ML Pipeline và Đồ thị giao thông Manhattan...")
    try:
        ml_service.reload_model()
    except Exception as e:
        print(f"Cảnh báo khi nạp mô hình học máy: {e}")

    try:
        routing_service.load_graph()
    except Exception as e:
        print(f"Cảnh báo khi nạp đồ thị Manhattan: {e}")

    print("Hệ thống đã sẵn sàng phục vụ các yêu cầu API.")
    yield
    print("Dừng hệ thống NYC Taxi AI Backend.")


app = FastAPI(
    title="NYC Taxi Trip Duration & Routing AI",
    description="Hệ thống dự báo thời gian chuyến đi và tối ưu hóa điều vận taxi tại Manhattan, NYC.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend and tools
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Format validation errors into clear Vietnamese messages."""
    errors = exc.errors()
    msg_parts = []
    for err in errors:
        loc = " -> ".join(str(l) for l in err.get("loc", []))
        msg = err.get("msg", "")
        # Check custom error messages from validator
        if "Value error," in msg:
            clean_msg = msg.split("Value error,")[-1].strip()
            msg_parts.append(clean_msg)
        else:
            msg_parts.append(f"Trường dữ liệu '{loc}' không hợp lệ: {msg}")

    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": " | ".join(msg_parts)},
    )


# Include API routes
app.include_router(api_router)

# Serve built frontend in production if dist/ exists
from pathlib import Path
from fastapi.staticfiles import StaticFiles

_dist_path = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if _dist_path.exists():
    app.mount("/", StaticFiles(directory=str(_dist_path), html=True), name="frontend_dist")
else:
    @app.get("/")
    def root():
        return {
            "message": "NYC Taxi AI Backend is running.",
            "endpoints": {
                "health": "/api/health",
                "ready": "/api/ready",
                "predict": "/api/predict",
                "route": "/api/route",
                "dispatch": "/api/dispatch",
                "docs": "/docs",
            },
        }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
