-- 1. Add warehouse_id to delivery_notes
ALTER TABLE delivery_notes 
ADD COLUMN IF NOT EXISTS warehouse_id VARCHAR(50) REFERENCES warehouses(id) DEFAULT 'marrakech';

-- 2. Update the function to handle warehouse stock
CREATE OR REPLACE FUNCTION manage_delivery_note_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_quantity DECIMAL;
    v_difference DECIMAL;
    v_document_id VARCHAR;
    v_warehouse_id VARCHAR;
    v_client_id UUID;
    v_supplier_id UUID;
    v_is_sale BOOLEAN;
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        v_product_id := NEW.product_id;
        v_quantity := NEW.quantity;
        
        -- Get Document ID, Warehouse, Client and Supplier
        SELECT document_id, warehouse_id, client_id, supplier_id 
        INTO v_document_id, v_warehouse_id, v_client_id, v_supplier_id 
        FROM delivery_notes WHERE id = NEW.delivery_note_id;
        
        IF v_warehouse_id IS NULL THEN v_warehouse_id := 'marrakech'; END IF;
        
        -- Determine if it's a sale or purchase
        v_is_sale := v_client_id IS NOT NULL;
        
        -- If it's a sale, we reduce stock. If it's a purchase, we increment it.
        IF NOT v_is_sale THEN
            v_quantity := -v_quantity; -- Invert quantity for purchase (incrementing stock)
        END IF;

        -- Update global product stock
        UPDATE products
        SET 
            stock = stock - v_quantity,
            last_movement = CURRENT_DATE,
            updated_at = NOW(),
            status = CASE 
                WHEN (stock - v_quantity) <= 0 THEN 'out_of_stock'
                WHEN (stock - v_quantity) <= min_stock THEN 'low_stock'
                ELSE 'in_stock'
            END
        WHERE id = v_product_id;

        -- Update Warehouse Specific Stock
        UPDATE stock_items 
        SET quantity = quantity - v_quantity, last_updated = NOW()
        WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;
        
        IF NOT FOUND THEN
             INSERT INTO stock_items (product_id, warehouse_id, quantity, last_updated)
             VALUES (v_product_id, v_warehouse_id, -v_quantity, NOW());
        END IF;
        
        -- Log Movement
        INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
        VALUES (v_product_id, -v_quantity, 'delivery_note', v_document_id, 
                CASE WHEN v_is_sale THEN 'Sale' ELSE 'Purchase' END || ' Delivery Note Created (Warehouse: ' || v_warehouse_id || ')');
        
    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        v_product_id := OLD.product_id;
        v_quantity := OLD.quantity;
        
        BEGIN
            SELECT document_id, warehouse_id, client_id, supplier_id 
            INTO v_document_id, v_warehouse_id, v_client_id, v_supplier_id 
            FROM delivery_notes WHERE id = OLD.delivery_note_id;
        EXCEPTION WHEN OTHERS THEN
            v_document_id := 'DELETED';
            v_warehouse_id := 'marrakech';
        END;

        IF v_warehouse_id IS NULL THEN v_warehouse_id := 'marrakech'; END IF;
        v_is_sale := v_client_id IS NOT NULL;
        
        IF NOT v_is_sale THEN
            v_quantity := -v_quantity;
        END IF;

        -- Restore global product stock
        UPDATE products
        SET 
            stock = stock + v_quantity,
            last_movement = CURRENT_DATE,
            updated_at = NOW(),
            status = CASE 
                WHEN (stock + v_quantity) <= 0 THEN 'out_of_stock'
                WHEN (stock + v_quantity) <= min_stock THEN 'low_stock'
                ELSE 'in_stock'
            END
        WHERE id = v_product_id;

        -- Restore Warehouse Stock
        UPDATE stock_items 
        SET quantity = quantity + v_quantity, last_updated = NOW()
        WHERE product_id = v_product_id AND warehouse_id = v_warehouse_id;
        
        IF NOT FOUND THEN
             INSERT INTO stock_items (product_id, warehouse_id, quantity, last_updated)
             VALUES (v_product_id, v_warehouse_id, v_quantity, NOW());
        END IF;

        -- Log Movement
        INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
        VALUES (v_product_id, v_quantity, 'delivery_note_cancel', v_document_id, 
                CASE WHEN v_is_sale THEN 'Sale' ELSE 'Purchase' END || ' Delivery Note Deleted (Warehouse: ' || v_warehouse_id || ')');
        
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.quantity != NEW.quantity) OR (OLD.product_id != NEW.product_id) THEN
            
            SELECT document_id, warehouse_id, client_id, supplier_id 
            INTO v_document_id, v_warehouse_id, v_client_id, v_supplier_id 
            FROM delivery_notes WHERE id = NEW.delivery_note_id;
            
            IF v_warehouse_id IS NULL THEN v_warehouse_id := 'marrakech'; END IF;
            v_is_sale := v_client_id IS NOT NULL;

            -- If product ID changed
            IF (OLD.product_id != NEW.product_id) THEN
                -- Restore old
                BEGIN
                    DECLARE
                        v_old_qty DECIMAL := OLD.quantity;
                    BEGIN
                        IF NOT v_is_sale THEN v_old_qty := -v_old_qty; END IF;
                        
                        UPDATE products SET stock = stock + v_old_qty WHERE id = OLD.product_id;
                        UPDATE stock_items SET quantity = quantity + v_old_qty WHERE product_id = OLD.product_id AND warehouse_id = v_warehouse_id;
                        
                        INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
                        VALUES (OLD.product_id, v_old_qty, 'delivery_note_update', v_document_id, 'Item Removed from DN');
                    END;
                END;

                -- Consume new
                BEGIN
                    DECLARE
                        v_new_qty DECIMAL := NEW.quantity;
                    BEGIN
                        IF NOT v_is_sale THEN v_new_qty := -v_new_qty; END IF;
                        
                        UPDATE products SET stock = stock - v_new_qty WHERE id = NEW.product_id;
                        UPDATE stock_items SET quantity = quantity - v_new_qty WHERE product_id = NEW.product_id AND warehouse_id = v_warehouse_id;
                        IF NOT FOUND THEN
                            INSERT INTO stock_items (product_id, warehouse_id, quantity, last_updated) VALUES (NEW.product_id, v_warehouse_id, -v_new_qty, NOW());
                        END IF;
                        
                        INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
                        VALUES (NEW.product_id, -v_new_qty, 'delivery_note_update', v_document_id, 'Item Added to DN');
                    END;
                END;
            ELSE
                -- Same product, adjust difference
                v_difference := NEW.quantity - OLD.quantity;
                IF NOT v_is_sale THEN v_difference := -v_difference; END IF;
                
                -- Adjust global
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
                
                -- Adjust warehouse
                 UPDATE stock_items SET quantity = quantity - v_difference, last_updated = NOW()
                 WHERE product_id = NEW.product_id AND warehouse_id = v_warehouse_id;
                 IF NOT FOUND THEN
                    INSERT INTO stock_items (product_id, warehouse_id, quantity, last_updated) VALUES (NEW.product_id, v_warehouse_id, -v_difference, NOW());
                 END IF;

                INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
                VALUES (NEW.product_id, -v_difference, 'delivery_note_adjustment', v_document_id, 'Quantity Updated (Warehouse: ' || v_warehouse_id || ')');
            END IF;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
