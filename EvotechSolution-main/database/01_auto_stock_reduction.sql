-- Function to manage stock updates based on delivery note items
CREATE OR REPLACE FUNCTION manage_delivery_note_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_quantity DECIMAL;
    v_old_quantity DECIMAL;
    v_difference DECIMAL;
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        v_product_id := NEW.product_id;
        v_quantity := NEW.quantity;
        
        -- Update product stock
        UPDATE products
        SET 
            stock = stock - v_quantity,
            last_movement = CURRENT_DATE,
            updated_at = NOW(),
            -- Auto-update status based on new stock level
            status = CASE 
                WHEN (stock - v_quantity) <= 0 THEN 'out_of_stock'
                WHEN (stock - v_quantity) <= min_stock THEN 'low_stock'
                ELSE 'in_stock'
            END
        WHERE id = v_product_id;
        
    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        v_product_id := OLD.product_id;
        v_quantity := OLD.quantity;
        
        -- Restore product stock
        UPDATE products
        SET 
            stock = stock + v_quantity,
            last_movement = CURRENT_DATE,
            updated_at = NOW(),
            -- Auto-update status
            status = CASE 
                WHEN (stock + v_quantity) <= 0 THEN 'out_of_stock'
                WHEN (stock + v_quantity) <= min_stock THEN 'low_stock'
                ELSE 'in_stock'
            END
        WHERE id = v_product_id;
        
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Only process if quantity or product changed
        IF (OLD.quantity != NEW.quantity) OR (OLD.product_id != NEW.product_id) THEN
            
            -- If product ID changed, restore old and consume new
            IF (OLD.product_id != NEW.product_id) THEN
                -- Restore old
                UPDATE products
                SET stock = stock + OLD.quantity
                WHERE id = OLD.product_id;
                
                -- Consume new
                UPDATE products
                SET stock = stock - NEW.quantity
                WHERE id = NEW.product_id;
            ELSE
                -- Same product, just adjust by difference (New - Old)
                -- If New is 10, Old was 5. Difference is 5. We need to subtract 5 more.
                -- So logic is: stock = stock - (New - Old)
                v_difference := NEW.quantity - OLD.quantity;
                
                UPDATE products
                SET 
                    stock = stock - v_difference,
                    last_movement = CURRENT_DATE,
                    updated_at = NOW(),
                     status = CASE 
                        WHEN (stock - v_difference) <= 0 THEN 'out_of_stock'
                        WHEN (stock - v_difference) <= min_stock THEN 'low_stock'
                        ELSE 'in_stock'
                    END
                WHERE id = NEW.product_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists to allow re-running
DROP TRIGGER IF EXISTS trg_delivery_note_stock_update ON delivery_note_items;

-- Create the trigger
CREATE TRIGGER trg_delivery_note_stock_update
AFTER INSERT OR UPDATE OR DELETE ON delivery_note_items
FOR EACH ROW
EXECUTE FUNCTION manage_delivery_note_stock();
