-- ============================================
-- ADD document_type FIELD TO delivery_notes TABLE
-- ============================================
-- This migration adds the document_type field to distinguish between
-- delivery notes and divers documents

-- Add document_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'delivery_notes' 
        AND column_name = 'document_type'
    ) THEN
        ALTER TABLE delivery_notes 
        ADD COLUMN document_type VARCHAR(20) DEFAULT 'delivery_note' 
        CHECK (document_type IN ('delivery_note', 'divers'));
        
        -- Create index for better query performance
        CREATE INDEX IF NOT EXISTS idx_delivery_notes_document_type 
        ON delivery_notes(document_type);
        
        RAISE NOTICE 'Added document_type column to delivery_notes table';
    ELSE
        RAISE NOTICE 'document_type column already exists in delivery_notes table';
    END IF;
END $$;

COMMENT ON COLUMN delivery_notes.document_type IS 'Type of document: delivery_note or divers';
