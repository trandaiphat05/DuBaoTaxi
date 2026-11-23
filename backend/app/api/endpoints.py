"""FastAPI API endpoints for health, ready, predict, route, and dispatch."""

from fastapi import APIRouter, HTTPException, status

from backend.app.api.schemas import (
    DispatchRequest,
    DispatchResponse,
    HealthResponse,
    PredictionRequest,
    PredictionResponse,
    ReadyResponse,
    RoutingRequest,
    RoutingResponse,
)
from backend.app.services.dispatch_service import dispatch_service
from backend.app.services.ml_service import ml_service
from backend.app.services.routing_service import routing_service

router = APIRouter(prefix="/api", tags=["NYC Taxi API"])


@router.get("/health", response_model=HealthResponse)
def health_check():
    """Health check endpoint."""
    return HealthResponse(status="ok", app="NYC Taxi AI Backend")


@router.get("/ready", response_model=ReadyResponse)
def ready_check():
    """Readiness probe checking ML model and graph status."""
    ml_ready = ml_service.is_loaded or ml_service.reload_model()
    graph_ready = routing_service.is_loaded or routing_service.load_graph()
    return ReadyResponse(
        status="ready" if (ml_ready and graph_ready) else "degraded",
        ml_model_loaded=ml_ready,
        manhattan_graph_loaded=graph_ready,
    )


@router.post("/predict", response_model=PredictionResponse)
def predict_trip(payload: PredictionRequest):
    """
    Predict taxi trip duration using ML pipeline or calibrated regression.
    Returns duration_seconds, duration_minutes, and label 'Thời gian dự kiến'.
    """
    try:
        result = ml_service.predict(
            pickup_lon=payload.pickup_lon,
            pickup_lat=payload.pickup_lat,
            dropoff_lon=payload.dropoff_lon,
            dropoff_lat=payload.dropoff_lat,
            passenger_count=payload.passenger_count,
            pickup_datetime=payload.pickup_datetime,
        )
        return PredictionResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi thực hiện dự báo chuyến đi: {e}",
        )


@router.post("/route", response_model=RoutingResponse)
def compute_route(payload: RoutingRequest):
    """
    Compute shortest road network route using A* search.
    Returns distance_meters, duration_seconds, geojson coordinates [[lon, lat], ...],
    and label 'Tuyến ngắn nhất theo quãng đường'.
    """
    try:
        result = routing_service.find_route(
            pickup_lon=payload.pickup_lon,
            pickup_lat=payload.pickup_lat,
            dropoff_lon=payload.dropoff_lon,
            dropoff_lat=payload.dropoff_lat,
        )
        return RoutingResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tìm đường ngắn nhất: {e}",
        )


@router.post("/dispatch", response_model=DispatchResponse)
def dispatch_rides(payload: DispatchRequest):
    """
    Multi-passenger ride pooling and dispatch solver.
    Returns stops, vehicle load, leg routes, total duration, and sequential baseline.
    """
    try:
        req_list = [req.model_dump() for req in payload.requests]
        result = dispatch_service.solve_dispatch(
            start_lon=payload.start_lon,
            start_lat=payload.start_lat,
            requests=req_list,
            capacity=payload.capacity,
        )
        return DispatchResponse(**result)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi khi tối ưu điều vận ghép xe: {e}",
        )
