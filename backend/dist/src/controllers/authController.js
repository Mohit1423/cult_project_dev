"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfile = exports.login = exports.register = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const JWT_SECRET = process.env.JWT_SECRET || 'secret123';
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password, name, role, phone, vehicle } = req.body;
        const existingUser = yield index_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }
        const hashedPassword = yield bcryptjs_1.default.hash(password, 10);
        const user = yield index_1.prisma.user.create({
            data: Object.assign({ email, password: hashedPassword, name,
                role,
                phone }, (role === 'DRIVER' && vehicle ? {
                vehicle: {
                    create: vehicle
                }
            } : {})),
        });
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ user: { id: user.id, email: user.email, role: user.role, name: user.name }, token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        const user = yield index_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(400).json({ error: 'Invalid credentials' });
            return;
        }
        const validPassword = yield bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            res.status(400).json({ error: 'Invalid credentials' });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name }, token });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.login = login;
const getProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        const user = yield index_1.prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                vehicle: true
            }
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        const { password } = user, userWithoutPassword = __rest(user, ["password"]);
        res.json(userWithoutPassword);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getProfile = getProfile;
