CREATE OR REPLACE FUNCTION public.apply_receipt_to_new_quantity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  row_item RECORD;
  product_id_val UUID;
  warehouse_id_val UUID;
BEGIN
  IF NEW.status IN ('received', 'completed') AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT id INTO warehouse_id_val FROM public.warehouses WHERE is_active = TRUE ORDER BY created_at LIMIT 1;
    FOR row_item IN
      SELECT poi.* FROM public.purchase_order_items poi WHERE poi.purchase_order_id = NEW.purchase_order_id
    LOOP
      SELECT product_id INTO product_id_val FROM public.supplier_products WHERE id = row_item.supplier_products_id;
      INSERT INTO public.stock_levels (product_id, warehouse_id, new_quantity, total_quantity, quantity_on_hand, available)
      VALUES (product_id_val, warehouse_id_val, row_item.quantity, row_item.quantity, 0, 0)
      ON CONFLICT (product_id, warehouse_id) DO UPDATE
      SET new_quantity = stock_levels.new_quantity + EXCLUDED.new_quantity,
          total_quantity = stock_levels.total_quantity + EXCLUDED.new_quantity;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
