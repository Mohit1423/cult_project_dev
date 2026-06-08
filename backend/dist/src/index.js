"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const dotenv_1 = __importDefault(require("dotenv"));
const client_1 = require("@prisma/client");
const auth_1 = __importDefault(require("./routes/auth"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(httpServer, {
    cors: {
        origin: '*', // We will restrict this in production
        methods: ['GET', 'POST'],
    },
});
exports.prisma = new client_1.PrismaClient();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/auth', auth_1.default);
const socketManager_1 = require("./sockets/socketManager");
(0, socketManager_1.initializeSockets)(io);
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
