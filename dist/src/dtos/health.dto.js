"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthQuerySchema = void 0;
const zod_1 = require("zod");
exports.healthQuerySchema = zod_1.z.object({
    includeTimestamp: zod_1.z
        .string()
        .optional()
        .transform((value) => value === "true"),
});
