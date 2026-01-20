-- 1. Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL, -- Positive for add, negative for remove
    type VARCHAR(50) NOT NULL, -- 'delivery_note', 'adjustment', 'initial', etc.
    reference_id VARCHAR(100), -- Document ID (e.g., DN-2024-001)
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(created_at DESC);

-- 2. Update the function to log movements
CREATE OR REPLACE FUNCTION manage_delivery_note_stock()
RETURNS TRIGGER AS $$
DECLARE
    v_product_id UUID;
    v_quantity DECIMAL;
    v_difference DECIMAL;
    v_document_id VARCHAR;
BEGIN
    -- Handle INSERT
    IF (TG_OP = 'INSERT') THEN
        v_product_id := NEW.product_id;
        v_quantity := NEW.quantity;
        
        -- Get Document ID
        SELECT document_id INTO v_document_id FROM delivery_notes WHERE id = NEW.delivery_note_id;

        -- Update product stock
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
        
        -- Log Movement
        INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
        VALUES (v_product_id, -v_quantity, 'delivery_note', v_document_id, 'Delivery Note Created');
        
    -- Handle DELETE
    ELSIF (TG_OP = 'DELETE') THEN
        v_product_id := OLD.product_id;
        v_quantity := OLD.quantity;
        
        -- Get Document ID (might fail if parent is deleted first, handle gracefully)
        BEGIN
            SELECT document_id INTO v_document_id FROM delivery_notes WHERE id = OLD.delivery_note_id;
        EXCEPTION WHEN OTHERS THEN
            v_document_id := 'DELETED';
        END;

        -- Restore product stock
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

        -- Log Movement
        INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
        VALUES (v_product_id, v_quantity, 'delivery_note_cancel', v_document_id, 'Delivery Note Deleted');
        
    -- Handle UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.quantity != NEW.quantity) OR (OLD.product_id != NEW.product_id) THEN
            
             -- Get Document ID
            SELECT document_id INTO v_document_id FROM delivery_notes WHERE id = NEW.delivery_note_id;

            -- If product ID changed
            IF (OLD.product_id != NEW.product_id) THEN
                -- Restore old
                UPDATE products SET stock = stock + OLD.quantity WHERE id = OLD.product_id;
                INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
                VALUES (OLD.product_id, OLD.quantity, 'delivery_note_update', v_document_id, 'Item Removed from DN');

                -- Consume new
                UPDATE products SET stock = stock - NEW.quantity WHERE id = NEW.product_id;
                INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
                VALUES (NEW.product_id, -NEW.quantity, 'delivery_note_update', v_document_id, 'Item Added to DN');

            ELSE
                -- Same product, adjust difference
                v_difference := NEW.quantity - OLD.quantity;
                -- If difference is positive (quantity increased), we reduce stock further.
                -- If difference is negative (quantity decreased), we add stock back.
                -- Logic: New Stock = Old Stock - Difference
                
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

                INSERT INTO stock_movements (product_id, quantity, type, reference_id, description)
                VALUES (NEW.product_id, -v_difference, 'delivery_note_adjustment', v_document_id, 'Quantity Updated');
            END IF;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
