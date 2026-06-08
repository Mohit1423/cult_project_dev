import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import authRoutes from './routes/auth';

dotenv.config();

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is not defined.");
  process.exit(1);
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST'],
  },
});

export const prisma = new PrismaClient();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use('/api/auth', authRoutes);

import { initializeSockets } from './sockets/socketManager';

initializeSockets(io);

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
