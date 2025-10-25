const express = require('express');
const multer = require('multer');
const { put } = require('@vercel/blob');

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Middleware para verificar la IP del usuario
app.use((req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
  const cleanIp = clientIp ? clientIp.replace('::ffff:', '').split(',')[0] : '';
  const allowedIpRange = '192.168.1.';

  // Verificar si la IP pertenece a la red local
  if (cleanIp.startsWith(allowedIpRange)) {
    next();
  } else {
    res.status(403).send('Acceso denegado: Solo los dispositivos conectados a la red local pueden acceder.');
  }
});

// In-memory storage for messages (note: this is not persistent in serverless)
let messages = [];

// Configure multer to store in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// API endpoint to get messages
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// API endpoint to send a message
app.post('/api/messages', (req, res) => {
  const { user, text, imageUrl } = req.body;
  if (user && (text || imageUrl)) {
    const message = { user, text, imageUrl, timestamp: new Date() };
    messages.push(message);
    res.status(201).json(message);
  } else {
    res.status(400).json({ error: 'User and text or imageUrl are required' });
  }
});

// API endpoint for image upload
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (req.file) {
    try {
      const blob = await put(req.file.originalname, req.file.buffer, { access: 'public' });
      res.json({ imageUrl: blob.url });
    } catch (error) {
      res.status(500).json({ error: 'Upload failed' });
    }
  } else {
    res.status(400).json({ error: 'No file uploaded' });
  }
});

// For local development
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`));
}

// Export for Vercel
module.exports = app;
