from app.core.config import settings
from app.integrations.erp.base_connector import BaseERPConnector


def get_erp_connector() -> BaseERPConnector:
    erp_type = settings.ERP_TYPE
    if erp_type == "sap":
        from app.integrations.erp.sap_connector import SAPConnector
        return SAPConnector()
    elif erp_type == "totvs":
        from app.integrations.erp.totvs_connector import TOTVSConnector
        return TOTVSConnector()
    else:
        from app.integrations.erp.generic_connector import GenericERPConnector
        return GenericERPConnector()
