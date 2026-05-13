CREATE OR REPLACE FUNCTION execute_stock_transfer()
RETURNS TRIGGER AS $$
DECLARE
  target_warehouse UUID;
  source_warehouse UUID;
  source_quantity NUMERIC(14,2);
  source_available NUMERIC(14,2);
  source_new_quantity NUMERIC(14,2);
BEGIN
  SELECT warehouse_id INTO target_warehouse FROM bin_locations WHERE id = NEW.target_bin_location_id;

  IF NEW.src_bin_location_id IS NULL THEN
    SELECT COALESCE(new_quantity, 0)
    INTO source_new_quantity
    FROM stock_levels
    WHERE product_id = NEW.product_id AND warehouse_id = target_warehouse;

    IF source_new_quantity < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient new quantity for product %. Available new quantity: %, requested: %',
        NEW.product_id, COALESCE(source_new_quantity, 0), NEW.quantity;
    END IF;

    UPDATE stock_levels
    SET new_quantity = GREATEST(new_quantity - NEW.quantity, 0),
        available = available + NEW.quantity
    WHERE product_id = NEW.product_id AND warehouse_id = target_warehouse;
  ELSE
    SELECT warehouse_id INTO source_warehouse FROM bin_locations WHERE id = NEW.src_bin_location_id;
    SELECT quantity, available
    INTO source_quantity, source_available
    FROM stock_in_bins
    WHERE product_id = NEW.product_id AND bin_location_id = NEW.src_bin_location_id;

    IF COALESCE(source_available, 0) < NEW.quantity OR COALESCE(source_quantity, 0) < NEW.quantity THEN
      RAISE EXCEPTION 'Insufficient bin stock for product %. Available: %, quantity: %, requested: %',
        NEW.product_id, COALESCE(source_available, 0), COALESCE(source_quantity, 0), NEW.quantity;
    END IF;

    UPDATE stock_in_bins
    SET quantity = GREATEST(quantity - NEW.quantity, 0),
        available = GREATEST(available - NEW.quantity, 0)
    WHERE product_id = NEW.product_id AND bin_location_id = NEW.src_bin_location_id;

    UPDATE stock_levels
    SET available = GREATEST(available - NEW.quantity, 0),
        total_quantity = GREATEST(total_quantity - NEW.quantity, 0)
    WHERE product_id = NEW.product_id AND warehouse_id = source_warehouse;
  END IF;

  INSERT INTO stock_in_bins (product_id, bin_location_id, quantity, available)
  VALUES (NEW.product_id, NEW.target_bin_location_id, NEW.quantity, NEW.quantity)
  ON CONFLICT (product_id, bin_location_id) DO UPDATE
  SET quantity = stock_in_bins.quantity + EXCLUDED.quantity,
      available = stock_in_bins.available + EXCLUDED.available;

  IF NEW.src_bin_location_id IS NULL THEN
    INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, total_quantity, available, new_quantity)
    VALUES (NEW.product_id, target_warehouse, 0, NEW.quantity, NEW.quantity, 0)
    ON CONFLICT (product_id, warehouse_id) DO NOTHING;
  ELSE
    INSERT INTO stock_levels (product_id, warehouse_id, quantity_on_hand, total_quantity, available, new_quantity)
    VALUES (NEW.product_id, target_warehouse, 0, NEW.quantity, NEW.quantity, 0)
    ON CONFLICT (product_id, warehouse_id) DO UPDATE
    SET total_quantity = stock_levels.total_quantity + EXCLUDED.total_quantity,
        available = stock_levels.available + EXCLUDED.available;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
