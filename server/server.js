// server/server.js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const multer = require('multer');
const path = require('path');
const Document = require('./Document');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Allow requests from this origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  }
});

// const MONGO_URI = 'mongodb+srv://vasanthsai1412003:jSwcyo5U6lTMZPMB@documents.eoe9yjo.mongodb.net/';

mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());
app.use(express.json({ limit: '500mb' })); // Adjust the limit as needed
app.use(express.urlencoded({ limit: '500mb', extended: true })); // Adjust the limit as needed


const upload = multer({ 
  dest: 'uploads/',
  limits: { fileSize: 500 * 1024 * 1024 } // Adjust the limit as needed (50 MB in this example)
});


app.post('/upload', upload.single('image'), (req, res) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const imageUrl = `http://localhost:3001/uploads/${file.filename}`;
  res.status(200).json({ url: imageUrl });
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const defaultValue = "";

io.on("connection", socket => {
  socket.on("get-document", async documentId => {
    const document = await findOrCreateDocument(documentId);
    socket.join(documentId);
    socket.emit("load-document", { title: document.title, contents: document.data });

    socket.on("send-changes", delta => {
      socket.broadcast.to(documentId).emit("receive-changes", delta);
    });

    socket.on("save-document", async data => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (id == null) return;

  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, title: 'Untitled Document', data: defaultValue });
}

// Additional routes
app.get('/documents', async (req, res) => {
  const documents = await Document.find();
  res.json(documents);
});

app.post('/documents', async (req, res) => {
  const { title = 'Untitled Document' } = req.body;
  const newDocument = await Document.create({ title, data: defaultValue });
  res.json(newDocument);
});

app.put('/documents/:id', async (req, res) => {
  const { title } = req.body;
  const document = await Document.findByIdAndUpdate(req.params.id, { title }, { new: true });
  res.json(document);
});

app.delete('/documents/:id', async (req, res) => {
  await Document.findByIdAndDelete(req.params.id);
  res.sendStatus(200);
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
