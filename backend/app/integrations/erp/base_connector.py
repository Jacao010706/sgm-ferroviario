"""
Interface base para conectores ERP.
Todos os conectores devem implementar este contrato.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Optional


@dataclass
class ERPWorkOrder:
    external_id: str
    number: str
    title: str
    asset_external_id: str
    status: str
    priority: str
    technician_name: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    cost_center: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None


@dataclass
class ERPAsset:
    external_id: str
    name: str
    asset_class: str
    location: str
    cost_center: str
    status: str


@dataclass
class ERPPart:
    external_id: str
    code: str
    description: str
    stock_quantity: float
    unit: str
    cost_per_unit: float
    min_stock: float


class BaseERPConnector(ABC):
    """Contrato para todos os conectores ERP"""

    @abstractmethod
    async def authenticate(self) -> bool:
        """Obtém token de autenticação"""

    @abstractmethod
    async def get_work_order(self, external_id: str) -> Optional[ERPWorkOrder]:
        """Busca OS no ERP pelo ID externo"""

    @abstractmethod
    async def create_work_order(self, wo_data: dict) -> str:
        """Cria OS no ERP e retorna ID externo"""

    @abstractmethod
    async def update_work_order(self, external_id: str, wo_data: dict) -> bool:
        """Atualiza OS no ERP"""

    @abstractmethod
    async def close_work_order(self, external_id: str, completion_data: dict) -> bool:
        """Encerra OS no ERP com dados de conclusão"""

    @abstractmethod
    async def get_asset(self, external_id: str) -> Optional[ERPAsset]:
        """Busca ativo no ERP"""

    @abstractmethod
    async def get_parts_stock(self, part_codes: list[str]) -> list[ERPPart]:
        """Consulta estoque de peças"""

    @abstractmethod
    async def create_parts_request(self, wo_external_id: str, parts: list[dict]) -> str:
        """Cria requisição de material no ERP"""

    @abstractmethod
    async def get_cost_centers(self) -> list[dict]:
        """Lista centros de custo"""
