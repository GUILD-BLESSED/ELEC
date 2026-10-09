const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = 3000;

// Credenciales extraídas de tu panel/QR
const AUTH_TOKEN = 'Alioli-O8ilAfDGBaloQ0bpglNA46pw-MEGAMU';
const USERNAME = 'peluche004';
const PANEL_URL = 'https://es.megamu.net/panel/';

async function extraerPersonajesMegaMu() {
    try {
        const response = await axios.get(PANEL_URL, {
            headers: {
                'Cookie': `auth_token=${AUTH_TOKEN}; user=${USERNAME}`,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const $ = cheerio.load(response.data);
        const personajes = [];

        // ⚠️ IMPORTANTE: Este selector ('tr.personaje' o similar) dependerá de cómo esté estructurado 
        // el HTML del panel. Deberás inspeccionar la página web (F12) para ajustar la clase o etiqueta exacta.
        // Aquí asumimos una estructura común de filas en una tabla o contenedores de lista:
        
        $('table tr').each((i, el) => {
            const columnas = $(el).find('td');
            
            // Verificamos que la fila tenga la cantidad de columnas esperada para un personaje
            if (columnas.length >= 5) {
                const nombre = $(columnas[0]).text().trim();
                const raza = $(columnas[1]).text().trim();
                const nivel = $(columnas[2]).text().trim();
                const reset = $(columnas[3]).text().trim();
                const ubicacion = $(columnas[4]).text().trim();
                
                // Intentamos detectar si hay algún indicador visual de activo (ej. texto "Online", una clase CSS o color verde)
                const estadoHtml = $(el).html();
                const activo = estadoHtml.toLowerCase().includes('online') || $(el).find('.online, .badge-success').length > 0;

                if (nombre) { // Evitar filas vacías
                    personajes.push({
                        nombre,
                        raza,
                        nivel,
                        reset,
                        ubicacion,
                        activo
                    });
                }
            }
        });

        return {
            status: 'success',
            usuario: USERNAME,
            actualizado: new Date().toLocaleTimeString(),
            totalPersonajes: personajes.length,
            personajes
        };

    } catch (error) {
        console.error('Error al conectar con el panel:', error.message);
        return {
            status: 'error',
            mensaje: error.message
        };
    }
}

// Ruta que devuelve el JSON listo para tu dashboard o app
app.get('/api/personajes', async (req, res) => {
    const data = await extraerPersonajesMegaMu();
    res.json(data);
});

// Interfaz visual web básica integrada en el mismo servidor
app.get('/', async (req, res) => {
    const data = await extraerPersonajesMegaMu();
    
    let htmlCards = '';
    if (data.status === 'success') {
        htmlCards = data.personajes.map(p => `
            <div style="background: #1e1e2f; border: 1px solid ${p.activo ? '#4ecca3' : '#ff6b6b'}; border-radius: 8px; padding: 15px; margin-bottom: 10px; width: 300px;">
                <h3 style="margin: 0 0 10px 0; color: #fff;">${p.nombre} <span style="font-size: 12px; float: right; color: ${p.activo ? '#4ecca3' : '#ff6b6b'};">${p.activo ? '● ACTIVO' / 'OFFLINE' : '● OFFLINE'}</span></h3>
                <p style="margin: 4px 0;"><strong>Raza:</strong> ${p.raza}</p>
                <p style="margin: 4px 0;"><strong>Nivel:</strong> ${p.nivel}</p>
                <p style="margin: 4px 0;"><strong>Resets:</strong> ${p.reset}</p>
                <p style="margin: 4px 0;"><strong>Ubicación:</strong> ${p.ubicacion}</p>
            </div>
        `).join('');
    }

    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>Dashboard MegaMU - ${USERNAME}</title>
            <meta http-equiv="refresh" content="30"> <!-- Se recarga solo cada 30 segundos -->
        </head>
        <body style="background: #12121a; color: #e0e0e0; font-family: Arial, sans-serif; padding: 20px;">
            <h1>Dashboard de Personajes: ${USERNAME}</h1>
            <p>Actualización automática cada 30s | Estado: <strong style="color: #4ecca3;">${data.status}</strong></p>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 20px;">
                ${htmlCards || '<p>No se encontraron personajes o hay que ajustar los selectores HTML.</p>'}
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`Dashboard corriendo en http://localhost:${PORT}`);
});
