path = r"C:\Users\jacques.siman\sgm-ferroviario\backend\app\api\v1\fuel_orders.py"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

old = '    data = body.model_dump(exclude={"items"})\n    order = FuelOrder(**data, created_by_id=current_user.id)'
new = '    data = body.model_dump(exclude={"items"})\n    if data.get("execution_date") and hasattr(data["execution_date"], "tzinfo") and data["execution_date"].tzinfo is not None:\n        data["execution_date"] = data["execution_date"].replace(tzinfo=None)\n    order = FuelOrder(**data, created_by_id=current_user.id)'

if old in content:
    content = content.replace(old, new)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK")
else:
    print("ERRO")
