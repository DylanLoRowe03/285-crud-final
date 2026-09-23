const express = require('express');
const multer = require('multer');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.static('public'));

const upload = multer();
const port = 80;

let connection = null;

async function query(sql, params) {
    if (connection === null) {
        connection = await mysql.createConnection({
            host: "student-databases.cvode4s4cwrc.us-west-2.rds.amazonaws.com",
            user: "DYLANLOROWE",
            password: "XQqXx1991T6S7Cs9jUEWjRCbXrU4cPwKbea",
            database: "DYLANLOROWE"
        });
    }

    const [results] = await connection.execute(sql, params);
    return results;
}

function validateProduct(body) {
    const errors = {};

    const brandName = body.brand_name ? body.brand_name.trim() : '';
    const productType = body.product_type ? body.product_type.trim() : '';
    const hairTypeId = body.hair_type_id ? body.hair_type_id.trim() : '';
    const concerns = body.concerns ? body.concerns.trim() : '';
    const price = body.price ? body.price.trim() : '';

    if (brandName.length === 0) {
        errors.brand_name = 'Brand name is required.';
    }

    if (productType.length === 0) {
        errors.product_type = 'Product type is required.';
    }

    if (hairTypeId.length === 0) {
        errors.hair_type_id = 'Hair type is required.';
    }

    if (concerns.length === 0) {
        errors.concerns = 'Concerns is required.';
    }

    if (price.length === 0 || isNaN(price)) {
        errors.price = 'Valid price required.';
    }

    return { errors, values: { brandName, productType, hairTypeId, concerns, price } };
}

// ==================== GET ALL ====================
app.get('/hair/', upload.none(), async (request, response) => {
    try {
        let selectSql = `
            SELECT
                hp.id,
                hp.brand_name,
                hp.product_type,
                ht.hair_type,
                ht.type_chart,
                hp.concerns,
                hp.price
            FROM hair_products hp
            INNER JOIN hair_type ht
                ON hp.hair_type_id = ht.id
        `;

        const whereStatements = [];
        const queryParameters = [];

        if (request.query.hair) {
            whereStatements.push('ht.hair_type = ?');
            queryParameters.push(request.query.hair);
        }

        if (request.query.brand) {
            whereStatements.push('hp.brand_name LIKE ?');
            queryParameters.push('%' + request.query.brand + '%');
        }

        if (request.query.product) {
            whereStatements.push('hp.product_type LIKE ?');
            queryParameters.push('%' + request.query.product + '%');
        }

        if (request.query.concerns) {
            whereStatements.push('hp.concerns LIKE ?');
            queryParameters.push('%' + request.query.concerns + '%');
        }

        if (whereStatements.length > 0) {
            selectSql += ' WHERE ' + whereStatements.join(' AND ');
        }

        // 🔥 FIXED SORT (removed hair_type)
        if (request.query.sort) {
            const allowedSorts = {
                brand_asc: 'hp.brand_name ASC',
                brand_desc: 'hp.brand_name DESC',
                price_asc: 'hp.price ASC',
                price_desc: 'hp.price DESC'
            };

            if (allowedSorts[request.query.sort]) {
                selectSql += ' ORDER BY ' + allowedSorts[request.query.sort];
            }
        }

        // 🔥 FIXED LIMIT (no ? placeholder)
        if (request.query.limit) {
            const limit = parseInt(request.query.limit, 10);

            if (!isNaN(limit) && limit > 0 && limit <= 100) {
                selectSql += ' LIMIT ' + limit;
            }
        }

        const result = await query(selectSql, queryParameters);
        response.json({ data: result });

    } catch (error) {
        console.log(error);
        response.status(500).json({
            message: error.sqlMessage || error.message
        });
    }
});

// ==================== GET ONE ====================
app.get('/hair/:id', upload.none(), async (request, response) => {
    try {
        const id = parseInt(request.params.id, 10);

        const result = await query(`
            SELECT *
            FROM hair_products
            WHERE id = ?
        `, [id]);

        response.json({ data: result[0] });

    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// ==================== INSERT ====================
app.post('/hair/', upload.none(), async (request, response) => {
    try {
        const validation = validateProduct(request.body);

        if (Object.keys(validation.errors).length > 0) {
            return response.status(400).json({ errors: validation.errors });
        }

        await query(`
            INSERT INTO hair_products
            (brand_name, product_type, concerns, price, hair_type_id)
            VALUES (?, ?, ?, ?, ?)
        `, [
            validation.values.brandName,
            validation.values.productType,
            validation.values.concerns,
            validation.values.price,
            validation.values.hairTypeId
        ]);

        response.json({ message: "Inserted successfully" });

    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

// ==================== UPDATE ====================
app.put('/hair/:id', upload.none(), async (request, response) => {
    try {
        const id = parseInt(request.params.id, 10);

        const validation = validateProduct(request.body);

        if (Object.keys(validation.errors).length > 0) {
            return response.status(400).json({ errors: validation.errors });
        }

        await query(`
            UPDATE hair_products
            SET brand_name=?, product_type=?, concerns=?, price=?, hair_type_id=?
            WHERE id=?
        `, [
            validation.values.brandName,
            validation.values.productType,
            validation.values.concerns,
            validation.values.price,
            validation.values.hairTypeId,
            id
        ]);

        response.json({ message: "Updated successfully" });

    } catch (error) {
        response.status(500).json({ message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Running on http://localhost:${port}`);
});