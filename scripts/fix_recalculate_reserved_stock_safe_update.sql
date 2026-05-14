CREATE OR REPLACE FUNCTION public.recalculate_reserved_stock_levels()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.stock_levels
  SET quantity_on_hand = 0
  WHERE quantity_on_hand <> 0;

  UPDATE public.stock_levels sl
  SET quantity_on_hand = reserved.reserved_qty
  FROM (
    SELECT doi.product_id, bl.warehouse_id, COALESCE(SUM(doi.quantity_requested), 0) AS reserved_qty
    FROM public.delivery_order_items doi
    JOIN public.delivery_orders d ON d.id = doi.delivery_order_id
    JOIN public.sales_orders so ON so.id = d.sales_order_id
    JOIN public.invoices i ON i.sales_order_id = so.id
    JOIN public.bin_locations bl ON bl.id = doi.bin_location_id
    WHERE i.status IN ('sent','partial_paid','overdue')
      AND so.status NOT IN ('cancelled','delivered')
      AND d.status IN ('ready')
    GROUP BY doi.product_id, bl.warehouse_id
  ) reserved
  WHERE sl.product_id = reserved.product_id
    AND sl.warehouse_id = reserved.warehouse_id;
END;
$$;
