import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./index.js";
export function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    try {
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            res.status(403).send({
                message: "invalid token"
            });
            return;
        }
        const token = authHeader.split(' ')[1] ?? "";
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded) {
            // @ts-ignore: TODO: Fix this
            req.userId = decoded.userId;
            console.log("middleware log ,userId = " + decoded.userId);
            next();
        }
        else {
            res.status(403).json({
                message: "Unauthorized"
            });
        }
    }
    catch (error) {
        console.error(error);
    }
}
