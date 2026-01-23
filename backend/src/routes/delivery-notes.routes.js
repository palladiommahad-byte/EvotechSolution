const express = require('express');
const { query, getClient } = require('../config/database');
const { verifyToken } = require('../middleware/auth.middleware');
const { asyncHandler } = require('../middleware/error.middleware');

const router = express.Router();

router.use(verifyToken);

/**
 * GET /api/delivery-notes
 * Get all delivery notes with optional filters
 */
router.get('/', asyncHandler(async (req, res) => {
    const { status, clientId, supplierId, documentType, startDate, endDate } = req.query;

    let sql = `
    SELECT dn.*, 
           c.id as client_id, c.name as client_name, c.company as client_company,
           c.email as client_email, c.phone as client_phone, c.ice as client_ice,
           c.if_number as client_if_number, c.rc as client_rc,
           s.id as supplier_id_val, s.name as supplier_name, s.company as supplier_company,
           s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
           s.if_number as supplier_if_number, s.rc as supplier_rc
    FROM delivery_notes dn
    LEFT JOIN contacts c ON dn.client_id = c.id
    LEFT JOIN contacts s ON dn.supplier_id = s.id
    WHERE 1=1
  `;
    const params = [];
    let paramIndex = 1;

    if (status) {
        sql += ` AND dn.status = $${paramIndex++}`;
        params.push(status);
    }
    if (clientId) {
        sql += ` AND dn.client_id = $${paramIndex++}`;
        params.push(clientId);
    }
    if (supplierId) {
        sql += ` AND dn.supplier_id = $${paramIndex++}`;
        params.push(supplierId);
    }
    if (documentType) {
        sql += ` AND dn.document_type = $${paramIndex++}`;
        params.push(documentType);
    }
    if (startDate) {
        sql += ` AND dn.date >= $${paramIndex++}`;
        params.push(startDate);
    }
    if (endDate) {
        sql += ` AND dn.date <= $${paramIndex++}`;
        params.push(endDate);
    }

    sql += ' ORDER BY dn.date DESC, dn.created_at DESC';

    const notesResult = await query(sql, params);

    const notes = await Promise.all(
        notesResult.rows.map(async (note) => {
            const itemsResult = await query(
                'SELECT * FROM delivery_note_items WHERE delivery_note_id = $1 ORDER BY created_at ASC',
                [note.id]
            );

            return {
                ...note,
                items: itemsResult.rows,
                client: note.client_name ? {
                    id: note.client_id,
                    name: note.client_name,
                    company: note.client_company,
                    email: note.client_email,
                    phone: note.client_phone,
                    ice: note.client_ice,
                    if_number: note.client_if_number,
                    rc: note.client_rc,
                } : undefined,
                supplier: note.supplier_name ? {
                    id: note.supplier_id_val,
                    name: note.supplier_name,
                    company: note.supplier_company,
                    email: note.supplier_email,
                    phone: note.supplier_phone,
                    ice: note.supplier_ice,
                    if_number: note.supplier_if_number,
                    rc: note.supplier_rc,
                } : undefined,
            };
        })
    );

    res.json(notes);
}));

/**
 * GET /api/delivery-notes/:id
 * Get delivery note by ID
 */
router.get('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;

    const noteResult = await query(
        `SELECT dn.*, 
            c.id as client_id, c.name as client_name, c.company as client_company,
            c.email as client_email, c.phone as client_phone, c.ice as client_ice,
            c.if_number as client_if_number, c.rc as client_rc,
            s.id as supplier_id_val, s.name as supplier_name, s.company as supplier_company,
            s.email as supplier_email, s.phone as supplier_phone, s.ice as supplier_ice,
            s.if_number as supplier_if_number, s.rc as supplier_rc
     FROM delivery_notes dn
     LEFT JOIN contacts c ON dn.client_id = c.id
     LEFT JOIN contacts s ON dn.supplier_id = s.id
     WHERE dn.id = $1`,
        [id]
    );

    if (noteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
    }

    const note = noteResult.rows[0];
    const itemsResult = await query(
        'SELECT * FROM delivery_note_items WHERE delivery_note_id = $1 ORDER BY created_at ASC',
        [id]
    );

    res.json({
        ...note,
        items: itemsResult.rows,
        client: note.client_name ? {
            id: note.client_id,
            name: note.client_name,
            company: note.client_company,
            email: note.client_email,
            phone: note.client_phone,
            ice: note.client_ice,
            if_number: note.client_if_number,
            rc: note.client_rc,
        } : undefined,
        supplier: note.supplier_name ? {
            id: note.supplier_id_val,
            name: note.supplier_name,
            company: note.supplier_company,
            email: note.supplier_email,
            phone: note.supplier_phone,
            ice: note.supplier_ice,
            if_number: note.supplier_if_number,
            rc: note.supplier_rc,
        } : undefined,
    });
}));

