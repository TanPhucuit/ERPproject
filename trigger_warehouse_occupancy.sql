-- Trigger to auto-update warehouse current_occupancy_sqm from bin_locations
-- This trigger fires AFTER INSERT, UPDATE, or DELETE on bin_locations

CREATE OR REPLACE FUNCTION update_warehouse_occupancy()
RETURNS TRIGGER AS $$
DECLARE
    v_warehouse_id UUID;
BEGIN
    -- Determine which warehouse to update
    IF TG_OP = 'DELETE' THEN
        v_warehouse_id := OLD.warehouse_id;
    ELSE
        v_warehouse_id := NEW.warehouse_id;
    END IF;
    
    -- Update warehouse occupancy as sum of all bin capacities
    UPDATE warehouses
    SET 
        current_occupancy_sqm = COALESCE(
            (SELECT SUM(current_occupancy_units) 
             FROM bin_locations 
             WHERE warehouse_id = v_warehouse_id 
             AND status = 'active'), 
            0
        ),
        updated_at = NOW()
    WHERE id = v_warehouse_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS trg_update_warehouse_on_bin_change ON bin_locations;

-- Create trigger for INSERT
CREATE TRIGGER trg_bin_after_insert
    AFTER INSERT ON bin_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_occupancy();

-- Create trigger for UPDATE
CREATE TRIGGER trg_bin_after_update
    AFTER UPDATE OF current_occupancy_units, capacity_units, status ON bin_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_occupancy();

-- Create trigger for DELETE
CREATE TRIGGER trg_bin_after_delete
    AFTER DELETE ON bin_locations
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_occupancy();

-- Initial update for existing data
UPDATE warehouses w
SET current_occupancy_sqm = COALESCE(
    (SELECT SUM(bl.current_occupancy_units) 
     FROM bin_locations bl 
     WHERE bl.warehouse_id = w.id 
     AND bl.status = 'active'), 
    0
),
updated_at = NOW();