/**
 * POST /api/delivery-notes
 * Create a new delivery note
 */
router.post('/', asyncHandler(async (req, res) => {
    const { document_id, client_id, supplier_id, warehouse_id, date, document_type = 'delivery_note', note, items } = req.body;

    if (!document_id || !date || !items || items.length === 0) {
        return res.status(400).json({
            error: 'Validation Error',
            message: 'document_id, date, and items are required',
        });
    }

    const client = await getClient();

    try {
        await client.query('BEGIN');

        const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);

        const noteResult = await client.query(
            `INSERT INTO delivery_notes (document_id, client_id, supplier_id, warehouse_id, date, subtotal, status, note, document_type)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft', $7, $8)
       RETURNING *`,
            [document_id, client_id || null, supplier_id || null, warehouse_id || null, date, subtotal, note || null, document_type]
        );

        const deliveryNote = noteResult.rows[0];

        for (const item of items) {
            await client.query(
                `INSERT INTO delivery_note_items (delivery_note_id, product_id, description, quantity, unit_price, total)
         VALUES ($1, $2, $3, $4, $5, $6)`,
                [deliveryNote.id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
            );
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM delivery_note_items WHERE delivery_note_id = $1', [deliveryNote.id]);

        res.status(201).json({ ...deliveryNote, items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PUT /api/delivery-notes/:id
 * Update a delivery note
 */
router.put('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { date, status, note, items } = req.body;

    const client = await getClient();

    try {
        await client.query('BEGIN');

        let subtotal;
        if (items && items.length > 0) {
            subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        }

        const updates = [];
        const params = [];
        let paramIndex = 1;

        if (date !== undefined) { updates.push(`date = $${paramIndex++}`); params.push(date); }
        if (status !== undefined) { updates.push(`status = $${paramIndex++}`); params.push(status); }
        if (note !== undefined) { updates.push(`note = $${paramIndex++}`); params.push(note); }
        if (subtotal !== undefined) { updates.push(`subtotal = $${paramIndex++}`); params.push(subtotal); }
        updates.push(`updated_at = NOW()`);
        params.push(id);

        const updateResult = await client.query(
            `UPDATE delivery_notes SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        if (updateResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
        }

        if (items) {
            await client.query('DELETE FROM delivery_note_items WHERE delivery_note_id = $1', [id]);
            for (const item of items) {
                await client.query(
                    `INSERT INTO delivery_note_items (delivery_note_id, product_id, description, quantity, unit_price, total)
           VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, item.product_id || null, item.description, item.quantity, item.unit_price, item.quantity * item.unit_price]
                );
            }
        }

        await client.query('COMMIT');

        const itemsResult = await query('SELECT * FROM delivery_note_items WHERE delivery_note_id = $1', [id]);
        res.json({ ...updateResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

/**
 * PATCH /api/delivery-notes/:id/status
 */
router.patch('/:id/status', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const result = await query(
        'UPDATE delivery_notes SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
    }

    res.json(result.rows[0]);
}));

/**
 * DELETE /api/delivery-notes/:id
 */
router.delete('/:id', asyncHandler(async (req, res) => {
    const { id } = req.params;
    const client = await getClient();

    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM delivery_note_items WHERE delivery_note_id = $1', [id]);
        const result = await client.query('DELETE FROM delivery_notes WHERE id = $1 RETURNING id', [id]);
        await client.query('COMMIT');

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Not Found', message: 'Delivery note not found' });
        }

        res.status(204).send();
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}));

module.exports = router;
